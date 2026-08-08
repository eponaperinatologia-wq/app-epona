// PDF da fatura Repro — mesmo estilo (paleta cream + verde) da fatura
// do Epona Stud, ajustado às seções do time repro: Visitas, Insumos,
// Procedimentos IA/TE, Serviços avulsos, Resultado reprodutivo.

import { jsPDF } from 'jspdf';

const BRL = (v) => 'R$ ' + (v || 0).toFixed(2).replace('.', ',');
const fmtData = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
};

export function gerarPdfFaturaRepro({ fatura, mesNome, empresa = {}, vetsExternos = [] }) {
  const {
    proprietario, ref,
    visitasLinhas = [], insumosLinhas = [], procedimentosLinhas = [],
    avulsosLinhas = [], resultadosLinhas = [],
    visitasTotal = 0, insumosTotal = 0, procedimentosTotal = 0,
    avulsosTotal = 0, resultadosTotal = 0, total = 0,
  } = fatura;

  const W = 105;
  const L = 7;
  const R = W - 7;
  const contentW = R - L;

  const INK = [42, 40, 32];
  const INK3 = [141, 134, 117];
  const LINE = [220, 210, 195];
  const ACCENT = [61, 96, 67];

  const setColor = (doc, fn, rgb) => fn.call(doc, rgb[0], rgb[1], rgb[2]);
  const safeStr = (s) => String(s ?? '');
  const vetNome = (id) => (vetsExternos.find(v => v.id === id)?.nome) || '—';

  function layout(doc) {
    let y = 7;

    // Header
    setColor(doc, doc.setFillColor, ACCENT);
    doc.roundedRect(L, y, contentW, 16, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(safeStr(empresa.nome || 'Epona Repro Team'), L + 4, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Fatura · ${mesNome} ${ref.ano}`, L + 4, y + 12.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`${String(ref.mes).padStart(2, '0')}/${ref.ano}`, R - 2, y + 7, { align: 'right' });
    y += 20;

    // Empresa
    setColor(doc, doc.setTextColor, INK3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const empLines = [
      empresa.cnpj && `CNPJ ${empresa.cnpj}`,
      empresa.endereco,
      [empresa.cidade].filter(Boolean).join(''),
      [empresa.telefone, empresa.email].filter(Boolean).join(' · '),
    ].filter(Boolean);
    empLines.forEach(line => {
      const wrapped = doc.splitTextToSize(line, contentW);
      wrapped.forEach(l => { doc.text(l, L, y); y += 3; });
    });
    y += 3;

    // Proprietário
    setColor(doc, doc.setDrawColor, LINE);
    doc.setLineWidth(0.3);
    doc.line(L, y, R, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    setColor(doc, doc.setTextColor, INK3);
    doc.text('PROPRIETÁRIO', L, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    setColor(doc, doc.setTextColor, INK);
    const nomeWrap = doc.splitTextToSize(safeStr(proprietario?.nome || '—'), contentW);
    nomeWrap.forEach(l => { doc.text(l, L, y); y += 5; });
    const meta = [proprietario?.email, proprietario?.telefone].filter(Boolean).join(' · ');
    if (meta) {
      doc.setFontSize(6.5);
      setColor(doc, doc.setTextColor, INK3);
      const metaWrap = doc.splitTextToSize(meta, contentW);
      metaWrap.forEach(l => { doc.text(l, L, y); y += 3.2; });
    }
    y += 4;

    // Section + row helpers
    const section = (title) => {
      setColor(doc, doc.setDrawColor, LINE);
      doc.setLineWidth(0.2);
      doc.line(L, y, R, y);
      y += 3.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      setColor(doc, doc.setTextColor, INK3);
      doc.text(safeStr(title).toUpperCase(), L, y);
      y += 5.5;
    };
    const row = (left, sub, right) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setColor(doc, doc.setTextColor, INK);
      const maxLeftW = contentW - 26;
      const leftLines = doc.splitTextToSize(safeStr(left), maxLeftW);
      doc.text(leftLines[0] || '', L, y);
      doc.setFont('helvetica', 'bold');
      doc.text(safeStr(right), R, y, { align: 'right' });
      if (sub) {
        y += 3.2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        setColor(doc, doc.setTextColor, INK3);
        const subWrap = doc.splitTextToSize(safeStr(sub), contentW);
        subWrap.forEach((l, i) => {
          doc.text(l, L, y);
          if (i < subWrap.length - 1) y += 3;
        });
        y += 4;
      } else {
        y += 5;
      }
    };

    // Visitas
    if (visitasLinhas.length > 0) {
      section('Visitas (km)');
      visitasLinhas.forEach(v => {
        const sub = [
          fmtData(v.data),
          v.localNome,
          `Vet: ${vetNome(v.vetId).split(' ')[0]}`,
          v.nProps > 1 ? `rateado entre ${v.nProps} proprietários` : null,
        ].filter(Boolean).join(' · ');
        row(`Visita ${v.localNome}`, sub, BRL(v.valor));
      });
      y += 2;
    }

    // Insumos
    if (insumosLinhas.length > 0) {
      section('Insumos');
      insumosLinhas.forEach(l => {
        const sub = [fmtData(l.data), `${l.qtd} ${l.unidade}`].filter(Boolean).join(' · ');
        row(l.nome, sub, BRL(l.valor));
      });
      y += 2;
    }

    // Procedimentos (IA/TE)
    if (procedimentosLinhas.length > 0) {
      section('Procedimentos');
      procedimentosLinhas.forEach(l => {
        const sub = [fmtData(l.data), `Vet: ${vetNome(l.vetId).split(' ')[0]}`].join(' · ');
        row(l.descricao, sub, BRL(l.valor));
      });
      y += 2;
    }

    // Serviços avulsos
    if (avulsosLinhas.length > 0) {
      section('Serviços avulsos');
      avulsosLinhas.forEach(l => {
        const sub = [fmtData(l.data), `Vet: ${vetNome(l.vetId).split(' ')[0]}`].join(' · ');
        row(l.descricao, sub, BRL(l.valor));
      });
      y += 2;
    }

    // Resultados reprodutivos
    if (resultadosLinhas.length > 0) {
      section('Resultado reprodutivo (DG30+)');
      resultadosLinhas.forEach(l => {
        const sub = [fmtData(l.data), l.vetIdInsem ? `Insem.: ${vetNome(l.vetIdInsem).split(' ')[0]}` : null].filter(Boolean).join(' · ');
        row(l.eguaNome, sub, BRL(l.valor));
      });
      y += 2;
    }

    // Totais
    setColor(doc, doc.setDrawColor, INK);
    doc.setLineWidth(0.4);
    doc.line(L, y, R, y);
    y += 4.5;

    const totRow = (label, value, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(bold ? 11.5 : 8.8);
      setColor(doc, doc.setTextColor, INK);
      doc.text(safeStr(label), L, y);
      doc.text(safeStr(value), R, y, { align: 'right' });
      y += bold ? 7.5 : 4.8;
    };

    if (visitasTotal > 0) totRow('Visitas', BRL(visitasTotal));
    if (insumosTotal > 0) totRow('Insumos', BRL(insumosTotal));
    if (procedimentosTotal > 0) totRow('Procedimentos', BRL(procedimentosTotal));
    if (avulsosTotal > 0) totRow('Serviços avulsos', BRL(avulsosTotal));
    if (resultadosTotal > 0) totRow('Resultado repro', BRL(resultadosTotal));

    y += 1.5;
    setColor(doc, doc.setDrawColor, INK);
    doc.setLineWidth(0.3);
    doc.line(L, y, R, y);
    y += 5.5;
    totRow('TOTAL', BRL(total), true);

    // Pagamento
    if (empresa.pix || empresa.banco) {
      y += 4;
      doc.setLineDashPattern([1.5, 1.5], 0);
      setColor(doc, doc.setDrawColor, LINE);
      doc.setLineWidth(0.2);
      doc.line(L, y, R, y);
      doc.setLineDashPattern([], 0);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      setColor(doc, doc.setTextColor, ACCENT);
      doc.text('DADOS PARA PAGAMENTO', L, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setColor(doc, doc.setTextColor, INK);
      if (empresa.pix) {
        const pixWrap = doc.splitTextToSize(`PIX: ${empresa.pix}`, contentW);
        pixWrap.forEach(l => { doc.text(l, L, y); y += 3.5; });
      }
      if (empresa.banco) {
        const bancoLines = String(empresa.banco).split('\n');
        bancoLines.forEach(line => {
          const wrapped = doc.splitTextToSize(line, contentW);
          wrapped.forEach(l => { doc.text(l, L, y); y += 3.2; });
        });
      }
    }

    // Rodapé
    y += 5;
    setColor(doc, doc.setDrawColor, LINE);
    doc.setLineWidth(0.2);
    doc.line(L, y, R, y);
    y += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    setColor(doc, doc.setTextColor, INK3);
    const footParts = [empresa.nome || 'Epona Repro Team', empresa.endereco, empresa.cidade, empresa.email].filter(Boolean);
    const footWrap = doc.splitTextToSize(footParts.join(' · '), contentW);
    footWrap.forEach(l => {
      doc.text(l, W / 2, y, { align: 'center' });
      y += 2.6;
    });

    y += 4;
    return y;
  }

  const measureDoc = new jsPDF({ unit: 'mm', format: [W, 800] });
  const finalY = layout(measureDoc);
  const height = Math.max(80, Math.ceil(finalY));

  const doc = new jsPDF({ unit: 'mm', format: [W, height], orientation: 'portrait' });
  layout(doc);
  return doc;
}

export function nomePdfFaturaRepro(proprietario, ref, mesNome) {
  const nomeLimpo = (proprietario?.nome || 'proprietario').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `repro-fatura-${nomeLimpo}-${mesNome.toLowerCase()}-${ref.ano}.pdf`;
}
