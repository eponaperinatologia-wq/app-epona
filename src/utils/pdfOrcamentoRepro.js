// PDF do orçamento Repro — mesmo estilo (cream + roxo) da fatura.
// Ajustado pra enfatizar que é ESTIMATIVA (não cobrança).

import { jsPDF } from 'jspdf';

const BRL = (v) => 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',');
const fmtData = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y.slice(2)}`;
};

function totalItem(item) {
  const base = (Number(item.qtd) || 0) * (Number(item.valorUnit) || 0);
  const desc = (item.descartaveis || []).reduce((s, d) => s + (Number(d.qtd) || 0) * (Number(d.valorUnit) || 0), 0);
  return base + desc;
}

function agruparPorTipo(itens = []) {
  const grupos = {
    visita: { label: 'Visitas', itens: [], total: 0 },
    procedimento: { label: 'Procedimentos', itens: [], total: 0 },
    insumo: { label: 'Insumos', itens: [], total: 0 },
    resultado: { label: 'Resultado reprodutivo projetado (DG45+)', itens: [], total: 0 },
    personalizado: { label: 'Outros', itens: [], total: 0 },
  };
  for (const it of itens) {
    const g = grupos[it.tipo] || grupos.personalizado;
    g.itens.push(it);
    g.total += totalItem(it);
  }
  return Object.entries(grupos).filter(([, g]) => g.itens.length > 0);
}

export function gerarPdfOrcamentoRepro({ orcamento, empresa = {}, proprietario = null, local = null }) {
  const { titulo = '', observacoes = '', itens = [], total = 0, destinatarioNome = '', criadoEm = null } = orcamento || {};

  const W = 105;
  const L = 7;
  const R = W - 7;
  const contentW = R - L;

  const INK = [42, 40, 32];
  const INK3 = [141, 134, 117];
  const LINE = [220, 210, 195];
  const ACCENT = [124, 45, 140];

  const setColor = (doc, fn, rgb) => fn.call(doc, rgb[0], rgb[1], rgb[2]);
  const safeStr = (s) => String(s ?? '');

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
    doc.text('Orçamento (estimativa)', L + 4, y + 12.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    if (criadoEm) {
      doc.text(fmtData(String(criadoEm).slice(0, 10)), R - 2, y + 7, { align: 'right' });
    }
    y += 20;

    // Empresa
    setColor(doc, doc.setTextColor, INK3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const empLines = [
      empresa.cnpj && `CNPJ ${empresa.cnpj}`,
      empresa.endereco,
      empresa.cidade,
      [empresa.telefone, empresa.email].filter(Boolean).join(' · '),
    ].filter(Boolean);
    empLines.forEach(line => {
      const wrapped = doc.splitTextToSize(line, contentW);
      wrapped.forEach(l => { doc.text(l, L, y); y += 3; });
    });
    y += 3;

    // Título do orçamento
    setColor(doc, doc.setDrawColor, LINE);
    doc.setLineWidth(0.3);
    doc.line(L, y, R, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    setColor(doc, doc.setTextColor, INK3);
    doc.text('ORÇAMENTO', L, y);
    y += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setColor(doc, doc.setTextColor, INK);
    const tituloWrap = doc.splitTextToSize(safeStr(titulo || '(sem título)'), contentW);
    tituloWrap.forEach(l => { doc.text(l, L, y); y += 5; });
    y += 2;

    // Destinatário
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    setColor(doc, doc.setTextColor, INK3);
    doc.text('PARA', L, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor(doc, doc.setTextColor, INK);
    const nomeDest = (proprietario?.nome || destinatarioNome || '—');
    doc.text(safeStr(nomeDest), L, y);
    y += 4.5;
    if (proprietario?.telefone || proprietario?.email) {
      doc.setFontSize(6.5);
      setColor(doc, doc.setTextColor, INK3);
      const meta = [proprietario.telefone, proprietario.email].filter(Boolean).join(' · ');
      doc.text(meta, L, y); y += 3.5;
    }
    if (local?.nome) {
      doc.setFontSize(6.8);
      setColor(doc, doc.setTextColor, INK3);
      doc.text(`Local: ${local.nome}${local.cidade ? ` · ${local.cidade}` : ''}`, L, y);
      y += 4;
    }
    y += 2;

    // Seções
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

    const grupos = agruparPorTipo(itens);
    for (const [, grupo] of grupos) {
      section(grupo.label);
      for (const it of grupo.itens) {
        const qtd = Number(it.qtd) || 0;
        const vu = Number(it.valorUnit) || 0;
        const base = qtd * vu;
        const subBits = [
          qtd !== 1 ? `${qtd} ×` : null,
          vu > 0 ? BRL(vu) : null,
        ].filter(Boolean).join(' ');
        row(it.descricao || '—', subBits, BRL(base));
        // Descartáveis (se houver)
        for (const d of (it.descartaveis || [])) {
          const v = (Number(d.qtd) || 0) * (Number(d.valorUnit) || 0);
          if (v <= 0) continue;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          setColor(doc, doc.setTextColor, INK3);
          doc.text(`• ${safeStr(d.nome || '—')} × ${Number(d.qtd) || 0}`, L + 2, y);
          doc.setFont('helvetica', 'normal');
          doc.text(BRL(v), R, y, { align: 'right' });
          y += 3.5;
        }
      }
      y += 2;
    }

    // Total
    setColor(doc, doc.setDrawColor, INK);
    doc.setLineWidth(0.4);
    doc.line(L, y, R, y);
    y += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    setColor(doc, doc.setTextColor, INK);
    doc.text('TOTAL ESTIMADO', L, y);
    setColor(doc, doc.setTextColor, ACCENT);
    doc.text(BRL(total), R, y, { align: 'right' });
    y += 7;

    // Observações
    if (observacoes) {
      y += 2;
      setColor(doc, doc.setDrawColor, LINE);
      doc.setLineWidth(0.2);
      doc.line(L, y, R, y);
      y += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      setColor(doc, doc.setTextColor, INK3);
      doc.text('OBSERVAÇÕES', L, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setColor(doc, doc.setTextColor, INK);
      const obsWrap = doc.splitTextToSize(safeStr(observacoes), contentW);
      obsWrap.forEach(l => { doc.text(l, L, y); y += 3.5; });
      y += 2;
    }

    // Aviso
    y += 4;
    doc.setLineDashPattern([1.5, 1.5], 0);
    setColor(doc, doc.setDrawColor, LINE);
    doc.setLineWidth(0.2);
    doc.line(L, y, R, y);
    doc.setLineDashPattern([], 0);
    y += 4;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    setColor(doc, doc.setTextColor, INK3);
    const aviso = 'Valores sujeitos a confirmação após execução. Variações no número de visitas, procedimentos ou insumos alteram o total final.';
    const avisoWrap = doc.splitTextToSize(aviso, contentW);
    avisoWrap.forEach(l => {
      doc.text(l, W / 2, y, { align: 'center' });
      y += 3;
    });

    // Rodapé
    y += 4;
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

export function nomePdfOrcamentoRepro(orcamento) {
  const t = (orcamento?.titulo || 'orcamento').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const d = orcamento?.criadoEm ? String(orcamento.criadoEm).slice(0, 10) : new Date().toLocaleDateString('sv-SE');
  return `orcamento-${t}-${d}.pdf`;
}
