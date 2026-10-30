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
    // Antes de desenhar, manipula o clone (não afeta o DOM real):
    //  - Remove elementos [data-pdf-hide=true] (ex: botão Salvar)
    //  - Troca inputs com [data-pdf-text=...] por span equivalente
    //    (ex: input type=date → "DD/MM/AAAA" formatado)
    onclone: (clonedDoc) => {
      try {
        clonedDoc.querySelectorAll('[data-pdf-hide="true"]').forEach(n => n.remove());
        clonedDoc.querySelectorAll('[data-pdf-text]').forEach(n => {
          const txt = n.getAttribute('data-pdf-text') || '';
          const span = clonedDoc.createElement('div');
          span.textContent = txt;
          // Copia estilo visual aproximado do input original pra não quebrar layout
          const cs = (n.ownerDocument.defaultView || window).getComputedStyle(n);
          span.style.cssText = `
            display:block; box-sizing:border-box;
            padding:${cs.padding}; border:${cs.border}; border-radius:${cs.borderRadius};
            background:${cs.backgroundColor}; color:${cs.color};
            font-family:${cs.fontFamily}; font-size:${cs.fontSize}; font-weight:${cs.fontWeight};
            text-align:${cs.textAlign}; line-height:${cs.lineHeight};
          `;
          n.parentNode.replaceChild(span, n);
        });
      } catch (e) {
        // Se der erro no clone, segue sem o filtro
      }
    },
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
