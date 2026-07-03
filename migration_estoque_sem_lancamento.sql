-- ─────────────────────────────────────────────────────────────
-- Migração: marca compras de estoque que não devem gerar saída
-- em Financeiro (pedidos parcelados já lançados como boletos).
-- Idempotente.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE estoque_compras
  ADD COLUMN IF NOT EXISTS sem_lancamento BOOLEAN DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
