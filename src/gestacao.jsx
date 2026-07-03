// gestacao.jsx — Gestação e Partos: gestantes, detalhe e acompanhamento mensal
import React, { useState, useMemo, useEffect } from 'react';
import { Icon } from './icons';
import { norm, addDescartaveis } from './data';
import { TopBar } from './screens';
import { calcAgendaVac, calcAgendaVerm } from './veterinaria';

// ── Helpers ───────────────────────────────────────────────────
const pad2 = n => String(n).padStart(2, '0');
const toDateStr = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const fmtDate = ds => { if (!ds) return '—'; const [y,m,d] = ds.split('-'); return `${parseInt(d)}/${parseInt(m)}/${y}`; };
const fmtCurrency = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export const previsaoParto = dataCobricao => {
  if (!dataCobricao) return null;
  const d = new Date(dataCobricao + 'T12:00:00');
  d.setDate(d.getDate() + 330);
  return toDateStr(d);
};

export const diasAteParto = dataCobricao => {
  const prev = previsaoParto(dataCobricao);
  if (!prev) return null;
  return Math.ceil((new Date(prev+'T12:00:00') - new Date()) / 86400000);
};

const mesDaGestacao = dataCobricao => {
  if (!dataCobricao) return 0;
  const diff = Math.floor((new Date() - new Date(dataCobricao+'T12:00:00')) / 86400000);
  return Math.min(Math.max(Math.floor(diff / 30), 0), 11);
};

// Campos ultra (do 3º mês em diante). JUP saiu — só entra a partir do 4º mês
// e como o usuário pediu, ficou removido dos meses iniciais. Mantido em 4-11.
const CAMPOS_ULTRA_BASE = [
  { key: 'liquidoAmniotico',    label: 'Aspecto líquido amniótico',   tipo: 'text' },
  { key: 'liquidoAlantoideano', label: 'Aspecto líquido alantoideano', tipo: 'text' },
  // Órbita ocular: 3 medidas em uma linha. orbitaLargura é o "âncora"
  // do grupo — os outros dois (altura, volume) são renderizados junto
  // sob esse item e ficam pulados na iteração.
  { key: 'orbitaLargura',       label: 'Órbita ocular',                tipo: 'group-orbita' },
  { key: 'orbitaAltura',        label: '',                             tipo: 'skip' },
  { key: 'orbitaVolume',        label: '',                             tipo: 'skip' },
  { key: 'aorta',               label: 'Artéria aorta (mm)',           tipo: 'number' },
  { key: 'freqCardiaca',        label: 'Frequência cardíaca (bpm)',    tipo: 'number' },
  { key: 'biparietal',          label: 'Espaço biparietal (mm)',       tipo: 'number' },
];
const CAMPO_JUP = { key: 'jup', label: 'JUP (mm)', tipo: 'number' };
const CAMPO_OBS = { key: 'obs', label: 'Observações', tipo: 'textarea' };

// Retorna os campos ultra pra um dado mês. JUP entra a partir do 3º mês.
function camposUltraDoMes(mes) {
  const inclui = [...CAMPOS_ULTRA_BASE];
  if (mes >= 3) inclui.push(CAMPO_JUP);
  inclui.push(CAMPO_OBS);
  return inclui;
}

// Meses 0, 1 e 2 têm palpações múltiplas com esses campos.
const CAMPOS_PALPACAO = [
  { key: 'tamanhoVesicula',    label: 'Tamanho da vesícula',       tipo: 'text' },
  { key: 'aspectoUterino',     label: 'Aspecto uterino',           tipo: 'text' },
  { key: 'presencaCL',         label: 'Presença de CL',            tipo: 'simnao' },
  { key: 'iniciarProgesterona',label: 'Iniciar Progesterona',      tipo: 'check' },
  { key: 'batimentoCardiaco',  label: 'Presença de Batimento Cardíaco', tipo: 'simnao' },
  { key: 'obs',                label: 'Observações',               tipo: 'textarea' },
];

const PALPACAO_VAZIA = { data: '', tamanhoVesicula: '', aspectoUterino: '', presencaCL: '', iniciarProgesterona: false, batimentoCardiaco: '', obs: '' };

const SEXAGEM_OPTIONS = [
  { value: 'macho',      label: '♂ Macho',     color: '#1e40af', bg: '#dbeafe' },
  { value: 'femea',      label: '♀ Fêmea',     color: '#9d174d', bg: '#fce7f3' },
  { value: 'indefinido', label: '? Indefinido', color: '#6b7280', bg: '#f3f4f6' },
];

const ACOMP_VAZIO = { liquidoAmniotico:'', liquidoAlantoideano:'', orbitaLargura:'', orbitaAltura:'', orbitaVolume:'', aorta:'', freqCardiaca:'', biparietal:'', jup:'', obs:'' };

// Meses com palpações múltiplas em vez do formulário único de ultrassom.
const MESES_PALPACAO = new Set([0, 1, 2]);
// Estática Fetal só aparece a partir do 8º mês.
const MES_ESTATICA_FETAL = 8;

// Detecta se a égua tem alguma palpação com estatica_fetal='posterior' num
// mês >=8. Serve tanto pra alerta na card quanto no header da tela.
export function temApresentacaoPosterior(cavalo) {
  const acomp = cavalo?.gestacao?.acompanhamento || {};
  for (let mes = MES_ESTATICA_FETAL; mes <= 11; mes++) {
    const dados = acomp[mes];
    if (dados && dados.estaticaFetal === 'posterior') return true;
  }
  return false;
}

// ── JUP: análise de placenta ────────────────────────────────
// Referência clínica por MÊS de gestação. Abaixo do min sugere
// Placenta Insuficiente, acima do max sugere Placentite.
const JUP_REFS_POR_MES = {
  3:  { min: 2.1, max: 4.4 },
  4:  { min: 2.3, max: 4.7 },
  5:  { min: 3.5, max: 5.4 },
  6:  { min: 4.0, max: 6.0 },
  7:  { min: 4.5, max: 7.4 },
  8:  { min: 5.0, max: 7.9 },
  9:  { min: 5.5, max: 8.0 },
  10: { min: 7.5, max: 10.0 },
  11: { min: 8.0, max: 12.6 },
};

function _refJupPorMes(mes) {
  return JUP_REFS_POR_MES[mes] || null;
}

function _classificarJup(mes, valorMm) {
  if (valorMm === '' || valorMm == null) return null;
  const v = parseFloat(valorMm);
  if (isNaN(v)) return null;
  const ref = _refJupPorMes(mes);
  if (!ref) return null;
  if (v < ref.min) return 'insuficiencia';
  if (v > ref.max) return 'placentite';
  return 'normal';
}

// Retorna { mes, valor, status } da MEDIÇÃO MAIS RECENTE de JUP, ou null
// se ainda não há medição. Se o último valor voltou à normalidade, o
// status é 'normal' — alerta somem sozinhos.
export function analisarJupCavalo(cavalo) {
  const acomp = cavalo?.gestacao?.acompanhamento || {};
  for (let mes = 11; mes >= 3; mes--) {
    const dados = acomp[mes];
    if (!dados) continue;
    if (dados.jup === '' || dados.jup == null) continue;
    const status = _classificarJup(mes, dados.jup);
    return { mes, valor: parseFloat(dados.jup), status };
  }
  return null;
}

// ── Frequência Cardíaca fetal ──────────────────────────────
// Faixa esperada por mês. Fora da faixa = alteração leve
// (destaca a caixa + texto sutil + chip no acordeão).
const FC_REFS_POR_MES = {
  3:  { min: 120, max: 145 },
  4:  { min: 120, max: 145 },
  5:  { min: 104, max: 122 },
  6:  { min: 100, max: 122 },
  7:  { min: 100, max: 112 },
  8:  { min: 85,  max: 98 },
  9:  { min: 79,  max: 94 },
  10: { min: 64,  max: 80 },
  11: { min: 60,  max: 72 },
};

function _refFcPorMes(mes) { return FC_REFS_POR_MES[mes] || null; }

function _classificarFc(mes, valorBpm) {
  if (valorBpm === '' || valorBpm == null) return null;
  const v = parseFloat(valorBpm);
  if (isNaN(v)) return null;
  const ref = _refFcPorMes(mes);
  if (!ref) return null;
  if (v < ref.min) return 'baixa';
  if (v > ref.max) return 'alta';
  return 'normal';
}

// Alerta crítico (banner grande, tipo placentite):
// - Meses 3-10: FC < 57 → Bradicardia muito acentuada
// - Mês 11: FC < 50 → Bradicardia muito acentuada
// - Mês 11: FC > 100 → Taquicardia muito acentuada
function _classificarFcCritico(mes, valorBpm) {
  const v = parseFloat(valorBpm);
  if (isNaN(v)) return null;
  if (mes === 11) {
    if (v < 50) return 'bradicardia';
    if (v > 100) return 'taquicardia';
    return null;
  }
  if (mes >= 3 && mes <= 10) {
    if (v < 57) return 'bradicardia';
  }
  return null;
}

// Retorna { mes, valor, critico } da medição mais recente com FC crítica,
// ou null. Segue a mesma lógica do JUP — só a última medição conta, se
// normalizou não alerta.
export function analisarFcCritico(cavalo) {
  const acomp = cavalo?.gestacao?.acompanhamento || {};
  for (let mes = 11; mes >= 3; mes--) {
    const dados = acomp[mes];
    if (!dados) continue;
    if (dados.freqCardiaca === '' || dados.freqCardiaca == null) continue;
    const crit = _classificarFcCritico(mes, dados.freqCardiaca);
    // Retorna sempre o último mês com FC preenchida (com ou sem crítico)
    // — se o último não é crítico, alerta some.
    return { mes, valor: parseFloat(dados.freqCardiaca), critico: crit };
  }
  return null;
}

// ── Órbita fetal ──────────────────────────────────────────
// Volume tem prioridade sobre largura. Regra:
// - fora de ±20% do esperado → alerta sutil (chip OF ↑/↓ + msg)
// - abaixo de 30% do esperado → alerta grande (Restrição Crescimento
//   Intrauterino)
// Faixas por mês. Quando o valor é único (não range), min=max.
const OF_LARGURA_REF_MM = {
  3:  { min: 11.0, max: 13.0 },
  4:  { min: 15.3, max: 15.3 },
  5:  { min: 19.1, max: 19.1 },
  6:  { min: 22.5, max: 22.5 },
  7:  { min: 25.3, max: 25.3 },
  8:  { min: 27.5, max: 27.5 },
  9:  { min: 29.2, max: 29.2 },
  10: { min: 30.4, max: 30.4 },
  11: { min: 31.0, max: 31.0 },
};
const OF_VOLUME_REF_CM3 = {
  3:  { min: 1.5,  max: 2.0 },
  4:  { min: 3.5,  max: 3.5 },
  5:  { min: 7.0,  max: 7.0 },
  6:  { min: 11.5, max: 11.5 },
  7:  { min: 16.5, max: 16.5 },
  8:  { min: 21.0, max: 21.0 },
  9:  { min: 25.5, max: 25.5 },
  10: { min: 29.5, max: 29.5 },
  11: { min: 32.0, max: 35.0 },
};

// Volume calculado a partir de altura e largura (mm): (a² × l) / 1000.
export function calcularVolumeOrbita(alturaMm, larguraMm) {
  const a = parseFloat(alturaMm);
  const l = parseFloat(larguraMm);
  if (isNaN(a) || isNaN(l) || a <= 0 || l <= 0) return null;
  return +(a * a * l / 1000).toFixed(2);
}

// Escolhe qual referência usar (volume tem prioridade). Retorna
// { valor, ref, tipo } ou null se não há medida.
function _medidaOfDe(dados, mes) {
  const vol = parseFloat(dados?.orbitaVolume);
  if (!isNaN(vol) && vol > 0) {
    const ref = OF_VOLUME_REF_CM3[mes];
    if (ref) return { valor: vol, ref, tipo: 'volume', unidade: 'cm³' };
  }
  const larg = parseFloat(dados?.orbitaLargura);
  if (!isNaN(larg) && larg > 0) {
    const ref = OF_LARGURA_REF_MM[mes];
    if (ref) return { valor: larg, ref, tipo: 'largura', unidade: 'mm' };
  }
  return null;
}

// Classifica em: 'critico' (< 70% do min), 'baixa' (< 80% do min),
// 'alta' (> 120% do max), 'normal'. null se não há medida ou ref.
function _classificarOf(mes, dados) {
  const med = _medidaOfDe(dados, mes);
  if (!med) return null;
  const { valor, ref } = med;
  if (valor < ref.min * 0.7) return { ...med, classe: 'critico' };
  if (valor > ref.max * 1.2) return { ...med, classe: 'alta' };
  if (valor < ref.min * 0.8) return { ...med, classe: 'baixa' };
  return { ...med, classe: 'normal' };
}

// Última medição da OF em que foi classificado como crítico ('critico').
// Se a última for normal/alta/baixa, retorna essa — assim o alerta grande
// some quando o próximo mês normaliza.
export function analisarOfCritico(cavalo) {
  const acomp = cavalo?.gestacao?.acompanhamento || {};
  for (let mes = 11; mes >= 3; mes--) {
    const dados = acomp[mes];
    if (!dados) continue;
    const res = _classificarOf(mes, dados);
    if (!res) continue;
    return { mes, ...res };
  }
  return null;
}

// ── Aorta fetal ──────────────────────────────────────────
// Referência (valor único por mês, mm). Faixas:
// - > +15% da referência → 'alta' (chip sutil)
// - até -15% da referência → 'baixa' (chip sutil)
// - -20% ou mais → 'critico' (banner grande 'Restrição de Crescimento
//   Intrauterino' — mesma msg que a OF crítica).
const AORTA_REF_POR_MES_MM = {
  3: 3.2, 4: 5.5, 5: 7.8, 6: 10.1, 7: 12.4,
  8: 14.7, 9: 17.1, 10: 19.4, 11: 21.7,
};

function _refAortaPorMes(mes) { return AORTA_REF_POR_MES_MM[mes] || null; }

function _classificarAorta(mes, valorMm) {
  if (valorMm === '' || valorMm == null) return null;
  const v = parseFloat(valorMm);
  if (isNaN(v)) return null;
  const ref = _refAortaPorMes(mes);
  if (!ref) return null;
  if (v <= ref * 0.80) return 'critico'; // ≥ 20% abaixo
  if (v <  ref * 0.85) return 'baixa';    // até 15% abaixo (aceita a faixa 15-20% como sutil)
  if (v >  ref * 1.15) return 'alta';     // > 15% acima
  return 'normal';
}

// Última medição de aorta. Retorna { mes, valor, status } ou null.
export function analisarAortaCritica(cavalo) {
  const acomp = cavalo?.gestacao?.acompanhamento || {};
  for (let mes = 11; mes >= 3; mes--) {
    const dados = acomp[mes];
    if (!dados) continue;
    if (dados.aorta === '' || dados.aorta == null) continue;
    const status = _classificarAorta(mes, dados.aorta);
    return { mes, valor: parseFloat(dados.aorta), status };
  }
  return null;
}

// ── Desenvolvimento fetal ──────────────────────────────────────
// SVGs sketch progressivos: silhueta do feto em posição curva, com
// detalhes aumentando por fase. Todos os traços são livres (stroke) —
// sem preenchimento — pra dar o aspecto de desenho a lápis.
const _skC = { stroke:'#3f3f46', strokeWidth:1.4, strokeLinecap:'round', strokeLinejoin:'round', fill:'none' };
const _skB = { stroke:'#3f3f46', strokeWidth:1.8, strokeLinecap:'round', strokeLinejoin:'round', fill:'none' };
const _skHint = { stroke:'#a1a1aa', strokeWidth:1, strokeLinecap:'round', strokeLinejoin:'round', fill:'none' };
const svgWrapProps = { viewBox: '0 0 200 200', style: { width: '100%', height: '100%', maxWidth: 160, maxHeight: 160 } };

// Fase 1 — 45-52 dias · Azeitona · ~2 cm (imagem real)
const SvgFase1 = () => (
  <img
    src="/assets/feto/fase1.png"
    alt="Feto de 45 a 52 dias — tamanho de azeitona"
    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
  />
);

// Fase 2 — 53-55 dias · Noz Pecan · ~2,5 cm
const SvgFase2 = () => (
  <svg {...svgWrapProps}>
    <path d="M40 100 q-2 -22 22 -32 q30 -12 55 4 q22 14 20 40 q-2 24 -22 34 q-30 14 -55 -2 q-18 -12 -20 -44 z" {..._skC} />
    <circle cx="60" cy="82" r="14" {..._skC} />
    <path d="M52 74 q0 -6 4 -8" {..._skHint} />
    <path d="M62 72 q4 -6 8 -6" {..._skHint} />
    <circle cx="56" cy="82" r="1.8" fill="#3f3f46" />
    <path d="M78 88 q6 4 12 2" {..._skHint} />
    <path d="M82 100 q10 4 20 2" {..._skHint} />
    <path d="M86 108 q10 6 22 4" {..._skHint} />
    <path d="M96 132 q-2 14 4 22" {..._skC} />
    <path d="M108 134 q0 14 6 22" {..._skC} />
    <path d="M116 122 q10 6 12 16" {..._skC} />
    <path d="M118 108 q10 0 14 8" {..._skC} />
    <path d="M126 94 q10 -6 6 -18" {..._skC} />
  </svg>
);

// Fase 3 — 56-79 dias · Hamster · ~6 cm, 20g
const SvgFase3 = () => (
  <svg {...svgWrapProps}>
    <path d="M45 92 q4 -30 40 -34 q40 -4 60 20 q18 20 12 46 q-6 22 -30 30 q-30 10 -55 -6 q-30 -20 -27 -56 z" {..._skB} />
    <path d="M58 78 q-6 -8 -2 -18 q4 -8 16 -8 q10 0 14 8 q4 8 -2 18" {..._skC} />
    <path d="M52 66 q4 -8 4 -12" {..._skC} />
    <path d="M74 62 q2 -8 6 -10" {..._skC} />
    <circle cx="60" cy="80" r="2" fill="#3f3f46" />
    <path d="M62 90 q4 4 10 2" {..._skC} />
    <path d="M98 130 q-4 16 2 26" {..._skC} />
    <path d="M113 132 q-2 16 4 26" {..._skC} />
    <path d="M118 124 q14 4 16 18" {..._skC} />
    <path d="M120 108 q12 -2 18 10" {..._skC} />
    <circle cx="103" cy="160" r="3" {..._skC} />
    <circle cx="119" cy="160" r="3" {..._skC} />
    <circle cx="134" cy="144" r="3" {..._skC} />
    <circle cx="140" cy="120" r="3" {..._skC} />
    <path d="M144 92 q14 -12 4 -26 q-6 -10 -4 6" {..._skC} />
  </svg>
);

// Fase 4 — 80-99 dias · Esquilo · ~10 cm, 50g
const SvgFase4 = () => (
  <svg {...svgWrapProps}>
    <path d="M32 100 q0 -34 36 -46 q40 -12 66 12 q22 20 18 48 q-6 22 -30 32 q-32 12 -60 -4 q-30 -18 -30 -42 z" {..._skB} />
    <path d="M52 72 q-6 -10 2 -22 q10 -14 26 -8 q10 4 14 14 q4 10 -4 20" {..._skC} />
    <path d="M46 58 q4 -12 8 -14" {..._skC} />
    <path d="M74 52 q0 -12 4 -14" {..._skC} />
    <circle cx="60" cy="76" r="2" fill="#3f3f46" />
    <path d="M62 88 q6 4 12 2" {..._skC} />
    <path d="M78 78 q10 2 22 12" {..._skHint} />
    <path d="M100 90 q6 20 -2 40" {..._skHint} />
    <path d="M96 138 q-8 18 -2 30" {..._skC} />
    <path d="M114 138 q-4 18 4 30" {..._skC} />
    <path d="M120 122 q14 4 20 20" {..._skC} />
    <path d="M124 106 q14 -2 22 12" {..._skC} />
    <circle cx="98" cy="172" r="3.5" {..._skC} />
    <circle cx="118" cy="172" r="3.5" {..._skC} />
    <circle cx="142" cy="146" r="3.5" {..._skC} />
    <circle cx="148" cy="122" r="3.5" {..._skC} />
    <path d="M152 100 q18 -10 8 -30 q-6 -12 -6 8" {..._skC} />
  </svg>
);

// Fase 5 — 100-149 dias · Gatinho · ~18 cm, 500g
const SvgFase5 = () => (
  <svg {...svgWrapProps}>
    <path d="M28 108 q-2 -40 44 -54 q46 -12 74 16 q22 22 18 50 q-6 22 -32 32 q-38 14 -68 -6 q-34 -22 -36 -38 z" {..._skB} />
    <path d="M48 70 q-6 -14 4 -28 q14 -18 32 -10 q12 4 16 16 q4 10 -6 22" {..._skC} />
    <path d="M42 52 q4 -14 12 -18" {..._skB} />
    <path d="M46 56 q0 -8 4 -10" {..._skC} />
    <path d="M76 44 q2 -14 10 -14" {..._skB} />
    <path d="M78 48 q0 -8 4 -10" {..._skC} />
    <circle cx="60" cy="74" r="2.2" fill="#3f3f46" />
    <path d="M64 78 q-2 3 -4 4" {..._skC} />
    <path d="M62 88 q8 4 14 2" {..._skC} />
    <path d="M74 90 q4 2 10 2" {..._skHint} />
    <path d="M64 92 q2 -1 4 0" {..._skHint} />
    <path d="M66 94 q2 -1 4 0" {..._skHint} />
    <path d="M84 78 q14 -2 26 12" {..._skHint} />
    <path d="M112 92 q8 22 -2 42" {..._skHint} />
    <path d="M98 142 q-8 20 0 34" {..._skC} />
    <path d="M118 142 q-4 20 6 34" {..._skC} />
    <path d="M124 124 q16 4 22 22" {..._skC} />
    <path d="M128 108 q16 -2 24 14" {..._skC} />
    <circle cx="98" cy="180" r="4" {..._skC} />
    <circle cx="122" cy="180" r="4" {..._skC} />
    <circle cx="148" cy="150" r="4" {..._skC} />
    <circle cx="154" cy="124" r="4" {..._skC} />
    <path d="M158 102 q22 -10 8 -34 q-4 -12 -8 8" {..._skC} />
  </svg>
);

// Fase 6 — 150-179 dias · Coelho · ~30 cm, 2,7 kg
const SvgFase6 = () => (
  <svg {...svgWrapProps}>
    <path d="M24 110 q-4 -44 48 -58 q52 -14 82 18 q22 22 20 50 q-4 24 -34 34 q-42 14 -74 -6 q-38 -22 -42 -38 z" {..._skB} />
    <path d="M46 68 q-8 -14 4 -30 q16 -20 34 -10 q14 6 18 18 q4 12 -6 24" {..._skC} />
    <path d="M40 46 q6 -18 14 -20" {..._skB} />
    <path d="M76 38 q2 -18 12 -18" {..._skB} />
    <circle cx="60" cy="74" r="2.2" fill="#3f3f46" />
    <path d="M64 80 q-2 3 -4 4" {..._skC} />
    <path d="M64 90 q10 3 16 0" {..._skC} />
    <path d="M50 82 q-3 0 -5 2" {..._skHint} />
    <path d="M52 86 q-3 0 -5 2" {..._skHint} />
    <path d="M56 92 q-3 2 -5 4" {..._skHint} />
    <path d="M76 94 q3 0 5 2" {..._skHint} />
    <path d="M78 98 q3 0 5 2" {..._skHint} />
    <path d="M86 78 q16 -4 30 12" {..._skHint} />
    <path d="M118 96 q10 22 -2 46" {..._skHint} />
    <path d="M100 148 q-10 20 -2 38" {..._skC} />
    <path d="M122 148 q-4 20 8 38" {..._skC} />
    <path d="M128 128 q18 4 24 22" {..._skC} />
    <path d="M132 110 q18 -2 26 14" {..._skC} />
    <circle cx="98" cy="188" r="4.5" {..._skC} />
    <circle cx="128" cy="188" r="4.5" {..._skC} />
    <circle cx="154" cy="154" r="4.5" {..._skC} />
    <circle cx="160" cy="128" r="4.5" {..._skC} />
    <path d="M164 108 q28 -10 8 -38 q-4 -14 -10 10" {..._skC} />
  </svg>
);

// Fase 7 — 180-239 dias · Beagle · ~50 cm, 11 kg
const SvgFase7 = () => (
  <svg {...svgWrapProps}>
    <path d="M20 112 q-4 -50 54 -62 q56 -12 88 22 q22 24 20 52 q-4 24 -38 34 q-46 14 -80 -6 q-40 -22 -44 -40 z" {..._skB} />
    <path d="M44 66 q-10 -14 4 -32 q18 -22 38 -10 q14 6 18 20 q4 12 -6 26" {..._skC} />
    <path d="M38 42 q6 -22 16 -22" {..._skB} />
    <path d="M74 34 q2 -20 14 -20" {..._skB} />
    <path d="M42 42 q-2 -14 4 -18" {..._skC} />
    <path d="M76 34 q-2 -14 4 -18" {..._skC} />
    <path d="M42 34 q3 -4 6 -2" {..._skC} />
    <path d="M46 30 q3 -4 6 -2" {..._skC} />
    <path d="M50 26 q3 -4 6 -2" {..._skC} />
    <circle cx="60" cy="74" r="2.4" fill="#3f3f46" />
    <path d="M66 80 q-2 4 -4 5" {..._skC} />
    <path d="M64 90 q10 3 16 0" {..._skC} />
    <path d="M46 82 q-4 0 -6 2" {..._skHint} />
    <path d="M48 86 q-4 0 -6 2" {..._skHint} />
    <path d="M52 92 q-4 0 -6 2" {..._skHint} />
    <path d="M76 94 q4 0 6 2" {..._skHint} />
    <path d="M78 100 q4 0 6 2" {..._skHint} />
    <path d="M88 78 q18 -4 34 14" {..._skHint} />
    <path d="M124 100 q10 22 -4 48" {..._skHint} />
    <path d="M102 154 q-10 20 -2 40" {..._skC} />
    <path d="M126 154 q-4 20 10 40" {..._skC} />
    <path d="M132 132 q20 4 26 24" {..._skC} />
    <path d="M136 112 q20 -2 30 16" {..._skC} />
    <circle cx="98" cy="196" r="5" {..._skC} />
    <circle cx="134" cy="196" r="5" {..._skC} />
    <circle cx="160" cy="158" r="5" {..._skC} />
    <circle cx="168" cy="130" r="5" {..._skC} />
    <path d="M170 110 q30 -10 10 -40 q-6 -16 -10 12" {..._skB} />
    <path d="M180 130 q6 4 4 12" {..._skHint} />
    <path d="M182 138 q6 4 4 12" {..._skHint} />
    <path d="M182 146 q6 4 4 12" {..._skHint} />
  </svg>
);

// Fase 8 — 240-363 dias · Cordeirinho · ~60 cm, 20 kg
const SvgFase8 = () => (
  <svg {...svgWrapProps}>
    <path d="M18 114 q-6 -54 58 -66 q60 -12 92 24 q24 26 20 54 q-2 26 -40 36 q-48 14 -84 -6 q-40 -22 -46 -42 z" {..._skB} />
    <path d="M42 62 q-10 -14 4 -34 q20 -24 42 -10 q14 8 18 22 q4 14 -8 28" {..._skB} />
    <path d="M34 38 q8 -24 20 -22" {..._skB} />
    <path d="M74 30 q4 -22 16 -20" {..._skB} />
    <path d="M40 38 q-4 -14 2 -18" {..._skC} />
    <path d="M78 30 q-4 -14 2 -18" {..._skC} />
    <path d="M40 30 q2 -6 5 -4" {..._skC} />
    <path d="M44 24 q2 -6 5 -4" {..._skC} />
    <path d="M48 18 q2 -6 5 -4" {..._skC} />
    <path d="M52 14 q3 -4 6 -4" {..._skC} />
    <circle cx="60" cy="72" r="2.6" fill="#3f3f46" />
    <path d="M66 78 q-2 4 -4 5" {..._skC} />
    <path d="M62 82 q-1 2 -2 3" {..._skHint} />
    <path d="M64 90 q10 4 16 0" {..._skC} />
    <path d="M44 80 q-6 0 -8 3" {..._skHint} />
    <path d="M46 84 q-6 0 -8 3" {..._skHint} />
    <path d="M50 90 q-6 0 -8 3" {..._skHint} />
    <path d="M76 94 q5 0 7 2" {..._skHint} />
    <path d="M78 100 q5 0 7 2" {..._skHint} />
    <path d="M80 106 q5 0 7 2" {..._skHint} />
    <path d="M90 78 q20 -4 36 16" {..._skHint} />
    <path d="M128 102 q12 24 -4 52" {..._skHint} />
    <path d="M104 158 q-10 22 -2 42" {..._skB} />
    <path d="M130 158 q-4 22 12 42" {..._skB} />
    <path d="M136 134 q22 4 28 26" {..._skB} />
    <path d="M140 114 q22 -2 32 18" {..._skB} />
    <circle cx="100" cy="200" r="5.5" {..._skC} />
    <circle cx="138" cy="200" r="5.5" {..._skC} />
    <circle cx="164" cy="162" r="5.5" {..._skC} />
    <circle cx="172" cy="134" r="5.5" {..._skC} />
    <path d="M176 112 q34 -12 12 -46 q-6 -18 -12 14" {..._skB} />
    <path d="M186 130 q6 4 4 14" {..._skHint} />
    <path d="M188 138 q6 4 4 14" {..._skHint} />
    <path d="M188 146 q6 4 4 14" {..._skHint} />
    <path d="M188 154 q6 4 4 14" {..._skHint} />
    <path d="M40 42 q-4 4 -3 8" {..._skHint} />
    <path d="M36 46 q-4 4 -3 8" {..._skHint} />
    <path d="M40 52 q-4 4 -3 8" {..._skHint} />
  </svg>
);

// Definição das fases. min/max em DIAS de gestação.
const FASES_FETO = [
  { min: 45,  max: 52,  frase: 'O feto está do tamanho de uma azeitona!',   medidas: 'Cerca de 2 cm',
    descricao: 'A vesícula agora tem 6,3 cm de diâmetro. O embrião de 2 cm é reconhecível como uma criatura de quatro patas. Possui cabeça, pálpebras, orelhas rudimentares, cotovelos funcionais e articulações do joelho.',
    Svg: SvgFase1 },
  { min: 53,  max: 55,  frase: 'O feto está do tamanho de uma noz pecan!',  medidas: 'Cerca de 2,5 cm',
    descricao: 'O embrião tem pouco mais de 2,5 cm. Pequenas costelas são visíveis sob a pele, a cabeça desenvolveu um crânio distinto. Pequenos triângulos representam as orelhas; articulações do jarrete e boleto se desenvolveram.',
    Svg: SvgFase2 },
  { min: 56,  max: 79,  frase: 'O feto está do tamanho de um hamster!',     medidas: 'Cerca de 6 cm e 20 g',
    descricao: 'O feto tem cerca de 6,3 cm. Assemelha-se claramente a um cavalo, com cascos minúsculos, solas e ranilhas. Não tem pelos.',
    Svg: SvgFase3 },
  { min: 80,  max: 99,  frase: 'O feto está do tamanho de um esquilo!',     medidas: 'Cerca de 10 cm e 50 g',
    descricao: 'A cabeça e o pescoço se separam e estão nivelados com a coluna. O sexo está definido (pequenos caroços para escroto ou úbere).',
    Svg: SvgFase4 },
  { min: 100, max: 149, frase: 'O feto está do tamanho de um gatinho!',     medidas: 'Quase 18 cm e 0,5 kg',
    descricao: 'O feto tem cerca de 18 cm. Um pouco de pelo surge nos lábios, as orelhas estão desamassando da cabeça, com quase 1,5 cm de comprimento e enroladas para a frente.',
    Svg: SvgFase5 },
  { min: 150, max: 179, frase: 'O feto está do tamanho de um coelho!',      medidas: 'Cerca de 30 cm e 2,7 kg',
    descricao: 'Ganhando mais de meio quilo a cada 10 dias. Pelos enfeitam o queixo, focinho e pálpebras. Cílios já surgiram.',
    Svg: SvgFase6 },
  { min: 180, max: 239, frase: 'O feto está do tamanho de um beagle!',      medidas: 'Quase 50 cm e mais de 11 kg',
    descricao: 'O feto quadruplicou seu peso em apenas 30 dias. Os pelos da crina e da cauda apareceram.',
    Svg: SvgFase7 },
  { min: 240, max: 363, frase: 'O feto está do tamanho de um cordeirinho!', medidas: 'Cerca de 60 cm e 20 kg',
    descricao: 'Está quase lá, já parecendo com um potro completo e se desenvolvendo para o nascimento.',
    Svg: SvgFase8 },
];

// Retorna a fase atual dado a data de cobrição. null se ainda muito cedo (<45d).
function faseDoFeto(dataCobricao) {
  if (!dataCobricao) return null;
  const inicio = new Date(dataCobricao + 'T12:00:00');
  const dias = Math.floor((new Date() - inicio) / 86400000);
  if (dias < FASES_FETO[0].min) return { antesInicio: true, dias };
  const fase = FASES_FETO.find(f => dias >= f.min && dias <= f.max);
  if (!fase) return { fase: FASES_FETO[FASES_FETO.length - 1], dias, fim: true };
  return { fase, dias };
}

function BoxDesenvolvimentoFetal({ dataCobricao }) {
  const info = faseDoFeto(dataCobricao);
  if (!info) return null;
  const { fase, dias, antesInicio } = info;

  return (
    <div style={{
      background:'var(--card)', border:'1px solid var(--line)', borderRadius:14,
      padding:'14px', marginBottom:14,
    }}>
      <div style={{
        fontSize:12, fontWeight:700, color:'var(--ink-3)',
        textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10,
      }}>Desenvolvimento fetal</div>

      {antesInicio ? (
        <div style={{ padding:'20px 8px', textAlign:'center' }}>
          <div style={{ fontSize:26, marginBottom:4 }}>🌱</div>
          <div style={{ fontSize:13, color:'var(--ink-2)', marginBottom:2 }}>
            {dias >= 0 ? `${dias} dia${dias!==1?'s':''}` : `${Math.abs(dias)} dia${Math.abs(dias)!==1?'s':''} até a cobrição`}
          </div>
          <div style={{ fontSize:12, color:'var(--ink-3)', lineHeight:1.5 }}>
            Ilustrações começam a partir do 45º dia de gestação.
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
          <div style={{
            width:130, height:130, flexShrink:0, borderRadius:14,
            background:'#fafaf9', border:'1px solid #e7e5e4',
            display:'grid', placeItems:'center', padding:8,
          }}>
            <fase.Svg />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--accent)',
              textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>
              {fase.min}–{fase.max} dias · dia {dias}
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)', fontFamily:'var(--serif)', marginBottom:2, lineHeight:1.25 }}>
              {fase.frase}
            </div>
            <div style={{ fontSize:12, color:'var(--ink-2)', marginBottom:8 }}>
              {fase.medidas}
            </div>
            <div style={{ fontSize:12, color:'var(--ink-2)', lineHeight:1.5 }}>
              {fase.descricao}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────
const SubTabBar = ({ tabs, active, onChange }) => (
  <div style={{ display:'flex', borderBottom:'1px solid var(--line)', background:'var(--bg)', flexShrink:0 }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{
        flex:1, padding:'11px 4px', border:'none', background:'none',
        borderBottom:`2px solid ${active===t.id ? 'var(--accent)' : 'transparent'}`,
        color: active===t.id ? 'var(--accent)' : 'var(--ink-3)',
        fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--sans)',
      }}>{t.label}</button>
    ))}
  </div>
);

const SexagemBadge = ({ sexagem }) => {
  const opt = SEXAGEM_OPTIONS.find(o => o.value === sexagem);
  if (!opt) return null;
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:8,
      background:opt.bg, color:opt.color, border:`1px solid ${opt.color}40` }}>
      {opt.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// TELA PRINCIPAL — Gestação e Partos (2 sub-tabs)
// ─────────────────────────────────────────────────────────────
export function GestacaoPartosScreen({
  setScreen, setSelected, partos, cavalos, proprietarios, movimentacoes, onBack,
  insumos = [], currentUser,
  progProgramas = [], progAplicacoes = [],
  addProgesteronaPrograma, encerrarProgesteronaPrograma, deleteProgesteronaPrograma,
  updateProgesteronaAplicacao,
  addRegistro, deleteRegistro, addAtividade,
}) {
  const [subTab, setSubTab] = useState('gestacoes');
  const [busca, setBusca] = useState('');

  const q = busca.trim().toLowerCase();

  const gestantes = useMemo(() => cavalos
    .filter(c => c.categoria === 'Gestante' || c.categorias?.includes('Gestante'))
    .map(c => ({ ...c, _dias: diasAteParto(c.gestacao?.dataCobricao), _foraHaras: !!c.dataSaida || c.presente === false }))
    .sort((a, b) => {
      if (a._foraHaras !== b._foraHaras) return a._foraHaras ? 1 : -1;
      return (a._dias ?? 9999) - (b._dias ?? 9999);
    })
  , [cavalos]);

  const gestantesFiltradas = q
    ? gestantes.filter(c => norm(c.nome).includes(norm(q)) || proprietarios.find(p => p.id === c.proprietarioId)?.nome && norm(proprietarios.find(p => p.id === c.proprietarioId).nome).includes(norm(q)))
    : gestantes;

  const gestantesDentro = gestantesFiltradas.filter(c => !c._foraHaras);

  const sortedPartos = useMemo(() => [...partos].sort((a,b) => (b.data+b.hora).localeCompare(a.data+a.hora)), [partos]);

  const partosFiltrados = q
    ? sortedPartos.filter(pt => {
        const egua = cavalos.find(c => c.id === pt.eguaId);
        const potro = cavalos.find(c => c.id === pt.potroId);
        return norm(egua?.nome).includes(norm(q)) || norm(potro?.nome).includes(norm(q));
      })
    : sortedPartos;

  return (
    <div>
      <div style={{ position:'sticky', top:0, zIndex:10, background:'var(--bg)' }}>
        <TopBar title="Gestação e Partos" onBack={onBack || (() => setScreen('home'))} />
        <SubTabBar
          tabs={[
            { id:'gestacoes', label:`Gestações (${gestantesDentro.length})` },
            { id:'partos', label:`Partos (${partosFiltrados.length})` },
            { id:'progesterona', label:`Progesterona (${(progProgramas||[]).filter(p => p.status === 'ativo').length})` },
          ]}
          active={subTab}
          onChange={setSubTab}
        />
        <div style={{ padding:'8px 16px', borderBottom:'1px solid var(--line)' }}>
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            background:'var(--card)', border:'1px solid var(--line)',
            borderRadius:12, padding:'9px 14px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar égua, potro ou proprietário…"
              style={{
                flex:1, border:'none', outline:'none', background:'transparent',
                fontSize:14, color:'var(--ink)', fontFamily:'var(--sans)',
              }}
            />
            {busca && (
              <button onClick={() => setBusca('')} style={{
                background:'none', border:'none', padding:0, cursor:'pointer',
                color:'var(--ink-3)', fontSize:16, lineHeight:1,
              }}>×</button>
            )}
          </div>
        </div>
      </div>
      <div style={{ paddingBottom:90 }}>
        {subTab === 'gestacoes' && (
          <GestaoesTab gestantes={gestantesFiltradas} proprietarios={proprietarios} setScreen={setScreen} setSelected={setSelected} />
        )}
        {subTab === 'partos' && (
          <PartosTab partos={partosFiltrados} cavalos={cavalos} proprietarios={proprietarios} setScreen={setScreen} setSelected={setSelected} />
        )}
        {subTab === 'progesterona' && (
          <ProgesteronaTab
            cavalos={cavalos} proprietarios={proprietarios} insumos={insumos}
            currentUser={currentUser}
            programas={progProgramas} aplicacoes={progAplicacoes}
            addPrograma={addProgesteronaPrograma}
            encerrarPrograma={encerrarProgesteronaPrograma}
            deletePrograma={deleteProgesteronaPrograma}
            updateAplicacao={updateProgesteronaAplicacao}
            addRegistro={addRegistro} deleteRegistro={deleteRegistro} addAtividade={addAtividade}
            busca={busca}
          />
        )}
      </div>
    </div>
  );
}

// ── Lista de gestantes ────────────────────────────────────────
function GestaoesTab({ gestantes, proprietarios, setScreen, setSelected }) {
  const dentro = gestantes.filter(c => !c._foraHaras);
  const fora = gestantes.filter(c => c._foraHaras);

  if (gestantes.length === 0) return (
    <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--ink-3)' }}>
      <div style={{ fontSize:32, marginBottom:12 }}>🐴</div>
      <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Nenhuma égua gestante</div>
      <div style={{ fontSize:12 }}>Defina a categoria "Gestante" no perfil de uma égua para ela aparecer aqui.</div>
    </div>
  );

  const renderCard = (c, isGray) => {
    const prop = proprietarios.find(p => p.id === c.proprietarioId);
    const dias = c._dias;
    const atrasada = !isGray && dias !== null && dias < 0;
    const alerta = !isGray && dias !== null && dias >= 0 && dias <= 30;
    const mes = mesDaGestacao(c.gestacao?.dataCobricao);
    const pct = Math.round((mes / 11) * 100);
    const sexagem = c.gestacao?.sexagem;
    const posterior = !isGray && temApresentacaoPosterior(c);
    const jup = !isGray ? analisarJupCavalo(c) : null;
    const suspInsuf = jup && jup.status === 'insuficiencia';
    const suspPlac = jup && jup.status === 'placentite';
    const temAlertaJup = suspInsuf || suspPlac;
    const fcCrit = !isGray ? analisarFcCritico(c) : null;
    const brady = fcCrit && fcCrit.critico === 'bradicardia';
    const taqui = fcCrit && fcCrit.critico === 'taquicardia';
    const temAlertaFc = brady || taqui;
    const ofCrit = !isGray ? analisarOfCritico(c) : null;
    const aortaCrit = !isGray ? analisarAortaCritica(c) : null;
    const rciu = (ofCrit && ofCrit.classe === 'critico') || (aortaCrit && aortaCrit.status === 'critico');
    const temAlertaOf = rciu;

    const cardVermelho = posterior || temAlertaJup || temAlertaFc || temAlertaOf;

    return (
      <div key={c.id} onClick={() => { setSelected(c.id); setScreen('eguaGestanteDetalhe'); }}
        style={{
          background: isGray ? '#f3f4f6' : (cardVermelho ? '#fef2f2' : 'var(--card)'),
          border: `1px solid ${isGray ? '#d1d5db' : (cardVermelho ? '#dc2626' : (alerta || atrasada ? '#fca5a5' : 'var(--line)'))}`,
          borderRadius:14, marginBottom:10, overflow:'hidden', cursor:'pointer',
          opacity: isGray ? 0.8 : 1,
          boxShadow: cardVermelho ? '0 0 0 1px #fecaca' : 'none',
        }}>

        {isGray && (
          <div style={{ background:'#9ca3af', color:'#fff', padding:'6px 14px', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
            📤 Fora do haras
          </div>
        )}
        {posterior && (
          <div style={{ background:'#dc2626', color:'#fff', padding:'8px 14px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:7 }}>
            ⚠️ Feto em apresentação posterior — acompanhar
          </div>
        )}
        {suspInsuf && (
          <div style={{ background:'#b45309', color:'#fff', padding:'8px 14px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:7 }}>
            ⚠️ Suspeita de Placenta Insuficiente — acompanhar
          </div>
        )}
        {suspPlac && (
          <div style={{ background:'#be123c', color:'#fff', padding:'8px 14px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:7 }}>
            ⚠️ Suspeita de Placentite — acompanhar
          </div>
        )}
        {brady && (
          <div style={{ background:'#7f1d1d', color:'#fff', padding:'8px 14px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:7 }}>
            ⚠️ Bradicardia muito acentuada! Checar urgente
          </div>
        )}
        {taqui && (
          <div style={{ background:'#7f1d1d', color:'#fff', padding:'8px 14px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:7 }}>
            ⚠️ Taquicardia muito acentuada! Checar urgente
          </div>
        )}
        {rciu && (
          <div style={{ background:'#7f1d1d', color:'#fff', padding:'8px 14px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:7 }}>
            ⚠️ Restrição de Crescimento Intrauterino!
          </div>
        )}
        {!isGray && atrasada && (
          <div style={{ background:'#7c3aed', color:'#fff', padding:'8px 14px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:7 }}>
            ⚠️ Gestação além da previsão · +{Math.abs(dias)}d
          </div>
        )}
        {!isGray && alerta && !atrasada && (
          <div style={{ background:'#dc2626', color:'#fff', padding:'8px 14px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:7 }}>
            🏥 Migrar para o piquete maternidade · {dias}d
          </div>
        )}

        <div style={{ padding:'12px 14px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:12, background: isGray ? '#e5e7eb' : '#fdf4ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:22 }}>
              🐴
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:2 }}>
                <span style={{ fontFamily:'var(--serif)', fontSize:16, color: isGray ? '#6b7280' : 'var(--ink)' }}>{c.nome}</span>
                {!isGray && sexagem && <SexagemBadge sexagem={sexagem} />}
                {isGray && sexagem && (
                  <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:8, background:'#e5e7eb', color:'#6b7280', border:'1px solid #d1d5db' }}>
                    {SEXAGEM_OPTIONS.find(o => o.value === sexagem)?.label || sexagem}
                  </span>
                )}
              </div>
              <div style={{ fontSize:12, color: isGray ? '#9ca3af' : 'var(--ink-2)', marginBottom:4 }}>{prop?.nome || '—'}</div>

              {c.gestacao?.dataCobricao ? (
                <>
                  <div style={{ fontSize:11, color: isGray ? '#9ca3af' : 'var(--ink-3)', display:'flex', gap:10, flexWrap:'wrap', marginBottom:6 }}>
                    <span>Cobrição: {fmtDate(c.gestacao.dataCobricao)}</span>
                    <span>Previsão: {fmtDate(previsaoParto(c.gestacao.dataCobricao))}</span>
                    {c.gestacao.pai && <span>Pai: {c.gestacao.pai}</span>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ flex:1, height:5, background: isGray ? '#e5e7eb' : 'var(--soft)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background: isGray ? '#9ca3af' : (alerta ? '#dc2626' : 'var(--accent)'), borderRadius:3, transition:'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color: isGray ? '#9ca3af' : (atrasada ? '#7c3aed' : alerta ? '#dc2626' : 'var(--accent)'), whiteSpace:'nowrap' }}>
                      {mes}°/11 · {dias !== null ? (dias > 0 ? `${dias}d` : dias === 0 ? 'hoje' : `+${Math.abs(dias)}d`) : '—'}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize:11, color: isGray ? '#9ca3af' : 'var(--ink-3)', fontStyle:'italic' }}>Data de cobrição não cadastrada</div>
              )}
            </div>
            <Icon name="chevron-right" size={16} color={isGray ? '#9ca3af' : 'var(--ink-3)'} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding:'14px 16px 0' }}>
      {dentro.map(c => renderCard(c, false))}
      {fora.length > 0 && (
        <>
          {dentro.length > 0 && (
            <div style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em', margin:'8px 0 10px', paddingTop:4, borderTop:'1px solid var(--line)' }}>
              Fora do haras
            </div>
          )}
          {fora.map(c => renderCard(c, true))}
        </>
      )}
    </div>
  );
}

// ── Sub-aba de partos ─────────────────────────────────────────
function PartosTab({ partos, cavalos, proprietarios, setScreen, setSelected }) {
  const fmtDateShort = ds => { if (!ds) return '—'; const [,m,d] = ds.split('-'); return `${parseInt(d)}/${parseInt(m)}`; };

  return (
    <div style={{ padding:'14px 16px 0' }}>
      <button onClick={() => setScreen('registrarParto')} style={{
        width:'100%', padding:'16px', borderRadius:14, border:'none',
        background:'linear-gradient(135deg, #3d6043, #2a4330)',
        color:'#fff', cursor:'pointer', fontFamily:'var(--sans)',
        display:'flex', alignItems:'center', justifyContent:'center', gap:12,
        boxShadow:'0 6px 20px rgba(61,96,67,0.3)', marginBottom:16,
      }}>
        <Icon name="heart" size={20} color="#fff" />
        <div style={{ textAlign:'left' }}>
          <div style={{ fontSize:16, fontWeight:700 }}>Registrar Parto</div>
          <div style={{ fontSize:11, opacity:0.8, marginTop:1 }}>Iniciar acompanhamento neonatal</div>
        </div>
      </button>

      {partos.length === 0 ? (
        <div style={{ textAlign:'center', padding:'30px 20px', color:'var(--ink-3)', fontSize:14 }}>Nenhum parto registrado</div>
      ) : (
        partos.map(pt => {
          const egua = cavalos.find(c => c.id === pt.eguaId);
          const potro = cavalos.find(c => c.id === pt.potroId);
          const emAndamento = pt.status === 'em_andamento';
          return (
            <div key={pt.id} onClick={() => { setSelected(pt.id); setScreen('partoDetalhe'); }}
              style={{ background:'var(--card)', border:`1px solid ${emAndamento ? '#fde68a' : 'var(--line)'}`, borderRadius:14, padding:'12px 14px', marginBottom:10, cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:10, background: emAndamento ? '#fffbeb' : 'var(--soft)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon name="heart" size={18} color={emAndamento ? '#d97706' : 'var(--accent)'} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:'var(--serif)', fontSize:15, color:'var(--ink)' }}>{potro?.nome || 'Potro'}</span>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:5,
                    background: emAndamento ? '#fef9c3' : '#dcfce7',
                    color: emAndamento ? '#92400e' : '#16a34a',
                    border:`1px solid ${emAndamento ? '#fde68a' : '#bbf7d0'}`,
                  }}>{emAndamento ? 'Em andamento' : 'Concluído'}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>Mãe: {egua?.nome || '—'} · {fmtDateShort(pt.data)}{pt.hora ? ` às ${pt.hora}` : ''}</div>
              </div>
              <Icon name="chevron-right" size={15} color="var(--ink-3)" />
            </div>
          );
        })
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DETALHE DA ÉGUA GESTANTE — 3 abas
// ─────────────────────────────────────────────────────────────
export function EguaGestanteDetalheScreen({
  id, setScreen, cavalos, updateCavalo, proprietarios, insumos, addAviso, addAtividade, currentUser,
  protocolosVacinacao = [], vacinacoesAnimais = [], upsertVacinacaoAnimal,
  protocolosVermifugacao = [], vermifugacoesAnimais = [], addVermifugacaoAnimal,
  addRegistro, servicos = [], addProcedimento,
}) {
  const c = cavalos.find(cv => cv.id === id);
  const [subTab, setSubTab] = useState('gestacao');

  if (!c) return (
    <div style={{ paddingBottom:90 }}>
      <TopBar title="Gestante" onBack={() => setScreen('partos')} />
      <div style={{ padding:24, textAlign:'center', color:'var(--ink-3)' }}>Égua não encontrada.</div>
    </div>
  );

  const prop = proprietarios.find(p => p.id === c.proprietarioId);
  const dias = diasAteParto(c.gestacao?.dataCobricao);
  const atrasada = dias !== null && dias < 0;
  const alerta = dias !== null && dias >= 0 && dias <= 30;
  const mes = mesDaGestacao(c.gestacao?.dataCobricao);

  const diasLabel = dias === null ? null
    : dias > 0 ? `${dias}d para parto`
    : dias === 0 ? 'Parto hoje!'
    : `+${Math.abs(dias)}d além`;

  return (
    <div>
      <div style={{ position:'sticky', top:0, zIndex:10, background:'var(--bg)' }}>
        <TopBar
          title={c.nome}
          subtitle={prop?.nome || '—'}
          onBack={() => setScreen('partos')}
          action={diasLabel ? (
            <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8,
              background: atrasada ? '#f5f3ff' : alerta ? '#fef2f2' : 'var(--accent-soft)',
              color: atrasada ? '#7c3aed' : alerta ? '#dc2626' : 'var(--accent)',
              border:`1px solid ${atrasada ? '#ddd6fe' : alerta ? '#fca5a5' : 'var(--accent)'}40`,
            }}>
              {diasLabel}
            </span>
          ) : null}
        />
        {temApresentacaoPosterior(c) && (
          <div style={{ background:'#dc2626', color:'#fff', padding:'8px 16px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
            ⚠️ Feto em apresentação posterior — acompanhar
          </div>
        )}
        {(() => {
          const jup = analisarJupCavalo(c);
          if (!jup) return null;
          if (jup.status === 'insuficiencia') {
            return (
              <div style={{ background:'#b45309', color:'#fff', padding:'8px 16px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                ⚠️ Suspeita de Placenta Insuficiente — acompanhar (JUP {jup.valor} mm)
              </div>
            );
          }
          if (jup.status === 'placentite') {
            return (
              <div style={{ background:'#be123c', color:'#fff', padding:'8px 16px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                ⚠️ Suspeita de Placentite — acompanhar (JUP {jup.valor} mm)
              </div>
            );
          }
          return null;
        })()}
        {(() => {
          const fc = analisarFcCritico(c);
          if (!fc || !fc.critico) return null;
          if (fc.critico === 'bradicardia') {
            return (
              <div style={{ background:'#7f1d1d', color:'#fff', padding:'8px 16px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                ⚠️ Bradicardia muito acentuada! Checar urgente (FC {fc.valor} bpm)
              </div>
            );
          }
          if (fc.critico === 'taquicardia') {
            return (
              <div style={{ background:'#7f1d1d', color:'#fff', padding:'8px 16px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                ⚠️ Taquicardia muito acentuada! Checar urgente (FC {fc.valor} bpm)
              </div>
            );
          }
          return null;
        })()}
        {(() => {
          const of = analisarOfCritico(c);
          const aorta = analisarAortaCritica(c);
          const ofCrit = of && of.classe === 'critico';
          const aortaCritico = aorta && aorta.status === 'critico';
          if (!ofCrit && !aortaCritico) return null;
          const detalhes = [];
          if (ofCrit) detalhes.push(`OF ${of.valor} ${of.unidade}`);
          if (aortaCritico) detalhes.push(`Aorta ${aorta.valor} mm`);
          return (
            <div style={{ background:'#7f1d1d', color:'#fff', padding:'8px 16px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
              ⚠️ Restrição de Crescimento Intrauterino! ({detalhes.join(' · ')})
            </div>
          );
        })()}
        {atrasada && (
          <div style={{ background:'#7c3aed', color:'#fff', padding:'8px 16px', fontSize:12, fontWeight:700 }}>
            ⚠️ Gestação além da previsão · +{Math.abs(dias)} dias
          </div>
        )}
        {alerta && !atrasada && (
          <div style={{ background:'#dc2626', color:'#fff', padding:'8px 16px', fontSize:12, fontWeight:700 }}>
            🏥 Migrar para o piquete maternidade
          </div>
        )}
        <SubTabBar
          tabs={[
            { id:'gestacao', label:'Gestação' },
            { id:'alimentacao', label:'Alimentação' },
            { id:'acompanhamento', label:'Acompanhamento' },
            { id:'vacverm', label:'Vac. / Verm.' },
          ]}
          active={subTab}
          onChange={setSubTab}
        />
      </div>
      <div style={{ paddingBottom:90 }}>
        {subTab === 'gestacao' && <GestacaoTab c={c} updateCavalo={updateCavalo} mes={mes} />}
        {subTab === 'alimentacao' && <AlimentacaoTab c={c} insumos={insumos} />}
        {subTab === 'acompanhamento' && <AcompanhamentoTab c={c} updateCavalo={updateCavalo} mesAtual={mes} addAviso={addAviso} addAtividade={addAtividade} currentUser={currentUser} />}
        {subTab === 'vacverm' && (
          <VacinacaoVermifugacaoTab
            cavalo={c}
            protocolosVacinacao={protocolosVacinacao}
            vacinacoesAnimais={vacinacoesAnimais}
            upsertVacinacaoAnimal={upsertVacinacaoAnimal}
            protocolosVermifugacao={protocolosVermifugacao}
            vermifugacoesAnimais={vermifugacoesAnimais}
            addVermifugacaoAnimal={addVermifugacaoAnimal}
            insumos={insumos}
            addRegistro={addRegistro}
            addAtividade={addAtividade}
            addProcedimento={addProcedimento}
            servicos={servicos}
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  );
}

// ── Shared subcomponents (module-level to avoid inline re-definition) ──
const GestacaoLabel = ({ t }) => <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>{t}</div>;
const AlimentacaoRow = ({ label, value, sub }) => (
  <div style={{ padding:'10px 0', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
    <div>
      <div style={{ fontSize:13, color:'var(--ink)' }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>{sub}</div>}
    </div>
    <span style={{ fontSize:13, fontWeight:600, color:'var(--ink-2)', textAlign:'right', maxWidth:'55%' }}>{value}</span>
  </div>
);

// ── Aba Gestação ──────────────────────────────────────────────
function GestacaoTab({ c, updateCavalo, mes }) {
  const g = c.gestacao || {};
  const [dataCobricao, setDataCobricao] = useState(g.dataCobricao || '');
  const [pai, setPai] = useState(g.pai || '');
  const [saved, setSaved] = useState(false);

  const previsao = previsaoParto(dataCobricao);
  const dias = diasAteParto(dataCobricao);

  const handleSave = () => {
    updateCavalo(c.id, { gestacao: { ...g, dataCobricao, pai } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle = {
    width:'100%', boxSizing:'border-box', padding:'11px 13px', borderRadius:10,
    border:'1px solid var(--line)', background:'var(--card)',
    fontSize:14, color:'var(--ink)', fontFamily:'var(--sans)', outline:'none',
  };

  const sexagem = g.sexagem;

  return (
    <div style={{ padding:'14px 16px 0' }}>

      {/* Sexagem destaque */}
      {sexagem && (
        <div style={{ marginBottom:14 }}>
          {(() => {
            const opt = SEXAGEM_OPTIONS.find(o => o.value === sexagem);
            return (
              <div style={{ background:opt.bg, border:`1px solid ${opt.color}40`, borderRadius:14, padding:'14px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ fontSize:32 }}>{sexagem === 'macho' ? '♂' : sexagem === 'femea' ? '♀' : '?'}</div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:opt.color, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:2 }}>Sexagem (4º mês)</div>
                  <div style={{ fontSize:18, fontWeight:800, color:opt.color }}>{opt.label}</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Progresso */}
      {dataCobricao && (
        <div style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:14, padding:'14px', marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>Mês {mes} de 11</span>
            <span style={{ fontSize:13, fontWeight:700, color: dias !== null && dias < 0 ? '#7c3aed' : dias !== null && dias <= 30 ? '#dc2626' : 'var(--accent)' }}>
              {dias !== null ? (dias > 0 ? `${dias} dias para o parto` : dias === 0 ? '🍼 Parto hoje!' : `+${Math.abs(dias)} dias além`) : '—'}
            </span>
          </div>
          <div style={{ height:8, background:'var(--soft)', borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.round((mes/11)*100)}%`, background: dias !== null && dias < 0 ? '#7c3aed' : dias !== null && dias <= 30 ? '#dc2626' : 'var(--accent)', borderRadius:4 }} />
          </div>
        </div>
      )}

      {/* Dados editáveis */}
      <div style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:14, padding:'14px', marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>Filiação e cobrição</div>
        <div style={{ marginBottom:12 }}>
          <GestacaoLabel t="Data de cobrição" />
          <input type="date" value={dataCobricao} onChange={e => setDataCobricao(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4, textAlign:'center' }}>Garanhão (pai)</div>
              <input value={pai} onChange={e => setPai(e.target.value)} placeholder="Nome do garanhão…" style={{ ...inputStyle, textAlign:'center' }} />
            </div>
            <div style={{ fontSize:22, fontWeight:900, color:'var(--ink-3)', flexShrink:0, marginTop:24 }}>×</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4, textAlign:'center' }}>Mãe Biológica</div>
              <div style={{ ...inputStyle, textAlign:'center', background:'var(--soft)', color:'var(--ink)', fontWeight:600 }}>
                {c.categorias?.includes('Receptora') ? (g.mae || '—') : c.nome}
              </div>
            </div>
          </div>
          {c.categorias?.includes('Receptora') && (
            <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0 0', marginTop:8, borderTop:'1px solid var(--line)' }}>
              <span style={{ fontSize:12, color:'var(--ink-3)' }}>Receptora (portadora)</span>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{c.nome}</span>
            </div>
          )}
        </div>
        {previsao && (
          <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderTop:'1px solid var(--line)' }}>
            <span style={{ fontSize:12, color:'var(--ink-3)' }}>Previsão de parto (330 dias)</span>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--accent)' }}>{fmtDate(previsao)}</span>
          </div>
        )}
      </div>

      {/* Desenvolvimento fetal — muda só com a idade gestacional */}
      <BoxDesenvolvimentoFetal dataCobricao={dataCobricao} />

      <button onClick={handleSave} style={{
        width:'100%', padding:'13px', borderRadius:12, border:'none',
        background: saved ? '#16a34a' : 'var(--accent)',
        color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'var(--sans)',
        transition:'background 0.2s', marginBottom:14,
      }}>
        {saved ? '✓ Salvo!' : 'Salvar dados de gestação'}
      </button>

      {/* Histórico gestacional */}
      {c.historicoGestacional?.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Histórico gestacional</div>
          {c.historicoGestacional.map((h, i) => (
            <div key={i} style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>
                Gestação {i+1} · Cobrição {fmtDate(h.dataCobricao)}
              </div>
              <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:3 }}>
                Previsão: {fmtDate(h.dataPrevisao)} · {h.pai ? `Pai: ${h.pai}` : ''}
                {h.sexagem ? ` · ${SEXAGEM_OPTIONS.find(o=>o.value===h.sexagem)?.label}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Aba Alimentação ───────────────────────────────────────────
function AlimentacaoTab({ c, insumos }) {
  const n = c.nutricao || {};
  const racao = insumos.find(i => i.id === n.racaoId);
  const oleoDia = (n.oleoMlManha || 0) + (n.oleoMlTarde || 0) || n.oleoMlDia || 0;
  const suplementos = (n.suplementos || []).map(s => ({
    ...s,
    ins: insumos.find(i => i.id === s.insumoId),
  }));


  return (
    <div style={{ padding:'14px 16px 0' }}>
      <div style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:14, padding:'0 14px', marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.07em', padding:'12px 0 8px' }}>Ração</div>
        {racao ? (
          <>
            <AlimentacaoRow label={racao.nome} value={`${(n.racaoKgManha||0)+(n.racaoKgTarde||0)+(n.racaoKgAlmoco||0)} kg/dia`}
              sub={`Manhã ${n.racaoKgManha||0}kg · Tarde ${n.racaoKgTarde||0}kg${n.comeAlmoco ? ` · Almoço ${n.racaoKgAlmoco||0}kg` : ''}`} />
          </>
        ) : (
          <div style={{ padding:'10px 0', fontSize:13, color:'var(--ink-3)', fontStyle:'italic' }}>Sem ração cadastrada</div>
        )}
      </div>

      {oleoDia > 0 && (
        <div style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:14, padding:'0 14px', marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.07em', padding:'12px 0 8px' }}>Óleo</div>
          <AlimentacaoRow label="Óleo de soja" value={`${oleoDia} ml/dia`}
            sub={`Manhã ${n.oleoMlManha || 0}ml · Tarde ${n.oleoMlTarde || 0}ml`} />
        </div>
      )}

      {suplementos.length > 0 && (
        <div style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:14, padding:'0 14px', marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.07em', padding:'12px 0 8px' }}>Suplementos</div>
          {suplementos.map(s => {
            const turnos = [s.manha ? 'Manhã' : '', s.tarde ? 'Tarde' : ''].filter(Boolean).join(' + ') || 'Dia';
            const qtdTrato = s.manha && s.tarde ? `${(s.qtdDia / 2).toFixed(1)}/trato` : `${s.qtdDia}/dia`;
            return (
              <AlimentacaoRow key={s.insumoId} label={s.ins?.nome || s.insumoId}
                value={`${s.qtdDia} ${s.ins?.unidade || 'un'}/dia`}
                sub={`${turnos} · ${qtdTrato}`} />
            );
          })}
        </div>
      )}

      {!racao && oleoDia === 0 && suplementos.length === 0 && (
        <div style={{ textAlign:'center', padding:'30px 20px', color:'var(--ink-3)', fontSize:13, fontStyle:'italic' }}>
          Nenhum plano alimentar cadastrado. Edite o perfil da égua para definir a alimentação.
        </div>
      )}
    </div>
  );
}

// ── Aba Acompanhamento ────────────────────────────────────────
function AcompanhamentoTab({ c, updateCavalo, mesAtual, addAviso, addAtividade, currentUser }) {
  const [expandido, setExpandido] = useState(mesAtual);
  const g = c.gestacao || {};
  const acomp = g.acompanhamento || {};

  const salvarMes = (mes, dados, sexagem) => {
    const novoAcomp = { ...acomp, [mes]: dados };
    const novaGestacao = { ...g, acompanhamento: novoAcomp };
    if (mes === 4 && sexagem !== undefined) novaGestacao.sexagem = sexagem;
    updateCavalo(c.id, { gestacao: novaGestacao });
    if (addAtividade) {
      const agora = new Date();
      const hora = agora.toTimeString().slice(0, 5);
      const data = agora.toLocaleDateString('sv-SE');
      const mesRef = agora.getFullYear() + '-' + String(agora.getMonth() + 1).padStart(2, '0');
      addAtividade({
        id: 'at_' + Date.now(), tipo: 'gestacao',
        cavaloId: c.id,
        usuario: currentUser?.nome || 'Usuário',
        texto: `Feito acompanhamento gestacional de ${c.nome}`,
        data, hora, mes: mesRef,
      });
    }
  };

  const temDados = (mes) => {
    const d = acomp[mes];
    if (!d) return false;
    // Meses de palpação usam { palpacoes: [...] }
    if (MESES_PALPACAO.has(mes)) return Array.isArray(d.palpacoes) && d.palpacoes.length > 0;
    return Object.values(d).some(v => v && v !== '');
  };

  return (
    <div style={{ padding:'14px 16px 0' }}>
      <div style={{ fontSize:12, color:'var(--ink-3)', marginBottom:14 }}>
        Acompanhamento mensal da gestação. Mês atual estimado: <strong>Mês {mesAtual}</strong>.
      </div>

      {Array.from({ length:12 }, (_, i) => i).map(mes => (
        MESES_PALPACAO.has(mes) ? (
          <MesPalpacoes
            key={mes}
            mes={mes}
            mesAtual={mesAtual}
            dados={acomp[mes] || { palpacoes: [] }}
            expandido={expandido === mes}
            temDados={temDados(mes)}
            onToggle={() => setExpandido(expandido === mes ? null : mes)}
            onSalvar={(dados) => salvarMes(mes, dados)}
          />
        ) : (
          <MesAcompanhamento
            key={mes}
            mes={mes}
            mesAtual={mesAtual}
            dados={acomp[mes] || { ...ACOMP_VAZIO }}
            sexagemAtual={g.sexagem || ''}
            expandido={expandido === mes}
            temDados={temDados(mes)}
            onToggle={() => setExpandido(expandido === mes ? null : mes)}
            onSalvar={(dados, sexagem) => salvarMes(mes, dados, sexagem)}
          />
        )
      ))}
    </div>
  );
}

function MesAcompanhamento({ mes, mesAtual, dados, sexagemAtual, expandido, temDados, onToggle, onSalvar }) {
  const [form, setForm] = useState(() => {
    const base = { ...ACOMP_VAZIO, ...dados };
    // Backward compat: até o refactor, o campo era só "orbitaOcular" e
    // guardava a LARGURA. Se dados antigos tiverem esse campo e não houver
    // orbitaLargura, migra pra não perder as medições registradas.
    if (base.orbitaOcular && (base.orbitaLargura === '' || base.orbitaLargura == null)) {
      base.orbitaLargura = base.orbitaOcular;
    }
    return base;
  });
  const [sexagem, setSexagem] = useState(sexagemAtual);
  const [estaticaFetal, setEstaticaFetal] = useState(dados?.estaticaFetal || '');
  const [saved, setSaved] = useState(false);
  const isAtual = mes === mesAtual;
  const is4 = mes === 4;
  const isEstaticaFetal = mes >= MES_ESTATICA_FETAL;
  const camposDoMes = camposUltraDoMes(mes);

  const handleSalvar = () => {
    const finalForm = isEstaticaFetal ? { ...form, estaticaFetal } : form;
    onSalvar(finalForm, is4 ? sexagem : undefined);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const inputStyle = {
    width:'100%', boxSizing:'border-box', padding:'9px 11px', borderRadius:9,
    border:'1px solid var(--line)', background:'var(--bg)',
    fontSize:13, color:'var(--ink)', fontFamily:'var(--sans)', outline:'none',
  };

  const isPosterior = estaticaFetal === 'posterior';
  const fcStatus = _classificarFc(mes, form.freqCardiaca);
  const ofClasse = _classificarOf(mes, form);
  const aortaStatus = _classificarAorta(mes, form.aorta);

  // Auto-preenche o volume ao editar altura/largura. Se o usuário digitar
  // volume manualmente, ele vai ser sobrescrito no próximo edit de a/l —
  // aceito o compromisso pra não complicar com "modo manual vs auto".
  useEffect(() => {
    const vol = calcularVolumeOrbita(form.orbitaAltura, form.orbitaLargura);
    if (vol == null) return;
    const volStr = String(vol);
    if (String(form.orbitaVolume ?? '') === volStr) return;
    setForm(f => ({ ...f, orbitaVolume: volStr }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.orbitaAltura, form.orbitaLargura]);

  return (
    <div style={{ marginBottom:8, background:'var(--card)', border:`1px solid ${isAtual ? 'var(--accent)' : 'var(--line)'}`, borderRadius:12, overflow:'hidden' }}>
      <button onClick={onToggle} style={{
        width:'100%', padding:'12px 14px', border:'none', background: isAtual ? 'var(--accent-soft)' : 'transparent',
        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', fontFamily:'var(--sans)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:14, fontWeight:700, color: isAtual ? 'var(--accent)' : 'var(--ink)' }}>
            {mes}º Mês
          </span>
          {isAtual && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:'var(--accent)', color:'#fff' }}>Atual</span>}
          {is4 && <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:6, background:'#f0fdf4', color:'#16a34a', border:'1px solid #bbf7d0' }}>Sexagem</span>}
          {isPosterior && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:'#fee2e2', color:'#b91c1c', border:'1px solid #fca5a5' }}>⚠ POSTERIOR</span>}
          {/* Chips por parâmetro — uma cor pra cada. Críticos ficam sempre vermelhos. */}
          {fcStatus === 'alta' && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:'#fce7f3', color:'#be185d', border:'1px solid #f9a8d4' }}>FC ↑</span>}
          {fcStatus === 'baixa' && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:'#fce7f3', color:'#be185d', border:'1px solid #f9a8d4' }}>FC ↓</span>}
          {ofClasse?.classe === 'alta' && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:'#ede9fe', color:'#6d28d9', border:'1px solid #c4b5fd' }}>OF ↑</span>}
          {ofClasse?.classe === 'baixa' && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:'#ede9fe', color:'#6d28d9', border:'1px solid #c4b5fd' }}>OF ↓</span>}
          {ofClasse?.classe === 'critico' && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:'#fee2e2', color:'#7f1d1d', border:'1px solid #fca5a5' }}>⚠ OF ↓↓</span>}
          {aortaStatus === 'alta' && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:'#ccfbf1', color:'#0f766e', border:'1px solid #5eead4' }}>AF ↑</span>}
          {aortaStatus === 'baixa' && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:'#ccfbf1', color:'#0f766e', border:'1px solid #5eead4' }}>AF ↓</span>}
          {aortaStatus === 'critico' && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:'#fee2e2', color:'#7f1d1d', border:'1px solid #fca5a5' }}>⚠ AF ↓↓</span>}
          {temDados && !expandido && <span style={{ fontSize:10, color:'var(--ink-3)' }}>✓ preenchido</span>}
        </div>
        <Icon name={expandido ? 'chevron-down' : 'chevron-right'} size={14} color="var(--ink-3)" />
      </button>

      {expandido && (
        <div style={{ padding:'0 14px 14px' }}>
          {/* Sexagem no 4º mês */}
          {is4 && (
            <div style={{ marginBottom:14, padding:'12px', background:'#f0fdf4', borderRadius:10, border:'1px solid #bbf7d0' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#16a34a', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Sexagem</div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => setSexagem('')} style={{
                  flex:1, padding:'8px 4px', borderRadius:8, cursor:'pointer', fontFamily:'var(--sans)',
                  border:`1px solid ${!sexagem ? '#6b7280' : 'var(--line)'}`,
                  background: !sexagem ? '#f3f4f6' : 'var(--bg)',
                  color: !sexagem ? '#374151' : 'var(--ink-3)', fontSize:11, fontWeight: !sexagem ? 700 : 400,
                }}>—</button>
                {SEXAGEM_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setSexagem(opt.value)} style={{
                    flex:1, padding:'8px 4px', borderRadius:8, cursor:'pointer', fontFamily:'var(--sans)',
                    border:`1px solid ${sexagem===opt.value ? opt.color : 'var(--line)'}`,
                    background: sexagem===opt.value ? opt.bg : 'var(--bg)',
                    color: sexagem===opt.value ? opt.color : 'var(--ink-3)', fontSize:11, fontWeight: sexagem===opt.value ? 700 : 400,
                  }}>{opt.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Estática Fetal (a partir do 8º mês) */}
          {isEstaticaFetal && (
            <div style={{ marginBottom:14, padding:'12px', background: isPosterior ? '#fef2f2' : '#f0f9ff', borderRadius:10, border: `1px solid ${isPosterior ? '#fca5a5' : '#bae6fd'}` }}>
              <div style={{ fontSize:11, fontWeight:700, color: isPosterior ? '#b91c1c' : '#0c4a6e', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Estática Fetal</div>
              <div style={{ display:'flex', gap:6 }}>
                {[
                  { value: '', label: '—', cor: '#6b7280', bg: '#f3f4f6' },
                  { value: 'anterior', label: 'Apresentação Anterior', cor: '#0284c7', bg: '#e0f2fe' },
                  { value: 'posterior', label: 'Apresentação Posterior', cor: '#dc2626', bg: '#fee2e2' },
                ].map(opt => (
                  <button key={opt.value || 'vazio'} onClick={() => setEstaticaFetal(opt.value)} style={{
                    flex:1, padding:'8px 6px', borderRadius:8, cursor:'pointer', fontFamily:'var(--sans)',
                    border:`1px solid ${estaticaFetal===opt.value ? opt.cor : 'var(--line)'}`,
                    background: estaticaFetal===opt.value ? opt.bg : 'var(--bg)',
                    color: estaticaFetal===opt.value ? opt.cor : 'var(--ink-3)',
                    fontSize:11, fontWeight: estaticaFetal===opt.value ? 700 : 500, lineHeight: 1.3,
                  }}>{opt.label}</button>
                ))}
              </div>
              {isPosterior && (
                <div style={{ marginTop:8, fontSize:11, color:'#b91c1c', display:'flex', alignItems:'center', gap:6 }}>
                  ⚠ Feto em apresentação posterior — dispara alerta na ficha da égua e na lista de gestantes.
                </div>
              )}
            </div>
          )}

          {/* Campos clínicos */}
          {camposDoMes.map(campo => {
            if (campo.tipo === 'skip') return null;
            const ehJup = campo.key === 'jup';
            const refJup = ehJup ? _refJupPorMes(mes) : null;
            const classe = ehJup && form.jup !== '' && form.jup != null
              ? _classificarJup(mes, form.jup) : null;
            const corClasse = classe === 'insuficiencia' ? '#b45309'
              : classe === 'placentite' ? '#be123c'
              : classe === 'normal' ? '#15803d' : null;
            const labelClasse = classe === 'insuficiencia' ? 'Insuficiente (< ' + refJup.min.toFixed(1) + ')'
              : classe === 'placentite' ? 'Placentite (> ' + refJup.max.toFixed(1) + ')'
              : classe === 'normal' ? 'Dentro do esperado' : null;

            const ehFc = campo.key === 'freqCardiaca';
            const refFc = ehFc ? _refFcPorMes(mes) : null;
            const fcClasse = ehFc ? _classificarFc(mes, form.freqCardiaca) : null;
            const fcAlterada = fcClasse === 'alta' || fcClasse === 'baixa';
            const fcInputStyle = fcAlterada
              ? { ...inputStyle, background:'#fef2f2', border:'1px solid #fca5a5', color:'#7f1d1d' }
              : inputStyle;

            const ehAorta = campo.key === 'aorta';
            const refAorta = ehAorta ? _refAortaPorMes(mes) : null;
            const aortaClasse = ehAorta ? _classificarAorta(mes, form.aorta) : null;
            const aortaAlterada = aortaClasse && aortaClasse !== 'normal';
            const aortaInputStyle = aortaAlterada
              ? { ...inputStyle, background: aortaClasse === 'critico' ? '#fee2e2' : '#fef2f2', border:'1px solid #fca5a5', color:'#7f1d1d' }
              : inputStyle;

            // Campos da órbita — Volume tem prioridade. Destaca sutil no
            // input que a classificação está aplicando (usually o volume
            // se estiver preenchido, senão a largura).
            const ehOf = campo.key === 'orbitaAltura' || campo.key === 'orbitaLargura' || campo.key === 'orbitaVolume';
            const ofClasseAtiva = ofClasse?.classe === 'alta' || ofClasse?.classe === 'baixa' || ofClasse?.classe === 'critico';
            const ofDestaqueEste = ehOf && ofClasseAtiva && (
              (ofClasse.tipo === 'volume' && campo.key === 'orbitaVolume') ||
              (ofClasse.tipo === 'largura' && campo.key === 'orbitaLargura')
            );
            const ofInputStyle = ofDestaqueEste
              ? { ...inputStyle, background: ofClasse.classe === 'critico' ? '#fee2e2' : '#fef2f2', border:'1px solid #fca5a5', color:'#7f1d1d' }
              : inputStyle;

            // Grupo Órbita ocular — 3 medidas em uma linha
            if (campo.tipo === 'group-orbita') {
              const ofInputStyleFor = (key) => {
                const destaqueEste = ofClasseAtiva && (
                  (ofClasse.tipo === 'volume' && key === 'orbitaVolume') ||
                  (ofClasse.tipo === 'largura' && key === 'orbitaLargura')
                );
                return destaqueEste
                  ? { ...inputStyle, background: ofClasse.classe === 'critico' ? '#fee2e2' : '#fef2f2', border:'1px solid #fca5a5', color:'#7f1d1d' }
                  : inputStyle;
              };
              return (
                <div key={campo.key} style={{ marginBottom:10 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--ink-3)', marginBottom:6 }}>Órbita ocular</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                    <div>
                      <div style={{ fontSize:10, color:'var(--ink-3)', marginBottom:3 }}>Largura (mm)</div>
                      <input type="number" value={form.orbitaLargura || ''} onChange={e => setForm(f => ({...f, orbitaLargura: e.target.value}))} style={ofInputStyleFor('orbitaLargura')} />
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:'var(--ink-3)', marginBottom:3 }}>Altura (mm)</div>
                      <input type="number" value={form.orbitaAltura || ''} onChange={e => setForm(f => ({...f, orbitaAltura: e.target.value}))} style={inputStyle} />
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:'var(--ink-3)', marginBottom:3 }}>Volume (cm³)</div>
                      <input type="number" value={form.orbitaVolume || ''} onChange={e => setForm(f => ({...f, orbitaVolume: e.target.value}))} style={ofInputStyleFor('orbitaVolume')} />
                    </div>
                  </div>
                  {ofClasse && (
                    <div style={{ marginTop:4, fontSize:10, color: ofClasseAtiva ? (ofClasse.classe === 'critico' ? '#7f1d1d' : '#b91c1c') : 'var(--ink-3)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      {ofClasse.classe === 'alta' && <span>Órbita fetal acima da medida esperada (ref. {ofClasse.ref.min === ofClasse.ref.max ? ofClasse.ref.min : `${ofClasse.ref.min}–${ofClasse.ref.max}`} {ofClasse.unidade})</span>}
                      {ofClasse.classe === 'baixa' && <span>Órbita fetal abaixo da medida esperada (ref. {ofClasse.ref.min === ofClasse.ref.max ? ofClasse.ref.min : `${ofClasse.ref.min}–${ofClasse.ref.max}`} {ofClasse.unidade})</span>}
                      {ofClasse.classe === 'critico' && <span>⚠ Órbita fetal muito abaixo do esperado — restrição de crescimento intrauterino</span>}
                      {ofClasse.classe === 'normal' && <span>Dentro da faixa esperada ({ofClasse.ref.min === ofClasse.ref.max ? ofClasse.ref.min : `${ofClasse.ref.min}–${ofClasse.ref.max}`} {ofClasse.unidade}) · usando {ofClasse.tipo}</span>}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={campo.key} style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--ink-3)', marginBottom:4 }}>{campo.label}</div>
                {campo.tipo === 'textarea' ? (
                  <textarea
                    value={form[campo.key] || ''}
                    onChange={e => setForm(f => ({...f, [campo.key]: e.target.value}))}
                    placeholder="Observações…"
                    style={{ ...inputStyle, minHeight:55, resize:'vertical', lineHeight:1.5 }}
                  />
                ) : (
                  <input
                    type={campo.tipo}
                    value={form[campo.key] || ''}
                    onChange={e => setForm(f => ({...f, [campo.key]: e.target.value}))}
                    style={ehFc ? fcInputStyle : (ehAorta ? aortaInputStyle : inputStyle)}
                  />
                )}
                {ehJup && refJup && (
                  <div style={{ marginTop:4, fontSize:10, color:'var(--ink-3)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                    <span>Referência ({mes}º mês): {refJup.min.toFixed(1)} – {refJup.max.toFixed(1)} mm</span>
                    {classe && corClasse && (
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:5, color:'#fff', background:corClasse }}>
                        {labelClasse}
                      </span>
                    )}
                  </div>
                )}
                {ehFc && refFc && (
                  <div style={{ marginTop:4, fontSize:10, color: fcAlterada ? '#b91c1c' : 'var(--ink-3)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                    {fcClasse === 'alta' && <span>Frequência cardíaca acima do esperado ({refFc.min}–{refFc.max} bpm)</span>}
                    {fcClasse === 'baixa' && <span>Frequência cardíaca abaixo do esperado ({refFc.min}–{refFc.max} bpm)</span>}
                    {(!fcClasse || fcClasse === 'normal') && <span>Referência ({mes}º mês): {refFc.min}–{refFc.max} bpm</span>}
                  </div>
                )}
                {ehAorta && refAorta && (
                  <div style={{ marginTop:4, fontSize:10, color: aortaAlterada ? (aortaClasse === 'critico' ? '#7f1d1d' : '#b91c1c') : 'var(--ink-3)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                    {aortaClasse === 'alta' && <span>Aorta fetal acima do esperado (ref. {refAorta} mm)</span>}
                    {aortaClasse === 'baixa' && <span>Aorta fetal abaixo do esperado (ref. {refAorta} mm)</span>}
                    {aortaClasse === 'critico' && <span>⚠ Aorta fetal muito abaixo do esperado — restrição de crescimento intrauterino</span>}
                    {(!aortaClasse || aortaClasse === 'normal') && <span>Referência ({mes}º mês): {refAorta} mm</span>}
                  </div>
                )}
                {/* Hint sob o campo Volume — mostra sempre ali quando OF tem
                    classificação com volume prioritário. Se só largura tem
                    valor, o hint vai embaixo do input de largura. */}
                {ehOf && ofClasse && (
                  (ofClasse.tipo === 'volume' && campo.key === 'orbitaVolume') ||
                  (ofClasse.tipo === 'largura' && campo.key === 'orbitaLargura')
                ) && (
                  <div style={{ marginTop:4, fontSize:10, color: ofClasseAtiva ? (ofClasse.classe === 'critico' ? '#7f1d1d' : '#b91c1c') : 'var(--ink-3)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                    {ofClasse.classe === 'alta' && <span>Órbita fetal acima da medida esperada (ref. {ofClasse.ref.min === ofClasse.ref.max ? ofClasse.ref.min : `${ofClasse.ref.min}–${ofClasse.ref.max}`} {ofClasse.unidade})</span>}
                    {ofClasse.classe === 'baixa' && <span>Órbita fetal abaixo da medida esperada (ref. {ofClasse.ref.min === ofClasse.ref.max ? ofClasse.ref.min : `${ofClasse.ref.min}–${ofClasse.ref.max}`} {ofClasse.unidade})</span>}
                    {ofClasse.classe === 'critico' && <span>⚠ Órbita fetal muito abaixo do esperado — restrição de crescimento intrauterino</span>}
                    {ofClasse.classe === 'normal' && <span>Dentro da faixa esperada ({ofClasse.ref.min === ofClasse.ref.max ? ofClasse.ref.min : `${ofClasse.ref.min}–${ofClasse.ref.max}`} {ofClasse.unidade})</span>}
                  </div>
                )}
              </div>
            );
          })}

          <button onClick={handleSalvar} style={{
            width:'100%', padding:'10px', borderRadius:10, border:'none',
            background: saved ? '#16a34a' : 'var(--accent)',
            color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--sans)',
            transition:'background 0.2s',
          }}>
            {saved ? '✓ Salvo!' : `Salvar ${mes}º mês`}
          </button>
        </div>
      )}
    </div>
  );
}

// Componente pros meses 0-2, que aceitam MÚLTIPLAS palpações.
// Estrutura: dados = { palpacoes: [ { data, ...campos }, ... ] }
function MesPalpacoes({ mes, mesAtual, dados, expandido, temDados, onToggle, onSalvar }) {
  const [palpacoes, setPalpacoes] = useState(() => {
    const p = dados?.palpacoes;
    return Array.isArray(p) && p.length > 0 ? p.map(x => ({ ...PALPACAO_VAZIA, ...x })) : [{ ...PALPACAO_VAZIA, data: '' }];
  });
  const [saved, setSaved] = useState(false);
  const isAtual = mes === mesAtual;

  const inputStyle = {
    width:'100%', boxSizing:'border-box', padding:'9px 11px', borderRadius:9,
    border:'1px solid var(--line)', background:'var(--bg)',
    fontSize:13, color:'var(--ink)', fontFamily:'var(--sans)', outline:'none',
  };

  const updatePalpacao = (idx, key, valor) => {
    setPalpacoes(prev => prev.map((p, i) => i === idx ? { ...p, [key]: valor } : p));
  };
  const removerPalpacao = (idx) => {
    setPalpacoes(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : [{ ...PALPACAO_VAZIA }]);
  };
  const adicionarPalpacao = () => {
    setPalpacoes(prev => [...prev, { ...PALPACAO_VAZIA }]);
  };

  const handleSalvar = () => {
    // Filtra palpações vazias antes de salvar
    const naoVazias = palpacoes.filter(p =>
      p.data || p.tamanhoVesicula || p.aspectoUterino || p.presencaCL ||
      p.iniciarProgesterona || p.batimentoCardiaco || p.obs
    );
    onSalvar({ palpacoes: naoVazias });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div style={{ marginBottom:8, background:'var(--card)', border:`1px solid ${isAtual ? 'var(--accent)' : 'var(--line)'}`, borderRadius:12, overflow:'hidden' }}>
      <button onClick={onToggle} style={{
        width:'100%', padding:'12px 14px', border:'none', background: isAtual ? 'var(--accent-soft)' : 'transparent',
        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', fontFamily:'var(--sans)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:14, fontWeight:700, color: isAtual ? 'var(--accent)' : 'var(--ink)' }}>
            {mes}º Mês
          </span>
          {isAtual && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:'var(--accent)', color:'#fff' }}>Atual</span>}
          {temDados && !expandido && <span style={{ fontSize:10, color:'var(--ink-3)' }}>✓ {(dados?.palpacoes || []).length} registro(s)</span>}
        </div>
        <Icon name={expandido ? 'chevron-down' : 'chevron-right'} size={14} color="var(--ink-3)" />
      </button>

      {expandido && (
        <div style={{ padding:'0 14px 14px' }}>
          {palpacoes.map((p, idx) => (
            <div key={idx} style={{
              marginBottom:12, padding:'12px', borderRadius:10,
              background:'var(--bg)', border:'1px solid var(--line)',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--ink-2)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Palpação #{idx + 1}</span>
                {palpacoes.length > 1 && (
                  <button onClick={() => removerPalpacao(idx)} style={{
                    background:'transparent', color:'#dc2626', border:'1px solid #fca5a5',
                    borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--sans)',
                  }}>Remover</button>
                )}
              </div>
              {/* Data */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--ink-3)', marginBottom:4 }}>Data</div>
                <input type="date" value={p.data || ''} onChange={e => updatePalpacao(idx, 'data', e.target.value)} style={inputStyle} />
              </div>
              {/* Campos da palpação */}
              {CAMPOS_PALPACAO.map(campo => (
                <div key={campo.key} style={{ marginBottom:10 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--ink-3)', marginBottom:4 }}>{campo.label}</div>
                  {campo.tipo === 'textarea' ? (
                    <textarea value={p[campo.key] || ''} onChange={e => updatePalpacao(idx, campo.key, e.target.value)}
                      placeholder="Observações…" style={{ ...inputStyle, minHeight:55, resize:'vertical', lineHeight:1.5 }} />
                  ) : campo.tipo === 'simnao' ? (
                    <div style={{ display:'flex', gap:6 }}>
                      {[
                        { v: '', l: '—' },
                        { v: 'sim', l: 'Sim' },
                        { v: 'nao', l: 'Não' },
                      ].map(opt => {
                        const sel = (p[campo.key] || '') === opt.v;
                        return (
                          <button key={opt.v || 'vazio'} onClick={() => updatePalpacao(idx, campo.key, opt.v)} style={{
                            flex:1, padding:'8px 4px', borderRadius:8, cursor:'pointer', fontFamily:'var(--sans)',
                            border:`1px solid ${sel ? 'var(--accent)' : 'var(--line)'}`,
                            background: sel ? 'var(--accent-soft)' : 'var(--card)',
                            color: sel ? 'var(--accent)' : 'var(--ink-3)',
                            fontSize:12, fontWeight: sel ? 700 : 500,
                          }}>{opt.l}</button>
                        );
                      })}
                    </div>
                  ) : campo.tipo === 'check' ? (
                    <label style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 11px', background:'var(--card)', border:'1px solid var(--line)', borderRadius:9, cursor:'pointer' }}>
                      <input type="checkbox" checked={!!p[campo.key]} onChange={e => updatePalpacao(idx, campo.key, e.target.checked)} style={{ width:18, height:18, accentColor:'var(--accent)' }} />
                      <span style={{ fontSize:13, color:'var(--ink)' }}>Marcar</span>
                    </label>
                  ) : (
                    <input type={campo.tipo} value={p[campo.key] || ''} onChange={e => updatePalpacao(idx, campo.key, e.target.value)} style={inputStyle} />
                  )}
                </div>
              ))}
            </div>
          ))}

          <button onClick={adicionarPalpacao} style={{
            width:'100%', padding:'10px', borderRadius:10, border:'1px dashed var(--accent)',
            background:'var(--accent-soft)', color:'var(--accent)',
            fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--sans)', marginBottom:10,
          }}>+ Adicionar palpação</button>

          <button onClick={handleSalvar} style={{
            width:'100%', padding:'10px', borderRadius:10, border:'none',
            background: saved ? '#16a34a' : 'var(--accent)',
            color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--sans)',
            transition:'background 0.2s',
          }}>
            {saved ? '✓ Salvo!' : `Salvar ${mes}º mês`}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Aba: Vacinação / Vermifugação da égua gestante
// Reutiliza calcAgendaVac / calcAgendaVerm (definidos em veterinaria.jsx)
// e filtra pra ESTE cavalo específico. "Aplicar" chama a mesma pipeline
// da Vacinação/Vermifugação padrão — cobrança via addRegistro.
// ─────────────────────────────────────────────────────────────
function VacinacaoVermifugacaoTab({
  cavalo, protocolosVacinacao, vacinacoesAnimais, upsertVacinacaoAnimal,
  protocolosVermifugacao, vermifugacoesAnimais, addVermifugacaoAnimal,
  insumos = [], addRegistro, addAtividade, currentUser,
}) {
  const hojeStr = new Date().toISOString().slice(0, 10);
  // Esta aba é do período GESTACIONAL — só mostra doses relevantes à gestação
  // atual. Ignora vacinas antigas (ex.: protocolo de potro aplicado em 2017
  // quando esta hoje-égua era potra) que só poluem a lista.
  const inicioGestacao = cavalo.gestacao?.dataCobricao || null;
  const filtrarPorGestacao = (item) => {
    if (!inicioGestacao) return true;
    if (item.feito) {
      const dataFeita = (item.feitoEm || '').slice(0, 10) || item.dataPrevista;
      return !!dataFeita && dataFeita >= inicioGestacao;
    }
    return item.dataPrevista && item.dataPrevista >= inicioGestacao;
  };

  // Agenda de vacinas pra este cavalo (inclui feitas — calcAgendaVac já emite)
  const agendaVacFull = useMemo(
    () => calcAgendaVac(protocolosVacinacao || [], [cavalo], vacinacoesAnimais || []),
    [protocolosVacinacao, cavalo, vacinacoesAnimais]
  );
  const agendaVac = useMemo(
    () => agendaVacFull
      .filter(i => i.cavaloId === cavalo.id && filtrarPorGestacao(i))
      .map(i => ({ ...i, tipo: 'vac' })),
    [agendaVacFull, cavalo.id, inicioGestacao]
  );

  // Vermifugações pendentes (calcAgendaVerm só emite pendentes)
  const agendaVermFull = useMemo(
    () => calcAgendaVerm(protocolosVermifugacao || [], [cavalo], vermifugacoesAnimais || []),
    [protocolosVermifugacao, cavalo, vermifugacoesAnimais]
  );
  const agendaVerm = useMemo(
    () => agendaVermFull
      .filter(i => i.cavaloId === cavalo.id && filtrarPorGestacao(i))
      .map(i => ({ ...i, tipo: 'verm' })),
    [agendaVermFull, cavalo.id, inicioGestacao]
  );

  // Vermifugações realizadas — calcAgendaVerm não devolve feitas, então
  // resolvemos direto da tabela e reconstruímos os campos que LinhaAgenda usa.
  const vermFeitas = useMemo(() => {
    return (vermifugacoesAnimais || [])
      .filter(v => v.cavaloId === cavalo.id && !v.cancelado && !v.reagendadoPara)
      .filter(v => !inicioGestacao || (v.dataRealizacao || '') >= inicioGestacao)
      .map(v => {
        const prot = (protocolosVermifugacao || []).find(p => p.id === v.protocoloId);
        const etapa = prot && v.etapaIdx != null ? (prot.etapas || [])[v.etapaIdx] : null;
        return {
          key: `verm_feita_${v.id}`,
          tipo: 'verm',
          protocoloId: v.protocoloId,
          protocoloNome: prot?.nome || v.produto || 'Vermífugo',
          cavaloId: v.cavaloId, cavaloNome: cavalo.nome,
          dataPrevista: v.dataRealizacao || null,
          feitoEm: v.dataRealizacao || null,
          feitoPor: v.registradoPor || '',
          feito: true,
          insumoId: etapa?.insumoId || prot?.insumoId || '',
          etapaIdx: v.etapaIdx,
          etapaLabel: etapa?.label || null,
          diasRestantes: null,
        };
      });
  }, [vermifugacoesAnimais, protocolosVermifugacao, cavalo.id, cavalo.nome, inicioGestacao]);

  // Lista única: vacinação + vermifugação juntos
  const agendaTudo = useMemo(
    () => [...agendaVac, ...agendaVerm, ...vermFeitas],
    [agendaVac, agendaVerm, vermFeitas]
  );

  // Separar em atrasadas / hoje / futuras / feitas, ordenadas por data
  const splitAgenda = (items) => {
    const atrasadas = [], hoje = [], futuras = [], feitas = [];
    items.forEach(it => {
      if (it.feito) { feitas.push(it); return; }
      const dias = it.diasRestantes;
      if (dias == null) { futuras.push(it); return; }
      if (dias < 0) atrasadas.push(it);
      else if (dias === 0) hoje.push(it);
      else futuras.push(it);
    });
    const dataDe = (it) => (it.feitoEm || '').slice(0, 10) || it.dataPrevista || '';
    const cmp = (a, b) => (dataDe(a) || '').localeCompare(dataDe(b) || '');
    atrasadas.sort(cmp); hoje.sort(cmp); futuras.sort(cmp); feitas.sort(cmp);
    return { atrasadas, hoje, futuras, feitas };
  };

  const grupos = splitAgenda(agendaTudo);

  // Handler de aplicar vacina (mesma pipeline da tela de Vacinação)
  const aplicarVacina = (item) => {
    const vacId = `vac_${item.protocoloId}_${item.doseIdx}_${item.cavaloId}`;
    const vacinaId = item.dose?.insumoId || item.insumoId;
    const vacina = insumos.find(i => i.id === vacinaId);
    upsertVacinacaoAnimal({
      id: vacId, protocoloId: item.protocoloId, doseIdx: item.doseIdx,
      cavaloId: item.cavaloId, dataPrevista: item.dataPrevista,
      feito: true, feitoPor: currentUser?.nome || '', feitoEm: hojeStr + 'T12:00:00',
    });
    if (vacina) {
      addRegistro && addRegistro({
        id: 'reg_vac_' + Date.now() + '_' + cavalo.id,
        cavaloId: cavalo.id, insumoId: vacina.id, qtd: 1,
        hora: new Date().toTimeString().slice(0, 5),
        usuario: currentUser?.nome || '', isAuto: false, data: hojeStr,
      });
      (vacina.descartaveis || []).forEach(d => {
        addRegistro && addRegistro({
          id: 'reg_vac_desc_' + d.insumoId + '_' + Date.now() + '_' + cavalo.id,
          cavaloId: cavalo.id, insumoId: d.insumoId, qtd: d.qtd || 1,
          hora: new Date().toTimeString().slice(0, 5),
          usuario: currentUser?.nome || '', isAuto: true, data: hojeStr,
        });
      });
      addAtividade && addAtividade({
        id: 'at_vac_' + Date.now() + '_' + cavalo.id,
        tipo: 'vacinacao', cavaloId: cavalo.id, insumoId: vacina.id, qtd: 1,
        motivo: `${item.protocoloNome} · ${item.dose?.label || 'Dose ' + (item.doseIdx + 1)}`,
        usuario: currentUser?.nome || '', autor: currentUser?.nome || '',
        mes: hojeStr.slice(0, 7), data: hojeStr,
        hora: new Date().toTimeString().slice(0, 5), texto: '',
      });
    }
  };

  // Handler aplicar vermifugação
  const aplicarVermifugacao = (item) => {
    const insumo = insumos.find(i => i.id === item.insumoId);
    const vermId = 'verm_' + Date.now() + '_' + cavalo.id;
    addVermifugacaoAnimal && addVermifugacaoAnimal({
      id: vermId, protocoloId: item.protocoloId, cavaloId: cavalo.id,
      dataRealizacao: hojeStr, produto: insumo?.nome || '',
      registradoPor: currentUser?.nome || '',
      etapaIdx: item.etapaIdx ?? null,
    });
    if (insumo) {
      addRegistro && addRegistro({
        id: 'reg_verm_' + Date.now() + '_' + cavalo.id,
        cavaloId: cavalo.id, insumoId: insumo.id, qtd: 1,
        hora: new Date().toTimeString().slice(0, 5),
        usuario: currentUser?.nome || '', isAuto: false, data: hojeStr,
      });
      addAtividade && addAtividade({
        id: 'at_verm_' + Date.now() + '_' + cavalo.id,
        tipo: 'vermifugacao', cavaloId: cavalo.id, insumoId: insumo.id, qtd: 1,
        motivo: `${item.protocoloNome}${item.etapaLabel ? ' · ' + item.etapaLabel : ''}`,
        usuario: currentUser?.nome || '', autor: currentUser?.nome || '',
        mes: hojeStr.slice(0, 7), data: hojeStr,
        hora: new Date().toTimeString().slice(0, 5), texto: '',
      });
    }
  };

  // Cancelar dose de vacina — cria um registro cancelado.
  const cancelarVacina = (item) => {
    const vacId = `vac_${item.protocoloId}_${item.doseIdx}_${item.cavaloId}`;
    upsertVacinacaoAnimal({
      id: vacId, protocoloId: item.protocoloId, doseIdx: item.doseIdx,
      cavaloId: item.cavaloId, dataPrevista: item.dataPrevista,
      feito: false, cancelado: true,
      canceladoPor: currentUser?.nome || '', canceladoEm: new Date().toISOString(),
    });
  };
  // Cancelar dose de vermífugo — insere um registro cancelado.
  const cancelarVermifugacao = (item) => {
    const vermId = 'verm_cancel_' + Date.now() + '_' + cavalo.id;
    addVermifugacaoAnimal && addVermifugacaoAnimal({
      id: vermId, protocoloId: item.protocoloId, cavaloId: cavalo.id,
      dataRealizacao: hojeStr, produto: '(cancelada)',
      registradoPor: currentUser?.nome || '',
      etapaIdx: item.etapaIdx ?? null,
      cancelado: true, canceladoPor: currentUser?.nome || '',
      canceladoEm: new Date().toISOString(),
    });
  };

  const secaoVazia = agendaTudo.length === 0;

  // Dispatcher: cada item traz seu tipo (vac | verm)
  const aplicarItem = (it) => it.tipo === 'verm' ? aplicarVermifugacao(it) : aplicarVacina(it);
  const cancelarItem = (it) => it.tipo === 'verm' ? cancelarVermifugacao(it) : cancelarVacina(it);
  const tipoLabelItem = (it) => it.tipo === 'verm' ? 'vermífugo' : 'vacina';

  return (
    <div style={{ padding: '14px 16px 16px' }}>
      {secaoVazia && (
        <div style={{ background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 12, padding: 20, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          Sem vacinas ou vermifugações no período gestacional.
        </div>
      )}

      {agendaTudo.length > 0 && (
        <BlocoAgenda
          titulo="Vacinação e Vermifugação"
          icone="syringe"
          cor="#1d4ed8"
          grupos={grupos}
          insumos={insumos}
          onAplicar={aplicarItem}
          onCancelar={cancelarItem}
          tipoLabelPorItem={tipoLabelItem}
        />
      )}
    </div>
  );
}

function BlocoAgenda({ titulo, icone, cor, grupos, insumos, onAplicar, onCancelar, tipoLabel, tipoLabelPorItem }) {
  const labelDe = (it) => tipoLabelPorItem ? tipoLabelPorItem(it) : tipoLabel;
  return (
    <div style={{ marginBottom: 18, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: cor + '22', display: 'grid', placeItems: 'center' }}>
          <Icon name={icone} size={15} color={cor} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{titulo}</span>
      </div>

      <div style={{ padding: '10px 12px' }}>
        {grupos.atrasadas.length > 0 && (
          <>
            <SubTituloAgenda cor="#dc2626">Atrasadas ({grupos.atrasadas.length})</SubTituloAgenda>
            {grupos.atrasadas.map(it => <LinhaAgenda key={it.key} it={it} cor="#dc2626" insumos={insumos} onAplicar={onAplicar} onCancelar={onCancelar} tipoLabel={labelDe(it)} />)}
          </>
        )}
        {grupos.hoje.length > 0 && (
          <>
            <SubTituloAgenda cor="var(--accent)">Hoje ({grupos.hoje.length})</SubTituloAgenda>
            {grupos.hoje.map(it => <LinhaAgenda key={it.key} it={it} cor="var(--accent)" insumos={insumos} onAplicar={onAplicar} onCancelar={onCancelar} tipoLabel={labelDe(it)} />)}
          </>
        )}
        {grupos.futuras.length > 0 && (
          <>
            <SubTituloAgenda cor="#b45309">Futuras ({grupos.futuras.length})</SubTituloAgenda>
            {grupos.futuras.map(it => <LinhaAgenda key={it.key} it={it} cor="#b45309" insumos={insumos} onAplicar={onAplicar} onCancelar={onCancelar} tipoLabel={labelDe(it)} />)}
          </>
        )}
        {grupos.feitas.length > 0 && (
          <>
            <SubTituloAgenda cor="#6b7280">Realizadas ({grupos.feitas.length})</SubTituloAgenda>
            {grupos.feitas.map(it => <LinhaAgenda key={it.key} it={it} cor="#6b7280" insumos={insumos} feita />)}
          </>
        )}
      </div>
    </div>
  );
}

function SubTituloAgenda({ cor, children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: cor, marginTop: 8, marginBottom: 6 }}>
      {children}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// PROGESTERONA — controle de aplicação exógena em receptoras
// ═════════════════════════════════════════════════════════════
const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function ProgesteronaTab({
  cavalos, proprietarios, insumos, currentUser,
  programas, aplicacoes, busca,
  addPrograma, encerrarPrograma, deletePrograma, updateAplicacao,
  addRegistro, deleteRegistro, addAtividade,
}) {
  const [showForm, setShowForm] = useState(false);

  const q = (busca || '').trim().toLowerCase();
  const programasVisiveis = programas.filter(p => {
    if (!q) return true;
    const cav = cavalos.find(c => c.id === p.cavaloId);
    const prop = cav && proprietarios.find(o => o.id === cav.proprietarioId);
    return norm(cav?.nome).includes(norm(q)) || (prop?.nome && norm(prop.nome).includes(norm(q)));
  });

  const ativos = programasVisiveis.filter(p => p.status === 'ativo');
  const encerrados = programasVisiveis.filter(p => p.status !== 'ativo');

  // Todas as gestantes elegíveis: qualquer égua marcada como Gestante
  // (categoria ou lista de categorias) OU com data de cobertura registrada.
  // Sem exigir cobertura — algumas não têm essa data preenchida ainda mas
  // já estão sob cuidado gestacional. Ordem alfabética.
  const isGestante = (c) =>
    c.categoria === 'Gestante' ||
    (c.categorias || []).includes('Gestante') ||
    !!c.gestacao?.dataCobricao;
  const gestantesElegiveis = cavalos
    .filter(c =>
      c.presente && isGestante(c) &&
      !programas.some(p => p.cavaloId === c.id && p.status === 'ativo')
    )
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

  const marcarAplicacao = async (aplicacao, programa) => {
    const insumo = insumos.find(i => i.id === programa.insumoId);
    const hoje = new Date().toISOString().slice(0, 10);
    const hora = new Date().toTimeString().slice(0, 5);
    const usuario = currentUser?.nome || '';
    const rid = 'reg_prog_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
    let descartaveisRegistros = [];
    if (insumo) {
      addRegistro && addRegistro({
        id: rid, cavaloId: programa.cavaloId, insumoId: insumo.id,
        qtd: Number(programa.doseQtd) || 1,
        hora, usuario, isAuto: false, data: hoje,
      });
      addAtividade && addAtividade({
        id: 'at_' + rid, tipo: 'insumo', cavaloId: programa.cavaloId,
        insumoId: insumo.id, qtd: Number(programa.doseQtd) || 1,
        motivo: `Progesterona · ${insumo.nome}`,
        usuario, autor: usuario, mes: hoje.slice(0, 7),
        data: hoje, hora, texto: '',
      });
      // Progesterona é injetável — cobra 1 kit descartável (agulha, seringa,
      // algodão) por dose. Mesma pipeline da vacinação e emergência.
      if (insumo.injetavel && insumo.descartaveis?.length) {
        descartaveisRegistros = addDescartaveis(
          addRegistro, insumo.id, programa.cavaloId, 1,
          insumos, hora, usuario, hoje
        );
      }
    }
    await updateAplicacao(aplicacao.id, {
      status: 'feito', feitoEm: new Date().toISOString(),
      feitoPor: usuario, registroId: rid,
      descartaveisRegistros,
    });
  };

  const desmarcarAplicacao = async (aplicacao) => {
    if (!window.confirm('Desfazer? Remove a cobrança da fatura (medicamento + descartáveis).')) return;
    // Remove registro do medicamento
    if (aplicacao.registroId) {
      try { deleteRegistro && deleteRegistro(aplicacao.registroId); } catch (e) { console.error(e); }
    }
    // Remove registros dos descartáveis (agulha, seringa, algodão)
    (aplicacao.descartaveisRegistros || []).forEach(d => {
      try { deleteRegistro && deleteRegistro(d.registroId); } catch (e) { console.error(e); }
    });
    await updateAplicacao(aplicacao.id, {
      status: 'programado', feitoEm: null, feitoPor: '', registroId: null,
      descartaveisRegistros: [],
    });
  };

  const cancelarAplicacao = async (aplicacao) => {
    if (!window.confirm('Cancelar esta aplicação (não vai aplicar nessa data)?')) return;
    await updateAplicacao(aplicacao.id, { status: 'cancelado' });
  };

  return (
    <div style={{ padding: '14px 16px 16px' }}>
      {!showForm && gestantesElegiveis.length > 0 && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--sans)', marginBottom: 14,
          }}
        >
          + Novo programa de progesterona
        </button>
      )}

      {showForm && (
        <ProgesteronaForm
          gestantes={gestantesElegiveis}
          insumos={insumos}
          onCancel={() => setShowForm(false)}
          onSave={async (data) => {
            const id = await addPrograma(data);
            if (id) setShowForm(false);
          }}
        />
      )}

      {ativos.length === 0 && encerrados.length === 0 && !showForm && (
        <div style={{ background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 12, padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          Nenhum programa de progesterona ativo.
          {gestantesElegiveis.length === 0 && (
            <div style={{ fontSize: 11, marginTop: 8 }}>
              Cadastre uma égua gestante (com data de cobertura) para poder criar um programa.
            </div>
          )}
        </div>
      )}

      {ativos.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 8 }}>
            Ativos ({ativos.length})
          </div>
          {ativos.map(p => (
            <ProgramaCard
              key={p.id} programa={p}
              cavalo={cavalos.find(c => c.id === p.cavaloId)}
              proprietario={proprietarios.find(pr => {
                const cav = cavalos.find(c => c.id === p.cavaloId);
                return cav && pr.id === cav.proprietarioId;
              })}
              insumo={insumos.find(i => i.id === p.insumoId)}
              aplicacoes={aplicacoes.filter(a => a.programaId === p.id)}
              onMarcar={(apl) => marcarAplicacao(apl, p)}
              onDesmarcar={desmarcarAplicacao}
              onCancelar={cancelarAplicacao}
              onEncerrar={() => { if (window.confirm('Encerrar programa? Aplicações futuras serão canceladas.')) encerrarPrograma(p.id); }}
              onDelete={() => { if (window.confirm('EXCLUIR programa e todas as aplicações? Não pode ser desfeito.')) deletePrograma(p.id); }}
            />
          ))}
        </div>
      )}

      {encerrados.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 8 }}>
            Encerrados ({encerrados.length})
          </div>
          {encerrados.map(p => (
            <ProgramaCard
              key={p.id} programa={p} dim
              cavalo={cavalos.find(c => c.id === p.cavaloId)}
              proprietario={proprietarios.find(pr => {
                const cav = cavalos.find(c => c.id === p.cavaloId);
                return cav && pr.id === cav.proprietarioId;
              })}
              insumo={insumos.find(i => i.id === p.insumoId)}
              aplicacoes={aplicacoes.filter(a => a.programaId === p.id)}
              onDelete={() => { if (window.confirm('EXCLUIR programa encerrado e todo o histórico?')) deletePrograma(p.id); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProgramaCard({ programa, cavalo, proprietario, insumo, aplicacoes, onMarcar, onDesmarcar, onCancelar, onEncerrar, onDelete, dim }) {
  const [aberto, setAberto] = useState(!dim);
  const hoje = new Date().toISOString().slice(0, 10);
  const feitas = aplicacoes.filter(a => a.status === 'feito').length;
  const programadas = aplicacoes.filter(a => a.status === 'programado').length;
  const proxima = aplicacoes
    .filter(a => a.status === 'programado')
    .sort((a, b) => a.data.localeCompare(b.data))[0];

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)',
      borderLeft: `3px solid ${dim ? '#9ca3af' : '#7c3aed'}`,
      borderRadius: 10, padding: '10px 12px', marginBottom: 8,
      opacity: dim ? 0.7 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => setAberto(v => !v)}
          style={{ flex: 1, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
            {cavalo?.nome || '—'}
            {proprietario && <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 400, marginLeft: 6 }}>· {proprietario.nome}</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
            {insumo?.nome || '—'} · {programa.doseQtd} {insumo?.unidade || 'ml'} · a cada {programa.freqDias}d ({DIAS_SEMANA_ABREV[programa.diaSemana]})
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
            {fmtDate(programa.inicio)} → {fmtDate(programa.fim)} · <b>{feitas}</b> feitas · <b>{programadas}</b> programadas
            {proxima && `· próxima ${fmtDate(proxima.data)}`}
          </div>
        </button>
        <span style={{ fontSize: 12, color: 'var(--ink-3)', transform: aberto ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▸</span>
      </div>

      {aberto && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
          {aplicacoes.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', padding: '8px 0' }}>
              Nenhuma aplicação gerada.
            </div>
          ) : aplicacoes
            .sort((a, b) => a.data.localeCompare(b.data))
            .map(a => (
              <LinhaAplicacao
                key={a.id} a={a} hoje={hoje}
                insumo={insumo}
                doseQtd={programa.doseQtd}
                dim={dim}
                onMarcar={onMarcar && (() => onMarcar(a))}
                onDesmarcar={onDesmarcar && (() => onDesmarcar(a))}
                onCancelar={onCancelar && (() => onCancelar(a))}
              />
            ))}

          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {onEncerrar && (
              <button
                onClick={onEncerrar}
                style={{ flex: 1, background: 'var(--soft)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 8, padding: '7px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}
              >Encerrar programa</button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                style={{ background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}
              >Excluir</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LinhaAplicacao({ a, hoje, insumo, doseQtd, dim, onMarcar, onDesmarcar, onCancelar }) {
  const CFG = {
    programado: { cor: '#7c3aed', bg: '#7c3aed10', label: 'Prog.' },
    feito:      { cor: '#15803d', bg: '#15803d10', label: 'Feito' },
    cancelado:  { cor: '#6b7280', bg: '#6b728010', label: 'Cancel.' },
  };
  const c = CFG[a.status] || CFG.programado;
  const atrasado = a.status === 'programado' && a.data < hoje;

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)',
      borderLeft: `3px solid ${atrasado ? '#dc2626' : c.cor}`,
      borderRadius: 6, padding: '6px 8px', marginBottom: 4,
      display: 'flex', alignItems: 'center', gap: 8,
      opacity: a.status === 'cancelado' ? 0.6 : 1,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--ink)', textDecoration: a.status === 'cancelado' ? 'line-through' : 'none' }}>
          {fmtDate(a.data)}
          {atrasado && <span style={{ marginLeft: 6, fontSize: 9, color: '#dc2626', background: '#fee2e2', borderRadius: 4, padding: '1px 5px', fontWeight: 700, letterSpacing: '0.05em' }}>ATRASADO</span>}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>
          {doseQtd} {insumo?.unidade || 'ml'} {insumo?.nome}
          {a.feitoPor && ` · ${a.feitoPor}`}
        </div>
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, color: c.cor, background: c.bg, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {c.label}
      </span>
      {!dim && (
        <div style={{ display: 'flex', gap: 3 }}>
          {a.status === 'programado' && onMarcar && (
            <>
              <button onClick={onMarcar} title="Aplicar" style={{ width: 24, height: 24, borderRadius: 5, background: '#15803d15', border: '1px solid #15803d45', color: '#15803d', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center', fontFamily: 'var(--sans)' }}>✓</button>
              <button onClick={onCancelar} title="Cancelar" style={{ width: 24, height: 24, borderRadius: 5, background: '#b4530915', border: '1px solid #b4530945', color: '#b45309', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center', fontFamily: 'var(--sans)' }}>⊘</button>
            </>
          )}
          {a.status === 'feito' && onDesmarcar && (
            <button onClick={onDesmarcar} title="Desfazer" style={{ width: 24, height: 24, borderRadius: 5, background: '#dc262615', border: '1px solid #dc262645', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center', fontFamily: 'var(--sans)' }}>↺</button>
          )}
        </div>
      )}
    </div>
  );
}

function ProgesteronaForm({ gestantes, insumos, onCancel, onSave }) {
  const [cavaloId, setCavaloId] = useState('');
  const [busca, setBusca] = useState('');
  const [insumoId, setInsumoId] = useState('');
  const [doseQtd, setDoseQtd] = useState('1');
  const [freqDias, setFreqDias] = useState(7);
  const [diaSemana, setDiaSemana] = useState(1); // Segunda
  const [saving, setSaving] = useState(false);

  const cavalo = gestantes.find(c => c.id === cavaloId);
  const dataCobricao = cavalo?.gestacao?.dataCobricao;

  const gestantesFiltradas = busca.trim()
    ? gestantes.filter(c => norm(c.nome).includes(norm(busca)))
    : gestantes;

  // Defaults: início = data cobertura, fim = cobertura + 120 dias
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  React.useEffect(() => {
    if (!cavalo) { setInicio(''); setFim(''); return; }
    // Default de INÍCIO: hoje. Progesterona passada já foi cobrada em outro
    // lugar — o programa acompanha só as futuras.
    const hoje = new Date();
    const hojeStr = hoje.toISOString().slice(0, 10);
    setInicio(hojeStr);
    // Default de FIM: 120 dias após COBERTURA (regra clínica). Se cobertura
    // não estiver cadastrada, ou já passou dos 120d, usa hoje + 120d como
    // fallback razoável — o usuário pode ajustar.
    let fimD;
    if (dataCobricao) {
      fimD = new Date(dataCobricao + 'T12:00:00');
      fimD.setDate(fimD.getDate() + 120);
      if (fimD < hoje) {
        fimD = new Date(hoje);
        fimD.setDate(fimD.getDate() + 120);
      }
    } else {
      fimD = new Date(hoje);
      fimD.setDate(fimD.getDate() + 120);
    }
    setFim(fimD.toISOString().slice(0, 10));
  }, [cavaloId, dataCobricao]);

  const canSave = cavaloId && insumoId && Number(doseQtd) > 0 && inicio && fim && !saving;

  const insumosProgesterona = insumos
    .filter(i => i.categoria !== 'descartavel' && i.categoria !== 'racao' && i.categoria !== 'nutricao_base')
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

  const inputSt = { width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--card)', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box' };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        cavaloId, insumoId, doseQtd: Number(doseQtd),
        freqDias: Number(freqDias), diaSemana: Number(diaSemana),
        inicio, fim,
      });
    } finally { setSaving(false); }
  };

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)', marginBottom: 12 }}>Novo programa de progesterona</div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Égua gestante</div>
        {cavaloId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 10, padding: '9px 12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>{cavalo?.nome}</div>
              {dataCobricao && (
                <div style={{ fontSize: 11, color: 'var(--accent)', opacity: 0.75, marginTop: 1 }}>Cobertura {fmtDate(dataCobricao)}</div>
              )}
            </div>
            <button onClick={() => setCavaloId('')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 18, cursor: 'pointer', padding: 0 }}>×</button>
          </div>
        ) : (
          <>
            <input
              value={busca} onChange={e => setBusca(e.target.value)}
              placeholder={`Buscar entre ${gestantes.length} gestante${gestantes.length !== 1 ? 's' : ''}…`}
              style={{ ...inputSt, marginBottom: 5 }}
            />
            <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--card)' }}>
              {gestantesFiltradas.length === 0 ? (
                <div style={{ padding: 10, fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>
                  {gestantes.length === 0 ? 'Nenhuma gestante elegível.' : 'Nenhuma égua encontrada.'}
                </div>
              ) : gestantesFiltradas.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCavaloId(c.id); setBusca(''); }}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', padding: '8px 10px', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)' }}
                >
                  <div style={{ fontWeight: 500 }}>{c.nome}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>
                    Cobertura {fmtDate(c.gestacao?.dataCobricao)}
                    {(c.categorias || []).includes('Receptora') && ' · Receptora'}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Insumo (progesterona)</div>
        <select value={insumoId} onChange={e => setInsumoId(e.target.value)} style={inputSt}>
          <option value="">— Selecione —</option>
          {insumosProgesterona.map(i => (
            <option key={i.id} value={i.id}>{i.nome} · {i.unidade}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 4 }}>Dose</div>
          <input type="number" min="0" step="0.1" value={doseQtd} onChange={e => setDoseQtd(e.target.value)} style={inputSt} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 4 }}>A cada</div>
          <select value={freqDias} onChange={e => setFreqDias(Number(e.target.value))} style={inputSt}>
            <option value={7}>7 dias</option>
            <option value={14}>14 dias</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 4 }}>Dia da semana</div>
          <select value={diaSemana} onChange={e => setDiaSemana(Number(e.target.value))} style={inputSt}>
            {DIAS_SEMANA_ABREV.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 4 }}>Início</div>
          <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={inputSt} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 4 }}>Fim <span style={{ color: 'var(--ink-3)', textTransform: 'none' }}>(padrão: cobertura + 120d)</span></div>
          <input type="date" value={fim} onChange={e => setFim(e.target.value)} style={inputSt} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer' }}>Cancelar</button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{ flex: 2, background: canSave ? 'var(--accent)' : 'var(--soft)', border: 'none', color: canSave ? '#fff' : 'var(--ink-3)', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)', cursor: canSave ? 'pointer' : 'default' }}
        >Criar programa</button>
      </div>
    </div>
  );
}

function LinhaAgenda({ it, cor, insumos, onAplicar, onCancelar, tipoLabel, feita }) {
  const insumoId = it.dose?.insumoId || it.insumoId;
  const insumo = insumos.find(i => i.id === insumoId);
  const doseLabel = it.dose?.label || it.etapaLabel || 'Aplicação';
  const dataFmt = it.dataPrevista ? fmtDate(it.dataPrevista) : '—';
  const ehVerm = it.tipo === 'verm';
  const tagCor = ehVerm ? '#15803d' : '#1d4ed8';
  const tagBg = ehVerm ? '#dcfce7' : '#dbeafe';
  const tagLabel = ehVerm ? 'VERM' : 'VAC';

  return (
    <div style={{
      background: feita ? 'var(--soft)' : 'var(--card)',
      border: '1px solid var(--line)', borderLeft: `3px solid ${cor}`,
      borderRadius: 8, padding: '8px 10px', marginBottom: 5,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ background: tagBg, color: tagCor, borderRadius: 4, padding: '2px 5px', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', flexShrink: 0 }}>{tagLabel}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
          {it.protocoloNome} <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>· {doseLabel}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
          {dataFmt} {insumo && `· ${insumo.nome}`}
        </div>
      </div>
      {!feita && onAplicar && (
        <button
          onClick={() => onAplicar(it)}
          title={`Aplicar ${tipoLabel}`}
          style={{
            background: cor === '#dc2626' ? '#dc2626' : 'var(--accent)',
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '5px 10px', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--sans)',
          }}
        >Aplicar</button>
      )}
      {!feita && onCancelar && (
        <button
          onClick={() => { if (window.confirm(`Cancelar esta dose (${tipoLabel})? Ela deixa de aparecer na agenda.`)) onCancelar(it); }}
          title="Cancelar dose"
          style={{
            background: 'var(--card)', color: '#dc2626', border: '1px solid #fecaca',
            borderRadius: 8, padding: '5px 8px', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--sans)',
          }}
        >⊘</button>
      )}
      {feita && <span style={{ fontSize: 10, color: '#15803d', fontWeight: 700, letterSpacing: '0.05em' }}>✓ FEITO</span>}
    </div>
  );
}
