-- ─────────────────────────────────────────────────────────────
-- Migration: Fase 2 do módulo Repro
-- - Tabela avisos_repro (mural persistente, visível a todo o time)
-- - Índices em campos usados pelo cron da agenda de 06h
-- ─────────────────────────────────────────────────────────────

-- Tabela de avisos persistentes. Ex.: quando uma IA marca
-- destino=transferencia, cria "RESERVAR RECEPTORA PARA ..." que
-- qualquer vet pode marcar como resolvido.
CREATE TABLE IF NOT EXISTS avisos_repro (
  id TEXT PRIMARY KEY,
  workspace_id TEXT DEFAULT 'repro',
  tipo TEXT NOT NULL,               -- 'reservar_receptora' (extensível)
  texto TEXT NOT NULL,
  egua_id TEXT,                     -- opcional, referência lógica
  referencia_id TEXT,               -- id do registro que gerou o aviso
  criado_por TEXT,                  -- vet_id que criou
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  resolvido_em TIMESTAMPTZ,
  resolvido_por TEXT
);

CREATE INDEX IF NOT EXISTS avisos_repro_workspace_idx     ON avisos_repro (workspace_id);
CREATE INDEX IF NOT EXISTS avisos_repro_pendentes_idx     ON avisos_repro (workspace_id) WHERE resolvido_em IS NULL;
CREATE INDEX IF NOT EXISTS avisos_repro_referencia_idx    ON avisos_repro (referencia_id);

ALTER TABLE avisos_repro DISABLE ROW LEVEL SECURITY;

-- Índices pra acelerar a query do cron de 06h
CREATE INDEX IF NOT EXISTS reproducao_registros_data_idx
  ON reproducao_registros (workspace_id, data);
CREATE INDEX IF NOT EXISTS reproducao_registros_retorno_idx
  ON reproducao_registros (workspace_id, data_retorno)
  WHERE data_retorno IS NOT NULL;
