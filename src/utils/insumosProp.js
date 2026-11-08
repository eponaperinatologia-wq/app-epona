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
// 2. PERIÓDICO (suplemento/ração na dieta): o consumo é projetado pela
//    dose diária. Ao acabar, o app NÃO volta a cobrar sozinho — apenas
//    avisa, para o proprietário repor. Se o haras decidir seguir com
//    insumo próprio, isso é cadastrado como uso periódico do insumo do
//    haras, e aí sim é cobrado.
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
// `poolInicial` já desconta o consumo da dieta, porque sai do mesmo
// estoque físico.
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

// Consumo da dieta acumulado até `hoje`, limitado ao que foi entregue.
export function consumoProjetadoDieta(stock, cavalos = [], hoje = hojeIso()) {
  const entregas = entregasOrdenadas(stock);
  const primeira = entregas[0]?.data || null;
  if (!primeira) return 0;
  const porDia = consumoDiarioDieta(stock, cavalos);
  if (porDia <= 0) return 0;
  const total = entregas.reduce((s, e) => s + Number(e.qtd), 0);
  const dias = Math.max(0, diffDias(primeira, hoje));
  return Math.min(total, porDia * dias);
}

// Estado completo de um estoque: saldo, as duas parcelas de consumo,
// previsão de término (só faz sentido com dieta) e status.
//
// Limitação conhecida: o consumo da dieta é projetado com a dose de
// HOJE. Se cavalos entraram ou saíram do estoque no meio do período, o
// consumido histórico fica aproximado. O consumo por registro é exato,
// porque vem dos lançamentos reais.
export function calcEstoqueProp(stock, cavalos = [], registros = [], hoje = hojeIso()) {
  const entregas = entregasOrdenadas(stock);
  const totalEntregue = entregas.reduce((s, e) => s + Number(e.qtd), 0);
  const primeira = entregas[0]?.data || null;
  const porDia = consumoDiarioDieta(stock, cavalos);

  const base = {
    totalEntregue, entregas, primeiraEntrega: primeira,
    consumoDia: porDia,
  };

  if (!primeira || totalEntregue <= 0) {
    return {
      ...base, consumidoDieta: 0, consumidoRegistros: 0, consumido: 0,
      saldo: 0, diasRestantes: null, dataTermino: null, status: 'sem_entrega',
    };
  }

  const consumidoDieta = consumoProjetadoDieta(stock, cavalos, hoje);
  const usados = registrosDoEstoque(stock, registros);
  const poolRegistros = Math.max(0, totalEntregue - consumidoDieta);
  const consumidoRegistros = Math.min(
    poolRegistros,
    usados.reduce((s, r) => s + (Number(r.qtd) || 0), 0),
  );

  const consumido = consumidoDieta + consumidoRegistros;
  const saldo = Math.max(0, totalEntregue - consumido);

  if (porDia <= 0) {
    // Só consumo por registro: não há data de término previsível.
    return {
      ...base, consumidoDieta, consumidoRegistros, consumido, saldo,
      diasRestantes: null, dataTermino: null,
      status: saldo <= 0 ? 'acabou' : (usados.length ? 'ok' : 'sem_consumo'),
    };
  }

  const diasRestantes = Math.floor(saldo / porDia);
  return {
    ...base, consumidoDieta, consumidoRegistros, consumido, saldo,
    diasRestantes, dataTermino: somarDias(hoje, diasRestantes),
    status: saldo <= 0 ? 'acabou' : diasRestantes <= DIAS_ALERTA ? 'acabando' : 'ok',
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
