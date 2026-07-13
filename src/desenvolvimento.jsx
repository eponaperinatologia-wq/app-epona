// Desenvolvimento — dashboard biométrico, padrão Oldenburgo, Curva BH e padrões
import React, { useState, useMemo } from 'react';
import { Icon } from './icons';

const COR_DESENV = '#b45309';
const COR_PESO = '#1d4ed8';
const COR_ALTURA = '#15803d';
const COR_OLD = '#d97706';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtDate = ds => {
  if (!ds) return '';
  const [a, m, d] = ds.split('-');
  return `${d}/${m}/${a}`;
};
const inputSt = {
  width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--ink)', fontSize: 15, fontFamily: 'var(--sans)',
  outline: 'none', boxSizing: 'border-box',
};

// ─── Padrão Oldenburgo (referência para BH) ───────────────────
// Peso (kg) e altura de cernelha (cm) por idade em meses, 0–24.
export const OLDENBURGO = [
  { m: 0,  peso: 52,  altura: 101 },
  { m: 1,  peso: 108, altura: 113 },
  { m: 2,  peso: 138, altura: 120 },
  { m: 3,  peso: 160, altura: 124 },
  { m: 4,  peso: 193, altura: 128 },
  { m: 5,  peso: 210, altura: 132 },
  { m: 6,  peso: 228, altura: 137 },
  { m: 7,  peso: 249, altura: 137 },
  { m: 8,  peso: 266, altura: 139 },
  { m: 9,  peso: 294, altura: 141 },
  { m: 10, peso: 301, altura: 143 },
  { m: 11, peso: 325, altura: 147 },
  { m: 12, peso: 341, altura: 149 },
  { m: 13, peso: 358, altura: 151 },
  { m: 14, peso: 377, altura: 153 },
  { m: 15, peso: 396, altura: 155 },
  { m: 16, peso: 411, altura: 156 },
  { m: 17, peso: 416, altura: 156.5 },
  { m: 18, peso: 429, altura: 157 },
  { m: 19, peso: 448, altura: 159 },
  { m: 20, peso: 455, altura: 159.8 },
  { m: 21, peso: 463, altura: 160 },
  { m: 22, peso: 459, altura: 161 },
  { m: 23, peso: 485, altura: 161 },
  { m: 24, peso: 502, altura: 161.75 },
];
const OLD_ALTURA_ADULTA = 161.75;

const oldenburgoAt = (m, campo) => {
  if (m == null) return null;
  if (m <= 0) return OLDENBURGO[0][campo];
  if (m >= 24) return OLDENBURGO[24][campo];
  const lo = Math.floor(m), hi = Math.ceil(m);
  if (lo === hi) return OLDENBURGO[lo][campo];
  const f = m - lo;
  return OLDENBURGO[lo][campo] * (1 - f) + OLDENBURGO[hi][campo] * f;
};

// Idade em meses fracionários entre nascimento e data
const idadeMeses = (nascimento, data) => {
  if (!nascimento || !data) return null;
  const n = new Date(nascimento + 'T12:00:00');
  const d = new Date(data + 'T12:00:00');
  const dias = (d - n) / 86400000;
  if (isNaN(dias) || dias < 0) return null;
  return dias / 30.4375;
};

const fmtIdade = (meses) => {
  if (meses == null) return '—';
  if (meses < 1) return `${Math.round(meses * 30.4375)} dias`;
  const m = Math.floor(meses);
  const d = Math.round((meses - m) * 30.4375);
  if (m >= 24) {
    const anos = Math.floor(m / 12);
    return `${anos} ano${anos > 1 ? 's' : ''} e ${m - anos * 12}m`;
  }
  return d > 0 ? `${m}m ${d}d` : `${m} meses`;
};

const fmt1 = v => v == null ? '—' : (Math.round(v * 10) / 10).toLocaleString('pt-BR');

// Campos de medição — ordem e metadados
export const CAMPOS_MEDICAO = [
  { id: 'alturaCernelha',    label: 'Altura de Cernelha',      unidade: 'cm',  grupo: 'principal' },
  { id: 'peso',              label: 'Peso',                    unidade: 'kg',  grupo: 'principal' },
  { id: 'perimetroCanela',   label: 'Perímetro da Canela',     unidade: 'cm',  grupo: 'perimetros' },
  { id: 'perimetroAbdominal',label: 'Perímetro Abdominal',     unidade: 'cm',  grupo: 'perimetros' },
  { id: 'perimetroToracico', label: 'Perímetro Torácico',      unidade: 'cm',  grupo: 'perimetros' },
  { id: 'perimetroPescoco1', label: 'Perímetro de Pescoço 1',  unidade: 'cm',  grupo: 'perimetros' },
  { id: 'perimetroPescoco2', label: 'Perímetro de Pescoço 2',  unidade: 'cm',  grupo: 'perimetros' },
  { id: 'perimetroPescoco3', label: 'Perímetro de Pescoço 3',  unidade: 'cm',  grupo: 'perimetros' },
  { id: 'gorduraBaseCauda',  label: 'Gordura — Base de Cauda', unidade: '',    grupo: 'gordura' },
  { id: 'gorduraCostelas',   label: 'Gordura — Costelas',      unidade: '',    grupo: 'gordura' },
  { id: 'gorduraPescoco',    label: 'Gordura — Pescoço',       unidade: '',    grupo: 'gordura' },
];

// ─── Status vs. padrão ────────────────────────────────────────
// pct = valor do animal / valor Oldenburgo na mesma idade
const statusPadrao = (pct) => {
  if (pct == null) return null;
  if (pct >= 100) return { label: 'Acima do padrão', cor: '#15803d', bg: '#f0fdf4' };
  if (pct >= 97)  return { label: 'No padrão',       cor: '#b45309', bg: '#fffbeb' };
  return { label: 'Abaixo do padrão', cor: '#dc2626', bg: '#fef2f2' };
};

// Projeção de altura adulta: média da razão animal/padrão nas últimas medições
const projecaoAltura = (pontosAltura) => {
  const validos = pontosAltura.filter(p => p.x != null && p.y != null && p.x >= 0.5);
  if (validos.length === 0) return null;
  const ultimos = validos.slice(-3);
  const ratios = ultimos.map(p => p.y / oldenburgoAt(p.x, 'altura'));
  const media = ratios.reduce((s, r) => s + r, 0) / ratios.length;
  return {
    valor: media * OLD_ALTURA_ADULTA,
    min: Math.min(...ratios) * OLD_ALTURA_ADULTA,
    max: Math.max(...ratios) * OLD_ALTURA_ADULTA,
    n: ultimos.length,
  };
};

// ─── Gráfico de crescimento (idade × valor + curva Oldenburgo) ─
const niceTicks = (min, max, n = 4) => {
  const span = max - min || 1;
  const step0 = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(s => s >= step0) || step0;
  const lo = Math.floor(min / step) * step;
  const ticks = [];
  for (let v = lo; v <= max + step * 0.001; v += step) if (v >= min - step * 0.001) ticks.push(v);
  return ticks;
};

function GrowthChart({ titulo, unidade, cor, campo, pontos, banda, altura: chartH = 210 }) {
  const W = 340, H = chartH;
  const pad = { top: 26, right: 14, bottom: 26, left: 38 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;

  const xMax = Math.max(24, ...pontos.map(p => p.x || 0));
  const refPts = OLDENBURGO.map(o => ({ x: o.m, y: o[campo] }));
  const allY = [
    ...refPts.map(p => p.y),
    ...pontos.map(p => p.y),
    ...(banda || []).flatMap(b => [b.y0, b.y1]),
  ].filter(v => v != null);
  const yMin = Math.min(...allY), yMax = Math.max(...allY);
  const yPad = (yMax - yMin) * 0.08 || 5;
  const y0 = yMin - yPad, y1 = yMax + yPad;

  const sx = x => pad.left + (x / xMax) * cw;
  const sy = y => pad.top + ch - ((y - y0) / (y1 - y0)) * ch;

  const path = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');

  const yTicks = niceTicks(y0, y1, 4);
  const xStep = xMax > 30 ? 6 : 3;
  const xTicks = [];
  for (let m = 0; m <= xMax; m += xStep) xTicks.push(m);

  const bandaPath = banda && banda.length >= 2
    ? `${banda.map((b, i) => `${i === 0 ? 'M' : 'L'}${sx(b.x).toFixed(1)},${sy(b.y1).toFixed(1)}`).join(' ')} ${[...banda].reverse().map(b => `L${sx(b.x).toFixed(1)},${sy(b.y0).toFixed(1)}`).join(' ')} Z`
    : null;

  const last = pontos.length ? pontos[pontos.length - 1] : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{titulo}</span>
        <div style={{ display: 'flex', gap: 10, fontSize: 9, color: 'var(--ink-3)', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 12, height: 0, borderTop: `2px solid ${cor}`, display: 'inline-block' }} /> Haras
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 12, height: 0, borderTop: `2px dashed ${COR_OLD}`, display: 'inline-block' }} /> Oldenburgo
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        {/* grid + eixo Y */}
        {yTicks.map((t, i) => (
          <g key={'y' + i}>
            <line x1={pad.left} y1={sy(t)} x2={pad.left + cw} y2={sy(t)} stroke="var(--line)" strokeWidth="0.5" />
            <text x={pad.left - 5} y={sy(t) + 3} textAnchor="end" fontSize="8.5" fill="var(--ink-3)">{t % 1 === 0 ? t : t.toFixed(1)}</text>
          </g>
        ))}
        {/* eixo X */}
        {xTicks.map(m => (
          <g key={'x' + m}>
            <line x1={sx(m)} y1={pad.top} x2={sx(m)} y2={pad.top + ch} stroke="var(--line)" strokeWidth="0.4" strokeDasharray="2,3" />
            <text x={sx(m)} y={pad.top + ch + 13} textAnchor="middle" fontSize="8.5" fill="var(--ink-3)">{m}m</text>
          </g>
        ))}
        {/* banda min–máx (Curva BH) */}
        {bandaPath && <path d={bandaPath} fill={cor} fillOpacity="0.10" />}
        {/* curva Oldenburgo */}
        <path d={path(refPts)} fill="none" stroke={COR_OLD} strokeWidth="1.6" strokeDasharray="5,4" strokeLinecap="round" opacity="0.85" />
        {/* série do haras / animal */}
        {pontos.length >= 2 && <path d={path(pontos)} fill="none" stroke={cor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
        {pontos.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={i === pontos.length - 1 ? 4 : 2.8} fill={cor} stroke="var(--card)" strokeWidth="1" />
        ))}
        {last && (
          <text
            x={Math.min(sx(last.x) + 6, pad.left + cw - 2)}
            y={Math.max(sy(last.y) - 7, pad.top + 8)}
            textAnchor={sx(last.x) > pad.left + cw - 45 ? 'end' : 'start'}
            fontSize="10" fontWeight="700" fill={cor}
          >{fmt1(last.y)} {unidade}</text>
        )}
      </svg>
    </div>
  );
}

// Fallback: gráfico simples por data (animais sem data de nascimento)
function MiniLineChart({ dados, cor, unidade, titulo }) {
  if (!dados || dados.length < 2) return null;
  const W = 300, H = 90;
  const pad = { top: 12, right: 36, bottom: 16, left: 36 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;
  const vals = dados.map(d => d.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pts = dados.map((d, i) => ({
    x: pad.left + (i / (dados.length - 1)) * cw,
    y: pad.top + ch - ((d.v - min) / range) * ch,
    v: d.v, label: d.label,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: cor, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{titulo}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }}>
        <text x={pad.left - 4} y={pad.top + 3} textAnchor="end" fontSize="9" fill="var(--ink-3)">{max.toFixed(0)}</text>
        <text x={pad.left - 4} y={pad.top + ch + 3} textAnchor="end" fontSize="9" fill="var(--ink-3)">{min.toFixed(0)}</text>
        <line x1={pad.left} y1={pad.top} x2={pad.left + cw} y2={pad.top} stroke="var(--line)" strokeWidth="0.5" />
        <line x1={pad.left} y1={pad.top + ch} x2={pad.left + cw} y2={pad.top + ch} stroke="var(--line)" strokeWidth="0.5" />
        <path d={pathD} fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 3} fill={cor} />)}
        <text x={last.x + 5} y={last.y + 3} fontSize="10" fill={cor} fontWeight="700">{last.v.toFixed(0)}{unidade}</text>
        {dados.length <= 8 && pts.map((p, i) => (
          <text key={i} x={p.x} y={pad.top + ch + 13} textAnchor="middle" fontSize="8" fill="var(--ink-3)">{p.label}</text>
        ))}
      </svg>
    </div>
  );
}

// ─── Curva BH: agregação do haras por mês de idade ────────────
// Média por animal dentro de cada mês antes de agregar (evita viés de quem mede mais)
const curvaBH = (medicoes, cavalos) => {
  const porMes = new Map(); // m -> Map(cavaloId -> {alturas:[], pesos:[]})
  (medicoes || []).forEach(med => {
    const cav = cavalos.find(c => c.id === med.cavaloId);
    const idade = idadeMeses(cav?.nascimento, med.dataRegistro);
    if (idade == null || idade > 24.5) return;
    const m = Math.min(24, Math.round(idade));
    if (!porMes.has(m)) porMes.set(m, new Map());
    const byAnimal = porMes.get(m);
    if (!byAnimal.has(med.cavaloId)) byAnimal.set(med.cavaloId, { alturas: [], pesos: [] });
    const slot = byAnimal.get(med.cavaloId);
    if (med.alturaCernelha != null) slot.alturas.push(Number(med.alturaCernelha));
    if (med.peso != null) slot.pesos.push(Number(med.peso));
  });

  const media = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
  const linhas = [];
  [...porMes.keys()].sort((a, b) => a - b).forEach(m => {
    const alturas = [], pesos = [];
    porMes.get(m).forEach(slot => {
      const a = media(slot.alturas); if (a != null) alturas.push(a);
      const p = media(slot.pesos);   if (p != null) pesos.push(p);
    });
    if (!alturas.length && !pesos.length) return;
    linhas.push({
      m,
      nAltura: alturas.length,
      nPeso: pesos.length,
      altura: media(alturas),
      alturaMin: alturas.length ? Math.min(...alturas) : null,
      alturaMax: alturas.length ? Math.max(...alturas) : null,
      peso: media(pesos),
      pesoMin: pesos.length ? Math.min(...pesos) : null,
      pesoMax: pesos.length ? Math.max(...pesos) : null,
    });
  });
  return linhas;
};

// ─── Padrões: correlação de Pearson ───────────────────────────
const pearson = (pares) => {
  const n = pares.length;
  if (n < 3) return null;
  const mx = pares.reduce((s, p) => s + p[0], 0) / n;
  const my = pares.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  pares.forEach(([x, y]) => { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; });
  if (sxx === 0 || syy === 0) return null;
  return { r: sxy / Math.sqrt(sxx * syy), n };
};

const FEATURES_NASC = [
  { id: 'perimetroCanela',   label: 'perímetro de canela ao nascer' },
  { id: 'peso',              label: 'peso ao nascer' },
  { id: 'alturaCernelha',    label: 'altura ao nascer' },
  { id: 'perimetroToracico', label: 'perímetro torácico ao nascer' },
];

const analisarPadroes = (medicoes, cavalos) => {
  // por animal: medição de nascimento (≤45 dias) + projeção de altura adulta
  const animais = [];
  cavalos.forEach(cav => {
    if (!cav.nascimento) return;
    const meds = (medicoes || [])
      .filter(m => m.cavaloId === cav.id)
      .map(m => ({ ...m, idade: idadeMeses(cav.nascimento, m.dataRegistro) }))
      .filter(m => m.idade != null)
      .sort((a, b) => a.idade - b.idade);
    if (!meds.length) return;
    const nasc = meds.find(m => m.idade <= 1.5);
    const pontosAltura = meds.filter(m => m.alturaCernelha != null).map(m => ({ x: m.idade, y: Number(m.alturaCernelha) }));
    const proj = projecaoAltura(pontosAltura);
    const ultimo = meds[meds.length - 1];
    const pesoPct = ultimo.peso != null && ultimo.idade >= 0.5
      ? Number(ultimo.peso) / oldenburgoAt(ultimo.idade, 'peso') * 100 : null;
    animais.push({ cav, nasc, proj: proj?.valor ?? null, pesoPct });
  });

  const insights = [];
  FEATURES_NASC.forEach(f => {
    const paresProj = animais
      .filter(a => a.nasc?.[f.id] != null && a.proj != null)
      .map(a => [Number(a.nasc[f.id]), a.proj]);
    const res = pearson(paresProj);
    if (res) insights.push({ feature: f, alvo: 'projeção de altura adulta', unidadeAlvo: 'cm', ...res });
  });
  // peso ao nascer × peso relativo atual
  const paresPeso = animais
    .filter(a => a.nasc?.peso != null && a.pesoPct != null)
    .map(a => [Number(a.nasc.peso), a.pesoPct]);
  const resPeso = pearson(paresPeso);
  if (resPeso) insights.push({ feature: { id: 'peso', label: 'peso ao nascer' }, alvo: 'peso atual em % do padrão', unidadeAlvo: '%', ...resPeso });

  insights.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  return { animais, insights };
};

const forcaCorrelacao = (r) => {
  const abs = Math.abs(r);
  if (abs >= 0.7) return { label: 'forte', cor: '#15803d' };
  if (abs >= 0.4) return { label: 'moderada', cor: '#b45309' };
  return { label: 'fraca', cor: 'var(--ink-3)' };
};

// ─── Componentes de UI ────────────────────────────────────────

function Card({ children, style }) {
  return <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, marginBottom: 12, ...style }}>{children}</div>;
}

function SecTitle({ children, cor }) {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: cor || 'var(--ink-3)', marginBottom: 10 }}>{children}</div>;
}

function Badge({ status }) {
  if (!status) return null;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: status.cor, background: status.bg, border: `1px solid ${status.cor}33`, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>
      {status.label}
    </span>
  );
}

function HeroStat({ label, valor, unidade, cor, idade, campo }) {
  const ref = idade != null && valor != null ? oldenburgoAt(idade, campo) : null;
  const pct = ref ? (valor / ref) * 100 : null;
  const status = statusPadrao(pct);
  return (
    <div style={{ background: cor + '0d', border: `1px solid ${cor}26`, borderRadius: 12, padding: '12px 12px 10px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: cor, lineHeight: 1 }}>
        {fmt1(valor)}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-3)' }}> {unidade}</span>
      </div>
      {pct != null && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Badge status={status} />
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
            {fmt1(pct)}% do Oldenburgo ({fmt1(ref)} {unidade})
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tela principal ───────────────────────────────────────────

export function DesenvolvimentoScreen({ cavalos, currentUser, medicoes, addMedicao, updateMedicao, deleteMedicao, onBack }) {
  const [aba, setAba] = useState('animais'); // animais | curva | padroes
  const [cavaloId, setCavaloId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editMed, setEditMed] = useState(null);

  const CATS_DESENV = ['Potro ao pé', 'Potro', 'Jovem'];
  const cavalosPresentes = cavalos
    .filter(c => c.presente && (c.categorias?.length ? c.categorias : [c.categoria]).some(cat => CATS_DESENV.includes(cat)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

  const cavalo = cavalosPresentes.find(c => c.id === cavaloId) || cavalos.find(c => c.id === cavaloId);

  const meusHistorico = useMemo(() => (medicoes || [])
    .filter(m => m.cavaloId === cavaloId)
    .map(m => ({ ...m, idade: idadeMeses(cavalo?.nascimento, m.dataRegistro) }))
    .sort((a, b) => a.dataRegistro.localeCompare(b.dataRegistro)), [medicoes, cavaloId, cavalo]);

  const ultimaMedicao = meusHistorico[meusHistorico.length - 1];
  const temNascimento = !!cavalo?.nascimento;
  const idadeAtual = temNascimento ? idadeMeses(cavalo.nascimento, todayStr()) : null;

  const pontosAltura = meusHistorico.filter(m => m.alturaCernelha != null && m.idade != null).map(m => ({ x: m.idade, y: Number(m.alturaCernelha) }));
  const pontosPeso = meusHistorico.filter(m => m.peso != null && m.idade != null).map(m => ({ x: m.idade, y: Number(m.peso) }));
  const proj = temNascimento ? projecaoAltura(pontosAltura) : null;

  const fmtLbl = ds => { const [, m, d] = ds.split('-'); return `${parseInt(d)}/${parseInt(m)}`; };
  const dadosPesoData = meusHistorico.filter(m => m.peso != null).map(m => ({ v: Number(m.peso), label: fmtLbl(m.dataRegistro) }));
  const dadosAlturaData = meusHistorico.filter(m => m.alturaCernelha != null).map(m => ({ v: Number(m.alturaCernelha), label: fmtLbl(m.dataRegistro) }));

  const bh = useMemo(() => curvaBH(medicoes, cavalos), [medicoes, cavalos]);
  const padroes = useMemo(() => analisarPadroes(medicoes, cavalos), [medicoes, cavalos]);

  // resumo do rebanho para o painel geral
  const resumoRebanho = useMemo(() => {
    let noPadrao = 0, abaixo = 0, semNasc = 0;
    cavalosPresentes.forEach(c => {
      const meds = (medicoes || []).filter(m => m.cavaloId === c.id && m.alturaCernelha != null).sort((a, b) => b.dataRegistro.localeCompare(a.dataRegistro));
      const ult = meds[0];
      if (!ult) return;
      const idade = idadeMeses(c.nascimento, ult.dataRegistro);
      if (idade == null) { semNasc++; return; }
      const pct = Number(ult.alturaCernelha) / oldenburgoAt(idade, 'altura') * 100;
      if (pct >= 97) noPadrao++; else abaixo++;
    });
    return { noPadrao, abaixo, semNasc };
  }, [cavalosPresentes, medicoes]);

  const ABAS = [
    { id: 'animais', label: 'Animais' },
    { id: 'curva',   label: 'Curva BH' },
    { id: 'padroes', label: 'Padrões' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 20px 0', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 22, padding: 0, cursor: 'pointer', lineHeight: 1 }}>‹</button>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)' }}>Desenvolvimento</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={{
              flex: 1, padding: '9px 4px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: aba === a.id ? 700 : 500, fontFamily: 'var(--sans)',
              color: aba === a.id ? COR_DESENV : 'var(--ink-3)',
              borderBottom: aba === a.id ? `2.5px solid ${COR_DESENV}` : '2.5px solid transparent',
            }}>{a.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 90px' }}>

        {/* ═══ ABA ANIMAIS ═══ */}
        {aba === 'animais' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <select value={cavaloId} onChange={e => { setCavaloId(e.target.value); setShowForm(false); setEditMed(null); }} style={{ ...inputSt, fontSize: 14 }}>
                <option value="">— Selecionar animal —</option>
                {cavalosPresentes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            {/* Painel geral */}
            {!cavaloId && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                  <Card style={{ marginBottom: 0, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: COR_DESENV }}>{cavalosPresentes.length}</div>
                    <div style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>Em acompanhamento</div>
                  </Card>
                  <Card style={{ marginBottom: 0, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d' }}>{resumoRebanho.noPadrao}</div>
                    <div style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>No padrão</div>
                  </Card>
                  <Card style={{ marginBottom: 0, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: resumoRebanho.abaixo > 0 ? '#dc2626' : 'var(--ink-3)' }}>{resumoRebanho.abaixo}</div>
                    <div style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>Abaixo</div>
                  </Card>
                </div>

                <SecTitle>Potros e jovens</SecTitle>
                {cavalosPresentes.map(c => {
                  const hist = (medicoes || []).filter(m => m.cavaloId === c.id).sort((a, b) => b.dataRegistro.localeCompare(a.dataRegistro));
                  const ult = hist[0];
                  const idade = c.nascimento ? idadeMeses(c.nascimento, todayStr()) : null;
                  const idadeMed = ult && c.nascimento ? idadeMeses(c.nascimento, ult.dataRegistro) : null;
                  const pct = ult?.alturaCernelha != null && idadeMed != null
                    ? Number(ult.alturaCernelha) / oldenburgoAt(idadeMed, 'altura') * 100 : null;
                  const status = statusPadrao(pct);
                  return (
                    <button key={c.id} onClick={() => setCavaloId(c.id)} style={{ width: '100%', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 13, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fef3c7', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <Icon name="bar-chart" size={20} color={COR_DESENV} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{c.nome}</span>
                          {status && <Badge status={status} />}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                          {idade != null ? `${fmtIdade(idade)} · ` : ''}
                          {ult
                            ? <>
                                {ult.alturaCernelha != null ? `${fmt1(Number(ult.alturaCernelha))} cm` : ''}
                                {ult.alturaCernelha != null && ult.peso != null ? ' · ' : ''}
                                {ult.peso != null ? `${fmt1(Number(ult.peso))} kg` : ''}
                                {` · ${hist.length} mediç${hist.length > 1 ? 'ões' : 'ão'}`}
                              </>
                            : 'Sem medições'}
                        </div>
                        {!c.nascimento && <div style={{ fontSize: 10, color: '#b45309', marginTop: 2 }}>Sem data de nascimento cadastrada</div>}
                      </div>
                      <span style={{ fontSize: 16, color: 'var(--ink-3)' }}>›</span>
                    </button>
                  );
                })}
                {cavalosPresentes.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 14 }}>Nenhum animal presente.</div>}
              </>
            )}

            {/* Dashboard do animal */}
            {cavaloId && (
              <>
                <Card style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)' }}>{cavalo?.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      {temNascimento ? `${fmtIdade(idadeAtual)} · nasc. ${fmtDate(cavalo.nascimento)}` : 'Idade desconhecida'}
                      {` · ${meusHistorico.length} mediç${meusHistorico.length !== 1 ? 'ões' : 'ão'}`}
                    </div>
                  </div>
                  {!temNascimento && (
                    <div style={{ marginTop: 8, fontSize: 11.5, color: '#b45309', background: '#fef3c7', borderRadius: 8, padding: '7px 10px' }}>
                      Cadastre a <b>data de nascimento</b> no perfil do animal para comparar com o padrão Oldenburgo e projetar a altura adulta.
                    </div>
                  )}
                </Card>

                {ultimaMedicao && (
                  <>
                    <SecTitle cor={COR_DESENV}>Última medição · {fmtDate(ultimaMedicao.dataRegistro)}{ultimaMedicao.idade != null ? ` · ${fmtIdade(ultimaMedicao.idade)}` : ''}</SecTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                      <HeroStat label="Altura cernelha" valor={ultimaMedicao.alturaCernelha != null ? Number(ultimaMedicao.alturaCernelha) : null} unidade="cm" cor={COR_ALTURA} idade={ultimaMedicao.idade} campo="altura" />
                      <HeroStat label="Peso" valor={ultimaMedicao.peso != null ? Number(ultimaMedicao.peso) : null} unidade="kg" cor={COR_PESO} idade={ultimaMedicao.idade} campo="peso" />
                    </div>
                  </>
                )}

                {/* Projeção de altura adulta */}
                {proj && (
                  <Card style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: '#f0fdf4', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Icon name="trending-up" size={20} color={COR_ALTURA} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>Projeção de altura adulta</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: COR_ALTURA, lineHeight: 1.2 }}>
                        ~{fmt1(proj.valor)} cm
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
                        faixa {fmt1(proj.min)}–{fmt1(proj.max)} cm · baseada na posição relativa à curva Oldenburgo ({proj.n} mediç{proj.n > 1 ? 'ões' : 'ão'})
                      </div>
                    </div>
                  </Card>
                )}

                {/* Gráficos por idade × Oldenburgo */}
                {temNascimento && (pontosAltura.length >= 1 || pontosPeso.length >= 1) && (
                  <Card>
                    <SecTitle>Crescimento × padrão Oldenburgo</SecTitle>
                    {pontosAltura.length >= 1 && (
                      <div style={{ marginBottom: 18 }}>
                        <GrowthChart titulo="Altura de cernelha (cm)" unidade="cm" cor={COR_ALTURA} campo="altura" pontos={pontosAltura} />
                      </div>
                    )}
                    {pontosPeso.length >= 1 && (
                      <GrowthChart titulo="Peso (kg)" unidade="kg" cor={COR_PESO} campo="peso" pontos={pontosPeso} />
                    )}
                  </Card>
                )}

                {/* Fallback sem nascimento: por data */}
                {!temNascimento && (dadosPesoData.length >= 2 || dadosAlturaData.length >= 2) && (
                  <Card>
                    <SecTitle>Curva de crescimento (por data)</SecTitle>
                    {dadosAlturaData.length >= 2 && <div style={{ marginBottom: 16 }}><MiniLineChart dados={dadosAlturaData} cor={COR_ALTURA} unidade="cm" titulo="Altura na Cernelha (cm)" /></div>}
                    {dadosPesoData.length >= 2 && <MiniLineChart dados={dadosPesoData} cor={COR_PESO} unidade="kg" titulo="Peso (kg)" />}
                  </Card>
                )}

                {!showForm && (
                  <button onClick={() => { setEditMed(null); setShowForm(true); }} style={{ width: '100%', background: 'var(--accent-soft)', border: '1px dashed var(--accent)', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, color: 'var(--accent)', marginBottom: 14, fontFamily: 'var(--sans)', cursor: 'pointer' }}>
                    + Nova medição
                  </button>
                )}

                {showForm && (
                  <MedicaoForm
                    initial={editMed}
                    onSave={data => {
                      if (editMed) updateMedicao(editMed.id, data);
                      else addMedicao({ id: 'med_' + Date.now(), cavaloId, ...data, registradoPor: currentUser?.nome || '' });
                      setShowForm(false); setEditMed(null);
                    }}
                    onCancel={() => { setShowForm(false); setEditMed(null); }}
                  />
                )}

                {meusHistorico.length === 0 && !showForm && (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 14 }}>Nenhuma medição registrada.</div>
                )}
                {[...meusHistorico].reverse().map(med => (
                  <div key={med.id} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: COR_DESENV }}>
                        {fmtDate(med.dataRegistro)}
                        {med.idade != null && <span style={{ fontWeight: 500, color: 'var(--ink-3)' }}> · {fmtIdade(med.idade)}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setEditMed(med); setShowForm(true); }} style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 8, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--sans)', color: 'var(--ink)' }}>Editar</button>
                        <button onClick={() => { if (window.confirm('Excluir medição?')) deleteMedicao(med.id); }} style={{ background: '#fef2f2', border: 'none', borderRadius: 8, padding: '3px 8px', cursor: 'pointer' }}><Icon name="x" size={12} color="#dc2626" /></button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {CAMPOS_MEDICAO.filter(c => med[c.id] != null && med[c.id] !== '').map(c => (
                        <MedicaoChip key={c.id} label={c.label} valor={`${med[c.id]}${c.unidade ? ' ' + c.unidade : ''}`} destaque={c.grupo === 'principal'} />
                      ))}
                    </div>
                    {med.observacoes && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8, fontStyle: 'italic' }}>{med.observacoes}</div>}
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ═══ ABA CURVA BH ═══ */}
        {aba === 'curva' && (
          <>
            <Card style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Curva de crescimento BH do haras</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                Construída em tempo real com as medições dos potros (0–24 meses), comparada ao padrão Oldenburgo.
                Quanto mais medições, mais fiel a curva do Brasileiro de Hipismo do haras.
              </div>
            </Card>

            {bh.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 13 }}>
                Ainda não há medições de animais com data de nascimento cadastrada.
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <Card style={{ marginBottom: 0, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: COR_DESENV }}>{bh.length}</div>
                    <div style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>Meses com dados</div>
                  </Card>
                  <Card style={{ marginBottom: 0, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: COR_ALTURA }}>{Math.max(...bh.map(l => l.nAltura), 0)}</div>
                    <div style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>Animais (máx/mês)</div>
                  </Card>
                  <Card style={{ marginBottom: 0, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>{(medicoes || []).length}</div>
                    <div style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>Medições totais</div>
                  </Card>
                </div>

                <Card>
                  <GrowthChart
                    titulo="Altura BH média (cm)" unidade="cm" cor={COR_ALTURA} campo="altura"
                    pontos={bh.filter(l => l.altura != null).map(l => ({ x: l.m, y: l.altura }))}
                    banda={bh.filter(l => l.alturaMin != null).map(l => ({ x: l.m, y0: l.alturaMin, y1: l.alturaMax }))}
                  />
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>Faixa sombreada = mínimo–máximo entre os animais do haras.</div>
                </Card>

                <Card>
                  <GrowthChart
                    titulo="Peso BH médio (kg)" unidade="kg" cor={COR_PESO} campo="peso"
                    pontos={bh.filter(l => l.peso != null).map(l => ({ x: l.m, y: l.peso }))}
                    banda={bh.filter(l => l.pesoMin != null).map(l => ({ x: l.m, y0: l.pesoMin, y1: l.pesoMax }))}
                  />
                </Card>

                <Card>
                  <SecTitle>Tabela BH × Oldenburgo</SecTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr 1fr', gap: 0, fontSize: 11 }}>
                    <div style={thSt}>Mês</div>
                    <div style={thSt}>Altura média (Δ Old.)</div>
                    <div style={thSt}>Peso médio (Δ Old.)</div>
                    {bh.map(l => {
                      const dAlt = l.altura != null ? l.altura - oldenburgoAt(l.m, 'altura') : null;
                      const dPes = l.peso != null ? l.peso - oldenburgoAt(l.m, 'peso') : null;
                      return (
                        <React.Fragment key={l.m}>
                          <div style={tdSt}><b>{l.m}</b></div>
                          <div style={tdSt}>
                            {l.altura != null ? <>
                              {fmt1(l.altura)} cm <DeltaTxt v={dAlt} unidade="cm" /> <span style={nSt}>n={l.nAltura}</span>
                            </> : '—'}
                          </div>
                          <div style={tdSt}>
                            {l.peso != null ? <>
                              {fmt1(l.peso)} kg <DeltaTxt v={dPes} unidade="kg" /> <span style={nSt}>n={l.nPeso}</span>
                            </> : '—'}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </Card>
              </>
            )}
          </>
        )}

        {/* ═══ ABA PADRÕES ═══ */}
        {aba === 'padroes' && (
          <>
            <Card style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Padrões nos dados</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                O sistema cruza as medidas ao nascimento (até 45 dias) com o desenvolvimento posterior dos potros,
                buscando correlações. Análise exploratória: com poucos animais os resultados podem mudar bastante.
              </div>
            </Card>

            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 12 }}>
              {padroes.animais.length} anima{padroes.animais.length === 1 ? 'l' : 'is'} com dados analisáveis ·
              {' '}{padroes.animais.filter(a => a.nasc).length} com medição de nascimento
            </div>

            {padroes.insights.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 13 }}>
                Ainda não há dados suficientes (mínimo de 3 potros com medição ao nascimento e acompanhamento posterior).
              </div>
            ) : (
              padroes.insights.map((ins, i) => {
                const forca = forcaCorrelacao(ins.r);
                const positivo = ins.r > 0;
                return (
                  <Card key={i}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: forca.label === 'forte' ? '#f0fdf4' : forca.label === 'moderada' ? '#fffbeb' : 'var(--soft)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <Icon name={positivo ? 'trending-up' : 'trending-down'} size={20} color={forca.cor} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.45 }}>
                          Potros com <b>{ins.feature.label}</b> maior tendem a ter <b>{ins.alvo}</b> {positivo ? 'maior' : 'menor'}.
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: forca.cor, background: forca.label === 'forte' ? '#f0fdf4' : forca.label === 'moderada' ? '#fffbeb' : 'var(--soft)', border: `1px solid ${forca.cor}33`, borderRadius: 999, padding: '2px 8px' }}>
                            correlação {forca.label}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--ink-3)', padding: '2px 4px' }}>r = {ins.r.toFixed(2)} · n = {ins.n}</span>
                          {ins.n < 8 && <span style={{ fontSize: 10, color: '#b45309', padding: '2px 4px' }}>amostra pequena</span>}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}

const thSt = { padding: '6px 4px', fontWeight: 700, color: 'var(--ink-3)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--line)' };
const tdSt = { padding: '7px 4px', color: 'var(--ink)', borderBottom: '1px solid var(--line)', fontSize: 11.5 };
const nSt = { fontSize: 9, color: 'var(--ink-3)' };

function DeltaTxt({ v, unidade }) {
  if (v == null) return null;
  const cor = v >= 0 ? '#15803d' : '#dc2626';
  return <span style={{ color: cor, fontWeight: 700, fontSize: 10.5 }}> {v >= 0 ? '+' : ''}{fmt1(v)}</span>;
}

function MedicaoChip({ label, valor, destaque }) {
  return (
    <div style={{ background: destaque ? '#fef3c7' : 'var(--soft)', borderRadius: 8, padding: '4px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: destaque ? '1px solid #fcd34d' : 'none' }}>
      <span style={{ fontSize: 9, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: destaque ? COR_DESENV : 'var(--ink)' }}>{valor}</span>
    </div>
  );
}

function MedicaoForm({ initial, onSave, onCancel }) {
  const toStr = v => v != null ? String(v) : '';
  const [dataRegistro, setDataRegistro] = useState(initial?.dataRegistro || todayStr());
  const [vals, setVals] = useState(() => {
    const o = {};
    CAMPOS_MEDICAO.forEach(c => { o[c.id] = toStr(initial?.[c.id]); });
    return o;
  });
  const [observacoes, setObservacoes] = useState(initial?.observacoes || '');
  const setVal = (id, v) => setVals(prev => ({ ...prev, [id]: v }));
  const toNum = v => v !== '' && v != null ? Number(v) : undefined;
  const canSave = dataRegistro && CAMPOS_MEDICAO.some(c => vals[c.id] !== '');

  const GRUPOS = [
    { id: 'principal', label: 'Biometria Principal', desc: 'Alimentam gráfico e Relatório Veterinário' },
    { id: 'perimetros', label: 'Perímetros' },
    { id: 'gordura', label: 'Escore de Gordura' },
  ];

  return (
    <div style={{ background: 'var(--soft)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>
        {initial ? 'Editar medição' : 'Nova medição biométrica'}
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Data do registro *</div>
        <input type="date" value={dataRegistro} onChange={e => setDataRegistro(e.target.value)} style={inputSt} />
      </div>
      {GRUPOS.map(grupo => {
        const campos = CAMPOS_MEDICAO.filter(c => c.grupo === grupo.id);
        return (
          <div key={grupo.id} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: grupo.id === 'principal' ? COR_DESENV : 'var(--ink-3)', marginBottom: grupo.desc ? 2 : 8 }}>
              {grupo.label}
            </div>
            {grupo.desc && <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 8 }}>{grupo.desc}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {campos.map(c => (
                <div key={c.id}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>{c.label}{c.unidade ? ` (${c.unidade})` : ''}</div>
                  <input
                    type="number" min="0" step="0.1"
                    value={vals[c.id]}
                    onChange={e => setVal(c.id, e.target.value)}
                    style={{ ...inputSt, padding: '9px 11px', fontSize: 14 }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Observações</div>
        <input value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Ex: Crescimento acelerado após desmame…" style={inputSt} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', fontSize: 14, fontFamily: 'var(--sans)' }}>Cancelar</button>
        <button disabled={!canSave} onClick={() => {
          const data = { dataRegistro, observacoes };
          CAMPOS_MEDICAO.forEach(c => { data[c.id] = toNum(vals[c.id]); });
          onSave(data);
        }} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: canSave ? COR_DESENV : 'var(--soft)', color: canSave ? '#fff' : 'var(--ink-3)', fontSize: 14, fontWeight: 700, fontFamily: 'var(--sans)' }}>
          Salvar medição
        </button>
      </div>
    </div>
  );
}
