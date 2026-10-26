-- ─────────────────────────────────────────────────────────────────
-- App Epona — Aluguel de Receptora
--
-- Novo campo no proprietário: valor_aluguel_receptora. Cobrado
-- quando um embrião é transferido para uma receptora de outro
-- proprietário e a gestação é confirmada no DG45+. O valor cadastrado
-- é o do dono da RECEPTORA; a cobrança entra na fatura do dono da
-- DOADORA. Se receptora e doadora são do mesmo dono, não há cobrança.
--
-- Idempotente.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE proprietarios
  ADD COLUMN IF NOT EXISTS valor_aluguel_receptora NUMERIC DEFAULT 0;
