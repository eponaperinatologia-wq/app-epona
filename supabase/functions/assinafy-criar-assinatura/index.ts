// Edge Function: cria (ou reutiliza) o documento de assinatura pro proprietário
// e devolve o signing_url pra embedar em iframe no app.
//
// Estratégia atual (Opção 2 da conversa):
//   - O CLIENTE gera o PDF do contrato já preenchido com todos os dados do
//     proprietário (nome, RG, CPF, endereço, etc.) via jsPDF.
//   - Manda o base64 pra essa function.
//   - A function faz upload no Assinafy, cria signer e assignment "virtual".
//   - Devolve o signing_url pro app embedar em iframe.
//
// Templates do Assinafy NÃO conseguem pre-fill via API — por isso geramos o
// PDF client-side. O signer só coloca a assinatura, todos os dados já vêm
// baked no papel.
//
// Segurança:
//   - Só o próprio proprietário logado pode chamar (valida senha via RPC).
//   - A API Key do Assinafy fica APENAS aqui no servidor (secrets do Supabase).

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
      ...(opts.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

// Decodifica base64 para Uint8Array (Deno-nativo, sem Buffer)
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const { proprietarioId, senha, pdfBase64 } = await req.json();
    if (!proprietarioId || !senha) return json({ error: "missing_params" }, 400);
    if (!pdfBase64) return json({ error: "missing_pdf" }, 400);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: propRow, error: propErr } = await supa
      .from("proprietarios")
      .select("id, nome, login, email, nome_completo, cpf, contrato_status, contrato_document_id, contrato_url")
      .eq("id", proprietarioId)
      .maybeSingle();
    if (propErr || !propRow) return json({ error: "not_found" }, 404);

    // Confere senha via RPC (mesmo caminho do login)
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
    // Idempotência: se já criamos um doc pra ele, reaproveita o signing_url
    if (propRow.contrato_document_id && propRow.contrato_url) {
      return json({
        status: propRow.contrato_status || "enviado",
        signing_url: propRow.contrato_url,
        document_id: propRow.contrato_document_id,
      });
    }

    // ── Passo 1: upload do PDF no Assinafy ──────────────
    const pdfBytes = base64ToBytes(pdfBase64);
    const nomeArquivo = `contrato-${(propRow.nome_completo || propRow.nome || "proprietario").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}.pdf`;

    const form = new FormData();
    form.append("file", new Blob([pdfBytes], { type: "application/pdf" }), nomeArquivo);

    const upload = await assinafyFetch(
      `/accounts/${ASSINAFY_ACCOUNT_ID}/documents`,
      { method: "POST", body: form },
    );
    if (!upload.ok) return json({ error: "assinafy_upload_failed", detail: upload.data }, 500);
    const uploaded = upload.data?.data || upload.data;
    const documentId = uploaded?.id;
    if (!documentId) return json({ error: "assinafy_upload_no_id", detail: uploaded }, 500);

    // ── Passo 2: espera o documento ficar pronto ────────
    // Depois do upload o Assinafy processa o PDF (extrai páginas, etc). Só
    // depois de status metadata_ready/pending_signature dá pra criar assignment.
    let ready = false;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      const st = await assinafyFetch(`/documents/${documentId}`);
      const d = st.data?.data || st.data;
      const status = d?.status;
      if (status === "metadata_ready" || status === "pending_signature") { ready = true; break; }
      if (status === "failed" || status === "rejected_by_signer" || status === "rejected_by_user") {
        return json({ error: "assinafy_processing_failed", detail: { status } }, 500);
      }
    }
    if (!ready) return json({ error: "assinafy_processing_timeout" }, 504);

    // ── Passo 3: cria (ou reusa) o signer ───────────────
    const cpfLimpo = (propRow.cpf || "").replace(/\D/g, "");
    const signerPayload = {
      full_name: propRow.nome_completo || propRow.nome,
      email: propRow.email,
      ...(cpfLimpo ? { cpf: cpfLimpo } : {}),
    };
    const signerResp = await assinafyFetch(
      `/accounts/${ASSINAFY_ACCOUNT_ID}/signers`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signerPayload),
      },
    );
    let signer = signerResp.data?.data || signerResp.data;
    if (!signerResp.ok) {
      // Fallback: procura por email
      const search = await assinafyFetch(
        `/accounts/${ASSINAFY_ACCOUNT_ID}/signers?search=${encodeURIComponent(propRow.email || "")}`,
      );
      const list = search.data?.data || [];
      signer = Array.isArray(list) ? list.find((s: any) => s.email === propRow.email) : null;
      if (!signer) return json({ error: "assinafy_signer_failed", detail: signerResp.data }, 500);
    }
    const signerId = signer?.id;
    if (!signerId) return json({ error: "assinafy_signer_no_id" }, 500);

    // ── Passo 4: cria assignment "virtual" ──────────────
    // Sem placement de campos — o Assinafy coloca o botão de assinatura
    // pro signer arrastar/clicar onde for necessário. Como já deixamos a
    // linha de assinatura no PDF, ele só posiciona por cima.
    const assignPayload = {
      method: "virtual",
      signers: [{
        id: signerId,
        verification_method: "Email",
        notification_methods: ["Email"],
      }],
    };
    const assign = await assinafyFetch(
      `/documents/${documentId}/assignments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignPayload),
      },
    );
    if (!assign.ok) return json({ error: "assinafy_assignment_failed", detail: assign.data }, 500);

    const a = assign.data?.data || assign.data;
    // signing_url pode vir em vários formatos — tentamos todos
    let signingUrl: string | null =
      a?.signing_urls?.[0]?.url ??
      a?.signing_url ??
      a?.signers?.[0]?.signing_url ??
      null;

    // Fallback: GET no doc pra pegar signing_url atualizado
    if (!signingUrl) {
      const detail = await assinafyFetch(`/documents/${documentId}`);
      const d = detail.data?.data || detail.data;
      signingUrl = d?.signing_url ??
        d?.assignment?.signing_urls?.[0]?.url ??
        null;
    }

    if (!signingUrl) {
      return json({ error: "assinafy_no_signing_url", detail: assign.data }, 500);
    }

    // Persiste no banco pra reaproveitar em requests subsequentes
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
