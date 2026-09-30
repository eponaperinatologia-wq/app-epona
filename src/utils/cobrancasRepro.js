// Cobranças da reprodução e do parto no HARAS.
//
// O caderno reprodutivo (mesma UI do Epona Repro Team) grava em
// reproducao_registros, que a fatura do haras NÃO lê. Para cobrar, cada
// registro do caderno gera:
//   - 1 registro de insumo (tabela registros) por insumo usado;
//   - 1 procedimento com a taxa do haras para IA e Coleta de Embrião (CE).
// Os ids carregam o id do registro do caderno como prefixo, para que editar
// ou excluir o registro remova as cobranças anteriores (sem duplicar).

// Taxas cobradas pelo haras por procedimento (fora os insumos).
export const TAXA_REPRO_HARAS = {
  inseminacao_artificial: { servicoId: '__repro_haras_ia__', nome: 'Inseminação artificial', valor: 250 },
  transferencia_embriao:  { servicoId: '__repro_haras_ce__', nome: 'Coleta de embrião', valor: 250 },
};

// Nome dos serviços "internos" (sem cadastro no catálogo) para a fatura.
export const NOMES_SERVICOS_INTERNOS = {
  __repro_haras_ia__: 'Inseminação artificial',
  __repro_haras_ce__: 'Coleta de embrião',
  __exames_lab__: 'Exames laboratoriais',
};

export const prefixoInsumosRepro = (regId) => `rrh_${regId}_`;
export const prefixoProcRepro = (regId) => `rrhp_${regId}_`;

// Monta as cobranças de um registro do caderno (haras). `sufixo` diferencia
// lançamentos sucessivos do mesmo registro (edições); no lançamento de
// pendências usa-se um sufixo fixo para ser idempotente.
export function montarCobrancasRepro(reg, sufixo, usuario = '') {
  const registros = [];
  const procedimentos = [];
  if (!reg?.id || !reg.eguaId || !reg.data) return { registros, procedimentos };
  const hora = new Date().toTimeString().slice(0, 5);
  (reg.insumosUsados || [])
    .filter(u => u?.insumoId && Number(u.qtd) > 0)
    .forEach((u, i) => {
      registros.push({
        id: `${prefixoInsumosRepro(reg.id)}${sufixo}_${i}`,
        cavaloId: reg.eguaId, insumoId: u.insumoId, qtd: Number(u.qtd),
        hora, usuario: reg.autor || usuario, isAuto: false, data: reg.data,
      });
    });
  const taxa = TAXA_REPRO_HARAS[reg.tipo];
  if (taxa) {
    procedimentos.push({
      id: `${prefixoProcRepro(reg.id)}${sufixo}`,
      cavaloId: reg.eguaId, servicoId: taxa.servicoId,
      valorServico: taxa.valor, total: taxa.valor,
      descartaveisObrigatorios: [], insumosAdicionais: [],
      motoboy: { ativo: false, valor: 0, nome: '' },
      laboratorio: '', tubosSelecionados: [], examesSelecionados: [],
      hora, data: reg.data, nota: `Reprodução: ${taxa.nome}`,
    });
  }
  return { registros, procedimentos };
}

// Cobranças que faltam lançar a partir de `desde` (YYYY-MM-DD):
//  - registros do caderno do haras sem nenhuma cobrança lançada;
//  - insumos de parto sem registroId (antes eram só anotados no parto).
// Ids fixos (sufixo "bf") → rodar de novo não duplica.
export function cobrancasPendentes({ registrosReproducao = [], partos = [], registros = [], procedimentos = [], idsCavalosRepro = new Set(), desde }) {
  const novosRegistros = [];
  const novosProcedimentos = [];
  const partosPatch = [];
  const idsReg = new Set(registros.map(r => String(r.id)));
  const idsProc = new Set(procedimentos.map(p => String(p.id)));
  const temPrefixo = (ids, pref) => { for (const id of ids) if (id.startsWith(pref)) return true; return false; };

  for (const reg of registrosReproducao) {
    if ((reg.workspaceId || 'haras') === 'repro') continue;
    if (idsCavalosRepro.has(reg.eguaId)) continue;
    if (!reg.data || reg.data < desde) continue;
    const { registros: rs, procedimentos: ps } = montarCobrancasRepro(reg, 'bf');
    if (rs.length && !temPrefixo(idsReg, prefixoInsumosRepro(reg.id))) novosRegistros.push(...rs);
    if (ps.length && !temPrefixo(idsProc, prefixoProcRepro(reg.id))) novosProcedimentos.push(...ps);
  }

  for (const pt of partos) {
    if (!pt?.data || pt.data < desde || !pt.eguaId) continue;
    if (idsCavalosRepro.has(pt.eguaId)) continue;
    let mudou = false;
    const itens = (pt.insumosUsados || []).map(u => {
      if (u.registroId || !u.insumoId || !(Number(u.qtd) > 0)) return u;
      const registroId = `r_parto_bf_${pt.id}_${u.id}`;
      if (!idsReg.has(registroId)) {
        novosRegistros.push({
          id: registroId, cavaloId: pt.eguaId, insumoId: u.insumoId, qtd: Number(u.qtd),
          hora: pt.hora || '', usuario: 'Parto', isAuto: false, data: pt.data,
        });
      }
      mudou = true;
      return { ...u, registroId };
    });
    if (mudou) partosPatch.push({ id: pt.id, insumosUsados: itens });
  }
  return { novosRegistros, novosProcedimentos, partosPatch };
}
