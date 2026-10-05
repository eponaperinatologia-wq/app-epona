// pdfVisitaClinica.js — Histórico Veterinário da visita de assessoria.
// Formato cupom cream, header SEM faixa colorida (apenas tipografia +
// linha fina), seguindo o padrão do demonstrativo mensal do haras.
//
// Inclui tudo que foi feito/registrado na visita (vacinas, vermífugos,
// OPGs, medições, acompanhamento gestacional dos meses preenchidos,
// anotações clínicas, insumos extras cobrados).

import { jsPDF } from 'jspdf';
import { OLDENBURGO, idadeMeses } from '../desenvolvimento';

const fmtData = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};
const BRL = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Meses que usam palpação em vez de ultrassom (seguindo gestacao.jsx)
const MESES_PALPACAO = new Set([0, 1, 2]);

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
  const W = 105;
  const L = 7;
  const R = W - 7;
  const contentW = R - L;

  // Paleta cream (igual pdfFatura — sem accent colorido grande)
  const INK = [42, 40, 32];
  const INK2 = [93, 85, 74];
  const INK3 = [141, 134, 117];
  const LINE = [220, 210, 195];

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

  const matchVisita = (reg, campoData) => reg.visitaClinicaId === visita.id
    || ((reg[campoData] || '').slice(0, 10) >= janelaIni && (reg[campoData] || '').slice(0, 10) <= janelaFim);

  const anotacoes = anotacoesClinicas
    .filter(a => a.visitaClinicaId === visita.id)
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  const vacFeitas = vacinacoesAnimais.filter(v => v.feito && idsHaras.has(v.cavaloId)
    && (v.visitaClinicaId === visita.id || matchVisita(v, 'feitoEm')));
  const vermFeitos = vermifugacoesAnimais.filter(v => idsHaras.has(v.cavaloId)
    && (v.visitaClinicaId === visita.id || matchVisita(v, 'dataRealizacao')));
  const opgsPeriodo = opgs.filter(o => idsHaras.has(o.cavaloId)
    && (o.visitaClinicaId === visita.id || matchVisita(o, 'dataColeta')));
  const medicoesVisita = medicoes.filter(m => idsHaras.has(m.cavaloId)
    && (m.visitaClinicaId === visita.id || matchVisita(m, 'dataRegistro')));
  const idsPotrosMedidos = [...new Set(medicoesVisita.map(m => m.cavaloId))];

  // Gestantes acompanhadas: critério amplo — qualquer gestante do haras
  // tem potencial de dados. Mostramos as que têm acompanhamento registrado
  // (algum mês preenchido) OU anotação feita na visita OU reg. reprodutivo.
  const idsAnotacoesVisita = new Set(anotacoes.map(a => a.cavaloId));
  const idsRegsRepro = new Set(
    (registrosReproducao || [])
      .filter(r => matchVisita(r, 'data'))
      .map(r => r.eguaId),
  );
  const todasGestantes = cavalos.filter(c => (
    c.categoria === 'Gestante' || (c.categorias || []).includes('Gestante') || c.gestacao?.dataCobricao
  ));
  // Pra cada gestante, calcular o mês ATUAL de gestação (meses desde cobrição)
  const mesAtualGestacao = (egua) => {
    if (!egua.gestacao?.dataCobricao) return null;
    const diff = (new Date(dataVisita + 'T00:00:00') - new Date(egua.gestacao.dataCobricao + 'T00:00:00')) / 86400000;
    if (diff < 0) return null;
    return Math.floor(diff / 30.4375);
  };
  // Gestantes a mostrar: tem acompanhamento preenchido, OU foi anotada na
  // visita, OU teve registro reprodutivo na visita.
  const gestantes = todasGestantes.filter(g => {
    const acomp = g.gestacao?.acompanhamento || {};
    const temAcomp = Object.keys(acomp).length > 0;
    return temAcomp || idsAnotacoesVisita.has(g.id) || idsRegsRepro.has(g.id);
  });

  // Insumos extras cobrados na visita
  const insumosExtras = Array.isArray(visita.insumosCobrados) ? visita.insumosCobrados : [];
  const totalInsumos = insumosExtras.reduce((s, it) => s + (Number(it.qtd) || 0) * (Number(it.valorUnit) || 0), 0);

  // ── Layout ────────────────────────────────────────────────────
  function layout(doc) {
    let y = 10;

    // ── Topo clean: nome em serif + subtitulo + competência ──
    setColor(doc, doc.setTextColor, INK);
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.text(safe(empresa.nome || 'Epona Repro Team'), L, y + 1);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setColor(doc, doc.setTextColor, INK3);
    doc.text('HISTÓRICO VETERINÁRIO', L, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    setColor(doc, doc.setTextColor, INK3);
    doc.text('VISITA', R, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setColor(doc, doc.setTextColor, INK);
    doc.text(fmtData(dataVisita), R, y + 5, { align: 'right' });
    y += 10;

    // Linha divisor preta fina (padrão da imagem #9)
    setColor(doc, doc.setDrawColor, INK);
    doc.setLineWidth(0.3);
    doc.line(L, y, R, y);
    y += 6;

    // ── Haras + Proprietário ───────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setColor(doc, doc.setTextColor, INK3);
    doc.text('HARAS', L, y);
    doc.text('PROPRIETÁRIO', L + contentW / 2, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor(doc, doc.setTextColor, INK);
    const harasWrap = doc.splitTextToSize(safe(nomeHaras || '—'), contentW / 2 - 3);
    const propWrap = doc.splitTextToSize(safe(proprietario?.nome || '—'), contentW / 2 - 3);
    const maxLines = Math.max(harasWrap.length, propWrap.length);
    harasWrap.forEach((l, i) => doc.text(l, L, y + i * 4.3));
    propWrap.forEach((l, i) => doc.text(l, L + contentW / 2, y + i * 4.3));
    y += maxLines * 4.3 + 4;

    // Vets participantes
    const vetsPart = (visita.vetsParticipantes || []).map(vetNome).filter(n => n !== '—').join(', ');
    if (vetsPart) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      setColor(doc, doc.setTextColor, INK3);
      doc.text('VETERINÁRIOS NA VISITA', L, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setColor(doc, doc.setTextColor, INK);
      const wrap = doc.splitTextToSize(vetsPart, contentW);
      wrap.forEach(l => { doc.text(l, L, y); y += 4; });
      y += 2;
    } else {
      y += 2;
    }

    // Helpers
    const section = (title) => {
      y += 2;
      setColor(doc, doc.setDrawColor, LINE);
      doc.setLineWidth(0.2);
      doc.line(L, y, R, y);
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      setColor(doc, doc.setTextColor, INK3);
      doc.text(safe(title).toUpperCase(), L, y);
      y += 5;
    };
    const paragrafo = (txt, size = 9, cor = INK) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(size);
      setColor(doc, doc.setTextColor, cor);
      const wrap = doc.splitTextToSize(safe(txt), contentW);
      wrap.forEach(l => { doc.text(l, L, y); y += size * 0.42; });
    };
    const linhaRotulada = (left, right, sub) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setColor(doc, doc.setTextColor, INK);
      const maxLeftW = contentW - (right ? 32 : 0);
      const leftLines = doc.splitTextToSize(safe(left), maxLeftW);
      doc.text(leftLines[0] || '', L, y);
      if (right) {
        doc.setFont('helvetica', 'normal');
        setColor(doc, doc.setTextColor, INK3);
        doc.text(safe(right), R, y, { align: 'right' });
        setColor(doc, doc.setTextColor, INK);
      }
      for (let i = 1; i < leftLines.length; i++) { y += 3.6; doc.text(leftLines[i], L, y); }
      if (sub) {
        y += 3.2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        setColor(doc, doc.setTextColor, INK3);
        const subWrap = doc.splitTextToSize(safe(sub), contentW);
        subWrap.forEach((l, i) => {
          doc.text(l, L, y);
          if (i < subWrap.length - 1) y += 3;
        });
        y += 4;
      } else {
        y += 4.5;
      }
    };

    // ── Observações da visita ───────────────────────────────────
    if (visita.observacoes) {
      section('Observações da visita');
      paragrafo(visita.observacoes);
      y += 2;
    }

    // ── Anotações clínicas ──────────────────────────────────────
    if (anotacoes.length > 0) {
      section(`Anotações clínicas · ${anotacoes.length}`);
      anotacoes.forEach(a => {
        linhaRotulada(a.titulo || '—',
          null,
          [cavNome(a.cavaloId), a.tipo, a.autor, a.hora].filter(Boolean).join(' · '),
        );
        if (a.descricao) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          setColor(doc, doc.setTextColor, INK2);
          const wrap = doc.splitTextToSize(safe(a.descricao), contentW);
          wrap.forEach(l => { doc.text(l, L, y); y += 3.2; });
          y += 2;
        }
      });
    }

    // ── Vacinas aplicadas ───────────────────────────────────────
    if (vacFeitas.length > 0) {
      section(`Vacinas aplicadas · ${vacFeitas.length}`);
      vacFeitas.forEach(v => {
        const nome = `${protoVacNome(v.protocoloId)}${v.doseIdx != null ? ` (dose ${v.doseIdx + 1})` : ''}`;
        linhaRotulada(nome, fmtData((v.feitoEm || '').slice(0, 10) || v.dataPrevista), cavNome(v.cavaloId));
      });
    }

    // ── Vermífugos ──────────────────────────────────────────────
    if (vermFeitos.length > 0) {
      section(`Vermífugos · ${vermFeitos.length}`);
      vermFeitos.forEach(v => {
        linhaRotulada(v.produto || protoVermNome(v.protocoloId),
          fmtData(v.dataRealizacao), cavNome(v.cavaloId));
      });
    }

    // ── OPG ─────────────────────────────────────────────────────
    if (opgsPeriodo.length > 0) {
      section(`OPG · ${opgsPeriodo.length}`);
      opgsPeriodo.forEach(o => {
        const result = Array.isArray(o.resultado) && o.resultado.length > 0
          ? o.resultado.map(r => `${r.nome || r.parasita || ''} ${r.contagem || ''}`).filter(Boolean).join('; ')
          : (o.dataResultado ? '(resultado pendente)' : '(aguardando laboratório)');
        linhaRotulada(cavNome(o.cavaloId), fmtData(o.dataColeta), result);
      });
    }

    // ── Acompanhamento gestacional ──────────────────────────────
    // Pra cada gestante, mostra os meses de acompanhamento PREENCHIDOS
    // com os campos coletados (FC, biparietal, aorta, JUP, estática, etc.)
    if (gestantes.length > 0) {
      section(`Acompanhamento gestacional · ${gestantes.length} égua${gestantes.length !== 1 ? 's' : ''}`);
      gestantes.forEach(g => {
        const mes = mesAtualGestacao(g);
        let header = g.nome;
        if (mes != null) {
          const semanas = Math.floor(
            (new Date(dataVisita + 'T00:00:00') - new Date(g.gestacao.dataCobricao + 'T00:00:00')) / (7 * 86400000),
          );
          header += ` · ${semanas}s · mês ${mes}`;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        setColor(doc, doc.setTextColor, INK);
        doc.text(header, L, y);
        y += 4;
        if (g.gestacao?.pai) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          setColor(doc, doc.setTextColor, INK3);
          doc.text(`Pai: ${g.gestacao.pai} · cobrição ${fmtData(g.gestacao.dataCobricao)}`, L, y);
          y += 3.5;
        }
        if (g.gestacao?.sexagem) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          setColor(doc, doc.setTextColor, INK3);
          doc.text(`Sexagem: ${g.gestacao.sexagem}`, L, y);
          y += 3.5;
        }

        // Meses de acompanhamento preenchidos
        const acomp = g.gestacao?.acompanhamento || {};
        const mesesPreenchidos = Object.keys(acomp)
          .map(Number)
          .filter(m => {
            const d = acomp[m];
            if (!d) return false;
            if (MESES_PALPACAO.has(m)) return Array.isArray(d.palpacoes) && d.palpacoes.length > 0;
            return Object.values(d).some(v => v && v !== '');
          })
          .sort((a, b) => a - b);

        if (mesesPreenchidos.length > 0) {
          mesesPreenchidos.forEach(m => {
            const d = acomp[m];
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            setColor(doc, doc.setTextColor, INK2);
            doc.text(`  ${m}º mês`, L + 1, y);
            y += 3.3;

            if (MESES_PALPACAO.has(m)) {
              // Palpações
              d.palpacoes.forEach(p => {
                const info = [
                  p.data ? fmtData(p.data) : null,
                  p.achados || null,
                ].filter(Boolean).join(' · ');
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                setColor(doc, doc.setTextColor, INK);
                const wrap = doc.splitTextToSize(`• ${info || '(sem detalhes)'}`, contentW - 4);
                wrap.forEach(l => { doc.text(l, L + 3, y); y += 3.2; });
              });
            } else {
              // Ultrassom — monta linha com os campos preenchidos
              const campos = [
                d.freqCardiaca && `FC ${d.freqCardiaca}`,
                d.biparietal && `BP ${d.biparietal}`,
                d.aorta && `AF ${d.aorta}`,
                d.jup && `JUP ${d.jup}`,
                d.orbitaAltura && `ÓF alt ${d.orbitaAltura}`,
                d.orbitaLargura && `ÓF larg ${d.orbitaLargura}`,
                d.orbitaVolume && `ÓF vol ${d.orbitaVolume}`,
                d.estaticaFetal && `estát. ${d.estaticaFetal}`,
                d.observacoes || null,
              ].filter(Boolean).join(' · ');
              if (campos) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                setColor(doc, doc.setTextColor, INK);
                const wrap = doc.splitTextToSize(`• ${campos}`, contentW - 4);
                wrap.forEach(l => { doc.text(l, L + 3, y); y += 3.2; });
              }
            }
            y += 1.5;
          });
        } else if (idsAnotacoesVisita.has(g.id)) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          setColor(doc, doc.setTextColor, INK3);
          doc.text('  (sem acompanhamento ultrassom; ver anotações acima)', L + 1, y);
          y += 3.3;
        }
        y += 2;
      });
    }

    // ── Desenvolvimento (gráficos por potro medido) ─────────────
    if (idsPotrosMedidos.length > 0) {
      section(`Desenvolvimento · ${idsPotrosMedidos.length} potro${idsPotrosMedidos.length !== 1 ? 's' : ''}`);
      idsPotrosMedidos.forEach(potroId => {
        const potro = cavaloPorId(potroId);
        if (!potro) return;
        y = desenharGraficosPotro(doc, potro, medicoes, dataVisita, L, R, contentW, y);
        y += 3;
      });
    }

    // ── Insumos extras cobrados ─────────────────────────────────
    if (insumosExtras.length > 0) {
      section(`Insumos extras cobrados · ${insumosExtras.length}`);
      insumosExtras.forEach(it => {
        const nome = it.descricao || (insumos.find(i => i.id === it.insumoId)?.nome) || '—';
        const unidade = (insumos.find(i => i.id === it.insumoId)?.unidade) || '';
        const total = (Number(it.qtd) || 0) * (Number(it.valorUnit) || 0);
        linhaRotulada(nome, BRL(total),
          `${it.qtd} ${unidade} × ${BRL(it.valorUnit)}`.trim(),
        );
      });
      // Total
      y += 1;
      setColor(doc, doc.setDrawColor, LINE);
      doc.setLineWidth(0.2);
      doc.line(L, y, R, y);
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      setColor(doc, doc.setTextColor, INK);
      doc.text('Total de insumos extras', L, y);
      doc.text(BRL(totalInsumos), R, y, { align: 'right' });
      y += 5;
    }

    // ── Rodapé ───────────────────────────────────────────────────
    y += 4;
    setColor(doc, doc.setDrawColor, LINE);
    doc.setLineWidth(0.3);
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
    y += 6;

    return y;
  }

  // 1ª passada: medir
  const measure = new jsPDF({ unit: 'mm', format: [W, 2500] });
  const finalY = layout(measure);
  const height = Math.max(80, Math.ceil(finalY));

  // 2ª passada: desenhar
  const doc = new jsPDF({ unit: 'mm', format: [W, height], orientation: 'portrait' });
  layout(doc);
  return doc;
}

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

  const idadeAtual = idadeMeses(potro.nascimento, dataVisita);
  const ultima = minhas[minhas.length - 1];
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(potro.nome, L, y);
  y += 3.5;

  doc.setTextColor(INK3[0], INK3[1], INK3[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const info = [
    potro.nascimento ? `nasc. ${fmtDataLocal(potro.nascimento)}` : null,
    idadeAtual != null ? `${idadeAtual.toFixed(1)} meses` : null,
    ultima?.peso ? `${ultima.peso} kg` : null,
    ultima?.altura ? `${ultima.altura} cm` : null,
  ].filter(Boolean).join(' · ');
  doc.text(info, L, y);
  y += 4;

  const gh = 38;

  desenharGrafico(doc, L, y, contentW, gh, {
    titulo: 'Altura (cm)',
    cor: [16, 85, 170],
    pontos: minhas.filter(p => p.altura != null).map(p => ({ x: p.idade, y: p.altura })),
    referencia: OLDENBURGO.map(o => ({ x: o.m, y: o.altura })),
  });
  y += gh + 2;

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

  doc.setTextColor(93, 85, 74);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text(titulo, x, y + 4);

  const allY = [...referencia.map(r => r.y), ...pontos.map(p => p.y)];
  let yMin = Math.min(...allY);
  let yMax = Math.max(...allY);
  const span = yMax - yMin || 1;
  yMin -= span * 0.05;
  yMax += span * 0.05;

  const toX = (vx) => chartX + ((vx - xMin) / (xMax - xMin)) * chartW;
  const toY = (vy) => chartY + chartH - ((vy - yMin) / (yMax - yMin)) * chartH;

  doc.setDrawColor(230, 222, 207);
  doc.setLineWidth(0.15);
  for (let i = 1; i <= 3; i++) {
    const gy = chartY + (chartH * i) / 4;
    doc.line(chartX, gy, chartX + chartW, gy);
  }

  doc.setDrawColor(190, 180, 160);
  doc.setLineWidth(0.25);
  doc.line(chartX, chartY, chartX, chartY + chartH);
  doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);

  doc.setTextColor(141, 134, 117);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text(String(Math.round(yMax)), x + padLeft - 2, chartY + 1, { align: 'right' });
  doc.text(String(Math.round((yMax + yMin) / 2)), x + padLeft - 2, chartY + chartH / 2 + 1, { align: 'right' });
  doc.text(String(Math.round(yMin)), x + padLeft - 2, chartY + chartH, { align: 'right' });

  [0, 6, 12, 18, 24].forEach(m => {
    const gx = toX(m);
    doc.text(String(m), gx, chartY + chartH + 3.5, { align: 'center' });
  });
  doc.text('meses', x + w - 2, chartY + chartH + 3.5, { align: 'right' });

  doc.setDrawColor(170, 160, 140);
  doc.setLineWidth(0.3);
  try { doc.setLineDashPattern([0.8, 0.8], 0); } catch {}
  for (let i = 1; i < referencia.length; i++) {
    doc.line(toX(referencia[i - 1].x), toY(referencia[i - 1].y),
             toX(referencia[i].x), toY(referencia[i].y));
  }
  try { doc.setLineDashPattern([], 0); } catch {}

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
