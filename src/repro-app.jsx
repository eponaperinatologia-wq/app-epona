// repro-app.jsx — Shell do Epona Repro Team.
// Fase 1: Home + Locais + Proprietários (workspace='repro') + Éguas + Caderno + Conta.
// Fase 2 (depois): DG, dashboard, cores no calendário, faturamento km.
import React, { useState, useMemo, useEffect } from 'react';
import { Icon } from './icons';
import { norm, formatBRL } from './data';
import { TopBar } from './screens';
import { trocarSenhaVetExterno } from './auth-vet-externo';
import { calcFaturaRepro, dividirFatura } from './utils/faturaRepro';
import { gerarPdfFaturaRepro, nomePdfFaturaRepro } from './utils/pdfFaturaRepro';

const CORES_TAB_ATIVA = '#7c2d8c';

// ─────────────────────────────────────────────────────────────
// Gate: troca de senha obrigatória no 1º acesso
// ─────────────────────────────────────────────────────────────
export function TrocarSenhaVetScreen({ currentUser, onComplete, onLogout }) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [conf, setConf] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setErro('');
    if (nova.length < 6) { setErro('Nova senha deve ter no mínimo 6 caracteres'); return; }
    if (nova !== conf) { setErro('Nova senha e confirmação não conferem'); return; }
    if (nova === atual) { setErro('A nova senha precisa ser diferente da atual'); return; }
    setLoading(true);
    try {
      const ok = await trocarSenhaVetExterno(currentUser.login, atual, nova);
      if (!ok) { setErro('Senha atual incorreta'); return; }
      onComplete({ senhaProvisoria: false, _sessionPassword: nova });
    } catch (e) {
      setErro(e.message || 'Erro ao trocar senha');
    } finally { setLoading(false); }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 12,
    border: '1px solid var(--line)', background: 'var(--card)',
    fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
  };

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)', padding: '20px 20px 40px', display: 'flex', flexDirection: 'column' }}>
      {onLogout && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={onLogout} style={{
            background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink-2)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)',
            padding: '6px 12px', borderRadius: 8,
          }}>← Voltar ao login</button>
        </div>
      )}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--ink)' }}>Criar sua senha</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
          Bem-vindo(a), {currentUser.nome}. Por segurança, defina uma senha nova antes de continuar.
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, fontWeight: 700 }}>Senha atual (a que você recebeu)</div>
        <input type="password" value={atual} onChange={e => { setAtual(e.target.value); setErro(''); }} style={inputStyle} autoFocus />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, fontWeight: 700 }}>Nova senha (mín. 6 caracteres)</div>
        <input type="password" value={nova} onChange={e => { setNova(e.target.value); setErro(''); }} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, fontWeight: 700 }}>Confirmar nova senha</div>
        <input type="password" value={conf} onChange={e => { setConf(e.target.value); setErro(''); }} style={inputStyle}
          onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()} />
      </div>
      {erro && <div style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{erro}</div>}
      <button onClick={handleSubmit} disabled={loading} style={{
        width: '100%', background: CORES_TAB_ATIVA, color: '#fff',
        border: 'none', borderRadius: 14, padding: '15px',
        fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
        fontFamily: 'var(--sans)', opacity: loading ? 0.6 : 1,
      }}>{loading ? 'Salvando…' : 'Definir nova senha'}</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TabBar
// ─────────────────────────────────────────────────────────────
function TabBar({ tab, setTab, setScreen }) {
  const abas = [
    { id: 'home', label: 'Início', icon: 'home', screen: 'repro-home' },
    { id: 'caderno', label: 'Caderno', icon: 'edit', screen: 'repro-caderno' },
    { id: 'cadastros', label: 'Cadastros', icon: 'menu', screen: 'repro-cadastros' },
    { id: 'painel', label: 'Painel', icon: 'sparkle', screen: 'repro-painel' },
    { id: 'cobrancas', label: 'Cobranças', icon: 'doc', screen: 'repro-cobrancas' },
  ];
  return (
    <div style={{
      background: 'var(--bg)', borderTop: '1px solid var(--line)',
      paddingTop: 8, paddingBottom: 28,
      display: 'grid', gridTemplateColumns: `repeat(${abas.length}, 1fr)`, gap: 0,
    }}>
      {abas.map(t => (
        <button key={t.id} onClick={() => { setTab(t.id); setScreen(t.screen); }} style={{
          background: 'none', border: 'none', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 2, padding: '6px 0',
          color: tab === t.id ? CORES_TAB_ATIVA : 'var(--ink-3)',
          fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 500, cursor: 'pointer',
        }}>
          <Icon name={t.icon} size={20} />
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Home
// ─────────────────────────────────────────────────────────────
function ReproHome({
  currentUser, locaisRepro, propRepro, eguasRepro, vetsExternos = [],
  registrosRepro, avisosRepro = [], resolverAvisoRepro,
  setScreen, setTab, goCadastros,
}) {
  const nome = (currentUser.nome || '').split(/\s+/)[0];
  const h = new Date().getHours();
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';

  const stats = [
    { label: 'Locais', value: locaisRepro.length, cadSub: 'locais' },
    { label: 'Proprietários', value: propRepro.length, cadSub: 'proprietarios' },
    { label: 'Éguas', value: eguasRepro.length, cadSub: 'eguas' },
    { label: 'Insumos', value: 0, cadSub: 'insumos', ocultarValor: true },
  ];
  const abrirStat = (s) => {
    if (s.cadSub) goCadastros(s.cadSub);
    else { setTab(s.tab); setScreen(s.screen); }
  };

  const avisosPend = avisosRepro.filter(a => !a.resolvidoEm);

  return (
    <div style={{ padding: '20px 20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 28, background: currentUser.cor || CORES_TAB_ATIVA, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
        }}>{(currentUser.nome || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--ink)' }}>{saudacao}, {nome}.</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 20 }}>Epona Repro Team</div>

      {avisosPend.length > 0 && (
        <MuralAvisos avisos={avisosPend} onResolver={(id) => resolverAvisoRepro(id, currentUser.id)} />
      )}

      <Planner registros={registrosRepro} eguasRepro={eguasRepro} vetsExternos={vetsExternos} />

      <button onClick={() => { setTab('caderno'); setScreen('repro-caderno'); }} style={{
        width: '100%', background: `linear-gradient(135deg, ${CORES_TAB_ATIVA}, #591e6a)`, color: '#fff',
        border: 'none', borderRadius: 16, padding: '20px 18px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
        marginBottom: 12,
        boxShadow: '0 8px 20px rgba(124,45,140,0.22)',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.18)',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <Icon name="edit" size={22} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>Caderno de reprodução</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>Nova IA / TE / diagnóstico</div>
        </div>
        <span style={{ fontSize: 20, opacity: 0.85 }}>›</span>
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
        {stats.slice(0, 3).map(s => (
          <button key={s.label} onClick={() => abrirStat(s)} style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
            padding: '12px 10px', textAlign: 'left', color: 'var(--ink)', cursor: 'pointer',
          }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
          </button>
        ))}
      </div>

      <button onClick={() => goCadastros('locais')} style={{
        width: '100%', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
        padding: '14px 16px', cursor: 'pointer', color: 'var(--ink)',
        display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', marginBottom: 8,
      }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--soft)', color: 'var(--ink-2)', display: 'grid', placeItems: 'center' }}>
          <Icon name="menu" size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 15 }}>Cadastros</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Locais · Proprietários · Éguas · Insumos · Serviços</div>
        </div>
        <span style={{ fontSize: 18, opacity: 0.6 }}>›</span>
      </button>

      <button onClick={() => { setTab('conta'); setScreen('repro-conta'); }} style={{
        width: '100%', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
        padding: '12px 16px', cursor: 'pointer', color: 'var(--ink-2)',
        display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
      }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--soft)', color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}>
          <Icon name="user" size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600 }}>Minha conta</div>
        </div>
        <span style={{ fontSize: 16, opacity: 0.5 }}>›</span>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Mural de avisos persistentes (RESERVAR RECEPTORA etc.)
// ─────────────────────────────────────────────────────────────
function MuralAvisos({ avisos, onResolver }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {avisos.map(a => (
        <div key={a.id} style={{
          background: '#fef3c7', border: '1px solid #f59e0b',
          borderRadius: 12, padding: '12px 14px', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 30, background: '#f59e0b', color: '#fff',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <Icon name="bell" size={14} />
          </div>
          <div style={{ flex: 1, fontSize: 13, color: '#78350f', fontWeight: 700, letterSpacing: '0.02em' }}>
            {a.texto}
          </div>
          <button onClick={() => onResolver(a.id)} style={{
            padding: '8px 12px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#fff',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>OK</button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Planner — agenda horizontal (atrasados, hoje, amanhã, próximos)
// Cada evento pintado com a cor do vet responsável.
// ─────────────────────────────────────────────────────────────
function Planner({ registros, eguasRepro, vetsExternos }) {
  const hoje = new Date().toLocaleDateString('sv-SE');

  // Gera eventos a partir de: data, dataRetorno, dados.dataColetaAgendada
  const eventos = [];
  for (const r of (registros || [])) {
    const dados = r.dados || {};
    if (r.data) eventos.push({ ...eventoBase(r), tipoEv: 'procedimento', dataEv: r.data });
    if (r.dataRetorno) eventos.push({ ...eventoBase(r), tipoEv: 'retorno', dataEv: r.dataRetorno });
    if (dados.dataColetaAgendada) eventos.push({ ...eventoBase(r), tipoEv: 'coleta', dataEv: dados.dataColetaAgendada });
  }

  // Agrupa por chave (atrasado | hoje | dataISO)
  const buckets = new Map();
  const key = (dataEv) => {
    if (dataEv < hoje) return 'atrasado';
    if (dataEv === hoje) return 'hoje';
    return dataEv;
  };
  for (const ev of eventos) {
    const k = key(ev.dataEv);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(ev);
  }

  // Constrói lista ordenada: atrasado, hoje, próximos 7 dias
  const proximos = [];
  for (let i = 1; i <= 7; i++) proximos.push(addDias(hoje, i));
  const ordem = ['atrasado', 'hoje', ...proximos];

  const labelBucket = (k) => {
    if (k === 'atrasado') return 'Atrasado';
    if (k === 'hoje') return 'Hoje';
    if (k === addDias(hoje, 1)) return 'Amanhã';
    return fmtDataBrCurto(k);
  };

  const semNada = eventos.length === 0;

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
      padding: '12px 4px 14px', marginBottom: 12,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px 8px',
        borderBottom: '1px solid var(--line-soft, var(--line))', marginBottom: 8,
      }}>
        <Icon name="calendar" size={14} color="var(--ink-3)" />
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Agenda</div>
      </div>

      {semNada ? (
        <div style={{ padding: '12px 14px', color: 'var(--ink-3)', fontSize: 12 }}>
          Sem eventos agendados.
        </div>
      ) : (
        <div style={{
          display: 'flex', overflowX: 'auto', gap: 8, padding: '2px 12px 4px',
          scrollSnapType: 'x mandatory',
        }}>
          {ordem.map(k => {
            const evs = buckets.get(k) || [];
            const destaque = (k === 'atrasado' && evs.length > 0) || k === 'hoje';
            return (
              <div key={k} style={{
                flex: '0 0 200px', minWidth: 200, scrollSnapAlign: 'start',
                background: destaque ? (k === 'atrasado' ? '#fee2e2' : '#f5e8ff') : 'var(--bg)',
                border: `1px solid ${destaque ? (k === 'atrasado' ? '#fecaca' : '#e9d5ff') : 'var(--line)'}`,
                borderRadius: 12, padding: '10px 10px',
              }}>
                <div style={{
                  fontSize: 10, color: destaque ? (k === 'atrasado' ? '#991b1b' : '#6b21a8') : 'var(--ink-3)',
                  textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6,
                }}>
                  {labelBucket(k)} {evs.length > 0 && <span style={{ opacity: 0.7 }}>· {evs.length}</span>}
                </div>
                {evs.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', padding: '4px 0' }}>—</div>
                )}
                {evs.map((ev, i) => {
                  const vet = vetsExternos.find(v => v.id === ev.vetId);
                  const egua = eguasRepro.find(e => e.id === ev.eguaId);
                  const rotulo = {
                    procedimento: ev.tipo === 'inseminacao_artificial' ? 'IA' :
                                  ev.tipo === 'transferencia_embriao' ? 'TE' :
                                  ev.tipo === 'controle_folicular' ? 'CF' : 'DG',
                    retorno: 'Retorno',
                    coleta: 'Coleta',
                  }[ev.tipoEv];
                  return (
                    <div key={i} style={{
                      background: 'var(--card)', border: '1px solid var(--line)',
                      borderLeft: `3px solid ${vet?.cor || CORES_TAB_ATIVA}`,
                      borderRadius: 8, padding: '6px 8px', marginTop: 4,
                    }}>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {rotulo}
                      </div>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--ink)', lineHeight: 1.25 }}>
                        {egua?.nome || 'égua'}
                      </div>
                      {vet && (
                        <div style={{ fontSize: 10, color: vet.cor, fontWeight: 600, marginTop: 1 }}>
                          {vet.nome.split(' ')[0]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function eventoBase(r) {
  return { id: r.id, eguaId: r.eguaId, vetId: r.vetId, tipo: r.tipo };
}

function fmtDataBrCurto(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const dt = new Date(iso + 'T12:00:00');
  return `${dias[dt.getDay()]} ${d}/${m}`;
}

// ─────────────────────────────────────────────────────────────
// Conta (dados + trocar senha + sair)
// ─────────────────────────────────────────────────────────────
function ReproConta({ currentUser, onLogout }) {
  const confirmarSair = () => {
    if (window.confirm('Deseja realmente sair da sua conta?')) onLogout();
  };
  return (
    <div>
      <TopBar title="Minha conta" />
      <div style={{ padding: '14px 20px 24px' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 44, background: currentUser.cor || CORES_TAB_ATIVA, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700,
            }}>{(currentUser.nome || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)' }}>{currentUser.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Epona Repro Team</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 4 }}>Login</div>
          <div style={{ fontSize: 15, color: 'var(--ink)' }}>{currentUser.login}</div>
        </div>
        <button onClick={confirmarSair} style={{
          width: '100%', background: '#fee2e2', border: '1px solid #dc2626', color: '#dc2626',
          borderRadius: 14, padding: '14px', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>Sair da conta</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Locais (CRUD)
// ─────────────────────────────────────────────────────────────
function ReproLocais({ locaisRepro, vetsExternos = [], vetKmLocais = [], addLocalRepro, updateLocalRepro, deleteLocalRepro, onOpen }) {
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: '', endereco: '', cidade: '', estado: '', observacoes: '' });

  const lista = [...locaisRepro]
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'))
    .filter(l => !busca.trim() || norm(`${l.nome || ''} ${l.cidade || ''} ${l.endereco || ''}`).includes(norm(busca.trim())));

  const abrirNovo = () => {
    setEditId(null);
    setForm({ nome: '', endereco: '', cidade: '', estado: '', observacoes: '' });
    setShowForm(true);
  };
  const abrirEditar = (l) => {
    setEditId(l.id);
    setForm({ nome: l.nome, endereco: l.endereco || '', cidade: l.cidade || '', estado: l.estado || '', observacoes: l.observacoes || '' });
    setShowForm(true);
  };
  const salvar = () => {
    if (!form.nome.trim()) return;
    if (editId) updateLocalRepro(editId, form);
    else addLocalRepro(form);
    setShowForm(false);
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--line)', background: 'var(--bg)', fontSize: 14, color: 'var(--ink)',
    fontFamily: 'var(--sans)', outline: 'none',
  };

  return (
    <div>
      <TopBar title="Locais atendidos" action={
        <button onClick={abrirNovo} style={{
          width: 36, height: 36, borderRadius: 12, background: CORES_TAB_ATIVA,
          display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer',
        }}>
          <Icon name="plus" size={18} color="#fff" />
        </button>
      } />
      <div style={{ padding: '12px 20px 0' }}>
        <SearchBar value={busca} onChange={setBusca} placeholder="Buscar local…" />
      </div>
      <div style={{ padding: '12px 20px 0' }}>
        {lista.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
            {busca ? 'Nenhum local encontrado.' : 'Nenhum local cadastrado. Toque em + para criar.'}
          </div>
        )}
        {lista.map(l => {
          // Cores dos vets que já cadastraram km neste local
          const vetsCadastrados = vetKmLocais
            .filter(k => k.localId === l.id)
            .map(k => vetsExternos.find(v => v.id === k.vetId))
            .filter(Boolean);
          const clickable = !!onOpen;
          return (
            <div
              key={l.id}
              onClick={clickable ? () => onOpen(l) : undefined}
              style={{
                background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
                padding: '14px 16px', marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: clickable ? 'pointer' : 'default',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <Icon name="building" size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{l.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {[l.cidade, l.estado].filter(Boolean).join(' / ') || l.endereco || '—'}
                </div>
                {vetsCadastrados.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {vetsCadastrados.map(v => (
                      <div key={v.id} title={v.nome} style={{
                        width: 8, height: 8, borderRadius: 8, background: v.cor || '#7c2d8c',
                      }} />
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); abrirEditar(l); }}
                style={{
                  width: 32, height: 32, borderRadius: 10, border: '1px solid var(--line)',
                  background: 'transparent', display: 'grid', placeItems: 'center', color: 'var(--ink-3)', cursor: 'pointer',
                }}
              >
                <Icon name="edit" size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, marginBottom: 14 }}>
            {editId ? 'Editar local' : 'Novo local'}
          </div>
          <FormField label="Nome do haras/local"><input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inputStyle} /></FormField>
          <FormField label="Endereço"><input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} style={inputStyle} /></FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <FormField label="Cidade"><input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} style={inputStyle} /></FormField>
            <FormField label="Estado"><input value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value.toUpperCase().slice(0, 2) }))} style={inputStyle} /></FormField>
          </div>
          <FormField label="Observações"><textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} /></FormField>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {editId && deleteLocalRepro && (
              <button onClick={() => { if (window.confirm(`Excluir ${form.nome}?`)) { deleteLocalRepro(editId); setShowForm(false); } }} style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid #dc262640', background: '#fee2e2', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Excluir</button>
            )}
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Cancelar</button>
            <button onClick={salvar} disabled={!form.nome.trim()} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: CORES_TAB_ATIVA, color: '#fff', fontSize: 13, fontWeight: 700, cursor: form.nome.trim() ? 'pointer' : 'default', fontFamily: 'var(--sans)', opacity: form.nome.trim() ? 1 : 0.5 }}>{editId ? 'Salvar' : 'Criar'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Proprietários do Repro (workspace='repro')
// ─────────────────────────────────────────────────────────────
function ReproProprietarios({ propRepro, locaisRepro, addProprietario, updateProprietario, deleteProprietario }) {
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', valorResultadoRepro: '' });

  const lista = [...propRepro]
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'))
    .filter(p => !busca.trim() || norm(`${p.nome || ''} ${p.email || ''} ${p.telefone || ''}`).includes(norm(busca.trim())));

  const abrirNovo = () => {
    setEditId(null);
    setForm({ nome: '', telefone: '', email: '', valorResultadoRepro: '' });
    setShowForm(true);
  };
  const abrirEditar = (p) => {
    setEditId(p.id);
    setForm({
      nome: p.nome, telefone: p.telefone || '', email: p.email || '',
      valorResultadoRepro: p.valorResultadoRepro ? String(p.valorResultadoRepro) : '',
    });
    setShowForm(true);
  };
  const salvar = () => {
    if (!form.nome.trim()) return;
    const valorRR = parseFloat(String(form.valorResultadoRepro).replace(',', '.')) || 0;
    const patch = {
      nome: form.nome.trim(), telefone: form.telefone, email: form.email,
      valorResultadoRepro: valorRR, workspaceId: 'repro',
    };
    if (editId) {
      updateProprietario(editId, patch);
    } else {
      const id = addProprietario(form.nome.trim(), 'repro');
      if (id) updateProprietario(id, patch);
    }
    setShowForm(false);
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--line)', background: 'var(--bg)', fontSize: 14, color: 'var(--ink)',
    fontFamily: 'var(--sans)', outline: 'none',
  };

  return (
    <div>
      <TopBar title="Proprietários" subtitle="Epona Repro Team" action={
        <button onClick={abrirNovo} style={{
          width: 36, height: 36, borderRadius: 12, background: CORES_TAB_ATIVA,
          display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer',
        }}>
          <Icon name="plus" size={18} color="#fff" />
        </button>
      } />
      <div style={{ padding: '12px 20px 0' }}>
        <SearchBar value={busca} onChange={setBusca} placeholder="Buscar proprietário…" />
      </div>
      <div style={{ padding: '12px 20px 0' }}>
        {lista.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
            {busca ? 'Nenhum proprietário encontrado.' : 'Nenhum proprietário cadastrado.'}
          </div>
        )}
        {lista.map(p => (
          <div key={p.id} style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
            padding: '14px 16px', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 38, background: 'var(--accent-soft)', color: 'var(--accent)',
              display: 'grid', placeItems: 'center', fontFamily: 'var(--serif)', fontSize: 14,
            }}>{p.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>{p.nome}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                {p.telefone || p.email || '—'}
              </div>
            </div>
            <button onClick={() => abrirEditar(p)} style={{
              width: 32, height: 32, borderRadius: 10, border: '1px solid var(--line)',
              background: 'transparent', display: 'grid', placeItems: 'center', color: 'var(--ink-3)', cursor: 'pointer',
            }}>
              <Icon name="edit" size={14} />
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, marginBottom: 14 }}>
            {editId ? 'Editar proprietário' : 'Novo proprietário'}
          </div>
          <FormField label="Nome"><input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inputStyle} autoFocus /></FormField>
          <FormField label="Telefone"><input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} style={inputStyle} placeholder="(11) 99999-9999" /></FormField>
          <FormField label="Email"><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} /></FormField>
          <FormField label="Valor do resultado reprodutivo (R$) — cobrado quando DG30+">
            <input type="number" min="0" step="0.01" value={form.valorResultadoRepro} onChange={e => setForm(f => ({ ...f, valorResultadoRepro: e.target.value }))} style={inputStyle} placeholder="0,00" />
          </FormField>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {editId && deleteProprietario && (
              <button onClick={() => { if (window.confirm(`Excluir ${form.nome}?`)) { deleteProprietario(editId); setShowForm(false); } }} style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid #dc262640', background: '#fee2e2', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Excluir</button>
            )}
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Cancelar</button>
            <button onClick={salvar} disabled={!form.nome.trim()} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: CORES_TAB_ATIVA, color: '#fff', fontSize: 13, fontWeight: 700, cursor: form.nome.trim() ? 'pointer' : 'default', fontFamily: 'var(--sans)', opacity: form.nome.trim() ? 1 : 0.5 }}>{editId ? 'Salvar' : 'Criar'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Éguas do Repro (workspace='repro')
// ─────────────────────────────────────────────────────────────
function ReproEguas({ eguasRepro, propRepro, locaisRepro, addCavalo, updateCavalo, deleteCavalo }) {
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: '', pelagem: 'Tordilho', proprietarioId: '', localId: '', observacoes: '' });

  const lista = [...eguasRepro]
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'))
    .filter(e => {
      if (!busca.trim()) return true;
      const prop = propRepro.find(p => p.id === e.proprietarioId);
      return norm(`${e.nome || ''} ${prop?.nome || ''}`).includes(norm(busca.trim()));
    });

  const abrirNovo = () => {
    setEditId(null);
    setForm({ nome: '', pelagem: 'Tordilho', proprietarioId: propRepro[0]?.id || '', localId: locaisRepro[0]?.id || '', observacoes: '' });
    setShowForm(true);
  };
  const abrirEditar = (e) => {
    setEditId(e.id);
    setForm({
      nome: e.nome, pelagem: e.pelagem || 'Tordilho',
      proprietarioId: e.proprietarioId || (e.proprietarioIds || [])[0] || '',
      localId: e.localId || '',
      observacoes: e.obs || '',
    });
    setShowForm(true);
  };
  const salvar = () => {
    if (!form.nome.trim() || !form.proprietarioId) return;
    const payload = {
      nome: form.nome.trim(), pelagem: form.pelagem, sexo: 'F',
      categoria: 'Égua', categorias: ['Égua'],
      proprietarioId: form.proprietarioId,
      proprietarioIds: [form.proprietarioId],
      obs: form.observacoes,
      // Guardamos localId no obs? Melhor extender: adiciono no update abaixo
      workspaceId: 'repro',
      presente: true,
    };
    if (editId) {
      updateCavalo(editId, { ...payload, localId: form.localId });
    } else {
      addCavalo({ ...payload, localId: form.localId });
    }
    setShowForm(false);
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--line)', background: 'var(--bg)', fontSize: 14, color: 'var(--ink)',
    fontFamily: 'var(--sans)', outline: 'none',
  };

  return (
    <div>
      <TopBar title="Éguas" subtitle="Epona Repro Team" action={
        <button onClick={abrirNovo} disabled={propRepro.length === 0} style={{
          width: 36, height: 36, borderRadius: 12, background: propRepro.length === 0 ? 'var(--soft)' : CORES_TAB_ATIVA,
          display: 'grid', placeItems: 'center', border: 'none', cursor: propRepro.length === 0 ? 'default' : 'pointer',
        }}>
          <Icon name="plus" size={18} color="#fff" />
        </button>
      } />
      <div style={{ padding: '12px 20px 0' }}>
        <SearchBar value={busca} onChange={setBusca} placeholder="Buscar égua ou proprietário…" />
      </div>
      <div style={{ padding: '12px 20px 0' }}>
        {propRepro.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
            Cadastre um proprietário antes de adicionar éguas.
          </div>
        )}
        {lista.length === 0 && propRepro.length > 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
            {busca ? 'Nenhuma égua encontrada.' : 'Nenhuma égua cadastrada.'}
          </div>
        )}
        {lista.map(e => {
          const prop = propRepro.find(p => p.id === e.proprietarioId || (e.proprietarioIds || []).includes(p.id));
          const local = locaisRepro.find(l => l.id === e.localId);
          return (
            <div key={e.id} style={{
              background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
              padding: '14px 16px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, background: 'var(--soft)',
                display: 'grid', placeItems: 'center', fontSize: 20,
              }}>🐴</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{e.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {prop?.nome || 'sem proprietário'}
                  {local ? ` · ${local.nome}` : ''}
                </div>
              </div>
              <button onClick={() => abrirEditar(e)} style={{
                width: 32, height: 32, borderRadius: 10, border: '1px solid var(--line)',
                background: 'transparent', display: 'grid', placeItems: 'center', color: 'var(--ink-3)', cursor: 'pointer',
              }}>
                <Icon name="edit" size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, marginBottom: 14 }}>
            {editId ? 'Editar égua' : 'Nova égua'}
          </div>
          <FormField label="Nome"><input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inputStyle} autoFocus /></FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label="Pelagem">
              <select value={form.pelagem} onChange={e => setForm(f => ({ ...f, pelagem: e.target.value }))} style={inputStyle}>
                {['Tordilho', 'Alazã', 'Castanho', 'Preto', 'Baia', 'Rosilha'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </FormField>
            <FormField label="Local">
              <select value={form.localId} onChange={e => setForm(f => ({ ...f, localId: e.target.value }))} style={inputStyle}>
                <option value="">— Selecionar —</option>
                {locaisRepro.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Proprietário">
            <select value={form.proprietarioId} onChange={e => setForm(f => ({ ...f, proprietarioId: e.target.value }))} style={inputStyle}>
              <option value="">— Selecionar —</option>
              {propRepro.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </FormField>
          <FormField label="Observações"><textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} /></FormField>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {editId && deleteCavalo && (
              <button onClick={() => { if (window.confirm(`Excluir ${form.nome}?`)) { deleteCavalo(editId); setShowForm(false); } }} style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid #dc262640', background: '#fee2e2', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Excluir</button>
            )}
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Cancelar</button>
            <button onClick={salvar} disabled={!form.nome.trim() || !form.proprietarioId} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: CORES_TAB_ATIVA, color: '#fff', fontSize: 13, fontWeight: 700, cursor: (form.nome.trim() && form.proprietarioId) ? 'pointer' : 'default', fontFamily: 'var(--sans)', opacity: (form.nome.trim() && form.proprietarioId) ? 1 : 0.5 }}>{editId ? 'Salvar' : 'Criar'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Caderno de reprodução — lista + form completo IA/TE + DG
// ─────────────────────────────────────────────────────────────
const TIPO_META = {
  inseminacao_artificial: { label: 'Inseminação Artificial', short: 'IA', cor: '#7c2d8c', bg: '#f5e8ff' },
  transferencia_embriao:  { label: 'Transferência de Embrião', short: 'TE', cor: '#0e7490', bg: '#cffafe' },
  controle_folicular:     { label: 'Controle Folicular', short: 'CF', cor: '#0e7490', bg: '#cffafe' },
  diagnostico_gestacao:   { label: 'Diagnóstico de Gestação', short: 'DG', cor: '#15803d', bg: '#dcfce7' },
  servico_avulso:         { label: 'Serviço avulso', short: 'SV', cor: '#c2410c', bg: '#fed7aa' },
};

const fmtDataBr = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
};

// Soma dias a uma data ISO (yyyy-mm-dd) preservando o formato ISO
const addDias = (iso, n) => {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

function ReproCaderno({
  registrosRepro, eguasRepro, propRepro, locaisRepro, vetsExternos, currentUser,
  servicos = [], insumos = [],
  addRegistroReproducao, updateRegistroReproducao, deleteRegistroReproducao,
}) {
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editReg, setEditReg] = useState(null);
  const [detalheId, setDetalheId] = useState(null);

  const lista = [...(registrosRepro || [])]
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
    .filter(r => {
      if (!busca.trim()) return true;
      const egua = eguasRepro.find(e => e.id === r.eguaId);
      return norm(`${egua?.nome || ''} ${r.tipo || ''}`).includes(norm(busca.trim()));
    });

  const abrirNovo = () => { setEditReg(null); setShowForm(true); };
  const abrirEditar = (r) => { setEditReg(r); setShowForm(true); };
  const abrirDetalhe = (r) => setDetalheId(r.id);

  return (
    <div>
      <TopBar title="Caderno de reprodução" subtitle={`${lista.length} registro${lista.length !== 1 ? 's' : ''}`} action={
        <button onClick={abrirNovo} disabled={eguasRepro.length === 0} style={{
          width: 36, height: 36, borderRadius: 12, background: eguasRepro.length === 0 ? 'var(--soft)' : CORES_TAB_ATIVA,
          display: 'grid', placeItems: 'center', border: 'none', cursor: eguasRepro.length === 0 ? 'default' : 'pointer',
        }}>
          <Icon name="plus" size={18} color="#fff" />
        </button>
      } />
      <div style={{ padding: '12px 20px 0' }}>
        <SearchBar value={busca} onChange={setBusca} placeholder="Buscar por égua ou tipo…" />
      </div>
      <div style={{ padding: '12px 20px 0' }}>
        {eguasRepro.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
            Cadastre uma égua antes de registrar atividades.
          </div>
        )}
        {lista.length === 0 && eguasRepro.length > 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
            Sem registros{busca ? ' com esse filtro' : ''} ainda. Toque em + pra criar.
          </div>
        )}
        {lista.map(r => {
          const egua = eguasRepro.find(e => e.id === r.eguaId);
          const prop = egua && propRepro.find(p => (egua.proprietarioIds || [egua.proprietarioId]).includes(p.id));
          const vet = vetsExternos.find(v => v.id === r.vetId);
          const local = locaisRepro.find(l => l.id === r.localId);
          const meta = TIPO_META[r.tipo] || {};
          return (
            <button key={r.id} onClick={() => abrirDetalhe(r)} style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background: 'var(--card)', border: '1px solid var(--line)',
              borderLeft: `3px solid ${vet?.cor || meta.cor || CORES_TAB_ATIVA}`,
              borderRadius: 12, padding: '12px 14px', marginBottom: 8,
              color: 'var(--ink)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, background: meta.bg || 'var(--soft)', color: meta.cor || 'var(--ink)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{meta.label || r.tipo}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{fmtDataBr(r.data)}</span>
                {vet && (
                  <span style={{ fontSize: 10, color: '#fff', background: vet.cor, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                    {vet.nome.split(' ')[0]}
                  </span>
                )}
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>{egua?.nome || '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                {prop?.nome || '—'}{local ? ` · ${local.nome}` : ''}
              </div>
              {r.dataRetorno && (
                <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>
                  ↩ Retorno {fmtDataBr(r.dataRetorno)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {showForm && (
        <FormRegistroRepro
          registro={editReg}
          eguasRepro={eguasRepro}
          propRepro={propRepro}
          locaisRepro={locaisRepro}
          currentUser={currentUser}
          servicos={servicos}
          insumos={insumos}
          registrosRepro={registrosRepro}
          onSave={(payload) => {
            if (editReg) {
              updateRegistroReproducao(editReg.id, payload);
            } else {
              addRegistroReproducao(payload);
            }
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {detalheId && (
        <DetalheRegistroRepro
          registro={registrosRepro.find(r => r.id === detalheId)}
          eguasRepro={eguasRepro}
          propRepro={propRepro}
          locaisRepro={locaisRepro}
          vetsExternos={vetsExternos}
          onClose={() => setDetalheId(null)}
          onEdit={(r) => { setDetalheId(null); abrirEditar(r); }}
          onDelete={(r) => {
            if (window.confirm('Excluir este registro?')) {
              deleteRegistroReproducao(r.id);
              setDetalheId(null);
            }
          }}
          onUpdateDg={(r, campo, valor) => {
            const novosDados = { ...(r.dados || {}), [campo]: valor };
            updateRegistroReproducao(r.id, { dados: novosDados });
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Formulário: IA / TE / Controle folicular / DG
// ─────────────────────────────────────────────────────────────
// Insumos que são obrigatoriamente cobrados em toda IA (luva palpação,
// pipeta inseminação, dose de lubrificante estéril). Buscamos por nome
// no catálogo — repro tem prioridade, haras é fallback.
const DESCARTAVEIS_IA_MATCHERS = [
  { regex: /luva.*palpa|palpa.*luva/i, label: 'luva de palpação' },
  { regex: /pipeta.*insem|insem.*pipeta|pipeta/i, label: 'pipeta de inseminação' },
  { regex: /lubrificante.*est[eé]ril|lubrificante/i, label: 'lubrificante estéril' },
];
function resolverDescartaveisIa(insumos) {
  const repro = insumos.filter(i => i.workspaceId === 'repro');
  const haras = insumos.filter(i => (i.workspaceId || 'haras') === 'haras');
  const encontrar = (matcher) => {
    const nomeMatch = (arr) => arr.find(i => matcher.regex.test(i.nome || ''));
    return nomeMatch(repro) || nomeMatch(haras) || null;
  };
  const encontrados = [];
  const faltantes = [];
  for (const m of DESCARTAVEIS_IA_MATCHERS) {
    const ins = encontrar(m);
    if (ins) encontrados.push({ insumoId: ins.id, qtd: 1, nome: ins.nome });
    else faltantes.push(m.label);
  }
  return { encontrados, faltantes };
}

function FormRegistroRepro({ registro, eguasRepro, propRepro, locaisRepro, currentUser, servicos = [], insumos = [], registrosRepro = [], onSave, onCancel }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const init = registro || { data: hoje, tipo: 'inseminacao_artificial', dados: {}, dataRetorno: '' };

  const [tipo, setTipo] = useState(init.tipo);
  const [data, setData] = useState(init.data);
  const [eguaId, setEguaId] = useState(init.eguaId || '');
  const [localId, setLocalId] = useState(init.localId || '');
  const [dados, setDados] = useState(init.dados || {});
  const [dataRetorno, setDataRetorno] = useState(init.dataRetorno || '');

  const eguaSel = eguasRepro.find(e => e.id === eguaId);

  // Se a égua tem local padrão, sugere ao selecionar
  useEffect(() => {
    if (!localId && eguaSel?.localId) setLocalId(eguaSel.localId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eguaId]);

  const setDado = (k, v) => setDados(d => ({ ...d, [k]: v }));

  // Datas automáticas com base no tipo
  useEffect(() => {
    if (!data) return;
    // IA que vira TE agenda a coleta em +9 dias (editável)
    if (tipo === 'inseminacao_artificial' && dados.destino === 'transferencia' && !dados.dataColetaAgendada) {
      setDado('dataColetaAgendada', addDias(data, 9));
    }
    // TE agenda retorno em +5 dias (editável) — só se não houver
    if (tipo === 'transferencia_embriao' && !dataRetorno) {
      setDataRetorno(addDias(data, 5));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, data, dados.destino]);

  const canSave = eguaId && data && tipo;

  const handleSave = () => {
    if (!canSave) return;
    const mes = data.slice(0, 7);
    let insumosUsados = registro?.insumosUsados || [];
    // IA: adiciona descartáveis obrigatórios (só se ainda não estiverem)
    if (tipo === 'inseminacao_artificial') {
      const { encontrados } = resolverDescartaveisIa(insumos);
      for (const item of encontrados) {
        if (!insumosUsados.some(u => u.insumoId === item.insumoId)) {
          insumosUsados = [...insumosUsados, { insumoId: item.insumoId, qtd: item.qtd }];
        }
      }
    }
    const payload = {
      id: registro?.id || 'rr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      eguaId, data, tipo, dados, dataRetorno: dataRetorno || null,
      insumosUsados,
      autor: currentUser?.nome || 'Vet',
      mes,
      workspaceId: 'repro',
      vetId: currentUser?.id || null,
      localId: localId || null,
    };
    onSave(payload);
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--line)', background: 'var(--bg)', fontSize: 14, color: 'var(--ink)',
    fontFamily: 'var(--sans)', outline: 'none',
  };

  return (
    <Modal onClose={onCancel}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 20, marginBottom: 14 }}>
        {registro ? 'Editar registro' : 'Novo registro'}
      </div>

      {/* Tipo */}
      <FormField label="Tipo de atividade">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(TIPO_META).map(([k, m]) => (
            <button key={k} onClick={() => { setTipo(k); setDados({}); }} style={{
              flex: '1 1 45%', minWidth: 120, padding: '10px 8px', borderRadius: 10,
              border: `1.5px solid ${tipo === k ? m.cor : 'var(--line)'}`,
              background: tipo === k ? m.bg : 'var(--card)', color: tipo === k ? m.cor : 'var(--ink-2)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)',
            }}>{m.label}</button>
          ))}
        </div>
      </FormField>

      {/* Égua + Data + Local */}
      <FormField label="Égua *">
        <select value={eguaId} onChange={e => setEguaId(e.target.value)} style={inputStyle}>
          <option value="">— Selecionar —</option>
          {[...eguasRepro].sort((a, b) => a.nome.localeCompare(b.nome, 'pt')).map(e => {
            const prop = propRepro.find(p => (e.proprietarioIds || [e.proprietarioId]).includes(p.id));
            return <option key={e.id} value={e.id}>{e.nome}{prop ? ` · ${prop.nome}` : ''}</option>;
          })}
        </select>
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FormField label="Data *">
          <input type="date" value={data} onChange={e => setData(e.target.value)} style={inputStyle} />
        </FormField>
        <FormField label="Local">
          <select value={localId} onChange={e => setLocalId(e.target.value)} style={inputStyle}>
            <option value="">—</option>
            {locaisRepro.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </FormField>
      </div>

      {/* Campos específicos por tipo */}
      {tipo === 'inseminacao_artificial' && (
        <>
          <FormField label="Garanhão">
            <input value={dados.garanhao || ''} onChange={e => setDado('garanhao', e.target.value)} style={inputStyle} placeholder="Nome do garanhão" />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label="Palhetas usadas">
              <input type="number" min="0" step="1" value={dados.qtdPalhetas || ''} onChange={e => setDado('qtdPalhetas', e.target.value)} style={inputStyle} />
            </FormField>
            <FormField label="Ovulações">
              <input type="number" min="0" step="1" value={dados.ovulacoes || ''} onChange={e => setDado('ovulacoes', e.target.value)} style={inputStyle} placeholder="0, 1 ou 2" />
            </FormField>
          </div>
          <FormField label="Momento">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                ['pre_ovulacao', 'Pré-ovulação'],
                ['pos_ovulacao', 'Pós-ovulação'],
              ].map(([v, lbl]) => (
                <button key={v} onClick={() => setDado('momento', dados.momento === v ? '' : v)} style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${dados.momento === v ? CORES_TAB_ATIVA : 'var(--line)'}`,
                  background: dados.momento === v ? '#f5e8ff' : 'var(--card)',
                  color: dados.momento === v ? CORES_TAB_ATIVA : 'var(--ink-2)',
                  cursor: 'pointer', fontFamily: 'var(--sans)',
                }}>{lbl}</button>
              ))}
            </div>
          </FormField>
          <FormField label="Destino da IA *">
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                ['prenhez', 'Prenhez na própria égua'],
                ['transferencia', 'Transferência de embrião'],
              ].map(([v, lbl]) => (
                <button key={v} onClick={() => setDado('destino', v)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${dados.destino === v ? CORES_TAB_ATIVA : 'var(--line)'}`,
                  background: dados.destino === v ? '#f5e8ff' : 'var(--card)',
                  color: dados.destino === v ? CORES_TAB_ATIVA : 'var(--ink-2)',
                  cursor: 'pointer', fontFamily: 'var(--sans)',
                }}>{lbl}</button>
              ))}
            </div>
          </FormField>
          {dados.destino === 'transferencia' && (
            <FormField label="Data prevista da coleta (padrão +9 dias, editável)">
              <input type="date" value={dados.dataColetaAgendada || ''} onChange={e => setDado('dataColetaAgendada', e.target.value)} style={inputStyle} />
            </FormField>
          )}
          <FormField label="Data de retorno (se houver)">
            <input type="date" value={dataRetorno} onChange={e => setDataRetorno(e.target.value)} style={inputStyle} />
          </FormField>
          {(() => {
            const { faltantes } = resolverDescartaveisIa(insumos);
            const bg = faltantes.length ? '#fee2e2' : '#f5e8ff';
            const border = faltantes.length ? '#fca5a5' : '#d8b4fe';
            const cor = faltantes.length ? '#991b1b' : '#6b21a8';
            return (
              <div style={{
                background: bg, border: `1px solid ${border}`, borderRadius: 10,
                padding: '10px 12px', fontSize: 12, color: cor, lineHeight: 1.5, marginBottom: 12,
              }}>
                <strong>Descartáveis obrigatórios</strong> (cobrados automaticamente na fatura):
                luva de palpação, pipeta de inseminação, dose de lubrificante estéril.
                {faltantes.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    ⚠ Não achei no catálogo: <strong>{faltantes.join(', ')}</strong>. Cadastre em Cadastros → Insumos pra cobrar automaticamente.
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}

      {tipo === 'transferencia_embriao' && (
        <>
          <FormField label="IA de origem (embrião coletado)">
            <select value={dados.iaOrigemId || ''} onChange={e => setDado('iaOrigemId', e.target.value)} style={inputStyle}>
              <option value="">— tenta inferir automaticamente —</option>
              {(registrosRepro || [])
                .filter(r => r.tipo === 'inseminacao_artificial'
                  && r.eguaId === eguaId
                  && r.dados?.destino === 'transferencia')
                .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
                .map(ia => (
                  <option key={ia.id} value={ia.id}>
                    {fmtDataBr(ia.data)} · {ia.dados?.garanhao || 'sem garanhão'}
                  </option>
                ))}
            </select>
          </FormField>
          <FormField label="Tônus cervical">
            <select value={dados.tonusCervical || ''} onChange={e => setDado('tonusCervical', e.target.value)} style={inputStyle}>
              <option value="">—</option>
              {['-', '+', '++', '+++'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </FormField>
          <FormField label="Tônus uterino">
            <select value={dados.tonusUterino || ''} onChange={e => setDado('tonusUterino', e.target.value)} style={inputStyle}>
              <option value="">—</option>
              {['-', '+', '++', '+++'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </FormField>
          <FormField label="Aspecto da vagina">
            <input value={dados.aspectoVagina || ''} onChange={e => setDado('aspectoVagina', e.target.value)} style={inputStyle} placeholder="Ex: normal, hiperêmica…" />
          </FormField>
          <FormField label="Ringer Lactato (ml)">
            <input type="number" min="0" step="10" value={dados.ringerLactatoMl || ''} onChange={e => setDado('ringerLactatoMl', e.target.value)} style={inputStyle} />
          </FormField>
          <FormField label="Resultado *">
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                ['positivo', '✓ Positiva'],
                ['negativo', '✗ Negativa'],
              ].map(([v, lbl]) => (
                <button key={v} onClick={() => setDado('resultado', v)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  border: `1.5px solid ${dados.resultado === v ? (v === 'positivo' ? '#15803d' : '#dc2626') : 'var(--line)'}`,
                  background: dados.resultado === v ? (v === 'positivo' ? '#dcfce7' : '#fee2e2') : 'var(--card)',
                  color: dados.resultado === v ? (v === 'positivo' ? '#15803d' : '#dc2626') : 'var(--ink-2)',
                  cursor: 'pointer', fontFamily: 'var(--sans)',
                }}>{lbl}</button>
              ))}
            </div>
          </FormField>
          {dados.resultado === 'positivo' && (
            <>
              <FormField label="Receptora (nome ou local)">
                <input value={dados.receptora || ''} onChange={e => setDado('receptora', e.target.value)} style={inputStyle} placeholder="Ex: Receptora 42 · Piquete 3" />
              </FormField>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 10 }}>
                Diagnósticos gestacionais (DG15/30/45) podem ser marcados abrindo o detalhe do registro.
              </div>
            </>
          )}
          <FormField label="Data de retorno (padrão +5 dias, editável)">
            <input type="date" value={dataRetorno} onChange={e => setDataRetorno(e.target.value)} style={inputStyle} />
          </FormField>
        </>
      )}

      {tipo === 'controle_folicular' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label="Ovário direito">
              <input value={dados.ovarioDireito || ''} onChange={e => setDado('ovarioDireito', e.target.value)} style={inputStyle} placeholder="Ex: F35" />
            </FormField>
            <FormField label="Ovário esquerdo">
              <input value={dados.ovarEsquerdo || ''} onChange={e => setDado('ovarEsquerdo', e.target.value)} style={inputStyle} placeholder="Ex: Vf12" />
            </FormField>
          </div>
          <FormField label="Edema uterino">
            <input value={dados.edemaUterino || ''} onChange={e => setDado('edemaUterino', e.target.value)} style={inputStyle} placeholder="Ex: 0, +, ++, +++" />
          </FormField>
          <FormField label="Data de retorno">
            <input type="date" value={dataRetorno} onChange={e => setDataRetorno(e.target.value)} style={inputStyle} />
          </FormField>
        </>
      )}

      {tipo === 'diagnostico_gestacao' && (
        <>
          <FormField label="Resultado *">
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                ['positivo', '✓ Gestante'],
                ['negativo', '✗ Vazio'],
              ].map(([v, lbl]) => (
                <button key={v} onClick={() => setDado('resultado', v)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  border: `1.5px solid ${dados.resultado === v ? (v === 'positivo' ? '#15803d' : '#dc2626') : 'var(--line)'}`,
                  background: dados.resultado === v ? (v === 'positivo' ? '#dcfce7' : '#fee2e2') : 'var(--card)',
                  color: dados.resultado === v ? (v === 'positivo' ? '#15803d' : '#dc2626') : 'var(--ink-2)',
                  cursor: 'pointer', fontFamily: 'var(--sans)',
                }}>{lbl}</button>
              ))}
            </div>
          </FormField>
          <FormField label="Tamanho da vesícula">
            <input value={dados.tamanhoVesicula || ''} onChange={e => setDado('tamanhoVesicula', e.target.value)} style={inputStyle} placeholder="Ex: 15 mm" />
          </FormField>
        </>
      )}

      {tipo === 'servico_avulso' && (
        <>
          <FormField label="Serviço *">
            <select value={dados.servicoId || ''} onChange={e => {
              const sv = servicos.find(s => s.id === e.target.value);
              setDado('servicoId', e.target.value);
              if (sv && !dados.valorCobrado) setDado('valorCobrado', String(sv.valor || 0));
            }} style={inputStyle}>
              <option value="">— Selecionar —</option>
              {[...servicos]
                .filter(s => s.workspaceId === 'repro' || s.workspaceId === 'haras')
                .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'))
                .map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </FormField>
          <FormField label="Valor cobrado (R$)">
            <input type="number" min="0" step="0.01" value={dados.valorCobrado || ''} onChange={e => setDado('valorCobrado', e.target.value)} style={inputStyle} placeholder="0,00" />
          </FormField>
          <div style={{
            background: '#fed7aa', border: '1px solid #fdba74', borderRadius: 10,
            padding: '10px 12px', fontSize: 12, color: '#7c2d12', lineHeight: 1.5, marginBottom: 12,
          }}>
            Serviços avulsos (ex. lavagem uterina) são <strong>100% do vet</strong> na divisão da equipe.
          </div>
        </>
      )}

      <FormField label="Observações">
        <textarea value={dados.observacoes || ''} onChange={e => setDado('observacoes', e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
      </FormField>

      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Cancelar</button>
        <button onClick={handleSave} disabled={!canSave} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: CORES_TAB_ATIVA, color: '#fff', fontSize: 13, fontWeight: 700, cursor: canSave ? 'pointer' : 'default', fontFamily: 'var(--sans)', opacity: canSave ? 1 : 0.5 }}>
          {registro ? 'Salvar' : 'Registrar'}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Detalhe do registro — leitura + marcar DG15/30/45
// ─────────────────────────────────────────────────────────────
function DetalheRegistroRepro({ registro, eguasRepro, propRepro, locaisRepro, vetsExternos, onClose, onEdit, onDelete, onUpdateDg }) {
  if (!registro) return null;
  const egua = eguasRepro.find(e => e.id === registro.eguaId);
  const prop = egua && propRepro.find(p => (egua.proprietarioIds || [egua.proprietarioId]).includes(p.id));
  const local = locaisRepro.find(l => l.id === registro.localId);
  const vet = vetsExternos.find(v => v.id === registro.vetId);
  const meta = TIPO_META[registro.tipo] || {};
  const d = registro.dados || {};

  // DG só faz sentido quando: IA c/ destino='prenhez' OU TE c/ resultado='positivo'
  const mostrarDg = (registro.tipo === 'inseminacao_artificial' && d.destino === 'prenhez')
    || (registro.tipo === 'transferencia_embriao' && d.resultado === 'positivo');

  const dgs = [
    ['dg15', 'DG 15 dias'],
    ['dg30', 'DG 30 dias'],
    ['dg45', 'DG 45 dias'],
  ];

  return (
    <Modal onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 10, background: meta.bg || 'var(--soft)', color: meta.cor || 'var(--ink)', padding: '3px 8px', borderRadius: 5, fontWeight: 700 }}>{meta.label || registro.tipo}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{fmtDataBr(registro.data)}</span>
        {vet && (
          <span style={{ fontSize: 10, color: '#fff', background: vet.cor, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
            {vet.nome.split(' ')[0]}
          </span>
        )}
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', marginBottom: 2 }}>{egua?.nome || '—'}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14 }}>
        {prop?.nome || '—'}{local ? ` · ${local.nome}` : ''}
      </div>

      {/* Corpo por tipo */}
      <div style={{ background: 'var(--soft)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
        {registro.tipo === 'inseminacao_artificial' && (
          <>
            <DetalheLinha label="Garanhão" valor={d.garanhao} />
            <DetalheLinha label="Palhetas" valor={d.qtdPalhetas} />
            <DetalheLinha label="Ovulações" valor={d.ovulacoes} />
            <DetalheLinha label="Momento" valor={d.momento === 'pre_ovulacao' ? 'Pré-ovulação' : d.momento === 'pos_ovulacao' ? 'Pós-ovulação' : null} />
            <DetalheLinha label="Destino" valor={d.destino === 'prenhez' ? 'Prenhez na própria égua' : d.destino === 'transferencia' ? 'Transferência de embrião' : null} />
            {d.destino === 'transferencia' && <DetalheLinha label="Coleta agendada" valor={fmtDataBr(d.dataColetaAgendada)} />}
          </>
        )}
        {registro.tipo === 'transferencia_embriao' && (
          <>
            <DetalheLinha label="Tônus cervical" valor={d.tonusCervical} />
            <DetalheLinha label="Tônus uterino" valor={d.tonusUterino} />
            <DetalheLinha label="Aspecto da vagina" valor={d.aspectoVagina} />
            <DetalheLinha label="Ringer Lactato" valor={d.ringerLactatoMl ? `${d.ringerLactatoMl} ml` : null} />
            <DetalheLinha label="Resultado" valor={d.resultado === 'positivo' ? '✓ Positiva' : d.resultado === 'negativo' ? '✗ Negativa' : null} />
            {d.resultado === 'positivo' && <DetalheLinha label="Receptora" valor={d.receptora} />}
          </>
        )}
        {registro.tipo === 'controle_folicular' && (
          <>
            <DetalheLinha label="OD" valor={d.ovarioDireito} />
            <DetalheLinha label="OE" valor={d.ovarEsquerdo} />
            <DetalheLinha label="Edema uterino" valor={d.edemaUterino} />
          </>
        )}
        {registro.tipo === 'diagnostico_gestacao' && (
          <>
            <DetalheLinha label="Resultado" valor={d.resultado === 'positivo' ? '✓ Gestante' : d.resultado === 'negativo' ? '✗ Vazio' : null} />
            <DetalheLinha label="Vesícula" valor={d.tamanhoVesicula} />
          </>
        )}
        {registro.dataRetorno && <DetalheLinha label="Retorno" valor={fmtDataBr(registro.dataRetorno)} />}
        {d.observacoes && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 3 }}>Observações</div>
            <div style={{ fontSize: 13, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{d.observacoes}</div>
          </div>
        )}
      </div>

      {/* Diagnósticos de gestação (só se aplicável) */}
      {mostrarDg && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Diagnósticos gestacionais</div>
          {dgs.map(([k, lbl]) => {
            const val = d[k]; // 'positivo' | 'negativo' | undefined
            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{lbl}</span>
                {['positivo', 'negativo'].map(v => (
                  <button key={v} onClick={() => onUpdateDg(registro, k, val === v ? null : v)} style={{
                    padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    border: `1px solid ${val === v ? (v === 'positivo' ? '#15803d' : '#dc2626') : 'var(--line)'}`,
                    background: val === v ? (v === 'positivo' ? '#dcfce7' : '#fee2e2') : 'var(--card)',
                    color: val === v ? (v === 'positivo' ? '#15803d' : '#dc2626') : 'var(--ink-2)',
                    cursor: 'pointer', fontFamily: 'var(--sans)',
                  }}>{v === 'positivo' ? '✓ Positivo' : '✗ Negativo'}</button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button onClick={() => onDelete(registro)} style={{
          padding: '11px 14px', borderRadius: 10, border: '1px solid #dc262640',
          background: '#fee2e2', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)',
        }}>Excluir</button>
        <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Fechar</button>
        <button onClick={() => onEdit(registro)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: CORES_TAB_ATIVA, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Editar</button>
      </div>
    </Modal>
  );
}

const DetalheLinha = ({ label, valor }) => {
  if (valor === null || valor === undefined || valor === '') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, padding: '3px 0' }}>
      <span style={{ color: 'var(--ink-3)' }}>{label}</span>
      <span style={{ color: 'var(--ink)', fontWeight: 500, textAlign: 'right' }}>{valor}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Cadastros — wrapper com 5 sub-abas: Locais / Proprietários /
// Éguas / Insumos / Serviços. Substitui as antigas telas soltas.
// ─────────────────────────────────────────────────────────────
function ReproCadastros({
  currentUser, vetsExternos, locaisRepro, propRepro, eguasRepro,
  insumos, servicos,
  addLocalRepro, updateLocalRepro, deleteLocalRepro,
  addProprietario, updateProprietario, deleteProprietario,
  addCavalo, updateCavalo, deleteCavalo,
  addInsumo, updateInsumo, deleteInsumo,
  addServico, updateServico, deleteServico,
  vetKmLocais,
  subInicial = 'locais',
  onOpenLocal,
}) {
  const [sub, setSub] = useState(subInicial);

  const abas = [
    ['locais', 'Locais'],
    ['proprietarios', 'Proprietários'],
    ['eguas', 'Éguas'],
    ['insumos', 'Insumos'],
    ['servicos', 'Serviços'],
  ];

  return (
    <div>
      <TopBar title="Cadastros" subtitle="Locais · Propr · Éguas · Insumos · Serv" />
      <div style={{
        display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--line)', background: 'var(--bg)',
      }}>
        {abas.map(([id, lbl]) => (
          <button key={id} onClick={() => setSub(id)} style={{
            flex: '1 0 auto', minWidth: 90, padding: '10px 8px', border: 'none', background: 'none',
            borderBottom: `2px solid ${sub === id ? CORES_TAB_ATIVA : 'transparent'}`,
            color: sub === id ? CORES_TAB_ATIVA : 'var(--ink-3)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)', whiteSpace: 'nowrap',
          }}>{lbl}</button>
        ))}
      </div>

      {sub === 'locais' && (
        <ReproLocais
          locaisRepro={locaisRepro}
          vetsExternos={vetsExternos}
          vetKmLocais={vetKmLocais}
          addLocalRepro={addLocalRepro}
          updateLocalRepro={updateLocalRepro}
          deleteLocalRepro={deleteLocalRepro}
          onOpen={onOpenLocal}
        />
      )}
      {sub === 'proprietarios' && (
        <ReproProprietarios
          propRepro={propRepro}
          locaisRepro={locaisRepro}
          addProprietario={addProprietario}
          updateProprietario={updateProprietario}
          deleteProprietario={deleteProprietario}
        />
      )}
      {sub === 'eguas' && (
        <ReproEguas
          eguasRepro={eguasRepro}
          propRepro={propRepro}
          locaisRepro={locaisRepro}
          addCavalo={addCavalo}
          updateCavalo={updateCavalo}
          deleteCavalo={deleteCavalo}
        />
      )}
      {sub === 'insumos' && (
        <ReproCobCatalogo
          tipo="insumos"
          itens={insumos}
          addItem={addInsumo}
          updateItem={updateInsumo}
          deleteItem={deleteInsumo}
        />
      )}
      {sub === 'servicos' && (
        <ReproCobCatalogo
          tipo="servicos"
          itens={servicos}
          addItem={addServico}
          updateItem={updateServico}
          deleteItem={deleteServico}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Detalhe do local — mostra dados + km cadastrado por cada vet
// (colorido). Qualquer vet pode ver a lista, cada um só edita
// seu próprio valor via aba Cobranças.
// ─────────────────────────────────────────────────────────────
function ReproLocalDetalhe({ local, vetsExternos, vetKmLocais, onBack, onEdit }) {
  const kmDoLocal = vetKmLocais.filter(k => k.localId === local.id);
  const linhas = vetsExternos.map(v => {
    const k = kmDoLocal.find(x => x.vetId === v.id);
    return { vet: v, valor: k ? Number(k.valor) : null };
  });

  return (
    <div>
      <TopBar title={local.nome} subtitle="Local atendido" action={
        <button onClick={onEdit} style={{
          width: 36, height: 36, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--card)',
          display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-2)',
        }}>
          <Icon name="edit" size={16} />
        </button>
      } />
      <div style={{ padding: '4px 20px 0' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer',
          padding: '6px 0', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--sans)',
        }}>
          <Icon name="arrow-left" size={14} /> Voltar
        </button>
      </div>
      <div style={{ padding: '10px 20px' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
          padding: 14, marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Dados do local</div>
          <DetalheLinha label="Endereço" valor={local.endereco || '—'} />
          <DetalheLinha label="Cidade" valor={[local.cidade, local.estado].filter(Boolean).join(' / ') || '—'} />
          {local.observacoes && <DetalheLinha label="Observações" valor={local.observacoes} />}
        </div>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 14,
        }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Km por veterinário</div>
          {linhas.length === 0 && (
            <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '6px 0' }}>Sem vets cadastrados.</div>
          )}
          {linhas.map(({ vet, valor }) => (
            <div key={vet.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
              borderTop: '1px solid var(--line-soft, var(--line))',
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: 10, background: vet.cor || '#7c2d8c', flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>{vet.nome}</div>
              </div>
              <div style={{
                fontFamily: 'var(--serif)', fontSize: 14,
                color: valor === null ? 'var(--ink-3)' : 'var(--ink)',
              }}>
                {valor === null ? '—' : formatBRL(valor)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Cobranças — apenas Km por local do vet logado (insumos e
// serviços agora vivem em Cadastros).
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Painel — wrapper com 3 sub-abas: Dashboard | Cruzamentos | Calendário
// ─────────────────────────────────────────────────────────────
function ReproPainel({
  registrosRepro, eguasRepro, vetsExternos, propRepro, locaisRepro,
  currentUser, updateRegistroReproducao,
}) {
  const [sub, setSub] = useState('dashboard');
  const abas = [
    ['dashboard', 'Dashboard'],
    ['cruzamentos', 'Cruzamentos'],
    ['calendario', 'Calendário'],
  ];
  return (
    <div>
      <TopBar title="Painel" subtitle="Dashboard · Cruzamentos · Calendário" />
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
        {abas.map(([id, lbl]) => (
          <button key={id} onClick={() => setSub(id)} style={{
            flex: 1, padding: '11px 4px', border: 'none', background: 'none',
            borderBottom: `2px solid ${sub === id ? CORES_TAB_ATIVA : 'transparent'}`,
            color: sub === id ? CORES_TAB_ATIVA : 'var(--ink-3)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>{lbl}</button>
        ))}
      </div>
      {sub === 'dashboard' && (
        <ReproDashboard
          registrosRepro={registrosRepro}
          eguasRepro={eguasRepro}
          vetsExternos={vetsExternos}
          currentUser={currentUser}
        />
      )}
      {sub === 'cruzamentos' && (
        <ReproCruzamentos
          registrosRepro={registrosRepro}
          eguasRepro={eguasRepro}
          propRepro={propRepro}
          vetsExternos={vetsExternos}
          updateRegistroReproducao={updateRegistroReproducao}
        />
      )}
      {sub === 'calendario' && (
        <ReproCalendario
          registrosRepro={registrosRepro}
          eguasRepro={eguasRepro}
          locaisRepro={locaisRepro}
          vetsExternos={vetsExternos}
        />
      )}
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────
function ReproDashboard({ registrosRepro, eguasRepro, vetsExternos, currentUser }) {
  const hoje = new Date();
  const [mesRef, setMesRef] = useState({ mes: hoje.getMonth() + 1, ano: hoje.getFullYear() });
  const [filtroVetId, setFiltroVetId] = useState('');

  const emMes = (iso) => {
    if (!iso) return false;
    const [y, m] = iso.split('-');
    return Number(y) === mesRef.ano && Number(m) === mesRef.mes;
  };

  const regs = (registrosRepro || []).filter(r => {
    if (!emMes(r.data)) return false;
    if (filtroVetId && r.vetId !== filtroVetId) return false;
    return true;
  });

  // Totais por tipo
  const totalIA = regs.filter(r => r.tipo === 'inseminacao_artificial').length;
  const totalTE = regs.filter(r => r.tipo === 'transferencia_embriao').length;
  const totalCF = regs.filter(r => r.tipo === 'controle_folicular').length;
  const totalDG = regs.filter(r => r.tipo === 'diagnostico_gestacao').length;
  const totalSV = regs.filter(r => r.tipo === 'servico_avulso').length;

  // % IA que viraram TE (destino=transferencia)
  const iaTransfer = regs.filter(r => r.tipo === 'inseminacao_artificial' && r.dados?.destino === 'transferencia').length;
  const pctIaTe = totalIA ? Math.round((iaTransfer / totalIA) * 100) : 0;

  // % TE positivas
  const tePos = regs.filter(r => r.tipo === 'transferencia_embriao' && r.dados?.resultado === 'positivo').length;
  const teNeg = regs.filter(r => r.tipo === 'transferencia_embriao' && r.dados?.resultado === 'negativo').length;
  const pctTePos = (tePos + teNeg) ? Math.round((tePos / (tePos + teNeg)) * 100) : 0;

  // Taxa DG15/30/45 — considera registros com dg15/dg30/dg45 marcado (positivo|negativo)
  const contarDg = (chave) => {
    const total = regs.filter(r => r.dados?.[chave] === 'positivo' || r.dados?.[chave] === 'negativo').length;
    const pos = regs.filter(r => r.dados?.[chave] === 'positivo').length;
    return { total, pos, pct: total ? Math.round((pos / total) * 100) : 0 };
  };
  const dg15 = contarDg('dg15');
  const dg30 = contarDg('dg30');
  const dg45 = contarDg('dg45');

  const cards = [
    { label: 'IA', valor: totalIA, cor: '#7c2d8c', bg: '#f5e8ff' },
    { label: 'TE', valor: totalTE, cor: '#0e7490', bg: '#cffafe' },
    { label: 'CF', valor: totalCF, cor: '#0e7490', bg: '#cffafe' },
    { label: 'DG', valor: totalDG, cor: '#15803d', bg: '#dcfce7' },
    { label: 'SV', valor: totalSV, cor: '#c2410c', bg: '#fed7aa' },
  ];

  return (
    <div>
      <NavMes mesRef={mesRef} setMesRef={setMesRef} />
      <div style={{ padding: '4px 20px 8px' }}>
        <FiltroVet vets={vetsExternos} valor={filtroVetId} onChange={setFiltroVetId} />
      </div>

      <div style={{ padding: '4px 20px 8px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {cards.map(c => (
          <div key={c.label} style={{
            background: c.bg, border: `1px solid ${c.cor}30`, borderRadius: 10, padding: '10px 6px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: c.cor }}>{c.valor}</div>
            <div style={{ fontSize: 10, color: c.cor, fontWeight: 700, letterSpacing: '0.06em' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 20px 20px' }}>
        <BarraPercentual titulo="IA que viraram TE" valor={pctIaTe} totalLabel={`${iaTransfer}/${totalIA}`} cor="#7c2d8c" />
        <BarraPercentual titulo="TE positivas" valor={pctTePos} totalLabel={`${tePos}/${tePos + teNeg}`} cor="#0e7490" />
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: 12, marginTop: 8,
        }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontWeight: 700 }}>
            Diagnósticos gestacionais
          </div>
          {[['DG 15', dg15], ['DG 30', dg30], ['DG 45', dg45]].map(([lbl, d]) => (
            <div key={lbl} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--ink)' }}>{lbl}</span>
                <span style={{ color: 'var(--ink-3)' }}>{d.pos}/{d.total} · {d.pct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--soft)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${d.pct}%`, height: '100%', background: '#15803d' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const FiltroVet = ({ vets, valor, onChange }) => (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    <button onClick={() => onChange('')} style={filtroBtn(!valor)}>Todos</button>
    {vets.map(v => (
      <button key={v.id} onClick={() => onChange(v.id === valor ? '' : v.id)} style={{
        ...filtroBtn(valor === v.id),
        borderColor: valor === v.id ? v.cor : 'var(--line)',
        color: valor === v.id ? v.cor : 'var(--ink-3)',
      }}>
        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: v.cor, marginRight: 4 }} />
        {v.nome.split(' ')[0]}
      </button>
    ))}
  </div>
);
const filtroBtn = (ativo) => ({
  padding: '6px 10px', borderRadius: 20, border: `1px solid ${ativo ? 'var(--ink)' : 'var(--line)'}`,
  background: ativo ? 'var(--card)' : 'transparent', color: ativo ? 'var(--ink)' : 'var(--ink-3)',
  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)',
});

const BarraPercentual = ({ titulo, valor, totalLabel, cor }) => (
  <div style={{
    background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: 12, marginBottom: 8,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
      <span style={{ color: 'var(--ink)' }}>{titulo}</span>
      <span style={{ color: 'var(--ink-3)' }}>{totalLabel} · <strong style={{ color: cor }}>{valor}%</strong></span>
    </div>
    <div style={{ height: 8, background: 'var(--soft)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${valor}%`, height: '100%', background: cor }} />
    </div>
  </div>
);

// ── Cruzamentos confirmados (DG45+) ─────────────────────────
// Listamos éguas cuja gestação foi confirmada em DG45. O checklist
// (comunicado cobertura, pré-registro, inspeção) fica salvo em
// registro.dados.checklistCobertura no MESMO registro que carrega o dg45.
function ReproCruzamentos({ registrosRepro, eguasRepro, propRepro, vetsExternos, updateRegistroReproducao }) {
  const [filtroVetId, setFiltroVetId] = useState('');
  const [ocultarConcluidos, setOcultarConcluidos] = useState(false);

  // Qualquer registro com dg45=='positivo' vira uma "confirmação".
  const confirmados = (registrosRepro || [])
    .filter(r => r.dados?.dg45 === 'positivo')
    .filter(r => !filtroVetId || r.vetId === filtroVetId)
    .sort((a, b) => (b.dados?.dg45_data || b.data || '').localeCompare(a.dados?.dg45_data || a.data || ''));

  const salvarCheck = (r, campo, valor) => {
    const cur = r.dados?.checklistCobertura || {};
    const novo = { ...cur, [campo]: valor };
    updateRegistroReproducao(r.id, { dados: { ...(r.dados || {}), checklistCobertura: novo } });
  };

  const isConcluido = (r) => {
    const c = r.dados?.checklistCobertura || {};
    return c.comunicadoCobertura && c.preRegistro && c.inspecaoZootecnica;
  };

  const visiveis = ocultarConcluidos ? confirmados.filter(r => !isConcluido(r)) : confirmados;

  return (
    <div>
      <div style={{ padding: '12px 20px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <FiltroVet vets={vetsExternos} valor={filtroVetId} onChange={setFiltroVetId} />
        <label style={{
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          fontSize: 12, color: 'var(--ink-2)',
        }}>
          <input type="checkbox" checked={ocultarConcluidos} onChange={e => setOcultarConcluidos(e.target.checked)} />
          Ocultar cruzamentos com checklist completa
        </label>
      </div>

      <div style={{ padding: '4px 20px 20px' }}>
        {visiveis.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
            {confirmados.length === 0 ? 'Nenhum cruzamento confirmado (DG45+) ainda.' : 'Todos os cruzamentos filtrados estão com checklist completo.'}
          </div>
        )}
        {visiveis.map(r => {
          const egua = eguasRepro.find(e => e.id === r.eguaId);
          const prop = egua && propRepro.find(p => (egua.proprietarioIds || [egua.proprietarioId]).includes(p.id));
          const vet = vetsExternos.find(v => v.id === r.vetId);
          const c = r.dados?.checklistCobertura || {};
          const dg45Data = r.dados?.dg45_data || r.data;
          const completo = isConcluido(r);
          return (
            <div key={r.id} style={{
              background: completo ? '#ecfdf5' : 'var(--card)',
              border: `1px solid ${completo ? '#a7f3d0' : 'var(--line)'}`,
              borderRadius: 14, padding: '12px 14px', marginBottom: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 34, background: vet?.cor || CORES_TAB_ATIVA, color: '#fff',
                  display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>{(egua?.nome || 'E').slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>{egua?.nome || 'Égua'}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                    {prop?.nome || '—'} · DG45 {fmtDataBr(dg45Data)} {vet ? `· ${vet.nome.split(' ')[0]}` : ''}
                  </div>
                </div>
                {completo && (
                  <div style={{
                    fontSize: 10, background: '#15803d', color: '#fff', padding: '3px 7px', borderRadius: 4, fontWeight: 700,
                  }}>OK</div>
                )}
              </div>

              {[
                ['comunicadoCobertura', 'Comunicado de cobertura'],
                ['preRegistro', 'Pré-registro'],
                ['inspecaoZootecnica', 'Inspeção zootécnica'],
              ].map(([campo, label]) => (
                <label key={campo} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                  cursor: 'pointer', fontSize: 13, color: 'var(--ink)',
                }}>
                  <input
                    type="checkbox"
                    checked={!!c[campo]}
                    onChange={e => salvarCheck(r, campo, e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span style={{ textDecoration: c[campo] ? 'line-through' : 'none', opacity: c[campo] ? 0.6 : 1 }}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ── Calendário mensal (grid 7×N) ─────────────────────────────
function ReproCalendario({ registrosRepro, eguasRepro, locaisRepro, vetsExternos }) {
  const hoje = new Date();
  const [mesRef, setMesRef] = useState({ mes: hoje.getMonth() + 1, ano: hoje.getFullYear() });
  const [diaAberto, setDiaAberto] = useState(null); // iso YYYY-MM-DD

  // Gera 42 células (6 semanas) a partir da 1ª segunda antes/no dia 1
  const primeiroDia = new Date(mesRef.ano, mesRef.mes - 1, 1);
  const primeiroSemana = new Date(primeiroDia);
  // desloca até o domingo anterior (grid começa no domingo)
  primeiroSemana.setDate(primeiroSemana.getDate() - primeiroDia.getDay());
  const celulas = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(primeiroSemana);
    d.setDate(d.getDate() + i);
    celulas.push(d);
  }

  // Coleta todos os eventos e mapeia por data ISO
  const eventosPorDia = new Map();
  const add = (iso, ev) => {
    if (!iso) return;
    if (!eventosPorDia.has(iso)) eventosPorDia.set(iso, []);
    eventosPorDia.get(iso).push(ev);
  };
  for (const r of (registrosRepro || [])) {
    const dados = r.dados || {};
    if (r.data) add(r.data, { r, tipoEv: 'procedimento', dataEv: r.data });
    if (r.dataRetorno) add(r.dataRetorno, { r, tipoEv: 'retorno', dataEv: r.dataRetorno });
    if (dados.dataColetaAgendada) add(dados.dataColetaAgendada, { r, tipoEv: 'coleta', dataEv: dados.dataColetaAgendada });
  }

  const isoDe = (d) => d.toISOString().slice(0, 10);
  const hojeIso = isoDe(new Date());
  const mesAtivo = (d) => (d.getMonth() + 1) === mesRef.mes && d.getFullYear() === mesRef.ano;

  const dias = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const eventosDia = diaAberto ? (eventosPorDia.get(diaAberto) || []) : [];

  return (
    <div>
      <NavMes mesRef={mesRef} setMesRef={setMesRef} />
      <div style={{ padding: '4px 10px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
          {dias.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, color: 'var(--ink-3)', fontWeight: 700, padding: '4px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {celulas.map((d, i) => {
            const iso = isoDe(d);
            const inMes = mesAtivo(d);
            const isHoje = iso === hojeIso;
            const evs = eventosPorDia.get(iso) || [];
            // até 6 bolinhas (cores dos vets únicos, com repeats por evento)
            const bolinhas = evs.slice(0, 6);
            return (
              <button
                key={i}
                onClick={() => setDiaAberto(iso)}
                style={{
                  aspectRatio: '1 / 1', minHeight: 40,
                  background: isHoje ? '#f5e8ff' : (inMes ? 'var(--card)' : 'transparent'),
                  border: `1px solid ${isHoje ? CORES_TAB_ATIVA : 'var(--line)'}`,
                  borderRadius: 8, padding: 4, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'space-between',
                  opacity: inMes ? 1 : 0.35,
                  color: 'var(--ink)',
                }}
              >
                <div style={{
                  fontSize: 11, fontWeight: isHoje ? 700 : 500,
                  color: isHoje ? CORES_TAB_ATIVA : 'var(--ink-2)', textAlign: 'right',
                }}>
                  {d.getDate()}
                </div>
                {bolinhas.length > 0 && (
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                    {bolinhas.map((ev, j) => {
                      const vet = vetsExternos.find(v => v.id === ev.r.vetId);
                      return (
                        <div key={j} style={{
                          width: 6, height: 6, borderRadius: 6,
                          background: vet?.cor || CORES_TAB_ATIVA,
                        }} />
                      );
                    })}
                    {evs.length > 6 && (
                      <div style={{ fontSize: 8, color: 'var(--ink-3)', lineHeight: 1 }}>+{evs.length - 6}</div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legenda das cores dos vets */}
        {vetsExternos.length > 0 && (
          <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontWeight: 700 }}>Vets</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {vetsExternos.map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ink-2)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 8, background: v.cor || CORES_TAB_ATIVA }} />
                  {v.nome.split(' ')[0]}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {diaAberto && (
        <Modal onClose={() => setDiaAberto(null)}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginBottom: 12 }}>
            {fmtDataBr(diaAberto)}
          </div>
          {eventosDia.length === 0 && (
            <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: '10px 0' }}>Sem eventos.</div>
          )}
          {eventosDia.map((ev, i) => {
            const vet = vetsExternos.find(v => v.id === ev.r.vetId);
            const egua = eguasRepro.find(e => e.id === ev.r.eguaId);
            const local = locaisRepro.find(l => l.id === ev.r.localId);
            const rotuloEv = ev.tipoEv === 'procedimento'
              ? (TIPO_META[ev.r.tipo]?.short || '—')
              : ev.tipoEv === 'retorno' ? 'Retorno' : 'Coleta';
            return (
              <div key={i} style={{
                background: 'var(--card)', border: '1px solid var(--line)',
                borderLeft: `3px solid ${vet?.cor || CORES_TAB_ATIVA}`,
                borderRadius: 10, padding: '10px 12px', marginBottom: 8,
              }}>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  {rotuloEv}
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)', marginTop: 2 }}>{egua?.nome || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
                  {local?.nome || '—'}{vet ? ` · ${vet.nome.split(' ')[0]}` : ''}
                </div>
              </div>
            );
          })}
        </Modal>
      )}
    </div>
  );
}

function ReproCobrancas({
  currentUser, locaisRepro, vetKmLocais, upsertVetKmLocal,
  proprietarios, propRepro, cavalos, registrosRepro, servicos, insumos,
  vetsExternos, empresaInfo,
}) {
  const [sub, setSub] = useState('faturas');
  const abas = [
    ['faturas', 'Faturas'],
    ['km', 'Km por local'],
    ['divisao', 'Divisão'],
  ];
  return (
    <div>
      <TopBar title="Cobranças" subtitle="Faturas · Km · Divisão da equipe" />
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
        {abas.map(([id, lbl]) => (
          <button key={id} onClick={() => setSub(id)} style={{
            flex: 1, padding: '11px 4px', border: 'none', background: 'none',
            borderBottom: `2px solid ${sub === id ? CORES_TAB_ATIVA : 'transparent'}`,
            color: sub === id ? CORES_TAB_ATIVA : 'var(--ink-3)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>{lbl}</button>
        ))}
      </div>
      {sub === 'km' && (
        <ReproCobKm
          currentUser={currentUser}
          locaisRepro={locaisRepro}
          vetKmLocais={vetKmLocais}
          upsertVetKmLocal={upsertVetKmLocal}
        />
      )}
      {sub === 'faturas' && (
        <ReproFaturas
          propRepro={propRepro}
          registros={registrosRepro}
          cavalos={cavalos}
          proprietarios={proprietarios}
          servicos={servicos}
          insumos={insumos}
          vetKmLocais={vetKmLocais}
          locais={locaisRepro}
          vetsExternos={vetsExternos}
          empresaInfo={empresaInfo}
        />
      )}
      {sub === 'divisao' && (
        <ReproDivisao
          propRepro={propRepro}
          registros={registrosRepro}
          cavalos={cavalos}
          proprietarios={proprietarios}
          servicos={servicos}
          insumos={insumos}
          vetKmLocais={vetKmLocais}
          locais={locaisRepro}
          vetsExternos={vetsExternos}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Navegador de mês (compartilhado por Faturas e Divisão)
// ─────────────────────────────────────────────────────────────
function NavMes({ mesRef, setMesRef }) {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mudar = (delta) => {
    let m = mesRef.mes + delta;
    let a = mesRef.ano;
    if (m < 1) { m = 12; a -= 1; }
    if (m > 12) { m = 1; a += 1; }
    setMesRef({ mes: m, ano: a });
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px 6px',
    }}>
      <button onClick={() => mudar(-1)} style={navBtn}>‹</button>
      <div style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>
        {meses[mesRef.mes - 1]} · {mesRef.ano}
      </div>
      <button onClick={() => mudar(1)} style={navBtn}>›</button>
    </div>
  );
}
const navBtn = {
  width: 34, height: 34, borderRadius: 10, border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--ink-2)', cursor: 'pointer',
  fontSize: 16, fontWeight: 700, display: 'grid', placeItems: 'center',
};

// ─────────────────────────────────────────────────────────────
// Lista de faturas do mês por proprietário (workspace repro)
// ─────────────────────────────────────────────────────────────
function ReproFaturas({
  propRepro, registros, cavalos, proprietarios, servicos, insumos,
  vetKmLocais, locais, vetsExternos, empresaInfo,
}) {
  const hoje = new Date();
  const [mesRef, setMesRef] = useState({ mes: hoje.getMonth() + 1, ano: hoje.getFullYear() });
  const [propAberto, setPropAberto] = useState(null);

  const deps = { registros, cavalos, proprietarios, servicos, insumos, vetKmLocais, locais };
  const lista = [...propRepro]
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'))
    .map(p => ({ prop: p, fat: calcFaturaRepro(p.id, mesRef, deps) }))
    .filter(x => x.fat.total > 0);

  if (propAberto) {
    const item = lista.find(x => x.prop.id === propAberto);
    if (item) {
      return (
        <ReproFaturaDetalhe
          fatura={item.fat}
          empresaInfo={empresaInfo}
          vetsExternos={vetsExternos}
          onBack={() => setPropAberto(null)}
        />
      );
    }
  }

  const totalMes = lista.reduce((s, x) => s + x.fat.total, 0);

  return (
    <div>
      <NavMes mesRef={mesRef} setMesRef={setMesRef} />
      <div style={{
        margin: '4px 20px 12px', padding: '10px 14px', background: 'var(--card)',
        border: '1px solid var(--line)', borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Total do mês</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)' }}>{formatBRL(totalMes)}</div>
      </div>
      <div style={{ padding: '4px 20px 20px' }}>
        {lista.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
            Sem faturas pra fechar neste mês.
          </div>
        )}
        {lista.map(({ prop, fat }) => (
          <button key={prop.id} onClick={() => setPropAberto(prop.id)} style={{
            width: '100%', textAlign: 'left', cursor: 'pointer',
            background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 12, padding: '12px 14px', marginBottom: 8, color: 'var(--ink)',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 15, flex: 1, minWidth: 0 }}>{prop.nome}</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{formatBRL(fat.total)}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
              {[
                fat.visitasLinhas.length ? `${fat.visitasLinhas.length} visita(s)` : null,
                fat.insumosLinhas.length ? `${fat.insumosLinhas.length} insumo(s)` : null,
                fat.procedimentosLinhas.length ? `${fat.procedimentosLinhas.length} proc.` : null,
                fat.avulsosLinhas.length ? `${fat.avulsosLinhas.length} avulso(s)` : null,
                fat.resultadosLinhas.length ? `${fat.resultadosLinhas.length} DG30+` : null,
              ].filter(Boolean).join(' · ')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Detalhe da fatura + PDF
// ─────────────────────────────────────────────────────────────
function ReproFaturaDetalhe({ fatura, empresaInfo, vetsExternos, onBack }) {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mesNome = meses[fatura.ref.mes - 1];

  const baixarPdf = () => {
    const doc = gerarPdfFaturaRepro({ fatura, mesNome, empresa: empresaInfo || {}, vetsExternos });
    doc.save(nomePdfFaturaRepro(fatura.proprietario, fatura.ref, mesNome));
  };

  const vetNome = (id) => (vetsExternos.find(v => v.id === id)?.nome) || '—';

  return (
    <div>
      <TopBar title={fatura.proprietario?.nome || '—'} subtitle={`${mesNome} / ${fatura.ref.ano}`} action={
        <button onClick={baixarPdf} style={{
          width: 36, height: 36, borderRadius: 12, background: CORES_TAB_ATIVA,
          border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer',
        }}>
          <Icon name="download" size={16} color="#fff" />
        </button>
      } />
      <div style={{ padding: '4px 20px 0' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer',
          padding: '6px 0', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--sans)',
        }}>
          <Icon name="arrow-left" size={14} /> Voltar
        </button>
      </div>
      <div style={{ padding: '8px 20px 20px' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontWeight: 700 }}>Total</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ink)' }}>{formatBRL(fatura.total)}</div>
        </div>

        {fatura.visitasLinhas.length > 0 && (
          <SecaoFat titulo={`Visitas · ${formatBRL(fatura.visitasTotal)}`} linhas={fatura.visitasLinhas.map(v => ({
            principal: v.localNome,
            sub: `${fmtDataBr(v.data)} · ${vetNome(v.vetId).split(' ')[0]}${v.nProps > 1 ? ` · rateado ${v.nProps}p` : ''}`,
            valor: v.valor,
          }))} />
        )}
        {fatura.insumosLinhas.length > 0 && (
          <SecaoFat titulo={`Insumos · ${formatBRL(fatura.insumosTotal)}`} linhas={fatura.insumosLinhas.map(l => ({
            principal: l.nome, sub: `${fmtDataBr(l.data)} · ${l.qtd} ${l.unidade}`, valor: l.valor,
          }))} />
        )}
        {fatura.procedimentosLinhas.length > 0 && (
          <SecaoFat titulo={`Procedimentos · ${formatBRL(fatura.procedimentosTotal)}`} linhas={fatura.procedimentosLinhas.map(l => ({
            principal: l.descricao, sub: `${fmtDataBr(l.data)} · ${vetNome(l.vetId).split(' ')[0]}`, valor: l.valor,
          }))} />
        )}
        {fatura.avulsosLinhas.length > 0 && (
          <SecaoFat titulo={`Serviços avulsos · ${formatBRL(fatura.avulsosTotal)}`} linhas={fatura.avulsosLinhas.map(l => ({
            principal: l.descricao, sub: `${fmtDataBr(l.data)} · ${vetNome(l.vetId).split(' ')[0]}`, valor: l.valor,
          }))} />
        )}
        {fatura.resultadosLinhas.length > 0 && (
          <SecaoFat titulo={`Resultado repro · ${formatBRL(fatura.resultadosTotal)}`} linhas={fatura.resultadosLinhas.map(l => ({
            principal: l.eguaNome,
            sub: `${fmtDataBr(l.data)} · DG30+${l.vetIdInsem ? ` · insem. ${vetNome(l.vetIdInsem).split(' ')[0]}` : ''}`,
            valor: l.valor,
          }))} />
        )}
      </div>
    </div>
  );
}

const SecaoFat = ({ titulo, linhas }) => (
  <div style={{
    background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
    padding: 12, marginBottom: 10,
  }}>
    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontWeight: 700 }}>
      {titulo}
    </div>
    {linhas.map((l, i) => (
      <div key={i} style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0',
        borderTop: i === 0 ? 'none' : '1px solid var(--line-soft, var(--line))',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>{l.principal}</div>
          {l.sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{l.sub}</div>}
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)' }}>{formatBRL(l.valor)}</div>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Divisão da equipe — soma das faturas do mês → split por vet + Epona
// ─────────────────────────────────────────────────────────────
function ReproDivisao({
  propRepro, registros, cavalos, proprietarios, servicos, insumos,
  vetKmLocais, locais, vetsExternos,
}) {
  const hoje = new Date();
  const [mesRef, setMesRef] = useState({ mes: hoje.getMonth() + 1, ano: hoje.getFullYear() });

  const deps = { registros, cavalos, proprietarios, servicos, insumos, vetKmLocais, locais };
  const acc = { epona: 0, porVet: {} };
  let totalMes = 0;
  for (const p of propRepro) {
    const fat = calcFaturaRepro(p.id, mesRef, deps);
    totalMes += fat.total;
    const d = dividirFatura(fat);
    acc.epona += d.epona;
    for (const [vetId, v] of Object.entries(d.porVet)) {
      acc.porVet[vetId] = (acc.porVet[vetId] || 0) + v;
    }
  }
  const linhasVets = Object.entries(acc.porVet)
    .map(([vetId, v]) => ({ vet: vetsExternos.find(x => x.id === vetId), valor: v }))
    .filter(l => l.vet)
    .sort((a, b) => b.valor - a.valor);
  const totalDividido = acc.epona + linhasVets.reduce((s, l) => s + l.valor, 0);

  return (
    <div>
      <NavMes mesRef={mesRef} setMesRef={setMesRef} />
      <div style={{ padding: '4px 20px 6px' }}>
        <div style={{
          background: '#f5e8ff', border: '1px solid #d8b4fe', borderRadius: 12,
          padding: '10px 14px', fontSize: 12, color: '#6b21a8', lineHeight: 1.4,
        }}>
          Regras: <strong>insumos 100 Epona</strong> · <strong>km 100 vet</strong> ·
          <strong> IA/TE 70 vet · 30 Epona</strong> · <strong>resultado 50 vet · 50 Epona</strong> ·
          <strong> avulsos 100 vet</strong>
        </div>
      </div>
      <div style={{ padding: '10px 20px 20px' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Faturado no mês</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--ink)', marginTop: 2 }}>{formatBRL(totalMes)}</div>
          {Math.abs(totalDividido - totalMes) > 0.01 && (
            <div style={{ fontSize: 10, color: '#dc2626', marginTop: 4 }}>
              Divisão: {formatBRL(totalDividido)} (diferença: {formatBRL(totalMes - totalDividido)})
            </div>
          )}
        </div>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
          padding: '12px 14px', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'grid', placeItems: 'center',
          }}>
            <Icon name="building" size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>Epona Stud</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Insumos + 30 IA/TE + 50 resultado</div>
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{formatBRL(acc.epona)}</div>
        </div>

        {linhasVets.map(({ vet, valor }) => (
          <div key={vet.id} style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
            padding: '12px 14px', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 32, background: vet.cor || CORES_TAB_ATIVA, color: '#fff',
              display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700,
            }}>{(vet.nome || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>{vet.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Km + 70 IA/TE + 50 resultado + avulsos</div>
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{formatBRL(valor)}</div>
          </div>
        ))}

        {linhasVets.length === 0 && acc.epona === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ink-3)', fontSize: 12 }}>
            Nada a dividir neste mês.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-tela: km por local (só do vet logado) ──────────────
function ReproCobKm({ currentUser, locaisRepro, vetKmLocais, upsertVetKmLocal }) {
  const [busca, setBusca] = useState('');
  // Estado local do input (edição incremental) — sincroniza com o banco no blur.
  const [rascunho, setRascunho] = useState({});

  const lista = [...locaisRepro]
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'))
    .filter(l => !busca.trim() || norm(`${l.nome} ${l.cidade || ''}`).includes(norm(busca.trim())));

  const valorAtual = (localId) => {
    if (rascunho[localId] !== undefined) return rascunho[localId];
    const k = vetKmLocais.find(x => x.vetId === currentUser.id && x.localId === localId);
    return k ? String(k.valor) : '';
  };

  const salvar = (localId) => {
    const v = rascunho[localId];
    if (v === undefined) return;
    const num = parseFloat(String(v).replace(',', '.')) || 0;
    upsertVetKmLocal(currentUser.id, localId, num);
    setRascunho(r => { const cp = { ...r }; delete cp[localId]; return cp; });
  };

  return (
    <div>
      <div style={{ padding: '12px 20px 0' }}>
        <div style={{
          background: '#f5e8ff', border: '1px solid #d8b4fe', borderRadius: 12,
          padding: '12px 14px', marginBottom: 12, fontSize: 12, color: '#6b21a8', lineHeight: 1.5,
        }}>
          Valor cobrado por <strong>visita</strong> em cada local (kilometragem). Se você atende
          animais de vários proprietários no mesmo dia+local, o valor é rateado entre eles.
        </div>
        <SearchBar value={busca} onChange={setBusca} placeholder="Buscar local…" />
      </div>
      <div style={{ padding: '12px 20px 20px' }}>
        {locaisRepro.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
            Cadastre locais antes (aba Início → Locais).
          </div>
        )}
        {lista.map(l => {
          const v = valorAtual(l.id);
          const dirty = rascunho[l.id] !== undefined;
          return (
            <div key={l.id} style={{
              background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
              padding: '12px 14px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>{l.nome}</div>
                {(l.cidade || l.estado) && (
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{[l.cidade, l.estado].filter(Boolean).join(' / ')}</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>R$</span>
                <input
                  type="number" min="0" step="0.01"
                  value={v}
                  onChange={e => setRascunho(r => ({ ...r, [l.id]: e.target.value }))}
                  onBlur={() => salvar(l.id)}
                  placeholder="0,00"
                  style={{
                    width: 90, textAlign: 'right', padding: '8px 10px', borderRadius: 8,
                    border: `1px solid ${dirty ? CORES_TAB_ATIVA : 'var(--line)'}`,
                    background: 'var(--bg)', fontSize: 13, color: 'var(--ink)', outline: 'none',
                    fontFamily: 'var(--sans)',
                  }}
                />
                {dirty && (
                  <button onClick={() => salvar(l.id)} style={{
                    padding: '8px 10px', borderRadius: 8, border: 'none', background: CORES_TAB_ATIVA, color: '#fff',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)',
                  }}>OK</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sub-tela: catálogo (insumos ou serviços) do workspace repro ──
function ReproCobCatalogo({ tipo, itens, addItem, updateItem, deleteItem }) {
  const [busca, setBusca] = useState('');
  const [importando, setImportando] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', valor: '' });

  const doHaras = itens.filter(i => (i.workspaceId || 'haras') === 'haras');
  const doRepro = itens.filter(i => i.workspaceId === 'repro');

  const lista = [...doRepro]
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'))
    .filter(i => !busca.trim() || norm(i.nome || '').includes(norm(busca.trim())));

  const importarDoHaras = async () => {
    if (doHaras.length === 0) return;
    if (!window.confirm(`Importar ${doHaras.length} ${tipo === 'insumos' ? 'insumo(s)' : 'serviço(s)'} do haras? Você poderá editar os valores sem afetar o haras.`)) return;
    setImportando(true);
    try {
      // Clona cada item com id novo e workspace='repro'
      const jaImportadosNomes = new Set(doRepro.map(i => (i.nome || '').toLowerCase()));
      for (const item of doHaras) {
        if (jaImportadosNomes.has((item.nome || '').toLowerCase())) continue;
        const clone = {
          ...item,
          id: (tipo === 'insumos' ? 'i_r_' : 's_r_') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          workspaceId: 'repro',
        };
        // eslint-disable-next-line no-await-in-loop
        await addItem(clone);
      }
    } finally { setImportando(false); }
  };

  const abrirNovo = () => {
    setEditId(null);
    setForm({ nome: '', valor: '' });
    setShowForm(true);
  };
  const abrirEditar = (i) => {
    setEditId(i.id);
    setForm({ nome: i.nome, valor: String(tipo === 'insumos' ? (i.valorVenda ?? 0) : (i.valor ?? 0)) });
    setShowForm(true);
  };
  const salvar = () => {
    if (!form.nome.trim()) return;
    const valorNum = parseFloat(String(form.valor).replace(',', '.')) || 0;
    if (editId) {
      const patch = tipo === 'insumos' ? { nome: form.nome.trim(), valorVenda: valorNum } : { nome: form.nome.trim(), valor: valorNum };
      updateItem(editId, patch);
    } else {
      const base = tipo === 'insumos'
        ? { id: 'i_r_' + Date.now().toString(36), nome: form.nome.trim(), categoria: 'descartavel', unidade: 'un', valorVenda: valorNum, valorCompra: 0, workspaceId: 'repro' }
        : { id: 's_r_' + Date.now().toString(36), nome: form.nome.trim(), categoria: 'veterinario', valor: valorNum, workspaceId: 'repro' };
      addItem(base);
    }
    setShowForm(false);
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--line)', background: 'var(--bg)', fontSize: 14, color: 'var(--ink)',
    fontFamily: 'var(--sans)', outline: 'none',
  };

  return (
    <div>
      <div style={{ padding: '12px 20px 0' }}>
        <SearchBar value={busca} onChange={setBusca} placeholder={`Buscar ${tipo === 'insumos' ? 'insumo' : 'serviço'}…`} />
      </div>
      <div style={{ padding: '10px 20px 0', display: 'flex', gap: 8 }}>
        <button onClick={abrirNovo} style={{
          flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: CORES_TAB_ATIVA, color: '#fff',
          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)',
        }}>+ Novo</button>
        {doHaras.length > 0 && (
          <button onClick={importarDoHaras} disabled={importando} style={{
            flex: 2, padding: '10px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-2)',
            fontSize: 12, fontWeight: 600, cursor: importando ? 'default' : 'pointer', fontFamily: 'var(--sans)', opacity: importando ? 0.6 : 1,
          }}>{importando ? 'Importando…' : `Importar catálogo do haras (${doHaras.length})`}</button>
        )}
      </div>
      <div style={{ padding: '12px 20px 20px' }}>
        {lista.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
            {busca ? 'Nada encontrado.' : `Sem ${tipo === 'insumos' ? 'insumos' : 'serviços'} cadastrados. Toque "Importar catálogo do haras" pra clonar tudo.`}
          </div>
        )}
        {lista.map(i => (
          <div key={i.id} style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
            padding: '12px 14px', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>{i.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                {tipo === 'insumos' ? `${i.categoria || '—'} · ${i.unidade || 'un'}` : (i.categoria || '—')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>
                {formatBRL(tipo === 'insumos' ? (i.valorVenda || 0) : (i.valor || 0))}
              </div>
              {tipo === 'insumos' && <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>por {i.unidade || 'un'}</div>}
            </div>
            <button onClick={() => abrirEditar(i)} style={{
              width: 32, height: 32, borderRadius: 10, border: '1px solid var(--line)',
              background: 'transparent', display: 'grid', placeItems: 'center', color: 'var(--ink-3)', cursor: 'pointer',
            }}>
              <Icon name="edit" size={14} />
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, marginBottom: 14 }}>
            {editId ? `Editar ${tipo === 'insumos' ? 'insumo' : 'serviço'}` : `Novo ${tipo === 'insumos' ? 'insumo' : 'serviço'}`}
          </div>
          <FormField label="Nome">
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inputStyle} autoFocus />
          </FormField>
          <FormField label={tipo === 'insumos' ? 'Valor de venda (R$)' : 'Valor (R$)'}>
            <input type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} style={inputStyle} placeholder="0,00" />
          </FormField>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {editId && deleteItem && (
              <button onClick={() => { if (window.confirm(`Excluir ${form.nome}?`)) { deleteItem(editId); setShowForm(false); } }} style={{
                padding: '11px 14px', borderRadius: 10, border: '1px solid #dc262640', background: '#fee2e2', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)',
              }}>Excluir</button>
            )}
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Cancelar</button>
            <button onClick={salvar} disabled={!form.nome.trim()} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: CORES_TAB_ATIVA, color: '#fff', fontSize: 13, fontWeight: 700, cursor: form.nome.trim() ? 'pointer' : 'default', fontFamily: 'var(--sans)', opacity: form.nome.trim() ? 1 : 0.5 }}>{editId ? 'Salvar' : 'Criar'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shell principal — decide qual tela renderizar
// ─────────────────────────────────────────────────────────────
export function ReproApp({
  currentUser, vetsExternos, locaisRepro, proprietarios, cavalos, registrosReproducao = [],
  insumos = [], servicos = [],
  vetKmLocais = [], upsertVetKmLocal,
  avisosRepro = [], resolverAvisoRepro,
  empresaInfo = null,
  addLocalRepro, updateLocalRepro, deleteLocalRepro,
  addProprietario, updateProprietario, deleteProprietario,
  addCavalo, updateCavalo, deleteCavalo,
  addInsumo, updateInsumo, deleteInsumo,
  addServico, updateServico, deleteServico,
  addRegistroReproducao, updateRegistroReproducao, deleteRegistroReproducao,
  onLogout,
}) {
  const [screen, setScreen] = useState('repro-home');
  const [tab, setTab] = useState('home');
  const [cadSub, setCadSub] = useState('locais');
  const [localSelecionado, setLocalSelecionado] = useState(null);

  // Filtra dados por workspace='repro'
  const propRepro = useMemo(() => proprietarios.filter(p => p.workspaceId === 'repro'), [proprietarios]);
  const eguasRepro = useMemo(() => cavalos.filter(c => c.workspaceId === 'repro'), [cavalos]);
  const registrosRepro = useMemo(() => (registrosReproducao || []).filter(r => r.workspaceId === 'repro'), [registrosReproducao]);
  const insumosRepro = useMemo(() => insumos.filter(i => i.workspaceId === 'repro' || i.workspaceId === 'haras'), [insumos]);
  const servicosRepro = useMemo(() => servicos.filter(s => s.workspaceId === 'repro' || s.workspaceId === 'haras'), [servicos]);

  const goCadastros = (sub = 'locais') => { setCadSub(sub); setLocalSelecionado(null); setTab('cadastros'); setScreen('repro-cadastros'); };

  let content;
  if (screen === 'repro-home') {
    content = <ReproHome
      currentUser={currentUser}
      locaisRepro={locaisRepro}
      propRepro={propRepro}
      eguasRepro={eguasRepro}
      vetsExternos={vetsExternos}
      registrosRepro={registrosRepro}
      avisosRepro={avisosRepro}
      resolverAvisoRepro={resolverAvisoRepro}
      setScreen={setScreen}
      setTab={setTab}
      goCadastros={goCadastros}
    />;
  } else if (screen === 'repro-cadastros') {
    if (localSelecionado) {
      const l = locaisRepro.find(x => x.id === localSelecionado) || null;
      if (!l) {
        setLocalSelecionado(null);
        content = null;
      } else {
        content = <ReproLocalDetalhe
          local={l}
          vetsExternos={vetsExternos}
          vetKmLocais={vetKmLocais}
          onBack={() => setLocalSelecionado(null)}
          onEdit={() => { setLocalSelecionado(null); /* edição via ReproLocais → botão edit */ }}
        />;
      }
    } else {
      content = <ReproCadastros
        currentUser={currentUser}
        vetsExternos={vetsExternos}
        locaisRepro={locaisRepro}
        propRepro={propRepro}
        eguasRepro={eguasRepro}
        insumos={insumosRepro}
        servicos={servicosRepro}
        vetKmLocais={vetKmLocais}
        addLocalRepro={addLocalRepro}
        updateLocalRepro={updateLocalRepro}
        deleteLocalRepro={deleteLocalRepro}
        addProprietario={addProprietario}
        updateProprietario={updateProprietario}
        deleteProprietario={deleteProprietario}
        addCavalo={addCavalo}
        updateCavalo={updateCavalo}
        deleteCavalo={deleteCavalo}
        addInsumo={addInsumo}
        updateInsumo={updateInsumo}
        deleteInsumo={deleteInsumo}
        addServico={addServico}
        updateServico={updateServico}
        deleteServico={deleteServico}
        subInicial={cadSub}
        onOpenLocal={(l) => setLocalSelecionado(l.id)}
      />;
    }
  } else if (screen === 'repro-caderno') {
    content = <ReproCaderno
      registrosRepro={registrosRepro}
      eguasRepro={eguasRepro}
      propRepro={propRepro}
      locaisRepro={locaisRepro}
      vetsExternos={vetsExternos}
      currentUser={currentUser}
      servicos={servicosRepro}
      insumos={insumosRepro}
      addRegistroReproducao={addRegistroReproducao}
      updateRegistroReproducao={updateRegistroReproducao}
      deleteRegistroReproducao={deleteRegistroReproducao}
    />;
  } else if (screen === 'repro-painel') {
    content = <ReproPainel
      registrosRepro={registrosRepro}
      eguasRepro={eguasRepro}
      propRepro={propRepro}
      locaisRepro={locaisRepro}
      vetsExternos={vetsExternos}
      currentUser={currentUser}
      updateRegistroReproducao={updateRegistroReproducao}
    />;
  } else if (screen === 'repro-cobrancas') {
    content = <ReproCobrancas
      currentUser={currentUser}
      locaisRepro={locaisRepro}
      vetKmLocais={vetKmLocais}
      upsertVetKmLocal={upsertVetKmLocal}
      proprietarios={proprietarios}
      propRepro={propRepro}
      cavalos={cavalos}
      registrosRepro={registrosRepro}
      servicos={servicosRepro}
      insumos={insumosRepro}
      vetsExternos={vetsExternos}
      empresaInfo={empresaInfo}
    />;
  } else if (screen === 'repro-conta') {
    content = <ReproConta currentUser={currentUser} onLogout={onLogout} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {content}
      </div>
      <div style={{ flexShrink: 0 }}>
        <TabBar tab={tab} setTab={setTab} setScreen={setScreen} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// UI helpers locais
// ─────────────────────────────────────────────────────────────
const FormField = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, fontWeight: 700 }}>{label}</div>
    {children}
  </div>
);

const SearchBar = ({ value, onChange, placeholder = 'Buscar…' }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'var(--card)', border: '1px solid var(--line)',
    borderRadius: 12, padding: '9px 14px',
  }}>
    <Icon name="search" size={16} color="var(--ink-3)" />
    <input
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)' }}
    />
    {value && (
      <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink-3)', fontSize: 16, lineHeight: 1 }}>×</button>
    )}
  </div>
);

function Modal({ onClose, children }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg)', borderRadius: 16, padding: 24, maxWidth: 440, width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
      }}>{children}</div>
    </div>
  );
}
