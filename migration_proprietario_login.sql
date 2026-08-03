-- ─────────────────────────────────────────────────────────────
-- Migration: Login de proprietário
-- Data: 2026-08-03
--
-- Objetivo: dar aos proprietários um app read-only com login + senha.
-- Fluxo: admin cria credencial → 1º acesso pede troca de senha →
--        cadastro completo → assinatura de contrato Assinafy → app.
--
-- Senha guardada como bcrypt via pgcrypto — nunca em texto puro.
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Colunas em proprietarios ─────────────────────────────────
ALTER TABLE proprietarios
  ADD COLUMN IF NOT EXISTS login TEXT,
  ADD COLUMN IF NOT EXISTS senha_hash TEXT,
  ADD COLUMN IF NOT EXISTS senha_provisoria BOOLEAN DEFAULT TRUE,
  -- Cadastro completo (preenchido pelo proprietário no 1º acesso)
  ADD COLUMN IF NOT EXISTS nome_completo TEXT,
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS profissao TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS rua TEXT,
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS complemento TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT,
  ADD COLUMN IF NOT EXISTS cadastro_completo BOOLEAN DEFAULT FALSE,
  -- Contrato via Assinafy
  ADD COLUMN IF NOT EXISTS contrato_status TEXT DEFAULT 'pendente', -- pendente | enviado | assinado
  ADD COLUMN IF NOT EXISTS contrato_document_id TEXT,               -- id retornado pelo Assinafy
  ADD COLUMN IF NOT EXISTS contrato_url TEXT,                       -- url de assinatura embed
  ADD COLUMN IF NOT EXISTS contrato_assinado_em TIMESTAMPTZ;

-- Índice único no login (case-insensitive) — permite NULL (proprietários
-- sem acesso liberado). Rejeita duplicatas quando login está preenchido.
CREATE UNIQUE INDEX IF NOT EXISTS proprietarios_login_unique_ci
  ON proprietarios (LOWER(login))
  WHERE login IS NOT NULL;

-- ── RPC: admin cria/reseta credencial ────────────────────────
-- Chamada quando o admin gera o acesso na página do proprietário.
-- Senha marcada como provisória → força troca no 1º login.
CREATE OR REPLACE FUNCTION criar_credencial_proprietario(
  p_id TEXT,
  p_login TEXT,
  p_senha TEXT
) RETURNS void AS $$
BEGIN
  IF p_login IS NULL OR length(trim(p_login)) = 0 THEN
    RAISE EXCEPTION 'Login não pode ser vazio';
  END IF;
  IF p_senha IS NULL OR length(p_senha) < 4 THEN
    RAISE EXCEPTION 'Senha deve ter no mínimo 4 caracteres';
  END IF;
  UPDATE proprietarios
     SET login = trim(p_login),
         senha_hash = crypt(p_senha, gen_salt('bf')),
         senha_provisoria = TRUE
   WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proprietário % não encontrado', p_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC: verifica senha no login ─────────────────────────────
-- Retorna dados básicos do proprietário se senha bater. Vazio se não.
CREATE OR REPLACE FUNCTION verify_senha_proprietario(
  p_login TEXT,
  p_senha TEXT
) RETURNS TABLE (
  id TEXT,
  login TEXT,
  nome TEXT,
  senha_provisoria BOOLEAN,
  cadastro_completo BOOLEAN,
  contrato_status TEXT
) AS $$
BEGIN
  RETURN QUERY
    SELECT p.id, p.login, p.nome, p.senha_provisoria, p.cadastro_completo, p.contrato_status
      FROM proprietarios p
     WHERE LOWER(p.login) = LOWER(trim(p_login))
       AND p.senha_hash IS NOT NULL
       AND p.senha_hash = crypt(p_senha, p.senha_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC: proprietário troca própria senha ────────────────────
-- Requer senha antiga. Ao trocar, marca senha_provisoria = FALSE.
CREATE OR REPLACE FUNCTION trocar_senha_proprietario(
  p_login TEXT,
  p_senha_antiga TEXT,
  p_senha_nova TEXT
) RETURNS boolean AS $$
DECLARE
  v_ok INT;
BEGIN
  IF p_senha_nova IS NULL OR length(p_senha_nova) < 6 THEN
    RAISE EXCEPTION 'Nova senha deve ter no mínimo 6 caracteres';
  END IF;
  UPDATE proprietarios
     SET senha_hash = crypt(p_senha_nova, gen_salt('bf')),
         senha_provisoria = FALSE
   WHERE LOWER(login) = LOWER(trim(p_login))
     AND senha_hash IS NOT NULL
     AND senha_hash = crypt(p_senha_antiga, senha_hash);
  GET DIAGNOSTICS v_ok = ROW_COUNT;
  RETURN v_ok > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Permissões ───────────────────────────────────────────────
-- Neste app o cliente usa a chave anon do Supabase. Como toda a proteção
-- é no client-side (mesmo padrão dos funcionarios em texto puro), exponho
-- as RPCs pra anon. O hash bcrypt é a barreira real: mesmo se alguém abrir
-- o banco não vê a senha, e a RPC de troca exige a senha antiga.
GRANT EXECUTE ON FUNCTION criar_credencial_proprietario(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_senha_proprietario(TEXT, TEXT)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION trocar_senha_proprietario(TEXT, TEXT, TEXT)    TO anon, authenticated;
