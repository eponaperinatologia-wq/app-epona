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

// Mapeamento fixo: cada label do template → field_id do Assinafy.
// Extraído da API do template Proprietários Epona Stud em 2026-08-04.
const FIELD_MAP: Record<string, string> = {
  nome: "103ddd20b352a82981f0d1335096",
  nacionalidade: "103de60ee4ee129d427e0db79be3",
  profissao: "103de62cb844afc0ac3f016907c6",
  estado_civil: "103de61520ae0b80ae6b38ff6732",
  rg: "103de610fcb1dd9e64001aca981b",
  cpf: "103ddd20b35ca7308ccc7d736440",
  endereco: "103de618a4651c1553f6b198ad29",
  cep: "103ddd20b3942babd4d1a8c85afa",
  telefone: "103ddd20b383d8c596a40d26b45a",
  email: "103ddd20b3a103444b0c80bb795e",
};

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

    // Monta endereço completo a partir dos campos separados
    const endereco = [
      propRow.rua,
      propRow.numero,
      propRow.complemento,
      propRow.bairro,
      propRow.cidade,
      propRow.estado,
    ].filter(Boolean).join(", ");

    const field_values: Record<string, string> = {};
    field_values[FIELD_MAP.nome] = propRow.nome_completo || propRow.nome || "";
    field_values[FIELD_MAP.nacionalidade] = propRow.nacionalidade || "";
    field_values[FIELD_MAP.profissao] = propRow.profissao || "";
    field_values[FIELD_MAP.estado_civil] = propRow.estado_civil || "";
    field_values[FIELD_MAP.rg] = propRow.rg || "";
    field_values[FIELD_MAP.cpf] = propRow.cpf || "";
    field_values[FIELD_MAP.endereco] = endereco;
    field_values[FIELD_MAP.cep] = propRow.cep || "";
    field_values[FIELD_MAP.telefone] = propRow.telefone || "";
    field_values[FIELD_MAP.email] = propRow.email || "";

    const payload = {
      signers: [{
        role_id: ASSINAFY_ROLE_ID,
        full_name: propRow.nome_completo || propRow.nome,
        email: propRow.email,
        cpf: (propRow.cpf || "").replace(/\D/g, ""),
        field_values,
      }],
    };

    const created = await assinafyFetch(
      `/accounts/${ASSINAFY_ACCOUNT_ID}/templates/${ASSINAFY_TEMPLATE_ID}/documents`,
      { method: "POST", body: JSON.stringify(payload) },
    );
    if (!created.ok) return json({ error: "assinafy_create_failed", detail: created.data }, 500);

    // Formato típico do Assinafy: data.id (documento) e data.assignments[0].signers[0].signing_url
    const doc = created.data?.data || created.data;
    const documentId = doc?.id;
    let signingUrl: string | null =
      doc?.signing_url ??
      doc?.assignments?.[0]?.signers?.[0]?.signing_url ??
      doc?.signers?.[0]?.signing_url ??
      null;

    // Se o create-from-template não devolveu o signing_url, criamos o
    // assignment manualmente pra obter (fallback).
    if (documentId && !signingUrl) {
      const assign = await assinafyFetch(
        `/documents/${documentId}/assignments`,
        {
          method: "POST",
          body: JSON.stringify({ signer_ids: doc?.signers?.map((s: any) => s.id) ?? [] }),
        },
      );
      if (assign.ok) {
        const a = assign.data?.data || assign.data;
        signingUrl = a?.signers?.[0]?.signing_url ?? a?.signing_urls?.[0] ?? null;
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
