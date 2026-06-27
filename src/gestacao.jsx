// gestacao.jsx — Gestação e Partos: gestantes, detalhe e acompanhamento mensal
import React, { useState, useMemo } from 'react';
import { Icon } from './icons';
import { norm } from './data';
import { TopBar } from './screens';

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

const CAMPOS_ACOMP = [
  { key: 'liquidoAmniotico',    label: 'Aspecto líquido amniótico',   tipo: 'text' },
  { key: 'liquidoAlantoideano', label: 'Aspecto líquido alantoideano', tipo: 'text' },
  { key: 'orbitaOcular',        label: 'Órbita ocular (mm)',           tipo: 'number' },
  { key: 'aorta',               label: 'Artéria aorta (mm)',           tipo: 'number' },
  { key: 'freqCardiaca',        label: 'Frequência cardíaca (bpm)',    tipo: 'number' },
  { key: 'biparietal',          label: 'Espaço biparietal (mm)',       tipo: 'number' },
  { key: 'jup',                 label: 'JUP (mm)',                     tipo: 'number' },
  { key: 'obs',                 label: 'Observações',                  tipo: 'textarea' },
];

const SEXAGEM_OPTIONS = [
  { value: 'macho',      label: '♂ Macho',     color: '#1e40af', bg: '#dbeafe' },
  { value: 'femea',      label: '♀ Fêmea',     color: '#9d174d', bg: '#fce7f3' },
  { value: 'indefinido', label: '? Indefinido', color: '#6b7280', bg: '#f3f4f6' },
];

const ACOMP_VAZIO = { liquidoAmniotico:'', liquidoAlantoideano:'', orbitaOcular:'', aorta:'', freqCardiaca:'', biparietal:'', jup:'', obs:'' };

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
export function GestacaoPartosScreen({ setScreen, setSelected, partos, cavalos, proprietarios, movimentacoes, embutida }) {
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
        {!embutida && <TopBar title="Gestação e Partos" onBack={() => setScreen('home')} />}
        <SubTabBar
          tabs={[
            { id:'gestacoes', label:`Gestações (${gestantesDentro.length})` },
            { id:'partos', label:`Partos (${partosFiltrados.length})` },
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

    return (
      <div key={c.id} onClick={() => { setSelected(c.id); setScreen('eguaGestanteDetalhe'); }}
        style={{
          background: isGray ? '#f3f4f6' : 'var(--card)',
          border: `1px solid ${isGray ? '#d1d5db' : (alerta || atrasada ? '#fca5a5' : 'var(--line)')}`,
          borderRadius:14, marginBottom:10, overflow:'hidden', cursor:'pointer',
          opacity: isGray ? 0.8 : 1,
        }}>

        {isGray && (
          <div style={{ background:'#9ca3af', color:'#fff', padding:'6px 14px', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
            📤 Fora do haras
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
export function EguaGestanteDetalheScreen({ id, setScreen, cavalos, updateCavalo, proprietarios, insumos, addAviso, addAtividade, currentUser }) {
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
          ]}
          active={subTab}
          onChange={setSubTab}
        />
      </div>
      <div style={{ paddingBottom:90 }}>
        {subTab === 'gestacao' && <GestacaoTab c={c} updateCavalo={updateCavalo} mes={mes} />}
        {subTab === 'alimentacao' && <AlimentacaoTab c={c} insumos={insumos} />}
        {subTab === 'acompanhamento' && <AcompanhamentoTab c={c} updateCavalo={updateCavalo} mesAtual={mes} addAviso={addAviso} addAtividade={addAtividade} currentUser={currentUser} />}
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
    return Object.values(d).some(v => v && v !== '');
  };

  return (
    <div style={{ padding:'14px 16px 0' }}>
      <div style={{ fontSize:12, color:'var(--ink-3)', marginBottom:14 }}>
        Acompanhamento mensal da gestação. Mês atual estimado: <strong>Mês {mesAtual}</strong>.
      </div>

      {Array.from({ length:12 }, (_, i) => i).map(mes => (
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
      ))}
    </div>
  );
}

function MesAcompanhamento({ mes, mesAtual, dados, sexagemAtual, expandido, temDados, onToggle, onSalvar }) {
  const [form, setForm] = useState({ ...ACOMP_VAZIO, ...dados });
  const [sexagem, setSexagem] = useState(sexagemAtual);
  const [saved, setSaved] = useState(false);
  const isAtual = mes === mesAtual;
  const is4 = mes === 4;

  const handleSalvar = () => {
    onSalvar(form, is4 ? sexagem : undefined);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const inputStyle = {
    width:'100%', boxSizing:'border-box', padding:'9px 11px', borderRadius:9,
    border:'1px solid var(--line)', background:'var(--bg)',
    fontSize:13, color:'var(--ink)', fontFamily:'var(--sans)', outline:'none',
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
          {is4 && <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:6, background:'#f0fdf4', color:'#16a34a', border:'1px solid #bbf7d0' }}>Sexagem</span>}
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

          {/* Campos clínicos */}
          {CAMPOS_ACOMP.map(campo => (
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
                  style={inputStyle}
                />
              )}
            </div>
          ))}

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
