// Erro inesperado: aviso amigável com "Recarregar"; os detalhes técnicos
// ficam recolhidos (a equipe ainda consegue copiar para o suporte).
window.onerror = (msg, url, line, col, err) => {
  console.error('onerror:', msg, url, line, col, err);
  if (/ResizeObserver loop/i.test(String(msg))) return; // aviso inofensivo do navegador
  if (document.getElementById('epona-erro')) return;
  const box = document.createElement('div');
  box.id = 'epona-erro';
  box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,system-ui,sans-serif';
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border-radius:16px;padding:22px;max-width:380px;width:100%;box-shadow:0 12px 32px rgba(0,0,0,0.25);color:#1f2937';
  const titulo = document.createElement('div');
  titulo.style.cssText = 'font-size:18px;font-weight:700;margin-bottom:8px';
  titulo.textContent = 'Algo deu errado nesta tela';
  const texto = document.createElement('div');
  texto.style.cssText = 'font-size:14px;line-height:1.45;color:#4b5563;margin-bottom:16px';
  texto.textContent = 'Recarregue o app para continuar. Se acontecer de novo, avise a equipe Epona.';
  const botao = document.createElement('button');
  botao.style.cssText = 'width:100%;padding:13px;border:none;border-radius:12px;background:#3d6043;color:#fff;font-size:15px;font-weight:700;cursor:pointer';
  botao.textContent = 'Recarregar';
  botao.onclick = () => window.location.reload();
  const detalhes = document.createElement('details');
  detalhes.style.cssText = 'margin-top:14px;font-size:11px;color:#6b7280';
  const resumo = document.createElement('summary');
  resumo.textContent = 'Detalhes técnicos';
  const pre = document.createElement('pre');
  pre.style.cssText = 'white-space:pre-wrap;word-break:break-word;max-height:160px;overflow:auto;font:11px/1.4 monospace;color:#b91c1c;margin:8px 0 0';
  pre.textContent = `ERRO: ${msg}\nArquivo: ${url}\nLinha: ${line}:${col}\nStack: ${err?.stack || 'N/A'}`;
  detalhes.append(resumo, pre);
  card.append(titulo, texto, botao, detalhes);
  box.append(card);
  document.body.append(box);
};

import React from 'react';
import ReactDOM from 'react-dom/client';
import AppEpona from './app';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppEpona />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
