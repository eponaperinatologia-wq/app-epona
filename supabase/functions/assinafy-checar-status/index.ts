// Edge Function: consulta o status do contrato direto no Assinafy.
//
// Usada pelo cliente pra fazer poll do estado da assinatura SEM depender
// de webhook. Se o Assinafy devolve status 'certificated', atualiza o
// banco e devolve 'assinado'.
//
// Isso é a rede de segurança: se o webhook falhar ou não estiver
// registrado, o cliente ainda consegue detectar a assinatura por poll.

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ASSINAFY_BASE = Deno.env.get("ASSINAFY_BASE_URL") ?? "https://api.assinafy.com.br/v1";
const ASSINAFY_API_KEY = Deno.env.get("ASSINAFY_API_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const { proprietarioId, senha } = await req.json();
    if (!proprietarioId || !senha) return json({ error: "missing_params" }, 400);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: propRow, error: propErr } = await supa
      .from("proprietarios")
      .select("id, login, contrato_status, contrato_document_id")
      .eq("id", proprietarioId)
      .maybeSingle();
    if (propErr || !propRow) return json({ error: "not_found" }, 404);

    // Autentica via RPC (mesmo caminho do login)
    const { data: verify, error: verifyErr } = await supa.rpc("verify_senha_proprietario", {
      p_login: propRow.login,
      p_senha: senha,
    });
    if (verifyErr) return json({ error: "verify_failed", detail: verifyErr.message }, 500);
    const v = Array.isArray(verify) ? verify[0] : verify;
    if (!v || v.id !== proprietarioId) return json({ error: "unauthorized" }, 401);

    if (propRow.contrato_status === "assinado") return json({ status: "assinado" });
    if (!propRow.contrato_document_id) return json({ status: "sem_documento" });

    // Consulta status no Assinafy
    const r = await fetch(`${ASSINAFY_BASE}/documents/${propRow.contrato_document_id}`, {
      headers: { "X-Api-Key": ASSINAFY_API_KEY },
    });
    const text = await r.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!r.ok) return json({ error: "assinafy_status_failed", detail: data }, 500);

    const d = data?.data || data;
    const assinafyStatus = d?.status;
    const summary = d?.assignment?.summary;
    // "certificated" = totalmente assinado. Também aceitamos summary onde
    // completed_count === signer_count (fallback).
    const totalmenteAssinado =
      assinafyStatus === "certificated" ||
      (summary && summary.signer_count > 0 && summary.signer_count === summary.completed_count);

    if (totalmenteAssinado) {
      const nowIso = new Date().toISOString();
      await supa
        .from("proprietarios")
        .update({
          contrato_status: "assinado",
          contrato_assinado_em: nowIso,
        })
        .eq("id", proprietarioId)
        .neq("contrato_status", "assinado");
      return json({ status: "assinado", contrato_assinado_em: nowIso });
    }

    return json({
      status: "aguardando",
      assinafy_status: assinafyStatus,
      completed: summary?.completed_count ?? 0,
      total: summary?.signer_count ?? 1,
    });
  } catch (e) {
    return json({ error: "internal", detail: String(e?.message ?? e) }, 500);
  }
});
