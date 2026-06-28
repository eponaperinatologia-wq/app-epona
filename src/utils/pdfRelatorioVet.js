import { jsPDF } from 'jspdf';

export function gerarPdfRelatorio({ cavalo, mesLabel, notas, medsMes, regsMes, procsMes, insumos, servicos, deltaPeso, deltaAltura, empresa = {} }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = 210, L = 20, R = 190;
  let y = 20;

  const write = (text, x, yp, opts = {}) => doc.text(String(text ?? ''), x, yp, opts);
  const hLine = (yp, x1 = L, x2 = R, dashed = false) => {
    doc.setLineDashPattern(dashed ? [2, 2] : [], 0);
    doc.line(x1, yp, x2, yp);
    doc.setLineDashPattern([], 0);
  };

  // ── Header ───────────────────────────────────────────────────
  doc.setFillColor(61, 96, 67);
  doc.roundedRect(L, y, R - L, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  write(empresa.nome || 'HARAS EPONA', L + 5, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  write('Relatório Veterinário', L + 5, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  write(mesLabel, R - 5, y + 7, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  write('Competência', R - 5, y + 12, { align: 'right' });
  y += 22;

  // ── Animal ───────────────────────────────────────────────────
  doc.setTextColor(42, 40, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  write(cavalo.nome, L, y);
  const sub = [cavalo.categoria, cavalo.baia ? `Baia ${cavalo.baia}` : ''].filter(Boolean).join(' · ');
  if (sub) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(141, 134, 117);
    write(sub, L, y + 6);
  }
  y += 14;

  doc.setDrawColor(200, 190, 170);
  doc.setLineWidth(0.3);
  hLine(y);
  y += 7;

  // ── Helpers ──────────────────────────────────────────────────
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

  const fmtData = (ds) => ds ? new Date(ds + 'T12:00:00').toLocaleDateString('pt-BR') : '';

  const checkPage = (needed = 12) => {
    if (y + needed > 274) { doc.addPage(); y = 20; }
  };

  // ── Biometria ────────────────────────────────────────────────
  if (medsMes.length > 0) {
    section('Biometria');
    medsMes.forEach(m => {
      checkPage(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(141, 134, 117);
      write(fmtData(m.dataRegistro), L, y);
      y += 5;

      const campos = [];
      if (m.peso != null) campos.push(`Peso: ${m.peso} kg`);
      if (m.alturaCernelha != null) campos.push(`Altura na Cernelha: ${m.alturaCernelha} cm`);

      campos.forEach(c => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(42, 40, 32);
        write(c, L + 3, y);
        y += 5;
      });
    });

    if (deltaPeso != null || deltaAltura != null) {
      checkPage(8);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(61, 96, 67);
      const deltas = [];
      if (deltaPeso != null) deltas.push(`${deltaPeso >= 0 ? '+' : ''}${deltaPeso.toFixed(1)} kg de peso`);
      if (deltaAltura != null) deltas.push(`${deltaAltura >= 0 ? '+' : ''}${deltaAltura.toFixed(1)} cm de altura`);
      write(`Variação vs mês anterior: ${deltas.join(' · ')}`, L, y);
      y += 6;
    }
    y += 3;
  }

  // ── Anotações Clínicas ────────────────────────────────────────
  if (notas.length > 0) {
    section(`Anotações Clínicas (${notas.length})`);
    notas.forEach(nota => {
      checkPage(18);
      const chips = [nota.tipo, nota.gravidade].filter(Boolean).join(' · ');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(93, 85, 74);
      write(`${fmtData(nota.data)}${chips ? '  [' + chips + ']' : ''}`, L, y);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(42, 40, 32);
      write(doc.splitTextToSize(nota.titulo, R - L)[0], L, y);
      y += 5;
      if (nota.descricao) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(93, 85, 74);
        const lines = doc.splitTextToSize(nota.descricao, R - L - 4);
        lines.forEach(line => { checkPage(5); write(line, L + 3, y); y += 4; });
      }
      y += 4;
    });
  }

  // ── Insumos ───────────────────────────────────────────────────
  if (regsMes.length > 0) {
    section('Insumos Administrados');
    regsMes.forEach(r => {
      checkPage(7);
      const ins = insumos.find(i => i.id === r.insumoId);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(42, 40, 32);
      write(`${fmtData(r.data)}  ·  ${ins?.nome || r.insumoId} — ${r.qtd} ${ins?.unidade || ''}`, L, y);
      y += 6;
    });
    y += 2;
  }

  // ── Procedimentos ─────────────────────────────────────────────
  if (procsMes.length > 0) {
    section('Procedimentos Realizados');
    procsMes.forEach(p => {
      checkPage(7);
      const sv = (servicos || []).find(s => s.id === p.servicoId);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(42, 40, 32);
      write(`${fmtData(p.data)}  ·  ${sv?.nome || p.servicoId}${p.nota ? ' — ' + p.nota : ''}`, L, y);
      y += 6;
    });
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

export function gerarResumoRelatorio({ cavalo, mesLabel, notas, medsMes, regsMes, procsMes, insumos, servicos, deltaPeso, deltaAltura }) {
  const lines = [];
  const fmtData = (ds) => ds ? new Date(ds + 'T12:00:00').toLocaleDateString('pt-BR') : '';

  lines.push('RELATÓRIO VETERINÁRIO');
  lines.push(`${cavalo.nome} · ${mesLabel}`);
  lines.push('');

  if (medsMes.length > 0) {
    lines.push('📏 BIOMETRIA');
    medsMes.forEach(m => {
      if (m.peso != null) lines.push(`• Peso: ${m.peso} kg`);
      if (m.alturaCernelha != null) lines.push(`• Altura na Cernelha: ${m.alturaCernelha} cm`);
    });
    if (deltaPeso != null) lines.push(`  Variação de peso: ${deltaPeso >= 0 ? '+' : ''}${deltaPeso.toFixed(1)} kg vs mês anterior`);
    if (deltaAltura != null) lines.push(`  Variação de altura: ${deltaAltura >= 0 ? '+' : ''}${deltaAltura.toFixed(1)} cm vs mês anterior`);
    lines.push('');
  }

  if (notas.length > 0) {
    lines.push('🩺 ANOTAÇÕES CLÍNICAS');
    notas.forEach(nota => {
      const chips = [nota.tipo, nota.gravidade].filter(Boolean).join(' · ');
      lines.push(`• ${fmtData(nota.data)} [${chips}] ${nota.titulo}`);
      if (nota.descricao) lines.push(`  ${nota.descricao}`);
    });
    lines.push('');
  }

  if (regsMes.length > 0) {
    lines.push('💊 INSUMOS ADMINISTRADOS');
    regsMes.forEach(r => {
      const ins = insumos.find(i => i.id === r.insumoId);
      lines.push(`• ${fmtData(r.data)} · ${ins?.nome || r.insumoId} — ${r.qtd} ${ins?.unidade || ''}`);
    });
    lines.push('');
  }

  if (procsMes.length > 0) {
    lines.push('🔬 PROCEDIMENTOS REALIZADOS');
    procsMes.forEach(p => {
      const sv = (servicos || []).find(s => s.id === p.servicoId);
      lines.push(`• ${fmtData(p.data)} · ${sv?.nome || p.servicoId}${p.nota ? ' — ' + p.nota : ''}`);
    });
  }

  return lines.join('\n');
}

export function nomePdfRelatorio(cavalo, mesLabel) {
  const nomeLimpo = (cavalo.nome || 'animal').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const mesLimpo = mesLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `relatorio-vet-${nomeLimpo}-${mesLimpo}.pdf`;
}
