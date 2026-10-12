-- ─────────────────────────────────────────────────────────────────
-- App Epona — Centrais de Reprodução
--
-- Cadastro das centrais externas pra onde a Repro Team envia
-- embriões coletados. Diferente de locais_repro (lugares onde o vet
-- VAI atender), centrais são destinos de transferência. Usadas no
-- form de Coleta de Embrião positiva: "destino do embrião" pode ser
-- uma central (receptora definida só no D15+) ou uma égua direta.
--
-- Idempotente.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS centrais_repro (
  id TEXT PRIMARY KEY,
  workspace_id TEXT DEFAULT 'repro',
  nome TEXT NOT NULL,
  cidade TEXT,
  estado TEXT,
  contato TEXT,
  telefone TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS centrais_repro_workspace_idx ON centrais_repro (workspace_id);

ALTER TABLE centrais_repro DISABLE ROW LEVEL SECURITY;
