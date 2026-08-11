// ─────────────────────────────────────────────────────────────
// Cálculo de fatura mensal do Epona Repro Team
//
// Componentes:
//   1. Visitas (km) — cada (vet, data, local) do mês gera 1 visita.
//      O valor cadastrado em vet_km_por_local é rateado entre o número
//      de PROPRIETÁRIOS distintos atendidos naquele dia+local.
//   2. Insumos — vêm dos registros do caderno via `insumosUsados`
//      ({insumoId, qtd}). Cobrados por valorVenda × qtd.
//   3. Procedimentos IA/TE — 1 linha por registro, com o preço do
//      serviço do catálogo repro (por nome: "IA" ou "TE") como
//      fallback → serviço com nome contendo "insemin"/"transferência".
//   4. Serviços avulsos — registros do tipo 'servico_avulso' com
//      valor cobrado no próprio registro.
//   5. Resultado reprodutivo — cobrado no DG30+. Valor vem de
//      proprietario.valorResultadoRepro.
//
// A função retorna estrutura suficiente pra renderizar tela + PDF +
// alimentar a divisão da equipe (com metadata de vet responsável e
// insumos/procs individuais).
// ─────────────────────────────────────────────────────────────

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Retorna os OBJETOS dos serviços "IA" e "TE" cadastrados (workspace
// repro tem prioridade sobre haras). Fonte da verdade pra preço e pra
// lista de descartáveis obrigatórios.
export function servicosPadrao(servicos) {
  const svRepro = servicos.filter(s => (s.workspaceId || 'haras') === 'repro');
  const pool = svRepro.length ? svRepro : servicos;
  const isIa = (s) => /insemin/.test(norm(s.nome || ''));
  const isTe = (s) => /coleta|transfer|te\b|ce\b|embria/.test(norm(s.nome || ''));
  return {
    ia: pool.find(isIa) || null,
    te: pool.find(isTe) || null,
  };
}
export function precosPadraoServicos(servicos) {
  const p = servicosPadrao(servicos);
  return {
    ia: Number(p.ia?.valor || 0),
    te: Number(p.te?.valor || 0),
  };
}

function isMes(dataIso, ref) {
  if (!dataIso) return false;
  const [y, m] = dataIso.split('-');
  return Number(y) === ref.ano && Number(m) === ref.mes;
}

// Rastreio da cadeia IA → TE → DG30 pra dividir o resultado
// reprodutivo entre vet e Epona (50/50).
// - Prioridade 1: DG30.dados.iaOrigemId (herdado do TE se preenchido)
// - Prioridade 2: TE mais recente da mesma égua antes do DG30 →
//   te.dados.iaOrigemId
// - Prioridade 3: TE mais recente da mesma égua antes do DG30 (heurística)
//   → última IA da égua antes daquela TE
// Retorna { iaId, vetId } ou null.
export function rastrearIaDoDg(dg, registros) {
  if (!dg) return null;
  // Se DG30 marca dg30 num TE, ele NÃO é um registro dg30 avulso — é o
  // próprio TE com dados.dg30. Nesse caso, o "dg" já é o TE.
  // Se DG30 é um registro tipo=diagnostico_gestacao, temos:
  //   dg.data | dg.eguaId | (opcional) dg.dados.teOrigemId
  const eguaId = dg.eguaId;
  const dataDg = dg.data;
  if (!eguaId) return null;

  // Se já tem iaOrigemId direto
  if (dg.dados?.iaOrigemId) {
    const ia = registros.find(r => r.id === dg.dados.iaOrigemId);
    return ia ? { iaId: ia.id, vetId: ia.vetId } : null;
  }
  // Se tem teOrigemId, busca a TE e usa ia dela
  const teFromId = dg.dados?.teOrigemId
    ? registros.find(r => r.id === dg.dados.teOrigemId)
    : null;
  if (teFromId?.dados?.iaOrigemId) {
    const ia = registros.find(r => r.id === teFromId.dados.iaOrigemId);
    if (ia) return { iaId: ia.id, vetId: ia.vetId };
  }
  // Heurística: TE mais recente da égua antes/igual do DG
  const tes = registros
    .filter(r => r.tipo === 'transferencia_embriao' && r.eguaId === eguaId
      && (r.dados?.resultado === 'positivo') && (r.data || '') <= (dataDg || ''))
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const te = tes[0];
  if (te?.dados?.iaOrigemId) {
    const ia = registros.find(r => r.id === te.dados.iaOrigemId);
    if (ia) return { iaId: ia.id, vetId: ia.vetId };
  }
  // Última IA da égua com destino=transferencia antes da TE
  const refData = te?.data || dataDg;
  const ias = registros
    .filter(r => r.tipo === 'inseminacao_artificial' && r.eguaId === eguaId
      && (r.dados?.destino === 'transferencia') && (r.data || '') <= (refData || ''))
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const ia = ias[0];
  if (ia) return { iaId: ia.id, vetId: ia.vetId };

  // Último fallback: IA prenhez própria (fluxo sem TE)
  const iasPrenhez = registros
    .filter(r => r.tipo === 'inseminacao_artificial' && r.eguaId === eguaId
      && (r.dados?.destino === 'prenhez') && (r.data || '') <= (dataDg || ''))
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  if (iasPrenhez[0]) return { iaId: iasPrenhez[0].id, vetId: iasPrenhez[0].vetId };

  return null;
}

// dg30Positivos: retorna lista dos DG30+ do mês (independente de estar
// num registro tipo=diagnostico_gestacao ou embutido no TE via
// dados.dg30 = 'positivo'). Cada item traz { registroOrigem, data,
// eguaId, iaOrigem }.
export function dg30PositivosDoMes(registros, ref) {
  const out = [];
  for (const r of registros) {
    if ((r.workspaceId || 'haras') !== 'repro') continue;
    // 1) Registro dedicado de DG30
    if (r.tipo === 'diagnostico_gestacao' && r.dados?.resultado === 'positivo'
        && r.dados?.tipoDg === 'dg30' && isMes(r.data, ref)) {
      out.push({ registroOrigem: r, data: r.data, eguaId: r.eguaId, ia: rastrearIaDoDg(r, registros) });
      continue;
    }
    // 2) DG30 marcado dentro do detalhe do TE (r.dados.dg30 = 'positivo',
    //    r.dados.dg30_data = 'YYYY-MM-DD'). Nesse caso a data é a do dg30.
    if (r.dados?.dg30 === 'positivo' && r.dados?.dg30_data && isMes(r.dados.dg30_data, ref)) {
      out.push({
        registroOrigem: r, data: r.dados.dg30_data, eguaId: r.eguaId,
        ia: rastrearIaDoDg({ eguaId: r.eguaId, data: r.dados.dg30_data, dados: r.dados }, registros),
      });
    }
  }
  return out;
}

// Retorna nova lista de insumos com descartáveis agrupados numa
// única linha "Descartáveis". Usada nas faturas admin/repro.
// Preserva as linhas originais em `.detalhe` pra debug / re-expansão.
export function agruparDescartaveisLinhas(insumosLinhas, insumosCatalogo = []) {
  const isDesc = (l) => {
    const ins = insumosCatalogo.find(i => i.id === l.insumoId);
    return ins && ins.categoria === 'descartavel';
  };
  const descartaveis = insumosLinhas.filter(isDesc);
  const outros = insumosLinhas.filter(l => !isDesc(l));
  if (descartaveis.length === 0) return outros;
  const totalDesc = descartaveis.reduce((s, l) => s + l.valor, 0);
  const linhaAgg = {
    data: descartaveis[0].data,
    registroId: null,
    insumoId: '__descartaveis__',
    nome: 'Descartáveis',
    qtd: descartaveis.reduce((s, l) => s + (Number(l.qtd) || 0), 0),
    unidade: 'itens',
    unitario: 0,
    valor: totalDesc,
    agrupado: true,
    detalhe: descartaveis,
  };
  return [linhaAgg, ...outros];
}

export function calcFaturaRepro(propId, ref, deps, opts = {}) {
  const {
    registros = [], cavalos = [], proprietarios = [],
    servicos = [], insumos = [], vetKmLocais = [], locais = [],
  } = deps;
  const { agruparDescartaveis = false } = opts;

  const prop = proprietarios.find(p => p.id === propId);
  const cavalosProp = cavalos.filter(c =>
    ((c.proprietarioIds || []).includes(propId) || c.proprietarioId === propId)
    && (c.workspaceId || 'haras') === 'repro',
  );
  const cavalosIds = new Set(cavalosProp.map(c => c.id));

  const regsRepro = registros.filter(r => (r.workspaceId || 'haras') === 'repro');
  const regsMesProp = regsRepro.filter(r => cavalosIds.has(r.eguaId) && isMes(r.data, ref));

  const precos = precosPadraoServicos(servicos);

  // ── 1) Visitas (rateio de km por proprietários distintos no
  //       mesmo dia+local do mesmo vet)
  const visitasMap = new Map(); // key: `${vetId}|${data}|${localId}` → { vetId, data, localId, propriedades: Set, cavalosDoProp: Set }
  for (const r of regsRepro) {
    if (!r.vetId || !r.localId || !r.data) continue;
    if (!isMes(r.data, ref)) continue;
    const cav = cavalos.find(c => c.id === r.eguaId);
    if (!cav) continue;
    const propsDoCav = (cav.proprietarioIds && cav.proprietarioIds.length > 0)
      ? cav.proprietarioIds
      : (cav.proprietarioId ? [cav.proprietarioId] : []);
    const key = `${r.vetId}|${r.data}|${r.localId}`;
    if (!visitasMap.has(key)) {
      visitasMap.set(key, {
        vetId: r.vetId, data: r.data, localId: r.localId,
        propriedades: new Set(),
        temPropAtual: false,
      });
    }
    const v = visitasMap.get(key);
    propsDoCav.forEach(pid => v.propriedades.add(pid));
    if (propsDoCav.includes(propId)) v.temPropAtual = true;
  }
  const visitasLinhas = [];
  for (const v of visitasMap.values()) {
    if (!v.temPropAtual) continue;
    const km = vetKmLocais.find(k => k.vetId === v.vetId && k.localId === v.localId);
    if (!km) continue;
    const valorBase = Number(km.valor) || 0;
    const nProps = v.propriedades.size || 1;
    const rateado = valorBase / nProps;
    const local = locais.find(l => l.id === v.localId);
    visitasLinhas.push({
      data: v.data, vetId: v.vetId, localId: v.localId,
      localNome: local?.nome || '—',
      valorBase, nProps, valor: rateado,
    });
  }
  visitasLinhas.sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  const visitasTotal = visitasLinhas.reduce((s, l) => s + l.valor, 0);

  // ── 2) Insumos (por registro do proprietário no mês)
  const insumosLinhas = [];
  for (const r of regsMesProp) {
    for (const u of (r.insumosUsados || [])) {
      const ins = insumos.find(i => i.id === u.insumoId);
      if (!ins) continue;
      const qtd = Number(u.qtd) || 0;
      const subtotal = (Number(ins.valorVenda) || 0) * qtd;
      insumosLinhas.push({
        data: r.data, registroId: r.id, insumoId: ins.id, nome: ins.nome,
        qtd, unidade: ins.unidade || 'un', unitario: Number(ins.valorVenda) || 0, valor: subtotal,
      });
    }
  }
  const insumosTotal = insumosLinhas.reduce((s, l) => s + l.valor, 0);

  // ── 3) Procedimentos IA/TE (do mês, proprietário atual)
  const procedimentosLinhas = [];
  for (const r of regsMesProp) {
    if (r.tipo === 'inseminacao_artificial') {
      procedimentosLinhas.push({
        data: r.data, registroId: r.id, tipo: 'IA', vetId: r.vetId,
        descricao: `Inseminação Artificial${r.dados?.garanhao ? ' — ' + r.dados.garanhao : ''}`,
        valor: precos.ia,
      });
    } else if (r.tipo === 'transferencia_embriao') {
      procedimentosLinhas.push({
        data: r.data, registroId: r.id, tipo: 'CE', vetId: r.vetId,
        descricao: 'Coleta de Embrião',
        valor: precos.te,
      });
    }
  }
  const procedimentosTotal = procedimentosLinhas.reduce((s, l) => s + l.valor, 0);

  // ── 4) Serviços avulsos + Tratamento Uterino (do mês, propr. atual)
  const avulsosLinhas = [];
  // Matchers pra pegar preço dos serviços de Tratamento Uterino do catálogo
  const svcTratamento = servicos.find(s => /tratamento.*uter/i.test(norm(s.nome || '')));
  const svcOzonio = servicos.find(s => /ozonio/i.test(norm(s.nome || '')));
  const svcPrp = servicos.find(s => /(prp).*(intra|uter)/i.test(norm(s.nome || '')));

  for (const r of regsMesProp) {
    if (r.tipo === 'servico_avulso') {
      const sv = servicos.find(s => s.id === r.dados?.servicoId);
      const valor = Number(r.dados?.valorCobrado) || Number(sv?.valor) || 0;
      avulsosLinhas.push({
        data: r.data, registroId: r.id, vetId: r.vetId, servicoId: r.dados?.servicoId || null,
        descricao: sv?.nome || 'Serviço avulso', valor,
      });
      continue;
    }
    if (r.tipo === 'tratamento_uterino') {
      // Serviço base
      if (svcTratamento) {
        avulsosLinhas.push({
          data: r.data, registroId: r.id, vetId: r.vetId, servicoId: svcTratamento.id,
          descricao: svcTratamento.nome, valor: Number(svcTratamento.valor) || 0,
        });
      }
      // Serviços adicionais marcados
      if (r.dados?.tu?.lavagem?.ozonio && svcOzonio) {
        avulsosLinhas.push({
          data: r.data, registroId: r.id, vetId: r.vetId, servicoId: svcOzonio.id,
          descricao: svcOzonio.nome, valor: Number(svcOzonio.valor) || 0,
        });
      }
      if (r.dados?.tu?.infusao?.prp && svcPrp) {
        avulsosLinhas.push({
          data: r.data, registroId: r.id, vetId: r.vetId, servicoId: svcPrp.id,
          descricao: svcPrp.nome, valor: Number(svcPrp.valor) || 0,
        });
      }
    }
    if (r.tipo === 'diagnostico_avulso') {
      const svcBio = servicos.find(s => /bi[oó]psia.*endometr/i.test(norm(s.nome || '')));
      const svcCul = servicos.find(s => /cultura.*antibiograma/i.test(norm(s.nome || '')));
      if (r.dados?.dx?.biopsia && svcBio) {
        avulsosLinhas.push({
          data: r.data, registroId: r.id, vetId: r.vetId, servicoId: svcBio.id,
          descricao: svcBio.nome, valor: Number(svcBio.valor) || 0,
        });
      }
      if (r.dados?.dx?.cultura && svcCul) {
        avulsosLinhas.push({
          data: r.data, registroId: r.id, vetId: r.vetId, servicoId: svcCul.id,
          descricao: svcCul.nome, valor: Number(svcCul.valor) || 0,
        });
      }
    }
  }
  const avulsosTotal = avulsosLinhas.reduce((s, l) => s + l.valor, 0);

  // ── 5) Resultado reprodutivo (DG30+ do mês, cavalos do proprietário)
  const resultadosLinhas = [];
  const dg30Mes = dg30PositivosDoMes(regsRepro, ref);
  for (const dg of dg30Mes) {
    if (!cavalosIds.has(dg.eguaId)) continue;
    const cav = cavalos.find(c => c.id === dg.eguaId);
    const valor = Number(prop?.valorResultadoRepro) || 0;
    if (valor <= 0) continue;
    resultadosLinhas.push({
      data: dg.data, eguaId: dg.eguaId, eguaNome: cav?.nome || 'égua',
      iaId: dg.ia?.iaId || null, vetIdInsem: dg.ia?.vetId || null,
      valor,
    });
  }
  const resultadosTotal = resultadosLinhas.reduce((s, l) => s + l.valor, 0);

  const total = visitasTotal + insumosTotal + procedimentosTotal + avulsosTotal + resultadosTotal;

  const insumosLinhasFinais = agruparDescartaveis
    ? agruparDescartaveisLinhas(insumosLinhas, insumos)
    : insumosLinhas;

  return {
    proprietario: prop,
    ref,
    visitasLinhas, visitasTotal,
    insumosLinhas: insumosLinhasFinais, insumosTotal,
    procedimentosLinhas, procedimentosTotal,
    avulsosLinhas, avulsosTotal,
    resultadosLinhas, resultadosTotal,
    total,
  };
}

// ─────────────────────────────────────────────────────────────
// Divisão de equipe — dado uma fatura, gera o split entre Epona e
// cada vet. Regras (pedidas pelo produto):
//   Insumos       → 100% Epona (compra o material)
//   Km/Visita     → 100% vet que prestou
//   IA / TE       → 70% vet, 30% Epona
//   Resultado     → 50% vet inseminou, 50% Epona
//   Serviço avulso→ 100% vet que fez
// Retorna: { epona: n, porVet: { [vetId]: n } }
// ─────────────────────────────────────────────────────────────
export function dividirFatura(fatura) {
  const acc = { epona: 0, porVet: {} };
  const addVet = (vetId, v) => {
    if (!vetId || !v) return;
    acc.porVet[vetId] = (acc.porVet[vetId] || 0) + v;
  };
  // Insumos → Epona
  acc.epona += fatura.insumosTotal;
  // Visitas → vet
  for (const l of fatura.visitasLinhas) addVet(l.vetId, l.valor);
  // Procedimentos IA/TE → 70/30
  for (const l of fatura.procedimentosLinhas) {
    addVet(l.vetId, l.valor * 0.7);
    acc.epona += l.valor * 0.3;
  }
  // Avulsos → vet
  for (const l of fatura.avulsosLinhas) addVet(l.vetId, l.valor);
  // Resultado → 50/50 (vet inseminou / Epona)
  for (const l of fatura.resultadosLinhas) {
    addVet(l.vetIdInsem, l.valor * 0.5);
    acc.epona += l.valor * 0.5;
  }
  return acc;
}
