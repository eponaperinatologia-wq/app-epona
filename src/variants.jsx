// variants.jsx — Variações visuais da home + registro
// Variant B: "Estábulo" — denso, profissional, listas detalhadas
// Variant C: "Pasto" — minimal, tipográfico, bold
import React from 'react';
import logoEpona from './assets/logo-epona.png';
import { Icon } from './icons';
import { CAVALOS, SETORES, getCavalo, getInsumo, getCategoria, formatBRL } from './data';

// ─────────────────────────────────────────────────────────────
// VARIANT B — Denso / Profissional
// ─────────────────────────────────────────────────────────────
const HomeScreenB = ({ registros }) => {
  const totalHoje = registros.length;
  const cavalosAtendidos = new Set(registros.map(r => r.cavaloId)).size;
  const valorHoje = registros.reduce((s, r) => s + getInsumo(r.insumoId).valor * r.qtd, 0);

  return (
    <div style={{ paddingBottom: 90, fontFamily: 'var(--sans)' }}>
      {/* Header denso */}
      <div style={{ padding: '6px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src={logoEpona} style={{ width: 22, height: 22 }} alt="" />
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--accent)' }}>EPONA</div>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginLeft: 4 }}>seg 04/05/26 · 06:42</div>
        <div style={{ flex: 1 }} />
        <div style={{
          fontSize: 10, padding: '3px 8px', borderRadius: 4,
          background: 'var(--accent-soft)', color: 'var(--accent)',
          fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>João T.</div>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        <div style={{
          background: 'var(--ink)', color: '#fff', borderRadius: 12,
          padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 0, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 80, background: 'var(--accent)', opacity: 0.4, filter: 'blur(20px)' }}></div>
          {[
            { label: 'Registros', value: totalHoje, sub: 'hoje' },
            { label: 'Cavalos', value: cavalosAtendidos + '/' + CAVALOS.length, sub: 'atendidos' },
            { label: 'Valor', value: 'R$' + valorHoje.toFixed(0), sub: 'consumido' },
          ].map((s, i) => (
            <div key={i} style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.12)' : 'none', paddingLeft: i > 0 ? 12 : 0, position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, marginTop: 2, letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick action row */}
      <div style={{ padding: '10px 16px 0', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 6 }}>
        <button style={{
          background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10,
          padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontWeight: 600, fontSize: 13,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="plus" size={16} color="#fff" />
            Registrar
          </span>
          <Icon name="chevron-right" size={14} color="#fff" />
        </button>
        <button style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10,
          padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: 'var(--ink)',
        }}>
          <Icon name="horse" size={16} color="var(--accent)" />
          <span style={{ fontSize: 11, fontWeight: 500 }}>Cavalos</span>
        </button>
        <button style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10,
          padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: 'var(--ink)',
        }}>
          <Icon name="doc" size={16} color="var(--accent)" />
          <span style={{ fontSize: 11, fontWeight: 500 }}>Faturas</span>
        </button>
      </div>

      {/* Tabela densa */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, margin: 0, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Lançamentos do dia</h2>
          <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Ver tudo</span>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
          {/* table head */}
          <div style={{
            display: 'grid', gridTemplateColumns: '50px 1fr auto auto',
            padding: '8px 10px', fontSize: 9, color: 'var(--ink-3)',
            textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
            background: 'var(--soft)', borderBottom: '1px solid var(--line)',
          }}>
            <div>Hora</div><div>Cavalo / Insumo</div><div style={{ textAlign: 'right' }}>Qtd</div><div style={{ textAlign: 'right', paddingLeft: 10 }}>R$</div>
          </div>
          {registros.slice().reverse().slice(0, 7).map((r, i) => {
            const cav = getCavalo(r.cavaloId);
            const ins = getInsumo(r.insumoId);
            const cat = getCategoria(ins.categoria);
            return (
              <div key={r.id} style={{
                display: 'grid', gridTemplateColumns: '50px 1fr auto auto',
                padding: '8px 10px', fontSize: 12, alignItems: 'center',
                borderTop: i === 0 ? 'none' : '1px solid var(--line)',
              }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>{r.hora}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 6, background: cat.cor, flexShrink: 0 }}></span>
                    <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 12 }}>{cav.nome}</span>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>{cav.baia}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{ins.nome}</div>
                </div>
                <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--ink)' }}>{r.qtd} {ins.unidade.slice(0, 4)}</div>
                <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--ink)', fontWeight: 600, paddingLeft: 10 }}>
                  {(ins.valor * r.qtd).toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Setores quick view */}
      <div style={{ padding: '14px 16px 0' }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Setores</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {SETORES.map(s => {
            const done = s.cavalos.filter(cid => registros.some(r => r.cavaloId === cid)).length;
            const pct = done / s.cavalos.length;
            return (
              <div key={s.id} style={{
                background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10,
                padding: '10px 8px', textAlign: 'center',
              }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{s.id}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{done}/{s.cavalos.length}</div>
                <div style={{ height: 3, background: 'var(--line)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${pct * 100}%`, height: '100%', background: pct === 1 ? 'var(--accent)' : '#a16207' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// VARIANT C — Minimal / Tipográfico
// ─────────────────────────────────────────────────────────────
const HomeScreenC = ({ registros }) => {
  const totalHoje = registros.length;
  const valorHoje = registros.reduce((s, r) => s + getInsumo(r.insumoId).valor * r.qtd, 0);
  return (
    <div style={{ paddingBottom: 90, fontFamily: 'var(--sans)' }}>
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center' }}>
        <img src={logoEpona} style={{ width: 34, height: 34 }} alt="" />
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>04 · 05 · 26</div>
      </div>

      <div style={{ padding: '32px 24px 8px' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>O dia</div>
        <h1 style={{
          fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 56, lineHeight: 0.95,
          margin: '8px 0 0', color: 'var(--ink)', letterSpacing: '-0.03em',
        }}>{totalHoje}<span style={{ color: 'var(--ink-3)', fontSize: 28, marginLeft: 6 }}>registros</span></h1>
        <div style={{ marginTop: 24, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 280 }}>
          {new Set(registros.map(r => r.cavaloId)).size} cavalos atendidos · {formatBRL(valorHoje)} consumido até agora.
        </div>
      </div>

      {/* botão CTA tipográfico */}
      <div style={{ padding: '32px 24px 0' }}>
        <button style={{
          width: '100%', background: 'transparent', color: 'var(--ink)', border: 'none',
          padding: '20px 0', borderTop: '1px solid var(--ink)', borderBottom: '1px solid var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'var(--serif)', fontSize: 28, letterSpacing: '-0.02em',
        }}>
          <span>Registrar</span>
          <Icon name="arrow-left" size={22} style={{ transform: 'rotate(180deg)' }} />
        </button>
      </div>

      {/* lista limpa */}
      <div style={{ padding: '32px 24px 0' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 16 }}>Últimos lançamentos</div>
        {registros.slice().reverse().slice(0, 5).map(r => {
          const cav = getCavalo(r.cavaloId);
          const ins = getInsumo(r.insumoId);
          return (
            <div key={r.id} style={{
              padding: '16px 0', borderTop: '1px solid var(--line)',
              display: 'flex', alignItems: 'baseline', gap: 14,
            }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', width: 36 }}>{r.hora}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{cav.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{ins.nome} · {r.qtd} {ins.unidade}</div>
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                {formatBRL(ins.valor * r.qtd)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { HomeScreenB, HomeScreenC };
