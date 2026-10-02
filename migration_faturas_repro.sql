-- ─────────────────────────────────────────────────────────────────
-- App Epona — Migração: faturas da Epona Repro Team
--
-- Cria tabela faturas_repro para persistir faturas fechadas da área
-- veterinária Repro Team, com snapshot do cálculo, divisão por vet/Epona
-- e status de pagamento. Até aqui as faturas repro eram calculadas sempre
-- on-the-fly (faturaRepro.calcFaturaRepro) e nunca persistidas, o que
-- impedia rastrear pagamento individual e fazer o repasse por fatura.
--
-- Idempotente (IF NOT EXISTS). Cole no Supabase SQL Editor → Run,
-- ou aplique via `supabase db query -f migration_faturas_repro.sql`.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faturas_repro (
  id TEXT PRIMARY KEY,
  proprietario_id TEXT NOT NULL,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  total NUMERIC NOT NULL DEFAULT 0,
  -- snapshot da fatura congelada no fechamento (todas as *Linhas e *Total
  -- do retorno de calcFaturaRepro)
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- divisão congelada no fechamento: { epona: n, porVet: {[vetId]: n} }
  divisao JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- 'fechada' quando snapshot congela; 'paga' quando o proprietário quitou
  status TEXT NOT NULL DEFAULT 'fechada',
  fechada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fechada_por TEXT DEFAULT '',
  pago_em TIMESTAMPTZ,
  UNIQUE (proprietario_id, ano, mes)
);

-- Índice para busca por mês (tela Divisão)
CREATE INDEX IF NOT EXISTS idx_faturas_repro_mes
  ON faturas_repro (ano, mes);

-- Índice para filtrar faturas pagas (relatório de repasse)
CREATE INDEX IF NOT EXISTS idx_faturas_repro_status
  ON faturas_repro (status);

-- Realtime: habilita replicação para o canal realtime da app.
ALTER PUBLICATION supabase_realtime ADD TABLE faturas_repro;
