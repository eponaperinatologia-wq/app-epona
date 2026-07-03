import { supabase } from './supabase';

// ── fromDb: DB (snake_case) → App (camelCase) ─────────────────

export const fromDbCavalo = r => ({
  id: r.id, nome: r.nome, pelagem: r.pelagem || '', sexo: r.sexo || '',
  categoria: r.categoria || '', categorias: r.categorias || [],
  nascimento: r.nascimento || '',
  proprietarioId: r.proprietario_id || null,
  proprietarioIds: r.proprietario_ids || (r.proprietario_id ? [r.proprietario_id] : []),
  baia: r.baia || '', piquete: r.piquete || '', mensalidade: Number(r.mensalidade) || 0,
  obs: r.obs || '', nutricao: r.nutricao || {},
  gestacao: r.gestacao || null, historicoGestacional: r.historico_gestacional || [],
  dataEntrada: r.data_entrada || '',
  presente: r.presente !== false,
  dataSaida: r.data_saida || '',
  maeId: r.mae_id || null,
  pagarOCusto: !!r.pagar_o_custo,
});

export const fromDbProprietario = r => ({
  id: r.id, nome: r.nome, telefone: r.telefone || '', email: r.email || '',
});

export const fromDbInsumo = r => ({
  id: r.id, nome: r.nome, categoria: r.categoria, unidade: r.unidade || 'un',
  fornecedor: r.fornecedor || '', valorCompra: Number(r.valor_compra) || 0,
  markup: Number(r.markup) || 0, valorVenda: Number(r.valor_venda) || 0,
  injetavel: !!r.injetavel, descartaveis: r.descartaveis || [],
  incluidoMensalidade: !!r.incluido_mensalidade,
  formaCobranca: r.forma_cobranca || 'por_uso',
  valorFrasco: Number(r.valor_frasco) || 0,
  validadeAposAbertaDias: Number(r.validade_apos_aberta_dias) || 0,
  capacidadePorFrasco: Number(r.capacidade_por_frasco) || 0,
});

export const fromDbServico = r => ({
  id: r.id, nome: r.nome, valor: Number(r.valor) || 0, categoria: r.categoria,
  descartaveisObrigatorios: r.descartaveis_obrigatorios || [],
});

export const fromDbFuncionario = r => ({
  id: r.id, nome: r.nome, funcao: r.funcao, aniversario: r.aniversario || '',
  login: r.login || '', senha: r.senha || '', escala: r.escala || {},
  salarioBase: Number(r.salario_base) || 0,
  regimePagamento: r.regime_pagamento || 'mensal_dia_05',
  encargosPct: Number(r.encargos_pct) || 0,
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
  fechada_em: f.fechadaEm || new Date().toISOString(),
});

// ── toDb: App (camelCase) → DB (snake_case) ───────────────────

export const toDbCavalo = c => ({
  id: c.id, nome: c.nome, pelagem: c.pelagem || '', sexo: c.sexo || '',
  categoria: c.categoria || '', categorias: c.categorias || [],
  nascimento: c.nascimento || null,
  proprietario_id: c.proprietarioIds?.[0] || c.proprietarioId || null,
  proprietario_ids: c.proprietarioIds || (c.proprietarioId ? [c.proprietarioId] : []),
  baia: c.baia || '', piquete: c.piquete || '', mensalidade: Number(c.mensalidade) || 0,
  obs: c.obs || '', nutricao: c.nutricao || {},
  gestacao: c.gestacao || null, historico_gestacional: c.historicoGestacional || [],
  data_entrada: c.dataEntrada || null,
  presente: c.presente !== false,
  data_saida: c.dataSaida || null,
  mae_id: c.maeId || null,
  pagar_o_custo: !!c.pagarOCusto,
});

export const toDbProprietario = p => ({
  id: p.id, nome: p.nome, telefone: p.telefone || '', email: p.email || '',
});

export const toDbInsumo = i => ({
  id: i.id, nome: i.nome, categoria: i.categoria, unidade: i.unidade || 'un',
  fornecedor: i.fornecedor || '', valor_compra: Number(i.valorCompra) || 0,
  markup: Number(i.markup) || 0, valor_venda: Number(i.valorVenda) || 0,
  injetavel: !!i.injetavel, descartaveis: i.descartaveis || [],
  incluido_mensalidade: !!i.incluidoMensalidade,
  forma_cobranca: i.formaCobranca || 'por_uso',
  valor_frasco: Number(i.valorFrasco) || 0,
  validade_apos_aberta_dias: Number(i.validadeAposAbertaDias) || 0,
  capacidade_por_frasco: Number(i.capacidadePorFrasco) || 0,
});

export const toDbServico = s => ({
  id: s.id, nome: s.nome, valor: Number(s.valor) || 0, categoria: s.categoria,
  descartaveis_obrigatorios: s.descartaveisObrigatorios || [],
});

export const toDbFuncionario = f => ({
  id: f.id, nome: f.nome, funcao: f.funcao, aniversario: f.aniversario || '',
  login: f.login || null, senha: f.senha || '', escala: f.escala || {},
  salario_base: Number(f.salarioBase) || 0,
  regime_pagamento: f.regimePagamento || 'mensal_dia_05',
  encargos_pct: Number(f.encargosPct) || 0,
});

export const toDbRegistro = r => ({
  id: r.id, cavalo_id: r.cavaloId, insumo_id: r.insumoId,
  qtd: Number(r.qtd) || 1, hora: r.hora || '', usuario: r.usuario || '',
  is_auto: !!r.isAuto, data: r.data,
});

export const toDbProcedimento = p => ({
  id: p.id, cavalo_id: p.cavaloId,
  servico_id: (p.servicoId === '__exames_lab__' || !p.servicoId) ? null : p.servicoId,
  valor_servico: Number(p.valorServico) || 0,
  descartaveis_obrigatorios: p.descartaveisObrigatorios || [],
  insumos_adicionais: p.insumosAdicionais || [],
  dados_extras: {
    motoboy: p.motoboy || { ativo: false, valor: 0, nome: '' },
    laboratorio: p.laboratorio || '',
    tubosSelecionados: p.tubosSelecionados || [],
    examesSelecionados: p.examesSelecionados || [],
  },
  total: Number(p.total) || 0, hora: p.hora || '', nota: p.nota || '', data: p.data,
});

const _toNumOrNull = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const toDbParto = p => ({
  id: p.id, egua_id: p.eguaId, potro_id: p.potroId || null, data: p.data || '',
  sexo_potro: p.sexoPotro || '', nome_potro: p.nomePotro || '',
  peso_potro: _toNumOrNull(p.pesoPotro), mamou_colostro: !!p.mamouColostro,
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
  id: l.id, tipo: l.tipo, valor: Number(l.valor) || 0, data: l.data,
  quem: l.quem || '', motivo: l.motivo || '', categoria: l.categoria || '',
  pago: !!l.pago, pago_em: l.pagoEm || null,
  ...(l.recorrenciaId ? { recorrencia_id: l.recorrenciaId } : {}),
});

export const fromDbRecorrencia = r => ({
  id: r.id, tipo: r.tipo, valor: Number(r.valor) || 0,
  descricao: r.descricao || '', categoria: r.categoria || '', quem: r.quem || '',
  frequencia: r.frequencia || 'mensal', diaMes: r.dia_mes || 1,
  dataInicio: r.data_inicio || '', dataFim: r.data_fim || null,
  ativo: r.ativo !== false,
});

export const toDbRecorrencia = r => ({
  id: r.id, tipo: r.tipo, valor: Number(r.valor) || 0,
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
  pago: r.pago || false,
  dataVencimento: r.data_vencimento || null,
  tipo: r.tipo || 'compra',
  semLancamento: !!r.sem_lancamento,
});

export const toDbEstoqueCompra = c => ({
  id: c.id, insumo_id: c.insumoId, data: c.data,
  qtd: Number(c.qtd) || 0, unidade: c.unidade,
  valor_unit: Number(c.valorUnit) || 0, valor_total: Number(c.valorTotal) || 0,
  fornecedor: c.fornecedor || '', obs: c.obs || '',
  lancamento_id: c.lancamentoId || null,
  pago: c.pago || false,
  data_vencimento: c.dataVencimento || null,
  tipo: c.tipo || 'compra',
  sem_lancamento: !!c.semLancamento,
});

export const fromDbProtocoloVacinacao = r => ({
  id: r.id, nome: r.nome,
  tipo: r.tipo || 'gestante', descricao: r.descricao || '',
  ativo: r.ativo !== false,
  intervaloDias: Number(r.intervalo_dias) || 0,
  insumoId: r.insumo_id || '',
  animaisAlvo: r.animais_alvo || [],
  dataFixa: r.data_fixa || null,
  eventoUnico: !!r.evento_unico,
  eventoReferencia: r.evento_referencia || '',
  doses: r.doses || [],
});
export const toDbProtocoloVacinacao = p => ({
  id: p.id, nome: p.nome,
  tipo: p.tipo || 'gestante', descricao: p.descricao || '',
  ativo: p.ativo !== false,
  intervalo_dias: Number(p.intervaloDias) || 0,
  insumo_id: p.insumoId || '',
  animais_alvo: p.animaisAlvo || [],
  data_fixa: p.dataFixa || null,
  evento_unico: !!p.eventoUnico,
  evento_referencia: p.eventoReferencia || '',
  doses: p.doses || [],
});

export const fromDbCampanhaVacinacao = r => ({
  id: r.id, protocoloId: r.protocolo_id || null,
  data: r.data || '', proximaData: r.proxima_data || null,
  obs: r.obs || '', status: r.status || 'pendente',
});
export const toDbCampanhaVacinacao = c => ({
  id: c.id, protocolo_id: c.protocoloId || null,
  data: c.data, proxima_data: c.proximaData || null,
  obs: c.obs || '', status: c.status || 'pendente',
});

export const fromDbCustoFixo = r => ({
  id: r.id,
  categoria: r.categoria,
  descricao: r.descricao || '',
  valor: Number(r.valor) || 0,
  mes: r.mes,
  dataVencimento: r.data_vencimento || '',
  pago: !!r.pago,
  pagoEm: r.pago_em || '',
  funcionarioId: r.funcionario_id || '',
  encargosPct: Number(r.encargos_pct) || 0,
  observacoes: r.observacoes || '',
});
export const toDbCustoFixo = c => ({
  id: c.id,
  categoria: c.categoria,
  descricao: c.descricao || '',
  valor: Number(c.valor) || 0,
  mes: c.mes,
  data_vencimento: c.dataVencimento || null,
  pago: !!c.pago,
  pago_em: c.pagoEm || null,
  funcionario_id: c.funcionarioId || null,
  encargos_pct: Number(c.encargosPct) || 0,
  observacoes: c.observacoes || '',
});

export const fromDbVacinacaoAnimal = r => ({
  id: r.id, protocoloId: r.protocolo_id || null, doseIdx: r.dose_idx ?? null,
  cavaloId: r.cavalo_id || null, dataPrevista: r.data_prevista || null,
  feito: !!r.feito, feitoPor: r.feito_por || '', feitoEm: r.feito_em || null,
  cancelado: !!r.cancelado, canceladoPor: r.cancelado_por || '', canceladoEm: r.cancelado_em || null,
  reagendadoPara: r.reagendado_para || null,
});
export const toDbVacinacaoAnimal = v => ({
  id: v.id, protocolo_id: v.protocoloId, dose_idx: v.doseIdx ?? null,
  cavalo_id: v.cavaloId, data_prevista: v.dataPrevista || null,
  feito: !!v.feito, feito_por: v.feitoPor || '', feito_em: v.feitoEm || null,
  cancelado: !!v.cancelado, cancelado_por: v.canceladoPor || '', cancelado_em: v.canceladoEm || null,
  reagendado_para: v.reagendadoPara || null,
});

const _safeParseArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return [];
  try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; }
  catch { return []; }
};

export const fromDbOpg = r => ({
  id: r.id,
  cavaloId: r.cavalo_id,
  protocoloId: r.protocolo_id || '',
  dataColeta: r.data_coleta || '',
  dataResultado: r.data_resultado || null,
  resultado: _safeParseArray(r.resultado),
  precisaVermifugacao: r.precisa_vermifugacao,
  insumoVermId: r.insumo_verm_id || '',
  dataAplicacao: r.data_aplicacao || '',
  aplicado: !!r.aplicado,
  dispensado: !!r.dispensado,
  principioAtivo: r.principio_ativo || '',
  observacoes: r.observacoes || '',
  proximaData: r.proxima_data || null,
  etapaIdx: r.etapa_idx ?? null,
});
export const toDbOpg = o => ({
  id: o.id,
  cavalo_id: o.cavaloId,
  protocolo_id: o.protocoloId || null,
  data_coleta: o.dataColeta,
  data_resultado: o.dataResultado || null,
  resultado: o.resultado || [],
  precisa_vermifugacao: o.precisaVermifugacao ?? null,
  insumo_verm_id: o.insumoVermId || '',
  data_aplicacao: o.dataAplicacao || null,
  aplicado: !!o.aplicado,
  dispensado: !!o.dispensado,
  principio_ativo: o.principioAtivo || '',
  observacoes: o.observacoes || '',
  proxima_data: o.proximaData || null,
  etapa_idx: o.etapaIdx ?? null,
});

export const fromDbProtocoloVermifugacao = r => ({
  id: r.id, nome: r.nome || '', descricao: r.descricao || '',
  ativo: r.ativo !== false,
  tipo: r.tipo || '',
  subtipo: r.subtipo || '',
  intervaloDias: Number(r.intervalo_dias) || 0,
  insumoId: r.insumo_id || '',
  animaisAlvo: r.animais_alvo || [],
  dataFixa: r.data_fixa || null,
  eventoUnico: !!r.evento_unico,
  eventoReferencia: r.evento_referencia || '',
  laboratorio: r.laboratorio || '',
  servicoId: r.servico_id || '',
  doses: r.doses || [],
  etapas: r.etapas || [],
});
export const toDbProtocoloVermifugacao = p => ({
  id: p.id, nome: p.nome || '', descricao: p.descricao || '',
  ativo: p.ativo !== false,
  tipo: p.tipo || '',
  subtipo: p.subtipo || '',
  intervalo_dias: Number(p.intervaloDias) || 0,
  insumo_id: p.insumoId || '',
  animais_alvo: p.animaisAlvo || [],
  data_fixa: p.dataFixa || null,
  evento_unico: !!p.eventoUnico,
  evento_referencia: p.eventoReferencia || '',
  laboratorio: p.laboratorio || '',
  servico_id: p.servicoId || '',
  doses: p.doses || [],
  etapas: p.etapas || [],
});

export const fromDbVermifugacaoAnimal = r => ({
  id: r.id,
  protocoloId: r.protocolo_id || null,
  cavaloId: r.cavalo_id || null,
  dataRealizacao: r.data_realizacao || '',
  produto: r.produto || '',
  registradoPor: r.registrado_por || '',
  etapaIdx: r.etapa_idx ?? null,
  cancelado: !!r.cancelado, canceladoPor: r.cancelado_por || '', canceladoEm: r.cancelado_em || null,
  reagendadoPara: r.reagendado_para || null,
});
export const toDbVermifugacaoAnimal = v => ({
  id: v.id,
  protocolo_id: v.protocoloId || null,
  cavalo_id: v.cavaloId,
  data_realizacao: v.dataRealizacao,
  produto: v.produto || '',
  registrado_por: v.registradoPor || '',
  etapa_idx: v.etapaIdx ?? null,
  cancelado: !!v.cancelado, cancelado_por: v.canceladoPor || '', cancelado_em: v.canceladoEm || null,
  reagendado_para: v.reagendadoPara || null,
});

// ── Emergências veterinárias ──────────────────────────────────

export const fromDbEmergencia = r => ({
  id: r.id, cavaloId: r.cavalo_id,
  titulo: r.titulo || '', motivo: r.motivo || '',
  status: r.status || 'ativa',
  observacaoUrgente: r.observacao_urgente || '',
  abertaEm: r.aberta_em, encerradaEm: r.encerrada_em,
  autorAbertura: r.autor_abertura || '',
});
export const toDbEmergencia = e => ({
  id: e.id, cavalo_id: e.cavaloId,
  titulo: e.titulo || '', motivo: e.motivo || '',
  status: e.status || 'ativa',
  observacao_urgente: e.observacaoUrgente || '',
  aberta_em: e.abertaEm || new Date().toISOString(),
  encerrada_em: e.encerradaEm || null,
  autor_abertura: e.autorAbertura || '',
});

export const fromDbEmergenciaMedicacao = r => ({
  id: r.id, emergenciaId: r.emergencia_id,
  insumoId: r.insumo_id || null, servicoId: r.servico_id || null,
  doseQtd: Number(r.dose_qtd) || 0,
  unidade: r.unidade || '',
  data: r.data || '', hora: r.hora || '',
  recorrencia: r.recorrencia || {},
  status: r.status || 'programado',
  feitoEm: r.feito_em, feitoPor: r.feito_por || '',
  registroId: r.registro_id || null,
  procedimentoId: r.procedimento_id || null,
  frascoId: r.frasco_id || null,
  descartaveisRegistros: r.descartaveis_registros || [],
  insumosAdicionais: r.insumos_adicionais || [],
  nota: r.nota || '',
});
export const toDbEmergenciaMedicacao = m => ({
  id: m.id, emergencia_id: m.emergenciaId,
  insumo_id: m.insumoId || null, servico_id: m.servicoId || null,
  dose_qtd: Number(m.doseQtd) || 0,
  unidade: m.unidade || '',
  data: m.data, hora: m.hora,
  recorrencia: m.recorrencia || {},
  status: m.status || 'programado',
  feito_em: m.feitoEm || null, feito_por: m.feitoPor || '',
  registro_id: m.registroId || null,
  procedimento_id: m.procedimentoId || null,
  frasco_id: m.frascoId || null,
  descartaveis_registros: m.descartaveisRegistros || [],
  insumos_adicionais: m.insumosAdicionais || [],
  nota: m.nota || '',
});

export const fromDbEmergenciaParamAgenda = r => ({
  id: r.id, emergenciaId: r.emergencia_id,
  intervaloHoras: Number(r.intervalo_horas) || 4,
  inicio: r.inicio, ate: r.ate || null,
  ativo: r.ativo !== false,
  quais: r.quais || [],
});
export const toDbEmergenciaParamAgenda = a => ({
  id: a.id, emergencia_id: a.emergenciaId,
  intervalo_horas: Number(a.intervaloHoras) || 4,
  inicio: a.inicio, ate: a.ate || null,
  ativo: a.ativo !== false,
  quais: a.quais || [],
});

export const fromDbEmergenciaParametro = r => ({
  id: r.id, emergenciaId: r.emergencia_id, agendaId: r.agenda_id || null,
  dataHora: r.data_hora,
  temperatura: r.temperatura == null ? null : Number(r.temperatura),
  fc: r.fc == null ? null : Number(r.fc),
  fr: r.fr == null ? null : Number(r.fr),
  mucosas: r.mucosas || '', fezes: r.fezes || '', urina: r.urina || '',
  atitude: r.atitude || '', obs: r.obs || '', autor: r.autor || '',
});
export const toDbEmergenciaParametro = p => ({
  id: p.id, emergencia_id: p.emergenciaId, agenda_id: p.agendaId || null,
  data_hora: p.dataHora,
  temperatura: p.temperatura === '' || p.temperatura == null ? null : Number(p.temperatura),
  fc: p.fc === '' || p.fc == null ? null : Number(p.fc),
  fr: p.fr === '' || p.fr == null ? null : Number(p.fr),
  mucosas: p.mucosas || '', fezes: p.fezes || '', urina: p.urina || '',
  atitude: p.atitude || '', obs: p.obs || '', autor: p.autor || '',
});

export const fromDbEmergenciaNota = r => ({
  id: r.id, emergenciaId: r.emergencia_id, dataHora: r.data_hora,
  autor: r.autor || '', texto: r.texto || '',
});
export const toDbEmergenciaNota = n => ({
  id: n.id, emergencia_id: n.emergenciaId, data_hora: n.dataHora,
  autor: n.autor || '', texto: n.texto || '',
});

export const fromDbEmergenciaExame = r => ({
  id: r.id, emergenciaId: r.emergencia_id,
  nome: r.nome || '', arquivoUrl: r.arquivo_url || '',
  arquivoNome: r.arquivo_nome || '', arquivoTipo: r.arquivo_tipo || '',
  dataHora: r.data_hora, autor: r.autor || '',
});
export const toDbEmergenciaExame = e => ({
  id: e.id, emergencia_id: e.emergenciaId,
  nome: e.nome || '', arquivo_url: e.arquivoUrl || '',
  arquivo_nome: e.arquivoNome || '', arquivo_tipo: e.arquivoTipo || '',
  data_hora: e.dataHora, autor: e.autor || '',
});

export const fromDbFrascoAberto = r => ({
  id: r.id, insumoId: r.insumo_id, cavaloId: r.cavalo_id,
  emergenciaId: r.emergencia_id || null,
  abertoEm: r.aberto_em, validoAte: r.valido_ate,
  capacidade: Number(r.capacidade) || 0,
  consumido: Number(r.consumido) || 0,
  valorCobrado: Number(r.valor_cobrado) || 0,
  registroId: r.registro_id || null,
});
export const toDbFrascoAberto = f => ({
  id: f.id, insumo_id: f.insumoId, cavalo_id: f.cavaloId,
  emergencia_id: f.emergenciaId || null,
  aberto_em: f.abertoEm, valido_ate: f.validoAte,
  capacidade: Number(f.capacidade) || 0,
  consumido: Number(f.consumido) || 0,
  valor_cobrado: Number(f.valorCobrado) || 0,
  registro_id: f.registroId || null,
});

// ── Progesterona (receptoras) ────────────────────────────────

export const fromDbProgesteronaPrograma = r => ({
  id: r.id, cavaloId: r.cavalo_id, insumoId: r.insumo_id,
  doseQtd: Number(r.dose_qtd) || 0,
  diaSemana: Number(r.dia_semana) || 1,
  freqDias: Number(r.freq_dias) || 7,
  inicio: r.inicio, fim: r.fim,
  status: r.status || 'ativo',
  criadoEm: r.criado_em, criadoPor: r.criado_por || '',
});
export const toDbProgesteronaPrograma = p => ({
  id: p.id, cavalo_id: p.cavaloId, insumo_id: p.insumoId,
  dose_qtd: Number(p.doseQtd) || 0,
  dia_semana: Number(p.diaSemana) || 1,
  freq_dias: Number(p.freqDias) || 7,
  inicio: p.inicio, fim: p.fim,
  status: p.status || 'ativo',
  criado_em: p.criadoEm || new Date().toISOString(),
  criado_por: p.criadoPor || '',
});

export const fromDbProgesteronaAplicacao = r => ({
  id: r.id, programaId: r.programa_id, cavaloId: r.cavalo_id,
  data: r.data, status: r.status || 'programado',
  feitoEm: r.feito_em, feitoPor: r.feito_por || '',
  registroId: r.registro_id || null,
  descartaveisRegistros: r.descartaveis_registros || [],
  nota: r.nota || '',
});
export const toDbProgesteronaAplicacao = a => ({
  id: a.id, programa_id: a.programaId, cavalo_id: a.cavaloId,
  data: a.data, status: a.status || 'programado',
  feito_em: a.feitoEm || null, feito_por: a.feitoPor || '',
  registro_id: a.registroId || null,
  descartaveis_registros: a.descartaveisRegistros || [],
  nota: a.nota || '',
});

// ── partialToDb: mapeia apenas os campos que diferem ──────────

const CAVALO_MAP    = { proprietarioId: 'proprietario_id', proprietarioIds: 'proprietario_ids', dataSaida: 'data_saida', dataEntrada: 'data_entrada', historicoGestacional: 'historico_gestacional', maeId: 'mae_id', pagarOCusto: 'pagar_o_custo' };
const INSUMO_MAP    = { valorCompra: 'valor_compra', valorVenda: 'valor_venda', incluidoMensalidade: 'incluido_mensalidade', formaCobranca: 'forma_cobranca', valorFrasco: 'valor_frasco', validadeAposAbertaDias: 'validade_apos_aberta_dias', capacidadePorFrasco: 'capacidade_por_frasco' };
const SERVICO_MAP   = { descartaveisObrigatorios: 'descartaveis_obrigatorios' };
const PARTO_MAP     = { eguaId: 'egua_id', potroId: 'potro_id', sexoPotro: 'sexo_potro', nomePotro: 'nome_potro', pesoPotro: 'peso_potro', mamouColostro: 'mamou_colostro', horaPrimeiroLeite: 'hora_primeiro_leite', insumosParto: 'insumos_parto' };
const FUNCIONARIO_MAP = { salarioBase: 'salario_base', regimePagamento: 'regime_pagamento', encargosPct: 'encargos_pct' };
const CUSTO_FIXO_MAP = { dataVencimento: 'data_vencimento', pagoEm: 'pago_em', funcionarioId: 'funcionario_id', encargosPct: 'encargos_pct' };
const EMERGENCIA_MAP = { cavaloId: 'cavalo_id', observacaoUrgente: 'observacao_urgente', abertaEm: 'aberta_em', encerradaEm: 'encerrada_em', autorAbertura: 'autor_abertura' };
const EMERG_MED_MAP  = { emergenciaId: 'emergencia_id', insumoId: 'insumo_id', servicoId: 'servico_id', doseQtd: 'dose_qtd', feitoEm: 'feito_em', feitoPor: 'feito_por', registroId: 'registro_id', procedimentoId: 'procedimento_id', frascoId: 'frasco_id', descartaveisRegistros: 'descartaveis_registros', insumosAdicionais: 'insumos_adicionais' };
const EMERG_AGE_MAP  = { emergenciaId: 'emergencia_id', intervaloHoras: 'intervalo_horas' };
const FRASCO_MAP     = { insumoId: 'insumo_id', cavaloId: 'cavalo_id', emergenciaId: 'emergencia_id', abertoEm: 'aberto_em', validoAte: 'valido_ate', valorCobrado: 'valor_cobrado', registroId: 'registro_id' };
const PROG_PROG_MAP  = { cavaloId: 'cavalo_id', insumoId: 'insumo_id', doseQtd: 'dose_qtd', diaSemana: 'dia_semana', freqDias: 'freq_dias' };
const PROG_APL_MAP   = { programaId: 'programa_id', cavaloId: 'cavalo_id', feitoEm: 'feito_em', feitoPor: 'feito_por', registroId: 'registro_id', descartaveisRegistros: 'descartaveis_registros' };

export function partialToDb(partial, keyMap) {
  const result = {};
  for (const [k, v] of Object.entries(partial)) {
    if (v === undefined) continue; // não sobrescreve campos no DB com NULL acidentalmente
    const mapped = keyMap[k];
    if (!mapped && /[A-Z]/.test(k)) {
      // Chave camelCase sem mapeamento → provavelmente bug. Loga e pula para
      // evitar erro "column does not exist" no Supabase.
      // eslint-disable-next-line no-console
      console.warn(`[partialToDb] chave camelCase sem mapeamento, ignorando: ${k}`);
      continue;
    }
    result[mapped || k] = v;
  }
  return result;
}

export { CAVALO_MAP, INSUMO_MAP, SERVICO_MAP, PARTO_MAP, FUNCIONARIO_MAP, CUSTO_FIXO_MAP, EMERGENCIA_MAP, EMERG_MED_MAP, EMERG_AGE_MAP, FRASCO_MAP, PROG_PROG_MAP, PROG_APL_MAP };

// ── Helpers genéricos ─────────────────────────────────────────

// Pagina por baixo do teto do PostgREST (default 1000 linhas/req) — assim não
// truncamos a base do cliente quando tem >1000 registros numa tabela (ex.: muitas
// faturas após o auto-close).
export async function fetchAll(table, mapper, hardLimit = 50000) {
  const PAGE = 1000;
  const out = [];
  let offset = 0;
  while (offset < hardLimit) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(offset, offset + PAGE - 1);
    if (error) { console.error(`fetchAll ${table}:`, error.message); break; }
    const rows = data || [];
    out.push(...rows);
    if (rows.length < PAGE) break; // fim
    offset += PAGE;
  }
  return mapper ? out.map(mapper) : out;
}

// Traduz erros comuns do Postgres para PT-BR amigável.
const _traduzErro = (raw) => {
  if (!raw) return 'Erro desconhecido';
  const s = String(raw);
  if (s.includes('duplicate key') || s.includes('23505')) return 'Já existe um registro com esse identificador.';
  if (s.includes('violates foreign key') || s.includes('23503')) return 'Referência inválida (item vinculado não existe).';
  if (s.includes('not-null') || s.includes('23502')) return 'Campo obrigatório em branco.';
  if (s.includes('relation') && s.includes('does not exist')) return 'Tabela ausente no banco — rode a migração SQL.';
  if (s.includes('column') && s.includes('does not exist')) return 'Coluna ausente no banco — rode a migração SQL.';
  if (s.includes('invalid input syntax')) return 'Formato inválido em algum campo.';
  if (s.includes('Failed to fetch') || s.includes('NetworkError')) return 'Sem conexão com o servidor.';
  return s;
};

const notifyDbError = (op, table, msg) => {
  const friendly = _traduzErro(msg);
  console.error(`${op} ${table}:`, msg);
  window.dispatchEvent(new CustomEvent('db-error', { detail: { op, table, msg: friendly, raw: msg } }));
};

export const dbInsert = async (table, row) => {
  const { error } = await supabase.from(table).insert([row]);
  if (error) { notifyDbError('insert', table, error.message); return false; }
  return true;
};

export const dbUpdate = async (table, id, changes) => {
  if (!changes || Object.keys(changes).length === 0) return true; // no-op
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
