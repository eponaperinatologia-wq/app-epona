// data.jsx — Mock data for App Epona

// CATEGORIAS DE CAVALO (substitui o antigo Adulto/Matriz/Potro)
const CATEGORIAS_CAVALO = ['Potro ao pé', 'Potro', 'Jovem', 'Adulto', 'Castrado', 'Garanhão', 'Matriz', 'Doadora', 'Receptora', 'Gestante'];

const PROPRIETARIOS = [
  { id: 'p1', nome: 'Ricardo Almeida', telefone: '(11) 98234-1209', email: 'ricardo@email.com', cavalos: ['c1', 'c5', 'c12'] },
  { id: 'p2', nome: 'Marina Vasconcellos', telefone: '(11) 99821-3344', email: 'marina.v@email.com', cavalos: ['c2', 'c8', 'c11'] },
  { id: 'p3', nome: 'Eduardo Pires', telefone: '(11) 97712-5566', email: 'eduardo.pires@email.com', cavalos: ['c3'] },
  { id: 'p4', nome: 'Família Bittencourt', telefone: '(11) 96543-2211', email: 'haras.bitt@email.com', cavalos: ['c4', 'c9'] },
  { id: 'p5', nome: 'Helena Drummond', telefone: '(11) 99012-7788', email: 'helena.d@email.com', cavalos: ['c6', 'c10'] },
  { id: 'p6', nome: 'Carlos Tavares', telefone: '(11) 98876-1144', email: 'ctavares@email.com', cavalos: ['c7'] },
];

// Cavalos agora têm:
//   sexo: 'M' | 'F'
//   categoria: uma de CATEGORIAS_CAVALO
//   mensalidade: valor individual em BRL
//   nutricao: { racaoId, racaoKgDia, oleoMlDia, suplementos: [{ insumoId, qtdDia }] }
//
// Ração é coberta pela mensalidade. Óleo e suplementos são cobrados por dia × valor unitário do insumo.
const CAVALOS = [
  {
    id: 'c1', nome: 'Indiano', pelagem: 'Tordilho', sexo: 'M', categoria: 'Adulto',
    nascimento: '2017-03-12', proprietarioId: 'p1', baia: 'A-04', mensalidade: 3200, obs: 'Alérgico a aveia.',
    nutricao: { racaoId: 'i2', racaoKgDia: 5, oleoMlDia: 60, suplementos: [{ insumoId: 'i7', qtdDia: 1 }] }
  },
  {
    id: 'c2', nome: 'Estrela do Norte', pelagem: 'Alazã', sexo: 'F', categoria: 'Matriz',
    nascimento: '2014-09-04', proprietarioId: 'p2', baia: 'A-07', mensalidade: 2800, obs: '',
    nutricao: { racaoId: 'i2', racaoKgDia: 4, oleoMlDia: 40, suplementos: [{ insumoId: 'i6', qtdDia: 1 }] }
  },
  {
    id: 'c3', nome: 'Fagundes', pelagem: 'Castanho', sexo: 'M', categoria: 'Adulto',
    nascimento: '2016-06-22', proprietarioId: 'p3', baia: 'B-02', mensalidade: 3200, obs: 'Em recuperação de tendão.',
    nutricao: { racaoId: 'i2', racaoKgDia: 4, oleoMlDia: 0, suplementos: [] }
  },
  {
    id: 'c4', nome: 'Lua de Prata', pelagem: 'Tordilho', sexo: 'F', categoria: 'Doadora',
    nascimento: '2013-11-30', proprietarioId: 'p4', baia: 'B-05', mensalidade: 3400, obs: '',
    nutricao: { racaoId: 'i3', racaoKgDia: 5, oleoMlDia: 80, suplementos: [{ insumoId: 'i6', qtdDia: 1 }, { insumoId: 'i7', qtdDia: 1 }] }
  },
  {
    id: 'c5', nome: 'Tornado', pelagem: 'Preto', sexo: 'M', categoria: 'Adulto',
    nascimento: '2018-02-15', proprietarioId: 'p1', baia: 'A-09', mensalidade: 3200, obs: '',
    nutricao: { racaoId: 'i3', racaoKgDia: 6, oleoMlDia: 100, suplementos: [{ insumoId: 'i7', qtdDia: 1 }] }
  },
  {
    id: 'c6', nome: 'Açucena', pelagem: 'Baia', sexo: 'F', categoria: 'Gestante',
    nascimento: '2015-04-19', proprietarioId: 'p5', baia: 'C-01', mensalidade: 3000, obs: 'Gestante (8º mês).',
    nutricao: { racaoId: 'i2', racaoKgDia: 5, oleoMlDia: 60, suplementos: [{ insumoId: 'i6', qtdDia: 1 }] }
  },
  {
    id: 'c7', nome: 'Vendaval', pelagem: 'Castanho', sexo: 'M', categoria: 'Adulto',
    nascimento: '2019-01-08', proprietarioId: 'p6', baia: 'C-03', mensalidade: 3200, obs: '',
    nutricao: { racaoId: 'i2', racaoKgDia: 4, oleoMlDia: 0, suplementos: [] }
  },
  {
    id: 'c8', nome: 'Pequeno Príncipe', pelagem: 'Alazã', sexo: 'M', categoria: 'Potro Desmamado',
    nascimento: '2024-10-02', proprietarioId: 'p2', baia: 'D-01', mensalidade: 1900, obs: 'Filho da Estrela do Norte.',
    nutricao: { racaoId: 'i1', racaoKgDia: 2, oleoMlDia: 0, suplementos: [] }
  },
  {
    id: 'c9', nome: 'Manhã', pelagem: 'Rosilha', sexo: 'F', categoria: 'Receptora',
    nascimento: '2016-07-14', proprietarioId: 'p4', baia: 'B-08', mensalidade: 2600, obs: '',
    nutricao: { racaoId: 'i2', racaoKgDia: 4, oleoMlDia: 30, suplementos: [] }
  },
  {
    id: 'c10', nome: 'Cometa', pelagem: 'Castanho', sexo: 'M', categoria: 'Potro Desmamado',
    nascimento: '2025-01-22', proprietarioId: 'p5', baia: 'D-02', mensalidade: 1900, obs: '',
    nutricao: { racaoId: 'i1', racaoKgDia: 1.5, oleoMlDia: 0, suplementos: [] }
  },
  {
    id: 'c11', nome: 'Aurora', pelagem: 'Tordilho', sexo: 'F', categoria: 'Adulto',
    nascimento: '2020-08-11', proprietarioId: 'p2', baia: 'A-12', mensalidade: 3000, obs: '',
    nutricao: { racaoId: 'i3', racaoKgDia: 5, oleoMlDia: 60, suplementos: [{ insumoId: 'i7', qtdDia: 1 }] }
  },
  {
    id: 'c12', nome: 'Brioso', pelagem: 'Castanho', sexo: 'M', categoria: 'Adulto',
    nascimento: '2017-12-03', proprietarioId: 'p1', baia: 'B-11', mensalidade: 3200, obs: '',
    nutricao: { racaoId: 'i2', racaoKgDia: 4, oleoMlDia: 40, suplementos: [] }
  },
];

// Sobretaxa fixa por aplicação injetável (cobrada na fatura por aplicação)
const TAXA_INJETAVEL = 3.50;

const CATEGORIAS_INSUMOS = [
  { id: 'racao', nome: 'Ração', cor: '#a16207' },
  { id: 'oleo', nome: 'Óleo', cor: '#b45309' },
  { id: 'suplemento', nome: 'Suplemento', cor: '#7c2d12' },
  { id: 'medicamento', nome: 'Medicamento', cor: '#991b1b' },
  { id: 'ferradura', nome: 'Ferradura', cor: '#374151' },
  { id: 'cama', nome: 'Cama', cor: '#854d0e' },
  { id: 'veterinario', nome: 'Veterinário', cor: '#0f766e' },
  { id: 'transporte', nome: 'Transporte', cor: '#1e40af' },
];

// Insumos agora têm `injetavel: bool`. Ração não é cobrada (incluída na mensalidade).
const INSUMOS = [
  // Ração — apenas referência, não é cobrada
  { id: 'i1', nome: 'Ração Potro Crescimento', categoria: 'racao', unidade: 'kg', valor: 8.50, injetavel: false },
  { id: 'i2', nome: 'Ração Manutenção Adulto', categoria: 'racao', unidade: 'kg', valor: 6.20, injetavel: false },
  { id: 'i3', nome: 'Ração Performance', categoria: 'racao', unidade: 'kg', valor: 9.80, injetavel: false },
  { id: 'i4', nome: 'Feno Tifton', categoria: 'racao', unidade: 'fardo', valor: 45.00, injetavel: false },
  // Óleo — cobrado por ml/dia segundo perfil do cavalo
  { id: 'i_oleo', nome: 'Óleo de soja', categoria: 'oleo', unidade: 'ml', valor: 0.05, injetavel: false },
  // Suplementos — cobrados por dose/dia segundo perfil
  { id: 'i5', nome: 'Eletrólito', categoria: 'suplemento', unidade: 'dose', valor: 18.00, injetavel: false },
  { id: 'i6', nome: 'Vitamina E + Selênio', categoria: 'suplemento', unidade: 'dose', valor: 32.00, injetavel: false },
  { id: 'i7', nome: 'Probiótico', categoria: 'suplemento', unidade: 'dose', valor: 22.00, injetavel: false },
  // Medicamentos (avulsos)
  { id: 'i8', nome: 'Vermífugo', categoria: 'medicamento', unidade: 'aplicação', valor: 85.00, injetavel: false },
  { id: 'i9', nome: 'Vacina Influenza', categoria: 'medicamento', unidade: 'aplicação', valor: 140.00, injetavel: true },
  { id: 'i10', nome: 'Anti-inflamatório', categoria: 'medicamento', unidade: 'dose', valor: 45.00, injetavel: true },
  { id: 'i18', nome: 'Antibiótico', categoria: 'medicamento', unidade: 'dose', valor: 68.00, injetavel: true },
  // Ferradura
  { id: 'i11', nome: 'Ferrageamento completo', categoria: 'ferradura', unidade: 'serviço', valor: 280.00, injetavel: false },
  { id: 'i12', nome: 'Casqueamento', categoria: 'ferradura', unidade: 'serviço', valor: 120.00, injetavel: false },
  // Cama
  { id: 'i13', nome: 'Maravalha', categoria: 'cama', unidade: 'fardo', valor: 38.00, injetavel: false },
  { id: 'i14', nome: 'Palha', categoria: 'cama', unidade: 'fardo', valor: 25.00, injetavel: false },
  // Veterinário
  { id: 'i15', nome: 'Consulta de rotina', categoria: 'veterinario', unidade: 'consulta', valor: 250.00, injetavel: false },
  { id: 'i16', nome: 'Exame de sangue', categoria: 'veterinario', unidade: 'exame', valor: 180.00, injetavel: false },
  // Transporte
  { id: 'i17', nome: 'Transporte intermunicipal', categoria: 'transporte', unidade: 'km', valor: 4.50, injetavel: false },
];

// Registros do dia — apenas insumos AVULSOS (medicamento, ferradura, cama, etc.)
// Ração/óleo/suplementos diários NÃO ficam aqui — saem do perfil do cavalo.
const REGISTROS_HOJE = [
  { id: 'r1', cavaloId: 'c3', insumoId: 'i10', qtd: 1, hora: '07:15', usuario: 'Vet. Sandra' },
  { id: 'r2', cavaloId: 'c1', insumoId: 'i12', qtd: 1, hora: '08:40', usuario: 'Pedro S.' },
  { id: 'r3', cavaloId: 'c4', insumoId: 'i13', qtd: 1, hora: '08:20', usuario: 'Pedro S.' },
  { id: 'r4', cavaloId: 'c6', insumoId: 'i15', qtd: 1, hora: '09:10', usuario: 'Vet. Sandra' },
];

// Baias agrupadas
const SETORES = [
  { id: 'A', nome: 'Setor A · Adultos', cavalos: ['c1', 'c2', 'c5', 'c11'] },
  { id: 'B', nome: 'Setor B · Geral', cavalos: ['c3', 'c4', 'c9', 'c12'] },
  { id: 'C', nome: 'Setor C · Matrizes', cavalos: ['c6', 'c7'] },
  { id: 'D', nome: 'Setor D · Potros', cavalos: ['c8', 'c10'] },
];

// Movimentações de entrada/saída de animais (afeta cobrança proporcional)
const MOVIMENTACOES = [
  { id: 'm1', cavaloId: 'c8', tipo: 'entrada', data: '2026-05-12', motivo: 'Início de hospedagem', usuario: 'João T.' },
  { id: 'm2', cavaloId: 'c12', tipo: 'saida', data: '2026-04-22', motivo: 'Transferência temporária', usuario: 'João T.' },
  { id: 'm3', cavaloId: 'c12', tipo: 'entrada', data: '2026-05-03', motivo: 'Retorno', usuario: 'João T.' },
];

// REGISTRO ETERNO de atividades — todas as ações que aconteceram no haras.
// Tipos: 'insumo' | 'entrada' | 'saida' | 'cadastro' | 'aviso'
// Contém timestamp completo, dia e hora separados para filtros.
const ATIVIDADES = [
  // hoje (2026-05-04)
  { id: 'at1', tipo: 'insumo', data: '2026-05-04', hora: '09:10', cavaloId: 'c6', insumoId: 'i15', qtd: 1, usuario: 'Vet. Sandra' },
  { id: 'at2', tipo: 'insumo', data: '2026-05-04', hora: '08:40', cavaloId: 'c1', insumoId: 'i12', qtd: 1, usuario: 'Pedro S.' },
  { id: 'at3', tipo: 'insumo', data: '2026-05-04', hora: '08:20', cavaloId: 'c4', insumoId: 'i13', qtd: 1, usuario: 'Pedro S.' },
  { id: 'at4', tipo: 'insumo', data: '2026-05-04', hora: '07:15', cavaloId: 'c3', insumoId: 'i10', qtd: 1, usuario: 'Vet. Sandra' },
  // ontem
  { id: 'at5', tipo: 'entrada', data: '2026-05-03', hora: '14:22', cavaloId: 'c12', motivo: 'Retorno', usuario: 'João T.' },
  { id: 'at6', tipo: 'insumo', data: '2026-05-03', hora: '11:00', cavaloId: 'c5', insumoId: 'i11', qtd: 1, usuario: 'Pedro S.' },
  { id: 'at7', tipo: 'insumo', data: '2026-05-03', hora: '09:30', cavaloId: 'c2', insumoId: 'i9', qtd: 1, usuario: 'Vet. Sandra' },
  // 2 dias atrás
  { id: 'at8', tipo: 'aviso', data: '2026-05-02', hora: '16:45', autor: 'Helena D.', texto: 'Açucena está bem? Faz tempo que não recebo notícias.' },
  { id: 'at9', tipo: 'insumo', data: '2026-05-02', hora: '10:15', cavaloId: 'c7', insumoId: 'i8', qtd: 1, usuario: 'Vet. Sandra' },
  // semana passada
  { id: 'at10', tipo: 'cadastro', data: '2026-04-28', hora: '15:00', cavaloId: 'c10', usuario: 'Você' },
  { id: 'at11', tipo: 'insumo', data: '2026-04-26', hora: '08:00', cavaloId: 'c4', insumoId: 'i16', qtd: 1, usuario: 'Vet. Sandra' },
  { id: 'at12', tipo: 'saida', data: '2026-04-22', hora: '13:00', cavaloId: 'c12', motivo: 'Transferência temporária', usuario: 'João T.' },
  { id: 'at13', tipo: 'insumo', data: '2026-04-20', hora: '10:30', cavaloId: 'c1', insumoId: 'i17', qtd: 45, usuario: 'João T.' },
  { id: 'at14', tipo: 'insumo', data: '2026-04-18', hora: '09:00', cavaloId: 'c11', insumoId: 'i9', qtd: 1, usuario: 'Vet. Sandra' },
];

// Avisos do mural — compartilhado, todos veem e podem postar
const AVISOS = [
  { id: 'a1', autor: 'Vet. Sandra', avatar: 'VS', tempo: 'há 12 min', texto: 'Fagundes precisa de aplicação de anti-inflamatório às 14h. Já registrei a dose da manhã.', urgente: true, cavaloId: 'c3' },
  { id: 'a2', autor: 'Pedro S.', avatar: 'PS', tempo: 'há 1 h', texto: 'Maravalha do Setor B acabando — pedi mais 20 fardos para entregar amanhã.', urgente: false },
  { id: 'a3', autor: 'João T.', avatar: 'JT', tempo: 'há 3 h', texto: 'Pequeno Príncipe entrou ontem, baia D-01. Ração de potro liberada.', urgente: false, cavaloId: 'c8' },
  { id: 'a4', autor: 'Marina V.', avatar: 'MV', tempo: 'ontem', texto: 'Vou retirar a Aurora sábado para uma prova. Volto domingo à noite.', urgente: false, cavaloId: 'c11' },
  { id: 'a5', autor: 'Helena D.', avatar: 'HD', tempo: 'ontem', texto: 'Açucena está bem? Faz tempo que não recebo notícias.', urgente: false, cavaloId: 'c6' },
];

// ── Helpers ────────────────────────────────────────────────────
const getCavalo = (id) => CAVALOS.find(c => c.id === id);
const getProprietario = (id) => PROPRIETARIOS.find(p => p.id === id);
const getInsumo = (id) => INSUMOS.find(i => i.id === id);
const getCategoria = (id) => CATEGORIAS_INSUMOS.find(c => c.id === id);
const idade = (nasc) => {
  const d = new Date(nasc);
  const hoje = new Date('2026-05-04');
  let anos = hoje.getFullYear() - d.getFullYear();
  if (hoje.getMonth() < d.getMonth() || (hoje.getMonth() === d.getMonth() && hoje.getDate() < d.getDate())) anos--;
  if (anos < 1) {
    const meses = (hoje.getFullYear() - d.getFullYear()) * 12 + (hoje.getMonth() - d.getMonth());
    return meses + ' meses';
  }
  return anos + ' anos';
};
const formatBRL = (v) => 'R$ ' + v.toFixed(2).replace('.', ',');

// Calcula dias proporcionais que o cavalo ficou no haras no mês de referência
const diasNoMes = (cavaloId, ref, movs = MOVIMENTACOES) => {
  const inicioMes = new Date(ref.ano, ref.mes - 1, 1);
  const fimMes = new Date(ref.ano, ref.mes, 0);
  const diasTotais = fimMes.getDate();
  const cavMovs = movs
    .filter(m => m.cavaloId === cavaloId)
    .map(m => ({ ...m, d: new Date(m.data) }))
    .sort((a, b) => a.d - b.d);
  const dentroMes = cavMovs.filter(m => m.d >= inicioMes && m.d <= fimMes);
  if (dentroMes.length === 0) return { dias: diasTotais, total: diasTotais, parcial: false };
  let dias = 0;
  let presente = true;
  let cursor = new Date(inicioMes);
  const antes = cavMovs.filter(m => m.d < inicioMes);
  if (antes.length > 0) presente = antes[antes.length - 1].tipo === 'entrada';
  for (const m of dentroMes) {
    if (presente) {
      const diasContados = Math.max(0, Math.floor((m.d - cursor) / (1000 * 60 * 60 * 24)) + (m.tipo === 'saida' ? 1 : 0));
      dias += diasContados;
    }
    presente = m.tipo === 'entrada';
    cursor = new Date(m.d);
  }
  if (presente) {
    const diasContados = Math.max(0, Math.floor((fimMes - cursor) / (1000 * 60 * 60 * 24)) + 1);
    dias += diasContados;
  }
  return { dias: Math.min(dias, diasTotais), total: diasTotais, parcial: true };
};

const proporcaoMensalidade = (cavaloId, ref, movs) => {
  const { dias, total, parcial } = diasNoMes(cavaloId, ref, movs);
  const cav = getCavalo(cavaloId);
  const valorBase = cav.mensalidade;
  return { dias, total, parcial, valor: valorBase * (dias / total), valorBase };
};

// Calcula o consumo diário de óleo + suplementos do cavalo, baseado no perfil
// Retorna linhas: { insumoId, nome, qtdDia, unidade, valorDia }
const consumoDiarioCavalo = (cavaloId) => {
  const cav = getCavalo(cavaloId);
  if (!cav || !cav.nutricao) return [];
  const linhas = [];
  if (cav.nutricao.oleoMlDia > 0) {
    const oleo = getInsumo('i_oleo');
    linhas.push({
      insumoId: oleo.id, nome: oleo.nome,
      qtdDia: cav.nutricao.oleoMlDia, unidade: oleo.unidade,
      valorUnit: oleo.valor,
      valorDia: oleo.valor * cav.nutricao.oleoMlDia,
    });
  }
  for (const s of (cav.nutricao.suplementos || [])) {
    const ins = getInsumo(s.insumoId);
    if (!ins) continue;
    linhas.push({
      insumoId: ins.id, nome: ins.nome,
      qtdDia: s.qtdDia, unidade: ins.unidade,
      valorUnit: ins.valor,
      valorDia: ins.valor * s.qtdDia,
    });
  }
  return linhas;
};

// Cobrança mensal de óleo+suplementos do perfil, proporcional aos dias no haras
const cobrancaPerfilMes = (cavaloId, ref, movs) => {
  const { dias } = diasNoMes(cavaloId, ref, movs);
  const linhas = consumoDiarioCavalo(cavaloId).map(l => ({
    ...l, dias, valorMes: l.valorDia * dias,
  }));
  return { linhas, total: linhas.reduce((s, l) => s + l.valorMes, 0), dias };
};

Object.assign(window, {
  PROPRIETARIOS, CAVALOS, CATEGORIAS_CAVALO, CATEGORIAS_INSUMOS, INSUMOS,
  REGISTROS_HOJE, SETORES, MOVIMENTACOES, AVISOS, ATIVIDADES, TAXA_INJETAVEL,
  getCavalo, getProprietario, getInsumo, getCategoria, idade, formatBRL,
  diasNoMes, proporcaoMensalidade, consumoDiarioCavalo, cobrancaPerfilMes,
});
