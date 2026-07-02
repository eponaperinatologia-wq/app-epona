-- ─────────────────────────────────────────────────────────────────
-- Migração: garantir todas as colunas de protocolos_vermifugacao e
-- protocolos_vacinacao usadas pelo app. Idempotente.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE protocolos_vermifugacao
  ADD COLUMN IF NOT EXISTS nome TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS descricao TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS subtipo TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS intervalo_dias INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insumo_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS animais_alvo JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS data_fixa DATE,
  ADD COLUMN IF NOT EXISTS evento_unico BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS evento_referencia TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS laboratorio TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS servico_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS doses JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS etapas JSONB DEFAULT '[]';

ALTER TABLE protocolos_vacinacao
  ADD COLUMN IF NOT EXISTS descricao TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS intervalo_dias INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insumo_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS animais_alvo JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS data_fixa DATE,
  ADD COLUMN IF NOT EXISTS evento_unico BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS evento_referencia TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS doses JSONB DEFAULT '[]';

NOTIFY pgrst, 'reload schema';
