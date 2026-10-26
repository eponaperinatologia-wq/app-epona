-- ─────────────────────────────────────────────────────────────────
-- App Epona — Orçamentos do Epona Repro Team
--
-- Permite ao time montar orçamentos pra clientes (atuais ou prospects)
-- antes de executar os procedimentos. Cada orçamento tem:
--   - destinatário (proprietário cadastrado OU nome livre)
--   - local (opcional — puxa valor de km)
--   - título ("Tratamento uterino Égua X", "Protocolo de IA", etc.)
--   - itens (JSONB): visitas, procedimentos (com descartáveis
--     obrigatórios já cobrados), insumos avulsos, resultado reprodutivo
--     projetado (DG45+)
--   - total cacheado
--   - observações
--
-- É só estimativa — não cria nada no sistema (sem conversão automática).
--
-- Idempotente.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orcamentos_repro (
  id TEXT PRIMARY KEY,
  workspace_id TEXT DEFAULT 'repro',
  proprietario_id TEXT,
  destinatario_nome TEXT,
  local_id TEXT,
  titulo TEXT NOT NULL,
  observacoes TEXT,
  itens JSONB DEFAULT '[]'::jsonb,
  total NUMERIC DEFAULT 0,
  criado_por TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orcamentos_repro_workspace_idx ON orcamentos_repro (workspace_id);
CREATE INDEX IF NOT EXISTS orcamentos_repro_prop_idx ON orcamentos_repro (proprietario_id);

ALTER TABLE orcamentos_repro DISABLE ROW LEVEL SECURITY;
