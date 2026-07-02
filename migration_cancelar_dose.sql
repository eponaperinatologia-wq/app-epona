-- ─────────────────────────────────────────────────────────────
-- Migração: permitir cancelar doses de vacina e vermífugo
-- ─────────────────────────────────────────────────────────────

ALTER TABLE vacinacoes_animais
  ADD COLUMN IF NOT EXISTS cancelado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelado_por TEXT DEFAULT '';

ALTER TABLE vermifugacoes_animais_verm
  ADD COLUMN IF NOT EXISTS cancelado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelado_por TEXT DEFAULT '';

NOTIFY pgrst, 'reload schema';
