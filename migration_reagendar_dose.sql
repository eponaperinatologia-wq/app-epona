-- ─────────────────────────────────────────────────────────────
-- Migração: permitir reagendar dose de vacina/vermífugo
-- Uma dose reagendada aparece na agenda na NOVA data.
-- Idempotente.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE vacinacoes_animais
  ADD COLUMN IF NOT EXISTS reagendado_para DATE;

ALTER TABLE vermifugacoes_animais_verm
  ADD COLUMN IF NOT EXISTS reagendado_para DATE;

NOTIFY pgrst, 'reload schema';
