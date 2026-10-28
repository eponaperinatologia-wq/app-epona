-- ─────────────────────────────────────────────────────────────────
-- App Epona — Processos de Registro Genealógico (ABCCH)
--
-- Cada processo é 1 potro em formação (do DG45+ ao registro final).
-- Criado automaticamente quando um embrião é confirmado no DG45+
-- (CE+, Inovulação ou IA destino=prenhez), ou manualmente pelo vet
-- (quando faz inspeção/registro de potros que não foram reproduzidos
-- por nós, caso do Alexandre como inspetor técnico da ABCCH).
--
-- Dedup: origem_tipo + origem_id apontam pro registro de origem
-- quando criado automaticamente. Pra processos manuais, campos são
-- preenchidos à mão.
--
-- Idempotente.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS genealogicos_repro (
  id TEXT PRIMARY KEY,
  workspace_id TEXT DEFAULT 'repro',
  -- Origem (nulo quando criado manualmente)
  origem_tipo TEXT, -- 'ce' | 'inovulacao' | 'prenhez' | 'manual'
  origem_id TEXT,   -- id do registro (reproducao_registros.id)
  -- Dados do cruzamento (snapshot — não dependem de edição futura)
  garanhao_nome TEXT,
  egua_doadora_nome TEXT,
  proprietario_id TEXT,
  proprietario_nome TEXT,
  receptora_nome TEXT, -- nome da receptora quando aplicável
  data_ia TEXT,
  data_te TEXT,
  -- Checklist de tarefas (todos opcionais, preenchidos ao longo do processo)
  comunicado_cobricao_feito BOOLEAN DEFAULT FALSE,
  comunicado_cobricao_data TEXT,
  nascimento_data TEXT,
  nascimento_sexo TEXT, -- 'macho' | 'femea'
  comunicado_nascimento_feito BOOLEAN DEFAULT FALSE,
  comunicado_nascimento_data TEXT,
  pre_registro_url TEXT, -- URL do PDF no Supabase Storage
  pre_registro_nome_arquivo TEXT,
  inspecao_feita BOOLEAN DEFAULT FALSE,
  inspecao_data TEXT,
  pendencias TEXT,
  observacoes TEXT,
  -- Status derivado opcional: 'em_andamento' | 'concluido'
  status TEXT DEFAULT 'em_andamento',
  criado_por TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS genealogicos_repro_workspace_idx ON genealogicos_repro (workspace_id);
CREATE INDEX IF NOT EXISTS genealogicos_repro_origem_idx ON genealogicos_repro (origem_tipo, origem_id);
CREATE INDEX IF NOT EXISTS genealogicos_repro_prop_idx ON genealogicos_repro (proprietario_id);

ALTER TABLE genealogicos_repro DISABLE ROW LEVEL SECURITY;

-- Bucket de storage pros PDFs do pré-registro (idempotente)
INSERT INTO storage.buckets (id, name, public)
VALUES ('genealogicos', 'genealogicos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies abertas no bucket (sem RLS específico) — igual aos outros
-- buckets do app. CREATE POLICY falha se já existe, mas é a forma mais
-- compatível entre versões do Postgres.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='genealogicos_select') THEN
    EXECUTE 'CREATE POLICY "genealogicos_select" ON storage.objects FOR SELECT USING (bucket_id = ''genealogicos'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='genealogicos_insert') THEN
    EXECUTE 'CREATE POLICY "genealogicos_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''genealogicos'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='genealogicos_update') THEN
    EXECUTE 'CREATE POLICY "genealogicos_update" ON storage.objects FOR UPDATE USING (bucket_id = ''genealogicos'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='genealogicos_delete') THEN
    EXECUTE 'CREATE POLICY "genealogicos_delete" ON storage.objects FOR DELETE USING (bucket_id = ''genealogicos'')';
  END IF;
END $$;
