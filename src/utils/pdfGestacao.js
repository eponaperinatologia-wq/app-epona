// pdfGestacao.js — PDF do acompanhamento gestacional pro proprietário.
//
// A tela da égua gestante monta, fora da área visível, uma cópia da aba
// Gestação com largura de celular (cabeçalho + conteúdo, sem as abas, o
// botão Salvar e a tabbar; as faixas de alerta e o histórico gestacional
// também ficam de fora, por serem de uso interno).
// Aqui o html2canvas fotografa essa cópia e a imagem vira um PDF formato
// cupom (105 mm de largura, altura dinâmica), igual às faturas. Assim o PDF
// acompanha qualquer mudança de design da tela.

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const LARGURA_MM = 105;

export async function gerarPdfGestacaoDoElemento(el) {
  if (!el) throw new Error('Elemento da página não encontrado');

  // Garante DM Serif / Inter carregadas, senão o PDF sai com fonte reserva.
  if (document.fonts?.ready) await document.fonts.ready;

  const largura = el.scrollWidth;
  const altura = el.scrollHeight;
  // 3× deixa o texto nítido no zoom; em páginas muito compridas a escala
  // cai pra não passar do limite de tamanho de canvas do iPhone.
  const escala = Math.min(3, Math.sqrt(12e6 / (largura * altura)));

  const canvas = await html2canvas(el, {
    backgroundColor: getComputedStyle(el).backgroundColor || '#f5f1ea',
    scale: escala,
    useCORS: true,
    allowTaint: true,
    logging: false,
    windowWidth: largura,
    windowHeight: altura,
    scrollX: 0,
    scrollY: 0,
  });

  const alturaMm = canvas.height * LARGURA_MM / canvas.width;
  const doc = new jsPDF({
    unit: 'mm',
    format: [LARGURA_MM, alturaMm],
    orientation: 'portrait',
  });
  const img = canvas.toDataURL('image/jpeg', 0.92);
  doc.addImage(img, 'JPEG', 0, 0, LARGURA_MM, alturaMm, undefined, 'FAST');
  return doc;
}

export function nomePdfGestacao(cavalo) {
  const n = (cavalo?.nome || 'egua').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const d = new Date().toLocaleDateString('sv-SE');
  return `gestacao-${n}-${d}.pdf`;
}
