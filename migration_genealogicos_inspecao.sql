-- ─────────────────────────────────────────────────────────────────
-- App Epona — Expansão dos processos genealógicos (ABCCH)
--
-- Adiciona:
--  - nome do potro (preenchido pós-nascimento)
--  - data agendada da inspeção (quando preenchida, gera evento no
--    kanban + aviso de 'pegar maleta' pro Alexandre)
--  - local/km/pelagem/microchip/observações da inspeção (preenchidos
--    na tela de registro da inspeção que abre do kanban)
--
-- Idempotente.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE genealogicos_repro
  ADD COLUMN IF NOT EXISTS nome_potro TEXT,
  ADD COLUMN IF NOT EXISTS inspecao_agendada_data TEXT,
  ADD COLUMN IF NOT EXISTS inspecao_local_id TEXT,
  ADD COLUMN IF NOT EXISTS inspecao_km_valor NUMERIC,
  ADD COLUMN IF NOT EXISTS inspecao_pelagem TEXT,
  ADD COLUMN IF NOT EXISTS inspecao_microchip TEXT,
  ADD COLUMN IF NOT EXISTS inspecao_observacoes TEXT;
