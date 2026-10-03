-- ─────────────────────────────────────────────────────────────────
-- App Epona — Migração: Assessoria clínica (visitas mensais)
--
-- Nova área da Repro Team pra assessoria clínica mensal.
-- Modelo:
--   - contratos_assessoria: contrato por proprietário (quem paga) com
--     local opcional (escopo geográfico). valor_mensal + dia_cobrança.
--   - visitas_clinicas: cada visita (rascunho=agendada/em andamento,
--     finalizada=concluída). Guarda vets_participantes p/ divisão.
--   - vínculo opcional em vacinações/vermifugações/opgs/medições/
--     anotações: visita_clinica_id → tudo que foi feito numa visita
--     fica rastreável.
--   - vets_externos ganha flag interno_epona pra a regra de divisão:
--     só internos → Epona 100%; qualquer externo participando →
--     Epona 50% + externos dividem 50%.
--
-- Idempotente (IF NOT EXISTS). Pode rodar via supabase CLI ou SQL Editor.
-- ─────────────────────────────────────────────────────────────────

-- ── Flag interno Epona em vets_externos ──────────────────────────
ALTER TABLE vets_externos
  ADD COLUMN IF NOT EXISTS interno_epona BOOLEAN DEFAULT FALSE;

-- ── Contratos de assessoria ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS contratos_assessoria (
  id TEXT PRIMARY KEY,
  proprietario_id TEXT NOT NULL,
  local_id TEXT,
  nome_apelido TEXT DEFAULT '',
  valor_mensal NUMERIC NOT NULL DEFAULT 0,
  dia_cobranca INTEGER DEFAULT 1,
  inicio DATE NOT NULL,
  fim DATE,
  observacoes TEXT DEFAULT '',
  workspace_id TEXT DEFAULT 'repro',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contratos_assessoria_prop
  ON contratos_assessoria (proprietario_id);
CREATE INDEX IF NOT EXISTS idx_contratos_assessoria_local
  ON contratos_assessoria (local_id);
CREATE INDEX IF NOT EXISTS idx_contratos_assessoria_ativo
  ON contratos_assessoria (fim) WHERE fim IS NULL;

-- ── Visitas clínicas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visitas_clinicas (
  id TEXT PRIMARY KEY,
  contrato_id TEXT NOT NULL,
  data DATE NOT NULL,
  local_id TEXT,
  vets_participantes JSONB NOT NULL DEFAULT '[]',
  valor_cobrado NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT DEFAULT '',
  -- 'rascunho' = agendada ou em andamento; 'finalizada' = concluída.
  status TEXT NOT NULL DEFAULT 'rascunho',
  finalizada_em TIMESTAMPTZ,
  finalizada_por TEXT DEFAULT '',
  workspace_id TEXT DEFAULT 'repro',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visitas_clinicas_contrato
  ON visitas_clinicas (contrato_id);
CREATE INDEX IF NOT EXISTS idx_visitas_clinicas_data
  ON visitas_clinicas (data);
CREATE INDEX IF NOT EXISTS idx_visitas_clinicas_status
  ON visitas_clinicas (status);

-- ── Vínculo opcional de registros clínicos à visita ──────────────
ALTER TABLE vacinacoes_animais
  ADD COLUMN IF NOT EXISTS visita_clinica_id TEXT;
ALTER TABLE vermifugacoes_animais_verm
  ADD COLUMN IF NOT EXISTS visita_clinica_id TEXT;
ALTER TABLE opgs
  ADD COLUMN IF NOT EXISTS visita_clinica_id TEXT;
ALTER TABLE medicoes
  ADD COLUMN IF NOT EXISTS visita_clinica_id TEXT;
ALTER TABLE anotacoes_clinicas
  ADD COLUMN IF NOT EXISTS visita_clinica_id TEXT;

CREATE INDEX IF NOT EXISTS idx_vac_visita   ON vacinacoes_animais (visita_clinica_id);
CREATE INDEX IF NOT EXISTS idx_verm_visita  ON vermifugacoes_animais_verm (visita_clinica_id);
CREATE INDEX IF NOT EXISTS idx_opg_visita   ON opgs (visita_clinica_id);
CREATE INDEX IF NOT EXISTS idx_med_visita   ON medicoes (visita_clinica_id);
CREATE INDEX IF NOT EXISTS idx_anot_visita  ON anotacoes_clinicas (visita_clinica_id);

-- ── Realtime ─────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE contratos_assessoria;
ALTER PUBLICATION supabase_realtime ADD TABLE visitas_clinicas;
