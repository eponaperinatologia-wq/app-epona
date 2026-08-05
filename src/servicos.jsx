// servicos.jsx — Cadastro e registro de serviços/procedimentos veterinários e transporte
import React, { useState } from 'react';
import { Icon } from './icons';
import {
  CAVALOS, INSUMOS, CATEGORIAS_INSUMOS, CATEGORIAS_SERVICOS,
  getInsumo, formatBRL, norm,
} from './data';
import { TopBar, HorseAvatar } from './screens';
import { dataParaMesDestino } from './register';

// ─────────────────────────────────────────────────────────────
// CADASTRO DE SERVIÇOS
// ─────────────────────────────────────────────────────────────
const CadServicosScreen = ({ setScreen, servicos, addServico, updateServico, setSelected, deleteServico, insumos: insumosProp = [] }) => {
  const [catFilter, setCatFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [busca, setBusca] = useState('');

  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('veterinario');
  const [descartaveis, setDescartaveis] = useState([]);
  const [descSearch, setDescSearch] = useState('');

  const insumosBase = insumosProp.length > 0 ? insumosProp : INSUMOS;
  const lista = (catFilter === 'all' ? servicos : servicos.filter(s => s.categoria === catFilter))
    .filter(s => !busca.trim() || norm(s.nome || '').includes(norm(busca.trim())))
    .slice()
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));
  const descartaveisDisp = insumosBase.filter(i => i.categoria === 'descartavel')
    .filter(i => !descSearch || norm(i.nome).includes(norm(descSearch)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

  const openAdd = () => {
    setEditId(null);
    setNome(''); setValor(''); setCategoria('veterinario'); setDescartaveis([]);
    setShowForm(true);
  };

  const openEdit = (sv) => {
    setEditId(sv.id);
    setNome(sv.nome); setValor(String(sv.valor)); setCategoria(sv.categoria);
    setDescartaveis(sv.descartaveisObrigatorios || []);
    setShowForm(true);
  };

  const handleSave = () => {
    const data = {
      nome: nome.trim(),
      valor: parseFloat(valor) || 0,
      categoria,
      descartaveisObrigatorios: descartaveis,
    };
    if (editId) {
      updateServico(editId, data);
    } else {
      addServico(data);
    }
    setShowForm(false);
  };

  const toggleDescartavel = (insumoId) => {
    setDescartaveis(prev => {
      const exists = prev.find(d => d.insumoId === insumoId);
      if (exists) return prev.filter(d => d.insumoId !== insumoId);
      return [...prev, { insumoId, qtd: 1 }];
    });
  };

  const updateQtdDescartavel = (insumoId, qtd) => {
    setDescartaveis(prev => prev.map(d => d.insumoId === insumoId ? { ...d, qtd: Math.max(1, qtd) } : d));
  };

  if (showForm) {
    return (
      <div style={{ paddingBottom: 90 }}>
        <TopBar
          title={editId ? 'Editar serviço' : 'Novo serviço'}
          onBack={() => setShowForm(false)}
        />
        <div style={{ padding: '14px 20px 0' }}>
          {/* Nome */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Nome</div>
            <input
              value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Ex: Soroterapia"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
                padding: '12px 14px', fontSize: 15, color: 'var(--ink)',
                fontFamily: 'var(--sans)', outline: 'none',
              }}
            />
          </div>

          {/* Categoria */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Categoria</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {CATEGORIAS_SERVICOS.map(c => (
                <button key={c.id} onClick={() => setCategoria(c.id)} style={{
                  flex: 1, padding: '10px', borderRadius: 12,
                  border: `1px solid ${categoria === c.id ? c.cor : 'var(--line)'}`,
                  background: categoria === c.id ? c.cor : 'var(--card)',
                  color: categoria === c.id ? '#fff' : 'var(--ink-2)',
                  fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
                }}>{c.nome}</button>
              ))}
            </div>
          </div>

          {/* Valor */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Valor do serviço (R$)</div>
            <input
              value={valor} onChange={e => setValor(e.target.value)}
              placeholder="0,00" type="number" min="0" step="0.01"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
                padding: '12px 14px', fontSize: 15, color: 'var(--ink)',
                fontFamily: 'var(--sans)', outline: 'none',
              }}
            />
          </div>

          {/* Descartáveis obrigatórios */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Descartáveis obrigatórios
            </div>
            {descartaveis.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {descartaveis.map(d => {
                  const ins = insumosBase.find(i => i.id === d.insumoId);
                  return (
                    <div key={d.insumoId} style={{
                      background: 'var(--accent-soft)', border: '1px solid var(--accent)',
                      borderRadius: 10, padding: '8px 12px', marginBottom: 6,
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <div style={{ flex: 1, fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{ins?.nome}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => updateQtdDescartavel(d.insumoId, d.qtd - 1)} style={{
                          width: 26, height: 26, borderRadius: 8, border: '1px solid var(--line)',
                          background: 'var(--card)', display: 'grid', placeItems: 'center', color: 'var(--ink)',
                        }}>−</button>
                        <span style={{ fontSize: 13, minWidth: 18, textAlign: 'center' }}>{d.qtd}</span>
                        <button onClick={() => updateQtdDescartavel(d.insumoId, d.qtd + 1)} style={{
                          width: 26, height: 26, borderRadius: 8, border: '1px solid var(--line)',
                          background: 'var(--card)', display: 'grid', placeItems: 'center', color: 'var(--ink)',
                        }}>+</button>
                      </div>
                      <button onClick={() => toggleDescartavel(d.insumoId)} style={{
                        background: 'transparent', border: 'none', color: '#dc2626', fontSize: 16, cursor: 'pointer',
                      }}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{
              background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
              padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
            }}>
              <Icon name="search" size={14} color="var(--ink-3)" />
              <input value={descSearch} onChange={e => setDescSearch(e.target.value)}
                placeholder="Buscar descartável..."
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--ink)' }}
              />
            </div>
            {descartaveisDisp.map(i => {
              const sel = !!descartaveis.find(d => d.insumoId === i.id);
              return (
                <button key={i.id} onClick={() => toggleDescartavel(i.id)} style={{
                  width: '100%', background: sel ? 'var(--accent-soft)' : 'var(--soft)',
                  border: `1px solid ${sel ? 'var(--accent)' : 'var(--line)'}`,
                  borderRadius: 10, padding: '8px 12px', marginBottom: 4,
                  display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', color: 'var(--ink)',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 5,
                    border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--line-2)'}`,
                    background: sel ? 'var(--accent)' : 'transparent',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    {sel && <Icon name="check" size={12} color="#fff" />}
                  </div>
                  <span style={{ fontSize: 13, flex: 1 }}>{i.nome}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '12px 20px 0', display: 'flex', gap: 8 }}>
          <button onClick={() => setShowForm(false)} style={{
            flex: 1, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
            padding: '14px', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500, color: 'var(--ink-2)',
          }}>Cancelar</button>
          <button onClick={handleSave} disabled={!nome.trim()} style={{
            flex: 2, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 14,
            padding: '14px', fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
            opacity: nome.trim() ? 1 : 0.5,
          }}>Salvar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar
        title="Serviços"
        subtitle="Procedimentos e transporte"
        onBack={() => setScreen('cadastros')}
        action={
          <button onClick={openAdd} style={{
            width: 36, height: 36, borderRadius: 12, background: 'var(--accent)',
            display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer',
          }}>
            <Icon name="plus" size={18} color="#fff" />
          </button>
        }
      />

      {/* Busca */}
      <div style={{ padding: '12px 20px 4px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--card)', border: '1px solid var(--line)',
          borderRadius: 12, padding: '9px 14px',
        }}>
          <Icon name="search" size={16} color="var(--ink-3)" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar serviço…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)',
            }}
          />
          {busca && (
            <button onClick={() => setBusca('')} style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--ink-3)', fontSize: 16, lineHeight: 1,
            }}>×</button>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div style={{ padding: '8px 20px 4px', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[{ id: 'all', nome: 'Todos', cor: '#3d6043' }, ...CATEGORIAS_SERVICOS].map(c => (
          <button key={c.id} onClick={() => setCatFilter(c.id)} style={{
            padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
            border: `1px solid ${catFilter === c.id ? c.cor : 'var(--line)'}`,
            background: catFilter === c.id ? c.cor : 'var(--card)',
            color: catFilter === c.id ? '#fff' : 'var(--ink-2)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>{c.nome}</button>
        ))}
      </div>

      <div style={{ padding: '8px 20px 0' }}>
        {lista.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)', fontSize: 14 }}>
            {busca ? 'Nenhum serviço encontrado.' : 'Nenhum serviço cadastrado ainda.'}
          </div>
        )}
        {lista.map(sv => {
          const cat = CATEGORIAS_SERVICOS.find(c => c.id === sv.categoria);
          const nDesc = sv.descartaveisObrigatorios?.length || 0;
          return (
            <div key={sv.id} style={{
              background: 'var(--card)', border: '1px solid var(--line)',
              borderRadius: 14, marginBottom: 8,
              display: 'flex', alignItems: 'stretch', overflow: 'hidden',
            }}>
              <button onClick={() => openEdit(sv)} style={{
                flex: 1, padding: '14px',
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: 'var(--ink)',
                background: 'transparent', border: 'none',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: (cat?.cor || '#888') + '18', color: cat?.cor || '#888',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <Icon name="stethoscope" size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{sv.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                    {formatBRL(sv.valor)}
                    {nDesc > 0 ? ` · ${nDesc} descartável(is) obrigatório(s)` : ''}
                  </div>
                </div>
                <div style={{
                  fontSize: 11, background: (cat?.cor || '#888') + '18',
                  color: cat?.cor || '#888', borderRadius: 6, padding: '3px 8px', fontWeight: 600,
                }}>{cat?.nome}</div>
              </button>
              {deleteServico && (
                <button
                  onClick={() => { if (window.confirm(`Excluir "${sv.nome}"?`)) deleteServico(sv.id); }}
                  style={{
                    width: 48, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: 'none', borderLeft: '1px solid var(--line)',
                    color: '#dc2626',
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
// REGISTRAR PROCEDIMENTO
// ─────────────────────────────────────────────────────────────

const EXAMES_LAB_ID = '__exames_lab__';
const SV_EXAMES = { id: EXAMES_LAB_ID, nome: 'Exames Laboratoriais', categoria: 'exames', valor: 0, descartaveisObrigatorios: [] };

const RegistrarProcedimentoScreen = ({ setScreen, servicos, cavalos = CAVALOS, insumos = INSUMOS, addProcedimento, addAtividade, mesDestino }) => {
  const [step, setStep] = useState('cavalo'); // cavalo → servico → exames → confirmar
  const [cavaloId, setCavaloId] = useState(null);
  const [servicoId, setServicoId] = useState(null);
  const [catFilter, setCatFilter] = useState('all');
  const [searchCav, setSearchCav] = useState('');
  const [searchSv, setSearchSv] = useState('');
  const [insumosAdicionais, setInsumosAdicionais] = useState([]);
  const [insSearch, setInsSearch] = useState('');
  const [motoboy, setMotoboy] = useState(false);
  const [motoboyValor, setMotoboyValor] = useState('');
  const [motoboyNome, setMotoboyNome] = useState('');
  const [laboratorio, setLaboratorio] = useState('');
  const [examesSelecionados, setExamesSelecionados] = useState([]);
  const [toast, setToast] = useState(null);

  const cav = cavaloId ? cavalos.find(c => c.id === cavaloId) : null;
  const sv = servicoId === EXAMES_LAB_ID
    ? SV_EXAMES
    : (servicoId ? servicos.find(s => s.id === servicoId) : null);
  const cat = sv ? CATEGORIAS_SERVICOS.find(c => c.id === sv.categoria) : null;

  const cavalosFiltered = cavalos.filter(c =>
    norm(c.nome).includes(norm(searchCav)) ||
    norm(c.baia).includes(norm(searchCav))
  ).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

  const servicosFiltered = (catFilter === 'all' ? servicos : servicos.filter(s => s.categoria === catFilter))
    .filter(s => s.categoria !== 'exames')
    .filter(s => !searchSv || norm(s.nome).includes(norm(searchSv)));

  const [insCatFilter, setInsCatFilter] = useState('all');
  const insumosDisp = (insCatFilter === 'all' ? insumos : insumos.filter(i => i.categoria === insCatFilter))
    .filter(i => i.categoria !== 'veterinario' && i.categoria !== 'transporte')
    .filter(i => !insSearch || norm(i.nome).includes(norm(insSearch)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

  const toggleInsumoAdicional = (id) => {
    setInsumosAdicionais(prev => {
      const exists = prev.find(a => a.insumoId === id);
      if (exists) return prev.filter(a => a.insumoId !== id);
      return [...prev, { insumoId: id, qtd: 1 }];
    });
  };

  const updateQtdAdicional = (id, qtd) => {
    setInsumosAdicionais(prev => prev.map(a => a.insumoId === id ? { ...a, qtd: Math.max(1, qtd) } : a));
  };

  const getMergedDescartaveis = () =>
    examesSelecionados.reduce((acc, e) => {
      (e.descartaveisObrigatorios || []).forEach(d => {
        if (!acc.find(x => x.insumoId === d.insumoId)) acc.push({ ...d });
      });
      return acc;
    }, []);

  const calcTotal = () => {
    if (!sv) return 0;
    let total = 0;
    if (sv.categoria === 'exames') {
      examesSelecionados.forEach(e => { total += e.valor || 0; });
      getMergedDescartaveis().forEach(d => {
        const ins = insumos.find(i => i.id === d.insumoId) || getInsumo(d.insumoId);
        total += (ins?.valorVenda || ins?.valor || 0) * d.qtd;
      });
    } else {
      total = sv.valor;
      sv.descartaveisObrigatorios?.forEach(d => {
        const ins = insumos.find(i => i.id === d.insumoId) || getInsumo(d.insumoId);
        total += (ins?.valorVenda || ins?.valor || 0) * d.qtd;
      });
    }
    insumosAdicionais.forEach(a => {
      const ins = insumos.find(i => i.id === a.insumoId) || getInsumo(a.insumoId);
      total += (ins?.valorVenda || ins?.valor || 0) * a.qtd;
    });
    if (motoboy && motoboyValor) total += parseFloat(motoboyValor) || 0;
    return total;
  };

  const confirmar = () => {
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const { data, mes } = dataParaMesDestino(mesDestino);
    addProcedimento({
      cavaloId, servicoId,
      valorServico: sv.categoria === 'exames' ? 0 : sv.valor,
      descartaveisObrigatorios: sv.categoria === 'exames' ? getMergedDescartaveis() : sv.descartaveisObrigatorios || [],
      insumosAdicionais,
      motoboy: motoboy ? { ativo: true, valor: parseFloat(motoboyValor) || 0, nome: motoboyNome.trim() } : { ativo: false, valor: 0, nome: '' },
      laboratorio: sv?.categoria === 'exames' ? laboratorio.trim() : '',
      tubosSelecionados: [],
      examesSelecionados: sv?.categoria === 'exames' ? examesSelecionados : [],
      total: calcTotal(),
      hora, data,
    });
    if (addAtividade) {
      const linhasTexto = [
        `${cav.nome} · ${sv.nome}`,
        sv.categoria === 'exames' && laboratorio ? `Laboratório: ${laboratorio}` : null,
        sv.categoria === 'exames' && examesSelecionados.length
          ? `Exames:\n${examesSelecionados.map(e => `  • ${e.nome}`).join('\n')}`
          : null,
        insumosAdicionais.length
          ? `Insumos: ${insumosAdicionais.map(a => { const ins = insumos.find(i => i.id === a.insumoId); return `${ins?.nome || a.insumoId} ×${a.qtd}`; }).join(', ')}`
          : null,
        motoboy && motoboyValor ? `Motoboy: ${motoboyNome || '—'} (R$ ${parseFloat(motoboyValor).toFixed(2).replace('.', ',')})` : null,
        `Total: R$ ${calcTotal().toFixed(2).replace('.', ',')}`,
      ].filter(Boolean).join('\n');
      addAtividade({
        id: 'at_' + Date.now(), tipo: 'procedimento',
        cavaloId, texto: linhasTexto,
        data, hora, mes,
      });
    }
    setToast(`${cav.nome} · ${sv.nome} registrado`);
    setTimeout(() => setScreen('home'), 1400);
  };

  const toggleExame = (exame) => {
    setExamesSelecionados(prev => prev.find(e => e.id === exame.id) ? prev.filter(e => e.id !== exame.id) : [...prev, exame]);
  };

  // ── Step 1: Cavalo ──
  if (step === 'cavalo') {
    return (
      <div style={{ paddingBottom: 90 }}>
        <TopBar title="Qual cavalo?" subtitle="Passo 1 de 3" onBack={() => setScreen('home')} />
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon name="search" size={16} color="var(--ink-3)" />
            <input value={searchCav} onChange={e => setSearchCav(e.target.value)} placeholder="Nome ou baia"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)' }} />
          </div>
        </div>
        <div style={{ padding: '12px 20px 0' }}>
          {cavalosFiltered.map(c => (
            <button key={c.id} onClick={() => { setCavaloId(c.id); setStep('servico'); }} style={{
              width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '12px', marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: 'var(--ink)',
            }}>
              <HorseAvatar cavalo={c} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{c.nome}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>{c.baia}</span>
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

  // ── Step 2: Serviço ──
  if (step === 'servico') {
    return (
      <div style={{ paddingBottom: 90 }}>
        <TopBar title="Qual procedimento?" subtitle={`Para ${cav?.nome} · passo 2 de 3`} onBack={() => setStep('cavalo')} />
        {/* cavalo badge */}
        <div style={{ padding: '8px 20px 0' }}>
          <div style={{
            background: 'var(--accent-soft)', borderRadius: 12, padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--accent)20',
          }}>
            <HorseAvatar cavalo={cav} size={28} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{cav?.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{cav?.baia}</div>
            </div>
            <button onClick={() => setStep('cavalo')} style={{ fontSize: 11, background: 'transparent', border: 'none', color: 'var(--accent)', fontWeight: 600 }}>Trocar</button>
          </div>
        </div>
        {/* search */}
        <div style={{ padding: '8px 20px 0' }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon name="search" size={16} color="var(--ink-3)" />
            <input value={searchSv} onChange={e => setSearchSv(e.target.value)} placeholder="Buscar procedimento..."
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)' }} />
          </div>
        </div>
        {/* category chips */}
        <div style={{ padding: '8px 20px 4px', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { id: 'all',          nome: 'Todos',       cor: '#3d6043' },
            { id: 'veterinario',  nome: 'Veterinário', cor: '#0f766e' },
            { id: 'exames',       nome: 'Exames',      cor: '#7c3aed', nav: true },
            { id: 'transporte',   nome: 'Transporte',  cor: '#1e40af' },
          ].map(c => (
            <button
              key={c.id}
              onClick={() => c.nav
                ? (setServicoId(EXAMES_LAB_ID), setLaboratorio(''), setExamesSelecionados([]), setMotoboy(false), setMotoboyValor(''), setMotoboyNome(''), setStep('exames'))
                : setCatFilter(c.id)
              }
              style={{
                padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                border: `1px solid ${!c.nav && catFilter === c.id ? c.cor : 'var(--line)'}`,
                background: !c.nav && catFilter === c.id ? c.cor : 'var(--card)',
                color: !c.nav && catFilter === c.id ? '#fff' : 'var(--ink-2)',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >{c.nome}</button>
          ))}
        </div>
        <div style={{ padding: '8px 20px 0' }}>
          {servicosFiltered.map(sv => {
            const c = CATEGORIAS_SERVICOS.find(x => x.id === sv.categoria);
            const nDesc = sv.descartaveisObrigatorios?.length || 0;
            return (
              <button key={sv.id} onClick={() => { setServicoId(sv.id); setLaboratorio(''); setExamesSelecionados([]); setStep('confirmar'); }} style={{
                width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
                borderRadius: 12, padding: '12px', marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: 'var(--ink)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: (c?.cor || '#888') + '18', color: c?.cor || '#888',
                  display: 'grid', placeItems: 'center',
                }}>
                  <Icon name="stethoscope" size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{sv.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
                    {formatBRL(sv.valor)}{nDesc > 0 ? ` · ${nDesc} desc. obrigatório(s)` : ''}
                  </div>
                </div>
                <Icon name="chevron-right" size={16} color="var(--ink-3)" />
              </button>
            );
          })}
          {servicosFiltered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink-3)', fontSize: 14 }}>
              Nenhum serviço encontrado.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Step exames: Selecionar exames ──
  if (step === 'exames') {
    const examServicos = servicos.filter(s => s.categoria === 'exames');
    return (
      <div style={{ paddingBottom: 100 }}>
        <TopBar title="Exames Laboratoriais" subtitle={`Para ${cav?.nome}`} onBack={() => setStep('servico')} />
        <div style={{ padding: '8px 20px 0' }}>
          <div style={{
            background: 'var(--accent-soft)', borderRadius: 12, padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--accent)20',
          }}>
            <HorseAvatar cavalo={cav} size={28} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{cav?.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{cav?.baia}</div>
            </div>
            <button onClick={() => setStep('cavalo')} style={{ fontSize: 11, background: 'transparent', border: 'none', color: 'var(--accent)', fontWeight: 600 }}>Trocar</button>
          </div>
        </div>
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Selecione os exames a realizar
          </div>
          {examServicos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink-3)', fontSize: 14 }}>
              Nenhum exame cadastrado.{'\n'}Adicione em Cadastros → Serviços.
            </div>
          )}
          {examServicos.map(ex => {
            const sel = examesSelecionados.find(e => e.id === ex.id);
            return (
              <button key={ex.id} onClick={() => toggleExame(ex)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', marginBottom: 6,
                background: sel ? '#7c3aed0d' : 'var(--card)',
                border: `1.5px solid ${sel ? '#7c3aed' : 'var(--line)'}`,
                borderRadius: 12, textAlign: 'left', color: 'var(--ink)',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6,
                  border: `1.5px solid ${sel ? '#7c3aed' : 'var(--line-2)'}`,
                  background: sel ? '#7c3aed' : 'transparent',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  {sel && <Icon name="check" size={13} color="#fff" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{ex.nome}</div>
                  {ex.descartaveisObrigatorios?.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
                      {ex.descartaveisObrigatorios.length} insumo{ex.descartaveisObrigatorios.length > 1 ? 's' : ''} incluso{ex.descartaveisObrigatorios.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 15, color: sel ? '#7c3aed' : 'var(--ink-3)' }}>
                  {formatBRL(ex.valor)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Motoboy */}
        <div style={{ padding: '0 20px 12px' }}>
          <div style={{
            background: 'var(--card)', border: `1px solid ${motoboy ? '#1e40af' : 'var(--line)'}`,
            borderRadius: 14, padding: '14px',
          }}>
            <button onClick={() => setMotoboy(v => !v)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              background: 'transparent', border: 'none', color: 'var(--ink)', textAlign: 'left',
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: motoboy ? '#1e40af18' : 'var(--soft)',
                color: motoboy ? '#1e40af' : 'var(--ink-3)',
                display: 'grid', placeItems: 'center',
              }}>
                <Icon name="truck" size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Motoboy / Transporte</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Houve necessidade de motoboy?</div>
              </div>
              <div style={{
                width: 26, height: 26, borderRadius: 8,
                border: `1.5px solid ${motoboy ? '#1e40af' : 'var(--line-2)'}`,
                background: motoboy ? '#1e40af' : 'transparent',
                display: 'grid', placeItems: 'center',
              }}>
                {motoboy && <Icon name="check" size={14} color="#fff" />}
              </div>
            </button>
            {motoboy && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Nome do motoboy</div>
                <input
                  value={motoboyNome} onChange={e => setMotoboyNome(e.target.value)}
                  placeholder="Ex: José"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--soft)', border: '1px solid #1e40af40', borderRadius: 10,
                    padding: '10px 12px', fontSize: 15, color: 'var(--ink)',
                    fontFamily: 'var(--sans)', outline: 'none', marginBottom: 10,
                  }}
                />
                <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Valor do motoboy (R$)</div>
                <input
                  value={motoboyValor} onChange={e => setMotoboyValor(e.target.value)}
                  placeholder="0,00" type="number" min="0" step="0.01"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--soft)', border: '1px solid #1e40af40', borderRadius: 10,
                    padding: '10px 12px', fontSize: 15, color: 'var(--ink)',
                    fontFamily: 'var(--sans)', outline: 'none',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ position: 'fixed', bottom: 90, left: 20, right: 20, display: 'flex', gap: 8, zIndex: 10 }}>
          <button onClick={() => setStep('servico')} style={{
            flex: 1, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
            padding: '14px', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500, color: 'var(--ink-2)',
          }}>Voltar</button>
          <button onClick={() => setStep('confirmar')} disabled={examesSelecionados.length === 0} style={{
            flex: 2, background: examesSelecionados.length > 0 ? '#7c3aed' : 'var(--line)',
            color: examesSelecionados.length > 0 ? '#fff' : 'var(--ink-3)',
            border: 'none', borderRadius: 14, padding: '14px',
            fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {examesSelecionados.length > 0
              ? <><Icon name="check" size={18} color="#fff" />Confirmar ({examesSelecionados.length} exame{examesSelecionados.length > 1 ? 's' : ''})</>
              : 'Selecione ao menos 1'}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Confirmar ──
  const descObrig = sv?.descartaveisObrigatorios || [];
  const insDisp = insumosDisp;

  return (
    <div style={{ paddingBottom: 100, position: 'relative' }}>
      <TopBar title="Confirmar" subtitle="Passo 3 de 3" onBack={() => setStep(sv?.categoria === 'exames' ? 'exames' : 'servico')} />

      <div style={{ padding: '16px 20px 0' }}>
        {/* Serviço card */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: '16px', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
            <HorseAvatar cavalo={cav} size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)' }}>{cav?.nome}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Baia {cav?.baia}</div>
            </div>
          </div>
          <div style={{ paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9,
                background: (cat?.cor || '#888') + '18', color: cat?.cor || '#888',
                display: 'grid', placeItems: 'center',
              }}>
                <Icon name="stethoscope" size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>{sv?.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{cat?.nome}</div>
              </div>
              {sv?.categoria !== 'exames' && (
                <span style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)' }}>{formatBRL(sv?.valor || 0)}</span>
              )}
            </div>
          </div>

          {/* Descartáveis — agrupados para exames, fixos para outros */}
          {sv?.categoria === 'exames' ? (
            getMergedDescartaveis().length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                  Descartáveis (agrupados)
                </div>
                {getMergedDescartaveis().map(d => {
                  const ins = insumos.find(i => i.id === d.insumoId) || getInsumo(d.insumoId);
                  return (
                    <div key={d.insumoId} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontSize: 13, color: 'var(--ink-2)', padding: '3px 0',
                    }}>
                      <span>• {ins?.nome} ×{d.qtd}</span>
                      <span>{formatBRL((ins?.valorVenda || ins?.valor || 0) * d.qtd)}</span>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            descObrig.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                  Descartáveis inclusos
                </div>
                {descObrig.map(d => {
                  const ins = insumos.find(i => i.id === d.insumoId) || getInsumo(d.insumoId);
                  return (
                    <div key={d.insumoId} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontSize: 13, color: 'var(--ink-2)', padding: '3px 0',
                    }}>
                      <span>• {ins?.nome} ×{d.qtd}</span>
                      <span>{formatBRL((ins?.valorVenda || ins?.valor || 0) * d.qtd)}</span>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Laboratório (para Exames Laboratoriais) */}
        {sv?.categoria === 'exames' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Laboratório</div>
            <input
              value={laboratorio} onChange={e => setLaboratorio(e.target.value)}
              placeholder="Nome do laboratório"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 10,
                padding: '10px 12px', fontSize: 15, color: 'var(--ink)',
                fontFamily: 'var(--sans)', outline: 'none',
              }}
            />
          </div>
        )}

        {/* Exames a realizar — multi-seleção a partir dos serviços cadastrados */}
        {sv?.categoria === 'exames' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Exames a realizar</div>
            {servicos.filter(s => s.categoria === 'exames').length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', padding: '8px 0' }}>
                Nenhum exame cadastrado. Adicione em Cadastros → Serviços.
              </div>
            )}
            {servicos.filter(s => s.categoria === 'exames').map(ex => {
              const sel = examesSelecionados.find(e => e.id === ex.id);
              return (
                <button key={ex.id} onClick={() => toggleExame(ex)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', marginBottom: 4,
                  background: sel ? 'var(--accent-soft)' : 'var(--soft)',
                  border: `1px solid ${sel ? 'var(--accent)' : 'var(--line)'}`,
                  borderRadius: 10, textAlign: 'left', color: 'var(--ink)',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--line-2)'}`,
                    background: sel ? 'var(--accent)' : 'transparent',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    {sel && <Icon name="check" size={12} color="#fff" />}
                  </div>
                  <span style={{ flex: 1, fontSize: 13 }}>{ex.nome}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{formatBRL(ex.valor)}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Insumos adicionais */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Insumos adicionais utilizados
          </div>
          {insumosAdicionais.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {insumosAdicionais.map(a => {
                const ins = insumos.find(i => i.id === a.insumoId) || getInsumo(a.insumoId);
                return (
                  <div key={a.insumoId} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'var(--accent-soft)', border: '1px solid var(--accent)',
                    borderRadius: 10, padding: '6px 10px', marginBottom: 4,
                  }}>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{ins?.nome}</span>
                    <button onClick={() => updateQtdAdicional(a.insumoId, a.qtd - 1)} style={{
                      width: 24, height: 24, borderRadius: 6, border: '1px solid var(--line)',
                      background: 'var(--card)', display: 'grid', placeItems: 'center', fontSize: 14,
                    }}>−</button>
                    <span style={{ fontSize: 13, minWidth: 16, textAlign: 'center' }}>{a.qtd}</span>
                    <button onClick={() => updateQtdAdicional(a.insumoId, a.qtd + 1)} style={{
                      width: 24, height: 24, borderRadius: 6, border: '1px solid var(--line)',
                      background: 'var(--card)', display: 'grid', placeItems: 'center', fontSize: 14,
                    }}>+</button>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)', minWidth: 20 }}>{ins?.unidade || 'un'}</span>
                    <button onClick={() => toggleInsumoAdicional(a.insumoId)} style={{
                      background: 'transparent', border: 'none', color: '#dc2626', fontSize: 15,
                    }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{
            background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 10,
            padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
          }}>
            <Icon name="search" size={14} color="var(--ink-3)" />
            <input value={insSearch} onChange={e => setInsSearch(e.target.value)}
              placeholder="Buscar insumo..."
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--ink)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 8, paddingBottom: 2 }}>
            {[{ id: 'all', nome: 'Todos', cor: '#3d6043' }, ...CATEGORIAS_INSUMOS].map(c => (
              <button key={c.id} onClick={() => setInsCatFilter(c.id)} style={{
                padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                border: `1px solid ${insCatFilter === c.id ? c.cor : 'var(--line)'}`,
                background: insCatFilter === c.id ? c.cor : 'var(--soft)',
                color: insCatFilter === c.id ? '#fff' : 'var(--ink-2)',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>{c.nome}</button>
            ))}
          </div>
          <div style={{ maxHeight: 160, overflowY: 'auto' }}>
            {insDisp.map(i => {
                const sel = !!insumosAdicionais.find(a => a.insumoId === i.id);
                return (
                  <button key={i.id} onClick={() => toggleInsumoAdicional(i.id)} style={{
                    width: '100%', background: sel ? 'var(--accent-soft)' : 'var(--soft)',
                    border: `1px solid ${sel ? 'var(--accent)' : 'var(--line)'}`,
                    borderRadius: 9, padding: '7px 10px', marginBottom: 3,
                    display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', color: 'var(--ink)',
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 4,
                      border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--line-2)'}`,
                      background: sel ? 'var(--accent)' : 'transparent',
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                    }}>
                      {sel && <Icon name="check" size={11} color="#fff" />}
                    </div>
                    <span style={{ fontSize: 13, flex: 1 }}>{i.nome}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{formatBRL(i.valorVenda || i.valor || 0)}/{i.unidade}</span>
                  </button>
                );
              })}
            </div>
        </div>

        {/* Motoboy */}
        <div style={{
          background: 'var(--card)', border: `1px solid ${motoboy ? '#1e40af' : 'var(--line)'}`,
          borderRadius: 14, padding: '14px', marginBottom: 12,
        }}>
          <button onClick={() => setMotoboy(v => !v)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            background: 'transparent', border: 'none', color: 'var(--ink)', textAlign: 'left',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: motoboy ? '#1e40af18' : 'var(--soft)',
              color: motoboy ? '#1e40af' : 'var(--ink-3)',
              display: 'grid', placeItems: 'center',
            }}>
              <Icon name="truck" size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Motoboy / Transporte</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Houve necessidade de motoboy?</div>
            </div>
            <div style={{
              width: 26, height: 26, borderRadius: 8,
              border: `1.5px solid ${motoboy ? '#1e40af' : 'var(--line-2)'}`,
              background: motoboy ? '#1e40af' : 'transparent',
              display: 'grid', placeItems: 'center',
            }}>
              {motoboy && <Icon name="check" size={14} color="#fff" />}
            </div>
          </button>
          {motoboy && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Nome do motoboy</div>
              <input
                value={motoboyNome} onChange={e => setMotoboyNome(e.target.value)}
                placeholder="Ex: José"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--soft)', border: '1px solid #1e40af40', borderRadius: 10,
                  padding: '10px 12px', fontSize: 15, color: 'var(--ink)',
                  fontFamily: 'var(--sans)', outline: 'none', marginBottom: 10,
                }}
              />
              <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Valor do motoboy (R$)</div>
              <input
                value={motoboyValor} onChange={e => setMotoboyValor(e.target.value)}
                placeholder="0,00" type="number" min="0" step="0.01"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--soft)', border: '1px solid #1e40af40', borderRadius: 10,
                  padding: '10px 12px', fontSize: 15, color: 'var(--ink)',
                  fontFamily: 'var(--sans)', outline: 'none',
                }}
              />
            </div>
          )}
        </div>

        {/* Total */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 80,
        }}>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Total</span>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--ink)' }}>{formatBRL(calcTotal())}</span>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 90, left: 20, right: 20, display: 'flex', gap: 8, zIndex: 10 }}>
        <button onClick={() => setScreen('home')} style={{
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
          Registrar procedimento
        </button>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: 20, right: 20,
          background: 'var(--ink)', color: '#fff', borderRadius: 12,
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
          boxShadow: '0 12px 30px rgba(0,0,0,0.25)', zIndex: 30,
        }}>
          <div style={{ width: 22, height: 22, borderRadius: 22, background: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
            <Icon name="check" size={14} color="#fff" />
          </div>
          {toast}
        </div>
      )}
    </div>
  );
};

export { CadServicosScreen, RegistrarProcedimentoScreen };
