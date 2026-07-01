import { jsPDF } from 'jspdf';

// PDF do plano nutricional — formato "ticket": largura fixa, altura
// calculada em duas passadas (medir → desenhar).
// Exibe MANHÃ + (ALMOÇO se aplicável) + TARDE agrupado por baia/piquete.

const fmtNum = (v) => {
  const n = parseFloat(v) || 0;
  const s = n % 1 === 0 ? String(n) : n.toFixed(1);
  return s.replace('.', ',');
};

// Extrai os itens de dieta de um cavalo para um trato específico.
// trato ∈ {'manha', 'almoco', 'tarde'}
function itensDoTrato(cav, trato, insumos = []) {
  const n = cav.nutricao || {};
  const findIns = (id) => insumos.find(i => i.id === id);
  const items = [];

  // Ração + bloqueio
  const racao = n.racaoId ? findIns(n.racaoId) : null;
  const block = n.racaoBlock || {};
  const bloqueada = trato === 'manha' ? block.manha : trato === 'tarde' ? block.tarde : false;
  let kgTrato = 0;
  if (trato === 'manha') kgTrato = n.racaoKgManha ?? (n.racaoKgDia ? n.racaoKgDia / 2 : 0);
  else if (trato === 'tarde') kgTrato = n.racaoKgTarde ?? (n.racaoKgDia ? n.racaoKgDia / 2 : 0);
  else if (trato === 'almoco') kgTrato = n.racaoKgAlmoco || 0;

  if (racao) {
    if (bloqueada) items.push({ tipo: 'block', texto: 'NAO COMER RACAO' });
    else if (kgTrato > 0) items.push({ tipo: 'racao', qtd: fmtNum(kgTrato), unidade: 'kg', nome: racao.nome });
  }

  // No almoço, mostramos SÓ a ração (é isso que muda no trato do almoço).
  if (trato === 'almoco') return items;

  // Feno — dividido igualmente entre manhã e tarde
  const fenoKgDia = parseFloat(n.fenoKgDia) || 0;
  if (fenoKgDia > 0) items.push({ tipo: 'feno', qtd: fmtNum(fenoKgDia / 2), unidade: 'kg' });

  // Óleo
  const oleoTrato = trato === 'manha'
    ? (n.oleoMlManha ?? ((n.oleoMlDia || 0) / 2))
    : (n.oleoMlTarde ?? ((n.oleoMlDia || 0) / 2));
  if (oleoTrato > 0) items.push({ tipo: 'oleo', qtd: fmtNum(oleoTrato), unidade: 'ml' });

  // Sal Kromium
  const salTrato = trato === 'manha'
    ? (parseFloat(n.salKromiumGManha) || 0)
    : (parseFloat(n.salKromiumGTarde) || 0);
  if (salTrato > 0) items.push({ tipo: 'sal', qtd: fmtNum(salTrato), unidade: 'g' });

  // Suplementos
  for (const s of (n.suplementos || [])) {
    const ins = findIns(s.insumoId) || { nome: s.insumoId, unidade: 'un' };
    const noManha = s.manha !== false;
    const noTarde = s.tarde !== false;
    const doTrato = trato === 'manha' ? noManha : noTarde;
    if (!doTrato) continue;
    const qtd = (noManha && noTarde) ? (s.qtdDia / 2) : s.qtdDia;
    if (qtd > 0) items.push({ tipo: 'sup', qtd: fmtNum(qtd), unidade: ins.unidade || 'un', nome: ins.nome });
  }

  // Periódicos
  const hoje = new Date();
  const diaSemana = hoje.getDay();
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const isSemanaPar = (() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    return Math.ceil((((d - new Date(d.getFullYear(), 0, 4)) / 86400000) + 1) / 7) % 2 === 0;
  })();
  for (const p of (n.periodicos || [])) {
    let hojeEle = false;
    if (p.frequencia === 'diario') hojeEle = true;
    else if (p.frequencia?.startsWith('cada')) {
      const interval = parseInt(p.frequencia.replace('cada', '')) || 7;
      hojeEle = daysSinceEpoch % interval === 0;
    } else if (p.diaSemana === diaSemana) {
      if (p.frequencia === 'semanal') hojeEle = true;
      else if (p.frequencia === 'quinzenal') hojeEle = isSemanaPar;
    }
    if (!hojeEle) continue;
    if (p.turno !== 'ambos' && p.turno !== trato) continue;
    const ins = findIns(p.insumoId) || { nome: p.insumoId, unidade: 'un' };
    items.push({ tipo: 'periodico', qtd: fmtNum(p.qtd), unidade: ins.unidade || 'un', nome: ins.nome });
  }

  return items;
}

export function gerarPdfNutricao({ grupos, insumos = [], empresa = {}, tratos = ['manha', 'almoco', 'tarde'] }) {
  const W = 110;
  const L = 7;
  const R = W - 7;
  const contentW = R - L;

  const INK = [42, 40, 32];
  const INK3 = [141, 134, 117];
  const LINE = [220, 210, 195];
  const ACCENT = [61, 96, 67];

  const setColor = (doc, fn, rgb) => fn.call(doc, rgb[0], rgb[1], rgb[2]);
  const safeStr = (s) => String(s ?? '');

  const CHIP_COLORS = {
    racao: [61, 96, 67],
    feno: [146, 64, 14],
    oleo: [180, 83, 9],
    sal: [82, 91, 118],
    sup: [124, 45, 18],
    periodico: [147, 51, 234],
    block: [220, 38, 38],
  };
  const CHIP_LABELS = {
    racao: (i) => `${i.qtd} ${i.unidade} · ${i.nome}`,
    feno: (i) => `Feno ${i.qtd} ${i.unidade}`,
    oleo: (i) => `Oleo ${i.qtd} ${i.unidade}`,
    sal: (i) => `Sal Kromium ${i.qtd} ${i.unidade}`,
    sup: (i) => `${i.nome} ${i.qtd} ${i.unidade}`,
    periodico: (i) => `${i.nome} ${i.qtd} ${i.unidade}`,
    block: () => 'NAO COMER RACAO',
  };

  // Auto-oculta almoço se nenhum cavalo tem comeAlmoco
  const algumComeAlmoco = grupos.some(g => g.cavalos.some(c => c.nutricao?.comeAlmoco && (c.nutricao?.racaoKgAlmoco || 0) > 0));
  const tratosEfetivos = tratos.filter(t => t !== 'almoco' || algumComeAlmoco);

  function layout(doc) {
    let y = 7;

    // Header verde
    setColor(doc, doc.setFillColor, ACCENT);
    doc.roundedRect(L, y, contentW, 16, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(safeStr(empresa.nome || 'Epona Stud'), L + 4, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Plano nutricional', L + 4, y + 12.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const dataStr = new Date().toLocaleDateString('pt-BR');
    doc.text(dataStr, R - 2, y + 7, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const diaSem = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'][new Date().getDay()];
    doc.text(diaSem, R - 2, y + 12.5, { align: 'right' });
    y += 20;

    // Legenda
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    setColor(doc, doc.setTextColor, INK3);
    doc.text('Trato: quantidade por refeicao · Feno: metade por trato · Chips = tipo do item', L, y);
    y += 5;

    const drawTratoHeader = (trato) => {
      const bg =
        trato === 'manha' ? [245, 158, 11]
        : trato === 'almoco' ? [220, 38, 38]
        : [124, 58, 237];
      setColor(doc, doc.setFillColor, bg);
      doc.roundedRect(L, y, contentW, 9, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const titulo = trato === 'manha' ? 'TRATO DA MANHA'
                   : trato === 'almoco' ? 'TRATO DO ALMOCO'
                   : 'TRATO DA TARDE';
      doc.text(titulo, L + 4, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const sub = trato === 'manha' ? 'ate 12h' : trato === 'almoco' ? 'meio-dia' : 'depois de 12h';
      doc.text(sub, R - 3, y + 6, { align: 'right' });
      y += 12;
    };

    const drawGroupHeader = (label, count) => {
      setColor(doc, doc.setDrawColor, LINE);
      doc.setLineWidth(0.2);
      doc.line(L, y, R, y);
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      setColor(doc, doc.setTextColor, ACCENT);
      doc.text(safeStr(label).toUpperCase(), L, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setColor(doc, doc.setTextColor, INK3);
      doc.text(`${count} ${count === 1 ? 'animal' : 'animais'}`, R, y, { align: 'right' });
      y += 3;
    };

    // Chips: y é o TOPO da linha atual de chips.
    const drawChips = (items) => {
      const chipH = 5.2;
      const gap = 1.5;
      const paddingX = 1.8;
      let x = L;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      items.forEach(it => {
        const label = CHIP_LABELS[it.tipo](it);
        const w = doc.getTextWidth(label) + paddingX * 2;
        if (x + w > R) {
          y += chipH + gap;
          x = L;
        }
        const rgb = CHIP_COLORS[it.tipo] || INK;
        setColor(doc, doc.setFillColor, [rgb[0], rgb[1], rgb[2]]);
        try { doc.setGState(new doc.GState({ opacity: 0.12 })); } catch (e) {}
        doc.roundedRect(x, y, w, chipH, 1, 1, 'F');
        try { doc.setGState(new doc.GState({ opacity: 1 })); } catch (e) {}
        setColor(doc, doc.setDrawColor, rgb);
        doc.setLineWidth(0.15);
        doc.roundedRect(x, y, w, chipH, 1, 1, 'S');
        setColor(doc, doc.setTextColor, rgb);
        // Baseline do texto ~ 70% da altura do chip (padrão tipográfico)
        doc.text(label, x + paddingX, y + chipH - 1.6);
        x += w + gap;
      });
      y += chipH + 2;
    };

    // Desenha nome do cavalo (linha 1) + local à direita, DEPOIS chips na linha de baixo.
    const drawCavalo = (cav, trato, itens) => {
      const local = cav.baia || cav.piquete || '';
      // Nome ocupa até local à direita — reservamos espaço à direita pro local.
      const localW = local ? 22 : 0;
      const nomeMaxW = contentW - localW - 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      setColor(doc, doc.setTextColor, INK);
      const nomeLinhas = doc.splitTextToSize(safeStr(cav.nome), nomeMaxW);
      const nomeTexto = nomeLinhas[0] || safeStr(cav.nome);
      doc.text(nomeTexto, L, y);
      if (local) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        setColor(doc, doc.setTextColor, INK3);
        doc.text(safeStr(local), R, y, { align: 'right' });
      }
      y += 3;
      // Chips ou aviso
      if (itens.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.5);
        setColor(doc, doc.setTextColor, INK3);
        doc.text('Sem plano nutricional cadastrado', L, y + 3);
        y += 6;
      } else {
        drawChips(itens);
      }
      y += 2;
    };

    tratosEfetivos.forEach((trato, tratoIdx) => {
      if (tratoIdx > 0) y += 4;
      drawTratoHeader(trato);
      grupos.forEach(g => {
        // No almoço, só mostra cavalos que comeAlmoco (senão a seção fica vazia mas com header)
        const cavalosDoTrato = trato === 'almoco'
          ? g.cavalos.filter(c => c.nutricao?.comeAlmoco && (c.nutricao?.racaoKgAlmoco || 0) > 0)
          : g.cavalos;
        if (cavalosDoTrato.length === 0) return; // pula grupo vazio no almoço
        drawGroupHeader(g.label, cavalosDoTrato.length);
        cavalosDoTrato.forEach(cav => {
          drawCavalo(cav, trato, itensDoTrato(cav, trato, insumos));
        });
      });
    });

    // Rodapé
    y += 5;
    setColor(doc, doc.setDrawColor, LINE);
    doc.setLineWidth(0.2);
    doc.line(L, y, R, y);
    y += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    setColor(doc, doc.setTextColor, INK3);
    const footParts = [empresa.nome || 'Epona Stud', dataStr, `Gerado as ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`].filter(Boolean);
    const footStr = footParts.join(' · ');
    const footWrap = doc.splitTextToSize(footStr, contentW);
    footWrap.forEach(l => { doc.text(l, W / 2, y, { align: 'center' }); y += 2.6; });
    y += 4;

    return y;
  }

  // Pass 1: medir
  const measureDoc = new jsPDF({ unit: 'mm', format: [W, 1200] });
  const finalY = layout(measureDoc);
  const height = Math.max(80, Math.ceil(finalY));

  // Pass 2: desenhar
  const doc = new jsPDF({ unit: 'mm', format: [W, height], orientation: 'portrait' });
  layout(doc);
  return doc;
}

export function nomePdfNutricao() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `nutricao-${yyyy}-${mm}-${dd}.pdf`;
}
