// extra-screens.jsx — Avisos, Movimentação (entrada/saída) e Novo Cavalo
const { useState: useStateE } = React;

// ─────────────────────────────────────────────────────────────
// AVISOS · Mural compartilhado
// ─────────────────────────────────────────────────────────────
const AvisosScreen = ({ setScreen, avisos, addAviso, addAtividade }) => {
  const [novo, setNovo] = useStateE('');
  const [urgente, setUrgente] = useStateE(false);

  const enviar = () => {
    if (!novo.trim()) return;
    addAviso({
      id: 'a' + Date.now(),
      autor: 'João T.', avatar: 'JT',
      tempo: 'agora', texto: novo.trim(), urgente,
    });
    addAtividade && addAtividade({
      id: 'at' + Date.now(), tipo: 'aviso',
      data: '2026-05-04', hora: new Date().toTimeString().slice(0, 5),
      autor: 'João T.', texto: novo.trim(), urgente,
    });
    setNovo(''); setUrgente(false);
  };

  return (
    <div style={{ paddingBottom: 90, position: 'relative' }}>
      <TopBar title="Avisos" subtitle="Mural compartilhado · todos veem" onBack={() => setScreen('home')} />

      {/* Composer */}
      <div style={{ padding: '12px 20px 0' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
          padding: '12px',
        }}>
          <textarea
            value={novo} onChange={e => setNovo(e.target.value)}
            placeholder="Postar um aviso para a equipe…"
            style={{
              width: '100%', minHeight: 60, border: 'none', outline: 'none',
              background: 'transparent', resize: 'none', fontSize: 14,
              color: 'var(--ink)', fontFamily: 'var(--sans)',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <button onClick={() => setUrgente(!urgente)} style={{
              padding: '6px 10px', borderRadius: 8,
              background: urgente ? '#fef2e8' : 'var(--soft)',
              color: urgente ? '#c0392b' : 'var(--ink-3)',
              border: '1px solid ' + (urgente ? '#f5d4be' : 'var(--line)'),
              fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Icon name="flame" size={12} color={urgente ? '#c0392b' : 'var(--ink-3)'} />
              URGENTE
            </button>
            <div style={{ flex: 1, fontSize: 11, color: 'var(--ink-3)' }}>
              {urgente && 'Notifica todos imediatamente'}
            </div>
            <button onClick={enviar} disabled={!novo.trim()} style={{
              padding: '8px 14px', borderRadius: 10,
              background: novo.trim() ? 'var(--accent)' : 'var(--soft)',
              color: novo.trim() ? '#fff' : 'var(--ink-3)',
              border: 'none', fontSize: 13, fontWeight: 600,
            }}>Postar</button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div style={{ padding: '14px 20px 0' }}>
        {avisos.map(a => {
          const cav = a.cavaloId && getCavalo(a.cavaloId);
          return (
            <div key={a.id} style={{
              background: 'var(--card)', border: '1px solid ' + (a.urgente ? '#f5d4be' : 'var(--line)'),
              borderRadius: 14, padding: '14px', marginBottom: 8,
              boxShadow: a.urgente ? '0 0 0 1px #fef2e8' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 36, flexShrink: 0,
                  background: a.urgente ? '#fef2e8' : 'var(--accent-soft)',
                  color: a.urgente ? '#c0392b' : 'var(--accent)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>{a.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{a.autor}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>· {a.tempo}</span>
                    {a.urgente && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#c0392b', color: '#fff', fontWeight: 700, letterSpacing: '0.06em' }}>URGENTE</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 4, lineHeight: 1.45 }}>{a.texto}</div>
                  {cav && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8,
                      padding: '4px 8px', borderRadius: 8, background: 'var(--soft)',
                      fontSize: 11, color: 'var(--ink-2)',
                    }}>
                      <HorseAvatar cavalo={cav} size={18} />
                      {cav.nome} · {cav.baia}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MOVIMENTAÇÃO · Entrada/Saída de animais
// ─────────────────────────────────────────────────────────────
const MovimentacaoScreen = ({ setScreen, addMovimentacao, addAtividade, cavalos, proprietarios = PROPRIETARIOS, novoCavaloPendente, setNovoCavaloPendente, setPendingEntradaCavalo }) => {
  const [tipo, setTipo] = useStateE('saida');
  const [cavaloId, setCavaloId] = useStateE(null);
  const [data, setData] = useStateE('2026-05-04');
  const [motivo, setMotivo] = useStateE('');
  const [search, setSearch] = useStateE('');
  const [step, setStep] = useStateE('inicio');
  const [toast, setToast] = useStateE(null);
  const getProprietarioLocal = (id) => proprietarios.find(p => p.id === id) || { nome: 'Sem proprietário' };
  // Se acabamos de cadastrar um cavalo novo, pula para detalhes da entrada
  React.useEffect(() => {
    if (novoCavaloPendente) {
      setTipo('entrada');
      setCavaloId(novoCavaloPendente.id);
      setData(novoCavaloPendente.dataEntrada || '2026-05-04');
      setStep('detalhes');
      setNovoCavaloPendente(null);
    }
  }, [novoCavaloPendente]);

  const cav = cavaloId && cavalos.find(c => c.id === cavaloId);
  const cavalosFiltrados = cavalos.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.baia.toLowerCase().includes(search.toLowerCase())
  );

  const confirmar = () => {
    addMovimentacao({
      id: 'mv' + Date.now(),
      cavaloId, tipo, data,
      motivo: motivo.trim() || (tipo === 'entrada' ? 'Início de hospedagem' : 'Saída'),
      usuario: 'João T.',
    });
    addAtividade && addAtividade({
      id: 'at' + Date.now(), tipo,
      data, hora: new Date().toTimeString().slice(0, 5),
      cavaloId, motivo: motivo.trim() || (tipo === 'entrada' ? 'Início de hospedagem' : 'Saída'),
      usuario: 'João T.',
    });
    setToast(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} de ${cav.nome} registrada`);
    setTimeout(() => setScreen('home'), 1400);
  };

  // Step início — escolher tipo
  if (step === 'inicio') {
    return (
      <div style={{ paddingBottom: 90 }}>
        <TopBar title="Movimentar animal" subtitle="Entrada ou saída do haras" onBack={() => setScreen('home')} />
        <div style={{ padding: '14px 20px 0' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            O que aconteceu?
          </div>
          <button onClick={() => { setTipo('entrada'); setStep('cavalo'); }} style={{
            width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 16, padding: '20px', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', color: 'var(--ink)',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'var(--accent-soft)', color: 'var(--accent)',
              display: 'grid', placeItems: 'center',
            }}>
              <Icon name="plus" size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)' }}>Entrada</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Animal chegou ao haras hoje ou em outra data</div>
            </div>
            <Icon name="chevron-right" size={18} color="var(--ink-3)" />
          </button>
          <button onClick={() => { setTipo('saida'); setStep('cavalo'); }} style={{
            width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 16, padding: '20px',
            display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', color: 'var(--ink)',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: '#fde9d6', color: '#854d0e',
              display: 'grid', placeItems: 'center',
            }}>
              <Icon name="arrow-left" size={26} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)' }}>Saída</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Animal foi retirado · cobrança proporcional ao mês</div>
            </div>
            <Icon name="chevron-right" size={18} color="var(--ink-3)" />
          </button>

          <div style={{
            marginTop: 16, padding: '12px 14px', background: 'var(--soft)',
            borderRadius: 12, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5,
          }}>
            <strong style={{ color: 'var(--ink)' }}>Como funciona?</strong> A mensalidade do mês é cobrada proporcionalmente aos dias de estadia. Ex: entrada dia 15/05 → cobra 17/31 dias.
          </div>
        </div>
      </div>
    );
  }

  // Step cavalo
  if (step === 'cavalo') {
    return (
      <div style={{ paddingBottom: 90 }}>
        <TopBar
          title={tipo === 'entrada' ? 'Qual cavalo entrou?' : 'Qual cavalo saiu?'}
          subtitle="Passo 2 de 3"
          onBack={() => setStep('inicio')}
        />
        <div style={{ padding: '12px 20px 0' }}>
          {tipo === 'entrada' && (
            <button onClick={() => { setPendingEntradaCavalo(true); setScreen('addCavalo'); }} style={{
              width: '100%', background: 'rgba(40, 116, 230, 0.08)', border: '1px solid var(--accent)',
              borderRadius: 16, padding: '16px', marginBottom: 12, color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 15, fontWeight: 700,
            }}>
              <Icon name="plus" size={18} color="var(--accent)" />
              Cadastrar novo animal
            </button>
          )}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon name="search" size={16} color="var(--ink-3)" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome ou baia"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)' }} />
          </div>
        </div>
        <div style={{ padding: '12px 20px 0' }}>
          {cavalosFiltrados.map(c => (
            <button key={c.id} onClick={() => { setCavaloId(c.id); setStep('detalhes'); }} style={{
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
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{getProprietarioLocal(c.proprietarioId).nome}</div>
              </div>
              <Icon name="chevron-right" size={16} color="var(--ink-3)" />
            </button>
          ))}
          {tipo === 'entrada' && (
            <button onClick={() => { setPendingEntradaCavalo(true); setScreen('addCavalo'); }} style={{
              width: '100%', background: 'rgba(40, 116, 230, 0.05)', border: '1px dashed var(--accent)',
              borderRadius: 14, padding: '14px', marginTop: 10, color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 14, fontWeight: 600,
            }}>
              <Icon name="plus" size={18} color="var(--accent)" />
              Cadastrar novo animal
            </button>
          )}
        </div>
      </div>
    );
  }

  // Step detalhes — data + motivo
  // Calcula impacto
  const dataObj = new Date(data + 'T00:00:00');
  const ref = { ano: dataObj.getFullYear(), mes: dataObj.getMonth() + 1 };
  const fimMes = new Date(ref.ano, ref.mes, 0).getDate();
  const dia = dataObj.getDate();
  const diasCobrados = tipo === 'entrada' ? (fimMes - dia + 1) : dia;
  const valorBase = cav.mensalidade;
  const proporcional = valorBase * (diasCobrados / fimMes);

  return (
    <div style={{ paddingBottom: 100, position: 'relative' }}>
      <TopBar title="Confirmar movimentação" subtitle="Passo 3 de 3" onBack={() => setStep('cavalo')} />

      <div style={{ padding: '14px 20px 0' }}>
        {/* Cavalo */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
          padding: '14px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <HorseAvatar cavalo={cav} size={48} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)' }}>{cav.nome}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{cav.categoria} · {cav.baia}</div>
          </div>
          <div style={{
            padding: '5px 10px', borderRadius: 8,
            background: tipo === 'entrada' ? 'var(--accent-soft)' : '#fde9d6',
            color: tipo === 'entrada' ? 'var(--accent)' : '#854d0e',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>{tipo}</div>
        </div>

        {/* Data + motivo */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
          padding: '4px', marginTop: 10,
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Data da {tipo}</div>
            <input type="date" value={data} onChange={e => setData(e.target.value)} style={{
              width: '100%', border: 'none', outline: 'none', background: 'transparent',
              fontSize: 16, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: '4px 0 0',
            }} />
          </div>
          <div style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Motivo (opcional)</div>
            <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder={tipo === 'entrada' ? 'Início de hospedagem' : 'Transferência, venda, etc'} style={{
              width: '100%', border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: '4px 0 0',
            }} />
          </div>
        </div>

        {/* Cálculo proporcional */}
        <div style={{
          marginTop: 10, padding: '14px',
          background: 'var(--accent-soft)', border: '1px solid #b8c8b0',
          borderRadius: 14,
        }}>
          <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Impacto na fatura · {dataObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Mensalidade base</span>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink-2)', textDecoration: 'line-through' }}>{formatBRL(valorBase)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{diasCobrados} de {fimMes} dias</span>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{formatBRL(proporcional)}</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 24, left: 20, right: 20, display: 'flex', gap: 8 }}>
        <button onClick={() => setScreen('home')} style={{
          flex: 1, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
          padding: '14px', fontSize: 14, fontWeight: 500, color: 'var(--ink-2)',
        }}>Cancelar</button>
        <button onClick={confirmar} style={{
          flex: 2, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 14,
          padding: '14px', fontSize: 15, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 8px 16px rgba(61, 96, 67, 0.22)',
        }}>
          <Icon name="check" size={18} color="#fff" />
          Confirmar {tipo}
        </button>
      </div>

      {toast && (
        <div style={{
          position: 'absolute', bottom: 100, left: 20, right: 20,
          background: 'var(--ink)', color: '#fff', borderRadius: 12,
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 13, fontWeight: 500,
          boxShadow: '0 12px 30px rgba(0,0,0,0.25)', zIndex: 30,
          animation: 'toastIn 0.25s ease-out',
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

Object.assign(window, { AvisosScreen, MovimentacaoScreen });
