// nutricional.jsx — Lista nutricional compacta, agrupada por baia/piquete, com busca e trato por horário
import React, { useState, useMemo } from 'react';
import { Icon } from './icons';
import { norm } from './data';
import { TopBar, HorseAvatar } from './screens';
import { getEmpresa } from './utils/empresa';
import { gerarPdfNutricao, nomePdfNutricao } from './utils/pdfNutricao';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const fmtNum = (v) => {
  const n = parseFloat(v) || 0;
  const s = n % 1 === 0 ? String(n) : n.toFixed(1);
  return s.replace('.', ',');
};

const getTratoAtual = () => {
  const minutos = new Date().getHours() * 60 + new Date().getMinutes();
  return minutos <= 720 ? 'manha' : 'tarde';
};

const getDiaSemana = () => new Date().getDay();

const isSemanaPar = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const semana = Math.ceil((((d - new Date(d.getFullYear(), 0, 4)) / 86400000) + 1) / 7);
  return semana % 2 === 0;
};

const getFreqDias = (freq) => {
  if (freq === 'diario') return 1;
  if (freq === 'semanal') return 7;
  if (freq === 'quinzenal') return 14;
  if (freq?.startsWith('cada')) return parseInt(freq.replace('cada', '')) || 7;
  return 7;
};

const isPeriodicoHoje = (p) => {
  if (p.frequencia === 'diario') return true;
  if (p.frequencia?.startsWith('cada')) {
    const interval = getFreqDias(p.frequencia);
    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    return daysSinceEpoch % interval === 0;
  }
  if (p.diaSemana !== getDiaSemana()) return false;
  if (p.frequencia === 'semanal') return true;
  if (p.frequencia === 'quinzenal') return isSemanaPar();
  return false;
};

// ─────────────────────────────────────────────────────────────
// Chip colorido inline
// ─────────────────────────────────────────────────────────────
const Chip = ({ children, cor = '#3d6043' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    background: cor + '18', border: `1px solid ${cor}35`,
    borderRadius: 6, padding: '2px 7px',
    fontSize: 12, fontWeight: 600, color: cor,
    whiteSpace: 'nowrap',
  }}>
    {children}
  </span>
);

// ─────────────────────────────────────────────────────────────
// Row compacta de um cavalo
// ─────────────────────────────────────────────────────────────
const HorseRow = ({ c, insumos, trato, currentUser, setSelected, setScreen, last, updateCavalo, addAviso, removeAviso }) => {
  const n = c.nutricao || {};
  const racao = n.racaoId ? insumos.find(i => i.id === n.racaoId) : null;
  const sups = (n.suplementos || []).map(s => {
    const ins = insumos.find(i => i.id === s.insumoId) || { nome: s.insumoId, unidade: 'un' };
    const noTrato = trato === 'manha' ? (s.manha !== false) : (s.tarde !== false);
    const qtdTrato = s.manha && s.tarde ? (s.qtdDia / 2) : (noTrato ? s.qtdDia : 0);
    return { ...s, ins, noTrato, qtdTrato };
  }).filter(s => s.noTrato && s.qtdTrato > 0);
  const oleo = parseFloat(n.oleoMlDia) || 0;
  const oleoTrato = trato === 'manha'
    ? (n.oleoMlManha ?? (oleo / 2))
    : (n.oleoMlTarde ?? (oleo / 2));
  const salTrato = trato === 'manha'
    ? (parseFloat(n.salKromiumGManha) || 0)
    : (parseFloat(n.salKromiumGTarde) || 0);

  const kgTrato = trato === 'manha'
    ? (n.racaoKgManha ?? (n.racaoKgDia ? n.racaoKgDia / 2 : 0))
    : (n.racaoKgTarde ?? (n.racaoKgDia ? n.racaoKgDia / 2 : 0));

  const block = n.racaoBlock || {};
  const racaoBloqueada = trato === 'manha' ? block.manha : block.tarde;

  const salTotal = (parseFloat(n.salKromiumGManha) || 0) + (parseFloat(n.salKromiumGTarde) || 0);
  const semDieta = !racao && oleo === 0 && salTotal === 0 && sups.length === 0;
  const podeEditar = currentUser?.role === 'admin' || currentUser?.role === 'vet';
  const periodicosHoje = (n.periodicos || []).filter(isPeriodicoHoje);
  const [showBlockForm, setShowBlockForm] = useState(false);

  const toggleRacaoBlock = (turno) => {
    const novoBlock = { ...block, [turno]: !block[turno] };
    updateCavalo(c.id, { nutricao: { ...n, racaoBlock: novoBlock } });
    const hoje = new Date().toISOString().split('T')[0];
    if (novoBlock[turno]) {
      addAviso({
        id: 'racaoBlock_' + c.id + '_' + turno,
        autor: 'Sistema',
        avatar: '⚠️',
        tempo: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        texto: `🚫 ${c.nome} não deve comer ração no trato da ${turno === 'manha' ? 'manhã' : 'tarde'} (${hoje})`,
        urgente: true,
        tipo: 'racaoBlock',
        cavaloId: c.id,
        data_entrada: hoje,
      });
    } else {
      removeAviso('racaoBlock_' + c.id + '_' + turno);
    }
  };

  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: last ? 'none' : '1px solid var(--line)',
      background: racaoBloqueada ? '#fef2f2' : 'transparent',
      borderLeft: racaoBloqueada ? '4px solid #dc2626' : '4px solid transparent',
    }}>
      {/* Linha 1: nome + local + botão editar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <HorseAvatar cavalo={c} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700,
              color: 'var(--ink)', lineHeight: 1.2,
            }}>
              {c.nome}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{c.baia}</span>
            {racaoBloqueada && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#dc2626', borderRadius: 6, padding: '2px 8px',
                fontSize: 11, fontWeight: 800, color: '#fff',
                whiteSpace: 'nowrap',
              }}>
                🚫 ESSE CAVALO NÃO DEVE COMER RAÇÃO AGORA
              </span>
            )}
            {n.comeAlmoco && trato === 'manha' && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                background: '#fef2f2', border: '1px solid #dc2626',
                borderRadius: 6, padding: '1px 6px',
                fontSize: 11, fontWeight: 700, color: '#dc2626',
                whiteSpace: 'nowrap',
              }}>
                🍽️ come no almoço
              </span>
            )}
          </div>
          {c.obs && (
            <div style={{
              fontSize: 11, color: '#856404', background: '#fffbe855',
              marginTop: 2, lineHeight: 1.4,
            }}>
              ⚠️ {c.obs}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {podeEditar && (
            <button
              onClick={() => setShowBlockForm(!showBlockForm)}
              style={{
                background: racaoBloqueada ? '#dc2626' : 'none',
                border: racaoBloqueada ? 'none' : '1px solid var(--line)',
                borderRadius: 6, padding: '3px 8px',
                fontSize: 11, color: racaoBloqueada ? '#fff' : '#dc2626', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'var(--sans)',
              }}
            >
              🚫
            </button>
          )}
          {podeEditar && setSelected && (
            <button
              onClick={() => { setSelected(c.id); setScreen('editarCavalo'); }}
              style={{
                background: 'none', border: '1px solid var(--line)',
                borderRadius: 6, padding: '3px 8px',
                fontSize: 11, color: 'var(--accent)', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--sans)',
              }}
            >
              Editar
            </button>
          )}
        </div>
      </div>

      {showBlockForm && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 6, padding: '6px 0' }}>
          {['manha', 'tarde'].map(t => (
            <button
              key={t}
              onClick={() => toggleRacaoBlock(t)}
              style={{
                flex: 1, border: '1px solid', borderRadius: 8, padding: '6px 10px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)',
                background: block[t] ? '#dc2626' : 'var(--card)',
                borderColor: block[t] ? '#dc2626' : 'var(--line)',
                color: block[t] ? '#fff' : 'var(--ink)',
              }}
            >
              {t === 'manha' ? '🌅 Manhã' : '🌇 Tarde'}
              {block[t] ? ' ⛔' : ' ✅'}
            </button>
          ))}
        </div>
      )}

      {/* Linha 2: dieta em chips */}
      {semDieta && !racaoBloqueada ? (
        <span style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
          Sem plano nutricional
        </span>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {racao && !racaoBloqueada && (
            <>
              <Chip cor="#3d6043">
                {trato === 'manha' ? '🌅' : '🌇'} {fmtNum(kgTrato)} kg
              </Chip>
              <Chip cor="#1e4a6b">
                {racao.nome}
              </Chip>
            </>
          )}
          {racao && racaoBloqueada && (
            <Chip cor="#dc2626">
              🚫 NÃO COMER RAÇÃO AGORA
            </Chip>
          )}
          {(n.fenoKgDia || 0) > 0 && <Chip cor="#92400e">🌾 Feno {fmtNum(n.fenoKgDia)} kg/dia</Chip>}
          {oleoTrato > 0 && <Chip cor="#b45309">Óleo {fmtNum(oleoTrato)} ml</Chip>}
          {salTrato > 0 && <Chip cor="#525b76">🧂 Sal Kromium {fmtNum(salTrato)} g</Chip>}
          {sups.map(s => (
            <Chip key={s.insumoId} cor="#7c2d12">
              {s.ins.nome} {fmtNum(s.qtdTrato)} {s.ins.unidade || 'un'}
            </Chip>
          ))}
          {periodicosHoje.map(p => {
            const ins = insumos.find(i => i.id === p.insumoId);
            const turnoAgora = getTratoAtual();
            const mostraAgora = p.turno === 'ambos' || p.turno === turnoAgora;
            if (!mostraAgora) return null;
            return (
              <Chip key={p.insumoId} cor="#9333ea">
                📅 {ins?.nome || p.insumoId} {p.qtd} {ins?.unidade || 'un'}
              </Chip>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Header de um grupo — div container com área de toggle e botões de ordem
// ─────────────────────────────────────────────────────────────
const PiqueteHeader = ({ label, count, expanded, onToggle, onMoveUp, onMoveDown, canMoveUp, canMoveDown, podeEditar, temBusca }) => (
  <div style={{
    display: 'flex', alignItems: 'stretch',
    background: 'linear-gradient(90deg, var(--accent), #2a4330)',
  }}>
    {/* Botões de reordenação — só para admin/vet quando não há busca ativa */}
    {podeEditar && !temBusca && (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 2px 0 6px', gap: 0, flexShrink: 0 }}>
        <button
          onClick={e => { e.stopPropagation(); onMoveUp(); }}
          disabled={!canMoveUp}
          style={{
            background: 'none', border: 'none', padding: '3px 6px', lineHeight: 1,
            fontSize: 13, color: canMoveUp ? '#fff' : 'rgba(255,255,255,0.25)',
            cursor: canMoveUp ? 'pointer' : 'default',
          }}
        >▲</button>
        <button
          onClick={e => { e.stopPropagation(); onMoveDown(); }}
          disabled={!canMoveDown}
          style={{
            background: 'none', border: 'none', padding: '3px 6px', lineHeight: 1,
            fontSize: 13, color: canMoveDown ? '#fff' : 'rgba(255,255,255,0.25)',
            cursor: canMoveDown ? 'pointer' : 'default',
          }}
        >▼</button>
      </div>
    )}
    {/* Área clicável de toggle */}
    <button
      onClick={onToggle}
      style={{
        flex: 1, border: 'none', cursor: 'pointer', background: 'transparent',
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
        textAlign: 'left', fontFamily: 'var(--sans)',
      }}
    >
      <Icon name="wheat" size={15} color="rgba(255,255,255,0.8)" />
      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.03em' }}>
        {label}
      </span>
      <span style={{
        background: 'rgba(255,255,255,0.2)', borderRadius: 10,
        padding: '2px 8px', fontSize: 11, color: '#fff', fontWeight: 600,
      }}>
        {count} {count === 1 ? 'animal' : 'animais'}
      </span>
      <div style={{
        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s',
      }}>
        <Icon name="chevron-down" size={16} color="rgba(255,255,255,0.8)" />
      </div>
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Tela principal
// ─────────────────────────────────────────────────────────────
export function NutricionalScreen({ setScreen, setSelected, cavalos, insumos, currentUser, updateCavalo, addAviso, removeAviso, nutricaoOrdem = [], updateNutricaoOrdem }) {
  const [busca, setBusca] = useState('');
  const [colapsados, setColapsados] = useState(new Set());
  const [ordemGrupos, setOrdemGrupos] = useState(nutricaoOrdem);
  const [filtroInsumoId, setFiltroInsumoId] = useState(null);
  const trato = getTratoAtual();
  const podeEditar = currentUser?.role === 'admin' || currentUser?.role === 'vet';

  // Insumos em uso na dieta (ração principal + suplementos por cavalo).
  // Filtramos só quem tem ao menos 1 cavalo consumindo — insumos ociosos
  // ficam de fora dos chips.
  const chipsInsumos = useMemo(() => {
    const consumoPorInsumo = new Map(); // insumoId → nº cavalos
    const presentes = cavalos.filter(c => c.presente);
    presentes.forEach(c => {
      const n = c.nutricao || {};
      if (n.racaoId) {
        consumoPorInsumo.set(n.racaoId, (consumoPorInsumo.get(n.racaoId) || 0) + 1);
      }
      (n.suplementos || []).forEach(s => {
        if (s.insumoId && Number(s.qtdDia) > 0) {
          consumoPorInsumo.set(s.insumoId, (consumoPorInsumo.get(s.insumoId) || 0) + 1);
        }
      });
    });
    return [...consumoPorInsumo.entries()]
      .map(([insumoId, n]) => {
        const ins = insumos.find(i => i.id === insumoId);
        return { insumoId, nome: ins?.nome || insumoId, n };
      })
      .filter(x => !!x.nome)
      .sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, 'pt'));
  }, [cavalos, insumos]);

  const consomeInsumo = (c, insumoId) => {
    const n = c.nutricao || {};
    if (n.racaoId === insumoId) return true;
    return (n.suplementos || []).some(s => s.insumoId === insumoId && Number(s.qtdDia) > 0);
  };

  const togglePiquete = (key) => {
    setColapsados(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const defaultSort = (a, b) => {
    if (a === '__sem__') return 1;
    if (b === '__sem__') return -1;
    const na = parseInt(a), nb = parseInt(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b, 'pt');
  };

  // Filtrar + agrupar por baia/piquete, respeitando ordem salva
  const groups = useMemo(() => {
    const presentes = cavalos.filter(c => c.presente);
    const q = busca.trim();
    let filtered = q
      ? presentes.filter(c =>
          norm(c.nome).includes(norm(q)) ||
          norm(c.baia).includes(norm(q)) ||
          norm(String(c.piquete || '')).includes(norm(q))
        )
      : presentes;
    if (filtroInsumoId) filtered = filtered.filter(c => consomeInsumo(c, filtroInsumoId));

    const map = {};
    filtered.forEach(c => {
      const local = c.baia || c.piquete;
      const k = local ? String(local) : '__sem__';
      if (!map[k]) map[k] = [];
      map[k].push(c);
    });

    const allKeys = Object.keys(map);
    const ordered = [
      ...ordemGrupos.filter(k => allKeys.includes(k)),
      ...allKeys.filter(k => !ordemGrupos.includes(k)).sort(defaultSort),
    ];

    return ordered.map(k => ({ key: k, cavalos: map[k] }));
  }, [cavalos, busca, ordemGrupos, filtroInsumoId]);

  const moverGrupo = (key, dir) => {
    const keys = groups.map(g => g.key);
    const idx = keys.indexOf(key);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= keys.length) return;
    const next = [...keys];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setOrdemGrupos(next);
    updateNutricaoOrdem?.(next);
  };

  const temBusca = busca.trim().length > 0;
  const totalFiltrado = groups.reduce((acc, g) => acc + g.cavalos.length, 0);

  const handleExportPdf = () => {
    const empresa = getEmpresa();
    // Formato esperado pelo PDF: [{ label, cavalos: [...] }]
    const gruposPdf = groups.map(g => ({
      label: g.key === '__sem__' ? 'Sem baia/piquete' : g.key,
      cavalos: g.cavalos,
    }));
    const doc = gerarPdfNutricao({
      grupos: gruposPdf, insumos, empresa, tratos: ['manha', 'tarde'],
    });
    doc.save(nomePdfNutricao());
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar
        title="Nutrição"
        subtitle={`${cavalos.length} animais · ${groups.length} grupos`}
        onBack={currentUser?.role === 'operacional' ? undefined : () => setScreen('home')}
      />

      {/* Banner do trato atual */}
      <div style={{
        background: trato === 'manha'
          ? 'linear-gradient(90deg, #f59e0b, #d97706)'
          : 'linear-gradient(90deg, #7c3aed, #5b21b6)',
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 18 }}>{trato === 'manha' ? '🌅' : '🌇'}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
          {trato === 'manha' ? 'Trato da Manhã' : 'Trato da Tarde'}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginLeft: 'auto' }}>
          {trato === 'manha' ? '00:01 – 12:00' : '12:01 – 00:00'}
        </span>
      </div>

      {/* Barra de busca — sticky */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)',
        padding: '10px 16px 8px',
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--card)', border: '1px solid var(--line)',
          borderRadius: 12, padding: '9px 14px',
        }}>
          <Icon name="search" size={16} color="var(--ink-3)" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, baia ou piquete…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)',
            }}
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: 'var(--ink-3)', fontSize: 16, lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
        {/* Chips de filtro por insumo em uso */}
        {chipsInsumos.length > 0 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingTop: 6, paddingBottom: 2, WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => setFiltroInsumoId(null)}
              style={{
                flexShrink: 0, padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                border: '1px solid ' + (filtroInsumoId === null ? 'var(--accent)' : 'var(--line)'),
                background: filtroInsumoId === null ? 'var(--accent)' : 'var(--card)',
                color: filtroInsumoId === null ? '#fff' : 'var(--ink-2)',
                cursor: 'pointer', fontFamily: 'var(--sans)',
              }}
            >Todos</button>
            {chipsInsumos.map(c => (
              <button
                key={c.insumoId}
                onClick={() => setFiltroInsumoId(prev => prev === c.insumoId ? null : c.insumoId)}
                style={{
                  flexShrink: 0, padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  border: '1px solid ' + (filtroInsumoId === c.insumoId ? 'var(--accent)' : 'var(--line)'),
                  background: filtroInsumoId === c.insumoId ? 'var(--accent)' : 'var(--card)',
                  color: filtroInsumoId === c.insumoId ? '#fff' : 'var(--ink-2)',
                  cursor: 'pointer', fontFamily: 'var(--sans)', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {c.nome}
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  background: filtroInsumoId === c.insumoId ? 'rgba(255,255,255,0.25)' : 'var(--soft)',
                  color: filtroInsumoId === c.insumoId ? '#fff' : 'var(--ink-3)',
                  padding: '1px 5px', borderRadius: 8,
                }}>{c.n}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, paddingLeft: 2 }}>
          {temBusca || filtroInsumoId ? (
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              {totalFiltrado} {totalFiltrado === 1 ? 'animal' : 'animais'}
              {filtroInsumoId && ` · ${chipsInsumos.find(c => c.insumoId === filtroInsumoId)?.nome || ''}`}
            </div>
          ) : <div />}
          {!temBusca && groups.length > 0 && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={handleExportPdf}
                title="Exportar plano nutricional em PDF (manhã + tarde)"
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Icon name="share" size={11} color="#fff" /> PDF
              </button>
              <button
                onClick={() => setColapsados(new Set())}
                style={{ background: 'none', border: 'none', fontSize: 10, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--sans)', textDecoration: 'underline', padding: 0 }}
              >
                Expandir tudo
              </button>
              <button
                onClick={() => setColapsados(new Set(groups.map(g => g.key)))}
                style={{ background: 'none', border: 'none', fontSize: 10, color: 'var(--ink-3)', cursor: 'pointer', fontFamily: 'var(--sans)', textDecoration: 'underline', padding: 0 }}
              >
                Recolher tudo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grupos por piquete */}
      <div style={{ padding: '12px 16px 0' }}>
        {groups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)', fontSize: 14 }}>
            Nenhum animal encontrado
          </div>
        )}

        {groups.map((g, gIdx) => {
          const label = g.key === '__sem__' ? 'Sem local definido' : g.key;
          const expanded = temBusca || !colapsados.has(g.key);

          return (
            <div key={g.key} style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              marginBottom: 12,
              overflow: 'hidden',
            }}>
              <PiqueteHeader
                label={label}
                count={g.cavalos.length}
                expanded={expanded}
                onToggle={() => togglePiquete(g.key)}
                podeEditar={podeEditar}
                temBusca={temBusca}
                canMoveUp={gIdx > 0}
                canMoveDown={gIdx < groups.length - 1}
                onMoveUp={() => moverGrupo(g.key, -1)}
                onMoveDown={() => moverGrupo(g.key, 1)}
              />

              {expanded && g.cavalos.map((c, idx) => (
                <HorseRow
                  key={c.id}
                  c={c}
                  insumos={insumos}
                  trato={trato}
                  currentUser={currentUser}
                  setSelected={setSelected}
                  setScreen={setScreen}
                  last={idx === g.cavalos.length - 1}
                  updateCavalo={updateCavalo}
                  addAviso={addAviso}
                  removeAviso={removeAviso}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
