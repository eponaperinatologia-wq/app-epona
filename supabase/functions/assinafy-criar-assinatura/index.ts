// Edge Function: cria (ou reutiliza) o documento de assinatura pro proprietário
// e devolve o signing_url pra embedar em iframe no app.
//
// Segurança:
//  - Só o próprio proprietário logado pode chamar (valida via RPC no banco:
//    verify_senha_proprietario já testou a senha; aqui verificamos que o
//    proprietarioId requisitado está sem contrato assinado ainda).
//  - A API Key do Assinafy fica APENAS aqui no servidor (secrets do Supabase).
//  - O cliente nunca vê a chave.
//
// Idempotência:
//  - Se proprietario.contrato_document_id já existe e contrato_status !=
//    'assinado', reaproveita o mesmo signing_url em vez de criar outro doc.

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ASSINAFY_BASE = Deno.env.get("ASSINAFY_BASE_URL") ?? "https://api.assinafy.com.br/v1";
const ASSINAFY_API_KEY = Deno.env.get("ASSINAFY_API_KEY")!;
const ASSINAFY_ACCOUNT_ID = Deno.env.get("ASSINAFY_ACCOUNT_ID")!;
const ASSINAFY_TEMPLATE_ID = Deno.env.get("ASSINAFY_TEMPLATE_ID")!;
const ASSINAFY_ROLE_ID = Deno.env.get("ASSINAFY_ROLE_ID")!; // "Contratante"

// Nota importante sobre o Assinafy:
// Templates NÃO permitem pré-preencher campos custom via API. O signer
// preenche tudo na tela deles. Só o `full_name`, `email` e `cpf` do signer
// profile são passados adiante — os campos custom (Nacionalidade, Profissão,
// Estado Civil, RG, Endereço) o signer digita manualmente ao assinar.
// Se quiser TODOS os campos pré-preenchidos, precisa gerar o PDF localmente
// e usar POST /accounts/:id/documents (upload) em vez de create-from-template.

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function assinafyFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${ASSINAFY_BASE}${path}`, {
    ...opts,
    headers: {
      "X-Api-Key": ASSINAFY_API_KEY,
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const { proprietarioId, senha } = await req.json();
    if (!proprietarioId || !senha) return json({ error: "missing_params" }, 400);

    // Autentica o proprietário via RPC do banco (mesma que o app usa no login)
    // — assim garantimos que quem chama essa function realmente é o dono da conta.
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: propRow, error: propErr } = await supa
      .from("proprietarios")
      .select("id, nome, login, senha_hash, nome_completo, rg, cpf, profissao, nacionalidade, estado_civil, cep, rua, numero, complemento, bairro, cidade, estado, email, telefone, contrato_status, contrato_document_id, contrato_url")
      .eq("id", proprietarioId)
      .maybeSingle();
    if (propErr || !propRow) return json({ error: "not_found" }, 404);

    // Confere senha via RPC do banco — não trafegamos hash pela function.
    const { data: verify, error: verifyErr } = await supa.rpc("verify_senha_proprietario", {
      p_login: propRow.login,
      p_senha: senha,
    });
    if (verifyErr) return json({ error: "verify_failed", detail: verifyErr.message }, 500);
    const verifiedRow = Array.isArray(verify) ? verify[0] : verify;
    if (!verifiedRow || verifiedRow.id !== proprietarioId) return json({ error: "unauthorized" }, 401);

    if (propRow.contrato_status === "assinado") {
      return json({ status: "assinado" });
    }
    // Reaproveita signing_url ativo se já criamos o documento antes
    // (evita duplicar contrato se o proprietário recarregar a tela).
    if (propRow.contrato_document_id && propRow.contrato_url) {
      return json({
        status: propRow.contrato_status || "enviado",
        signing_url: propRow.contrato_url,
        document_id: propRow.contrato_document_id,
      });
    }

    // Passo 1: criar/reusar o signer com os dados que temos (nome + email + cpf).
    // A API é idempotente por email — se já existir, devolve o mesmo id.
    const cpfLimpo = (propRow.cpf || "").replace(/\D/g, "");
    const signerPayload = {
      full_name: propRow.nome_completo || propRow.nome,
      email: propRow.email,
      ...(cpfLimpo ? { cpf: cpfLimpo } : {}),
    };
    let signerResp = await assinafyFetch(
      `/accounts/${ASSINAFY_ACCOUNT_ID}/signers`,
      { method: "POST", body: JSON.stringify(signerPayload) },
    );
    let signer = signerResp.data?.data || signerResp.data;
    if (!signerResp.ok) {
      // Se falhou por "já existe", busca por email
      const search = await assinafyFetch(
        `/accounts/${ASSINAFY_ACCOUNT_ID}/signers?search=${encodeURIComponent(propRow.email || "")}`,
      );
      const list = search.data?.data || [];
      signer = Array.isArray(list) ? list.find((s: any) => s.email === propRow.email) : null;
      if (!signer) {
        return json({ error: "assinafy_signer_failed", detail: signerResp.data }, 500);
      }
    }
    const signerId = signer?.id;
    if (!signerId) return json({ error: "assinafy_signer_no_id" }, 500);

    // Passo 2: criar o documento a partir do template com o signer.
    // Assinafy NÃO aceita pré-preencher os campos aqui — o signer preenche na tela deles.
    const createPayload = {
      signers: [{
        role_id: ASSINAFY_ROLE_ID,
        id: signerId,
        verification_method: "Email",
        notification_methods: ["Email"],
      }],
    };
    const created = await assinafyFetch(
      `/accounts/${ASSINAFY_ACCOUNT_ID}/templates/${ASSINAFY_TEMPLATE_ID}/documents`,
      { method: "POST", body: JSON.stringify(createPayload) },
    );
    if (!created.ok) return json({ error: "assinafy_create_failed", detail: created.data }, 500);

    const doc = created.data?.data || created.data;
    const documentId = doc?.id;
    // signing_url vem no create OU precisamos ir buscar em GET /documents/{id} (depois
    // do processing async terminar). A url é sempre https://app.assinafy.com.br/sign/{docId}
    let signingUrl: string | null = doc?.signing_url || null;
    if (documentId && !signingUrl) {
      // Poll rápido (até 3s) até a URL de assinatura estar pronta
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 500));
        const detail = await assinafyFetch(`/documents/${documentId}`);
        const d = detail.data?.data || detail.data;
        if (d?.signing_url) { signingUrl = d.signing_url; break; }
        if (d?.assignment?.signing_urls?.[0]?.url) {
          signingUrl = d.assignment.signing_urls[0].url;
          break;
        }
      }
    }

    if (!documentId || !signingUrl) {
      return json({ error: "assinafy_no_signing_url", detail: created.data }, 500);
    }

    // Persiste o vínculo no banco pra reaproveitar no próximo request
    await supa.from("proprietarios").update({
      contrato_status: "enviado",
      contrato_document_id: documentId,
      contrato_url: signingUrl,
    }).eq("id", proprietarioId);

    return json({ status: "enviado", document_id: documentId, signing_url: signingUrl });
  } catch (e) {
    return json({ error: "internal", detail: String(e?.message ?? e) }, 500);
  }
});
