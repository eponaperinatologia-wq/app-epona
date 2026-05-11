-- proprietarios
CREATE TABLE proprietarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT DEFAULT '',
  email TEXT DEFAULT ''
);

-- cavalos
CREATE TABLE cavalos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  pelagem TEXT DEFAULT '',
  sexo TEXT DEFAULT '',
  categoria TEXT DEFAULT '',
  categorias JSONB DEFAULT '[]',
  nascimento TEXT DEFAULT '',
  proprietario_id TEXT,
  proprietario_ids JSONB DEFAULT '[]',
  baia TEXT DEFAULT '',
  piquete TEXT DEFAULT '',
  mensalidade NUMERIC DEFAULT 0,
  obs TEXT DEFAULT '',
  nutricao JSONB DEFAULT '{}',
  gestacao JSONB DEFAULT null,
  historico_gestacional JSONB DEFAULT '[]',
  data_entrada TEXT DEFAULT '',
  presente BOOLEAN DEFAULT true,
  data_saida TEXT DEFAULT ''
);

-- insumos
CREATE TABLE insumos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  unidade TEXT DEFAULT 'un',
  fornecedor TEXT DEFAULT '',
  valor_compra NUMERIC DEFAULT 0,
  markup NUMERIC DEFAULT 0,
  valor_venda NUMERIC DEFAULT 0,
  injetavel BOOLEAN DEFAULT false,
  descartaveis JSONB DEFAULT '[]'
);

-- servicos
CREATE TABLE servicos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  valor NUMERIC DEFAULT 0,
  categoria TEXT NOT NULL,
  descartaveis_obrigatorios JSONB DEFAULT '[]'
);

-- funcionarios
CREATE TABLE funcionarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  funcao TEXT NOT NULL,
  aniversario TEXT DEFAULT '',
  login TEXT,
  senha TEXT DEFAULT '',
  escala JSONB DEFAULT '{}'
);

-- registros
CREATE TABLE registros (
  id TEXT PRIMARY KEY,
  cavalo_id TEXT,
  insumo_id TEXT,
  qtd NUMERIC DEFAULT 1,
  hora TEXT DEFAULT '',
  usuario TEXT DEFAULT '',
  is_auto BOOLEAN DEFAULT false,
  data TEXT NOT NULL
);

-- procedimentos
CREATE TABLE procedimentos (
  id TEXT PRIMARY KEY,
  cavalo_id TEXT,
  servico_id TEXT,
  valor_servico NUMERIC DEFAULT 0,
  descartaveis_obrigatorios JSONB DEFAULT '[]',
  insumos_adicionais JSONB DEFAULT '[]',
  motoboy JSONB DEFAULT '{"ativo":false,"valor":0,"nome":""}',
  laboratorio TEXT DEFAULT '',
  tubos_selecionados JSONB DEFAULT '[]',
  exames_selecionados JSONB DEFAULT '[]',
  total NUMERIC DEFAULT 0,
  hora TEXT DEFAULT '',
  nota TEXT DEFAULT '',
  data TEXT NOT NULL
);

-- exames_laboratoriais
CREATE TABLE IF NOT EXISTS exames_laboratoriais (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  valor NUMERIC DEFAULT 0
);

-- partos
CREATE TABLE partos (
  id TEXT PRIMARY KEY,
  egua_id TEXT,
  potro_id TEXT,
  data TEXT DEFAULT '',
  sexo_potro TEXT DEFAULT '',
  nome_potro TEXT DEFAULT '',
  peso_potro NUMERIC,
  mamou_colostro BOOLEAN DEFAULT false,
  hora_primeiro_leite TEXT DEFAULT '',
  status TEXT DEFAULT 'normal',
  obs TEXT DEFAULT '',
  insumos_parto JSONB DEFAULT '[]'
);

-- movimentacoes
CREATE TABLE movimentacoes (
  id TEXT PRIMARY KEY,
  cavalo_id TEXT,
  tipo TEXT NOT NULL,
  data TEXT DEFAULT '',
  motivo TEXT DEFAULT '',
  usuario TEXT DEFAULT '',
  gta_confirmada TEXT,
  cobrada_gta BOOLEAN DEFAULT false
);

-- eventos
CREATE TABLE eventos (
  id TEXT PRIMARY KEY,
  tipo TEXT DEFAULT '',
  data TEXT DEFAULT '',
  hora TEXT DEFAULT '',
  descricao TEXT DEFAULT '',
  cavalo_id TEXT,
  funcionario_id TEXT
);

-- avisos
CREATE TABLE avisos (
  id TEXT PRIMARY KEY,
  autor TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  tempo TEXT DEFAULT '',
  texto TEXT DEFAULT '',
  urgente BOOLEAN DEFAULT false,
  resolvido BOOLEAN DEFAULT false,
  resolvido_por TEXT DEFAULT '',
  tipo TEXT DEFAULT '',
  cavalo_id TEXT,
  data_entrada TEXT DEFAULT '',
  respostas JSONB DEFAULT '[]'
);

-- lista_compras
CREATE TABLE lista_compras (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  quantidade TEXT DEFAULT '',
  comprado BOOLEAN DEFAULT false,
  mes TEXT NOT NULL,
  criado_por TEXT DEFAULT ''
);

-- atividades
CREATE TABLE atividades (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  cavalo_id TEXT,
  insumo_id TEXT,
  qtd NUMERIC,
  motivo TEXT DEFAULT '',
  usuario TEXT DEFAULT '',
  autor TEXT DEFAULT '',
  texto TEXT DEFAULT '',
  mes TEXT NOT NULL,
  data TEXT NOT NULL,
  hora TEXT DEFAULT ''
);

-- faturas_fechadas
CREATE TABLE faturas_fechadas (
  id TEXT PRIMARY KEY,
  proprietario_id TEXT,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  total NUMERIC DEFAULT 0,
  mensalidades NUMERIC DEFAULT 0,
  perfil_nutricional NUMERIC DEFAULT 0,
  insumos_avulsos NUMERIC DEFAULT 0,
  linhas JSONB DEFAULT '[]',
  fechada_em TEXT,
  fechada_por TEXT DEFAULT ''
);

-- Migrations for existing databases
ALTER TABLE procedimentos ADD COLUMN IF NOT EXISTS tubos_selecionados JSONB DEFAULT '[]';
ALTER TABLE procedimentos ADD COLUMN IF NOT EXISTS exames_selecionados JSONB DEFAULT '[]';

-- configuracoes
CREATE TABLE configuracoes (
  id TEXT PRIMARY KEY DEFAULT 'global',
  empresa JSONB NOT NULL DEFAULT '{}'
);
