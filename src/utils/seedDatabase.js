import { supabase } from './supabase';

function mapProprietario(p) {
  return {
    id: p.id,
    nome: p.nome,
    telefone: p.telefone || '',
    email: p.email || '',
  };
}

function mapCavalo(c) {
  return {
    id: c.id,
    nome: c.nome,
    pelagem: c.pelagem || '',
    sexo: c.sexo || '',
    categoria: c.categoria || '',
    categorias: c.categorias || [],
    nascimento: c.nascimento || '',
    proprietario_id: c.proprietarioId || null,
    baia: c.baia || '',
    piquete: c.piquete || '',
    mensalidade: c.mensalidade || 0,
    obs: c.obs || '',
    nutricao: c.nutricao || {},
    gestacao: c.gestacao || null,
    historico_gestacional: c.historicoGestacional || [],
  };
}

function mapInsumo(i) {
  return {
    id: i.id,
    nome: i.nome,
    categoria: i.categoria,
    unidade: i.unidade || 'un',
    fornecedor: i.fornecedor || '',
    valor_compra: i.valorCompra || 0,
    markup: i.markup || 0,
    valor_venda: i.valorVenda || 0,
    injetavel: i.injetavel || false,
    descartaveis: i.descartaveis || [],
  };
}

function mapServico(s) {
  return {
    id: s.id,
    nome: s.nome,
    valor: s.valor || 0,
    categoria: s.categoria,
    descartaveis_obrigatorios: s.descartaveisObrigatorios || [],
  };
}

function mapFuncionario(f) {
  return {
    id: f.id,
    nome: f.nome,
    funcao: f.funcao,
    aniversario: f.aniversario || '',
    login: f.login || null,
    senha: f.senha || '',
    escala: f.escala || {},
  };
}

export async function seedDatabase({ proprietarios, cavalos, insumos, servicos, funcionarios }, onProgress = () => {}) {
  const results = [];

  async function upsertTable(label, rows, table) {
    onProgress(`Inserindo ${label}…`);
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    results.push({ label, ok: !error, count: rows.length, error: error?.message });
    onProgress(error ? `Erro em ${label}: ${error.message}` : `${label}: ${rows.length} registros OK`);
  }

  await upsertTable('Proprietários', proprietarios.map(mapProprietario), 'proprietarios');
  await upsertTable('Cavalos', cavalos.map(mapCavalo), 'cavalos');
  await upsertTable('Insumos', insumos.map(mapInsumo), 'insumos');
  await upsertTable('Serviços', servicos.map(mapServico), 'servicos');
  await upsertTable('Funcionários', funcionarios.map(mapFuncionario), 'funcionarios');

  return results;
}
