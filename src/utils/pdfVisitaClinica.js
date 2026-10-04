// pdfVisitaClinica.js — Histórico Veterinário da visita de assessoria.
// Formato cupom estreito (W=105mm) que cresce com o conteúdo, mesmo
// estilo visual da fatura do haras (pdfFatura.js): cream + ink escuro,
// header colorido com cantos arredondados, divisores em linha fina,
// serif só nos valores grandes, sans no resto.
//
// Não é fatura — não mostra valores cobrados. Entrega ao proprietário
// o relato do que foi feito/visto na visita e o desenvolvimento dos
// potros medidos (gráficos altura/peso × padrão Oldenburgo).

import { jsPDF } from 'jspdf';
import { OLDENBURGO, idadeMeses } from '../desenvolvimento';

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
  // ── Formato cupom (igual pdfFatura) ───────────────────────────
  const W = 105;
  const L = 7;
  const R = W - 7;
  const contentW = R - L;

  // Paleta cream + ink, com roxo da repro como accent
  const INK = [42, 40, 32];
  const INK2 = [93, 85, 74];
  const INK3 = [141, 134, 117];
  const LINE = [220, 210, 195];
  const ACCENT = [124, 45, 140]; // roxo repro

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

  const anotacoes = anotacoesClinicas
    .filter(a => a.visitaClinicaId === visita.id)
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  const matchVisita = (reg, campoData) => reg.visitaClinicaId === visita.id
    || ((reg[campoData] || '').slice(0, 10) >= janelaIni && (reg[campoData] || '').slice(0, 10) <= janelaFim);

  const vacFeitas = vacinacoesAnimais.filter(v => v.feito && idsHaras.has(v.cavaloId)
    && (v.visitaClinicaId === visita.id || matchVisita(v, 'feitoEm')));
  const vermFeitos = vermifugacoesAnimais.filter(v => idsHaras.has(v.cavaloId)
    && (v.visitaClinicaId === visita.id || matchVisita(v, 'dataRealizacao')));
  const opgsPeriodo = opgs.filter(o => idsHaras.has(o.cavaloId)
    && (o.visitaClinicaId === visita.id || matchVisita(o, 'dataColeta')));
  const medicoesVisita = medicoes.filter(m => idsHaras.has(m.cavaloId)
    && (m.visitaClinicaId === visita.id || matchVisita(m, 'dataRegistro')));
  const idsPotrosMedidos = [...new Set(medicoesVisita.map(m => m.cavaloId))];

  const idsAnotacoesVisita = new Set(anotacoes.map(a => a.cavaloId));
  const idsRegsRepro = new Set(
    (registrosReproducao || [])
      .filter(r => matchVisita(r, 'data'))
      .map(r => r.eguaId),
  );
  const gestantes = cavalos.filter(c => (
    c.categoria === 'Gestante' || (c.categorias || []).includes('Gestante') || c.gestacao?.dataCobricao
  ) && (idsAnotacoesVisita.has(c.id) || idsRegsRepro.has(c.id)));

  // ── Layout: medir e depois desenhar ──────────────────────────
  function layout(doc) {
    let y = 7;

    // Header roxo
    setColor(doc, doc.setFillColor, ACCENT);
    doc.roundedRect(L, y, contentW, 16, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(safe(empresa.nome || 'Epona Repro Team'), L + 4, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Histórico Veterinário · ${fmtData(dataVisita)}`, L + 4, y + 12.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('VISITA', R - 2, y + 7, { align: 'right' });
    y += 20;

    // Empresa info (CNPJ/endereço/contato)
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
      const wrap = doc.splitTextToSize(line, contentW);
      wrap.forEach(l => { doc.text(l, L, y); y += 3; });
    });
    y += 3;

    // Haras + Proprietário
    setColor(doc, doc.setDrawColor, LINE);
    doc.setLineWidth(0.3);
    doc.line(L, y, R, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    setColor(doc, doc.setTextColor, INK3);
    doc.text('HARAS', L, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    setColor(doc, doc.setTextColor, INK);
    const harasWrap = doc.splitTextToSize(safe(nomeHaras || '—'), contentW);
    harasWrap.forEach(l => { doc.text(l, L, y); y += 5; });

    if (proprietario?.nome) {
      doc.setFontSize(6.5);
      setColor(doc, doc.setTextColor, INK3);
      doc.text(`Proprietário: ${safe(proprietario.nome)}`, L, y);
      y += 3.5;
    }

    // Vets participantes
    const vetsPart = (visita.vetsParticipantes || []).map(vetNome).filter(n => n !== '—').join(', ');
    if (vetsPart) {
      doc.setFontSize(6.5);
      setColor(doc, doc.setTextColor, INK3);
      const wrap = doc.splitTextToSize(`Veterinários: ${vetsPart}`, contentW);
      wrap.forEach(l => { doc.text(l, L, y); y += 3.2; });
    }
    y += 4;

    // Helpers
    const section = (title) => {
      setColor(doc, doc.setDrawColor, LINE);
      doc.setLineWidth(0.2);
      doc.line(L, y, R, y);
      y += 3.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      setColor(doc, doc.setTextColor, INK3);
      doc.text(safe(title).toUpperCase(), L, y);
      y += 5.5;
    };

    const row = (left, sub, right) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setColor(doc, doc.setTextColor, INK);
      const maxLeftW = contentW - (right ? 26 : 0);
      const leftLines = doc.splitTextToSize(safe(left), maxLeftW);
      doc.text(leftLines[0] || '', L, y);
      if (right) {
        doc.setFont('helvetica', 'bold');
        doc.text(safe(right), R, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
      }
      for (let i = 1; i < leftLines.length; i++) { y += 3.8; doc.text(leftLines[i], L, y); }
      if (sub) {
        y += 3.2;
        doc.setFontSize(6.5);
        setColor(doc, doc.setTextColor, INK3);
        const subWrap = doc.splitTextToSize(safe(sub), contentW);
        subWrap.forEach((l, i) => {
          doc.text(l, L, y);
          if (i < subWrap.length - 1) y += 3;
        });
        y += 4;
      } else {
        y += 5;
      }
    };

    const paragrafo = (txt) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor(doc, doc.setTextColor, INK);
      const wrap = doc.splitTextToSize(safe(txt), contentW);
      wrap.forEach(l => { doc.text(l, L, y); y += 3.6; });
      y += 2;
    };

    // ── Observações da visita ─────────────────────────────────
    if (visita.observacoes) {
      section('Observações da visita');
      paragrafo(visita.observacoes);
    }

    // ── Anotações clínicas por animal ────────────────────────
    if (anotacoes.length > 0) {
      section(`Anotações clínicas · ${anotacoes.length}`);
      anotacoes.forEach(a => {
        row(a.titulo || '—', [cavNome(a.cavaloId), a.tipo, a.autor]
          .filter(Boolean).join(' · '), null);
        if (a.descricao) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          setColor(doc, doc.setTextColor, INK2);
          const wrap = doc.splitTextToSize(safe(a.descricao), contentW);
          wrap.forEach(l => { doc.text(l, L, y); y += 3.2; });
          y += 2;
        }
      });
      y += 1;
    }

    // ── Vacinas aplicadas ─────────────────────────────────────
    if (vacFeitas.length > 0) {
      section(`Vacinas aplicadas · ${vacFeitas.length}`);
      vacFeitas.forEach(v => {
        const nome = `${protoVacNome(v.protocoloId)}${v.doseIdx != null ? ` (dose ${v.doseIdx + 1})` : ''}`;
        row(nome, `${cavNome(v.cavaloId)} · ${fmtData((v.feitoEm || '').slice(0, 10) || v.dataPrevista)}`, null);
      });
      y += 1;
    }

    // ── Vermífugos aplicados ──────────────────────────────────
    if (vermFeitos.length > 0) {
      section(`Vermífugos · ${vermFeitos.length}`);
      vermFeitos.forEach(v => {
        row(v.produto || protoVermNome(v.protocoloId),
          `${cavNome(v.cavaloId)} · ${fmtData(v.dataRealizacao)}`, null);
      });
      y += 1;
    }

    // ── OPG ──────────────────────────────────────────────────
    if (opgsPeriodo.length > 0) {
      section(`OPG · ${opgsPeriodo.length}`);
      opgsPeriodo.forEach(o => {
        const result = Array.isArray(o.resultado) && o.resultado.length > 0
          ? o.resultado.map(r => `${r.nome || r.parasita || ''} ${r.contagem || ''}`).filter(Boolean).join('; ')
          : (o.dataResultado ? '(resultado pendente)' : '(aguardando laboratório)');
        row(cavNome(o.cavaloId), `${fmtData(o.dataColeta)} · ${result}`, null);
      });
      y += 1;
    }

    // ── Acompanhamento gestacional ───────────────────────────
    if (gestantes.length > 0) {
      section(`Acompanhamento gestacional · ${gestantes.length}`);
      gestantes.forEach(g => {
        let sub = '';
        if (g.gestacao?.dataCobricao) {
          const semanas = Math.floor(
            (new Date(dataVisita + 'T00:00:00') - new Date(g.gestacao.dataCobricao + 'T00:00:00')) / (7 * 86400000),
          );
          sub = `${semanas} semanas · cobrição ${fmtData(g.gestacao.dataCobricao)}`;
          if (g.gestacao.pai) sub += ` · pai ${g.gestacao.pai}`;
        }
        row(g.nome, sub, null);
        // Anotações obstétricas específicas desta égua (indentadas)
        const minhasAnot = anotacoes.filter(a => a.cavaloId === g.id);
        minhasAnot.forEach(a => {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          setColor(doc, doc.setTextColor, INK2);
          const txt = `  → ${a.titulo}${a.descricao ? ': ' + a.descricao : ''}`;
          const wrap = doc.splitTextToSize(safe(txt), contentW - 4);
          wrap.forEach(l => { doc.text(l, L + 2, y); y += 3.2; });
          y += 1;
        });
      });
      y += 1;
    }

    // ── Desenvolvimento (gráficos por potro medido) ───────────
    if (idsPotrosMedidos.length > 0) {
      section(`Desenvolvimento · ${idsPotrosMedidos.length} potro${idsPotrosMedidos.length !== 1 ? 's' : ''}`);
      idsPotrosMedidos.forEach(potroId => {
        const potro = cavaloPorId(potroId);
        if (!potro) return;
        y = desenharGraficosPotro(doc, potro, medicoes, dataVisita, L, R, contentW, y);
        y += 3;
      });
    }

    // ── Rodapé ───────────────────────────────────────────────
    y += 3;
    setColor(doc, doc.setDrawColor, LINE);
    doc.setLineWidth(0.3);
    // Linha tracejada
    try { doc.setLineDashPattern([1, 1], 0); } catch {}
    doc.line(L, y, R, y);
    try { doc.setLineDashPattern([], 0); } catch {}
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    setColor(doc, doc.setTextColor, INK3);
    doc.text(safe(empresa.nome || 'Epona Repro Team'), W / 2, y, { align: 'center' });
    y += 3;
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, W / 2, y, { align: 'center' });
    y += 5;

    return y;
  }

  // 1ª passada: medir altura necessária
  const measure = new jsPDF({ unit: 'mm', format: [W, 2500] });
  const finalY = layout(measure);
  const height = Math.max(80, Math.ceil(finalY));

  // 2ª passada: desenhar com altura certa
  const doc = new jsPDF({ unit: 'mm', format: [W, height], orientation: 'portrait' });
  layout(doc);
  return doc;
}

// Desenha mini-info do potro + 2 gráficos empilhados (altura em cima,
// peso embaixo), cada um ocupando a largura total do cupom.
function desenharGraficosPotro(doc, potro, medicoes, dataVisita, L, R, contentW, yStart) {
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

  if (minhas.length === 0) return yStart;

  let y = yStart;
  const INK = [42, 40, 32];
  const INK3 = [141, 134, 117];

  // Nome do potro + info resumo
  const idadeAtual = idadeMeses(potro.nascimento, dataVisita);
  const ultima = minhas[minhas.length - 1];
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(potro.nome, L, y);
  y += 3.8;

  doc.setTextColor(INK3[0], INK3[1], INK3[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const info = [
    potro.nascimento ? `nasc. ${fmtDataLocal(potro.nascimento)}` : null,
    idadeAtual != null ? `idade ${idadeAtual.toFixed(1)} m` : null,
    ultima?.peso ? `${ultima.peso} kg` : null,
    ultima?.altura ? `${ultima.altura} cm` : null,
  ].filter(Boolean).join(' · ');
  doc.text(info, L, y);
  y += 4;

  const gh = 40; // altura de cada gráfico

  // Altura
  desenharGrafico(doc, L, y, contentW, gh, {
    titulo: 'Altura de cernelha (cm)',
    cor: [16, 85, 170],
    pontos: minhas.filter(p => p.altura != null).map(p => ({ x: p.idade, y: p.altura })),
    referencia: OLDENBURGO.map(o => ({ x: o.m, y: o.altura })),
  });
  y += gh + 2;

  // Peso
  desenharGrafico(doc, L, y, contentW, gh, {
    titulo: 'Peso (kg)',
    cor: [21, 128, 61],
    pontos: minhas.filter(p => p.peso != null).map(p => ({ x: p.idade, y: p.peso })),
    referencia: OLDENBURGO.map(o => ({ x: o.m, y: o.peso })),
  });
  y += gh + 2;

  return y;
}

function desenharGrafico(doc, x, y, w, h, opts) {
  const { titulo, cor, pontos, referencia } = opts;
  const padLeft = 11, padTop = 7, padRight = 2, padBottom = 7;
  const chartX = x + padLeft;
  const chartY = y + padTop;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;
  const xMin = 0, xMax = 24;

  // Título em cima
  doc.setTextColor(93, 85, 74);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text(titulo, x, y + 4);

  // Range Y: baseado em referência + pontos
  const allY = [...referencia.map(r => r.y), ...pontos.map(p => p.y)];
  let yMin = Math.min(...allY);
  let yMax = Math.max(...allY);
  const span = yMax - yMin || 1;
  yMin -= span * 0.05;
  yMax += span * 0.05;

  const toX = (vx) => chartX + ((vx - xMin) / (xMax - xMin)) * chartW;
  const toY = (vy) => chartY + chartH - ((vy - yMin) / (yMax - yMin)) * chartH;

  // Grid horizontal (4 linhas)
  doc.setDrawColor(230, 222, 207);
  doc.setLineWidth(0.15);
  for (let i = 1; i <= 3; i++) {
    const gy = chartY + (chartH * i) / 4;
    doc.line(chartX, gy, chartX + chartW, gy);
  }

  // Eixos
  doc.setDrawColor(190, 180, 160);
  doc.setLineWidth(0.25);
  doc.line(chartX, chartY, chartX, chartY + chartH);
  doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);

  // Labels eixo Y
  doc.setTextColor(141, 134, 117);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text(String(Math.round(yMax)), x + padLeft - 2, chartY + 1, { align: 'right' });
  doc.text(String(Math.round((yMax + yMin) / 2)), x + padLeft - 2, chartY + chartH / 2 + 1, { align: 'right' });
  doc.text(String(Math.round(yMin)), x + padLeft - 2, chartY + chartH, { align: 'right' });

  // Labels eixo X (0, 6, 12, 18, 24)
  [0, 6, 12, 18, 24].forEach(m => {
    const gx = toX(m);
    doc.text(String(m), gx, chartY + chartH + 3.5, { align: 'center' });
  });
  doc.text('meses', x + w - 2, chartY + chartH + 3.5, { align: 'right' });

  // Linha de referência Oldenburgo (tracejada cinza)
  doc.setDrawColor(170, 160, 140);
  doc.setLineWidth(0.3);
  try { doc.setLineDashPattern([0.8, 0.8], 0); } catch {}
  for (let i = 1; i < referencia.length; i++) {
    doc.line(toX(referencia[i - 1].x), toY(referencia[i - 1].y),
             toX(referencia[i].x), toY(referencia[i].y));
  }
  try { doc.setLineDashPattern([], 0); } catch {}

  // Linha do animal
  if (pontos.length > 0) {
    doc.setDrawColor(cor[0], cor[1], cor[2]);
    doc.setLineWidth(0.6);
    for (let i = 1; i < pontos.length; i++) {
      doc.line(toX(pontos[i - 1].x), toY(pontos[i - 1].y),
               toX(pontos[i].x), toY(pontos[i].y));
    }
    doc.setFillColor(cor[0], cor[1], cor[2]);
    pontos.forEach(p => { doc.circle(toX(p.x), toY(p.y), 0.8, 'F'); });
  }
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
