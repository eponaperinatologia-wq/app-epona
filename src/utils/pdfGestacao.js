// pdfGestacao.js — Compartilhável do acompanhamento gestacional.
// Formato cupom cream (105 mm de largura, altura dinâmica), igual
// ao estilo das faturas. Inclui dados da égua, filiação, cobrição,
// previsão de parto, dias atuais, imagem do feto (fase atual),
// frase, medidas, descrição e peso sugerido quando disponível.
//
// Pensado pra enviar pros proprietários sem precisar tirar print.

import { jsPDF } from 'jspdf';
import { FASES_FETO, faseDoFeto, previsaoParto, diasAteParto, pesoSugeridoDoCavalo } from '../gestacao';

const fmtData = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

// Carrega imagem de /public e devolve dataURL via canvas. Precisa esperar
// o onload — por isso é async.
async function imgParaDataURL(src) {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function gerarPdfGestacao({ cavalo, proprietario = null, empresa = {} }) {
  const W = 105;
  const L = 7;
  const R = W - 7;
  const contentW = R - L;

  const INK = [42, 40, 32];
  const INK2 = [93, 85, 74];
  const INK3 = [141, 134, 117];
  const LINE = [220, 210, 195];
  const setColor = (doc, fn, rgb) => fn.call(doc, rgb[0], rgb[1], rgb[2]);
  const safe = (s) => String(s ?? '');

  const g = cavalo?.gestacao || {};
  const dataCobricao = g.dataCobricao || null;
  const dias = diasAteParto(dataCobricao);
  const previsao = previsaoParto(dataCobricao);
  const infoFeto = faseDoFeto(dataCobricao);
  const faseAtual = infoFeto?.fase || (infoFeto?.fim ? FASES_FETO[FASES_FETO.length - 1] : null);
  const peso = pesoSugeridoDoCavalo(cavalo);
  const diasGestacao = dataCobricao
    ? Math.floor((new Date() - new Date(dataCobricao + 'T12:00:00')) / 86400000)
    : null;
  const ehReceptora = (cavalo?.categorias || []).includes('Receptora');
  const maeNome = ehReceptora ? (g.mae || '—') : cavalo?.nome;

  // Pré-carrega a imagem da fase atual (precisa ser dataURL pro jsPDF)
  const imgDataURL = faseAtual?.img ? await imgParaDataURL(faseAtual.img) : null;

  function layout(doc) {
    let y = 10;

    // Header — nome do haras + "Acompanhamento Gestacional"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setColor(doc, doc.setTextColor, INK);
    doc.text(safe(empresa.nome || 'Haras'), W / 2, y, { align: 'center' });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor(doc, doc.setTextColor, INK3);
    doc.text('ACOMPANHAMENTO GESTACIONAL', W / 2, y, { align: 'center' });
    y += 6;

    // Linha fina
    setColor(doc, doc.setDrawColor, LINE);
    doc.setLineWidth(0.3);
    doc.line(L, y, R, y);
    y += 6;

    // Nome da égua grande
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    setColor(doc, doc.setTextColor, INK);
    const nomeWrap = doc.splitTextToSize(safe(cavalo?.nome || '—'), contentW);
    nomeWrap.forEach(l => { doc.text(l, L, y); y += 6.5; });
    if (proprietario?.nome) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setColor(doc, doc.setTextColor, INK3);
      doc.text(safe(proprietario.nome), L, y);
      y += 5;
    }
    y += 2;

    // Badge de dias/status
    if (dias !== null) {
      const label = dias > 0 ? `${dias} dias para o parto`
        : dias === 0 ? 'PARTO HOJE!'
        : `${Math.abs(dias)} dias além do previsto`;
      const bgCor = dias < 0 ? [245, 243, 255] : dias <= 30 ? [254, 242, 242] : [245, 245, 240];
      const textCor = dias < 0 ? [124, 58, 237] : dias <= 30 ? [220, 38, 38] : INK2;
      setColor(doc, doc.setFillColor, bgCor);
      doc.roundedRect(L, y, contentW, 8, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      setColor(doc, doc.setTextColor, textCor);
      doc.text(label, W / 2, y + 5.5, { align: 'center' });
      y += 12;
    }

    // Seção: Filiação e cobrição
    const sectionTitle = (title) => {
      setColor(doc, doc.setDrawColor, LINE);
      doc.setLineWidth(0.2);
      doc.line(L, y, R, y);
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      setColor(doc, doc.setTextColor, INK3);
      doc.text(safe(title).toUpperCase(), L, y);
      y += 5;
    };
    const row = (label, value) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setColor(doc, doc.setTextColor, INK3);
      doc.text(safe(label), L, y);
      doc.setFont('helvetica', 'bold');
      setColor(doc, doc.setTextColor, INK);
      const valWrap = doc.splitTextToSize(safe(value), contentW - 40);
      doc.text(valWrap[0] || '—', R, y, { align: 'right' });
      y += 4.5;
      for (let i = 1; i < valWrap.length; i++) {
        doc.text(valWrap[i], R, y, { align: 'right' });
        y += 4;
      }
    };

    sectionTitle('Filiação e cobrição');
    row('Data da cobrição', fmtData(dataCobricao));
    row('Garanhão (pai)', g.pai || '—');
    row('Mãe biológica', maeNome || '—');
    if (ehReceptora) row('Receptora (portadora)', cavalo?.nome || '—');
    row('Previsão de parto (330d)', fmtData(previsao));
    if (diasGestacao !== null && diasGestacao >= 0) {
      row('Dia atual da gestação', `D${diasGestacao}`);
    }
    y += 3;

    // Seção: Desenvolvimento fetal (imagem + texto)
    if (faseAtual && diasGestacao !== null && diasGestacao >= 12) {
      sectionTitle('Desenvolvimento fetal');
      y += 1;
      // Imagem centralizada
      if (imgDataURL) {
        const imgSize = 50; // mm
        const imgX = (W - imgSize) / 2;
        // Fundo escuro (igual UI)
        setColor(doc, doc.setFillColor, [11, 11, 15]);
        doc.roundedRect(imgX, y, imgSize, imgSize, 3, 3, 'F');
        try {
          doc.addImage(imgDataURL, 'PNG', imgX + 2, y + 2, imgSize - 4, imgSize - 4, undefined, 'FAST');
        } catch (e) {
          // Se falhar, segue sem imagem
        }
        y += imgSize + 4;
      }
      // Faixa de dias
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      setColor(doc, doc.setTextColor, [124, 45, 140]);
      doc.text(`${faseAtual.minDia}–${faseAtual.maxDia} DIAS · DIA ${diasGestacao}`, W / 2, y, { align: 'center' });
      y += 5;
      // Frase principal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      setColor(doc, doc.setTextColor, INK);
      const fraseWrap = doc.splitTextToSize(safe(faseAtual.frase), contentW);
      fraseWrap.forEach(l => { doc.text(l, W / 2, y, { align: 'center' }); y += 5; });
      // Medidas
      if (faseAtual.medidas) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        setColor(doc, doc.setTextColor, INK2);
        doc.text(safe(faseAtual.medidas), W / 2, y, { align: 'center' });
        y += 5;
      }
      // Descrição
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setColor(doc, doc.setTextColor, INK2);
      const descWrap = doc.splitTextToSize(safe(faseAtual.descricao), contentW);
      descWrap.forEach(l => { doc.text(l, L, y); y += 4.3; });
      y += 2;

      // Peso sugerido (quando disponível)
      if (peso != null) {
        setColor(doc, doc.setFillColor, [239, 246, 255]);
        setColor(doc, doc.setDrawColor, [191, 219, 254]);
        doc.setLineWidth(0.3);
        doc.roundedRect(L, y, contentW, 11, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        setColor(doc, doc.setTextColor, [29, 78, 216]);
        doc.text('PESO SUGERIDO DE NASCIMENTO', L + 3, y + 4);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        setColor(doc, doc.setTextColor, [30, 58, 138]);
        doc.text(`${peso.toFixed(2).replace('.', ',')} kg`, R - 2, y + 8, { align: 'right' });
        y += 14;
      }
    } else if (diasGestacao !== null && diasGestacao < 12) {
      sectionTitle('Desenvolvimento fetal');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setColor(doc, doc.setTextColor, INK2);
      const txt = diasGestacao >= 0
        ? `${diasGestacao} dia(s) de gestação. Ilustrações começam a partir do 12º dia.`
        : `${Math.abs(diasGestacao)} dia(s) até a cobrição.`;
      const wrap = doc.splitTextToSize(txt, contentW);
      wrap.forEach(l => { doc.text(l, W / 2, y, { align: 'center' }); y += 4.5; });
      y += 2;
    }

    // Rodapé
    y += 6;
    setColor(doc, doc.setDrawColor, LINE);
    doc.setLineWidth(0.2);
    doc.line(L, y, R, y);
    y += 4;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    setColor(doc, doc.setTextColor, INK3);
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    doc.text(`Emitido em ${dataHoje}`, W / 2, y, { align: 'center' });
    y += 3.5;
    const footParts = [empresa.nome, empresa.telefone, empresa.email].filter(Boolean);
    if (footParts.length > 0) {
      const foot = footParts.join(' · ');
      const footWrap = doc.splitTextToSize(foot, contentW);
      footWrap.forEach(l => { doc.text(l, W / 2, y, { align: 'center' }); y += 3; });
    }
    y += 5;
    return y;
  }

  // Mede a altura antes de gerar o doc final (formato dinâmico)
  const measureDoc = new jsPDF({ unit: 'mm', format: [W, 800] });
  const finalY = layout(measureDoc);
  const height = Math.max(100, Math.ceil(finalY));

  const doc = new jsPDF({ unit: 'mm', format: [W, height], orientation: 'portrait' });
  layout(doc);
  return doc;
}

export function nomePdfGestacao(cavalo) {
  const n = (cavalo?.nome || 'egua').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const d = new Date().toLocaleDateString('sv-SE');
  return `gestacao-${n}-${d}.pdf`;
}
