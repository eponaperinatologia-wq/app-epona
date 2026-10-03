// pdfVisitaClinica.js — PDF estilo cupom (estreito, sem fim) da
// visita clínica de assessoria. Mesma paleta do PDF de fatura
// (cream + roxo da repro) com tudo que foi feito e sugerido na
// visita, organizado em seções: cabeçalho, observações, anotações
// por animal, vacinas/vermífugos/OPGs/medições do período, gestantes.

import { jsPDF } from 'jspdf';

const fmtData = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y.slice(2)}`;
};
const BRL = (v) => 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',');

export function gerarPdfVisitaClinica({
  visita, contrato, nomeHaras,
  empresa = {},
  vetsExternos = [],
  cavalos = [],
  anotacoesClinicas = [],
  vacinacoesAnimais = [], protocolosVacinacao = [],
  vermifugacoesAnimais = [], protocolosVermifugacao = [],
  opgs = [],
  medicoes = [],
}) {
  const W = 80;          // largura do cupom em mm (~ cupom térmico)
  const L = 5;           // margem esquerda
  const R = W - 5;       // margem direita
  const contentW = R - L;

  // Paleta (igual pdfFaturaRepro)
  const INK = [42, 40, 32];
  const INK2 = [85, 75, 50];
  const INK3 = [141, 134, 117];
  const LINE = [220, 210, 195];
  const ROXO = [124, 45, 140];
  const BG_SOFT = [245, 232, 255];

  const setColor = (doc, fn, rgb) => fn.call(doc, rgb[0], rgb[1], rgb[2]);
  const safe = (s) => String(s ?? '');

  // Período da visita: dia da visita ± 7 dias pra pegar registros do entorno
  const dataVisita = visita.data;
  const janelaIni = addDiasStr(dataVisita, -7);
  const janelaFim = addDiasStr(dataVisita, 1);
  const idsHaras = new Set(cavalos.map(c => c.id));
  const cavNome = (id) => (cavalos.find(c => c.id === id)?.nome) || '—';
  const vetNome = (id) => (vetsExternos.find(v => v.id === id)?.nome) || '—';
  const protoVacNome = (id) => (protocolosVacinacao.find(p => p.id === id)?.nome) || '—';
  const protoVermNome = (id) => (protocolosVermifugacao.find(p => p.id === id)?.nome) || '—';

  // Anotações da visita (vinculadas via visitaClinicaId)
  const anotacoes = anotacoesClinicas
    .filter(a => a.visitaClinicaId === visita.id)
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  // Vacinas feitas no período (ou vinculadas à visita)
  const vacFeitas = vacinacoesAnimais
    .filter(v => v.feito && idsHaras.has(v.cavaloId))
    .filter(v => v.visitaClinicaId === visita.id
      || ((v.feitoEm || '').slice(0, 10) >= janelaIni && (v.feitoEm || '').slice(0, 10) <= janelaFim)
      || ((v.dataPrevista || '') >= janelaIni && (v.dataPrevista || '') <= janelaFim));

  // Vermífugos no período
  const vermFeitos = vermifugacoesAnimais
    .filter(v => idsHaras.has(v.cavaloId))
    .filter(v => v.visitaClinicaId === visita.id
      || ((v.dataRealizacao || '') >= janelaIni && (v.dataRealizacao || '') <= janelaFim));

  // OPGs no período
  const opgsPeriodo = opgs
    .filter(o => idsHaras.has(o.cavaloId))
    .filter(o => o.visitaClinicaId === visita.id
      || ((o.dataColeta || '') >= janelaIni && (o.dataColeta || '') <= janelaFim));

  // Medições no período
  const medicoesPeriodo = medicoes
    .filter(m => idsHaras.has(m.cavaloId))
    .filter(m => m.visitaClinicaId === visita.id
      || ((m.dataRegistro || '') >= janelaIni && (m.dataRegistro || '') <= janelaFim));

  // Gestantes do haras (snapshot)
  const gestantes = cavalos.filter(c =>
    c.categoria === 'Gestante' || (c.categorias || []).includes('Gestante') || c.gestacao?.dataCobricao,
  );

  function layout(doc) {
    let y = 6;

    // ── Header ─────────────────────────────────
    setColor(doc, doc.setFillColor, ROXO);
    doc.roundedRect(L, y, contentW, 14, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(safe(empresa.nome || 'Epona Repro Team'), L + 3, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Visita Clínica', L + 3, y + 11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(fmtData(dataVisita), R - 2, y + 6, { align: 'right' });
    y += 18;

    // ── Haras + info visita ────────────────────
    setColor(doc, doc.setTextColor, INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(safe(nomeHaras || 'Haras'), L, y);
    y += 4.5;

    // Vets participantes
    setColor(doc, doc.setTextColor, INK3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const vetsPart = (visita.vetsParticipantes || []).map(vetNome).join(', ') || '—';
    const vetsWrap = doc.splitTextToSize(`Vets: ${vetsPart}`, contentW);
    vetsWrap.forEach(l => { doc.text(l, L, y); y += 3; });

    if (visita.valorCobrado) {
      doc.text(`Valor cobrado: ${BRL(visita.valorCobrado)}`, L, y);
      y += 3;
    }
    y += 2;

    // ── Observações gerais ─────────────────────
    if (visita.observacoes) {
      y = sectionHeader(doc, y, 'OBSERVAÇÕES DA VISITA');
      setColor(doc, doc.setTextColor, INK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const obsWrap = doc.splitTextToSize(safe(visita.observacoes), contentW);
      obsWrap.forEach(l => { doc.text(l, L, y); y += 3.3; });
      y += 2;
    }

    // ── Anotações clínicas por animal ──────────
    if (anotacoes.length > 0) {
      y = sectionHeader(doc, y, `ANOTAÇÕES CLÍNICAS · ${anotacoes.length}`);
      anotacoes.forEach(a => {
        setColor(doc, doc.setFillColor, BG_SOFT);
        doc.rect(L, y - 2, contentW, 0.3, 'F');
        setColor(doc, doc.setTextColor, ROXO);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(`${cavNome(a.cavaloId)} · ${a.tipo || ''}`, L, y + 1);
        y += 3.5;

        setColor(doc, doc.setTextColor, INK);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(safe(a.titulo), L, y);
        y += 3.5;

        if (a.descricao) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          const desc = doc.splitTextToSize(safe(a.descricao), contentW);
          desc.forEach(l => { doc.text(l, L, y); y += 3; });
        }
        y += 2;
      });
    }

    // ── Vacinas aplicadas ──────────────────────
    if (vacFeitas.length > 0) {
      y = sectionHeader(doc, y, `VACINAS APLICADAS · ${vacFeitas.length}`);
      vacFeitas.forEach(v => {
        y = linhaItem(doc, y,
          `${cavNome(v.cavaloId)} · ${protoVacNome(v.protocoloId)}`,
          fmtData(v.feitoEm || v.dataPrevista),
        );
      });
      y += 2;
    }

    // ── Vermífugos aplicados ───────────────────
    if (vermFeitos.length > 0) {
      y = sectionHeader(doc, y, `VERMÍFUGOS · ${vermFeitos.length}`);
      vermFeitos.forEach(v => {
        y = linhaItem(doc, y,
          `${cavNome(v.cavaloId)} · ${v.produto || protoVermNome(v.protocoloId)}`,
          fmtData(v.dataRealizacao),
        );
      });
      y += 2;
    }

    // ── OPGs ───────────────────────────────────
    if (opgsPeriodo.length > 0) {
      y = sectionHeader(doc, y, `OPG · ${opgsPeriodo.length}`);
      opgsPeriodo.forEach(o => {
        const result = Array.isArray(o.resultado) && o.resultado.length > 0
          ? o.resultado.map(r => `${r.nome || r.parasita || ''} ${r.contagem || ''}`).filter(Boolean).join('; ')
          : '';
        y = linhaItem(doc, y,
          `${cavNome(o.cavaloId)}${result ? ' · ' + result : ''}`,
          fmtData(o.dataColeta),
        );
      });
      y += 2;
    }

    // ── Medições (desenvolvimento) ─────────────
    if (medicoesPeriodo.length > 0) {
      y = sectionHeader(doc, y, `DESENVOLVIMENTO · ${medicoesPeriodo.length} medição${medicoesPeriodo.length !== 1 ? 'ões' : ''}`);
      medicoesPeriodo.forEach(m => {
        const partes = [];
        if (m.peso) partes.push(`${m.peso}kg`);
        if (m.alturaCernelha) partes.push(`alt ${m.alturaCernelha}cm`);
        if (m.perimetroToracico) partes.push(`per.tor ${m.perimetroToracico}cm`);
        y = linhaItem(doc, y,
          `${cavNome(m.cavaloId)}${partes.length ? ' · ' + partes.join(', ') : ''}`,
          fmtData(m.dataRegistro),
        );
      });
      y += 2;
    }

    // ── Gestantes do haras (snapshot do estado) ──
    if (gestantes.length > 0) {
      y = sectionHeader(doc, y, `GESTANTES NO HARAS · ${gestantes.length}`);
      gestantes.forEach(g => {
        let info = g.nome;
        if (g.gestacao?.dataCobricao) {
          const semanas = Math.floor(
            (new Date(dataVisita + 'T00:00:00') - new Date(g.gestacao.dataCobricao + 'T00:00:00')) / (7 * 86400000),
          );
          info += ` · ${semanas}s`;
          if (g.gestacao.pai) info += ` · pai: ${g.gestacao.pai}`;
        }
        setColor(doc, doc.setTextColor, INK2);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        const wrap = doc.splitTextToSize(info, contentW);
        wrap.forEach(l => { doc.text(l, L, y); y += 3; });
      });
      y += 2;
    }

    // ── Rodapé ─────────────────────────────────
    y += 3;
    setColor(doc, doc.setDrawColor, LINE);
    doc.setLineWidth(0.2);
    doc.line(L, y, R, y);
    y += 3;
    setColor(doc, doc.setTextColor, INK3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    const foot = [empresa.nome || 'Epona Repro Team', empresa.cidade, empresa.email].filter(Boolean).join(' · ');
    const footWrap = doc.splitTextToSize(foot, contentW);
    footWrap.forEach(l => {
      doc.text(l, W / 2, y, { align: 'center' });
      y += 2.5;
    });
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, W / 2, y, { align: 'center' });
    y += 4;
    return y;
  }

  // Linha simples: texto à esquerda, data à direita (cinza)
  function linhaItem(doc, y, texto, dataStr) {
    setColor(doc, doc.setTextColor, INK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const availW = contentW - 14;
    const wrap = doc.splitTextToSize(texto, availW);
    doc.text(wrap[0], L, y);
    if (dataStr) {
      setColor(doc, doc.setTextColor, INK3);
      doc.text(dataStr, R, y, { align: 'right' });
    }
    y += 3.2;
    for (let i = 1; i < wrap.length; i++) {
      setColor(doc, doc.setTextColor, INK);
      doc.text(wrap[i], L, y);
      y += 3.2;
    }
    return y;
  }

  function sectionHeader(doc, y, title) {
    setColor(doc, doc.setDrawColor, ROXO);
    doc.setLineWidth(0.3);
    doc.line(L, y, L + 10, y);
    y += 3.5;
    setColor(doc, doc.setTextColor, ROXO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(safe(title), L, y);
    y += 4;
    return y;
  }

  // Primeira passada: medir a altura necessária.
  const measureDoc = new jsPDF({ unit: 'mm', format: [W, 2000] });
  const finalY = layout(measureDoc);
  const height = Math.max(60, Math.ceil(finalY) + 4);

  // Segunda passada: desenhar no tamanho certo.
  const doc = new jsPDF({ unit: 'mm', format: [W, height], orientation: 'portrait' });
  layout(doc);
  return doc;
}

export function nomePdfVisitaClinica(nomeHaras, dataVisita) {
  const limpo = String(nomeHaras || 'haras').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `visita-${limpo}-${dataVisita}.pdf`;
}

function addDiasStr(iso, dias) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}
