-- ─────────────────────────────────────────────────────────────────
-- Migração: rastrear descartáveis criados por aplicação de progesterona
-- Necessário porque progesterona é injetável — cada aplicação cobra
-- agulha, seringa e algodão além do medicamento. Ao desmarcar,
-- precisamos apagar todos os registros criados.
-- Idempotente.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE progesterona_aplicacoes
  ADD COLUMN IF NOT EXISTS descartaveis_registros JSONB DEFAULT '[]';

NOTIFY pgrst, 'reload schema';
