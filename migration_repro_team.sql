-- ─────────────────────────────────────────────────────────────
-- Migration: Módulo Epona Repro Team (Fase 1)
-- Data: 2026-08-07
--
-- Cria um "workspace" paralelo dentro do mesmo app pros vets externos
-- que fazem reprodução em harás de terceiros. Dados TOTALMENTE isolados
-- do haras principal via workspace_id — o admin do haras não vê nada do
-- repro team e vice-versa.
--
-- Isolamento: coluna workspace_id ('haras' ou 'repro') em cada tabela
-- compartilhada. Backfill: linhas antigas ficam em 'haras'.
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── workspace_id em tabelas compartilhadas ───────────────────
ALTER TABLE proprietarios          ADD COLUMN IF NOT EXISTS workspace_id TEXT DEFAULT 'haras';
ALTER TABLE cavalos                ADD COLUMN IF NOT EXISTS workspace_id TEXT DEFAULT 'haras';
ALTER TABLE insumos                ADD COLUMN IF NOT EXISTS workspace_id TEXT DEFAULT 'haras';
ALTER TABLE servicos               ADD COLUMN IF NOT EXISTS workspace_id TEXT DEFAULT 'haras';
ALTER TABLE reproducao_registros   ADD COLUMN IF NOT EXISTS workspace_id TEXT DEFAULT 'haras';
ALTER TABLE reproducao_registros   ADD COLUMN IF NOT EXISTS vet_id TEXT;
ALTER TABLE reproducao_registros   ADD COLUMN IF NOT EXISTS local_id TEXT;

-- Backfill defensivo (caso NULL após alter em algum registro antigo)
UPDATE proprietarios        SET workspace_id = 'haras' WHERE workspace_id IS NULL;
UPDATE cavalos              SET workspace_id = 'haras' WHERE workspace_id IS NULL;
UPDATE insumos              SET workspace_id = 'haras' WHERE workspace_id IS NULL;
UPDATE servicos             SET workspace_id = 'haras' WHERE workspace_id IS NULL;
UPDATE reproducao_registros SET workspace_id = 'haras' WHERE workspace_id IS NULL;

-- Índices para acelerar filtros por workspace
CREATE INDEX IF NOT EXISTS proprietarios_workspace_idx        ON proprietarios (workspace_id);
CREATE INDEX IF NOT EXISTS cavalos_workspace_idx              ON cavalos (workspace_id);
CREATE INDEX IF NOT EXISTS insumos_workspace_idx              ON insumos (workspace_id);
CREATE INDEX IF NOT EXISTS servicos_workspace_idx             ON servicos (workspace_id);
CREATE INDEX IF NOT EXISTS reproducao_registros_workspace_idx ON reproducao_registros (workspace_id);

-- ── Tabela: vets_externos ───────────────────────────────────
-- Vets do time repro. Mesmo padrão de auth do proprietário: bcrypt
-- via pgcrypto, senha nunca em texto puro. Cor identifica o vet no
-- caderno e calendário.
CREATE TABLE IF NOT EXISTS vets_externos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#7c2d8c', -- hex, usada no caderno/calendário do repro
  login TEXT,
  senha_hash TEXT,
  senha_provisoria BOOLEAN DEFAULT TRUE,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS vets_externos_login_unique_ci
  ON vets_externos (LOWER(login))
  WHERE login IS NOT NULL;

-- ── Tabela: locais_repro ────────────────────────────────────
-- Harás de terceiros que o repro team atende. Um local pode ter vários
-- proprietários; cada visita cobra km + procedimentos.
CREATE TABLE IF NOT EXISTS locais_repro (
  id TEXT PRIMARY KEY,
  workspace_id TEXT DEFAULT 'repro',
  nome TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS locais_repro_workspace_idx ON locais_repro (workspace_id);

-- ── Tabela: vet_km_por_local ────────────────────────────────
-- Valor de km cobrado por vet+local. Se vet A cobra R$ 100 no Haras X
-- e R$ 150 no Haras Y, aqui ficam 2 linhas. Divisão pelo nº de
-- proprietários atendidos na visita é feita no client.
CREATE TABLE IF NOT EXISTS vet_km_por_local (
  id TEXT PRIMARY KEY,
  vet_id TEXT NOT NULL,
  local_id TEXT NOT NULL,
  valor NUMERIC DEFAULT 0,
  UNIQUE (vet_id, local_id)
);

-- ── RPCs de auth do vet externo ─────────────────────────────
-- Espelho fiel dos RPCs do proprietário (criar/verify/trocar).

CREATE OR REPLACE FUNCTION criar_credencial_vet_externo(
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
  UPDATE vets_externos
     SET login = trim(p_login),
         senha_hash = crypt(p_senha, gen_salt('bf')),
         senha_provisoria = TRUE,
         updated_at = NOW()
   WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vet externo % não encontrado', p_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION verify_senha_vet_externo(
  p_login TEXT,
  p_senha TEXT
) RETURNS TABLE (
  id TEXT,
  login TEXT,
  nome TEXT,
  cor TEXT,
  senha_provisoria BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
    SELECT v.id, v.login, v.nome, v.cor, v.senha_provisoria
      FROM vets_externos v
     WHERE LOWER(v.login) = LOWER(trim(p_login))
       AND v.ativo = TRUE
       AND v.senha_hash IS NOT NULL
       AND v.senha_hash = crypt(p_senha, v.senha_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trocar_senha_vet_externo(
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
  UPDATE vets_externos
     SET senha_hash = crypt(p_senha_nova, gen_salt('bf')),
         senha_provisoria = FALSE,
         updated_at = NOW()
   WHERE LOWER(login) = LOWER(trim(p_login))
     AND senha_hash IS NOT NULL
     AND senha_hash = crypt(p_senha_antiga, senha_hash);
  GET DIAGNOSTICS v_ok = ROW_COUNT;
  RETURN v_ok > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION criar_credencial_vet_externo(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_senha_vet_externo(TEXT, TEXT)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION trocar_senha_vet_externo(TEXT, TEXT, TEXT)    TO anon, authenticated;
