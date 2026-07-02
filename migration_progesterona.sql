-- ─────────────────────────────────────────────────────────────────
-- Migração: Progesterona exógena em receptoras
-- Um programa por égua (config) + N aplicações programadas.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS progesterona_programas (
  id TEXT PRIMARY KEY,
  cavalo_id TEXT NOT NULL,
  insumo_id TEXT NOT NULL,
  dose_qtd NUMERIC NOT NULL DEFAULT 0,
  dia_semana INT NOT NULL DEFAULT 1,     -- 0=domingo..6=sábado
  freq_dias INT NOT NULL DEFAULT 7,       -- 7 ou 14
  inicio DATE NOT NULL,
  fim DATE NOT NULL,
  status TEXT DEFAULT 'ativo',            -- ativo | encerrado
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS progesterona_aplicacoes (
  id TEXT PRIMARY KEY,
  programa_id TEXT NOT NULL,
  cavalo_id TEXT NOT NULL,
  data DATE NOT NULL,
  status TEXT DEFAULT 'programado',       -- programado | feito | cancelado
  feito_em TIMESTAMPTZ,
  feito_por TEXT DEFAULT '',
  registro_id TEXT,
  nota TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_prog_prog_cavalo ON progesterona_programas(cavalo_id);
CREATE INDEX IF NOT EXISTS idx_prog_prog_status ON progesterona_programas(status);
CREATE INDEX IF NOT EXISTS idx_prog_apl_programa ON progesterona_aplicacoes(programa_id);
CREATE INDEX IF NOT EXISTS idx_prog_apl_data ON progesterona_aplicacoes(data);

NOTIFY pgrst, 'reload schema';
