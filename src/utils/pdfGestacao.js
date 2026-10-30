// pdfGestacao.js — Compartilhável do acompanhamento gestacional.
//
// Estratégia: usa html2canvas pra renderizar o próprio DOM da aba de
// Gestação como imagem (mantendo cores, boxes e tipografia idênticas
// ao app) e empacota num PDF formato cupom (largura fixa, altura
// dinâmica igual ao DOM renderizado).
//
// Vantagem: fidelidade visual total — não precisa manter o PDF em
// sincronia com mudanças de design da tela.

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export async function gerarPdfGestacaoDoElemento(el, { cavalo }) {
  if (!el) throw new Error('Elemento da página não encontrado');

  // Força renderização com fundo da página (var(--bg)) — html2canvas
  // precisa de cor explícita, variáveis CSS às vezes caem pra transparente.
  const canvas = await html2canvas(el, {
    backgroundColor: '#faf7f2', // cream claro usado como --bg
    scale: 2, // dobra a resolução pra ficar nítido quando o cliente der zoom
    useCORS: true,
    allowTaint: true,
    logging: false,
    // Evita que a sticky TopBar/cards cortados estraguem o render
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
    scrollX: 0,
    scrollY: 0,
  });

  // Converte px do canvas pra mm no PDF, mantendo proporção
  const pxPorMm = canvas.width / 105; // escolhemos 105mm de largura
  const widthMm = 105;
  const heightMm = canvas.height / pxPorMm;

  const doc = new jsPDF({
    unit: 'mm',
    format: [widthMm, heightMm],
    orientation: 'portrait',
  });
  const img = canvas.toDataURL('image/jpeg', 0.92);
  doc.addImage(img, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST');
  return doc;
}

export function nomePdfGestacao(cavalo) {
  const n = (cavalo?.nome || 'egua').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const d = new Date().toLocaleDateString('sv-SE');
  return `gestacao-${n}-${d}.pdf`;
}
