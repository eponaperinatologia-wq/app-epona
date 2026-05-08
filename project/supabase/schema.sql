-- ================================================================
-- EPONA APP — SCHEMA COMPLETO
-- Cole no SQL Editor do Supabase e execute (Run)
-- ================================================================

-- ── DROP (ordem inversa das FKs) ───────────────────────────────
DROP TABLE IF EXISTS eventos         CASCADE;
DROP TABLE IF EXISTS avisos          CASCADE;
DROP TABLE IF EXISTS movimentacoes   CASCADE;
DROP TABLE IF EXISTS partos          CASCADE;
DROP TABLE IF EXISTS procedimentos   CASCADE;
DROP TABLE IF EXISTS registros       CASCADE;
DROP TABLE IF EXISTS funcionarios    CASCADE;
DROP TABLE IF EXISTS servicos        CASCADE;
DROP TABLE IF EXISTS insumos         CASCADE;
DROP TABLE IF EXISTS cavalos         CASCADE;
DROP TABLE IF EXISTS proprietarios   CASCADE;

-- ── PROPRIETÁRIOS ──────────────────────────────────────────────
CREATE TABLE proprietarios (
  id          TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  telefone    TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── CAVALOS ────────────────────────────────────────────────────
CREATE TABLE cavalos (
  id                      TEXT PRIMARY KEY,
  nome                    TEXT NOT NULL,
  pelagem                 TEXT DEFAULT '',
  sexo                    TEXT DEFAULT '',
  categoria               TEXT DEFAULT '',
  categorias              JSONB DEFAULT '[]'::jsonb,
  nascimento              TEXT DEFAULT '',
  proprietario_id         TEXT REFERENCES proprietarios(id) ON DELETE SET NULL,
  baia                    TEXT DEFAULT '',
  piquete                 TEXT DEFAULT '',
  mensalidade             INTEGER DEFAULT 0,
  obs                     TEXT DEFAULT '',
  nutricao                JSONB DEFAULT '{}'::jsonb,
  gestacao                JSONB,
  historico_gestacional   JSONB DEFAULT '[]'::jsonb,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── INSUMOS ────────────────────────────────────────────────────
CREATE TABLE insumos (
  id           TEXT PRIMARY KEY,
  nome         TEXT NOT NULL,
  categoria    TEXT NOT NULL,
  unidade      TEXT DEFAULT 'un',
  fornecedor   TEXT DEFAULT '',
  valor_compra NUMERIC(12,4) DEFAULT 0,
  markup       NUMERIC(5,2)  DEFAULT 0,
  valor_venda  NUMERIC(12,4) DEFAULT 0,
  injetavel    BOOLEAN DEFAULT FALSE,
  descartaveis JSONB DEFAULT '[]'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── SERVIÇOS ───────────────────────────────────────────────────
CREATE TABLE servicos (
  id                        TEXT PRIMARY KEY,
  nome                      TEXT NOT NULL,
  valor                     NUMERIC(10,2) DEFAULT 0,
  categoria                 TEXT NOT NULL,
  descartaveis_obrigatorios JSONB DEFAULT '[]'::jsonb,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ── FUNCIONÁRIOS ───────────────────────────────────────────────
CREATE TABLE funcionarios (
  id           TEXT PRIMARY KEY,
  nome         TEXT NOT NULL,
  funcao       TEXT NOT NULL,
  aniversario  TEXT DEFAULT '',
  login        TEXT UNIQUE,
  senha        TEXT DEFAULT '',
  escala       JSONB DEFAULT '{}'::jsonb,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── REGISTROS DE INSUMOS ───────────────────────────────────────
CREATE TABLE registros (
  id         TEXT PRIMARY KEY,
  cavalo_id  TEXT REFERENCES cavalos(id) ON DELETE CASCADE,
  insumo_id  TEXT REFERENCES insumos(id) ON DELETE SET NULL,
  qtd        NUMERIC(10,3) DEFAULT 1,
  hora       TEXT DEFAULT '',
  usuario    TEXT DEFAULT '',
  is_auto    BOOLEAN DEFAULT FALSE,
  data       DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── PROCEDIMENTOS (serviços registrados) ───────────────────────
CREATE TABLE procedimentos (
  id                        TEXT PRIMARY KEY,
  cavalo_id                 TEXT REFERENCES cavalos(id) ON DELETE CASCADE,
  servico_id                TEXT REFERENCES servicos(id) ON DELETE SET NULL,
  valor_servico             NUMERIC(10,2) DEFAULT 0,
  descartaveis_obrigatorios JSONB DEFAULT '[]'::jsonb,
  insumos_adicionais        JSONB DEFAULT '[]'::jsonb,
  motoboy                   JSONB DEFAULT '{"ativo":false,"valor":0}'::jsonb,
  total                     NUMERIC(10,2) DEFAULT 0,
  hora                      TEXT DEFAULT '',
  nota                      TEXT DEFAULT '',
  data                      DATE DEFAULT CURRENT_DATE,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ── PARTOS ─────────────────────────────────────────────────────
CREATE TABLE partos (
  id                  TEXT PRIMARY KEY,
  egua_id             TEXT REFERENCES cavalos(id) ON DELETE SET NULL,
  potro_id            TEXT REFERENCES cavalos(id) ON DELETE SET NULL,
  data                TEXT DEFAULT '',
  sexo_potro          TEXT DEFAULT '',
  nome_potro          TEXT DEFAULT '',
  peso_potro          NUMERIC(6,2),
  mamou_colostro      BOOLEAN DEFAULT FALSE,
  hora_primeiro_leite TEXT DEFAULT '',
  status              TEXT DEFAULT 'normal',
  obs                 TEXT DEFAULT '',
  insumos_parto       JSONB DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── MOVIMENTAÇÕES (entrada / saída) ────────────────────────────
CREATE TABLE movimentacoes (
  id             TEXT PRIMARY KEY,
  cavalo_id      TEXT REFERENCES cavalos(id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  data           TEXT DEFAULT '',
  motivo         TEXT DEFAULT '',
  usuario        TEXT DEFAULT '',
  gta_confirmada BOOLEAN,
  cobrada_gta    BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── AVISOS (mural) ─────────────────────────────────────────────
CREATE TABLE avisos (
  id           TEXT PRIMARY KEY,
  autor        TEXT DEFAULT '',
  avatar       TEXT DEFAULT '',
  tempo        TEXT DEFAULT '',
  texto        TEXT DEFAULT '',
  urgente      BOOLEAN DEFAULT FALSE,
  tipo         TEXT DEFAULT '',
  cavalo_id    TEXT REFERENCES cavalos(id) ON DELETE CASCADE,
  data_entrada TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── EVENTOS (planner) ──────────────────────────────────────────
CREATE TABLE eventos (
  id             TEXT PRIMARY KEY,
  tipo           TEXT DEFAULT '',
  data           TEXT DEFAULT '',
  hora           TEXT DEFAULT '',
  descricao      TEXT DEFAULT '',
  cavalo_id      TEXT REFERENCES cavalos(id) ON DELETE SET NULL,
  funcionario_id TEXT REFERENCES funcionarios(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE proprietarios  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavalos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios    ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros       ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedimentos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE partos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE avisos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos         ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'proprietarios','cavalos','insumos','servicos','funcionarios',
    'registros','procedimentos','partos','movimentacoes','avisos','eventos'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY allow_all ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- ================================================================
-- TRIGGER: updated_at automático
-- ================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'proprietarios','cavalos','insumos','servicos','funcionarios'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t
    );
  END LOOP;
END $$;
