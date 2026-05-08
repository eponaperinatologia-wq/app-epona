window.onerror = (msg, url, line, col, err) => {
  const div = document.createElement('pre');
  div.style.cssText = 'position:fixed;inset:0;background:#fff;color:#c00;padding:20px;font:14px/1.4 monospace;white-space:pre-wrap;overflow:auto;z-index:9999';
  div.textContent = `ERRO: ${msg}\nArquivo: ${url}\nLinha: ${line}:${col}\nStack: ${err?.stack || 'N/A'}`;
  document.body.prepend(div);
  console.error('onerror:', msg, url, line, col, err);
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
