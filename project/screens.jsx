// screens.jsx — All app screens for App Epona
// Uses globals: React, Icon, CATEGORIA_ICONS, data helpers, formatBRL

const { useState, useMemo, useEffect, useRef } = React;

// ─────────────────────────────────────────────────────────────
// Shared chrome
// ─────────────────────────────────────────────────────────────
const TopBar = ({ title, onBack, action, subtitle }) => (
  <div style={{
    padding: '8px 20px 14px', display: 'flex', alignItems: 'flex-start',
    gap: 12, borderBottom: '1px solid var(--line)', background: 'var(--bg)',
  }}>
    {onBack && (
      <button onClick={onBack} style={{
        width: 36, height: 36, borderRadius: 12, border: '1px solid var(--line)',
        background: 'var(--card)', display: 'grid', placeItems: 'center',
        marginTop: 2, color: 'var(--ink)',
      }}>
        <Icon name="arrow-left" size={18} />
      </button>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <h1 style={{
        fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 26, lineHeight: 1.1,
        margin: 0, color: 'var(--ink)', letterSpacing: '-0.01em',
      }}>{title}</h1>
      {subtitle && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{subtitle}</div>}
    </div>
    {action}
  </div>
);

const TabBar = ({ tab, setTab }) => {
  const tabs = [
    { id: 'home', label: 'Hoje', icon: 'home' },
    { id: 'cavalos', label: 'Cavalos', icon: 'horse' },
    { id: 'cadastros', label: 'Cadastros', icon: 'package' },
    { id: 'faturas', label: 'Faturas', icon: 'doc' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'var(--bg)', borderTop: '1px solid var(--line)',
      paddingTop: 8, paddingBottom: 28,
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
      zIndex: 5,
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          background: 'none', border: 'none', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 3, padding: '6px 0',
          color: tab === t.id ? 'var(--accent)' : 'var(--ink-3)',
          fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500,
        }}>
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
};

// Avatar for cavalos — abstract pelagem swatch with monogram
const HorseAvatar = ({ cavalo, size = 44 }) => {
  const palette = {
    'Tordilho': ['#d4d4d8', '#a1a1aa'],
    'Alazã': ['#c2410c', '#9a3412'],
    'Castanho': ['#78350f', '#5a2509'],
    'Preto': ['#1f1d1a', '#0a0908'],
    'Baia': ['#a16207', '#854d0e'],
    'Rosilha': ['#a8a29e', '#78716c'],
  };
  const [c1, c2] = palette[cavalo.pelagem] || ['#a8a29e', '#78716c'];
  return (
    <div style={{
      width: size, height: size, borderRadius: size,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'grid', placeItems: 'center', flexShrink: 0,
      boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.15)',
      color: '#fff', fontFamily: 'var(--serif)', fontSize: size * 0.42,
      letterSpacing: '-0.02em',
    }}>
      {cavalo.nome[0]}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Activity row — used in Home and Histórico
// ─────────────────────────────────────────────────────────────
const ActivityRow = ({ a, first }) => {
  const cav = a.cavaloId && getCavalo(a.cavaloId);
  let icon, color, title, sub;
  if (a.tipo === 'insumo') {
    const ins = getInsumo(a.insumoId);
    const cat = getCategoria(ins.categoria);
    icon = CATEGORIA_ICONS[cat.id]; color = cat.cor;
    title = `${cav.nome} · ${ins.nome}`;
    sub = `${a.qtd} ${ins.unidade} · ${a.usuario}`;
  } else if (a.tipo === 'entrada') {
    icon = 'plus'; color = '#3d6043';
    title = `Entrada · ${cav.nome}`;
    sub = `${a.motivo} · ${a.usuario}`;
  } else if (a.tipo === 'saida') {
    icon = 'arrow-left'; color = '#854d0e';
    title = `Saída · ${cav.nome}`;
    sub = `${a.motivo} · ${a.usuario}`;
  } else if (a.tipo === 'cadastro') {
    icon = 'plus'; color = '#0f766e';
    title = `Novo cavalo · ${cav.nome}`;
    sub = `Cadastrado por ${a.usuario}`;
  } else if (a.tipo === 'aviso') {
    icon = 'bell'; color = '#7c2d12';
    title = `Aviso · ${a.autor}`;
    sub = a.texto;
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      borderTop: first ? 'none' : '1px solid var(--line)',
    }}>
      {cav ? <HorseAvatar cavalo={cav} size={36} /> : (
        <div style={{ width: 36, height: 36, borderRadius: 36, background: color + '20', color, display: 'grid', placeItems: 'center' }}>
          <Icon name={icon} size={18} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{a.hora}</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2,
          fontSize: 9, color, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
        }}>
          <Icon name={icon} size={10} />
          <span>{a.tipo === 'insumo' ? getCategoria(getInsumo(a.insumoId).categoria).nome : a.tipo}</span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// HOME · Resumo do dia
// ─────────────────────────────────────────────────────────────
const HomeScreen = ({ registros, setScreen, density, avisos = AVISOS, atividades = ATIVIDADES }) => {
  const totalHoje = atividades.filter(a => a.data === '2026-05-04').length;
  const totalCavalos = CAVALOS.length;
  const totalAvisos = avisos.length;
  const avisosUrgentes = avisos.filter(a => a.urgente).length;

  const hojeAt = atividades.filter(a => a.data === '2026-05-04')
    .sort((a, b) => b.hora.localeCompare(a.hora));
  const recentes = hojeAt.slice(0, density === 'compact' ? 6 : 4);
  const ultimosAvisos = avisos.slice(0, 2);

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="assets/logo-epona.png" style={{ width: 28, height: 28, objectFit: 'contain' }} alt="" />
        <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--accent)', letterSpacing: '0.04em' }}>EPONA</div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setScreen('avisos')} style={{
          width: 36, height: 36, borderRadius: 12, border: '1px solid var(--line)',
          background: 'var(--card)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)',
          position: 'relative',
        }}>
          <Icon name="bell" size={18} />
          {avisosUrgentes > 0 && (
            <span style={{
              position: 'absolute', top: -2, right: -2, width: 14, height: 14,
              borderRadius: 14, background: '#c0392b', color: '#fff', fontSize: 9,
              fontWeight: 700, display: 'grid', placeItems: 'center',
              border: '2px solid var(--bg)',
            }}>{avisosUrgentes}</span>
          )}
        </button>
      </div>
      <div style={{ padding: '18px 20px 8px' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Segunda · 4 de maio
        </div>
        <h1 style={{
          fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 30, lineHeight: 1.1,
          margin: '6px 0 0', color: 'var(--ink)', letterSpacing: '-0.01em',
        }}>Bom dia, João.</h1>
      </div>

      {/* Stats */}
      <div style={{ padding: '12px 20px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: 'Registros hoje', value: totalHoje },
          { label: 'Cavalos no haras', value: totalCavalos },
          { label: 'Avisos', value: totalAvisos, onClick: () => setScreen('avisos') },
        ].map(s => (
          <button key={s.label} onClick={s.onClick} disabled={!s.onClick} style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
            padding: '12px 12px', textAlign: 'left', color: 'var(--ink)',
            cursor: s.onClick ? 'pointer' : 'default',
          }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* CTA grande de registro */}
      <div style={{ padding: '18px 20px 0' }}>
        <button onClick={() => setScreen('registrar')} style={{
          width: '100%', background: 'var(--accent)', color: 'var(--accent-ink)',
          border: 'none', borderRadius: 18, padding: '20px 22px',
          display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
          boxShadow: '0 8px 20px rgba(61, 96, 67, 0.18)',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.18)',
            display: 'grid', placeItems: 'center',
          }}>
            <Icon name="plus" size={26} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 1.1 }}>Registrar insumo</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>Toque para começar</div>
          </div>
          <Icon name="chevron-right" size={20} color="#fff" />
        </button>
      </div>

      {/* Atalhos: Entrada/Saída · Avisos · Cavalos · Faturas */}
      <div style={{ padding: '10px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={() => setScreen('movimentacao')} style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
          padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', color: 'var(--ink)',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: '#e8d8c4', color: '#854d0e',
            display: 'grid', placeItems: 'center',
          }}>
            <Icon name="truck" size={18} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 15, lineHeight: 1.1 }}>Entrada / Saída</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Movimentar animal</div>
          </div>
        </button>
        <button onClick={() => setScreen('avisos')} style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
          padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', color: 'var(--ink)',
          position: 'relative',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'grid', placeItems: 'center',
          }}>
            <Icon name="bell" size={18} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 15, lineHeight: 1.1 }}>Avisos</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{totalAvisos} no mural</div>
          </div>
        </button>
      </div>

      {/* Avisos preview no Home */}
      {ultimosAvisos.length > 0 && (
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 400, margin: 0, color: 'var(--ink)' }}>Mural de avisos</h2>
            <button onClick={() => setScreen('avisos')} style={{ background: 'transparent', border: 'none', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Ver tudo</button>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {ultimosAvisos.map((a, i) => (
              <div key={a.id} style={{
                padding: '12px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                display: 'flex', gap: 10,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 28, flexShrink: 0,
                  background: a.urgente ? '#fef2e8' : 'var(--soft)',
                  color: a.urgente ? '#c0392b' : 'var(--ink-2)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 10, fontWeight: 700, fontFamily: 'var(--sans)',
                }}>{a.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{a.autor}</span>
                    <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>{a.tempo}</span>
                    {a.urgente && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: '#fef2e8', color: '#c0392b', fontWeight: 700, letterSpacing: '0.04em' }}>URGENTE</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2, lineHeight: 1.4 }}>{a.texto}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10,
        }}>
          <h2 style={{
            fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 400, margin: 0, color: 'var(--ink)',
          }}>Atividade recente</h2>
          <button onClick={() => setScreen('historico')} style={{ background: 'transparent', border: 'none', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Histórico</button>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          {recentes.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              Sem atividade hoje ainda.
            </div>
          )}
          {recentes.map((a, i) => <ActivityRow key={a.id} a={a} first={i === 0} />)}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// HISTÓRICO · Registro eterno de atividades
// ─────────────────────────────────────────────────────────────
const HistoricoScreen = ({ setScreen, atividades = ATIVIDADES }) => {
  const [filtro, setFiltro] = useState('todos');
  const tipos = [
    { id: 'todos', nome: 'Tudo' },
    { id: 'insumo', nome: 'Insumos' },
    { id: 'entrada', nome: 'Entradas' },
    { id: 'saida', nome: 'Saídas' },
    { id: 'cadastro', nome: 'Cadastros' },
    { id: 'aviso', nome: 'Avisos' },
  ];
  const all = [...atividades].sort((a, b) =>
    (b.data + 'T' + b.hora).localeCompare(a.data + 'T' + a.hora)
  );
  const filtered = filtro === 'todos' ? all : all.filter(a => a.tipo === filtro);
  // group by data
  const grupos = {};
  for (const a of filtered) {
    grupos[a.data] = grupos[a.data] || [];
    grupos[a.data].push(a);
  }
  const formatDia = (d) => {
    const dt = new Date(d + 'T00:00:00');
    const hoje = new Date('2026-05-04');
    const ontem = new Date('2026-05-03');
    if (d === '2026-05-04') return 'Hoje';
    if (d === '2026-05-03') return 'Ontem';
    return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title="Histórico" subtitle="Registro eterno de atividades" onBack={() => setScreen('home')} />
      <div style={{ padding: '12px 20px 4px', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {tipos.map(t => (
          <button key={t.id} onClick={() => setFiltro(t.id)} style={{
            padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
            border: '1px solid ' + (filtro === t.id ? 'var(--accent)' : 'var(--line)'),
            background: filtro === t.id ? 'var(--accent)' : 'var(--card)',
            color: filtro === t.id ? '#fff' : 'var(--ink-2)',
            whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--sans)',
          }}>{t.nome}</button>
        ))}
      </div>
      <div style={{ padding: '8px 20px 0' }}>
        {Object.keys(grupos).map(dia => (
          <div key={dia} style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase',
              letterSpacing: '0.08em', padding: '8px 4px 6px', fontWeight: 600,
            }}>{formatDia(dia)} · {grupos[dia].length}</div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              {grupos[dia].map((a, i) => <ActivityRow key={a.id} a={a} first={i === 0} />)}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Nada por aqui.</div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CAVALOS · Lista
// ─────────────────────────────────────────────────────────────
const CavalosScreen = ({ setScreen, setSelected, density, cavalos = CAVALOS, setCavalos, proprietarios = PROPRIETARIOS }) => {
  const getProprietarioLocal = (id) => proprietarios.find(p => p.id === id);
  const [search, setSearch] = useState('');
  const filtered = cavalos.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.baia.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title="Cavalos" subtitle={`${cavalos.length} no haras`} action={
        <button onClick={() => setScreen('addCavalo')} style={{
          width: 36, height: 36, borderRadius: 12, border: '1px solid var(--line)',
          background: 'var(--card)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)',
          cursor: 'pointer',
        }}>
          <Icon name="plus" size={18} />
        </button>
      } />
      <div style={{ padding: '12px 20px 0' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon name="search" size={16} color="var(--ink-3)" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nome ou baia"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)',
            }}
          />
        </div>
      </div>

      <div style={{ padding: '12px 20px 0' }}>
        {filtered.map(c => {
          const prop = getProprietarioLocal(c.proprietarioId);
          return (
            <button key={c.id} onClick={() => { setSelected(c.id); setScreen('cavaloDetalhe'); }} style={{
              width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
              borderRadius: 14, padding: density === 'compact' ? '10px 12px' : '14px 14px',
              marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12,
              textAlign: 'left', color: 'var(--ink)',
            }}>
              <HorseAvatar cavalo={c} size={density === 'compact' ? 38 : 46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: density === 'compact' ? 15 : 17, color: 'var(--ink)' }}>{c.nome}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}>{c.baia}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                  {c.pelagem} · {c.categoria} · {c.idade || idade(c.nascimento)}
                </div>
                {density !== 'compact' && (
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>
                    {prop?.nome || 'Sem proprietário'}
                  </div>
                )}
              </div>
              <Icon name="chevron-right" size={16} color="var(--ink-3)" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CAVALO DETALHE
// ─────────────────────────────────────────────────────────────
const CavaloDetalheScreen = ({ id, setScreen, registros, setSelected, cavalos = CAVALOS, updateCavalo, deleteCavalo, proprietarios = PROPRIETARIOS }) => {
  const c = cavalos.find(cav => cav.id === id) || getCavalo(id);
  const getProprietarioLocal = (id) => proprietarios.find(p => p.id === id);
  const prop = getProprietarioLocal(c.proprietarioId) || { nome: 'Sem proprietário' };
  const meusRegistros = registros.filter(r => r.cavaloId === id);
  const racao = c.nutricao && getInsumo(c.nutricao.racaoId);
  const consumoDia = consumoDiarioCavalo(c.id);

  return (
    <div style={{ paddingBottom: 110 }}>
      <TopBar 
        title={c.nome} 
        subtitle={`Baia ${c.baia} · ${c.sexo === 'M' ? 'Macho' : 'Fêmea'}`} 
        onBack={() => setScreen('cavalos')}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {updateCavalo && (
              <button onClick={() => { setSelected(id); setScreen('editarCavalo'); }} style={{
                width: 36, height: 36, borderRadius: 12, border: '1px solid var(--line)',
                background: 'var(--card)', display: 'grid', placeItems: 'center', color: 'var(--ink)',
              }}>
                <Icon name="pencil" size={18} />
              </button>
            )}
            {deleteCavalo && (
              <button onClick={() => {
                if (window.confirm(`Deseja excluir ${c.nome}? Esta ação não pode ser desfeita.`)) {
                  deleteCavalo(id);
                  setScreen('cavalos');
                }
              }} style={{
                width: 36, height: 36, borderRadius: 12, border: '1px solid var(--line)',
                background: '#fee2e2', display: 'grid', placeItems: 'center', color: '#dc2626',
              }}>
                <Icon name="trash" size={18} />
              </button>
            )}
          </div>
        } 
      />

      <div style={{ padding: '14px 20px 0' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16,
          padding: '16px', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <HorseAvatar cavalo={c} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{c.categoria}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 2, color: 'var(--ink)' }}>{c.pelagem}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>{c.idade || idade(c.nascimento)}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 20px 0' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          <DetailRow label="Proprietário" value={prop.nome} />
          <DetailRow label="Mensalidade" value={formatBRL(c.mensalidade)} />
          <DetailRow label="Sexo" value={c.sexo === 'M' ? 'Macho' : 'Fêmea'} />
          <DetailRow label="Idade" value={c.idade || idade(c.nascimento)} />
          <DetailRow label="Nascimento" value={new Date(c.nascimento).toLocaleDateString('pt-BR')} />
          {c.obs && <DetailRow label="Observações" value={c.obs} />}
        </div>
      </div>

      {/* Plano nutricional */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 400, margin: 0, color: 'var(--ink)' }}>Plano nutricional</h2>
          <span style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>por dia</span>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          {racao && (
            <NutritionRow
              icon="package" color="#a16207"
              nome={racao.nome} qtd={`${c.nutricao.racaoKgDia} kg`}
              valor="incluso na mensalidade" first
            />
          )}
          {c.nutricao && c.nutricao.oleoMlDia > 0 && (
            <NutritionRow
              icon="package" color="#b45309"
              nome="Óleo de soja" qtd={`${c.nutricao.oleoMlDia} ml`}
              valor={formatBRL(c.nutricao.oleoMlDia * getInsumo('i_oleo').valor) + ' / dia'}
            />
          )}
          {(c.nutricao?.suplementos || []).map(s => {
            const ins = getInsumo(s.insumoId);
            return (
              <NutritionRow key={s.insumoId}
                icon="suplemento" color="#7c2d12"
                nome={ins.nome} qtd={`${s.qtdDia} ${ins.unidade}`}
                valor={formatBRL(s.qtdDia * ins.valor) + ' / dia'}
              />
            );
          })}
          {(!racao && consumoDia.length === 0) && (
            <div style={{ padding: 18, fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>Sem plano cadastrado.</div>
          )}
          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '12px 14px',
            borderTop: '1px solid var(--line)', background: 'var(--soft)',
            fontFamily: 'var(--sans)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Custo extra/dia (óleo + suplementos)</span>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>
              {formatBRL(consumoDia.reduce((s, l) => s + l.valorDia, 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Registros avulsos do mês */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 400, margin: 0, color: 'var(--ink)' }}>Insumos avulsos · maio</h2>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{meusRegistros.length} registros</span>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          {meusRegistros.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              Sem registros este mês.
            </div>
          )}
          {meusRegistros.map((r, i) => {
            const ins = getInsumo(r.insumoId);
            const cat = getCategoria(ins.categoria);
            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderTop: i === 0 ? 'none' : '1px solid var(--line)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center',
                  background: cat.cor + '15', color: cat.cor,
                }}>
                  <Icon name={CATEGORIA_ICONS[cat.id]} size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{ins.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{r.hora} · {r.qtd} {ins.unidade}</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatBRL(ins.valor * r.qtd)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick action */}
      <div style={{ padding: '20px 20px 0' }}>
        <button onClick={() => { setSelected(id); setScreen('registrar'); }} style={{
          width: '100%', background: 'var(--accent)', color: 'var(--accent-ink)',
          border: 'none', borderRadius: 14, padding: '14px',
          fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Icon name="plus" size={18} color="#fff" />
          Registrar insumo p/ {c.nome.split(' ')[0]}
        </button>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '12px 14px', borderTop: '1px solid var(--line)',
    ...(label === 'Proprietário' ? { borderTop: 'none' } : {}),
  }}>
    <span style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    <span style={{ fontSize: 13, color: 'var(--ink)', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
  </div>
);

const NutritionRow = ({ icon, color, nome, qtd, valor, first }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
    borderTop: first ? 'none' : '1px solid var(--line)',
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center',
      background: color + '15', color,
    }}>
      <Icon name={icon} size={16} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{nome}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1, fontFamily: 'var(--mono)' }}>{qtd} / dia</div>
    </div>
    <div style={{ fontSize: 11, color: 'var(--ink-2)', textAlign: 'right', maxWidth: 120 }}>{valor}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// CADASTROS hub
// ─────────────────────────────────────────────────────────────
const CadastrosScreen = ({ setScreen }) => {
  const items = [
    { id: 'cadProprietarios', label: 'Proprietários', count: PROPRIETARIOS.length, icon: 'users' },
    { id: 'cadCavalos', label: 'Cavalos', count: CAVALOS.length, icon: 'horse' },
    { id: 'cadInsumos', label: 'Insumos', count: INSUMOS.length, icon: 'package' },
    { id: 'cadMensalidades', label: 'Mensalidades', count: CAVALOS.length, icon: 'calendar' },
  ];
  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title="Cadastros" subtitle="Gerencie os dados base do haras" />
      <div style={{ padding: '14px 20px 0' }}>
        {items.map(it => (
          <button key={it.id} onClick={() => setScreen(it.id)} style={{
            width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '16px', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', color: 'var(--ink)',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)',
              display: 'grid', placeItems: 'center',
            }}>
              <Icon name={it.icon} size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)' }}>{it.label}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{it.count} cadastrados</div>
            </div>
            <Icon name="chevron-right" size={16} color="var(--ink-3)" />
          </button>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CADASTRO · Proprietários
// ─────────────────────────────────────────────────────────────
const CadProprietariosScreen = ({ setScreen, setSelected, proprietarios = PROPRIETARIOS, cavalos = CAVALOS, addProprietario }) => {
  const getCavalosDoProprietario = (propId) => cavalos.filter(c => c.proprietarioId === propId);

  const handleCreateProprietario = () => {
    if (!addProprietario) return;
    const newId = addProprietario('Novo proprietário');
    setSelected(newId);
    setScreen('proprietarioDetalhe');
  };

  const handleEditProprietario = (id) => {
    setSelected(id);
    setScreen('proprietarioDetalhe');
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title="Proprietários" onBack={() => setScreen('cadastros')} action={
        <button onClick={handleCreateProprietario} style={{
          width: 36, height: 36, borderRadius: 12, background: 'var(--accent)',
          display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer',
        }}>
          <Icon name="plus" size={18} color="#fff" />
        </button>
      } />
      <div style={{ padding: '14px 20px 0' }}>
        {proprietarios.map(p => {
          const ownedCavalos = getCavalosDoProprietario(p.id);
          return (
            <div key={p.id} style={{
              background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
              padding: '14px', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 40, background: 'var(--accent-soft)',
                  display: 'grid', placeItems: 'center',
                  fontFamily: 'var(--serif)', color: 'var(--accent)', fontSize: 16,
                }}>
                  {p.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{p.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                    {ownedCavalos.length} cavalo{ownedCavalos.length !== 1 ? 's' : ''} · {p.telefone || 'Sem telefone'}
                  </div>
                </div>
                <button onClick={() => handleEditProprietario(p.id)} style={{
                  width: 32, height: 32, borderRadius: 10, border: '1px solid var(--line)',
                  background: 'transparent', display: 'grid', placeItems: 'center', color: 'var(--ink-3)', cursor: 'pointer',
                }}>
                  <Icon name="edit" size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingLeft: 52 }}>
                {ownedCavalos.length > 0 ? ownedCavalos.map(cav => (
                  <span key={cav.id} style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 6,
                    background: 'var(--soft)', color: 'var(--ink-2)',
                  }}>{cav.nome} · {formatBRL(cav.mensalidade)}</span>
                )) : (
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Nenhum cavalo cadastrado.</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CADASTRO · Insumos
// ─────────────────────────────────────────────────────────────
const CadInsumosScreen = ({ setScreen }) => {
  const [filtro, setFiltro] = useState('all');
  const cats = [{ id: 'all', nome: 'Todos', cor: '#3d6043' }, ...CATEGORIAS_INSUMOS];
  const filtered = filtro === 'all' ? INSUMOS : INSUMOS.filter(i => i.categoria === filtro);

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title="Insumos" onBack={() => setScreen('cadastros')} action={
        <button style={{
          width: 36, height: 36, borderRadius: 12, background: 'var(--accent)',
          display: 'grid', placeItems: 'center', border: 'none',
        }}>
          <Icon name="plus" size={18} color="#fff" />
        </button>
      } />
      <div style={{
        padding: '12px 20px 4px', display: 'flex', gap: 6,
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {cats.map(c => (
          <button key={c.id} onClick={() => setFiltro(c.id)} style={{
            padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
            border: '1px solid ' + (filtro === c.id ? c.cor : 'var(--line)'),
            background: filtro === c.id ? c.cor : 'var(--card)',
            color: filtro === c.id ? '#fff' : 'var(--ink-2)',
            whiteSpace: 'nowrap', flexShrink: 0,
            fontFamily: 'var(--sans)',
          }}>{c.nome}</button>
        ))}
      </div>
      <div style={{ padding: '8px 20px 0' }}>
        {filtered.map(i => {
          const cat = getCategoria(i.categoria);
          return (
            <div key={i.id} style={{
              background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
              padding: '12px 14px', marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center',
                background: cat.cor + '15', color: cat.cor,
              }}>
                <Icon name={CATEGORIA_ICONS[cat.id]} size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{i.nome}</div>
                  {i.injetavel && (
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 4,
                      background: '#fef2e8', color: '#c0392b', fontWeight: 700, letterSpacing: '0.06em',
                    }}>INJETÁVEL +{formatBRL(TAXA_INJETAVEL)}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  por {i.unidade}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{formatBRL(i.valor)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '14px 20px 0', fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5 }}>
        Insumos marcados como <strong style={{ color: '#c0392b' }}>injetáveis</strong> recebem cobrança adicional de {formatBRL(TAXA_INJETAVEL)} por aplicação na fatura.
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CADASTRO · Mensalidades (por cavalo)
// ─────────────────────────────────────────────────────────────
const CadMensalidadesScreen = ({ setScreen }) => (
  <div style={{ paddingBottom: 90 }}>
    <TopBar title="Mensalidades" onBack={() => setScreen('cadastros')} subtitle="Valor por cavalo" />
    <div style={{ padding: '14px 20px 0' }}>
      <div style={{
        background: 'var(--accent-soft)', border: '1px solid #b8c8b0', borderRadius: 12,
        padding: '12px 14px', marginBottom: 12, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5,
      }}>
        A mensalidade <strong style={{ color: 'var(--ink)' }}>já inclui ração e feno</strong>. Óleo, suplementos e insumos avulsos são cobrados à parte.
      </div>
      {CAVALOS.map(c => (
        <div key={c.id} style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
          padding: '12px', marginBottom: 6,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <HorseAvatar cavalo={c} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{c.nome}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
              {c.categoria} · {c.baia}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{formatBRL(c.mensalidade)}</div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>por mês</div>
          </div>
          <button style={{
            width: 30, height: 30, borderRadius: 10, border: '1px solid var(--line)',
            background: 'transparent', display: 'grid', placeItems: 'center', color: 'var(--ink-3)',
          }}>
            <Icon name="edit" size={13} />
          </button>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// CADASTRO · Cavalos (placeholder simples)
// ─────────────────────────────────────────────────────────────
const CadCavalosScreen = ({ setScreen, setSelected, cavalos = CAVALOS, deleteCavalo, proprietarios = PROPRIETARIOS }) => {
  const getProprietarioLocal = (id) => proprietarios.find(p => p.id === id);
  return (
    <div style={{ paddingBottom: 90 }}>
    <TopBar title="Cadastro de cavalos" onBack={() => setScreen('cadastros')} action={
      <button style={{
        width: 36, height: 36, borderRadius: 12, background: 'var(--accent)',
        display: 'grid', placeItems: 'center', border: 'none',
      }}>
        <Icon name="plus" size={18} color="#fff" />
      </button>
    } />
    <div style={{ padding: '14px 20px 0' }}>
      {cavalos.map(c => {
        const prop = getProprietarioLocal(c.proprietarioId);
        return (
          <div key={c.id} style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
            padding: '12px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12,
            textAlign: 'left', color: 'var(--ink)',
          }}>
            <button onClick={() => { setSelected(c.id); setScreen('cavaloDetalhe'); }} style={{
              flex: 1, background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 12,
              textAlign: 'left', color: 'var(--ink)', cursor: 'pointer', padding: 0,
            }}>
              <HorseAvatar cavalo={c} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{c.nome}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>{c.baia}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{prop.nome} · {c.categoria}</div>
              </div>
              <Icon name="chevron-right" size={16} color="var(--ink-3)" />
            </button>
            {deleteCavalo && (
              <button 
                onClick={() => { 
                  if (window.confirm(`Deseja excluir ${c.nome}?`)) {
                    deleteCavalo(c.id);
                  }
                }}
                style={{
                  width: 36, height: 36, borderRadius: 10, border: '1px solid var(--line)',
                  background: '#fee2e2', display: 'grid', placeItems: 'center', color: '#dc2626',
                  cursor: 'pointer',
                }}
              >
                <Icon name="trash" size={16} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  </div>
  );
};

// ─────────────────────────────────────────────────────────────
// EDITAR CAVALO
// ─────────────────────────────────────────────────────────────
const EditarCavaloScreen = ({ id, setScreen, cavalos = CAVALOS, updateCavalo, deleteCavalo, proprietarios = PROPRIETARIOS }) => {
  const c = cavalos.find(cav => cav.id === id) || getCavalo(id);
  const getProprietarioLocal = (id) => proprietarios.find(p => p.id === id);
  const prop = getProprietarioLocal(c.proprietarioId);
  
  const [nome, setNome] = useState(c.nome);
  const [baia, setBaia] = useState(c.baia);
  const [mensalidade, setMensalidade] = useState(c.mensalidade);
  const [obs, setObs] = useState(c.obs || '');
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = () => {
    updateCavalo(id, { nome, baia, mensalidade: parseInt(mensalidade), obs });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const handleDelete = () => {
    if (window.confirm(`Deseja excluir ${c.nome}? Esta ação não pode ser desfeita.`)) {
      deleteCavalo(id);
      setScreen('cadastros');
    }
  };

  return (
    <div style={{ paddingBottom: 110 }}>
      <TopBar title="Editar cavalo" onBack={() => setScreen('cavaloDetalhe')} />

      <div style={{ padding: '14px 20px 0' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16,
          padding: '16px', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <HorseAvatar cavalo={c} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{c.categoria}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 2, color: 'var(--ink)' }}>{c.pelagem}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>{c.idade || idade(c.nascimento)}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 20px 0' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          <FormField label="Nome do cavalo">
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            <FormField label="Baia">
              <input
                value={baia}
                onChange={e => setBaia(e.target.value)}
                style={{
                  width: '100%', border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
                }}
              />
            </FormField>
          </div>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            <FormField label="Mensalidade (R$)">
              <input
                type="number"
                value={mensalidade}
                onChange={e => setMensalidade(e.target.value)}
                style={{
                  width: '100%', border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
                }}
              />
            </FormField>
          </div>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            <FormField label="Observações">
              <textarea
                value={obs}
                onChange={e => setObs(e.target.value)}
                style={{
                  width: '100%', border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
                  minHeight: 60, resize: 'none',
                }}
              />
            </FormField>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        {savedMessage && (
          <div style={{
            background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10,
            padding: '12px', color: '#166534', fontSize: 13, marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="check" size={16} />
            Cavalo atualizado com sucesso!
          </div>
        )}
        
        <button onClick={handleSave} style={{
          width: '100%', background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 14, padding: '14px',
          fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
          marginBottom: 8,
        }}>
          Salvar alterações
        </button>

        <button onClick={handleDelete} style={{
          width: '100%', background: '#fee2e2', color: '#dc2626',
          border: '1px solid #fca5a5', borderRadius: 14, padding: '14px',
          fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
        }}>
          Excluir cavalo
        </button>
      </div>
    </div>
  );
};

const FormField = ({ label, children }) => (
  <div style={{ padding: '14px' }}>
    <label style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
      {label}
    </label>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────
// ADICIONAR CAVALO
// ─────────────────────────────────────────────────────────────
const AddCavaloScreen = ({ setScreen, setCavalos, cavalos = CAVALOS, setNovoCavaloPendente, pendingEntradaCavalo, setPendingEntradaCavalo, proprietarios: allProprietarios = PROPRIETARIOS, addProprietario }) => {
  const pelagenOptions = ['Tordilho', 'Alazã', 'Castanho', 'Preto', 'Baia', 'Rosilha'];
  
  const [nome, setNome] = useState('');
  const [selectedProprietarios, setSelectedProprietarios] = useState([]);
  const [showPropSelector, setShowPropSelector] = useState(false);
  const [novoProprietarioNome, setNovoProprietarioNome] = useState('');
  const [idade, setIdade] = useState('');
  const [sexo, setSexo] = useState('');
  const [categorias, setCategorias] = useState(new Set());
  const [dataCobertura, setDataCobertura] = useState('');
  const [pelagem, setPelagem] = useState('Tordilho');
  const [baia, setBaia] = useState('');
  const [mensalidade, setMensalidade] = useState('1950');
  const [obs, setObs] = useState('');
  const [erro, setErro] = useState('');

  // Plano nutricional
  const [racaoId, setRacaoId] = useState('i2');
  const [racaoKgDia, setRacaoKgDia] = useState('4');
  const [oleoMlDia, setOleoMlDia] = useState('50');
  const [suplementos, setSuplementos] = useState([]);

  const isGestante = categorias.has('Gestante');

  const handleToggleCategoria = (cat) => {
    const next = new Set(categorias);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setCategorias(next);
  };

  const handleToggleProp = (propId) => {
    const next = selectedProprietarios.includes(propId)
      ? selectedProprietarios.filter(p => p !== propId)
      : [...selectedProprietarios, propId];
    setSelectedProprietarios(next);
  };

  const handleAddNovoProprietario = () => {
    if (!novoProprietarioNome.trim()) return;
    const newId = addProprietario(novoProprietarioNome.trim());
    setSelectedProprietarios(prev => [...prev, newId]);
    setNovoProprietarioNome('');
    setShowPropSelector(true); // talvez manter aberto
  };

  const handleAddSuplemento = (insumoId) => {
    if (!suplementos.find(s => s.insumoId === insumoId)) {
      setSuplementos([...suplementos, { insumoId, qtdDia: 1 }]);
    }
  };

  const handleRemoveSuplemento = (insumoId) => {
    setSuplementos(suplementos.filter(s => s.insumoId !== insumoId));
  };

  const handleUpdateSuplementoQtd = (insumoId, qtdDia) => {
    setSuplementos(suplementos.map(s => s.insumoId === insumoId ? { ...s, qtdDia: parseFloat(qtdDia) || 0 } : s));
  };

  const handleSave = () => {
    if (!nome.trim()) { setErro('Nome do cavalo é obrigatório'); return; }
    if (selectedProprietarios.length === 0) { setErro('Selecione pelo menos um proprietário'); return; }
    if (!sexo) { setErro('Sexo é obrigatório'); return; }
    if (categorias.size === 0) { setErro('Selecione pelo menos uma categoria'); return; }
    if (isGestante && !dataCobertura) { setErro('Data de cobertura é obrigatória para gestantes'); return; }

    const categoria = Array.from(categorias)[0];
    const maxId = Math.max(...cavalos.map(c => parseInt(c.id.substring(1))));
    const newId = 'c' + (maxId + 1);

    const novoCavalo = {
      id: newId,
      nome: nome.trim(),
      pelagem,
      sexo,
      categoria,
      categorias: Array.from(categorias),
      proprietarioId: selectedProprietarios[0],
      baia: baia.trim() || 'A-00',
      mensalidade: parseInt(mensalidade) || 1950,
      obs: obs.trim(),
      idade: idade.trim(),
      nascimento: new Date().toISOString().split('T')[0],
      dataCobertura: dataCobertura || null,
      nutricao: { 
        racaoId, 
        racaoKgDia: parseFloat(racaoKgDia) || 0, 
        oleoMlDia: parseFloat(oleoMlDia) || 0, 
        suplementos: suplementos.filter(s => s.qtdDia > 0) 
      }
    };

    setCavalos(prev => [...prev, novoCavalo]);
    if (pendingEntradaCavalo && setNovoCavaloPendente) {
      setNovoCavaloPendente({ id: newId, dataEntrada: new Date().toISOString().split('T')[0] });
      setPendingEntradaCavalo(false);
      setScreen('movimentacao');
      return;
    }
    setScreen('cavalos');
  };

  const handleBack = () => {
    if (pendingEntradaCavalo && setPendingEntradaCavalo) {
      setPendingEntradaCavalo(false);
      setScreen('movimentacao');
      return;
    }
    setScreen('cavalos');
  };

  return (
    <div style={{ paddingBottom: 110 }}>
      <TopBar title="Adicionar cavalo" onBack={handleBack} />

      {erro && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10,
          padding: '12px 20px', color: '#dc2626', fontSize: 13, margin: '12px 20px 0',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="alert-circle" size={16} />
          {erro}
        </div>
      )}

      <div style={{ padding: '14px 20px 0' }}>
        {/* Nome do cavalo */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Nome do cavalo *">
            <input
              value={nome}
              onChange={e => { setNome(e.target.value); setErro(''); }}
              placeholder="Ex: Indiano"
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
        </div>

        {/* Proprietários */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Proprietário(s) *">
            {!showPropSelector ? (
              <button onClick={() => setShowPropSelector(true)} style={{
                width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                textAlign: 'left', color: selectedProprietarios.length === 0 ? 'var(--ink-3)' : 'var(--ink)',
                fontSize: 15, padding: 0,
              }}>
                {selectedProprietarios.length === 0 
                  ? 'Toque para selecionar...' 
                  : allProprietarios.filter(p => selectedProprietarios.includes(p.id)).map(p => p.nome).join(', ')}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allProprietarios.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--ink)' }}>
                    <input
                      type="checkbox"
                      checked={selectedProprietarios.includes(p.id)}
                      onChange={() => handleToggleProp(p.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    {p.nome}
                  </label>
                ))}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>Adicionar novo proprietário</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={novoProprietarioNome}
                      onChange={e => setNovoProprietarioNome(e.target.value)}
                      placeholder="Nome do proprietário"
                      style={{
                        flex: 1, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px',
                        fontSize: 14, color: 'var(--ink)', outline: 'none',
                      }}
                    />
                    <button onClick={handleAddNovoProprietario} disabled={!novoProprietarioNome.trim()} style={{
                      background: novoProprietarioNome.trim() ? 'var(--accent)' : 'var(--soft)',
                      color: novoProprietarioNome.trim() ? '#fff' : 'var(--ink-3)',
                      border: 'none', borderRadius: 8, padding: '8px 12px',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                      Adicionar
                    </button>
                  </div>
                </div>
                <button onClick={() => setShowPropSelector(false)} style={{
                  background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10,
                  padding: '8px', fontSize: 13, fontWeight: 600, marginTop: 4, cursor: 'pointer',
                }}>
                  Pronto
                </button>
              </div>
            )}
          </FormField>
        </div>

        {/* Sexo */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Sexo *">
            <div style={{ display: 'flex', gap: 12 }}>
              {['M', 'F'].map(s => (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: 'var(--ink)' }}>
                  <input
                    type="radio"
                    name="sexo"
                    value={s}
                    checked={sexo === s}
                    onChange={() => { setSexo(s); setErro(''); }}
                    style={{ cursor: 'pointer' }}
                  />
                  {s === 'M' ? 'Macho' : 'Fêmea'}
                </label>
              ))}
            </div>
          </FormField>
        </div>

        {/* Categoria */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Categoria * (marque uma ou mais)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CATEGORIAS_CAVALO.map(cat => (
                <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--ink)' }}>
                  <input
                    type="checkbox"
                    checked={categorias.has(cat)}
                    onChange={() => { handleToggleCategoria(cat); setErro(''); }}
                    style={{ cursor: 'pointer' }}
                  />
                  {cat}
                </label>
              ))}
            </div>
          </FormField>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Idade">
            <input
              value={idade}
              onChange={e => { setIdade(e.target.value); setErro(''); }}
              placeholder="Ex: 2 anos, 10 meses"
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
        </div>

        {/* Data de cobertura - obrigatória para gestantes */}
        {isGestante && (
          <div style={{ background: 'var(--card)', border: '1px solid #dc2626', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
            <FormField label="Data de cobertura *">
              <input
                type="date"
                value={dataCobertura}
                onChange={e => { setDataCobertura(e.target.value); setErro(''); }}
                style={{
                  width: '100%', border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
                }}
              />
              <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>
                ⚠️ Obrigatório para gestantes
              </div>
            </FormField>
          </div>
        )}

        {/* Pelagem */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Pelagem">
            <select
              value={pelagem}
              onChange={e => setPelagem(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            >
              {pelagenOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Baia (opcional) */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Baia (opcional)">
            <input
              value={baia}
              onChange={e => setBaia(e.target.value)}
              placeholder="Ex: A-04"
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
        </div>

        {/* Mensalidade (opcional) */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Mensalidade (R$) (opcional)">
            <input
              type="number"
              value={mensalidade}
              onChange={e => setMensalidade(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
        </div>

        {/* Observações (opcional) */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Observações (opcional)">
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
                minHeight: 60, resize: 'none',
              }}
            />
          </FormField>
        </div>

        {/* Plano nutricional */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Tipo da ração">
            <select
              value={racaoId}
              onChange={e => setRacaoId(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            >
              {INSUMOS.filter(i => i.categoria === 'racao').map(i => (
                <option key={i.id} value={i.id}>{i.nome}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Quantidade de ração (kg/dia)">
            <input
              type="number"
              step="0.1"
              value={racaoKgDia}
              onChange={e => setRacaoKgDia(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Quantidade de óleo de soja (ml/dia)">
            <input
              type="number"
              step="1"
              value={oleoMlDia}
              onChange={e => setOleoMlDia(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
        </div>

        {/* Suplementos */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Suplementos">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {INSUMOS.filter(i => i.categoria === 'suplemento').map(i => {
                const sup = suplementos.find(s => s.insumoId === i.id);
                return (
                  <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={!!sup}
                      onChange={e => e.target.checked ? handleAddSuplemento(i.id) : handleRemoveSuplemento(i.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)' }}>{i.nome}</span>
                    {sup && (
                      <input
                        type="number"
                        step="0.1"
                        value={sup.qtdDia}
                        onChange={e => handleUpdateSuplementoQtd(i.id, e.target.value)}
                        placeholder="dose/dia"
                        style={{
                          width: 80, border: '1px solid var(--line)', borderRadius: 6, padding: '4px 6px',
                          fontSize: 13, color: 'var(--ink)', outline: 'none',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </FormField>
        </div>
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        <button onClick={handleSave} style={{
          width: '100%', background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 14, padding: '14px',
          fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
        }}>
          Adicionar cavalo
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PROPRIETÁRIO DETALHE
// ─────────────────────────────────────────────────────────────
const ProprietarioScreen = ({ id, setScreen, proprietarios, cavalos = CAVALOS, updateProprietario }) => {
  const p = proprietarios.find(prop => prop.id === id);
  if (!p) return null;
  const ownedCavalos = cavalos.filter(c => c.proprietarioId === id);

  const [nome, setNome] = useState(p.nome);
  const [telefone, setTelefone] = useState(p.telefone || '');
  const [email, setEmail] = useState(p.email || '');
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = () => {
    updateProprietario(id, { nome, telefone, email });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  return (
    <div style={{ paddingBottom: 110 }}>
      <TopBar title={p.nome} onBack={() => setScreen('cadProprietarios')} />

      {savedMessage && (
        <div style={{
          background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 10,
          padding: '12px 20px', color: 'var(--accent)', fontSize: 13, margin: '12px 20px 0',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="check" size={16} />
          Informações salvas
        </div>
      )}

      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          <FormField label="Nome">
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
          <FormField label="Telefone">
            <input
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              placeholder="Ex: (11) 99999-9999"
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
          <FormField label="Email">
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Ex: exemplo@email.com"
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
        </div>

        <div style={{ marginTop: 18, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>Cavalos deste proprietário</div>
          {ownedCavalos.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '10px 0' }}>Nenhum cavalo cadastrado.</div>
          ) : ownedCavalos.map((cav, index) => (
            <div key={cav.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, padding: index === 0 ? '0 0 10px' : '10px 0 10px',
              borderTop: index === 0 ? 'none' : '1px solid var(--line)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HorseAvatar cavalo={cav} size={24} />
                <div>
                  <div style={{ fontSize: 13, color: 'var(--ink)' }}>{cav.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{cav.baia}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 92 }}>
                <div style={{ fontSize: 13, color: 'var(--ink)' }}>{formatBRL(cav.mensalidade)}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>mensalidade</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        <button onClick={handleSave} style={{
          width: '100%', background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 14, padding: '14px',
          fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
        }}>
          Salvar alterações
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// FATURAS · Lista
// ─────────────────────────────────────────────────────────────
const FaturasScreen = ({ setScreen, setSelected, registros }) => {
  const ref = { ano: 2026, mes: 5 };
  // Calcula fatura por proprietário
  const faturas = PROPRIETARIOS.map(p => {
    const cavalosObj = p.cavalos.map(getCavalo);
    const cavalosIds = new Set(p.cavalos);
    const mensalidades = cavalosObj.reduce((s, c) => s + proporcaoMensalidade(c.id, ref).valor, 0);
    const perfilTotal = cavalosObj.reduce((s, c) => s + cobrancaPerfilMes(c.id, ref).total, 0);
    const myReg = registros.filter(r => cavalosIds.has(r.cavaloId));
    const insumosTotal = myReg.reduce((s, r) => {
      const i = getInsumo(r.insumoId);
      const taxa = i.injetavel ? TAXA_INJETAVEL * r.qtd : 0;
      return s + i.valor * r.qtd + taxa;
    }, 0);
    return { ...p, total: mensalidades + perfilTotal + insumosTotal, mensalidades, perfil: perfilTotal, insumos: insumosTotal, cavalosObj };
  });

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title="Faturas" subtitle="Maio · 2026" />

      <div style={{ padding: '12px 20px 0' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)',
          borderRadius: 16, padding: '16px',
        }}>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Faturado este mês
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 4 }}>
            {formatBRL(faturas.reduce((s, f) => s + f.total, 0))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
            {faturas.length} proprietários · {CAVALOS.length} cavalos
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 400, margin: '0 0 8px', color: 'var(--ink-2)' }}>Por proprietário</h2>
        {faturas.map(f => (
          <button key={f.id} onClick={() => { setSelected(f.id); setScreen('faturaDetalhe'); }} style={{
            width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '14px', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: 'var(--ink)',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 38, background: 'var(--accent-soft)',
              color: 'var(--accent)', display: 'grid', placeItems: 'center',
              fontFamily: 'var(--serif)', fontSize: 14,
            }}>
              {f.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>{f.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                {f.cavalos.length} cavalo{f.cavalos.length > 1 ? 's' : ''} · mens. {formatBRL(f.mensalidades)} + perfil {formatBRL(f.perfil)} + ins. {formatBRL(f.insumos)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{formatBRL(f.total)}</div>
              <Icon name="chevron-right" size={14} color="var(--ink-3)" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// FATURA DETALHE · pré-visualização do PDF
// ─────────────────────────────────────────────────────────────
const FaturaDetalheScreen = ({ id, setScreen, registros, proprietarios = PROPRIETARIOS }) => {
  const getProprietarioLocal = (id) => proprietarios.find(p => p.id === id);
  const p = getProprietarioLocal(id);
  const cavalosObj = p.cavalos.map(getCavalo);
  const cavIds = new Set(p.cavalos);
  const myReg = registros.filter(r => cavIds.has(r.cavaloId));
  const ref = { ano: 2026, mes: 5 };
  const propMens = cavalosObj.map(c => ({ cav: c, ...proporcaoMensalidade(c.id, ref) }));
  const mensTotal = propMens.reduce((s, m) => s + m.valor, 0);
  // Cobrança do perfil (óleo + suplementos × dias)
  const propPerfil = cavalosObj.map(c => ({ cav: c, ...cobrancaPerfilMes(c.id, ref) }))
    .filter(p => p.linhas.length > 0);
  const perfilTotal = propPerfil.reduce((s, p) => s + p.total, 0);
  // Insumos avulsos com taxa de injetável
  const insumosLinhas = myReg.map(r => {
    const ins = getInsumo(r.insumoId);
    const cav = getCavalo(r.cavaloId);
    const subtotal = ins.valor * r.qtd;
    const taxa = ins.injetavel ? TAXA_INJETAVEL * r.qtd : 0;
    return { reg: r, ins, cav, subtotal, taxa, total: subtotal + taxa };
  });
  const insumosTotal = insumosLinhas.reduce((s, l) => s + l.total, 0);
  const total = mensTotal + perfilTotal + insumosTotal;

  return (
    <div style={{ paddingBottom: 110, background: 'var(--soft)', minHeight: '100%' }}>
      <TopBar title="Fatura" subtitle={`${p.nome} · maio 2026`} onBack={() => setScreen('faturas')} action={
        <button style={{
          padding: '8px 12px', borderRadius: 10, background: 'var(--accent)', color: '#fff',
          border: 'none', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
          fontFamily: 'var(--sans)',
        }}>
          <Icon name="doc" size={14} color="#fff" /> PDF
        </button>
      } />

      {/* "Folha" da fatura */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          background: '#fffdfa', border: '1px solid var(--line)', borderRadius: 8,
          padding: '24px 22px',
          boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
          fontFamily: 'var(--serif)',
        }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottom: '1.5px solid var(--ink)' }}>
            <img src="assets/logo-epona.png" style={{ width: 32, height: 32, objectFit: 'contain' }} alt="" />
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', letterSpacing: '0.06em' }}>HARAS EPONA</div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Demonstrativo mensal</div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right', fontFamily: 'var(--sans)' }}>
              <div style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Competência</div>
              <div style={{ fontSize: 11, color: 'var(--ink)', fontWeight: 600 }}>05 / 2026</div>
            </div>
          </div>

          {/* cliente */}
          <div style={{ padding: '14px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontFamily: 'var(--sans)' }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Proprietário</div>
              <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 3 }}>{p.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 1 }}>{p.email}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Vencimento</div>
              <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 3 }}>10 / jun / 2026</div>
            </div>
          </div>

          {/* tabela mensalidades */}
          <SectionTitle>Mensalidades · ração inclusa</SectionTitle>
          {propMens.map(m => (
            <TableRow
              key={m.cav.id}
              left={m.cav.nome}
              sub={`${m.cav.categoria} · ${m.cav.baia}${m.parcial ? ` · ${m.dias}/${m.total} dias` : ''}`}
              right={formatBRL(m.valor)}
            />
          ))}

          {propPerfil.length > 0 && <SectionTitle>Óleo & suplementos · perfil × dias</SectionTitle>}
          {propPerfil.flatMap(pp => pp.linhas.map(l => (
            <TableRow
              key={pp.cav.id + l.insumoId}
              left={`${l.nome} · ${pp.cav.nome}`}
              sub={`${l.qtdDia} ${l.unidade}/dia × ${l.dias} dias`}
              right={formatBRL(l.valorMes)}
            />
          )))}

          <SectionTitle>Insumos avulsos</SectionTitle>
          {insumosLinhas.length === 0 && <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ink-3)', padding: '6px 0' }}>Sem insumos avulsos este mês.</div>}
          {insumosLinhas.map(l => (
            <TableRow
              key={l.reg.id}
              left={<>{l.ins.nome}{l.ins.injetavel && <span style={{ marginLeft: 6, fontSize: 8, padding: '1px 4px', borderRadius: 3, background: '#fef2e8', color: '#c0392b', fontWeight: 700, letterSpacing: '0.06em', verticalAlign: 'middle' }}>INJ</span>}</>}
              sub={l.ins.injetavel
                ? `${l.cav.nome} · ${l.reg.qtd} ${l.ins.unidade} + taxa injetável ${formatBRL(l.taxa)}`
                : `${l.cav.nome} · ${l.reg.qtd} ${l.ins.unidade}`}
              right={formatBRL(l.total)}
            />
          ))}

          {/* totais */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)', fontFamily: 'var(--sans)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-2)', padding: '3px 0' }}>
              <span>Mensalidades</span><span>{formatBRL(mensTotal)}</span>
            </div>
            {perfilTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-2)', padding: '3px 0' }}>
                <span>Óleo & suplementos</span><span>{formatBRL(perfilTotal)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-2)', padding: '3px 0' }}>
              <span>Insumos avulsos</span><span>{formatBRL(insumosTotal)}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '10px 0 0', borderTop: '1px solid var(--ink)',
              marginTop: 6,
            }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)' }}>Total</span>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{formatBRL(total)}</span>
            </div>
          </div>

          <div style={{ marginTop: 18, paddingTop: 12, borderTop: '1px dashed var(--line)', fontFamily: 'var(--sans)', fontSize: 9, color: 'var(--ink-3)', textAlign: 'center', letterSpacing: '0.04em' }}>
            HARAS EPONA · Estrada do Cedro, km 14 · Itu / SP · contato@harasepona.com.br
          </div>
        </div>
      </div>

      {/* Ações */}
      <div style={{ padding: '14px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
          padding: '12px', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink)',
        }}>Compartilhar</button>
        <button style={{
          background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12,
          padding: '12px', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
        }}>Enviar fatura</button>
      </div>
    </div>
  );
};

const SectionTitle = ({ children }) => (
  <div style={{
    fontFamily: 'var(--sans)', fontSize: 9, color: 'var(--ink-3)',
    letterSpacing: '0.1em', textTransform: 'uppercase',
    marginTop: 14, marginBottom: 4, paddingBottom: 4, borderBottom: '1px solid var(--line)',
  }}>{children}</div>
);
const TableRow = ({ left, sub, right }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '5px 0', fontFamily: 'var(--sans)',
  }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: 'var(--ink)' }}>{left}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>}
    </div>
    <div style={{ fontSize: 12, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', marginLeft: 12 }}>{right}</div>
  </div>
);

Object.assign(window, {
  TopBar, TabBar, HorseAvatar, DetailRow, NutritionRow, ActivityRow,
  HomeScreen, HistoricoScreen, CavalosScreen, CavaloDetalheScreen, EditarCavaloScreen, AddCavaloScreen,
  CadastrosScreen, CadProprietariosScreen, CadInsumosScreen, CadMensalidadesScreen, CadCavalosScreen,
  FaturasScreen, FaturaDetalheScreen,
});
