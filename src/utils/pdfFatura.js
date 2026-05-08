import { jsPDF } from 'jspdf';

const BRL = (v) => 'R$ ' + (v || 0).toFixed(2).replace('.', ',');

export function gerarPdfFatura({
  proprietario, ref, mesNome,
  propMens, propPerfil, insumosLinhas,
  mensTotal, perfilTotal, insumosTotal, total,
  empresa = {},
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = 210;
  const L = 20;   // left margin
  const R = 190;  // right margin
  let y = 20;

  const write = (text, x, yp, opts = {}) => doc.text(String(text ?? ''), x, yp, opts);

  const hLine = (yp, x1 = L, x2 = R, dashed = false) => {
    doc.setLineDashPattern(dashed ? [2, 2] : [], 0);
    doc.line(x1, yp, x2, yp);
    doc.setLineDashPattern([], 0);
  };

  // ── Header block ─────────────────────────────────────────────
  doc.setFillColor(61, 96, 67);
  doc.roundedRect(L, y, R - L, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  write(empresa.nome || 'HARAS EPONA', L + 5, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  write('Demonstrativo mensal', L + 5, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  write(`${String(ref.mes).padStart(2, '0')} / ${ref.ano}`, R - 5, y + 7, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  write('Competência', R - 5, y + 12, { align: 'right' });
  y += 22;

  // ── Empresa + Proprietário ────────────────────────────────────
  doc.setTextColor(93, 85, 74);
  doc.setFontSize(7.5);
  const empLines = [
    empresa.endereco, empresa.cidade,
    empresa.telefone && `Tel: ${empresa.telefone}`,
    empresa.email,
    empresa.cnpj && `CNPJ: ${empresa.cnpj}`,
  ].filter(Boolean);
  empLines.forEach((line, i) => write(line, L, y + i * 4));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(93, 85, 74);
  write('PROPRIETÁRIO', R, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(42, 40, 32);
  doc.setFontSize(11);
  write(proprietario.nome, R, y + 5, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(93, 85, 74);
  if (proprietario.email) write(proprietario.email, R, y + 10, { align: 'right' });
  if (proprietario.telefone) write(proprietario.telefone, R, y + 14, { align: 'right' });

  y += Math.max(empLines.length * 4, 18) + 4;

  doc.setDrawColor(200, 190, 170);
  doc.setLineWidth(0.3);
  hLine(y);
  y += 7;

  // ── Section helpers ───────────────────────────────────────────
  const section = (title) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(141, 134, 117);
    write(title.toUpperCase(), L, y);
    doc.setLineWidth(0.2);
    doc.setDrawColor(220, 210, 195);
    hLine(y + 2);
    y += 8;
  };

  const row = (left, sub, right) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(42, 40, 32);
    // Truncate long names so they don't overlap with value
    const maxW = 115;
    const leftStr = String(left || '');
    write(doc.splitTextToSize(leftStr, maxW)[0], L, y);
    doc.setFont('helvetica', 'bold');
    write(right, R, y, { align: 'right' });
    if (sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(141, 134, 117);
      write(sub, L, y + 4);
      y += 9;
    } else {
      y += 6;
    }
  };

  // ── Mensalidades ──────────────────────────────────────────────
  section('Mensalidades · Ração inclusa');
  propMens.forEach(m => {
    const sub = `${m.cav.categoria} · Baia ${m.cav.baia}${m.parcial ? ` · ${m.dias}/${m.total} dias` : ''}`;
    row(m.cav.nome, sub, BRL(m.valor));
  });
  y += 2;

  // ── Perfil nutricional ────────────────────────────────────────
  if (propPerfil.length > 0) {
    section('Óleo & Suplementos · Perfil × dias');
    propPerfil.forEach(pp =>
      pp.linhas.forEach(l =>
        row(`${l.nome} · ${pp.cav.nome}`, `${l.qtdDia} ${l.unidade}/dia × ${l.dias} dias`, BRL(l.valorMes))
      )
    );
    y += 2;
  }

  // ── Insumos avulsos ───────────────────────────────────────────
  section('Insumos avulsos');
  if (insumosLinhas.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(141, 134, 117);
    write('Sem insumos avulsos neste período.', L, y);
    y += 7;
  } else {
    insumosLinhas.forEach(l =>
      row(l.ins?.nome || '—', `${l.cav?.nome || '—'} · ${l.reg.qtd} ${l.ins?.unidade || ''}`, BRL(l.total))
    );
  }
  y += 4;

  // ── Totais ────────────────────────────────────────────────────
  doc.setDrawColor(42, 40, 32);
  doc.setLineWidth(0.4);
  hLine(y);
  y += 5;

  const totRow = (label, value, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 12 : 9);
    doc.setTextColor(42, 40, 32);
    write(label, L, y);
    write(value, R, y, { align: 'right' });
    y += bold ? 8 : 5;
  };

  totRow('Mensalidades', BRL(mensTotal));
  if (perfilTotal > 0) totRow('Óleo & Suplementos', BRL(perfilTotal));
  totRow('Insumos avulsos', BRL(insumosTotal));
  y += 2;
  doc.setLineWidth(0.3);
  hLine(y);
  y += 6;
  totRow('TOTAL', BRL(total), true);

  // ── Dados para pagamento ──────────────────────────────────────
  if (empresa.pix || empresa.banco) {
    y += 6;
    hLine(y, L, R, true);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(61, 96, 67);
    write('DADOS PARA PAGAMENTO', L, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(42, 40, 32);
    if (empresa.pix) { write(`PIX: ${empresa.pix}`, L, y); y += 4; }
    if (empresa.banco) {
      const bancoLines = doc.splitTextToSize(empresa.banco, R - L);
      bancoLines.forEach(line => { write(line, L, y); y += 4; });
    }
  }

  // ── Rodapé ────────────────────────────────────────────────────
  const footY = 284;
  doc.setDrawColor(200, 190, 170);
  doc.setLineWidth(0.2);
  hLine(footY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(141, 134, 117);
  const footParts = [empresa.nome || 'Haras Epona', empresa.endereco, empresa.cidade, empresa.email].filter(Boolean);
  write(footParts.join(' · '), W / 2, footY + 4, { align: 'center' });

  return doc;
}

export function nomePdfFatura(proprietario, ref, mesNome) {
  const nomeLimpo = (proprietario.nome || 'proprietario').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `fatura-${nomeLimpo}-${mesNome.toLowerCase()}-${ref.ano}.pdf`;
}
