// pdfVisitaClinica.js — Relatório A4 "Histórico Veterinário" da visita
// clínica de assessoria. Pensado pra entregar ao proprietário do haras
// com tudo que foi feito/visto naquele dia + evolução do desenvolvimento
// dos potros medidos (gráficos altura e peso × padrão Oldenburgo nos
// últimos meses). NÃO é fatura — não mostra valores, não cobra nada.

import { jsPDF } from 'jspdf';
import { OLDENBURGO, oldenburgoAt, idadeMeses } from '../desenvolvimento';

const fmtData = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export function gerarPdfVisitaClinica({
  visita, contrato, nomeHaras, proprietario,
  empresa = {},
  vetsExternos = [],
  cavalos = [],
  insumos = [],
  anotacoesClinicas = [],
  vacinacoesAnimais = [], protocolosVacinacao = [],
  vermifugacoesAnimais = [], protocolosVermifugacao = [],
  opgs = [],
  medicoes = [],
  registrosReproducao = [],
}) {
  // A4 em mm: 210 × 297
  const W = 210, H = 297;
  const L = 15, R = W - 15;         // margens laterais
  const T = 15, B = H - 15;         // margens topo/base
  const contentW = R - L;

  // Paleta
  const INK = [42, 40, 32];
  const INK2 = [85, 75, 50];
  const INK3 = [120, 110, 90];
  const LINE = [220, 210, 195];
  const ROXO = [124, 45, 140];
  const AZUL = [30, 64, 175];
  const VERDE = [21, 128, 61];
  const BG_SOFT = [245, 232, 255];

  const setColor = (doc, fn, rgb) => fn.call(doc, rgb[0], rgb[1], rgb[2]);
  const safe = (s) => String(s ?? '');

  const dataVisita = visita.data;
  const janelaIni = addDiasStr(dataVisita, -1);
  const janelaFim = addDiasStr(dataVisita, 1);
  const idsHaras = new Set(cavalos.map(c => c.id));
  const cavaloPorId = (id) => cavalos.find(c => c.id === id);
  const cavNome = (id) => (cavaloPorId(id)?.nome) || '—';
  const vetNome = (id) => (vetsExternos.find(v => v.id === id)?.nome) || '—';
  const protoVacNome = (id) => (protocolosVacinacao.find(p => p.id === id)?.nome) || '—';
  const protoVermNome = (id) => (protocolosVermifugacao.find(p => p.id === id)?.nome) || '—';

  // Anotações da visita
  const anotacoes = anotacoesClinicas
    .filter(a => a.visitaClinicaId === visita.id)
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  // Vacinas feitas na visita (ou mesmo dia)
  const matchVisita = (reg, campoData) => reg.visitaClinicaId === visita.id
    || ((reg[campoData] || '').slice(0, 10) >= janelaIni && (reg[campoData] || '').slice(0, 10) <= janelaFim);
  const vacFeitas = vacinacoesAnimais.filter(v => v.feito && idsHaras.has(v.cavaloId)
    && (v.visitaClinicaId === visita.id || matchVisita(v, 'feitoEm')));
  const vermFeitos = vermifugacoesAnimais.filter(v => idsHaras.has(v.cavaloId)
    && (v.visitaClinicaId === visita.id || matchVisita(v, 'dataRealizacao')));
  const opgsPeriodo = opgs.filter(o => idsHaras.has(o.cavaloId)
    && (o.visitaClinicaId === visita.id || matchVisita(o, 'dataColeta')));

  // Potros medidos NESSA visita (gatilho pra incluir gráfico)
  const medicoesVisita = medicoes.filter(m => idsHaras.has(m.cavaloId)
    && (m.visitaClinicaId === visita.id || matchVisita(m, 'dataRegistro')));
  const idsPotrosMedidos = [...new Set(medicoesVisita.map(m => m.cavaloId))];

  // Gestantes acompanhadas: éguas gestantes com anotação OU registro
  // reprodutivo na visita (indica que foram vistas hoje).
  const idsAnotacoesVisita = new Set(anotacoes.map(a => a.cavaloId));
  const idsRegsRepro = new Set(
    (registrosReproducao || [])
      .filter(r => matchVisita(r, 'data'))
      .map(r => r.eguaId),
  );
  const gestantes = cavalos.filter(c => (
    c.categoria === 'Gestante' || (c.categorias || []).includes('Gestante') || c.gestacao?.dataCobricao
  ) && (idsAnotacoesVisita.has(c.id) || idsRegsRepro.has(c.id)));

  // ── Layout com paginação automática ──────────────────────────
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  let y = T;
  let pageNum = 1;

  function newPage() {
    doc.addPage();
    pageNum += 1;
    y = T;
    drawPageHeader(true);
  }
  function needSpace(h) {
    if (y + h > B - 5) newPage();
  }
  function drawPageHeader(short = false) {
    if (!short) {
      // Primeira página: cabeçalho grande
      setColor(doc, doc.setFillColor, ROXO);
      doc.roundedRect(L, y, contentW, 20, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(safe(empresa.nome || 'Epona Repro Team'), L + 5, y + 9);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Histórico Veterinário · Visita de Assessoria', L + 5, y + 15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(fmtData(dataVisita), R - 5, y + 9, { align: 'right' });
      y += 24;
    } else {
      // Páginas seguintes: cabeçalho discreto
      setColor(doc, doc.setTextColor, INK3);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`${safe(nomeHaras)} · Visita ${fmtData(dataVisita)}`, L, y + 4);
      doc.text(`${empresa.nome || 'Epona Repro Team'} · pág. ${pageNum}`, R, y + 4, { align: 'right' });
      setColor(doc, doc.setDrawColor, LINE);
      doc.setLineWidth(0.2);
      doc.line(L, y + 6, R, y + 6);
      y += 10;
    }
  }

  function sectionTitle(title, cor = ROXO) {
    needSpace(10);
    setColor(doc, doc.setDrawColor, cor);
    doc.setLineWidth(1);
    doc.line(L, y, L + 8, y);
    y += 5;
    setColor(doc, doc.setTextColor, cor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(safe(title), L, y);
    y += 6;
  }

  function text(str, opts = {}) {
    const {
      size = 10, bold = false, color = INK, x = L,
      maxWidth = contentW, lineGap = 1.2, align = 'left',
    } = opts;
    setColor(doc, doc.setTextColor, color);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(safe(str), maxWidth);
    const lh = size * 0.4 + lineGap;
    lines.forEach(l => {
      needSpace(lh);
      doc.text(l, align === 'right' ? R : x, y, { align });
      y += lh;
    });
  }

  // ── Cabeçalho principal + info da visita ─────────────────────
  drawPageHeader(false);

  // Bloco de identificação
  setColor(doc, doc.setFillColor, [251, 248, 240]);
  doc.roundedRect(L, y, contentW, 22, 2, 2, 'F');
  setColor(doc, doc.setTextColor, INK3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('HARAS', L + 4, y + 5);
  doc.text('PROPRIETÁRIO', L + contentW / 2, y + 5);
  setColor(doc, doc.setTextColor, INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(safe(nomeHaras || '—'), L + 4, y + 11);
  doc.text(safe(proprietario?.nome || '—'), L + contentW / 2, y + 11);
  setColor(doc, doc.setTextColor, INK3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('VETERINÁRIOS NA VISITA', L + 4, y + 16);
  const vetsPart = (visita.vetsParticipantes || []).map(vetNome).join(', ') || '—';
  setColor(doc, doc.setTextColor, INK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const vLines = doc.splitTextToSize(vetsPart, contentW - 8);
  doc.text(vLines[0] || '—', L + 4, y + 20);
  y += 26;

  // ── Observações gerais ───────────────────────────────────────
  if (visita.observacoes) {
    sectionTitle('Observações da visita');
    text(visita.observacoes, { size: 10, color: INK });
    y += 2;
  }

  // ── Anotações clínicas por animal ────────────────────────────
  if (anotacoes.length > 0) {
    sectionTitle(`Anotações clínicas · ${anotacoes.length}`);
    for (const a of anotacoes) {
      needSpace(14);
      setColor(doc, doc.setFillColor, BG_SOFT);
      doc.rect(L, y - 3, contentW, 1, 'F');
      text(`${cavNome(a.cavaloId)} · ${a.tipo || ''}`, { size: 9, bold: true, color: ROXO });
      text(a.titulo, { size: 10, bold: true, color: INK });
      if (a.descricao) text(a.descricao, { size: 9.5, color: INK2 });
      if (a.autor || a.hora) {
        text(`${a.autor || ''}${a.hora ? ' · ' + a.hora : ''}`, { size: 8, color: INK3 });
      }
      y += 2;
    }
  }

  // ── Vacinas aplicadas na visita ──────────────────────────────
  if (vacFeitas.length > 0) {
    sectionTitle(`Vacinas aplicadas nesta visita · ${vacFeitas.length}`, AZUL);
    for (const v of vacFeitas) {
      needSpace(5);
      setColor(doc, doc.setTextColor, INK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`• ${cavNome(v.cavaloId)}`, L + 2, y);
      doc.text(protoVacNome(v.protocoloId) + (v.doseIdx != null ? ` (dose ${v.doseIdx + 1})` : ''), L + 55, y);
      setColor(doc, doc.setTextColor, INK3);
      doc.text(fmtData((v.feitoEm || '').slice(0, 10) || v.dataPrevista), R, y, { align: 'right' });
      y += 4.5;
    }
    y += 2;
  }

  // ── Vermífugos aplicados ─────────────────────────────────────
  if (vermFeitos.length > 0) {
    sectionTitle(`Vermífugos aplicados · ${vermFeitos.length}`, VERDE);
    for (const v of vermFeitos) {
      needSpace(5);
      setColor(doc, doc.setTextColor, INK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`• ${cavNome(v.cavaloId)}`, L + 2, y);
      doc.text(v.produto || protoVermNome(v.protocoloId), L + 55, y);
      setColor(doc, doc.setTextColor, INK3);
      doc.text(fmtData(v.dataRealizacao), R, y, { align: 'right' });
      y += 4.5;
    }
    y += 2;
  }

  // ── OPGs coletados ───────────────────────────────────────────
  if (opgsPeriodo.length > 0) {
    sectionTitle(`OPG · ${opgsPeriodo.length}`, [146, 64, 14]);
    for (const o of opgsPeriodo) {
      needSpace(5);
      setColor(doc, doc.setTextColor, INK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`• ${cavNome(o.cavaloId)}`, L + 2, y);
      const result = Array.isArray(o.resultado) && o.resultado.length > 0
        ? o.resultado.map(r => `${r.nome || r.parasita || ''} ${r.contagem || ''}`).filter(Boolean).join('; ')
        : (o.dataResultado ? '(resultado pendente)' : '(coletado — aguardando lab)');
      doc.text(result, L + 55, y);
      setColor(doc, doc.setTextColor, INK3);
      doc.text(fmtData(o.dataColeta), R, y, { align: 'right' });
      y += 4.5;
    }
    y += 2;
  }

  // ── Gestantes acompanhadas na visita ─────────────────────────
  if (gestantes.length > 0) {
    sectionTitle(`Acompanhamento gestacional · ${gestantes.length} égua${gestantes.length !== 1 ? 's' : ''}`, [190, 24, 93]);
    for (const g of gestantes) {
      needSpace(16);
      // Linha com nome + semanas + pai
      let infoLinha1 = g.nome;
      let infoLinha2 = '';
      if (g.gestacao?.dataCobricao) {
        const semanas = Math.floor(
          (new Date(dataVisita + 'T00:00:00') - new Date(g.gestacao.dataCobricao + 'T00:00:00')) / (7 * 86400000),
        );
        infoLinha2 = `${semanas} semanas de gestação · cobrição ${fmtData(g.gestacao.dataCobricao)}`;
        if (g.gestacao.pai) infoLinha2 += ` · pai: ${g.gestacao.pai}`;
      }
      setColor(doc, doc.setTextColor, INK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`• ${infoLinha1}`, L + 2, y);
      y += 4;
      if (infoLinha2) {
        setColor(doc, doc.setTextColor, INK3);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(infoLinha2, L + 5, y);
        y += 4;
      }
      // Anotações obstétricas específicas da égua nesta visita
      const minhasAnot = anotacoes.filter(a => a.cavaloId === g.id);
      if (minhasAnot.length > 0) {
        for (const a of minhasAnot) {
          needSpace(4);
          setColor(doc, doc.setTextColor, INK2);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(9);
          const txt = `   ${a.titulo}${a.descricao ? ': ' + a.descricao : ''}`;
          const lines = doc.splitTextToSize(txt, contentW - 10);
          lines.forEach(l => { needSpace(4); doc.text(l, L + 5, y); y += 3.5; });
        }
      }
      y += 2;
    }
  }

  // ── Desenvolvimento dos potros (gráficos oldenburgo) ─────────
  if (idsPotrosMedidos.length > 0) {
    for (const potroId of idsPotrosMedidos) {
      const potro = cavaloPorId(potroId);
      if (!potro) continue;
      needSpace(90); // Cada gráfico ocupa ~80mm
      sectionTitle(`Desenvolvimento · ${potro.nome}`, [180, 83, 9]);
      desenharGraficosPotro(doc, potro, medicoes, dataVisita, L, R, y, (dy) => { y += dy; needSpace(0); });
      y += 2;
    }
  }

  // ── Rodapé em cada página ────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    setColor(doc, doc.setTextColor, INK3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const foot = [empresa.nome || 'Epona Repro Team', empresa.cidade, empresa.email].filter(Boolean).join(' · ');
    doc.text(foot, W / 2, H - 8, { align: 'center' });
    doc.text(`${p} de ${totalPages}`, R, H - 8, { align: 'right' });
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, L, H - 8);
  }

  return doc;
}

// Desenha dois gráficos (altura e peso) do potro × padrão Oldenburgo.
// `drawCb(dy)` avança o cursor Y chamando o callback do pai (pra o
// sistema de paginação se manter em sincronia).
function desenharGraficosPotro(doc, potro, medicoes, dataVisita, L, R, yStart, advance) {
  const minhas = medicoes
    .filter(m => m.cavaloId === potro.id && (m.peso || m.alturaCernelha))
    .map(m => ({
      data: m.dataRegistro,
      idade: idadeMeses(potro.nascimento, m.dataRegistro),
      peso: m.peso != null ? Number(m.peso) : null,
      altura: m.alturaCernelha != null ? Number(m.alturaCernelha) : null,
    }))
    .filter(p => p.idade != null && p.idade >= 0 && p.idade <= 24)
    .sort((a, b) => a.idade - b.idade);

  if (minhas.length === 0) return;

  const contentW = R - L;
  const gw = (contentW - 8) / 2;      // largura de cada gráfico
  const gh = 55;                       // altura de cada gráfico
  const x1 = L;
  const x2 = L + gw + 8;
  let y = yStart;

  // Mini-info do animal (idade atual, nascimento, última medição)
  const idadeAtual = idadeMeses(potro.nascimento, dataVisita);
  const ultima = minhas[minhas.length - 1];
  doc.setTextColor(85, 75, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const infoLine = [
    potro.nascimento ? `nasc. ${fmtDataLocal(potro.nascimento)}` : null,
    idadeAtual != null ? `idade ${idadeAtual.toFixed(1)} m` : null,
    ultima?.peso ? `peso ${ultima.peso}kg` : null,
    ultima?.altura ? `alt ${ultima.altura}cm` : null,
  ].filter(Boolean).join(' · ');
  doc.text(infoLine, L + 2, y);
  y += 4;

  // Gráfico altura
  desenharGrafico(doc, x1, y, gw, gh, {
    titulo: 'Altura de cernelha (cm)',
    cor: [16, 85, 170],
    pontos: minhas.filter(p => p.altura != null).map(p => ({ x: p.idade, y: p.altura })),
    referencia: OLDENBURGO.map(o => ({ x: o.m, y: o.altura })),
    xMin: 0, xMax: 24, xLabel: 'idade (meses)',
  });
  // Gráfico peso
  desenharGrafico(doc, x2, y, gw, gh, {
    titulo: 'Peso (kg)',
    cor: [21, 128, 61],
    pontos: minhas.filter(p => p.peso != null).map(p => ({ x: p.idade, y: p.peso })),
    referencia: OLDENBURGO.map(o => ({ x: o.m, y: o.peso })),
    xMin: 0, xMax: 24, xLabel: 'idade (meses)',
  });

  advance(gh + 6);
}

// Desenha um mini-gráfico com eixo, linha de referência (Oldenburgo)
// e pontos do animal conectados.
function desenharGrafico(doc, x, y, w, h, opts) {
  const { titulo, cor, pontos, referencia, xMin, xMax, xLabel } = opts;
  const padX = 10, padY = 14;
  const chartX = x + padX;
  const chartY = y + padY;
  const chartW = w - padX - 4;
  const chartH = h - padY - 8;

  // Título
  doc.setTextColor(85, 75, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(titulo, x + 2, y + 4);

  // Range Y: baseado em referência + pontos
  const allY = [...referencia.map(r => r.y), ...pontos.map(p => p.y)];
  let yMin = Math.min(...allY);
  let yMax = Math.max(...allY);
  // Padding de 5% + arredonda
  const span = yMax - yMin || 1;
  yMin = yMin - span * 0.05;
  yMax = yMax + span * 0.05;

  const toX = (vx) => chartX + ((vx - xMin) / (xMax - xMin)) * chartW;
  const toY = (vy) => chartY + chartH - ((vy - yMin) / (yMax - yMin)) * chartH;

  // Eixos
  doc.setDrawColor(200, 190, 175);
  doc.setLineWidth(0.2);
  doc.line(chartX, chartY, chartX, chartY + chartH);
  doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);

  // Grid horizontal (3 linhas)
  for (let i = 1; i <= 3; i++) {
    const gy = chartY + (chartH * i) / 4;
    doc.setDrawColor(235, 228, 215);
    doc.line(chartX, gy, chartX + chartW, gy);
  }

  // Labels eixo Y (min e max)
  doc.setFontSize(6.5);
  doc.setTextColor(140, 130, 110);
  doc.text(String(Math.round(yMax)), x + 2, chartY + 1);
  doc.text(String(Math.round(yMin)), x + 2, chartY + chartH);

  // Labels eixo X (0, 6, 12, 18, 24)
  [0, 6, 12, 18, 24].forEach(m => {
    const gx = toX(m);
    doc.text(String(m), gx, chartY + chartH + 4, { align: 'center' });
  });
  doc.text(xLabel, x + w / 2, chartY + chartH + 8, { align: 'center' });

  // Linha de referência Oldenburgo (cinza tracejado)
  doc.setDrawColor(160, 150, 130);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1, 1], 0);
  for (let i = 1; i < referencia.length; i++) {
    const p0 = referencia[i - 1];
    const p1 = referencia[i];
    doc.line(toX(p0.x), toY(p0.y), toX(p1.x), toY(p1.y));
  }
  doc.setLineDashPattern([], 0);

  // Linha do animal
  if (pontos.length > 0) {
    doc.setDrawColor(cor[0], cor[1], cor[2]);
    doc.setLineWidth(0.6);
    for (let i = 1; i < pontos.length; i++) {
      const p0 = pontos[i - 1];
      const p1 = pontos[i];
      doc.line(toX(p0.x), toY(p0.y), toX(p1.x), toY(p1.y));
    }
    // Pontos (círculos)
    doc.setFillColor(cor[0], cor[1], cor[2]);
    pontos.forEach(p => {
      doc.circle(toX(p.x), toY(p.y), 0.9, 'F');
    });
  }

  // Legenda
  doc.setFontSize(6);
  doc.setTextColor(120, 110, 90);
  doc.text('— — padrão Oldenburgo', chartX, chartY - 2);
  doc.setTextColor(cor[0], cor[1], cor[2]);
  doc.text('● animal', chartX + chartW - 15, chartY - 2);
}

export function nomePdfVisitaClinica(nomeHaras, dataVisita) {
  const limpo = String(nomeHaras || 'haras').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `historico-vet-${limpo}-${dataVisita}.pdf`;
}

function addDiasStr(iso, dias) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}
function fmtDataLocal(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
