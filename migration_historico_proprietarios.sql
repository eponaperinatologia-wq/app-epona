-- ─────────────────────────────────────────────────────────────
-- Histórico de transferência de proprietário em cavalos
--
-- Formato: [{ proprietarioIds: [uuid[]], dataInicio: 'YYYY-MM-DD' }]
-- Ordenado por dataInicio ASC. Cada entrada é um período que vai
-- até o dataInicio da próxima (ou até hoje, se última).
-- Se vazio ou NULL, o cavalo sempre teve os proprietarioIds atual.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE cavalos
  ADD COLUMN IF NOT EXISTS historico_proprietarios JSONB DEFAULT '[]'::jsonb;

UPDATE cavalos SET historico_proprietarios = '[]'::jsonb WHERE historico_proprietarios IS NULL;
