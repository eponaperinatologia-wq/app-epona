-- ─────────────────────────────────────────────────────────────────
-- Migração: insumos adicionais em medicações de emergência (serviços)
-- Ex.: uma soroterapia pode adicionar soros e vitaminas ao procedimento.
-- Idempotente.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE emergencia_medicacoes
  ADD COLUMN IF NOT EXISTS insumos_adicionais JSONB DEFAULT '[]';

NOTIFY pgrst, 'reload schema';
