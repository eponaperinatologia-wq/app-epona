// Edge Function: cria ou redefine a conta de acesso (Supabase Auth) de um
// funcionário, vet do Epona Repro Team ou proprietário.
//
// Só administradores da equipe chamam (confere o token da sessão via RPC
// meu_acesso). A conta usa um e-mail técnico derivado do login (o mesmo
// cálculo de src/auth-conta.js) e fica ligada à pessoa na tabela acessos.
// Proprietário e Repro ficam com senha provisória (trocam no 1º acesso).

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// Igual a emailDoLogin() de src/auth-conta.js — os dois PRECISAM bater.
function emailDoLogin(tipo: string, login: string) {
  let s = String(login || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]+$/.test(s)) {
    s = "h" + Array.from(new TextEncoder().encode(s)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${s}@${tipo}.epona.invalid`;
}

function traduz(msg: string) {
  if (/already been registered|already exists/i.test(msg)) return "Esse login já é usado por outra pessoa.";
  if (/at least 6|password should be/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  return msg;
}

const TABELA: Record<string, string> = {
  equipe: "funcionarios",
  repro: "vets_externos",
  proprietario: "proprietarios",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── Quem está chamando? Só admin da equipe ──────────
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: quem } = await admin.auth.getUser(jwt);
    if (!quem?.user) return json({ error: "Sessão expirada. Entre de novo." }, 401);
    const comoQuemChamou = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: acesso } = await comoQuemChamou.rpc("meu_acesso");
    if (!acesso || acesso.tipo !== "equipe" || acesso.role !== "admin") {
      return json({ error: "Só administradores podem definir senhas." }, 403);
    }

    const { acao, tipo, refId, login, senha } = await req.json();
    if (acao !== "definir_senha") return json({ error: "Ação inválida." }, 400);
    const tabela = TABELA[tipo];
    if (!tabela || !refId) return json({ error: "Dados incompletos." }, 400);
    if (!senha || String(senha).length < 6) return json({ error: "A senha precisa ter pelo menos 6 caracteres." }, 400);
    const loginLimpo = String(login || "").trim();
    if (tipo !== "equipe" && !loginLimpo) return json({ error: "Login não pode ser vazio." }, 400);

    // Funcionário recém-cadastrado pode ainda estar a caminho do banco (fila
    // offline); Repro/proprietário precisam existir.
    const { data: pessoa } = await admin.from(tabela).select("id, nome").eq("id", refId).maybeSingle();
    if (!pessoa && tipo !== "equipe") return json({ error: "Cadastro não encontrado." }, 404);

    if (tipo !== "equipe") {
      const { data: comLogin } = await admin.from(tabela).select("id, login").not("login", "is", null);
      const repetido = (comLogin || []).some((r: any) =>
        r.id !== refId && String(r.login).trim().toLowerCase() === loginLimpo.toLowerCase());
      if (repetido) return json({ error: "Esse login já é usado por outra pessoa." }, 409);
    }

    const email = emailDoLogin(tipo, tipo === "equipe" ? refId : loginLimpo);
    const { data: existente } = await admin.from("acessos").select("user_id")
      .eq("tipo", tipo).eq("ref_id", refId).eq("teste", false).maybeSingle();

    if (existente) {
      const { error } = await admin.auth.admin.updateUserById(existente.user_id, {
        email, password: senha, email_confirm: true,
      });
      if (error) return json({ error: traduz(error.message) }, 400);
    } else {
      const { data: criado, error } = await admin.auth.admin.createUser({
        email, password: senha, email_confirm: true,
        user_metadata: { nome: pessoa?.nome || null },
        app_metadata: { tipo, ref_id: refId },
      });
      if (error || !criado?.user) return json({ error: traduz(error?.message || "Erro ao criar a conta.") }, 400);
      const { error: erroAcesso } = await admin.from("acessos").insert({ user_id: criado.user.id, tipo, ref_id: refId });
      if (erroAcesso) {
        await admin.auth.admin.deleteUser(criado.user.id);
        return json({ error: erroAcesso.message }, 500);
      }
    }

    if (tipo !== "equipe") {
      await admin.from(tabela).update({ login: loginLimpo, senha_provisoria: true, senha_hash: null }).eq("id", refId);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
