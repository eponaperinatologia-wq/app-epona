// Edge Function: recebe callbacks do Assinafy quando o documento é assinado.
//
// Segurança:
//  - Valida o header X-Assinafy-Signature (HMAC-SHA256 do corpo com o
//    ASSINAFY_WEBHOOK_SECRET). Nome exato do header pode variar por versão
//    do Assinafy — aceitamos algumas variações comuns.
//  - Sem validação de signature, rejeita.
//
// O que faz:
//  - Extrai o document_id do payload.
//  - Se o evento é de conclusão de assinatura, marca o proprietário
//    correspondente como contrato_status='assinado' + contrato_assinado_em.
//
// Idempotente: pode receber o mesmo callback várias vezes sem estragar
// (só faz update se ainda não estiver 'assinado').

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WEBHOOK_SECRET = Deno.env.get("ASSINAFY_WEBHOOK_SECRET") ?? "";

// Palavras-chave nos nomes de eventos que consideramos "assinado".
// Ampla porque o Assinafy varia: document.signed, assignment.completed,
// certificated, etc.
const EVENTOS_ASSINADO = /(sign|complet|certificat|conclu)/i;

async function verificaHmac(body: string, signatureHeader: string | null) {
  if (!WEBHOOK_SECRET) return true; // permite se admin ainda não configurou secret
  if (!signatureHeader) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  // Aceita comparação case-insensitive e ignora prefixos tipo "sha256="
  const provided = signatureHeader.replace(/^sha256=/i, "").trim().toLowerCase();
  return provided === hex;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  const rawBody = await req.text();
  const sigHeader =
    req.headers.get("x-assinafy-signature") ||
    req.headers.get("x-signature") ||
    req.headers.get("x-webhook-signature");

  const hmacOk = await verificaHmac(rawBody, sigHeader);
  if (!hmacOk) {
    return new Response(JSON.stringify({ error: "invalid_signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); }
  catch { return new Response("bad_json", { status: 400 }); }

  // Formato do payload do Assinafy pode variar — extraímos por múltiplos caminhos
  const eventName: string = payload?.event || payload?.type || payload?.name || "";
  const documentId: string | null =
    payload?.document_id ||
    payload?.document?.id ||
    payload?.data?.document_id ||
    payload?.data?.document?.id ||
    payload?.data?.id ||
    null;

  // Ignora eventos que não são de assinatura completa
  if (!EVENTOS_ASSINADO.test(eventName)) {
    return new Response(JSON.stringify({ ignored: true, event: eventName }), {
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
  if (!documentId) {
    return new Response(JSON.stringify({ error: "no_document_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Marca como assinado (só se ainda não está)
  const { data, error } = await supa
    .from("proprietarios")
    .update({
      contrato_status: "assinado",
      contrato_assinado_em: new Date().toISOString(),
    })
    .eq("contrato_document_id", documentId)
    .neq("contrato_status", "assinado")
    .select("id");

  if (error) {
    return new Response(JSON.stringify({ error: "update_failed", detail: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  return new Response(JSON.stringify({ ok: true, updated: data?.length ?? 0 }), {
    headers: { "Content-Type": "application/json", ...CORS },
  });
});
