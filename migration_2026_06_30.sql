-- ─────────────────────────────────────────────────────────────────
-- App Epona — Migração 2026-06-30
-- Alinha o banco com tudo o que o app de fato usa.
-- Cole isto no Supabase Dashboard → SQL Editor → New query → Run.
-- Pode rodar mais de uma vez sem efeito colateral (tudo com IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────

-- ── Colunas que faltavam em tabelas existentes ───────────────────

ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS empresa JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nutricao_ordem JSONB NOT NULL DEFAULT '[]';

ALTER TABLE cavalos
  ADD COLUMN IF NOT EXISTS mae_id TEXT,
  ADD COLUMN IF NOT EXISTS pagar_o_custo BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS proprietario_ids JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS categorias JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS historico_gestacional JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS data_entrada DATE,
  ADD COLUMN IF NOT EXISTS data_saida DATE,
  ADD COLUMN IF NOT EXISTS presente BOOLEAN DEFAULT TRUE;

ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS incluido_mensalidade BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS injetavel BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS descartaveis JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS markup NUMERIC DEFAULT 0;

ALTER TABLE servicos
  ADD COLUMN IF NOT EXISTS descartaveis_obrigatorios JSONB DEFAULT '[]';

ALTER TABLE funcionarios
  ADD COLUMN IF NOT EXISTS salario_base NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regime_pagamento TEXT DEFAULT 'mensal_dia_05',
  ADD COLUMN IF NOT EXISTS encargos_pct NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aniversario TEXT,
  ADD COLUMN IF NOT EXISTS login TEXT,
  ADD COLUMN IF NOT EXISTS senha TEXT,
  ADD COLUMN IF NOT EXISTS escala JSONB DEFAULT '{}';

ALTER TABLE procedimentos
  ADD COLUMN IF NOT EXISTS dados_extras JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS descartaveis_obrigatorios JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS insumos_adicionais JSONB DEFAULT '[]';

ALTER TABLE partos
  ADD COLUMN IF NOT EXISTS dados_neonatal JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS insumos_parto JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS potro_id TEXT;

ALTER TABLE movimentacoes
  ADD COLUMN IF NOT EXISTS cobrada_gta BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gta_confirmada BOOLEAN;

ALTER TABLE faturas_fechadas
  ADD COLUMN IF NOT EXISTS procedimentos_avulsos NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perfil_nutricional NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insumos_avulsos NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS linhas JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS fechada_em TIMESTAMPTZ;

ALTER TABLE avisos
  ADD COLUMN IF NOT EXISTS cavalo_id TEXT,
  ADD COLUMN IF NOT EXISTS resolvido_por TEXT,
  ADD COLUMN IF NOT EXISTS respostas JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS data_entrada TEXT;

ALTER TABLE atividades
  ADD COLUMN IF NOT EXISTS cavalo_id TEXT,
  ADD COLUMN IF NOT EXISTS insumo_id TEXT,
  ADD COLUMN IF NOT EXISTS autor TEXT,
  ADD COLUMN IF NOT EXISTS texto TEXT;

-- ── Tabelas que faltavam ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS financeiro_lancamentos (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  data DATE,
  quem TEXT DEFAULT '',
  motivo TEXT DEFAULT '',
  categoria TEXT DEFAULT '',
  pago BOOLEAN DEFAULT FALSE,
  pago_em DATE,
  recorrencia_id TEXT
);

CREATE TABLE IF NOT EXISTS lancamentos_recorrentes (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  descricao TEXT DEFAULT '',
  categoria TEXT DEFAULT '',
  quem TEXT DEFAULT '',
  frequencia TEXT DEFAULT 'mensal',
  dia_mes INT DEFAULT 1,
  data_inicio DATE,
  data_fim DATE,
  ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS estoque_compras (
  id TEXT PRIMARY KEY,
  insumo_id TEXT,
  data DATE,
  qtd NUMERIC DEFAULT 0,
  unidade TEXT DEFAULT 'un',
  valor_unit NUMERIC DEFAULT 0,
  valor_total NUMERIC DEFAULT 0,
  fornecedor TEXT DEFAULT '',
  obs TEXT DEFAULT '',
  lancamento_id TEXT,
  pago BOOLEAN DEFAULT FALSE,
  data_vencimento DATE,
  tipo TEXT DEFAULT 'compra'
);

CREATE TABLE IF NOT EXISTS protocolos_vacinacao (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'gestante',
  descricao TEXT DEFAULT '',
  ativo BOOLEAN DEFAULT TRUE,
  doses JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS campanhas_vacinacao (
  id TEXT PRIMARY KEY,
  protocolo_id TEXT,
  data DATE,
  proxima_data DATE,
  obs TEXT DEFAULT '',
  status TEXT DEFAULT 'pendente'
);

CREATE TABLE IF NOT EXISTS vacinacoes_animais (
  id TEXT PRIMARY KEY,
  protocolo_id TEXT,
  dose_idx INT,
  cavalo_id TEXT,
  data_prevista DATE,
  feito BOOLEAN DEFAULT FALSE,
  feito_por TEXT DEFAULT '',
  feito_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS protocolos_vermifugacao (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT '',
  descricao TEXT DEFAULT '',
  ativo BOOLEAN DEFAULT TRUE,
  etapas JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS vermifugacoes_animais_verm (
  id TEXT PRIMARY KEY,
  protocolo_id TEXT,
  cavalo_id TEXT,
  data_realizacao DATE,
  produto TEXT DEFAULT '',
  registrado_por TEXT DEFAULT '',
  etapa_idx INT
);

CREATE TABLE IF NOT EXISTS opgs (
  id TEXT PRIMARY KEY,
  cavalo_id TEXT,
  protocolo_id TEXT,
  data_coleta DATE,
  data_resultado DATE,
  resultado JSONB DEFAULT '[]',
  precisa_vermifugacao BOOLEAN,
  insumo_verm_id TEXT DEFAULT '',
  data_aplicacao DATE,
  aplicado BOOLEAN DEFAULT FALSE,
  dispensado BOOLEAN DEFAULT FALSE,
  principio_ativo TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  proxima_data DATE,
  etapa_idx INT
);

CREATE TABLE IF NOT EXISTS medicoes (
  id TEXT PRIMARY KEY,
  cavalo_id TEXT,
  data_registro DATE,
  peso NUMERIC,
  altura_cernelha NUMERIC,
  perimetro_canela NUMERIC,
  perimetro_abdominal NUMERIC,
  perimetro_toracico NUMERIC,
  perimetro_pescoco_1 NUMERIC,
  perimetro_pescoco_2 NUMERIC,
  perimetro_pescoco_3 NUMERIC,
  gordura_base_cauda NUMERIC,
  gordura_costelas NUMERIC,
  gordura_pescoco NUMERIC,
  observacoes TEXT DEFAULT '',
  registrado_por TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS anotacoes_clinicas (
  id TEXT PRIMARY KEY,
  cavalo_id TEXT,
  data DATE,
  hora TEXT DEFAULT '',
  tipo TEXT DEFAULT 'Outro',
  gravidade TEXT DEFAULT '',
  titulo TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  autor TEXT DEFAULT '',
  mes TEXT,
  insumos_criados JSONB DEFAULT '[]',
  procs_criados JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS exames_complementares (
  id TEXT PRIMARY KEY,
  cavalo_id TEXT,
  data DATE,
  tipo TEXT,
  descricao TEXT DEFAULT '',
  arquivo_url TEXT DEFAULT '',
  arquivo_nome TEXT DEFAULT '',
  arquivo_tipo TEXT DEFAULT '',
  mes TEXT
);

CREATE TABLE IF NOT EXISTS reproducao_registros (
  id TEXT PRIMARY KEY,
  egua_id TEXT,
  data DATE,
  tipo TEXT,
  dados JSONB DEFAULT '{}',
  insumos_usados JSONB DEFAULT '[]',
  data_retorno DATE,
  autor TEXT DEFAULT '',
  mes TEXT
);

CREATE TABLE IF NOT EXISTS custos_fixos (
  id TEXT PRIMARY KEY,
  categoria TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  valor NUMERIC NOT NULL DEFAULT 0,
  mes TEXT NOT NULL,
  data_vencimento DATE,
  pago BOOLEAN DEFAULT FALSE,
  pago_em DATE,
  funcionario_id TEXT,
  encargos_pct NUMERIC DEFAULT 0,
  observacoes TEXT DEFAULT ''
);

-- ── Recarrega o schema cache do PostgREST ────────────────────────
NOTIFY pgrst, 'reload schema';
