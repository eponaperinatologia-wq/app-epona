import { supabase } from './supabase';

// ── fromDb: DB (snake_case) → App (camelCase) ─────────────────

export const fromDbCavalo = r => ({
  id: r.id, nome: r.nome, pelagem: r.pelagem || '', sexo: r.sexo || '',
  categoria: r.categoria || '', categorias: r.categorias || [],
  nascimento: r.nascimento || '', proprietarioId: r.proprietario_id || null,
  baia: r.baia || '', piquete: r.piquete || '', mensalidade: r.mensalidade || 0,
  obs: r.obs || '', nutricao: r.nutricao || {},
  gestacao: r.gestacao || null, historicoGestacional: r.historico_gestacional || [],
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

export const fromDbProcedimento = r => ({
  id: r.id, cavaloId: r.cavalo_id, servicoId: r.servico_id,
  valorServico: Number(r.valor_servico) || 0,
  descartaveisObrigatorios: r.descartaveis_obrigatorios || [],
  insumosAdicionais: r.insumos_adicionais || [],
  motoboy: r.motoboy || { ativo: false, valor: 0 },
  total: Number(r.total) || 0, hora: r.hora || '', nota: r.nota || '', data: r.data,
});

export const fromDbParto = r => ({
  id: r.id, eguaId: r.egua_id, potroId: r.potro_id, data: r.data || '',
  sexoPotro: r.sexo_potro || '', nomePotro: r.nome_potro || '',
  pesoPotro: r.peso_potro, mamouColostro: !!r.mamou_colostro,
  horaPrimeiroLeite: r.hora_primeiro_leite || '', status: r.status || 'normal',
  obs: r.obs || '', insumosParto: r.insumos_parto || [],
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

export const fromDbFaturaFechada = r => ({
  id: r.id, proprietarioId: r.proprietario_id,
  ano: r.ano, mes: r.mes, total: Number(r.total) || 0,
  mensalidades: Number(r.mensalidades) || 0,
  perfilNutricional: Number(r.perfil_nutricional) || 0,
  insumosAvulsos: Number(r.insumos_avulsos) || 0,
  linhas: r.linhas || [], fechadaEm: r.fechada_em, fechadaPor: r.fechada_por || '',
});

export const fromDbConfiguracao = r => r?.empresa || {};
export const toDbConfiguracao = (empresa) => ({ id: 'global', empresa });

export const toDbFaturaFechada = f => ({
  id: f.id, proprietario_id: f.proprietarioId,
  ano: f.ano, mes: f.mes, total: f.total,
  mensalidades: f.mensalidades, perfil_nutricional: f.perfilNutricional || 0,
  insumos_avulsos: f.insumosAvulsos || 0, linhas: f.linhas || [],
  fechada_por: f.fechadaPor || '',
});

// ── toDb: App (camelCase) → DB (snake_case) ───────────────────

export const toDbCavalo = c => ({
  id: c.id, nome: c.nome, pelagem: c.pelagem || '', sexo: c.sexo || '',
  categoria: c.categoria || '', categorias: c.categorias || [],
  nascimento: c.nascimento || '', proprietario_id: c.proprietarioId || null,
  baia: c.baia || '', piquete: c.piquete || '', mensalidade: c.mensalidade || 0,
  obs: c.obs || '', nutricao: c.nutricao || {},
  gestacao: c.gestacao || null, historico_gestacional: c.historicoGestacional || [],
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
  id: p.id, cavalo_id: p.cavaloId, servico_id: p.servicoId,
  valor_servico: p.valorServico || 0,
  descartaveis_obrigatorios: p.descartaveisObrigatorios || [],
  insumos_adicionais: p.insumosAdicionais || [],
  motoboy: p.motoboy || { ativo: false, valor: 0 },
  total: p.total || 0, hora: p.hora || '', nota: p.nota || '', data: p.data,
});

export const toDbParto = p => ({
  id: p.id, egua_id: p.eguaId, potro_id: p.potroId || null, data: p.data || '',
  sexo_potro: p.sexoPotro || '', nome_potro: p.nomePotro || '',
  peso_potro: p.pesoPotro || null, mamou_colostro: !!p.mamouColostro,
  hora_primeiro_leite: p.horaPrimeiroLeite || '', status: p.status || 'normal',
  obs: p.obs || '', insumos_parto: p.insumosParto || [],
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

// ── partialToDb: mapeia apenas os campos que diferem ──────────

const CAVALO_MAP    = { proprietarioId: 'proprietario_id', historicoGestacional: 'historico_gestacional' };
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

export async function fetchAll(table, mapper) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) { console.error(`fetchAll ${table}:`, error.message); return []; }
  return (data || []).map(mapper);
}

export const dbInsert = (table, row) =>
  supabase.from(table).insert([row]).then(({ error }) => {
    if (error) console.error(`insert ${table}:`, error.message);
  });

export const dbUpdate = (table, id, changes) =>
  supabase.from(table).update(changes).eq('id', id).then(({ error }) => {
    if (error) console.error(`update ${table}:`, error.message);
  });

export const dbDelete = (table, id) =>
  supabase.from(table).delete().eq('id', id).then(({ error }) => {
    if (error) console.error(`delete ${table}:`, error.message);
  });

export const dbUpsert = (table, row) =>
  supabase.from(table).upsert([row]).then(({ error }) => {
    if (error) console.error(`upsert ${table}:`, error.message);
  });
