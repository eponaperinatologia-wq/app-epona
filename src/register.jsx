// register.jsx — Registro de insumos com 3 fluxos
// fluxo: 'cavalo' | 'insumo' | 'setor'
import React from 'react';
import { Icon, CATEGORIA_ICONS } from './icons';
import {
  CAVALOS, INSUMOS, CATEGORIAS_INSUMOS, SETORES,
  getCavalo, getInsumo, getCategoria, formatBRL, norm, addDescartaveis,
} from './data';
import { TopBar, HorseAvatar } from './screens';
const { useState: useStateR, useMemo: useMemoR } = React;

// Data/mês do registro. `mesDestino` ('YYYY-MM') aponta para a fatura em correção;
// fora do mês vigente, o registro cai no dia de hoje "transposto" para aquele mês
// (limitado ao último dia), para que a cobrança entre na fatura certa.
export const dataParaMesDestino = (mesDestino) => {
  const hoje = new Date();
  const dataHoje = hoje.toLocaleDateString('sv-SE');
  if (!mesDestino || dataHoje.slice(0, 7) === mesDestino) {
    return { data: dataHoje, mes: dataHoje.slice(0, 7) };
  }
  const [ano, mes] = mesDestino.split('-').map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dia = Math.min(hoje.getDate(), ultimoDia);
  return { data: `${mesDestino}-${String(dia).padStart(2, '0')}`, mes: mesDestino };
};

// ─────────────────────────────────────────────────────────────
// Quantity stepper — large touch targets
// ─────────────────────────────────────────────────────────────
const QtyStepper = ({ value, onChange, unit }) => {
  const [text, setText] = React.useState(String(value));
  React.useEffect(() => { setText(String(value)); }, [value, unit]);
  const isKgL = unit === 'kg' || unit === 'l';
  const step = isKgL ? 0.5 : 1;
  const min = isKgL ? 0.5 : 1;
  const commit = (v) => onChange(Math.max(min, parseFloat(v) || min));
  return (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 0,
    background: 'var(--soft)', borderRadius: 14, padding: 4,
  }}>
    <button onClick={() => commit(value - step)} style={{
      width: 44, height: 44, borderRadius: 11, border: 'none',
      background: 'var(--card)', color: 'var(--ink)',
      display: 'grid', placeItems: 'center',
      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    }}>
      <Icon name="minus" size={18} />
    </button>
    <div style={{ flex: 1, textAlign: 'center', padding: '0 12px' }}>
      <input type="number" value={text} min={min} step={step}
        onChange={e => setText(e.target.value)}
        onBlur={e => commit(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && commit(e.target.value)}
        style={{
          width: '100%', border: 'none', outline: 'none', background: 'transparent',
          fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)',
          letterSpacing: '-0.01em', lineHeight: 1, textAlign: 'center', padding: 0,
          MozAppearance: 'textfield',
        }}
      />
      <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{unit}</div>
    </div>
    <button onClick={() => commit(value + step)} style={{
      width: 44, height: 44, borderRadius: 11, border: 'none',
      background: 'var(--card)', color: 'var(--ink)',
      display: 'grid', placeItems: 'center',
      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    }}>
      <Icon name="plus" size={18} />
    </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Toast feedback
// ─────────────────────────────────────────────────────────────
const Toast = ({ msg }) => msg ? (
  <div style={{
    position: 'absolute', bottom: 100, left: 20, right: 20,
    background: 'var(--ink)', color: '#fff', borderRadius: 12,
    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
    fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
    boxShadow: '0 12px 30px rgba(0,0,0,0.25)', zIndex: 30,
    animation: 'toastIn 0.25s ease-out',
  }}>
    <div style={{ width: 22, height: 22, borderRadius: 22, background: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
      <Icon name="check" size={14} color="#fff" />
    </div>
    {msg}
  </div>
) : null;

// ─────────────────────────────────────────────────────────────
// FLUXO A — POR CAVALO
// 1) escolhe cavalo  2) escolhe insumo  3) confirma qtd
// ─────────────────────────────────────────────────────────────
const REG_CAVALO_KEY = 'epona_reg_cavalo';

const RegistrarPorCavalo = ({ setScreen, addRegistro, addAtividade, prefilledCavaloId, insumos = INSUMOS, cavalos, currentUser, mesDestino }) => {
  const savedCavalo = React.useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem(REG_CAVALO_KEY)); }
    catch (e) { return null; }
  }, []);
  const [step, setStep] = useStateR(savedCavalo?.step || (prefilledCavaloId ? 'insumo' : 'cavalo'));
  const [cavaloId, setCavaloId] = useStateR(savedCavalo?.cavaloId || prefilledCavaloId || null);
  const [insumoId, setInsumoId] = useStateR(savedCavalo?.insumoId || null);
  const [qtd, setQtd] = useStateR(savedCavalo?.qtd || 1);
  const [search, setSearch] = useStateR(savedCavalo?.search || '');
  const [catFilter, setCatFilter] = useStateR(savedCavalo?.catFilter || 'all');
  const [cobrarAvulso, setCobrarAvulso] = useStateR(false);
  const [mostrarSaidos, setMostrarSaidos] = useStateR(false);
  const [toast, setToast] = useStateR(null);
  React.useEffect(() => {
    try {
      sessionStorage.setItem(REG_CAVALO_KEY, JSON.stringify({ step, cavaloId, insumoId, qtd, search, catFilter }));
    } catch (e) {}
  }, [step, cavaloId, insumoId, qtd, search, catFilter]);
  const clearRegCavalo = () => sessionStorage.removeItem(REG_CAVALO_KEY);

  const cav = cavaloId && ((cavalos || CAVALOS).find(c => c.id === cavaloId));
  const ins = insumoId && (insumos.find(i => i.id === insumoId) || getInsumo(insumoId));

  const cavalosDisponiveis = (cavalos || CAVALOS).filter(c => mostrarSaidos || c.presente);
  const cavalosFiltrados = cavalosDisponiveis.filter(c =>
    norm(c.nome).includes(norm(search)) ||
    norm(c.baia).includes(norm(search))
  );

  const insumosFiltrados = (catFilter === 'all' ? insumos : insumos.filter(i => i.categoria === catFilter))
    .filter(i => i.categoria !== 'veterinario' && i.categoria !== 'transporte')
    .filter(i => !search || norm(i.nome).includes(norm(search)));

  const confirmar = () => {
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const { data, mes } = dataParaMesDestino(mesDestino);
    addRegistro({ id: 'r' + Date.now(), cavaloId, insumoId, qtd, hora, data, usuario: currentUser?.nome || '', cobrarAvulso });
    addDescartaveis(addRegistro, insumoId, cavaloId, qtd, insumos, hora, 'Sistema (auto)', data);
    if (addAtividade) addAtividade({
      id: 'at_' + Date.now(), tipo: 'insumo',
      cavaloId, insumoId, qtd, usuario: currentUser?.nome || '',
      data, hora, mes,
    });
    const temDesc = ins?.descartaveis?.length > 0;
    setToast(`${cav.nome} · ${ins.nome} registrado${temDesc ? ' + descartáveis' : ''}`);
    setTimeout(() => {
      setToast(null);
      setInsumoId(null); setQtd(1); setStep('insumo');
    }, 1600);
  };

  // Step 1: Escolher cavalo
  if (step === 'cavalo') {
    return (
      <div style={{ paddingBottom: 90 }}>
        <TopBar title="Qual cavalo?" subtitle="Passo 1 de 3" onBack={() => { clearRegCavalo(); setScreen('home'); }} />
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon name="search" size={16} color="var(--ink-3)" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome ou baia"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)' }} />
          </div>
        </div>
        <div style={{ padding: '10px 20px 0' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            fontSize: 12, color: mostrarSaidos ? 'var(--accent)' : 'var(--ink-3)',
          }}>
            <input type="checkbox" checked={mostrarSaidos}
              onChange={e => setMostrarSaidos(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }} />
            Mostrar animais que já saíram do haras
          </label>
        </div>
        <div style={{ padding: '12px 20px 0' }}>
          {cavalosFiltrados.map(c => (
            <button key={c.id} onClick={() => { setCavaloId(c.id); setSearch(''); setStep('insumo'); }} style={{
              width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '12px', marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: 'var(--ink)',
              opacity: c.presente === false ? 0.7 : 1,
            }}>
              <HorseAvatar cavalo={c} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{c.nome}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>{c.baia}</span>
                  {c.presente === false && (
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>SAIU</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.pelagem} · {c.categoria}</div>
              </div>
              <Icon name="chevron-right" size={16} color="var(--ink-3)" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: Escolher insumo
  if (step === 'insumo') {
    const cats = [{ id: 'all', nome: 'Todos', cor: '#3d6043' }, ...CATEGORIAS_INSUMOS];
    return (
      <div style={{ paddingBottom: 90 }}>
        <TopBar
          title={`Qual insumo?`}
          subtitle={`Para ${cav.nome} · passo 2 de 3`}
          onBack={() => setStep('cavalo')}
        />
        {/* Sticky cavalo card */}
        <div style={{ padding: '8px 20px 0' }}>
          <div style={{
            background: 'var(--accent-soft)', borderRadius: 12, padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 10, border: '1px solid ' + 'var(--accent)' + '20',
          }}>
            <HorseAvatar cavalo={cav} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{cav.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{cav.baia}</div>
            </div>
            <button onClick={() => setStep('cavalo')} style={{
              fontSize: 11, background: 'transparent', border: 'none', color: 'var(--accent)', fontWeight: 600,
            }}>Trocar</button>
          </div>
        </div>
        {/* search bar */}
        <div style={{ padding: '8px 20px 0' }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon name="search" size={16} color="var(--ink-3)" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar insumo..."
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)' }} />
          </div>
        </div>
        {/* category chips */}
        <div style={{
          padding: '8px 20px 4px', display: 'flex', gap: 6,
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {cats.map(c => (
            <button key={c.id} onClick={() => setCatFilter(c.id)} style={{
              padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
              border: '1px solid ' + (catFilter === c.id ? c.cor : 'var(--line)'),
              background: catFilter === c.id ? c.cor : 'var(--card)',
              color: catFilter === c.id ? '#fff' : 'var(--ink-2)',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>{c.nome}</button>
          ))}
        </div>
        <div style={{ padding: '8px 20px 0' }}>
          {insumosFiltrados.map(i => {
            const cat = getCategoria(i.categoria);
            return (
              <button key={i.id} onClick={() => { setInsumoId(i.id); setStep('qtd'); }} style={{
                width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
                borderRadius: 12, padding: '12px', marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: 'var(--ink)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: cat.cor + '15', color: cat.cor,
                  display: 'grid', placeItems: 'center',
                }}>
                  <Icon name={CATEGORIA_ICONS[cat.id]} size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{i.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{formatBRL(i.valorVenda ?? i.valor ?? 0)} / {i.unidade}</div>
                </div>
                <Icon name="chevron-right" size={16} color="var(--ink-3)" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Step 3: Quantidade + confirmar
  return (
    <div style={{ paddingBottom: 90, position: 'relative' }}>
      <TopBar title="Confirmar" subtitle="Passo 3 de 3" onBack={() => setStep('insumo')} />
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16,
          padding: '20px',
        }}>
          {/* cavalo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
            <HorseAvatar cavalo={cav} size={52} />
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)' }}>{cav.nome}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Baia {cav.baia}</div>
            </div>
          </div>
          {/* insumo */}
          <div style={{ paddingTop: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Insumo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: getCategoria(ins.categoria).cor + '15',
                color: getCategoria(ins.categoria).cor,
                display: 'grid', placeItems: 'center',
              }}>
                <Icon name={CATEGORIA_ICONS[ins.categoria]} size={14} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: 'var(--ink)' }}>{ins.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{formatBRL(ins.valorVenda ?? ins.valor ?? 0)} / {ins.unidade}</div>
              </div>
            </div>
          </div>
          {/* qtd */}
          <div style={{ paddingTop: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Quantidade</div>
            <QtyStepper value={qtd} onChange={setQtd} unit={ins.unidade} />
          </div>
          {/* Cobrar avulso — só relevante pra insumos que normalmente
              ficam embutidos na mensalidade (ração/nutrição/insumos
              marcados como incluidoMensalidade). Uso típico: entrega
              na saída do animal. */}
          {(ins.incluidoMensalidade || ins.categoria === 'racao' || ins.categoria === 'nutricao_base') && (
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 14,
              padding: '10px 12px', background: cobrarAvulso ? '#fef3c7' : 'var(--soft)',
              border: `1px solid ${cobrarAvulso ? '#fbbf24' : 'var(--line)'}`,
              borderRadius: 10, cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={cobrarAvulso}
                onChange={e => setCobrarAvulso(e.target.checked)}
                style={{ width: 16, height: 16, marginTop: 2, cursor: 'pointer' }}
              />
              <div style={{ flex: 1, fontSize: 12, color: cobrarAvulso ? '#78350f' : 'var(--ink-2)', lineHeight: 1.4 }}>
                <strong>Cobrar avulso na fatura</strong>
                <div style={{ fontSize: 11, marginTop: 2, opacity: 0.85 }}>
                  Este insumo normalmente entra na mensalidade. Marque quando for uma entrega adicional (ex: ração levada na saída do haras).
                </div>
              </div>
            </label>
          )}
          {/* total */}
          <div style={{
            marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--line)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Subtotal</span>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)' }}>{formatBRL(( ins.valorVenda ?? ins.valor ?? 0) * qtd)}</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 24, left: 20, right: 20, display: 'flex', gap: 8 }}>
        <button onClick={() => { clearRegCavalo(); setScreen('home'); }} style={{
          flex: 1, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
          padding: '14px', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500, color: 'var(--ink-2)',
        }}>Cancelar</button>
        <button onClick={confirmar} style={{
          flex: 2, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 14,
          padding: '14px', fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 8px 16px rgba(61, 96, 67, 0.22)',
        }}>
          <Icon name="check" size={18} color="#fff" />
          Registrar
        </button>
      </div>

      <Toast msg={toast} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// FLUXO B — POR INSUMO
// 1) escolhe insumo  2) marca cavalos (multi)  3) confirma
// ─────────────────────────────────────────────────────────────
const RegistrarPorInsumo = ({ setScreen, addRegistro, addAtividade, insumos = INSUMOS, cavalos, currentUser, mesDestino }) => {
  const [step, setStep] = useStateR('insumo');
  const [insumoId, setInsumoId] = useStateR(null);
  const [selectedCavalos, setSelectedCavalos] = useStateR(new Set());
  const [qtd, setQtd] = useStateR(1);
  const [catFilter, setCatFilter] = useStateR('all');
  const [search, setSearch] = useStateR('');
  const [cobrarAvulso, setCobrarAvulso] = useStateR(false);
  const [mostrarSaidos, setMostrarSaidos] = useStateR(false);
  const [toast, setToast] = useStateR(null);

  const cavalosDisponiveis = (cavalos || CAVALOS).filter(c => mostrarSaidos || c.presente);
  const ins = insumoId && (insumos.find(i => i.id === insumoId) || getInsumo(insumoId));
  const insumosFiltrados = (catFilter === 'all' ? insumos : insumos.filter(i => i.categoria === catFilter))
    .filter(i => i.categoria !== 'veterinario' && i.categoria !== 'transporte')
    .filter(i => !search || norm(i.nome).includes(norm(search)));
  const cats = [{ id: 'all', nome: 'Todos', cor: '#3d6043' }, ...CATEGORIAS_INSUMOS];

  const toggleCav = (id) => {
    const next = new Set(selectedCavalos);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedCavalos(next);
  };

  const confirmar = () => {
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const { data, mes } = dataParaMesDestino(mesDestino);
    selectedCavalos.forEach(cid => {
      addRegistro({ id: 'r' + Date.now() + cid, cavaloId: cid, insumoId, qtd, hora, data, usuario: currentUser?.nome || '', cobrarAvulso });
      addDescartaveis(addRegistro, insumoId, cid, qtd, insumos, hora, 'Sistema (auto)', data);
      if (addAtividade) addAtividade({
        id: 'at_' + Date.now() + cid, tipo: 'insumo',
        cavaloId: cid, insumoId, qtd, usuario: currentUser?.nome || '',
        data, hora, mes,
      });
    });
    setToast(`${selectedCavalos.size} cavalos registrados`);
    setTimeout(() => setScreen('home'), 1400);
  };

  if (step === 'insumo') {
    return (
      <div style={{ paddingBottom: 90 }}>
        <TopBar title="Qual insumo?" subtitle="Passo 1 de 3" onBack={() => setScreen('home')} />
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon name="search" size={16} color="var(--ink-3)" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar insumo..."
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)' }} />
          </div>
        </div>
        <div style={{
          padding: '8px 20px 4px', display: 'flex', gap: 6,
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {cats.map(c => (
            <button key={c.id} onClick={() => setCatFilter(c.id)} style={{
              padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
              border: '1px solid ' + (catFilter === c.id ? c.cor : 'var(--line)'),
              background: catFilter === c.id ? c.cor : 'var(--card)',
              color: catFilter === c.id ? '#fff' : 'var(--ink-2)',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>{c.nome}</button>
          ))}
        </div>
        <div style={{ padding: '8px 20px 0' }}>
          {insumosFiltrados.map(i => {
            const cat = getCategoria(i.categoria);
            return (
              <button key={i.id} onClick={() => { setInsumoId(i.id); setStep('cavalos'); }} style={{
                width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
                borderRadius: 12, padding: '12px', marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: 'var(--ink)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: cat.cor + '15', color: cat.cor,
                  display: 'grid', placeItems: 'center',
                }}>
                  <Icon name={CATEGORIA_ICONS[cat.id]} size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{i.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{formatBRL(i.valorVenda ?? i.valor ?? 0)} / {i.unidade}</div>
                </div>
                <Icon name="chevron-right" size={16} color="var(--ink-3)" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // step cavalos (multi-select)
  return (
    <div style={{ paddingBottom: 100, position: 'relative' }}>
      <TopBar
        title="Marcar cavalos"
        subtitle={`${ins.nome} · ${selectedCavalos.size} selecionados`}
        onBack={() => setStep('insumo')}
      />
      {/* qtd */}
      <div style={{ padding: '8px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Qtd por cavalo
          </div>
          <div style={{ width: 200 }}>
            <QtyStepper value={qtd} onChange={setQtd} unit={ins.unidade} />
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => {
          if (selectedCavalos.size === cavalosDisponiveis.length) setSelectedCavalos(new Set());
          else setSelectedCavalos(new Set(cavalosDisponiveis.map(c => c.id)));
        }} style={{
          fontSize: 12, color: 'var(--accent)', background: 'transparent',
          border: 'none', fontWeight: 600, padding: '4px 0',
        }}>
          {selectedCavalos.size === CAVALOS.length ? 'Limpar seleção' : 'Selecionar todos'}
        </button>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          fontSize: 12, color: mostrarSaidos ? 'var(--accent)' : 'var(--ink-3)',
        }}>
          <input type="checkbox" checked={mostrarSaidos}
            onChange={e => setMostrarSaidos(e.target.checked)}
            style={{ width: 14, height: 14, cursor: 'pointer' }} />
          Incluir saídos
        </label>
      </div>

      <div style={{ padding: '4px 20px 0' }}>
        {cavalosDisponiveis.map(c => {
          const sel = selectedCavalos.has(c.id);
          return (
            <button key={c.id} onClick={() => toggleCav(c.id)} style={{
              width: '100%', background: sel ? 'var(--accent-soft)' : 'var(--card)',
              border: '1px solid ' + (sel ? 'var(--accent)' : 'var(--line)'),
              borderRadius: 12, padding: '10px 12px', marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: 'var(--ink)',
              opacity: c.presente === false ? 0.7 : 1,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                border: '1.5px solid ' + (sel ? 'var(--accent)' : 'var(--line-2)'),
                background: sel ? 'var(--accent)' : 'transparent',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                {sel && <Icon name="check" size={14} color="#fff" />}
              </div>
              <HorseAvatar cavalo={c} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{c.nome}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>{c.baia}</span>
                  {c.presente === false && (
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>SAIU</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{c.categoria}</div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedCavalos.size > 0 && (
        <div style={{
          position: 'absolute', bottom: 24, left: 20, right: 20,
        }}>
          {(ins.incluidoMensalidade || ins.categoria === 'racao' || ins.categoria === 'nutricao_base') && (
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10,
              padding: '10px 12px', background: cobrarAvulso ? '#fef3c7' : 'var(--card)',
              border: `1px solid ${cobrarAvulso ? '#fbbf24' : 'var(--line)'}`,
              borderRadius: 10, cursor: 'pointer',
            }}>
              <input type="checkbox" checked={cobrarAvulso}
                onChange={e => setCobrarAvulso(e.target.checked)}
                style={{ width: 16, height: 16, marginTop: 2, cursor: 'pointer' }} />
              <div style={{ flex: 1, fontSize: 12, color: cobrarAvulso ? '#78350f' : 'var(--ink-2)', lineHeight: 1.4 }}>
                <strong>Cobrar avulso na fatura</strong>
                <div style={{ fontSize: 11, marginTop: 2, opacity: 0.85 }}>
                  Entrega adicional (ex: saída do haras). Sobrepõe a inclusão na mensalidade.
                </div>
              </div>
            </label>
          )}
          <button onClick={confirmar} style={{
            width: '100%', background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 14, padding: '14px',
            fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 8px 16px rgba(61, 96, 67, 0.22)',
          }}>
            <Icon name="check" size={18} color="#fff" />
            Registrar p/ {selectedCavalos.size} cavalo{selectedCavalos.size > 1 ? 's' : ''} · {formatBRL(( ins.valorVenda ?? ins.valor ?? 0) * qtd * selectedCavalos.size)}
          </button>
        </div>
      )}
      <Toast msg={toast} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// FLUXO C — POR SETOR (lote)
// Lista de setores → grid de cavalos com ações rápidas inline
// ─────────────────────────────────────────────────────────────
const RegistrarPorSetor = ({ setScreen, addRegistro, addAtividade, insumos = INSUMOS, cavalos, currentUser, mesDestino }) => {
  const [setor, setSetor] = useStateR(null);
  const [insumoQuick, setInsumoQuick] = useStateR(INSUMOS[1].id);
  const [confirmados, setConfirmados] = useStateR(new Set());
  const [toast, setToast] = useStateR(null);

  const ins = insumos.find(i => i.id === insumoQuick) || getInsumo(insumoQuick);

  const registrarRapido = (cid) => {
    if (confirmados.has(cid)) return;
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const { data, mes } = dataParaMesDestino(mesDestino);
    addRegistro({ id: 'r' + Date.now() + cid, cavaloId: cid, insumoId: insumoQuick, qtd: 1, hora, data, usuario: currentUser?.nome || '' });
    addDescartaveis(addRegistro, insumoQuick, cid, 1, insumos, hora, 'Sistema (auto)', data);
    if (addAtividade) addAtividade({
      id: 'at_' + Date.now() + cid, tipo: 'insumo',
      cavaloId: cid, insumoId: insumoQuick, qtd: 1, usuario: currentUser?.nome || '',
      data, hora, mes,
    });
    const next = new Set(confirmados); next.add(cid);
    setConfirmados(next);
    const cavNome = ((cavalos || CAVALOS).find(x => x.id === cid))?.nome || '?';
    setToast(`${cavNome} ✓`);
    setTimeout(() => setToast(null), 800);
  };

  if (!setor) {
    return (
      <div style={{ paddingBottom: 90 }}>
        <TopBar title="Por setor" subtitle="Selecione um setor" onBack={() => setScreen('home')} />
        <div style={{ padding: '14px 20px 0' }}>
          {SETORES.map(s => (
            <button key={s.id} onClick={() => setSetor(s)} style={{
              width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '16px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', color: 'var(--ink)',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: 'var(--accent-soft)',
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--accent)',
              }}>{s.id}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{s.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{s.cavalos.length} cavalos</div>
              </div>
              <Icon name="chevron-right" size={16} color="var(--ink-3)" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 90, position: 'relative' }}>
      <TopBar title={setor.nome} subtitle={`${confirmados.size} de ${setor.cavalos.length} feitos`} onBack={() => setSetor(null)} />

      {/* Insumo seletor rápido */}
      <div style={{ padding: '8px 20px 0' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
          padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Aplicando</div>
          <select value={insumoQuick} onChange={e => { setInsumoQuick(e.target.value); setConfirmados(new Set()); }} style={{
            flex: 1, border: 'none', background: 'transparent', fontSize: 14, fontWeight: 500,
            color: 'var(--ink)', appearance: 'none', textAlign: 'right', fontFamily: 'var(--sans)',
          }}>
            {insumos.filter(i => i.categoria !== 'veterinario' && i.categoria !== 'transporte').map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </select>
          <Icon name="chevron-down" size={14} color="var(--ink-3)" />
        </div>
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Toque para registrar 1× {ins.nome}
        </div>
        {setor.cavalos.map(cid => {
          const c = (cavalos || CAVALOS).find(x => x.id === cid) || getCavalo(cid);
          const done = confirmados.has(cid);
          return (
            <button key={cid} onClick={() => registrarRapido(cid)} disabled={done} style={{
              width: '100%', background: done ? 'var(--accent-soft)' : 'var(--card)',
              border: '1px solid ' + (done ? 'var(--accent)' : 'var(--line)'),
              borderRadius: 14, padding: '12px',
              marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12,
              textAlign: 'left', color: 'var(--ink)',
              transition: 'all 0.2s', opacity: done ? 0.85 : 1,
            }}>
              <HorseAvatar cavalo={c} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{c.nome}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>{c.baia}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.categoria}</div>
              </div>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: done ? 'var(--accent)' : 'var(--soft)',
                display: 'grid', placeItems: 'center',
                color: done ? '#fff' : 'var(--ink-3)',
                transition: 'all 0.2s',
              }}>
                <Icon name={done ? 'check' : 'plus'} size={20} color={done ? '#fff' : 'var(--ink-3)'} />
              </div>
            </button>
          );
        })}
      </div>
      <Toast msg={toast} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// HUB — escolher fluxo (quando não-tweak)
// ─────────────────────────────────────────────────────────────
const RegistrarHub = ({ setScreen, setFluxo }) => {
  const opcoes = [
    { id: 'cavalo', titulo: 'Por cavalo', sub: '1 cavalo, vários insumos', icon: 'horse' },
    { id: 'insumo', titulo: 'Por insumo', sub: '1 insumo, vários cavalos', icon: 'package' },
    { id: 'setor', titulo: 'Por setor', sub: 'Lote rápido (1 toque por cavalo)', icon: 'menu' },
  ];
  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title="Registrar" subtitle="Escolha o fluxo" onBack={() => setScreen('home')} />
      <div style={{ padding: '14px 20px 0' }}>
        {opcoes.map(o => (
          <button key={o.id} onClick={() => setFluxo(o.id)} style={{
            width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 16, padding: '18px', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', color: 'var(--ink)',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'var(--accent-soft)', color: 'var(--accent)',
              display: 'grid', placeItems: 'center',
            }}>
              <Icon name={o.icon} size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)' }}>{o.titulo}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{o.sub}</div>
            </div>
            <Icon name="chevron-right" size={16} color="var(--ink-3)" />
          </button>
        ))}
      </div>
    </div>
  );
};

export { RegistrarHub, RegistrarPorCavalo, RegistrarPorInsumo, RegistrarPorSetor };
