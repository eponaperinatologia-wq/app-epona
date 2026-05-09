// extra-screens.jsx — Avisos, Movimentação (entrada/saída) e Novo Cavalo
import React from 'react';
import { Icon } from './icons';
import { getCavalo, getProprietario, formatBRL, PROPRIETARIOS } from './data';
import { TopBar, HorseAvatar, fmtDataHora } from './screens';
const { useState: useStateE } = React;

// ─────────────────────────────────────────────────────────────
// AVISOS · Mural compartilhado
// ─────────────────────────────────────────────────────────────
const AvisosScreen = ({ setScreen, avisos, addAviso, addAtividade, removeAviso, resolverAviso, addResposta, currentUser }) => {
  const [novo, setNovo] = useStateE('');
  const [urgente, setUrgente] = useStateE(false);

  const enviar = () => {
    if (!novo.trim()) return;
    const autor = currentUser?.nome || 'Usuário';
    const avatar = currentUser?.iniciais || 'US';
    addAviso({
      id: 'a' + Date.now(),
      autor, avatar,
      data_entrada: new Date().toLocaleDateString('sv-SE'),
      tempo: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), texto: novo.trim(), urgente,
    });
    addAtividade && addAtividade({
      id: 'at' + Date.now(), tipo: 'aviso',
      data: new Date().toLocaleDateString('sv-SE'), hora: new Date().toTimeString().slice(0, 5),
      autor, texto: novo.trim(), urgente,
    });
    setNovo(''); setUrgente(false);
  };

  return (
    <div style={{ paddingBottom: 90, position: 'relative' }}>
      <TopBar title="Avisos" subtitle="Mural compartilhado · todos veem" onBack={currentUser?.role === 'operacional' ? undefined : () => setScreen('home')} />

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
        {[...avisos].sort((a, b) => {
          const aUrg = a.urgente && !a.resolvido ? 1 : 0;
          const bUrg = b.urgente && !b.resolvido ? 1 : 0;
          return bUrg - aUrg;
        }).map(a => {
          const cav = a.cavaloId && getCavalo(a.cavaloId);
          const isGtaPendente = a.tipo === 'gta_pendente';

          const confirmarGTA = () => {
            // Remove from localStorage pending list
            const pending = JSON.parse(localStorage.getItem('epona_gta_pending') || '[]');
            localStorage.setItem('epona_gta_pending', JSON.stringify(
              pending.filter(e => e.cavaloId !== a.cavaloId)
            ));
            removeAviso && removeAviso(a.id);
          };

          return (
            <div key={a.id} style={{
              background: isGtaPendente ? '#fff9f0' : 'var(--card)',
              border: '1px solid ' + (isGtaPendente ? '#f5a623' : a.urgente ? '#f5d4be' : 'var(--line)'),
              borderRadius: 14, padding: '14px', marginBottom: 8,
              boxShadow: (isGtaPendente || a.urgente) ? '0 0 0 1px ' + (isGtaPendente ? '#f5a62318' : '#fef2e8') : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 36, flexShrink: 0,
                  background: isGtaPendente ? '#fef0d0' : a.urgente ? '#fef2e8' : 'var(--accent-soft)',
                  color: isGtaPendente ? '#b45309' : a.urgente ? '#c0392b' : 'var(--accent)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>{isGtaPendente ? '📋' : a.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{a.autor}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>· {fmtDataHora(a.data_entrada, a.tempo)}</span>
                    {isGtaPendente && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#b45309', color: '#fff', fontWeight: 700, letterSpacing: '0.06em' }}>GTA PENDENTE</span>}
                    {!isGtaPendente && a.urgente && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#c0392b', color: '#fff', fontWeight: 700, letterSpacing: '0.06em' }}>URGENTE</span>}
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
                  {isGtaPendente && (
                    <button onClick={confirmarGTA} style={{
                      marginTop: 10, width: '100%',
                      background: '#b45309', color: '#fff', border: 'none', borderRadius: 10,
                      padding: '9px 14px', fontSize: 13, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      cursor: 'pointer',
                    }}>
                      <Icon name="check" size={14} color="#fff" />
                      GTA confirmada no GEDAVE
                    </button>
                  )}
                  {a.urgente && !a.resolvido && resolverAviso && (
                    <button onClick={() => resolverAviso(a.id)} style={{
                      marginTop: 10, width: '100%',
                      background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10,
                      padding: '9px 14px', fontSize: 13, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      cursor: 'pointer',
                    }}>
                      <Icon name="check" size={14} color="#fff" />
                      Resolvido
                    </button>
                  )}
                  {a.resolvido && a.resolvidoPor && (
                    <div style={{
                      marginTop: 8, fontSize: 11, color: 'var(--ink-3)',
                      textAlign: 'right', fontStyle: 'italic',
                    }}>
                      {a.resolvidoPor} marcou como resolvido
                    </div>
                  )}
                </div>
              </div>
              {/* Replies */}
              {a.respostas && a.respostas.length > 0 && (
                <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
                  {a.respostas.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginTop: i > 0 ? 6 : 0 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 24, flexShrink: 0,
                        background: 'var(--soft)', color: 'var(--ink-2)',
                        display: 'grid', placeItems: 'center',
                        fontSize: 9, fontWeight: 700,
                      }}>{r.avatar}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>{r.autor}</span>
                          <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>· {r.tempo}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.4 }}>{r.texto}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Reply input */}
              {addResposta && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  <input
                    placeholder="Responder…"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        addResposta(a.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                    style={{
                      flex: 1, border: '1px solid var(--line)', borderRadius: 8,
                      padding: '6px 10px', fontSize: 12, outline: 'none',
                      background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--sans)',
                    }}
                  />
                </div>
              )}
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
const MovimentacaoScreen = ({ setScreen, addMovimentacao, addAviso, addAtividade, cavalos, proprietarios = PROPRIETARIOS, novoCavaloPendente, setNovoCavaloPendente, setPendingEntradaCavalo, servicos = [], addProcedimento, updateCavalo, insumos = [], addRegistro }) => {
  const [tipo, setTipo] = useStateE('saida');
  const [cavaloId, setCavaloId] = useStateE(null);
  const [data, setData] = useStateE(new Date().toLocaleDateString('sv-SE'));
  const [motivo, setMotivo] = useStateE('');
  const [search, setSearch] = useStateE('');
  const [step, setStep] = useStateE('inicio');
  const [toast, setToast] = useStateE(null);
  const [gtaConfirmada, setGtaConfirmada] = useStateE(false);
  const [cobrarGTA, setCobrarGTA] = useStateE(false);
  const [insumosAdicionais, setInsumosAdicionais] = useStateE([]);
  const [insumosAdicionaisOpen, setInsumosAdicionaisOpen] = useStateE(false);
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
  const cavalosVisiveis = tipo === 'saida'
    ? cavalos.filter(c => c.presente)
    : cavalos;
  const cavalosFiltrados = cavalosVisiveis.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.baia.toLowerCase().includes(search.toLowerCase())
  );

  const confirmar = () => {
    const mvId = 'mv' + Date.now();
    addMovimentacao({
      id: mvId,
      cavaloId, tipo, data,
      motivo: motivo.trim() || (tipo === 'entrada' ? 'Início de hospedagem' : 'Saída'),
      usuario: 'João T.',
      ...(tipo === 'entrada' ? { gtaConfirmada } : {}),
    });

    // GTA de entrada pendente
    if (tipo === 'entrada' && !gtaConfirmada) {
      const pending = JSON.parse(localStorage.getItem('epona_gta_pending') || '[]');
      const filtered = pending.filter(e => e.cavaloId !== cavaloId);
      filtered.push({ cavaloId, dataEntrada: data, mvId });
      localStorage.setItem('epona_gta_pending', JSON.stringify(filtered));
      addAviso && addAviso({
        id: 'gta_' + cavaloId,
        tipo: 'gta_pendente',
        autor: 'Sistema', avatar: 'GTA',
        data_entrada: data,
        tempo: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        texto: `GTA de ${cav.nome} ainda não foi conferida no GEDAVE. Entrada registrada em ${data}. Confirme assim que possível.`,
        urgente: true,
        cavaloId,
        dataEntrada: data,
      });
    }

    // GTA de saída cobrada como procedimento
    if (tipo === 'saida' && cobrarGTA) {
      const gtaSv = servicos.find(s => s.nome?.toUpperCase().includes('GTA'));
      if (gtaSv && addProcedimento) {
        addProcedimento({
          cavaloId,
          servicoId: gtaSv.id,
          valorServico: gtaSv.valor,
          descartaveisObrigatorios: [],
          insumosAdicionais: [],
          motoboy: { ativo: false, valor: 0 },
          total: gtaSv.valor,
          hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          nota: 'GTA de saída — ' + cav.nome,
        });
      }
    }

    // Atualiza presente/dataSaida no cavalo
    if (tipo === 'saida' && updateCavalo) {
      updateCavalo(cavaloId, { presente: false, dataSaida: data });
    }
    if (tipo === 'entrada' && updateCavalo) {
      updateCavalo(cavaloId, { presente: true, dataSaida: '' });
    }

    // Insumos adicionais na saída
    if (tipo === 'saida' && insumosAdicionais.length > 0 && addRegistro) {
      const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      insumosAdicionais.forEach(item => {
        addRegistro({ id: 'r' + Date.now() + '_' + item.insumoId, cavaloId, insumoId: item.insumoId, qtd: item.qtd, hora, usuario: 'João T.', data });
      });
    }

    const mes = data.slice(0, 7);
    addAtividade && addAtividade({
      id: 'at_' + Date.now(), tipo,
      data, hora: new Date().toTimeString().slice(0, 5),
      cavaloId, motivo: motivo.trim() || (tipo === 'entrada' ? 'Início de hospedagem' : 'Saída'),
      usuario: 'João T.', mes,
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

        {/* GTA de entrada */}
        {tipo === 'entrada' && (
          <button onClick={() => setGtaConfirmada(v => !v)} style={{
            marginTop: 10, width: '100%',
            background: gtaConfirmada ? '#f0fdf4' : '#fff9f0',
            border: `1px solid ${gtaConfirmada ? '#16a34a' : '#f5a623'}`,
            borderRadius: 14, padding: '14px',
            display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: 'var(--ink)',
            cursor: 'pointer',
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              border: `1.5px solid ${gtaConfirmada ? '#16a34a' : '#f5a623'}`,
              background: gtaConfirmada ? '#16a34a' : 'transparent',
              display: 'grid', placeItems: 'center',
            }}>
              {gtaConfirmada && <Icon name="check" size={14} color="#fff" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>GTA conferida no GEDAVE</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                {gtaConfirmada ? 'Documentação em ordem ✓' : 'Se não marcado, será gerado aviso diário até confirmação'}
              </div>
            </div>
          </button>
        )}

        {/* GTA de saída */}
        {tipo === 'saida' && (
          <button onClick={() => setCobrarGTA(v => !v)} style={{
            marginTop: 10, width: '100%',
            background: cobrarGTA ? '#f0fdf4' : 'var(--card)',
            border: `1px solid ${cobrarGTA ? '#16a34a' : 'var(--line)'}`,
            borderRadius: 14, padding: '14px',
            display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: 'var(--ink)',
            cursor: 'pointer',
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              border: `1.5px solid ${cobrarGTA ? '#16a34a' : 'var(--line-2)'}`,
              background: cobrarGTA ? '#16a34a' : 'transparent',
              display: 'grid', placeItems: 'center',
            }}>
              {cobrarGTA && <Icon name="check" size={14} color="#fff" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Cobrar GTA de saída</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                {cobrarGTA ? 'Procedimento GTA será adicionado à fatura' : 'Marque se há emissão de GTA nesta saída'}
              </div>
            </div>
          </button>
        )}

        {/* Insumos adicionais na saída */}
        {tipo === 'saida' && (
          <div style={{
            marginTop: 10, background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            <button onClick={() => setInsumosAdicionaisOpen(function(v){return !v})} style={{
              width: '100%', background: 'transparent', border: 'none', padding: '14px',
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'var(--ink)',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8, border: '1.5px solid var(--line-2)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <Icon name="plus" size={14} color="var(--ink-3)" />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Insumos avulsos na saída</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                  {insumosAdicionais.length > 0 ? insumosAdicionais.length + ' insumo(s) adicionado(s)' : 'Ração, suplementos extras para cobrar na saída'}
                </div>
              </div>
              <Icon name={insumosAdicionaisOpen ? 'chevron-up' : 'chevron-down'} size={16} color="var(--ink-3)" />
            </button>
            {insumosAdicionaisOpen && (
              <div style={{ borderTop: '1px solid var(--line)', padding: '12px 14px' }}>
                {insumos.filter(function(i){ return i.categoria === 'racao' || i.categoria === 'suplemento' || i.categoria === 'oleo' }).map(function(i) {
                  const item = insumosAdicionais.find(function(a){ return a.insumoId === i.id });
                  return (
                    <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                      <input type="checkbox" checked={!!item}
                        onChange={function() {
                          if (item) setInsumosAdicionais(function(prev){ return prev.filter(function(a){ return a.insumoId !== i.id })});
                          else setInsumosAdicionais(function(prev){ return [...prev, { insumoId: i.id, qtd: 1 }]});
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{i.nome}</span>
                      {item && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button onClick={function(){ setInsumosAdicionais(function(prev){ return prev.map(function(a){ return a.insumoId === i.id ? { ...a, qtd: Math.max(0.5, a.qtd - 0.5) } : a })})}} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>-</button>
                          <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', minWidth: 24, textAlign: 'center' }}>{item.qtd}</span>
                          <button onClick={function(){ setInsumosAdicionais(function(prev){ return prev.map(function(a){ return a.insumoId === i.id ? { ...a, qtd: a.qtd + 0.5 } : a })})}} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>+</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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

export { AvisosScreen, MovimentacaoScreen };
