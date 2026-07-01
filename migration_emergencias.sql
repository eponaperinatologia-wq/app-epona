-- ─────────────────────────────────────────────────────────────────
-- App Epona — Migração: área de Emergências veterinárias
-- Idempotente (IF NOT EXISTS). Cole no Supabase SQL Editor → Run.
-- ─────────────────────────────────────────────────────────────────

-- ── Novas colunas em insumos (forma de cobrança "frasco ao abrir") ──
ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS forma_cobranca TEXT DEFAULT 'por_uso',
  ADD COLUMN IF NOT EXISTS valor_frasco NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS validade_apos_aberta_dias INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capacidade_por_frasco NUMERIC DEFAULT 0;

-- ── Tabelas novas ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emergencias (
  id TEXT PRIMARY KEY,
  cavalo_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  motivo TEXT DEFAULT '',
  status TEXT DEFAULT 'ativa',
  observacao_urgente TEXT DEFAULT '',
  aberta_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  encerrada_em TIMESTAMPTZ,
  autor_abertura TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS emergencia_medicacoes (
  id TEXT PRIMARY KEY,
  emergencia_id TEXT NOT NULL,
  insumo_id TEXT,
  servico_id TEXT,
  dose_qtd NUMERIC DEFAULT 0,
  unidade TEXT DEFAULT '',
  data DATE NOT NULL,
  hora TEXT NOT NULL,
  recorrencia JSONB DEFAULT '{}',
  status TEXT DEFAULT 'programado',
  feito_em TIMESTAMPTZ,
  feito_por TEXT DEFAULT '',
  registro_id TEXT,
  procedimento_id TEXT,
  frasco_id TEXT,
  nota TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS emergencia_param_agenda (
  id TEXT PRIMARY KEY,
  emergencia_id TEXT NOT NULL,
  intervalo_horas NUMERIC NOT NULL DEFAULT 4,
  inicio TIMESTAMPTZ NOT NULL,
  ate TIMESTAMPTZ,
  ativo BOOLEAN DEFAULT TRUE,
  quais JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS emergencia_parametros (
  id TEXT PRIMARY KEY,
  emergencia_id TEXT NOT NULL,
  agenda_id TEXT,
  data_hora TIMESTAMPTZ NOT NULL,
  temperatura NUMERIC,
  fc INT,
  fr INT,
  mucosas TEXT,
  fezes TEXT,
  urina TEXT,
  atitude TEXT,
  obs TEXT DEFAULT '',
  autor TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS emergencia_notas (
  id TEXT PRIMARY KEY,
  emergencia_id TEXT NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL,
  autor TEXT DEFAULT '',
  texto TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS emergencia_exames (
  id TEXT PRIMARY KEY,
  emergencia_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  arquivo_url TEXT DEFAULT '',
  arquivo_nome TEXT DEFAULT '',
  arquivo_tipo TEXT DEFAULT '',
  data_hora TIMESTAMPTZ NOT NULL,
  autor TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS frascos_abertos (
  id TEXT PRIMARY KEY,
  insumo_id TEXT NOT NULL,
  cavalo_id TEXT NOT NULL,
  emergencia_id TEXT,
  aberto_em TIMESTAMPTZ NOT NULL,
  valido_ate TIMESTAMPTZ NOT NULL,
  capacidade NUMERIC NOT NULL,
  consumido NUMERIC NOT NULL DEFAULT 0,
  valor_cobrado NUMERIC NOT NULL,
  registro_id TEXT
);

-- ── Índices úteis (leituras frequentes por cavalo/emergência) ────
CREATE INDEX IF NOT EXISTS idx_emergencias_status ON emergencias(status);
CREATE INDEX IF NOT EXISTS idx_emerg_med_emergencia ON emergencia_medicacoes(emergencia_id);
CREATE INDEX IF NOT EXISTS idx_emerg_med_status ON emergencia_medicacoes(status);
CREATE INDEX IF NOT EXISTS idx_emerg_par_agenda_emerg ON emergencia_param_agenda(emergencia_id);
CREATE INDEX IF NOT EXISTS idx_emerg_parametros_emerg ON emergencia_parametros(emergencia_id);
CREATE INDEX IF NOT EXISTS idx_emerg_notas_emerg ON emergencia_notas(emergencia_id);
CREATE INDEX IF NOT EXISTS idx_emerg_exames_emerg ON emergencia_exames(emergencia_id);
CREATE INDEX IF NOT EXISTS idx_frascos_cav_ins ON frascos_abertos(cavalo_id, insumo_id, valido_ate);

NOTIFY pgrst, 'reload schema';
