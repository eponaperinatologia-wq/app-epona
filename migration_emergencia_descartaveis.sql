-- ─────────────────────────────────────────────────────────────────
-- Migração: rastrear descartáveis criados por medicação de emergência
-- Precisa disso pra desmarcar medicação e apagar os registros de
-- agulha/seringa/algodão junto.
-- Idempotente. Rode uma vez.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE emergencia_medicacoes
  ADD COLUMN IF NOT EXISTS descartaveis_registros JSONB DEFAULT '[]';

NOTIFY pgrst, 'reload schema';
