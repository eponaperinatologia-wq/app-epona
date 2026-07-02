// icons.jsx — Inline SVG icon set
// All 24x24, currentColor, 1.6 stroke for line icons.
import React from 'react';

const Icon = ({ name, size = 24, color = 'currentColor', style = {} }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', style };
  switch (name) {
    case 'home':
      return <svg {...props}><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/></svg>;
    case 'plus':
      return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'check':
      return <svg {...props}><path d="M5 12.5l4.5 4.5L19 7"/></svg>;
    case 'chevron-right':
      return <svg {...props}><path d="M9 6l6 6-6 6"/></svg>;
    case 'chevron-left':
      return <svg {...props}><path d="M15 6l-6 6 6 6"/></svg>;
    case 'chevron-down':
      return <svg {...props}><path d="M6 9l6 6 6-6"/></svg>;
    case 'search':
      return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>;
    case 'horse':
      // Simple horse-head silhouette
      return <svg {...props} fill={color} stroke="none"><path d="M5.5 21c0-3 1.5-5 1.5-7 0-1.5-1-2.5-1-4 0-2.5 2-5 5-5 1 0 1.5.3 2 .8.5-.4 1-.8 2-.8 1.5 0 3 1 3 2.5 0 .5-.2 1-.5 1.3.6.4 1 1 1 1.7 0 1-.5 1.5-1.5 1.5h-.5l-.5 2c-.3 1-1.5 2-3 2v6h-2v-3.5c-1 0-2-.5-2.5-1.5l-.5 1.5v3.5h-3z"/><circle cx="13.5" cy="9.5" r="0.7" fill="white"/></svg>;
    case 'user':
      return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case 'users':
      return <svg {...props}><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3 3-5.5 6-5.5s6 2.5 6 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M21 20c0-2.5-1.5-4.5-4-5.2"/></svg>;
    case 'package':
      return <svg {...props}><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>;
    case 'calendar':
      return <svg {...props}><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>;
    case 'doc':
      return <svg {...props}><path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>;
    case 'clock':
      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'settings':
      return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case 'edit':
      return <svg {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>;
    case 'minus':
      return <svg {...props}><path d="M5 12h14"/></svg>;
    case 'x':
      return <svg {...props}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'menu':
      return <svg {...props}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
    case 'bell':
      return <svg {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case 'arrow-left':
      return <svg {...props}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
    case 'sparkle':
      return <svg {...props}><path d="M12 3l1.8 5.5L19 10l-5.2 1.5L12 17l-1.8-5.5L5 10l5.2-1.5z"/></svg>;
    case 'flame':
      return <svg {...props}><path d="M12 3s4 4 4 9a4 4 0 0 1-8 0c0-2 1-3 1-3s-3 0-3-4c0 0 3 0 6-2z"/></svg>;
    case 'leaf':
      return <svg {...props}><path d="M5 19c0-9 7-15 16-15 0 9-6 16-15 16-1 0-1-.5-1-1z"/><path d="M5 19c4-4 8-7 13-10"/></svg>;
    case 'pill':
      return <svg {...props}><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-30 12 12)"/><path d="M9 6l6 12" transform="rotate(-30 12 12)"/></svg>;
    case 'horseshoe':
      return <svg {...props}><path d="M6 4v9a6 6 0 0 0 12 0V4"/><circle cx="6" cy="4" r="0.8" fill={color}/><circle cx="18" cy="4" r="0.8" fill={color}/><circle cx="7" cy="9" r="0.8" fill={color}/><circle cx="17" cy="9" r="0.8" fill={color}/><circle cx="9" cy="13" r="0.8" fill={color}/><circle cx="15" cy="13" r="0.8" fill={color}/></svg>;
    case 'truck':
      return <svg {...props}><path d="M2 7h11v10H2zM13 10h5l3 3v4h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>;
    case 'stethoscope':
      return <svg {...props}><path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M6 3h2M12 3h2M10 13v2a4 4 0 0 0 8 0v-1"/><circle cx="18" cy="11" r="2"/></svg>;
    case 'bed':
      return <svg {...props}><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 14h18M3 18v3M21 18v3"/><circle cx="8" cy="10" r="2"/></svg>;
    case 'wheat':
      return <svg {...props}><path d="M12 22V8M12 8c-2-2-4-2-4-2s0 2 2 4M12 8c2-2 4-2 4-2s0 2-2 4M12 14c-2-2-4-2-4-2s0 2 2 4M12 14c2-2 4-2 4-2s0 2-2 4M12 4c-1-1-2-1-2-1s0 1 1 2M12 4c1-1 2-1 2-1s0 1-1 2"/></svg>;
    case 'heart':
      return <svg {...props}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
    case 'copy':
      return <svg {...props}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
    case 'download':
      return <svg {...props}><path d="M12 3v13M5 16l7 7 7-7"/><path d="M3 21h18"/></svg>;
    case 'share':
      return <svg {...props}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>;
    case 'mail':
      return <svg {...props}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>;
    case 'building':
      return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M7 8h2M7 12h2M7 16h2M13 8h2M13 12h2M13 16h2M10 21V3"/></svg>;
    case 'cart':
      return <svg {...props}><circle cx="9" cy="20" r="1.5"/><circle cx="19" cy="20" r="1.5"/><path d="M3 4h2l2 11h12l2-9H6"/></svg>;
    case 'trash':
      return <svg {...props}><path d="M4 7h16M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12"/></svg>;
    case 'medical-cross':
      // Cruz vermelha clássica
      return <svg {...props} fill={color} stroke="none"><path d="M10 3h4a1 1 0 011 1v5h5a1 1 0 011 1v4a1 1 0 01-1 1h-5v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5H4a1 1 0 01-1-1v-4a1 1 0 011-1h5V4a1 1 0 011-1z"/></svg>;
    case 'sperm-egg':
      // Só o óvulo — centralizado e maior. Membrana + núcleo pontilhado.
      return <svg {...props}>
        <circle cx="12" cy="12" r="8.5"/>
        <circle cx="12" cy="12" r="4" strokeDasharray="1.5 2"/>
      </svg>;
    case 'syringe':
      // Seringa horizontal apontando pra esquerda: agulha + corpo + êmbolo
      return <svg {...props}>
        <path d="M2 12h3"/>
        <rect x="5" y="9" width="10" height="6" rx="0.5"/>
        <path d="M8 9.5v1M10 9.5v1M12 9.5v1"/>
        <path d="M15 12h4"/>
        <path d="M19 9v6"/>
      </svg>;
    case 'worm':
      // Verme ondulado com cabeça
      return <svg {...props}>
        <path d="M3 15 Q6 9 9 15 T15 15 T21 15"/>
        <circle cx="21" cy="14.5" r="1.3" fill={color}/>
        <circle cx="21.5" cy="14" r="0.4" fill="white" stroke="none"/>
      </svg>;
    case 'bar-chart':
      // Gráfico de barras crescente
      return <svg {...props}>
        <rect x="4" y="14" width="3" height="6" rx="0.5" fill={color} stroke="none"/>
        <rect x="10" y="10" width="3" height="10" rx="0.5" fill={color} stroke="none"/>
        <rect x="16" y="6" width="3" height="14" rx="0.5" fill={color} stroke="none"/>
        <path d="M3 20h18"/>
      </svg>;
    case 'test-tube':
      // Tubo de coleta com sangue no fundo
      return <svg {...props}>
        <path d="M9 3h6M10 3v14a2 2 0 004 0V3"/>
        <path d="M10 11c2 1 2 1 4 0v6a2 2 0 01-4 0z" fill={color} stroke="none"/>
        <path d="M10 11c2 1 2 1 4 0"/>
      </svg>;
    case 'clipboard':
      // Prancheta com linhas de texto (documento clínico)
      return <svg {...props}>
        <rect x="5" y="5" width="14" height="17" rx="2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <path d="M9 12h6M9 15h6M9 18h4"/>
      </svg>;
    default:
      return <svg {...props}><circle cx="12" cy="12" r="9"/></svg>;
  }
};

// Map insumo categoria → icon name
const CATEGORIA_ICONS = {
  racao: 'wheat',
  suplemento: 'sparkle',
  medicamento: 'pill',
  ferradura: 'horseshoe',
  cama: 'bed',
  veterinario: 'stethoscope',
  transporte: 'truck',
  descartavel: 'x',
  oleo: 'leaf',
};

export { Icon, CATEGORIA_ICONS };
