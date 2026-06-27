import { supabase } from './supabase';

// ── fromDb: DB (snake_case) → App (camelCase) ─────────────────

export const fromDbCavalo = r => ({
  id: r.id, nome: r.nome, pelagem: r.pelagem || '', sexo: r.sexo || '',
  categoria: r.categoria || '', categorias: r.categorias || [],
  nascimento: r.nascimento || '',
  proprietarioId: r.proprietario_id || null,
  proprietarioIds: r.proprietario_ids || (r.proprietario_id ? [r.proprietario_id] : []),
  baia: r.baia || '', piquete: r.piquete || '', mensalidade: r.mensalidade || 0,
  obs: r.obs || '', nutricao: r.nutricao || {},
  gestacao: r.gestacao || null, historicoGestacional: r.historico_gestacional || [],
  dataEntrada: r.data_entrada || '',
  presente: r.presente !== false,
  dataSaida: r.data_saida || '',
});

export const fromDbProprietario = r => ({
  id: r.id, nome: r.nome, telefone: r.telefone || '', email: r.email || '',
});

export const fromDbInsumo = r => ({
  id: r.id, nome: r.nome, categoria: r.categoria, unidade: r.unidade || 'un',
  fornecedor: r.fornecedor || '', valorCompra: Number(r.valor_compra) || 0,
  markup: Number(r.markup) || 0, valorVenda: Number(r.valor_venda) || 0,
  injetavel: !!r.injetavel, descartaveis: r.descartaveis || [],
});

export const fromDbServico = r => ({
  id: r.id, nome: r.nome, valor: Number(r.valor) || 0, categoria: r.categoria,
  descartaveisObrigatorios: r.descartaveis_obrigatorios || [],
});

export const fromDbFuncionario = r => ({
  id: r.id, nome: r.nome, funcao: r.funcao, aniversario: r.aniversario || '',
  login: r.login || '', senha: r.senha || '', escala: r.escala || {},
});

export const fromDbRegistro = r => ({
  id: r.id, cavaloId: r.cavalo_id, insumoId: r.insumo_id,
  qtd: Number(r.qtd) || 1, hora: r.hora || '', usuario: r.usuario || '',
  isAuto: !!r.is_auto, data: r.data,
});

export const fromDbProcedimento = r => {
  const extras = r.dados_extras || {};
  const isExamesLab = !r.servico_id && (extras.examesSelecionados?.length > 0 || extras.laboratorio);
  return {
    id: r.id, cavaloId: r.cavalo_id,
    servicoId: r.servico_id || (isExamesLab ? '__exames_lab__' : null),
    valorServico: Number(r.valor_servico) || 0,
    descartaveisObrigatorios: r.descartaveis_obrigatorios || [],
    insumosAdicionais: r.insumos_adicionais || [],
    motoboy: extras.motoboy || { ativo: false, valor: 0, nome: '' },
    laboratorio: extras.laboratorio || '',
    tubosSelecionados: extras.tubosSelecionados || [],
    examesSelecionados: extras.examesSelecionados || [],
    total: Number(r.total) || 0, hora: r.hora || '', nota: r.nota || '', data: r.data,
  };
};

export const fromDbParto = r => ({
  id: r.id, eguaId: r.egua_id, potroId: r.potro_id, data: r.data || '',
  sexoPotro: r.sexo_potro || '', nomePotro: r.nome_potro || '',
  pesoPotro: r.peso_potro, mamouColostro: !!r.mamou_colostro,
  horaPrimeiroLeite: r.hora_primeiro_leite || '', status: r.status || 'normal',
  obs: r.obs || '', insumosParto: r.insumos_parto || [],
  // Todos os campos neonatais ficam no JSONB dados_neonatal
  ...(r.dados_neonatal || {}),
});

export const fromDbMovimentacao = r => ({
  id: r.id, cavaloId: r.cavalo_id, tipo: r.tipo, data: r.data || '',
  motivo: r.motivo || '', usuario: r.usuario || '',
  gtaConfirmada: r.gta_confirmada, cobradaGTA: !!r.cobrada_gta,
});

export const fromDbEvento = r => ({
  id: r.id, tipo: r.tipo || '', data: r.data || '', hora: r.hora || '',
  descricao: r.descricao || '', cavaloId: r.cavalo_id, funcionarioId: r.funcionario_id,
});
export const fromDbAviso = r => ({
  id: r.id, autor: r.autor || '', avatar: r.avatar || '',
  tempo: r.tempo || '', texto: r.texto || '',
  urgente: !!r.urgente, resolvido: !!r.resolvido,
  resolvidoPor: r.resolvido_por || '',
  tipo: r.tipo || '', cavaloId: r.cavalo_id || null,
  data_entrada: r.data_entrada || '',
  respostas: r.respostas || [],
});

export const fromDbFaturaFechada = r => ({
  id: r.id, proprietarioId: r.proprietario_id,
  ano: r.ano, mes: r.mes, total: Number(r.total) || 0,
  mensalidades: Number(r.mensalidades) || 0,
  perfilNutricional: Number(r.perfil_nutricional) || 0,
  insumosAvulsos: Number(r.insumos_avulsos) || 0,
  procedimentosAvulsos: Number(r.procedimentos_avulsos) || 0,
  linhas: r.linhas || [], fechadaEm: r.fechada_em, fechadaPor: r.fechada_por || '',
});

export const fromDbConfiguracao = r => r?.empresa || {};
export const toDbConfiguracao = (empresa) => ({ id: 'global', empresa });

export const toDbFaturaFechada = f => ({
  id: f.id, proprietario_id: f.proprietarioId,
  ano: f.ano, mes: f.mes, total: f.total,
  mensalidades: f.mensalidades, perfil_nutricional: f.perfilNutricional || 0,
  insumos_avulsos: f.insumosAvulsos || 0,
  procedimentos_avulsos: f.procedimentosAvulsos || 0,
  linhas: f.linhas || [],
  fechada_por: f.fechadaPor || '',
});

// ── toDb: App (camelCase) → DB (snake_case) ───────────────────

export const toDbCavalo = c => ({
  id: c.id, nome: c.nome, pelagem: c.pelagem || '', sexo: c.sexo || '',
  categoria: c.categoria || '', categorias: c.categorias || [],
  nascimento: c.nascimento || '',
  proprietario_id: c.proprietarioIds?.[0] || c.proprietarioId || null,
  proprietario_ids: c.proprietarioIds || (c.proprietarioId ? [c.proprietarioId] : []),
  baia: c.baia || '', piquete: c.piquete || '', mensalidade: c.mensalidade || 0,
  obs: c.obs || '', nutricao: c.nutricao || {},
  gestacao: c.gestacao || null, historico_gestacional: c.historicoGestacional || [],
  data_entrada: c.dataEntrada || '',
  presente: c.presente !== false,
  data_saida: c.dataSaida || '',
});

export const toDbProprietario = p => ({
  id: p.id, nome: p.nome, telefone: p.telefone || '', email: p.email || '',
});

export const toDbInsumo = i => ({
  id: i.id, nome: i.nome, categoria: i.categoria, unidade: i.unidade || 'un',
  fornecedor: i.fornecedor || '', valor_compra: i.valorCompra || 0,
  markup: i.markup || 0, valor_venda: i.valorVenda || 0,
  injetavel: !!i.injetavel, descartaveis: i.descartaveis || [],
});

export const toDbServico = s => ({
  id: s.id, nome: s.nome, valor: s.valor || 0, categoria: s.categoria,
  descartaveis_obrigatorios: s.descartaveisObrigatorios || [],
});

export const toDbFuncionario = f => ({
  id: f.id, nome: f.nome, funcao: f.funcao, aniversario: f.aniversario || '',
  login: f.login || null, senha: f.senha || '', escala: f.escala || {},
});

export const toDbRegistro = r => ({
  id: r.id, cavalo_id: r.cavaloId, insumo_id: r.insumoId,
  qtd: r.qtd || 1, hora: r.hora || '', usuario: r.usuario || '',
  is_auto: !!r.isAuto, data: r.data,
});

export const toDbProcedimento = p => ({
  id: p.id, cavalo_id: p.cavaloId,
  servico_id: (p.servicoId === '__exames_lab__' || !p.servicoId) ? null : p.servicoId,
  valor_servico: p.valorServico || 0,
  descartaveis_obrigatorios: p.descartaveisObrigatorios || [],
  insumos_adicionais: p.insumosAdicionais || [],
  dados_extras: {
    motoboy: p.motoboy || { ativo: false, valor: 0, nome: '' },
    laboratorio: p.laboratorio || '',
    tubosSelecionados: p.tubosSelecionados || [],
    examesSelecionados: p.examesSelecionados || [],
  },
  total: p.total || 0, hora: p.hora || '', nota: p.nota || '', data: p.data,
});

export const toDbParto = p => ({
  id: p.id, egua_id: p.eguaId, potro_id: p.potroId || null, data: p.data || '',
  sexo_potro: p.sexoPotro || '', nome_potro: p.nomePotro || '',
  peso_potro: p.pesoPotro || null, mamou_colostro: !!p.mamouColostro,
  hora_primeiro_leite: p.horaPrimeiroLeite || '', status: p.status || 'normal',
  obs: p.obs || '', insumos_parto: p.insumosParto || [],
  dados_neonatal: {
    hora: p.hora || '',
    posicaoEsternal: p.posicaoEsternal ?? null, horaPosicaoEsternal: p.horaPosicaoEsternal || '',
    reflexoSucao: p.reflexoSucao ?? null,       horaReflexoSucao: p.horaReflexoSucao || '',
    levantou: p.levantou ?? null,               horaLevantou: p.horaLevantou || '',
    mamou: p.mamou ?? null,                     horaMamou: p.horaMamou || '',
    liberouMeconio: p.liberouMeconio ?? null,   horaLiberouMeconio: p.horaLiberouMeconio || '',
    transicaoFezes: p.transicaoFezes ?? null,   horaTransicaoFezes: p.horaTransicaoFezes || '',
    urinou: p.urinou ?? null,                   horaUrinou: p.horaUrinou || '',
    altura: p.altura || '', peso: p.peso || '',
    obsAprumo: p.obsAprumo || '', obsGerais: p.obsGerais || '',
    insumosUsados: p.insumosUsados || [],
    proprietarioId: p.proprietarioId || null,
  },
});

export const toDbMovimentacao = m => ({
  id: m.id, cavalo_id: m.cavaloId, tipo: m.tipo, data: m.data || '',
  motivo: m.motivo || '', usuario: m.usuario || '',
  gta_confirmada: m.gtaConfirmada ?? null,
  cobrada_gta: !!(m.cobradaGTA || m.cobrarGTA),
});

export const toDbEvento = e => ({
  id: e.id, tipo: e.tipo || '', data: e.data || '', hora: e.hora || '',
  descricao: e.descricao || '', cavalo_id: e.cavaloId || null,
  funcionario_id: e.funcionarioId || null,
});

export const toDbAviso = a => ({
  id: a.id, autor: a.autor || '', avatar: a.avatar || '',
  tempo: a.tempo || '', texto: a.texto || '',
  urgente: !!a.urgente, resolvido: !!a.resolvido,
  resolvido_por: a.resolvidoPor || '',
  tipo: a.tipo || '', cavalo_id: a.cavaloId || null,
  data_entrada: a.data_entrada || '',
  respostas: a.respostas || [],
});

export const fromDbListaCompra = r => ({
  id: r.id, nome: r.nome, quantidade: r.quantidade || '',
  comprado: !!r.comprado, mes: r.mes,
  criadoPor: r.criado_por || '',
});

export const toDbListaCompra = c => ({
  id: c.id, nome: c.nome, quantidade: c.quantidade || '',
  comprado: !!c.comprado, mes: c.mes,
  criado_por: c.criadoPor || '',
});

export const fromDbAtividade = r => ({
  id: r.id, tipo: r.tipo,
  cavaloId: r.cavalo_id, insumoId: r.insumo_id,
  qtd: r.qtd, motivo: r.motivo || '', usuario: r.usuario || '',
  autor: r.autor || '', texto: r.texto || '',
  mes: r.mes, data: r.data, hora: r.hora || '',
});

export const toDbAtividade = a => ({
  id: a.id, tipo: a.tipo,
  cavalo_id: a.cavaloId || null, insumo_id: a.insumoId || null,
  qtd: a.qtd ?? null, motivo: a.motivo || '', usuario: a.usuario || '',
  autor: a.autor || '', texto: a.texto || '',
  mes: a.mes || null, data: a.data || null, hora: a.hora || '',
});

export const fromDbLancamento = r => ({
  id: r.id, tipo: r.tipo, valor: Number(r.valor) || 0,
  data: r.data, quem: r.quem || '', motivo: r.motivo || '',
  categoria: r.categoria || '', pago: !!r.pago, pagoEm: r.pago_em || null,
  recorrenciaId: r.recorrencia_id || null,
});

export const toDbLancamento = l => ({
  id: l.id, tipo: l.tipo, valor: l.valor, data: l.data,
  quem: l.quem || '', motivo: l.motivo || '', categoria: l.categoria || '',
  pago: !!l.pago, pago_em: l.pagoEm || null,
  recorrencia_id: l.recorrenciaId || null,
});

export const fromDbRecorrencia = r => ({
  id: r.id, tipo: r.tipo, valor: Number(r.valor) || 0,
  descricao: r.descricao || '', categoria: r.categoria || '', quem: r.quem || '',
  frequencia: r.frequencia || 'mensal', diaMes: r.dia_mes || 1,
  dataInicio: r.data_inicio || '', dataFim: r.data_fim || null,
  ativo: r.ativo !== false,
});

export const toDbRecorrencia = r => ({
  id: r.id, tipo: r.tipo, valor: r.valor,
  descricao: r.descricao || '', categoria: r.categoria || '', quem: r.quem || '',
  frequencia: r.frequencia || 'mensal', dia_mes: r.diaMes || 1,
  data_inicio: r.dataInicio, data_fim: r.dataFim || null,
  ativo: r.ativo !== false,
});

export const fromDbEstoqueCompra = r => ({
  id: r.id, insumoId: r.insumo_id, data: r.data || '',
  qtd: Number(r.qtd) || 0, unidade: r.unidade || 'un',
  valorUnit: Number(r.valor_unit) || 0, valorTotal: Number(r.valor_total) || 0,
  fornecedor: r.fornecedor || '', obs: r.obs || '',
  lancamentoId: r.lancamento_id || null,
});

export const toDbEstoqueCompra = c => ({
  id: c.id, insumo_id: c.insumoId, data: c.data,
  qtd: c.qtd, unidade: c.unidade,
  valor_unit: c.valorUnit, valor_total: c.valorTotal,
  fornecedor: c.fornecedor || '', obs: c.obs || '',
  lancamento_id: c.lancamentoId || null,
});

// ── partialToDb: mapeia apenas os campos que diferem ──────────

const CAVALO_MAP    = { proprietarioId: 'proprietario_id', proprietarioIds: 'proprietario_ids', dataSaida: 'data_saida', dataEntrada: 'data_entrada', historicoGestacional: 'historico_gestacional' };
const INSUMO_MAP    = { valorCompra: 'valor_compra', valorVenda: 'valor_venda' };
const SERVICO_MAP   = { descartaveisObrigatorios: 'descartaveis_obrigatorios' };
const PARTO_MAP     = { eguaId: 'egua_id', potroId: 'potro_id', sexoPotro: 'sexo_potro', nomePotro: 'nome_potro', pesoPotro: 'peso_potro', mamouColostro: 'mamou_colostro', horaPrimeiroLeite: 'hora_primeiro_leite', insumosParto: 'insumos_parto' };

export function partialToDb(partial, keyMap) {
  const result = {};
  for (const [k, v] of Object.entries(partial)) {
    result[keyMap[k] || k] = v;
  }
  return result;
}

export { CAVALO_MAP, INSUMO_MAP, SERVICO_MAP, PARTO_MAP };

// ── Helpers genéricos ─────────────────────────────────────────

export async function fetchAll(table, mapper, limit = 2000) {
  const { data, error } = await supabase.from(table).select('*').limit(limit);
  if (error) { console.error(`fetchAll ${table}:`, error.message); return []; }
  return mapper ? (data || []).map(mapper) : (data || []);
}

const notifyDbError = (op, table, msg) => {
  console.error(`${op} ${table}:`, msg);
  window.dispatchEvent(new CustomEvent('db-error', { detail: { op, table, msg } }));
};

export const dbInsert = async (table, row) => {
  const { error } = await supabase.from(table).insert([row]);
  if (error) { notifyDbError('insert', table, error.message); return false; }
  return true;
};

export const dbUpdate = async (table, id, changes) => {
  const { error } = await supabase.from(table).update(changes).eq('id', id);
  if (error) { notifyDbError('update', table, error.message); return false; }
  return true;
};

export const dbDelete = async (table, id) => {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) { notifyDbError('delete', table, error.message); return false; }
  return true;
};

export const dbUpsert = async (table, row) => {
  const { error } = await supabase.from(table).upsert([row]);
  if (error) { notifyDbError('upsert', table, error.message); return false; }
  return true;
};

// Insert silently ignoring PK conflict — used for auto-generated avisos
export const dbInsertIgnore = async (table, row) => {
  const { error } = await supabase.from(table).upsert([row], { onConflict: 'id', ignoreDuplicates: true });
  if (error) { notifyDbError('insert', table, error.message); return false; }
  return true;
};
