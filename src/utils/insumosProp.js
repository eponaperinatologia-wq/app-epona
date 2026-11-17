// insumosProp.js — insumos que o PROPRIETÁRIO comprou e trouxe para o
// haras. Vale para qualquer insumo: ração, feno, serragem, suplemento,
// medicamento, vacina, vermífugo.
//
// É direito do proprietário trazer o insumo e não ser cobrado por ele.
// Este módulo é puro (sem React) para poder ser testado isolado — ele
// decide dinheiro, então erra caro.
//
// ── Duas mecânicas de consumo sobre o MESMO saldo ──────────────
//
// 1. POR REGISTRO (medicamento, vacina, vermífugo): cada uso lançado em
//    `registros` baixa do saldo, em ordem cronológica. Enquanto houver
//    saldo o uso é gratuito; o que passar do saldo É COBRADO. Ex.: ele
//    trouxe 100 mL de Flumax, foram usados 100 mL; o próximo uso entra
//    na fatura.
//
// 2. PERIÓDICO (nutrição do cavalo): o consumo é projetado pela dose
//    cadastrada no perfil nutricional — suplemento/ração pela dose diária
//    e insumo periódico (ex.: medicação dada todo dia, a cada N dias,
//    semanal ou quinzenal) pelas doses do calendário dele. Ao acabar, o
//    app NÃO volta a cobrar sozinho — apenas avisa, para o proprietário
//    repor. Se o haras decidir seguir com insumo próprio, desvincula-se o
//    cavalo do estoque, e aí sim volta a ser cobrado.
//
// O consumo periódico reduz o saldo disponível para os registros, já que
// sai do mesmo estoque físico.

export const hojeIso = () => new Date().toLocaleDateString('sv-SE');

export const somarDias = (iso, n) => {
  if (!iso) return null;
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d)) return null;
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('sv-SE');
};

export const diffDias = (a, b) => {
  if (!a || !b) return 0;
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
};

export const STATUS_META = {
  acabou:      { label: 'Acabou', bg: '#fee2e2', ink: '#991b1b', ordem: 0 },
  acabando:    { label: 'Acabando', bg: '#fef3c7', ink: '#92400e', ordem: 1 },
  sem_consumo: { label: 'Sem consumo', bg: '#e0e7ff', ink: '#3730a3', ordem: 2 },
  sem_entrega: { label: 'Sem entrega', bg: '#f3f4f6', ink: '#4b5563', ordem: 3 },
  ok:          { label: 'Em estoque', bg: '#dcfce7', ink: '#166534', ordem: 4 },
};

// Dias de antecedência do alerta de reposição (itens periódicos).
export const DIAS_ALERTA = 7;

const entregasOrdenadas = (stock) => [...(stock?.entregas || [])]
  .filter(e => e?.data && Number(e.qtd) > 0)
  .sort((a, b) => a.data.localeCompare(b.data));

// ── Calendário em dias inteiros ────────────────────────────────
// Contas de dose em número de dia (sem hora nem fuso), para não errar em
// horário de verão e para o laço dia a dia ser barato.
const _isoValido = (iso) => typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso);
const _dia = (iso) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};
// 0 = domingo, como Date.getDay() (o dia 0, 01/01/1970, foi uma quinta).
const _diaSemana = (n) => (((n + 4) % 7) + 7) % 7;

// Intervalo entre doses de um insumo periódico — mesma regra do
// faturamento (screens.jsx: calcDosesPeriodico).
export const intervaloPeriodico = (freq) => {
  if (freq === 'diario') return 1;
  if (freq === 'semanal') return 7;
  if (freq === 'quinzenal') return 14;
  if (typeof freq === 'string' && freq.startsWith('cada')) return parseInt(freq.slice(4), 10) || 7;
  return 7;
};

// Insumos periódicos (nutricao.periodicos) deste insumo nos cavalos
// vinculados ao estoque.
export function periodicosDoEstoque(stock, cavalos = []) {
  const out = [];
  for (const cid of (stock?.cavaloIds || [])) {
    const cav = cavalos.find(c => c.id === cid);
    for (const p of (cav?.nutricao?.periodicos || [])) {
      if (p?.insumoId === stock.insumoId && (Number(p.qtd) || 0) > 0) {
        out.push({ cavaloId: cid, periodico: p });
      }
    }
  }
  return out;
}

// Calendário de doses de um periódico. Respeita data de início/fim do
// item. `ancora` é o dia em que o ciclo começa quando o periódico não tem
// data de início (a primeira entrega do estoque); semanal e quinzenal
// caem no dia da semana escolhido, como no faturamento.
function calendarioPeriodico(p, ancora) {
  const passo = intervaloPeriodico(p.frequencia);
  const ini = _isoValido(p.dataInicio) ? _dia(p.dataInicio) : null;
  const fim = _isoValido(p.dataFim) ? _dia(p.dataFim) : null;
  const base = ini != null ? ini : ancora;
  let primeira = base;
  if (p.frequencia === 'semanal' || p.frequencia === 'quinzenal') {
    const ds = p.diaSemana;
    const temDia = ds !== null && ds !== undefined && ds !== '' && Number.isFinite(Number(ds));
    const alvo = temDia ? (((Number(ds) % 7) + 7) % 7) : _diaSemana(base);
    primeira = base + ((alvo - _diaSemana(base) + 7) % 7);
  }
  const vigente = (n) => (ini == null || n >= ini) && (fim == null || n <= fim);
  return {
    qtd: Number(p.qtd) || 0,
    passo,
    fim,
    vigente,
    temDose: (n) => n >= primeira && (n - primeira) % passo === 0 && vigente(n),
  };
}

// Doses nos dias [a, b) — b fica de fora.
function dosesNoIntervalo(cal, a, b) {
  let n = 0;
  for (let d = a; d < b; d++) if (cal.temDose(d)) n++;
  return n;
}

// Quantos dias o saldo ainda cobre, simulando dia a dia a partir de hoje
// (dieta + doses do calendário). Com só dieta dá o mesmo que
// floor(saldo / dose diária). null quando o consumo programado termina
// antes do saldo (ex.: tratamento com data de fim) ou passa de 10 anos.
const HORIZONTE_DIAS = 3650;
function diasAteAcabar(saldo, porDiaDieta, cals, hoje) {
  let resta = saldo;
  for (let i = 0; i < HORIZONTE_DIAS; i++) {
    const d = hoje + i;
    let gasto = porDiaDieta;
    for (const c of cals) if (c.temDose(d)) gasto += c.qtd;
    if (gasto > resta + 1e-9) return i;
    resta -= gasto;
    if (porDiaDieta <= 0 && cals.every(c => c.fim != null && d >= c.fim)) return null;
  }
  return null;
}

// Dose diária que sai deste estoque pela DIETA dos cavalos vinculados.
// Zero quando o insumo não está na dieta de nenhum deles — aí o estoque
// só é consumido por registros.
export function consumoDiarioDieta(stock, cavalos = []) {
  return (stock?.cavaloIds || []).reduce((soma, cid) => {
    const cav = cavalos.find(c => c.id === cid);
    const n = cav?.nutricao;
    if (!n) return soma;
    let dia = 0;
    for (const s of (n.suplementos || [])) {
      if (s.insumoId === stock.insumoId) dia += Number(s.qtdDia) || 0;
    }
    if (n.racaoId === stock.insumoId) {
      dia += (Number(n.racaoKgManha) || 0) + (Number(n.racaoKgTarde) || 0)
        + (n.comeAlmoco ? (Number(n.racaoKgAlmoco) || 0) : 0);
    }
    return soma + dia;
  }, 0);
}

// Registros de uso deste insumo nos cavalos vinculados, a partir da
// primeira entrega (uso anterior à entrega não pode ser coberto por ela).
export function registrosDoEstoque(stock, registros = []) {
  const primeira = entregasOrdenadas(stock)[0]?.data || null;
  if (!primeira) return [];
  const ids = new Set(stock?.cavaloIds || []);
  return (registros || [])
    .filter(r => r?.insumoId === stock.insumoId
      && ids.has(r.cavaloId)
      && r.data && r.data >= primeira
      && (Number(r.qtd) || 0) > 0)
    .sort((a, b) => (a.data || '').localeCompare(b.data || '') || String(a.id).localeCompare(String(b.id)));
}

// Quanto de cada registro o estoque cobre, em ordem cronológica.
// Devolve Map<registroId, qtdCoberta>. O que não for coberto é cobrado.
//
// O saldo para os registros já desconta o consumo da dieta e dos
// periódicos, porque sai do mesmo estoque físico.
export function coberturaDeRegistros(stock, cavalos = [], registros = [], hoje = hojeIso()) {
  const total = entregasOrdenadas(stock).reduce((s, e) => s + Number(e.qtd), 0);
  const pool = Math.max(0, total - consumoProjetadoDieta(stock, cavalos, hoje));
  const out = new Map();
  let restante = pool;
  for (const r of registrosDoEstoque(stock, registros)) {
    if (restante <= 0) break;
    const qtd = Number(r.qtd) || 0;
    const coberto = Math.min(restante, qtd);
    if (coberto > 0) out.set(r.id, coberto);
    restante -= coberto;
  }
  return out;
}

// Consumo projetado até `hoje` (hoje ainda não conta), separado em dieta
// e periódicos, limitado ao que foi entregue.
//   dieta: dose diária × dias desde a primeira entrega
//   periódicos: doses do calendário desde a primeira entrega
function projecaoNutricao(stock, cavalos = [], hoje = hojeIso()) {
  const entregas = entregasOrdenadas(stock);
  const primeira = entregas[0]?.data || null;
  const total = entregas.reduce((s, e) => s + Number(e.qtd), 0);
  const porDiaDieta = consumoDiarioDieta(stock, cavalos);
  if (!primeira || !_isoValido(hoje)) {
    return { entregas, primeira, total, porDiaDieta, cals: [], dieta: 0, periodicos: 0 };
  }
  const a = _dia(primeira);
  const h = _dia(hoje);
  const cals = periodicosDoEstoque(stock, cavalos)
    .map(({ periodico }) => calendarioPeriodico(periodico, a));
  const dias = Math.max(0, diffDias(primeira, hoje));
  const dieta = Math.min(total, porDiaDieta > 0 ? porDiaDieta * dias : 0);
  const brutoPer = cals.reduce((s, c) => s + c.qtd * dosesNoIntervalo(c, a, h), 0);
  const periodicos = Math.min(Math.max(0, total - dieta), brutoPer);
  return { entregas, primeira, total, porDiaDieta, cals, dieta, periodicos };
}

// Consumo da dieta e dos periódicos acumulado até `hoje`, limitado ao que
// foi entregue.
export function consumoProjetadoDieta(stock, cavalos = [], hoje = hojeIso()) {
  const p = projecaoNutricao(stock, cavalos, hoje);
  return p.dieta + p.periodicos;
}

// Estado completo de um estoque: saldo, as parcelas de consumo, previsão
// de término (só faz sentido com dieta ou periódico) e status.
//
// Limitação conhecida: o consumo da dieta é projetado com a dose de
// HOJE. Se cavalos entraram ou saíram do estoque no meio do período, o
// consumido histórico fica aproximado. O periódico segue o calendário e
// as datas de início/fim do item. O consumo por registro é exato,
// porque vem dos lançamentos reais.
export function calcEstoqueProp(stock, cavalos = [], registros = [], hoje = hojeIso()) {
  const proj = projecaoNutricao(stock, cavalos, hoje);
  const { entregas, primeira, porDiaDieta, cals } = proj;
  const totalEntregue = proj.total;
  const h = _isoValido(hoje) ? _dia(hoje) : null;
  // Consumo por dia para exibir: dieta + periódicos vigentes hoje (dose ÷
  // intervalo; no diário é a própria dose). Semanal etc. viram média.
  const vigentes = h == null ? [] : cals.filter(c => c.vigente(h));
  const porDia = porDiaDieta + vigentes.reduce((s, c) => s + c.qtd / c.passo, 0);

  const base = {
    totalEntregue, entregas, primeiraEntrega: primeira,
    consumoDia: porDia,
    consumoDiaMedio: vigentes.some(c => c.passo > 1),
  };

  if (!primeira || totalEntregue <= 0) {
    return {
      ...base, consumidoDieta: 0, consumidoPeriodico: 0, consumidoRegistros: 0, consumido: 0,
      saldo: 0, diasRestantes: null, dataTermino: null, status: 'sem_entrega',
    };
  }

  const consumidoDieta = proj.dieta;
  const consumidoPeriodico = proj.periodicos;
  const usados = registrosDoEstoque(stock, registros);
  const poolRegistros = Math.max(0, totalEntregue - consumidoDieta - consumidoPeriodico);
  const consumidoRegistros = Math.min(
    poolRegistros,
    usados.reduce((s, r) => s + (Number(r.qtd) || 0), 0),
  );

  const consumido = consumidoDieta + consumidoPeriodico + consumidoRegistros;
  const saldo = Math.max(0, totalEntregue - consumido);
  const parcelas = { consumidoDieta, consumidoPeriodico, consumidoRegistros, consumido, saldo };

  // Ainda há consumo programado de hoje em diante? Dieta, ou periódico que
  // não terminou (inclusive um que só começa depois).
  const programado = porDiaDieta > 0 || (h != null && cals.some(c => c.fim == null || c.fim >= h));
  if (!programado) {
    // Só consumo por registro: não há data de término previsível.
    return {
      ...base, ...parcelas,
      diasRestantes: null, dataTermino: null,
      status: saldo <= 0 ? 'acabou' : ((usados.length || consumidoPeriodico > 0) ? 'ok' : 'sem_consumo'),
    };
  }

  const diasRestantes = cals.length
    ? diasAteAcabar(saldo, porDiaDieta, cals, h)
    : Math.floor(saldo / porDiaDieta);
  return {
    ...base, ...parcelas,
    diasRestantes,
    dataTermino: diasRestantes == null ? null : somarDias(hoje, diasRestantes),
    status: saldo <= 0 ? 'acabou'
      : (diasRestantes != null && diasRestantes <= DIAS_ALERTA) ? 'acabando' : 'ok',
  };
}

// Cobertura de TODOS os estoques de uma vez, para o cálculo da fatura.
// Map<registroId, qtdCoberta>. Um registro só é coberto por um estoque
// (o primeiro que o cobrir), porque um insumo só tem um estoque por
// proprietário.
export function coberturaGeral(stocks = [], cavalos = [], registros = [], hoje = hojeIso()) {
  const out = new Map();
  for (const st of stocks) {
    if (st?.ativo === false) continue;
    for (const [regId, qtd] of coberturaDeRegistros(st, cavalos, registros, hoje)) {
      out.set(regId, (out.get(regId) || 0) + qtd);
    }
  }
  return out;
}

export function precisaReposicao(calc) {
  return calc?.status === 'acabou' || calc?.status === 'acabando';
}

// Para a fatura e o custo do haras: em cada cavalo vinculado a um estoque
// ativo, a lista dos insumos que o proprietário trouxe (`insumosDoDono`).
// O suplemento ou insumo periódico desse insumo na nutrição do cavalo não
// é cobrado dele (screens.jsx: calcPerfilMes) — mesma regra do flag
// antigo `fornecidoProp`, que vale desde o vínculo e não volta a cobrar
// quando o estoque acaba.
//
// Sai do próprio estoque, então não importa se o suplemento/periódico foi
// cadastrado antes ou depois dele. Anotado na origem (app.jsx), como a
// cobertura dos registros. Cavalos sem vínculo saem intactos.
export function anotarInsumosDoDono(cavalos = [], stocks = []) {
  const porCavalo = new Map();
  for (const st of (stocks || [])) {
    if (!st || st.ativo === false || !st.insumoId) continue;
    for (const cid of (st.cavaloIds || [])) {
      const lista = porCavalo.get(cid) || [];
      if (!lista.includes(st.insumoId)) lista.push(st.insumoId);
      porCavalo.set(cid, lista);
    }
  }
  if (!porCavalo.size) return cavalos;
  return cavalos.map(c => (porCavalo.has(c.id) ? { ...c, insumosDoDono: porCavalo.get(c.id) } : c));
}
