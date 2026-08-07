-- ─────────────────────────────────────────────────────────────
-- Migration: Fase 1b do módulo Repro — valor do resultado
-- reprodutivo (cobrado no DG30+) fica por proprietário.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE proprietarios
  ADD COLUMN IF NOT EXISTS valor_resultado_repro NUMERIC DEFAULT 0;

UPDATE proprietarios
   SET valor_resultado_repro = 0
 WHERE valor_resultado_repro IS NULL;
