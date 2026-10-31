// halloween.jsx — Decoração de Halloween só em 31/10/2026; some sozinha à
// meia-noite (mesmo com o app aberto). Fica por cima de todas as áreas, mas
// não recebe toques (pointer-events: none) — nenhum botão é coberto.
import React, { useEffect, useState } from 'react';

const ehHalloween = (d = new Date()) => d.getFullYear() === 2026 && d.getMonth() === 9 && d.getDate() === 31;

const CSS = `
@keyframes hw-voo { 0% { left: 105%; } 45% { left: -15%; } 100% { left: -15%; } }
@keyframes hw-bate { from { transform: translateY(0) rotate(-6deg); } to { transform: translateY(-7px) rotate(6deg); } }
@keyframes hw-fio { 0%, 100% { height: 16px; } 50% { height: 64px; } }
.hw-morcego { position: absolute; left: 105%; animation: hw-voo linear infinite; }
.hw-morcego > span { display: inline-block; animation: hw-bate 0.45s ease-in-out infinite alternate; }
.hw-fio { position: absolute; top: 0; width: 1px; background: rgba(70, 50, 30, 0.45); animation: hw-fio 7s ease-in-out infinite; }
.hw-fio > span { position: absolute; bottom: -15px; left: -8px; font-size: 16px; }
@media (prefers-reduced-motion: reduce) {
  .hw-morcego { display: none; }
  .hw-fio { animation: none; height: 36px; }
}
`;

const MORCEGOS = [
  { top: '14%', tamanho: 22, duracao: 13, atraso: 1 },
  { top: '30%', tamanho: 18, duracao: 17, atraso: 6 },
  { top: '8%', tamanho: 26, duracao: 22, atraso: 11 },
];

// Varal de bandeirinhas laranja / roxo / preto no alto da tela.
function Bandeirinhas() {
  const cores = ['#f97316', '#7c3aed', '#1f1f1f'];
  const n = 26;
  const passo = 400 / n;
  return (
    <svg viewBox="0 0 400 22" preserveAspectRatio="none"
      style={{ position: 'absolute', top: 0, left: 70, right: 0, width: 'calc(100% - 70px)', height: 22 }}>
      <path d="M0 3 Q200 12 400 3" stroke="#3f2d20" strokeWidth="0.8" fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const x = i * passo + 2;
        const y = 3 + 9 * (1 - Math.pow((x + passo / 2 - 200) / 200, 2)) * 0.95;
        return <polygon key={i} points={`${x},${y} ${x + passo - 4},${y} ${x + (passo - 4) / 2},${y + 11}`} fill={cores[i % 3]} opacity="0.9" />;
      })}
    </svg>
  );
}

function Teia() {
  // Teia simples no canto superior esquerdo: fios saindo do canto + arcos.
  const fios = [0, 18, 36, 54, 72, 90];
  const arcos = [18, 34, 50, 66];
  const ponto = (r, a) => [r * Math.cos((a * Math.PI) / 180), r * Math.sin((a * Math.PI) / 180)];
  return (
    <svg width="78" height="78" viewBox="0 0 78 78" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.45 }}>
      <g stroke="#5b4636" strokeWidth="0.8" fill="none">
        {fios.map(a => { const [x, y] = ponto(76, a); return <line key={a} x1="0" y1="0" x2={x} y2={y} />; })}
        {arcos.map(r => (
          <polyline key={r} points={fios.map(a => ponto(r, a).join(',')).join(' ')} />
        ))}
      </g>
    </svg>
  );
}

export function DecoracaoHalloween() {
  const [ativa, setAtiva] = useState(() => ehHalloween());

  useEffect(() => {
    if (!ativa) return undefined;
    const agora = new Date();
    const meiaNoite = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
    const t = setTimeout(() => setAtiva(false), meiaNoite - agora);
    return () => clearTimeout(t);
  }, [ativa]);

  if (!ativa) return null;
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 60 }}>
      <style>{CSS}</style>
      <Teia />
      <Bandeirinhas />
      <div className="hw-fio" style={{ right: 64, top: 8 }}><span>🕷️</span></div>
      {MORCEGOS.map((m, i) => (
        <div key={i} className="hw-morcego" style={{
          top: m.top, fontSize: m.tamanho,
          animationDuration: `${m.duracao}s`, animationDelay: `${m.atraso}s`,
        }}>
          <span>🦇</span>
        </div>
      ))}
    </div>
  );
}
