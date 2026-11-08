// suplementosProp.js — cálculo do estoque de suplemento entregue pelo
// proprietário. Módulo puro (sem React) pra poder ser testado isolado.
//
// Regra do negócio: o proprietário compra e entrega; o app organiza o
// consumo mas não cobra. Quando acaba, não volta a cobrar — só alerta.

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
  sem_consumo: { label: 'Sem dose na dieta', bg: '#e0e7ff', ink: '#3730a3', ordem: 2 },
  sem_entrega: { label: 'Sem entrega', bg: '#f3f4f6', ink: '#4b5563', ordem: 3 },
  ok:          { label: 'Em estoque', bg: '#dcfce7', ink: '#166534', ordem: 4 },
};

// Dias de antecedência para o alerta de reposição.
export const DIAS_ALERTA = 7;

// consumoDia é a soma do qtdDia dos cavalos vinculados que têm esse
// suplemento na dieta. Sem cavalo vinculado, ou sem dose, o saldo não
// anda e o status diz isso em vez de projetar uma data errada.
//
// Limitação conhecida: o consumido é projetado com o consumoDia de HOJE.
// Se cavalos entraram ou saíram do estoque no meio do período, o
// consumido histórico fica aproximado.
export function calcEstoqueProp(stock, cavalos = [], hoje = hojeIso()) {
  const entregas = [...(stock?.entregas || [])]
    .filter(e => e?.data && Number(e.qtd) > 0)
    .sort((a, b) => a.data.localeCompare(b.data));
  const totalEntregue = entregas.reduce((s, e) => s + Number(e.qtd), 0);
  const primeira = entregas[0]?.data || null;

  const consumoDia = (stock?.cavaloIds || []).reduce((soma, cid) => {
    const cav = cavalos.find(c => c.id === cid);
    const sup = (cav?.nutricao?.suplementos || []).find(s => s.insumoId === stock.insumoId);
    return soma + (Number(sup?.qtdDia) || 0);
  }, 0);

  const base = { totalEntregue, consumoDia, entregas, primeiraEntrega: primeira };

  if (!primeira || totalEntregue <= 0) {
    return { ...base, consumido: 0, saldo: 0, diasRestantes: null, dataTermino: null, status: 'sem_entrega' };
  }
  if (consumoDia <= 0) {
    return { ...base, consumido: 0, saldo: totalEntregue, diasRestantes: null, dataTermino: null, status: 'sem_consumo' };
  }

  const diasCorridos = Math.max(0, diffDias(primeira, hoje));
  const consumido = Math.min(totalEntregue, consumoDia * diasCorridos);
  const saldo = Math.max(0, totalEntregue - consumido);
  const diasRestantes = Math.floor(saldo / consumoDia);
  const dataTermino = somarDias(hoje, diasRestantes);
  const status = saldo <= 0 ? 'acabou' : diasRestantes <= DIAS_ALERTA ? 'acabando' : 'ok';
  return { ...base, consumido, saldo, diasRestantes, dataTermino, status };
}

export function precisaReposicao(calc) {
  return calc?.status === 'acabou' || calc?.status === 'acabando';
}
