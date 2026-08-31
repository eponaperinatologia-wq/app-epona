import { jsPDF } from 'jspdf';

const BRL = (v) => 'R$ ' + (v || 0).toFixed(2).replace('.', ',');

// Formato "ticket": largura fixa estreita, altura calculada dinamicamente
// para caber todo o conteúdo numa única página, sem cortes.
export function gerarPdfFatura({
  proprietario, ref, mesNome,
  propMens = [], propPerfil = [], insumosLinhas = [], procLinhas = [],
  cfLinhas = [], custoFixoTotal = 0,
  mensTotal = 0, perfilTotal = 0, insumosTotal = 0, procedimentosTotal = 0, total = 0,
  empresa = {},
}) {
  const W = 105;
  const L = 7;
  const R = W - 7;
  const contentW = R - L;

  // Paleta — espelha a tela do app (cream/serif/verde-musgo)
  const INK = [42, 40, 32];
  const INK2 = [93, 85, 74];
  const INK3 = [141, 134, 117];
  const LINE = [220, 210, 195];
  const ACCENT = [61, 96, 67];

  const setColor = (doc, fn, rgb) => fn.call(doc, rgb[0], rgb[1], rgb[2]);
  const safeStr = (s) => String(s ?? '');

  // Layout: desenha tudo num doc e retorna a altura final do cursor y.
  // Chamado primeiro num doc temporário (medir) e depois no doc real (desenhar).
  function layout(doc) {
    let y = 7;

    // ── Header verde ─────────────────────────────────────────────
    setColor(doc, doc.setFillColor, ACCENT);
    doc.roundedRect(L, y, contentW, 16, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(safeStr(empresa.nome || 'Epona Stud'), L + 4, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Fatura · ${mesNome} ${ref.ano}`, L + 4, y + 12.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`${String(ref.mes).padStart(2, '0')}/${ref.ano}`, R - 2, y + 7, { align: 'right' });
    y += 20;

    // ── Empresa info ─────────────────────────────────────────────
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

    // ── Proprietário ─────────────────────────────────────────────
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
    const nomeWrap = doc.splitTextToSize(safeStr(proprietario.nome), contentW);
    nomeWrap.forEach(l => { doc.text(l, L, y); y += 5; });
    const meta = [proprietario.email, proprietario.telefone].filter(Boolean).join(' · ');
    if (meta) {
      doc.setFontSize(6.5);
      setColor(doc, doc.setTextColor, INK3);
      const metaWrap = doc.splitTextToSize(meta, contentW);
      metaWrap.forEach(l => { doc.text(l, L, y); y += 3.2; });
    }
    y += 4;

    // ── Section + Row helpers ────────────────────────────────────
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

    // ── Mensalidades ─────────────────────────────────────────────
    const mensVisible = propMens.filter(m => (m.valor || 0) > 0);
    if (mensVisible.length > 0) {
      section('Mensalidades');
      mensVisible.forEach(m => {
        const share = m.share || 1;
        const cota = (m.valor || 0) / share;
        const sub = [
          m.cav.categoria || '',
          m.parcial ? `${m.dias}/${m.total} dias` : null,
          share > 1 ? `${share} proprietários` : null,
        ].filter(Boolean).join(' · ');
        row(m.cav.nome, sub, BRL(cota));
      });
      y += 2;
    }

    // ── Perfil nutricional ───────────────────────────────────────
    if (propPerfil.length > 0) {
      section('Óleo · Suplementos · Periódicos');
      propPerfil.forEach(pp => {
        const share = pp.share || 1;
        pp.linhas.forEach(l => {
          const cota = (l.valorMes || l.valor || 0);
          let sub;
          if (l.periodico) {
            const qtdMesFmt = Number(l.qtdMes || 0).toFixed(2).replace(/\.?0+$/, '');
            const dosePorVez = Number(l.qtdDia || 0).toFixed(2).replace(/\.?0+$/, '');
            const doses = l.dosesMes ?? l.dias ?? 0;
            sub = `${pp.cav.nome} · ${qtdMesFmt} ${l.unidade} no mês · ${doses}× ${dosePorVez}${l.freqLabel ? ` (${l.freqLabel})` : ''}`;
          } else {
            const qtd = l.qtdDia >= 1 ? Number(l.qtdDia).toFixed(2).replace(/\.?0+$/, '') : Number(l.qtdDia).toFixed(3).replace(/\.?0+$/, '');
            const diasUsados = l.dias ?? pp.dias;
            sub = `${pp.cav.nome} · ${qtd} ${l.unidade}/dia × ${diasUsados} dias`;
          }
          row(l.nome, sub, BRL(share > 1 ? cota / share : cota));
        });
      });
      y += 2;
    }

    // ── Insumos avulsos ──────────────────────────────────────────
    if (insumosLinhas.length > 0) {
      section('Insumos avulsos');
      insumosLinhas.forEach(l => {
        const share = l.share || 1;
        const sub = [
          l.cav?.nome || '—',
          `${l.reg.qtd} ${l.ins?.unidade || ''}`.trim(),
          share > 1 ? `${share} prop.` : null,
        ].filter(Boolean).join(' · ');
        row(l.ins?.nome || '—', sub, BRL(l.total));
      });
      y += 2;
    }

    // ── Procedimentos ────────────────────────────────────────────
    if (procLinhas.length > 0) {
      section('Procedimentos');
      procLinhas.forEach(l => {
        const share = l.share || 1;
        const dataStr = l.proc?.data ? new Date(l.proc.data + 'T12:00:00').toLocaleDateString('pt-BR') : '';
        const isExamesLab = l.proc?.servicoId === '__exames_lab__';
        const exames = isExamesLab ? (l.proc?.examesSelecionados || []) : [];
        const subParts = [
          l.cav?.nome || '—',
          dataStr,
          l.proc?.laboratorio ? `Lab: ${l.proc.laboratorio}` : null,
          share > 1 ? `${share} prop.` : null,
        ].filter(Boolean);
        let sub = subParts.join(' · ');
        if (exames.length > 0) {
          sub += '\n' + exames.map(e => `• ${e.nome} — ${BRL(e.valor || 0)}`).join('\n');
        }
        const motoboyAtivo = l.proc?.motoboy?.ativo && (Number(l.proc.motoboy.valor) || 0) > 0;
        if (motoboyAtivo) {
          const mbValor = (Number(l.proc.motoboy.valor) || 0) / share;
          const mbNome = l.proc.motoboy.nome ? ` — ${l.proc.motoboy.nome}` : '';
          sub += `\n• Motoboy${mbNome} — ${BRL(mbValor)}`;
        }
        row(l.nomeSv || l.sv?.nome || 'Procedimento', sub, BRL(l.total));
      });
      y += 2;
    }

    // ── Custo fixo rateado ───────────────────────────────────────
    if (cfLinhas.length > 0) {
      section('Custo fixo rateado');
      cfLinhas.forEach(l => {
        const share = l.share || 1;
        const sub = [
          `${l.dias}/${l.totalDias} dias`,
          share > 1 ? `${share} prop.` : null,
        ].filter(Boolean).join(' · ');
        row(l.cav?.nome || '—', sub, BRL(l.valor));
      });
      y += 2;
    }

    // ── Totais ───────────────────────────────────────────────────
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

    if (mensTotal > 0) totRow('Mensalidades', BRL(mensTotal));
    if (perfilTotal > 0) totRow('Óleo & Suplementos', BRL(perfilTotal));
    if (insumosTotal > 0) totRow('Insumos avulsos', BRL(insumosTotal));
    if (procedimentosTotal > 0) totRow('Procedimentos', BRL(procedimentosTotal));
    if (custoFixoTotal > 0) totRow('Custo fixo', BRL(custoFixoTotal));

    y += 1.5;
    setColor(doc, doc.setDrawColor, INK);
    doc.setLineWidth(0.3);
    doc.line(L, y, R, y);
    y += 5.5;
    totRow('TOTAL', BRL(total), true);

    // ── Pagamento ────────────────────────────────────────────────
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

    // ── Rodapé ───────────────────────────────────────────────────
    y += 5;
    setColor(doc, doc.setDrawColor, LINE);
    doc.setLineWidth(0.2);
    doc.line(L, y, R, y);
    y += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    setColor(doc, doc.setTextColor, INK3);
    const footParts = [empresa.nome || 'Epona Stud', empresa.endereco, empresa.cidade, empresa.email].filter(Boolean);
    const footStr = footParts.join(' · ');
    const footWrap = doc.splitTextToSize(footStr, contentW);
    footWrap.forEach(l => {
      doc.text(l, W / 2, y, { align: 'center' });
      y += 2.6;
    });

    y += 4; // padding final
    return y;
  }

  // Pass 1: medir altura
  const measureDoc = new jsPDF({ unit: 'mm', format: [W, 600] });
  const finalY = layout(measureDoc);
  const height = Math.max(80, Math.ceil(finalY));

  // Pass 2: doc real com altura exata
  const doc = new jsPDF({ unit: 'mm', format: [W, height], orientation: 'portrait' });
  layout(doc);
  return doc;
}

export function nomePdfFatura(proprietario, ref, mesNome) {
  const nomeLimpo = (proprietario.nome || 'proprietario').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `fatura-${nomeLimpo}-${mesNome.toLowerCase()}-${ref.ano}.pdf`;
}
