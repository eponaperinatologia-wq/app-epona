// repro-app.jsx — Shell do Epona Repro Team.
// Fase 1: Home + Locais + Proprietários (workspace='repro') + Éguas + Caderno + Conta.
// Fase 2 (depois): DG, dashboard, cores no calendário, faturamento km.
import React, { useState, useMemo, useEffect } from 'react';
import { Icon } from './icons';
import { norm, formatBRL } from './data';
import { TopBar } from './screens';
import { trocarSenhaVetExterno } from './auth-vet-externo';
import { calcFaturaRepro, dividirFatura, servicosPadrao } from './utils/faturaRepro';
import { gerarPdfFaturaRepro, nomePdfFaturaRepro } from './utils/pdfFaturaRepro';
import { SwitcherContas } from './multiSessionUi';

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
  setScreen, setTab, goCadastros, onSelectEvento,
}) {
  const goPainelCalendario = () => { setTab('painel'); setScreen('repro-painel'); };
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
      {/* Header — click no avatar/nome vai pra Conta (multilogin) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10, marginBottom: 18,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--ink)' }}>{saudacao}, {nome}.</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Epona Repro Team</div>
        </div>
        <button
          onClick={() => { setTab('conta'); setScreen('repro-conta'); }}
          title="Minha conta · trocar de conta"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px 6px 6px', borderRadius: 999,
            background: 'var(--card)', border: '1px solid var(--line)',
            cursor: 'pointer', color: 'var(--ink-2)', fontFamily: 'var(--sans)',
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 28,
            background: currentUser.cor || CORES_TAB_ATIVA, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {(currentUser.nome || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nome}
          </div>
        </button>
      </div>

      {avisosPend.length > 0 && (
        <MuralAvisos avisos={avisosPend} onResolver={(id) => resolverAvisoRepro(id, currentUser.id)} />
      )}

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
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>Nova IA / CE / CF / DG</div>
        </div>
        <span style={{ fontSize: 20, opacity: 0.85 }}>›</span>
      </button>

      <Planner registros={registrosRepro} eguasRepro={eguasRepro} vetsExternos={vetsExternos} onSelectEvento={onSelectEvento} />

      {/* Calendário mensal — mesmo componente do Painel, com legenda dos vets.
          Click no card do topo abre a versão completa dentro do Painel. */}
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={goPainelCalendario}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 4px 6px', border: 'none', background: 'none',
            color: 'var(--ink-3)', cursor: 'pointer', fontFamily: 'var(--sans)',
          }}
        >
          <Icon name="calendar" size={14} color="var(--ink-3)" />
          <div style={{ flex: 1, textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            Planner mensal
          </div>
          <span style={{ fontSize: 11, opacity: 0.6 }}>abrir ›</span>
        </button>
        <div style={{ marginTop: -8 }}>
          <ReproCalendario
            registrosRepro={registrosRepro}
            eguasRepro={eguasRepro}
            locaisRepro={locaisRepro}
            vetsExternos={vetsExternos}
            onSelectEvento={onSelectEvento}
          />
        </div>
      </div>

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
        display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
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
//
// Regra: procedimento passado JÁ REGISTRADO não é evento — foi
// concluído. Só é evento (pendente/atrasado) o que foi programado
// via dataRetorno ou dados.dataColetaAgendada, e ainda não foi
// "cumprido" por um registro subsequente da mesma égua.
// ─────────────────────────────────────────────────────────────
function Planner({ registros, eguasRepro, vetsExternos, onSelectEvento }) {
  const hoje = new Date().toLocaleDateString('sv-SE');

  const eventos = eventosPendentes(registros, hoje);

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
                  const rotulo = rotuloEvento(ev);
                  return (
                    <button
                      key={i}
                      onClick={() => onSelectEvento && onSelectEvento(ev)}
                      style={{
                        width: '100%', textAlign: 'left', cursor: onSelectEvento ? 'pointer' : 'default',
                        background: 'var(--card)', border: '1px solid var(--line)',
                        borderLeft: `3px solid ${vet?.cor || CORES_TAB_ATIVA}`,
                        borderRadius: 8, padding: '6px 8px', marginTop: 4, color: 'var(--ink)',
                      }}
                    >
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
                    </button>
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
  return { id: r.id, eguaId: r.eguaId, vetId: r.vetId, tipo: r.tipo, registro: r };
}

// Um retorno agendado (registro.dataRetorno) é considerado "cumprido"
// quando existe QUALQUER outro registro da mesma égua com data >= a
// data de retorno. A ideia: se o vet voltou pra atender e registrou
// algo, o retorno virou realidade. Se ele passou da data e não
// registrou nada, o evento está atrasado.
function retornoCumprido(reg, todosRegistros) {
  if (!reg.dataRetorno) return true;
  return (todosRegistros || []).some(other =>
    other.id !== reg.id
    && other.eguaId === reg.eguaId
    && (other.workspaceId || 'haras') === 'repro'
    && other.data && other.data >= reg.dataRetorno,
  );
}

// Coleta agendada (dados.dataColetaAgendada em IA→transferencia) é
// cumprida quando existe um TE (transferencia_embriao) da mesma égua
// com data >= a data agendada.
function coletaCumprida(reg, todosRegistros) {
  const dataAg = reg.dados?.dataColetaAgendada;
  if (!dataAg) return true;
  return (todosRegistros || []).some(other =>
    other.tipo === 'transferencia_embriao'
    && other.eguaId === reg.eguaId
    && (other.workspaceId || 'haras') === 'repro'
    && other.data && other.data >= dataAg,
  );
}
// Indução de ovulação agendada (CF): cumprida quando existe outro
// registro da mesma égua com data >= à data da indução.
function inducaoCumprida(reg, todosRegistros) {
  const dataAg = reg.dados?.dataInducaoOvulacao;
  if (!dataAg) return true;
  return (todosRegistros || []).some(other =>
    other.id !== reg.id
    && other.eguaId === reg.eguaId
    && (other.workspaceId || 'haras') === 'repro'
    && other.data && other.data >= dataAg,
  );
}

// Retorna a lista de eventos que ainda estão pendentes (agendados
// futuros ou atrasados). NÃO inclui procedimentos passados já
// registrados — esses são história, não agenda.
function eventosPendentes(registros, hoje) {
  const out = [];
  for (const r of (registros || [])) {
    if ((r.workspaceId || 'haras') !== 'repro') continue;
    const dados = r.dados || {};
    // Procedimento agendado no futuro (ou hoje) — só faz sentido se a
    // data do próprio registro é futura. Como o vet cria o registro
    // no dia que faz o procedimento, isso normalmente é 'hoje'.
    if (r.data && r.data >= hoje) {
      out.push({ ...eventoBase(r), tipoEv: 'procedimento', dataEv: r.data });
    }
    if (r.dataRetorno && !retornoCumprido(r, registros)) {
      out.push({ ...eventoBase(r), tipoEv: 'retorno', dataEv: r.dataRetorno });
    }
    if (dados.dataColetaAgendada && !coletaCumprida(r, registros)) {
      out.push({ ...eventoBase(r), tipoEv: 'coleta', dataEv: dados.dataColetaAgendada });
    }
    if (dados.dataInducaoOvulacao && !inducaoCumprida(r, registros)) {
      out.push({ ...eventoBase(r), tipoEv: 'inducao', dataEv: dados.dataInducaoOvulacao, hora: dados.horaInducaoOvulacao || '' });
    }
  }
  return out;
}

function rotuloEvento(ev) {
  if (ev.tipoEv === 'retorno') return 'Retorno';
  if (ev.tipoEv === 'coleta') return 'Coleta';
  if (ev.tipoEv === 'inducao') return ev.hora ? `Induzir ${ev.hora}` : 'Induzir';
  return (TIPO_META[ev.tipo]?.short) || '—';
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
function ReproConta({ currentUser, onLogout, sessions = [], activeKey, onSwitchSession, onAddAccount, onRemoveSession }) {
  const confirmarSair = () => {
    if (window.confirm('Deseja realmente sair da sua conta?')) onLogout();
  };
  return (
    <div>
      <TopBar title="Minha conta" />
      <div style={{ padding: '14px 20px 24px' }}>
        {sessions.length > 0 && (
          <SwitcherContas
            sessions={sessions}
            activeKey={activeKey}
            currentUser={currentUser}
            onSwitch={onSwitchSession}
            onAddAccount={onAddAccount}
            onRemoveSession={onRemoveSession}
          />
        )}
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
function ReproEguas({ eguasRepro, propRepro, locaisRepro, addCavalo, updateCavalo, deleteCavalo, onOpenHistorico }) {
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
              {onOpenHistorico && (
                <button onClick={() => onOpenHistorico(e)} title="Histórico reprodutivo" style={{
                  width: 32, height: 32, borderRadius: 10, border: '1px solid var(--line)',
                  background: 'transparent', display: 'grid', placeItems: 'center', color: 'var(--ink-3)', cursor: 'pointer',
                }}>
                  <Icon name="clock" size={14} />
                </button>
              )}
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
// tipo `transferencia_embriao` guarda o dado; label mostra "Coleta de
// Embrião" pra bater com o vocabulário do time (é a etapa em que o
// embrião é coletado da doadora).
const TIPO_META = {
  inseminacao_artificial: { label: 'Inseminação Artificial', short: 'IA', cor: '#7c2d8c', bg: '#f5e8ff' },
  transferencia_embriao:  { label: 'Coleta de Embrião', short: 'CE', cor: '#0e7490', bg: '#cffafe' },
  controle_folicular:     { label: 'Controle Folicular', short: 'CF', cor: '#0e7490', bg: '#cffafe' },
  diagnostico_gestacao:   { label: 'Diagnóstico de Gestação', short: 'DG', cor: '#15803d', bg: '#dcfce7' },
  tratamento_uterino:     { label: 'Tratamento Uterino', short: 'TU', cor: '#b91c1c', bg: '#fee2e2' },
  servico_avulso:         { label: 'Diagnóstico / Avulso', short: 'SV', cor: '#c2410c', bg: '#fed7aa' },
};

// Matchers usados pra localizar serviços/insumos padrão do Tratamento
// Uterino no catálogo. Buscam por nome case/accent insensitive.
const TU_MATCHERS = {
  // Serviços cobrados adicionalmente à linha base "Tratamento Uterino":
  servTratamentoUterino: /tratamento.*uter/i,
  servOzonio:            /ozonio/i,
  servPrp:               /(prp).*(intra|uter)/i,
  // Insumos:
  ringer:                /ringer.*lact/i,
  aguaOxig:              /(agua|água).*oxigen/i,
  dmso:                  /dmso/i,
  riodeine:              /riodeine|riodine|iodo.*degerm/i,
  botukiller:            /botukiller/i,
  luvaPalpacao:          /luva.*palpa|palpa.*luva/i,
  pipetaRigida:          /pipeta.*r[ií]gida|r[ií]gida.*pipeta/i,
  misoprostol:           /misoprostol/i,
};

function resolverPorMatcher(insumos, regex) {
  const repro = insumos.filter(i => i.workspaceId === 'repro' && regex.test(i.nome || ''));
  const haras = insumos.filter(i => (i.workspaceId || 'haras') === 'haras' && regex.test(i.nome || ''));
  return repro[0] || haras[0] || null;
}
function resolverServicoPorMatcher(servicos, regex) {
  const repro = servicos.filter(s => (s.workspaceId || 'haras') === 'repro' && regex.test(s.nome || ''));
  const haras = servicos.filter(s => (s.workspaceId || 'haras') === 'haras' && regex.test(s.nome || ''));
  return repro[0] || haras[0] || null;
}

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
  preFill = null, onConsumirPreFill,
  addRegistroReproducao, updateRegistroReproducao, deleteRegistroReproducao,
}) {
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editReg, setEditReg] = useState(null);
  const [detalheId, setDetalheId] = useState(null);
  const [novoBase, setNovoBase] = useState(null);

  // Se veio um preFill (via click em evento), abre o form auto.
  useEffect(() => {
    if (preFill) {
      setEditReg(null);
      setNovoBase(preFill);
      setShowForm(true);
      onConsumirPreFill && onConsumirPreFill();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preFill]);

  const lista = [...(registrosRepro || [])]
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
    .filter(r => {
      if (!busca.trim()) return true;
      const egua = eguasRepro.find(e => e.id === r.eguaId);
      return norm(`${egua?.nome || ''} ${r.tipo || ''}`).includes(norm(busca.trim()));
    });

  const abrirNovo = () => { setEditReg(null); setNovoBase(null); setShowForm(true); };
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
          novoBase={novoBase}
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
// Regra do haras: cada aplicação de insumo injetável cobra também
// 1 agulha + 1 seringa + 1 dose de algodão com álcool. Repetido aqui.
const DESCARTAVEIS_INJECAO_MATCHERS = [
  { regex: /agulha/i, label: 'agulha' },
  { regex: /seringa/i, label: 'seringa' },
  { regex: /algod[aã]o.*[áa]lcool|[áa]lcool.*algod[aã]o/i, label: 'algodão com álcool' },
];
function _matchInsumos(insumos, matchers) {
  const repro = insumos.filter(i => i.workspaceId === 'repro');
  const haras = insumos.filter(i => (i.workspaceId || 'haras') === 'haras');
  const encontrar = (matcher) => {
    const nomeMatch = (arr) => arr.find(i => matcher.regex.test(i.nome || ''));
    return nomeMatch(repro) || nomeMatch(haras) || null;
  };
  const encontrados = [];
  const faltantes = [];
  for (const m of matchers) {
    const ins = encontrar(m);
    if (ins) encontrados.push({ insumoId: ins.id, qtd: 1, nome: ins.nome });
    else faltantes.push(m.label);
  }
  return { encontrados, faltantes };
}
function resolverDescartaveisIa(insumos) {
  return _matchInsumos(insumos, DESCARTAVEIS_IA_MATCHERS);
}
function resolverDescartaveisInjecao(insumos) {
  return _matchInsumos(insumos, DESCARTAVEIS_INJECAO_MATCHERS);
}

// Deduplica um catálogo (insumos ou serviços) por nome (case/accent
// insensitive), priorizando entradas do workspace 'repro' sobre 'haras'.
// Usado nos dropdowns do form pra evitar mostrar o mesmo item 2 vezes
// quando o vet importou o catálogo do haras.
function dedupPorNome(items) {
  const norm2 = (s) => norm(String(s || '').trim());
  const byNome = new Map();
  for (const it of items) {
    const k = norm2(it.nome);
    if (!k) continue;
    const existente = byNome.get(k);
    if (!existente) { byNome.set(k, it); continue; }
    // repro tem prioridade
    const ehRepro = it.workspaceId === 'repro';
    const existeRepro = existente.workspaceId === 'repro';
    if (ehRepro && !existeRepro) byNome.set(k, it);
  }
  return [...byNome.values()];
}

// ─────────────────────────────────────────────────────────────
// Tratamento Uterino — acordeão com 3 sub-procedimentos: Lavagem,
// Infusão, Misoprostol. Cada um empilha insumos + serviços extras
// no payload; o handleSave lê `dados.tu` pra montar tudo. O
// registro salva o tipo `tratamento_uterino` e cobra:
//   - serviço "Tratamento Uterino" (obrigatório, sempre)
//   - serviços extras (Ozonioterapia, PRP) quando marcados
//   - insumos escolhidos + luva palpação (sempre) + pipeta rígida
//     (obrigatória em Infusão)
// ─────────────────────────────────────────────────────────────
function BlocoTratamentoUterino({ dados, setDado, insumos, servicos, inputStyle }) {
  const tu = dados.tu || {};
  const setTu = (patch) => setDado('tu', { ...tu, ...patch });
  const [aberto, setAberto] = useState({
    lavagem: !!tu.lavagem,
    infusao: !!tu.infusao,
    misoprostol: !!tu.misoprostol,
  });

  // Verifica se serviço base "Tratamento Uterino" está cadastrado
  const svcTratamento = resolverServicoPorMatcher(servicos, TU_MATCHERS.servTratamentoUterino);

  const toggleAcordeao = (k) => {
    const novoAberto = !aberto[k];
    setAberto({ ...aberto, [k]: novoAberto });
    if (novoAberto && !tu[k]) {
      setTu({ [k]: { ativo: true } });
    }
  };
  const removerSub = (k) => {
    setAberto({ ...aberto, [k]: false });
    const cp = { ...tu }; delete cp[k];
    setDado('tu', cp);
  };

  return (
    <>
      {!svcTratamento && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10,
          padding: '10px 12px', fontSize: 12, color: '#991b1b', lineHeight: 1.4, marginBottom: 12,
        }}>
          ⚠ Nenhum serviço com nome "Tratamento Uterino" cadastrado. Cadastre em Cadastros → Serviços pra que a fatura cobre o procedimento base.
        </div>
      )}

      <FormField label="Motivo do tratamento">
        <textarea value={tu.motivo || ''} onChange={e => setTu({ motivo: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Ex: endometrite pós-cobertura, secreção anormal…" />
      </FormField>

      <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, fontWeight: 700 }}>
        Procedimentos aplicados
      </div>

      {/* Acordeão: Lavagem */}
      <AcordeaoTU
        titulo="1. Lavagem Uterina"
        cor="#0e7490"
        aberto={aberto.lavagem}
        onToggle={() => toggleAcordeao('lavagem')}
        onRemover={() => removerSub('lavagem')}
      >
        {aberto.lavagem && (
          <SubLavagem tu={tu} setTu={setTu} insumos={insumos} servicos={servicos} inputStyle={inputStyle} />
        )}
      </AcordeaoTU>

      {/* Acordeão: Infusão */}
      <AcordeaoTU
        titulo="2. Infusão Uterina"
        cor="#7c2d8c"
        aberto={aberto.infusao}
        onToggle={() => toggleAcordeao('infusao')}
        onRemover={() => removerSub('infusao')}
      >
        {aberto.infusao && (
          <SubInfusao tu={tu} setTu={setTu} insumos={insumos} servicos={servicos} inputStyle={inputStyle} />
        )}
      </AcordeaoTU>

      {/* Acordeão: Misoprostol */}
      <AcordeaoTU
        titulo="3. Misoprostol"
        cor="#c2410c"
        aberto={aberto.misoprostol}
        onToggle={() => toggleAcordeao('misoprostol')}
        onRemover={() => removerSub('misoprostol')}
      >
        {aberto.misoprostol && (
          <SubMisoprostol tu={tu} setTu={setTu} insumos={insumos} />
        )}
      </AcordeaoTU>

      <div style={{
        background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8,
        padding: '10px 12px', fontSize: 11, color: '#991b1b', lineHeight: 1.5, marginTop: 4,
      }}>
        Ao salvar, o sistema cobra <strong>Tratamento Uterino</strong>, os serviços extras marcados (Ozonioterapia, PRP), <strong>luva de palpação</strong> (sempre) e todos os insumos declarados. Infusão adiciona <strong>1× Pipeta Rígida</strong>.
      </div>
    </>
  );
}

function AcordeaoTU({ titulo, cor, aberto, onToggle, onRemover, children }) {
  return (
    <div style={{
      background: aberto ? cor + '10' : 'var(--card)',
      border: `1px solid ${aberto ? cor : 'var(--line)'}`,
      borderRadius: 10, padding: aberto ? 12 : 0, marginBottom: 8,
    }}>
      <button type="button" onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: aberto ? '0 0 10px' : '12px 14px',
        borderBottom: aberto ? `1px solid ${cor}44` : 'none',
        background: 'none', border: 'none', cursor: 'pointer', color: cor, fontFamily: 'var(--sans)',
      }}>
        <Icon name={aberto ? 'chevron-down' : 'chevron-right'} size={14} color={cor} />
        <div style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 700 }}>{titulo}</div>
        {aberto && (
          <span onClick={(e) => { e.stopPropagation(); onRemover(); }} style={{
            fontSize: 10, color: cor, opacity: 0.7, cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
          }}>remover</span>
        )}
      </button>
      {aberto && <div style={{ paddingTop: 10 }}>{children}</div>}
    </div>
  );
}

// Subcomponente reutilizável: botão-toggle pra insumo com input de qtd
function BotaoInsumoQtd({ label, ativo, onToggle, valor, onChange, cor, unidade = 'un' }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
      <button type="button" onClick={onToggle} style={{
        flex: 1, textAlign: 'left', padding: '9px 12px', borderRadius: 8,
        border: `1.5px solid ${ativo ? cor : 'var(--line)'}`,
        background: ativo ? cor + '22' : 'var(--card)',
        color: ativo ? cor : 'var(--ink-2)',
        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)',
      }}>{ativo ? '✓ ' : '+ '}{label}</button>
      {ativo && (
        <input type="number" min="0" step="0.5" value={valor || ''} onChange={e => onChange(e.target.value)}
          placeholder={unidade} style={{
            width: 90, padding: '8px 10px', borderRadius: 8, border: `1px solid ${cor}55`,
            background: 'var(--bg)', fontSize: 13, color: 'var(--ink)', textAlign: 'right', fontFamily: 'var(--sans)', outline: 'none',
          }} />
      )}
    </div>
  );
}

function SubLavagem({ tu, setTu, insumos, servicos, inputStyle }) {
  const lav = tu.lavagem || {};
  const setLav = (patch) => setTu({ lavagem: { ...lav, ...patch } });
  const items = [
    { slug: 'ringer', label: 'Ringer Lactato', unidade: 'mL', regex: TU_MATCHERS.ringer, cor: '#0e7490' },
    { slug: 'aguaOxig', label: 'Água Oxigenada', unidade: 'mL', regex: TU_MATCHERS.aguaOxig, cor: '#0e7490' },
    { slug: 'dmso', label: 'DMSO', unidade: 'mL', regex: TU_MATCHERS.dmso, cor: '#0e7490' },
    { slug: 'riodeine', label: 'Riodeine Degermante', unidade: 'mL', regex: TU_MATCHERS.riodeine, cor: '#0e7490' },
  ];
  const svcOzonio = resolverServicoPorMatcher(servicos, TU_MATCHERS.servOzonio);
  return (
    <div>
      {items.map(m => {
        const ins = resolverPorMatcher(insumos, m.regex);
        const ativo = lav[m.slug] !== undefined;
        return (
          <div key={m.slug}>
            <BotaoInsumoQtd
              label={`${m.label}${ins ? '' : ' (não cadastrado)'}`}
              ativo={ativo}
              onToggle={() => {
                if (!ins) return;
                if (ativo) { const cp = { ...lav }; delete cp[m.slug]; setLav({ ...cp, [m.slug]: undefined }); }
                else setLav({ [m.slug]: '' });
              }}
              valor={lav[m.slug]}
              onChange={(v) => setLav({ [m.slug]: v })}
              cor={m.cor}
              unidade={m.unidade}
            />
          </div>
        );
      })}
      <div style={{ marginTop: 10 }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
          background: '#f5e8ff', border: `1px solid ${lav.ozonio ? '#7c2d8c' : '#d8b4fe55'}`,
          borderRadius: 8, cursor: svcOzonio ? 'pointer' : 'not-allowed', opacity: svcOzonio ? 1 : 0.55,
        }}>
          <input type="checkbox" checked={!!lav.ozonio} disabled={!svcOzonio}
            onChange={e => setLav({ ozonio: e.target.checked })}
            style={{ width: 16, height: 16 }} />
          <div style={{ flex: 1, fontSize: 12, color: '#6b21a8' }}>
            <strong>+ Ozonioterapia</strong>
            <div style={{ fontSize: 10, marginTop: 2 }}>{svcOzonio ? 'Cobra o serviço "Ozonioterapia" adicionalmente ao Tratamento Uterino.' : 'Cadastre serviço "Ozonioterapia" pra habilitar.'}</div>
          </div>
        </label>
      </div>
      <FormField label="Insumos adicionais (opcional)">
        <input type="text" value={lav.obs || ''} onChange={e => setLav({ obs: e.target.value })} style={inputStyle} placeholder="Anote itens fora dos botões" />
      </FormField>
    </div>
  );
}

function SubInfusao({ tu, setTu, insumos, servicos }) {
  const inf = tu.infusao || {};
  const setInf = (patch) => setTu({ infusao: { ...inf, ...patch } });
  const svcPrp = resolverServicoPorMatcher(servicos, TU_MATCHERS.servPrp);
  const insPipetaRig = resolverPorMatcher(insumos, TU_MATCHERS.pipetaRigida);

  return (
    <div>
      <BotaoInsumoQtd
        label={`Botukiller${resolverPorMatcher(insumos, TU_MATCHERS.botukiller) ? '' : ' (não cadastrado)'}`}
        ativo={inf.botukiller !== undefined}
        onToggle={() => {
          if (!resolverPorMatcher(insumos, TU_MATCHERS.botukiller)) return;
          if (inf.botukiller !== undefined) { const cp = { ...inf }; delete cp.botukiller; setInf({ ...cp, botukiller: undefined }); }
          else setInf({ botukiller: '' });
        }}
        valor={inf.botukiller}
        onChange={(v) => setInf({ botukiller: v })}
        cor="#7c2d8c"
        unidade="mL"
      />
      <div style={{ marginTop: 6, marginBottom: 6 }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
          background: '#f5e8ff', border: `1px solid ${inf.prp ? '#7c2d8c' : '#d8b4fe55'}`,
          borderRadius: 8, cursor: svcPrp ? 'pointer' : 'not-allowed', opacity: svcPrp ? 1 : 0.55,
        }}>
          <input type="checkbox" checked={!!inf.prp} disabled={!svcPrp}
            onChange={e => setInf({ prp: e.target.checked })}
            style={{ width: 16, height: 16 }} />
          <div style={{ flex: 1, fontSize: 12, color: '#6b21a8' }}>
            <strong>+ PRP Intrauterino</strong>
            <div style={{ fontSize: 10, marginTop: 2 }}>{svcPrp ? 'Cobra o serviço "PRP Intrauterino" adicionalmente.' : 'Cadastre serviço "PRP Intrauterino" pra habilitar.'}</div>
          </div>
        </label>
      </div>

      {/* Antibioticoterapia: lista de {insumoId, qtd} */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Antibioticoterapia
        </div>
        <BlocoInsumosRepro
          insumos={insumos}
          insumosUsados={inf.antibioticos || []}
          setInsumosUsados={(v) => setInf({ antibioticos: v })}
        />
      </div>

      <div style={{
        marginTop: 8, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8,
        padding: '8px 10px', fontSize: 11, color: '#78350f', lineHeight: 1.4,
      }}>
        Infusão sempre cobra <strong>1× Pipeta Rígida</strong>{insPipetaRig ? '' : ' — cadastre esse insumo em Insumos'}.
      </div>
    </div>
  );
}

function SubMisoprostol({ tu, setTu, insumos }) {
  const mis = tu.misoprostol || {};
  const setMis = (patch) => setTu({ misoprostol: { ...mis, ...patch } });
  const insMiso = resolverPorMatcher(insumos, TU_MATCHERS.misoprostol);
  if (!insMiso) {
    return (
      <div style={{
        background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8,
        padding: '10px 12px', fontSize: 12, color: '#991b1b', lineHeight: 1.4,
      }}>
        ⚠ Insumo "Misoprostol" não cadastrado. Cadastre em Cadastros → Insumos pra habilitar.
      </div>
    );
  }
  const btn = (chave, label) => {
    const ativo = !!mis[chave];
    return (
      <button type="button" onClick={() => setMis({ [chave]: !ativo })} style={{
        flex: 1, padding: '12px 8px', borderRadius: 10, fontSize: 13, fontWeight: 700,
        border: `1.5px solid ${ativo ? '#c2410c' : 'var(--line)'}`,
        background: ativo ? '#fed7aa' : 'var(--card)',
        color: ativo ? '#7c2d12' : 'var(--ink-2)',
        cursor: 'pointer', fontFamily: 'var(--sans)',
      }}>{ativo ? '✓ ' : ''}{label}</button>
    );
  };
  const total = (mis.cornoDireito ? 1 : 0) + (mis.cornoEsquerdo ? 1 : 0);
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {btn('cornoDireito', 'Corno Direito')}
        {btn('cornoEsquerdo', 'Corno Esquerdo')}
      </div>
      {total > 0 && (
        <div style={{ fontSize: 11, color: '#c2410c', fontWeight: 600 }}>
          {total}× unidade(s) de Misoprostol na fatura.
        </div>
      )}
    </div>
  );
}

// Bloco "Medicamentos rápidos" — 3 botões no CF pra registrar
// Ciosin (mL), Ocitocina (doses de 3 mL) e Firovet (doses). Cada um
// abre um mini-form. Quando salvar, os mL/doses são gravados em
// dados.medRapidos.<slug> e os insumos + descartáveis de injeção
// entram no insumosUsados. Ocitocina cobra 1 kit descartáveis POR
// DOSE (regra do time).
const MED_RAPIDO = [
  { slug: 'ciosin', label: 'Ciosin', unidade: 'mL', regex: /ciosin/i, cor: '#7c2d8c', modo: 'ml' },
  { slug: 'ocitocina', label: 'Ocitocina', unidade: 'doses', regex: /ocitocina/i, cor: '#0e7490', modo: 'doses', mlPorDose: 3, descartaveisPorDose: true },
  { slug: 'firovet', label: 'Firovet', unidade: 'doses', regex: /firovet/i, cor: '#c2410c', modo: 'doses' },
];

function BlocoMedicamentosRapidos({ dados, setDado, insumos, inputStyle }) {
  const medRapidos = dados.medRapidos || {};
  const setMed = (slug, valor) => setDado('medRapidos', { ...medRapidos, [slug]: valor });
  const remover = (slug) => {
    const cp = { ...medRapidos }; delete cp[slug];
    setDado('medRapidos', cp);
  };

  const resolverInsumo = (regex) => {
    const repro = insumos.filter(i => i.workspaceId === 'repro' && regex.test(i.nome || ''));
    const haras = insumos.filter(i => (i.workspaceId || 'haras') === 'haras' && regex.test(i.nome || ''));
    return repro[0] || haras[0] || null;
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, fontWeight: 700 }}>
        Medicamentos aplicados
      </div>

      {/* Botões inline pra abrir cada medicamento */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {MED_RAPIDO.map(m => {
          const ativo = medRapidos[m.slug] !== undefined;
          const ins = resolverInsumo(m.regex);
          return (
            <button key={m.slug} type="button" onClick={() => {
              if (ativo) return;
              setMed(m.slug, m.modo === 'ml' ? { ml: '' } : { doses: '' });
            }} disabled={ativo || !ins} title={!ins ? `Cadastre o insumo "${m.label}" primeiro em Cadastros → Insumos` : ''} style={{
              padding: '8px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: `1px solid ${ativo ? m.cor : 'var(--line)'}`,
              background: ativo ? m.cor + '22' : (!ins ? 'var(--soft)' : 'var(--card)'),
              color: !ins ? 'var(--ink-3)' : (ativo ? m.cor : 'var(--ink-2)'),
              cursor: (ativo || !ins) ? 'default' : 'pointer', fontFamily: 'var(--sans)', opacity: !ins ? 0.6 : 1,
            }}>
              💉 {m.label}
            </button>
          );
        })}
      </div>

      {/* Formulários abertos */}
      {MED_RAPIDO.filter(m => medRapidos[m.slug] !== undefined).map(m => {
        const v = medRapidos[m.slug];
        const ins = resolverInsumo(m.regex);
        return (
          <div key={m.slug} style={{
            background: m.cor + '15', border: `1px solid ${m.cor}55`,
            borderRadius: 10, padding: 10, marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: m.cor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                💉 {m.label}
              </div>
              <button type="button" onClick={() => remover(m.slug)} style={{
                width: 22, height: 22, borderRadius: 6, border: 'none', background: 'transparent',
                color: m.cor, cursor: 'pointer', display: 'grid', placeItems: 'center',
              }}>
                <Icon name="x" size={10} />
              </button>
            </div>
            {m.modo === 'ml' && (
              <FormField label={`Quantidade (${m.unidade}) *`}>
                <input type="number" min="0" step="0.5" value={v.ml || ''} onChange={e => setMed(m.slug, { ml: e.target.value })} style={inputStyle} placeholder="Ex: 2" />
              </FormField>
            )}
            {m.modo === 'doses' && (
              <>
                <FormField label={`Doses (${m.unidade}) *`}>
                  <input type="number" min="1" step="1" value={v.doses || ''} onChange={e => setMed(m.slug, { doses: e.target.value })} style={inputStyle} placeholder="Ex: 1" />
                </FormField>
                {m.mlPorDose && v.doses > 0 && (
                  <div style={{ fontSize: 11, color: m.cor, marginBottom: 4 }}>
                    Total: {Number(v.doses) * m.mlPorDose} mL{m.descartaveisPorDose ? ` · ${v.doses}× kit descartáveis (agulha+seringa+álcool)` : ''}
                  </div>
                )}
              </>
            )}
            <div style={{ fontSize: 10, color: m.cor, opacity: 0.85 }}>
              Cobrado como insumo injetável — agulha, seringa e algodão-álcool empilhados automaticamente.
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Bloco "Induzir Ovulação" — usado no form do Controle Folicular.
// Só lista insumos marcados como indutorOvulacao=true. O indutor
// escolhido é empilhado no insumosUsados na hora de salvar (via
// dados.indutorOvulacaoId), e como é injetável, os descartáveis
// (agulha/seringa/álcool) são adicionados automaticamente.
function BlocoInduzirOvulacao({ dados, setDado, insumos, data, inputStyle }) {
  const [aberto, setAberto] = useState(!!dados.indutorOvulacaoId);
  const indutores = dedupPorNome(insumos.filter(i => i.indutorOvulacao)).sort((a, b) =>
    (a.nome || '').localeCompare(b.nome || '', 'pt'),
  );

  if (!aberto) {
    return (
      <button type="button" onClick={() => {
        setAberto(true);
        if (!dados.dataInducaoOvulacao) setDado('dataInducaoOvulacao', data || '');
      }} style={{
        width: '100%', padding: '11px 14px', borderRadius: 10,
        border: '1px dashed var(--line)', background: 'var(--soft)',
        color: 'var(--ink-2)', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'var(--sans)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginBottom: 12,
      }}>
        <Icon name="plus" size={13} /> Induzir Ovulação
      </button>
    );
  }

  const cancelar = () => {
    setAberto(false);
    setDado('indutorOvulacaoId', '');
    setDado('dataInducaoOvulacao', '');
    setDado('horaInducaoOvulacao', '');
  };

  return (
    <div style={{
      background: '#f5e8ff', border: '1px solid #d8b4fe',
      borderRadius: 10, padding: 12, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          🥚 Indução de ovulação
        </div>
        <button onClick={cancelar} type="button" style={{
          width: 22, height: 22, borderRadius: 6, border: 'none', background: 'transparent',
          color: '#6b21a8', cursor: 'pointer', display: 'grid', placeItems: 'center',
        }}>
          <Icon name="x" size={10} />
        </button>
      </div>

      {indutores.length === 0 && (
        <div style={{ fontSize: 11, color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5',
          borderRadius: 8, padding: '8px 10px', marginBottom: 8, lineHeight: 1.4,
        }}>
          Nenhum insumo marcado como indutor de ovulação. Cadastre em Cadastros → Insumos e marque a caixinha "Indutor de ovulação".
        </div>
      )}
      <FormField label="Indutor *">
        <select value={dados.indutorOvulacaoId || ''} onChange={e => setDado('indutorOvulacaoId', e.target.value)} style={inputStyle}>
          <option value="">— Selecionar indutor —</option>
          {indutores.map(i => (
            <option key={i.id} value={i.id}>
              {i.nome}{i.workspaceId === 'haras' ? ' (haras)' : ''}
            </option>
          ))}
        </select>
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
        <FormField label="Dia da indução *">
          <input type="date" value={dados.dataInducaoOvulacao || ''} onChange={e => setDado('dataInducaoOvulacao', e.target.value)} style={inputStyle} />
        </FormField>
        <FormField label="Hora">
          <input type="time" value={dados.horaInducaoOvulacao || ''} onChange={e => setDado('horaInducaoOvulacao', e.target.value)} style={inputStyle} />
        </FormField>
      </div>
      <div style={{ fontSize: 11, color: '#6b21a8', lineHeight: 1.4 }}>
        O indutor é cobrado como injetável (agulha + seringa + álcool). O evento aparece na agenda e vira notificação push no dia às 06h.
      </div>
    </div>
  );
}

// Bloco compartilhado — configura descartáveis obrigatórios do
// serviço (usado no form de Cadastros → Serviços). Mesma estrutura
// {insumoId, qtd} do insumosUsados. Ao criar registro do caderno,
// esses descartáveis são empilhados automaticamente.
function BlocoDescartaveisObrigatorios({ insumos, descartaveis, setDescartaveis }) {
  const addLinha = () => setDescartaveis([...(descartaveis || []), { insumoId: '', qtd: 1 }]);
  const alterar = (i, patch) => setDescartaveis((descartaveis || []).map((u, idx) => idx === i ? { ...u, ...patch } : u));
  const remover = (i) => setDescartaveis((descartaveis || []).filter((_, idx) => idx !== i));

  const opcoes = dedupPorNome((insumos || []).filter(i => i.workspaceId === 'repro' || (i.workspaceId || 'haras') === 'haras'))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));

  const inputStyle = {
    padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)',
    background: 'var(--bg)', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
  };

  return (
    <div style={{ marginBottom: 12, padding: 10, background: 'var(--soft)', borderRadius: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, fontWeight: 700 }}>
        Descartáveis obrigatórios
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8, lineHeight: 1.4 }}>
        Todo registro do caderno com este serviço cobra automaticamente estes insumos na fatura.
      </div>
      {(descartaveis || []).map((u, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 32px', gap: 6, marginBottom: 6 }}>
          <select value={u.insumoId} onChange={e => alterar(i, { insumoId: e.target.value })} style={inputStyle}>
            <option value="">— Insumo —</option>
            {opcoes.map(o => (
              <option key={o.id} value={o.id}>
                {o.nome}{o.workspaceId === 'haras' ? ' (haras)' : ''}
              </option>
            ))}
          </select>
          <input
            type="number" min="0" step="0.5" value={u.qtd}
            onChange={e => alterar(i, { qtd: Number(e.target.value) || 0 })}
            style={{ ...inputStyle, textAlign: 'right' }}
            placeholder="qtd"
          />
          <button onClick={() => remover(i)} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)',
            background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer',
            display: 'grid', placeItems: 'center',
          }}>
            <Icon name="x" size={12} />
          </button>
        </div>
      ))}
      <button onClick={addLinha} type="button" style={{
        marginTop: 4, padding: '6px 10px', borderRadius: 8,
        border: '1px dashed var(--line)', background: 'transparent',
        color: 'var(--ink-2)', fontSize: 11, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'var(--sans)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Icon name="plus" size={11} /> Adicionar descartável
      </button>
    </div>
  );
}

// Bloco compartilhado — adição/remoção de insumos usados no registro
// do caderno. Cada linha: select do insumo + qtd + remover.
function BlocoInsumosRepro({ insumos, insumosUsados, setInsumosUsados }) {
  const addLinha = () => setInsumosUsados([...insumosUsados, { insumoId: '', qtd: 1 }]);
  const alterar = (i, patch) => setInsumosUsados(insumosUsados.map((u, idx) => idx === i ? { ...u, ...patch } : u));
  const remover = (i) => setInsumosUsados(insumosUsados.filter((_, idx) => idx !== i));

  const opcoes = dedupPorNome(insumos.filter(i => i.workspaceId === 'repro' || (i.workspaceId || 'haras') === 'haras'))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));

  const inputStyle = {
    padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)',
    background: 'var(--bg)', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, fontWeight: 700 }}>
        Insumos utilizados
      </div>
      {insumosUsados.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '4px 0 8px' }}>
          Nenhum insumo adicional. Descartáveis obrigatórios (luva/pipeta/lubrificante pra IA, agulha/seringa/álcool pra injetáveis) são cobrados automaticamente na fatura.
        </div>
      )}
      {insumosUsados.map((u, i) => {
        const ins = insumos.find(x => x.id === u.insumoId);
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 32px', gap: 6, marginBottom: 6 }}>
            <select value={u.insumoId} onChange={e => alterar(i, { insumoId: e.target.value })} style={inputStyle}>
              <option value="">— Selecionar insumo —</option>
              {opcoes.map(o => (
                <option key={o.id} value={o.id}>
                  {o.nome}{o.injetavel ? ' 💉' : ''}{o.workspaceId === 'haras' ? ' (haras)' : ''}
                </option>
              ))}
            </select>
            <input
              type="number" min="0" step="0.5" value={u.qtd}
              onChange={e => alterar(i, { qtd: Number(e.target.value) || 0 })}
              style={{ ...inputStyle, textAlign: 'right' }}
              placeholder="qtd"
            />
            <button onClick={() => remover(i)} style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)',
              background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer',
              display: 'grid', placeItems: 'center',
            }}>
              <Icon name="x" size={12} />
            </button>
          </div>
        );
      })}
      <button onClick={addLinha} type="button" style={{
        marginTop: 4, padding: '8px 12px', borderRadius: 10,
        border: '1px dashed var(--line)', background: 'transparent',
        color: 'var(--ink-2)', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'var(--sans)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Icon name="plus" size={12} /> Adicionar insumo
      </button>
    </div>
  );
}

function FormRegistroRepro({ registro, novoBase = null, eguasRepro, propRepro, locaisRepro, currentUser, servicos = [], insumos = [], registrosRepro = [], onSave, onCancel }) {
  const hoje = new Date().toISOString().slice(0, 10);
  // Chave do rascunho: por id (editando) ou por sessão nova.
  // Rascunho protege contra crash/queda de rede — restaurado no next open.
  const draftKey = registro?.id
    ? `epona_repro_draft_edit_${registro.id}`
    : `epona_repro_draft_new_${currentUser?.id || 'anon'}`;

  const carregarRascunho = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.__savedAt) return parsed;
      return parsed;
    } catch { return null; }
  };
  const rascunho = carregarRascunho();

  // Prioridade: editando um registro > rascunho > novoBase (agenda) > padrão vazio.
  const init = registro ? {
    ...registro,
    // Se há rascunho da edição, usa (permite continuar de onde parou)
    ...(rascunho || {}),
  } : (rascunho || {
    data: novoBase?.data || hoje,
    tipo: novoBase?.tipo || 'inseminacao_artificial',
    dados: novoBase?.dados || {},
    dataRetorno: '',
    eguaId: novoBase?.eguaId || '',
    localId: novoBase?.localId || '',
  });

  const [tipo, setTipo] = useState(init.tipo || 'inseminacao_artificial');
  const [data, setData] = useState(init.data || hoje);
  const [eguaId, setEguaId] = useState(init.eguaId || '');
  const [localId, setLocalId] = useState(init.localId || '');
  const [dados, setDados] = useState(init.dados || {});
  const [dataRetorno, setDataRetorno] = useState(init.dataRetorno || '');
  const [insumosUsados, setInsumosUsados] = useState(init.insumosUsados || registro?.insumosUsados || []);
  const [rascunhoIndicador, setRascunhoIndicador] = useState(!!rascunho);

  // Auto-save: grava rascunho no localStorage a cada mudança. Debounced
  // no proximo tick de render — não bloqueia digitação.
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        tipo, data, eguaId, localId, dados, dataRetorno, insumosUsados,
      }));
      setRascunhoIndicador(true);
    } catch {}
  }, [tipo, data, eguaId, localId, dados, dataRetorno, insumosUsados, draftKey]);
  const limparRascunho = () => { try { localStorage.removeItem(draftKey); } catch {}; setRascunhoIndicador(false); };

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
    let finalInsumos = [...insumosUsados];
    const empilhar = (arr) => {
      for (const item of (arr || [])) {
        if (!item?.insumoId) continue;
        if (!finalInsumos.some(u => u.insumoId === item.insumoId)) {
          finalInsumos = [...finalInsumos, { insumoId: item.insumoId, qtd: Number(item.qtd) || 1 }];
        }
      }
    };
    // empilharSomando: quando o insumo já existe, soma a qtd
    // (necessário pra Ocitocina 3× kit descartáveis etc)
    const empilharSomando = (arr, qtdMult = 1) => {
      for (const item of (arr || [])) {
        if (!item?.insumoId) continue;
        const idx = finalInsumos.findIndex(u => u.insumoId === item.insumoId);
        const q = (Number(item.qtd) || 1) * qtdMult;
        if (idx >= 0) finalInsumos[idx] = { ...finalInsumos[idx], qtd: (Number(finalInsumos[idx].qtd) || 0) + q };
        else finalInsumos = [...finalInsumos, { insumoId: item.insumoId, qtd: q }];
      }
    };
    // Kits de descartáveis de injeção — resolvidos 1 vez pra reutilizar
    const { encontrados: descInj } = resolverDescartaveisInjecao(insumos);

    // 0) Indutor de ovulação (CF)
    if (tipo === 'controle_folicular' && dados.indutorOvulacaoId) {
      empilhar([{ insumoId: dados.indutorOvulacaoId, qtd: 1 }]);
    }

    // 0b) Medicamentos rápidos do CF (Ciosin, Ocitocina, Firovet)
    if (tipo === 'controle_folicular' && dados.medRapidos) {
      for (const m of MED_RAPIDO) {
        const v = dados.medRapidos[m.slug];
        if (!v) continue;
        const ins = (insumos.filter(i => i.workspaceId === 'repro' && m.regex.test(i.nome || ''))[0])
          || (insumos.filter(i => (i.workspaceId || 'haras') === 'haras' && m.regex.test(i.nome || ''))[0]);
        if (!ins) continue;
        if (m.modo === 'ml') {
          const qml = Number(v.ml) || 0;
          if (qml > 0) empilharSomando([{ insumoId: ins.id, qtd: qml }]);
          // 1 kit de descartáveis por aplicação
          empilharSomando(descInj, 1);
        } else if (m.modo === 'doses') {
          const nd = Number(v.doses) || 0;
          if (nd <= 0) continue;
          const qtdInsumo = m.mlPorDose ? nd * m.mlPorDose : nd;
          empilharSomando([{ insumoId: ins.id, qtd: qtdInsumo }]);
          // Se descartaveisPorDose=true → 1 kit por dose; senão 1 kit total
          empilharSomando(descInj, m.descartaveisPorDose ? nd : 1);
        }
      }
    }

    // 0c) Tratamento Uterino: empilha todos os insumos configurados
    //     nos acordeões (lavagem, infusão, misoprostol). Serviços extras
    //     (Ozonio, PRP) são consumidos direto na fatura via dados.tu.*.
    if (tipo === 'tratamento_uterino' && dados.tu) {
      const t = dados.tu;
      // Luva de palpação sempre
      const insLuva = resolverPorMatcher(insumos, TU_MATCHERS.luvaPalpacao);
      if (insLuva) empilharSomando([{ insumoId: insLuva.id, qtd: 1 }]);
      // Lavagem
      if (t.lavagem) {
        const lav = t.lavagem;
        const matchers = [
          ['ringer', TU_MATCHERS.ringer],
          ['aguaOxig', TU_MATCHERS.aguaOxig],
          ['dmso', TU_MATCHERS.dmso],
          ['riodeine', TU_MATCHERS.riodeine],
        ];
        for (const [slug, rgx] of matchers) {
          const q = Number(lav[slug]) || 0;
          if (q <= 0) continue;
          const ins = resolverPorMatcher(insumos, rgx);
          if (ins) empilharSomando([{ insumoId: ins.id, qtd: q }]);
        }
      }
      // Infusão: botukiller + antibioticoterapia + pipeta rígida obrigatória
      if (t.infusao) {
        const inf = t.infusao;
        const qBotu = Number(inf.botukiller) || 0;
        if (qBotu > 0) {
          const insBotu = resolverPorMatcher(insumos, TU_MATCHERS.botukiller);
          if (insBotu) empilharSomando([{ insumoId: insBotu.id, qtd: qBotu }]);
        }
        if (Array.isArray(inf.antibioticos)) {
          empilharSomando(inf.antibioticos);
        }
        const insPipeta = resolverPorMatcher(insumos, TU_MATCHERS.pipetaRigida);
        if (insPipeta) empilharSomando([{ insumoId: insPipeta.id, qtd: 1 }]);
      }
      // Misoprostol: 1 unidade por corno marcado
      if (t.misoprostol) {
        const nMiso = (t.misoprostol.cornoDireito ? 1 : 0) + (t.misoprostol.cornoEsquerdo ? 1 : 0);
        if (nMiso > 0) {
          const insMiso = resolverPorMatcher(insumos, TU_MATCHERS.misoprostol);
          if (insMiso) empilharSomando([{ insumoId: insMiso.id, qtd: nMiso }]);
        }
      }
    }

    // 1) Descartáveis obrigatórios do próprio serviço vinculado
    const padrao = servicosPadrao(servicos);
    let svcVinculado = null;
    if (tipo === 'inseminacao_artificial') svcVinculado = padrao.ia;
    else if (tipo === 'transferencia_embriao') svcVinculado = padrao.te;
    else if (tipo === 'servico_avulso' && dados.servicoId) {
      svcVinculado = servicos.find(s => s.id === dados.servicoId) || null;
    }
    if (svcVinculado?.descartaveisObrigatorios?.length > 0) {
      empilhar(svcVinculado.descartaveisObrigatorios);
    } else if (tipo === 'inseminacao_artificial') {
      const { encontrados } = resolverDescartaveisIa(insumos);
      empilhar(encontrados);
    }

    // 2) Para cada insumo injetável adicionado manualmente pelo vet
    //    (que ainda não vem de medRapidos), garante 1 kit descartáveis.
    const temInjetavel = finalInsumos.some(u => {
      const ins = insumos.find(i => i.id === u.insumoId);
      return ins && ins.injetavel;
    });
    if (temInjetavel) empilhar(descInj);
    const payload = {
      id: registro?.id || 'rr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      eguaId, data, tipo, dados, dataRetorno: dataRetorno || null,
      insumosUsados: finalInsumos,
      autor: currentUser?.nome || 'Vet',
      mes,
      workspaceId: 'repro',
      vetId: currentUser?.id || null,
      localId: localId || null,
    };
    onSave(payload);
    limparRascunho();
  };

  const handleCancel = () => {
    // Cancelar preserva o rascunho (usuário pode ter só saído sem querer).
    // Só descarta ao clicar em "Descartar" no indicador.
    onCancel();
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
          <FormField label="Ringer Lactato (L)">
            <input type="number" min="0" step="0.5" value={dados.ringerLactatoL || ''} onChange={e => setDado('ringerLactatoL', e.target.value)} style={inputStyle} placeholder="Ex: 2" />
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label="Edema uterino">
              <input value={dados.edemaUterino || ''} onChange={e => setDado('edemaUterino', e.target.value)} style={inputStyle} placeholder="0, +, ++, +++" />
            </FormField>
            <FormField label="Presença de líquido">
              <select value={dados.presencaLiquido || ''} onChange={e => setDado('presencaLiquido', e.target.value)} style={inputStyle}>
                <option value="">—</option>
                <option value="ausente">Ausente</option>
                <option value="discreta">Discreta</option>
                <option value="moderada">Moderada</option>
                <option value="acentuada">Acentuada</option>
              </select>
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label="Tônus uterino">
              <select value={dados.tonusUterino || ''} onChange={e => setDado('tonusUterino', e.target.value)} style={inputStyle}>
                <option value="">—</option>
                {['-', '+', '++', '+++'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
            <FormField label="Tônus cervical">
              <select value={dados.tonusCervical || ''} onChange={e => setDado('tonusCervical', e.target.value)} style={inputStyle}>
                <option value="">—</option>
                {['-', '+', '++', '+++'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
          </div>

          {/* Botões de medicamentos rápidos (mesmo padrão do "Induzir Ovulação") */}
          <BlocoMedicamentosRapidos dados={dados} setDado={setDado} insumos={insumos} inputStyle={inputStyle} />

          <BlocoInduzirOvulacao dados={dados} setDado={setDado} insumos={insumos} data={data} inputStyle={inputStyle} />

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

      {tipo === 'tratamento_uterino' && (
        <BlocoTratamentoUterino dados={dados} setDado={setDado} insumos={insumos} servicos={servicos} inputStyle={inputStyle} />
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
              {dedupPorNome(servicos.filter(s => s.workspaceId === 'repro' || s.workspaceId === 'haras'))
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
            Área de <strong>Diagnóstico / avulsos</strong>. Serviços avulsos são <strong>100% do vet</strong> na divisão da equipe. (Para tratamento uterino, use o tipo <strong>Tratamento Uterino</strong>.)
          </div>
        </>
      )}

      {/* Insumos utilizados — bloco compartilhado por todos os tipos.
          Adicionar um insumo injetável auto-empilha agulha + seringa +
          algodão-álcool na hora de salvar (regra do haras). */}
      <BlocoInsumosRepro
        insumos={insumos}
        insumosUsados={insumosUsados}
        setInsumosUsados={setInsumosUsados}
      />

      <FormField label="Observações">
        <textarea value={dados.observacoes || ''} onChange={e => setDado('observacoes', e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
      </FormField>

      {rascunhoIndicador && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', background: '#dcfce7', border: '1px solid #86efac',
          borderRadius: 8, fontSize: 11, color: '#15803d', marginTop: 4, marginBottom: 4,
        }}>
          <span style={{ fontSize: 10 }}>●</span>
          <span style={{ flex: 1 }}>Rascunho salvo automaticamente</span>
          <button type="button" onClick={() => {
            if (window.confirm('Descartar rascunho e limpar o formulário?')) {
              limparRascunho();
              onCancel();
            }
          }} style={{
            background: 'none', border: 'none', color: '#166534', fontSize: 10,
            cursor: 'pointer', textDecoration: 'underline',
          }}>descartar</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button onClick={handleCancel} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Fechar</button>
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
            <DetalheLinha label="Ringer Lactato" valor={
              d.ringerLactatoL ? `${d.ringerLactatoL} L` :
              d.ringerLactatoMl ? `${(Number(d.ringerLactatoMl) / 1000).toFixed(2)} L` : null
            } />
            <DetalheLinha label="Resultado" valor={d.resultado === 'positivo' ? '✓ Positiva' : d.resultado === 'negativo' ? '✗ Negativa' : null} />
            {d.resultado === 'positivo' && <DetalheLinha label="Receptora" valor={d.receptora} />}
          </>
        )}
        {registro.tipo === 'controle_folicular' && (
          <>
            <DetalheLinha label="OD" valor={d.ovarioDireito} />
            <DetalheLinha label="OE" valor={d.ovarEsquerdo} />
            <DetalheLinha label="Edema uterino" valor={d.edemaUterino} />
            <DetalheLinha label="Presença líquido" valor={d.presencaLiquido} />
            <DetalheLinha label="Tônus uterino" valor={d.tonusUterino} />
            <DetalheLinha label="Tônus cervical" valor={d.tonusCervical} />
            {d.medRapidos && Object.entries(d.medRapidos).map(([slug, v]) => {
              const m = MED_RAPIDO.find(x => x.slug === slug);
              if (!m || !v) return null;
              const desc = m.modo === 'ml'
                ? `${v.ml} mL`
                : `${v.doses} dose(s)${m.mlPorDose ? ` = ${Number(v.doses) * m.mlPorDose} mL` : ''}`;
              return <DetalheLinha key={slug} label={m.label} valor={desc} />;
            })}
            {d.dataInducaoOvulacao && (
              <DetalheLinha label="Indução ovulação" valor={
                `${fmtDataBr(d.dataInducaoOvulacao)}${d.horaInducaoOvulacao ? ` · ${d.horaInducaoOvulacao}` : ''}`
              } />
            )}
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
  onOpenHistoricoEgua,
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
          onOpenHistorico={onOpenHistoricoEgua}
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
          todosInsumos={insumos}
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
  currentUser, updateRegistroReproducao, onSelectEvento,
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
          onSelectEvento={onSelectEvento}
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
    { label: 'CE', valor: totalTE, cor: '#0e7490', bg: '#cffafe' },
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
function ReproCalendario({ registrosRepro, eguasRepro, locaisRepro, vetsExternos, onSelectEvento }) {
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
  // Regras de "cumprimento" — retorno/coleta consumidos NÃO viram
  // evento no calendário. Procedimentos passados aparecem como
  // historico (é a linha do tempo de fato).
  for (const r of (registrosRepro || [])) {
    const dados = r.dados || {};
    if (r.data) add(r.data, { r, tipoEv: 'procedimento', dataEv: r.data, ...eventoBase(r) });
    if (r.dataRetorno && !retornoCumprido(r, registrosRepro)) {
      add(r.dataRetorno, { r, tipoEv: 'retorno', dataEv: r.dataRetorno, ...eventoBase(r) });
    }
    if (dados.dataColetaAgendada && !coletaCumprida(r, registrosRepro)) {
      add(dados.dataColetaAgendada, { r, tipoEv: 'coleta', dataEv: dados.dataColetaAgendada, ...eventoBase(r) });
    }
    if (dados.dataInducaoOvulacao && !inducaoCumprida(r, registrosRepro)) {
      add(dados.dataInducaoOvulacao, { r, tipoEv: 'inducao', dataEv: dados.dataInducaoOvulacao, hora: dados.horaInducaoOvulacao || '', ...eventoBase(r) });
    }
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
            const rot = rotuloEvento(ev);
            return (
              <button
                key={i}
                onClick={() => {
                  setDiaAberto(null);
                  onSelectEvento && onSelectEvento(ev);
                }}
                style={{
                  width: '100%', textAlign: 'left', cursor: onSelectEvento ? 'pointer' : 'default',
                  background: 'var(--card)', border: '1px solid var(--line)',
                  borderLeft: `3px solid ${vet?.cor || CORES_TAB_ATIVA}`,
                  borderRadius: 10, padding: '10px 12px', marginBottom: 8,
                  color: 'var(--ink)',
                }}
              >
                <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  {rot}
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)', marginTop: 2 }}>{egua?.nome || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
                  {local?.nome || '—'}{vet ? ` · ${vet.nome.split(' ')[0]}` : ''}
                </div>
              </button>
            );
          })}
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Histórico reprodutivo da égua — linha do tempo agrupada por mês.
// Cada evento mostra tipo, cor do vet, campos resumo (garanhão, DG
// resultado, medicamentos etc). Click no card abre o detalhe.
// ─────────────────────────────────────────────────────────────
function HistoricoEgua({ egua, registrosRepro, vetsExternos, locaisRepro, propRepro, onBack, onOpenRegistro }) {
  const [tipoFiltro, setTipoFiltro] = useState('');
  const meus = (registrosRepro || [])
    .filter(r => r.eguaId === egua.id)
    .filter(r => !tipoFiltro || r.tipo === tipoFiltro)
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  const prop = propRepro.find(p => p.id === egua.proprietarioId || (egua.proprietarioIds || []).includes(p.id));

  // Agrupa por mês
  const grupos = new Map();
  const mesesLabels = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  for (const r of meus) {
    const [y, m] = (r.data || '----').split('-');
    const k = `${y}-${m}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(r);
  }
  const gruposOrd = [...grupos.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  // Contagens por tipo pra mostrar filtros com badge
  const contagens = {};
  for (const r of meus) contagens[r.tipo] = (contagens[r.tipo] || 0) + 1;

  const resumoCard = (r) => {
    const d = r.dados || {};
    switch (r.tipo) {
      case 'inseminacao_artificial':
        return [
          d.garanhao && `Garanhão: ${d.garanhao}`,
          d.qtdPalhetas && `${d.qtdPalhetas} palheta(s)`,
          d.momento && d.momento,
          d.destino === 'transferencia' ? '→ Coleta' : (d.destino === 'prenhez' ? '→ Prenhez' : null),
        ].filter(Boolean).join(' · ');
      case 'transferencia_embriao':
        return [
          d.resultado === 'positivo' ? '✓ Positiva' : d.resultado === 'negativo' ? '✗ Negativa' : null,
          d.receptora && `Rec.: ${d.receptora}`,
          d.ringerLactatoL && `${d.ringerLactatoL} L Ringer`,
        ].filter(Boolean).join(' · ');
      case 'controle_folicular':
        return [
          d.ovarioDireito && `OD: ${d.ovarioDireito}`,
          d.ovarEsquerdo && `OE: ${d.ovarEsquerdo}`,
          d.edemaUterino && `edema: ${d.edemaUterino}`,
        ].filter(Boolean).join(' · ');
      case 'diagnostico_gestacao':
        return [
          d.resultado === 'positivo' ? '✓ Gestante' : d.resultado === 'negativo' ? '✗ Vazio' : null,
          d.tamanhoVesicula && `${d.tamanhoVesicula}`,
        ].filter(Boolean).join(' · ');
      case 'tratamento_uterino': {
        const partes = [];
        if (d.tu?.lavagem) partes.push('lavagem');
        if (d.tu?.infusao) partes.push('infusão');
        if (d.tu?.misoprostol) partes.push('misoprostol');
        return partes.join(' + ') || 'tratamento uterino';
      }
      case 'servico_avulso':
        return d.servicoId ? '(serviço)' : '';
      default: return '';
    }
  };

  return (
    <div>
      <TopBar title={egua.nome} subtitle={`Histórico reprodutivo${prop ? ' · ' + prop.nome : ''}`} />
      <div style={{ padding: '4px 20px 0' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer',
          padding: '6px 0', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--sans)',
        }}>
          <Icon name="arrow-left" size={14} /> Voltar
        </button>
      </div>

      {/* Sumário */}
      <div style={{ padding: '4px 20px 8px' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
          padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 22 }}>{meus.length}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            registro(s) no total
          </div>
        </div>
      </div>

      {/* Filtro por tipo */}
      <div style={{ padding: '0 20px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={() => setTipoFiltro('')} style={filtroBtn(!tipoFiltro)}>Todos</button>
        {Object.entries(contagens).map(([t, n]) => {
          const meta = TIPO_META[t] || {};
          const ativo = tipoFiltro === t;
          return (
            <button key={t} onClick={() => setTipoFiltro(ativo ? '' : t)} style={{
              ...filtroBtn(ativo),
              borderColor: ativo ? meta.cor : 'var(--line)',
              color: ativo ? meta.cor : 'var(--ink-3)',
            }}>{meta.short || t} · {n}</button>
          );
        })}
      </div>

      <div style={{ padding: '4px 20px 20px' }}>
        {meus.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
            Sem registros no caderno.
          </div>
        )}
        {gruposOrd.map(([mesKey, regs]) => {
          const [y, m] = mesKey.split('-');
          const mesLbl = mesKey === '----' ? 'sem data' : `${mesesLabels[Number(m) - 1]} · ${y}`;
          return (
            <div key={mesKey} style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase',
                letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6, padding: '0 4px',
              }}>{mesLbl}</div>
              {regs.map(r => {
                const meta = TIPO_META[r.tipo] || {};
                const vet = vetsExternos.find(v => v.id === r.vetId);
                const local = locaisRepro.find(l => l.id === r.localId);
                return (
                  <button key={r.id} onClick={() => onOpenRegistro && onOpenRegistro(r)} style={{
                    width: '100%', textAlign: 'left', cursor: onOpenRegistro ? 'pointer' : 'default',
                    background: 'var(--card)', border: '1px solid var(--line)',
                    borderLeft: `3px solid ${vet?.cor || meta.cor || CORES_TAB_ATIVA}`,
                    borderRadius: 10, padding: '10px 12px', marginBottom: 6, color: 'var(--ink)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 10, background: meta.bg || 'var(--soft)', color: meta.cor || 'var(--ink)',
                        padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                      }}>{meta.short || r.tipo}</span>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{fmtDataBr(r.data)}</span>
                      {vet && (
                        <span style={{ fontSize: 10, color: '#fff', background: vet.cor, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                          {vet.nome.split(' ')[0]}
                        </span>
                      )}
                      {local && (
                        <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>· {local.nome}</span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-2)' }}>
                      {resumoCard(r)}
                    </div>
                    {/* DG marcados no detalhe (DG15/30/45) */}
                    {r.dados && ['dg15', 'dg30', 'dg45'].some(k => r.dados[k]) && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        {['dg15', 'dg30', 'dg45'].map(k => r.dados[k] && (
                          <span key={k} style={{
                            fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 700,
                            background: r.dados[k] === 'positivo' ? '#dcfce7' : '#fee2e2',
                            color: r.dados[k] === 'positivo' ? '#15803d' : '#991b1b',
                          }}>{k.toUpperCase()} {r.dados[k] === 'positivo' ? '+' : '-'}</span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReproCobrancas({
  currentUser, locaisRepro, vetKmLocais, upsertVetKmLocal,
  proprietarios, propRepro, cavalos, registrosRepro, servicos, insumos,
  vetsExternos, empresaInfo,
  addRegistroReproducao, updateRegistroReproducao, deleteRegistroReproducao,
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
          currentUser={currentUser}
          addRegistroReproducao={addRegistroReproducao}
          updateRegistroReproducao={updateRegistroReproducao}
          deleteRegistroReproducao={deleteRegistroReproducao}
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
  vetKmLocais, locais, vetsExternos, empresaInfo, currentUser,
  addRegistroReproducao, updateRegistroReproducao, deleteRegistroReproducao,
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
      // Éguas do proprietário aberto (repro) — usado no picker "+ Adicionar"
      const eguasDoProp = cavalos.filter(c =>
        (c.workspaceId || 'haras') === 'repro'
        && ((c.proprietarioIds || []).includes(item.prop.id) || c.proprietarioId === item.prop.id),
      );
      return (
        <ReproFaturaDetalhe
          fatura={item.fat}
          empresaInfo={empresaInfo}
          vetsExternos={vetsExternos}
          onBack={() => setPropAberto(null)}
          registros={registros}
          eguasDoProp={eguasDoProp}
          eguasRepro={cavalos.filter(c => (c.workspaceId || 'haras') === 'repro')}
          propRepro={propRepro}
          locaisRepro={locais}
          servicos={servicos}
          insumos={insumos}
          currentUser={currentUser}
          addRegistroReproducao={addRegistroReproducao}
          updateRegistroReproducao={updateRegistroReproducao}
          deleteRegistroReproducao={deleteRegistroReproducao}
          mesRef={mesRef}
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
function ReproFaturaDetalhe({
  fatura, empresaInfo, vetsExternos, onBack,
  registros = [], eguasDoProp = [], eguasRepro = [], propRepro = [], locaisRepro = [], servicos = [], insumos = [], currentUser,
  addRegistroReproducao, updateRegistroReproducao, deleteRegistroReproducao,
  mesRef,
}) {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mesNome = meses[fatura.ref.mes - 1];
  const [editRegId, setEditRegId] = useState(null);
  const [novoRegBase, setNovoRegBase] = useState(null);

  const baixarPdf = () => {
    const doc = gerarPdfFaturaRepro({ fatura, mesNome, empresa: empresaInfo || {}, vetsExternos });
    doc.save(nomePdfFaturaRepro(fatura.proprietario, fatura.ref, mesNome));
  };
  const vetNome = (id) => (vetsExternos.find(v => v.id === id)?.nome) || '—';

  const excluirRegistro = (regId, msg) => {
    if (!regId || !deleteRegistroReproducao) return;
    if (window.confirm(msg || 'Excluir este registro do caderno?')) {
      deleteRegistroReproducao(regId);
    }
  };
  const removerInsumoDaLinha = (regId, insumoId) => {
    const r = registros.find(x => x.id === regId);
    if (!r || !updateRegistroReproducao) return;
    if (!window.confirm('Remover este insumo do registro?')) return;
    const nova = (r.insumosUsados || []).filter(u => u.insumoId !== insumoId);
    updateRegistroReproducao(regId, { insumosUsados: nova });
  };
  const editarRegistro = (regId) => setEditRegId(regId);
  const criarRegistroNovo = () => {
    // Pré-preenche com a 1ª égua do proprietário e último dia do mês
    const egua = eguasDoProp[0];
    const ultimoDiaMes = new Date(fatura.ref.ano, fatura.ref.mes, 0).getDate();
    const dataIso = `${fatura.ref.ano}-${String(fatura.ref.mes).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`;
    setNovoRegBase({
      eguaId: egua?.id || '',
      localId: egua?.localId || '',
      data: dataIso,
      tipo: 'servico_avulso',
      dados: {},
    });
  };
  const registroEmEdicao = editRegId ? registros.find(r => r.id === editRegId) : null;

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

        {addRegistroReproducao && (
          <button onClick={criarRegistroNovo} style={{
            width: '100%', padding: '11px', borderRadius: 10, border: '1px dashed var(--line)',
            background: 'var(--soft)', color: 'var(--ink-2)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--sans)', marginBottom: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Icon name="plus" size={12} /> Adicionar registro nesta fatura
          </button>
        )}

        {fatura.visitasLinhas.length > 0 && (
          <SecaoFat titulo={`Visitas · ${formatBRL(fatura.visitasTotal)}`} linhas={fatura.visitasLinhas.map(v => ({
            principal: v.localNome,
            sub: `${fmtDataBr(v.data)} · ${vetNome(v.vetId).split(' ')[0]}${v.nProps > 1 ? ` · rateado ${v.nProps}p` : ''}`,
            valor: v.valor,
            readOnly: true,
          }))} />
        )}
        {fatura.insumosLinhas.length > 0 && (
          <SecaoFat titulo={`Insumos · ${formatBRL(fatura.insumosTotal)}`} linhas={fatura.insumosLinhas.map(l => ({
            principal: l.nome, sub: `${fmtDataBr(l.data)} · ${l.qtd} ${l.unidade}`, valor: l.valor,
            onEditar: updateRegistroReproducao ? () => editarRegistro(l.registroId) : null,
            onExcluir: updateRegistroReproducao ? () => removerInsumoDaLinha(l.registroId, l.insumoId) : null,
          }))} />
        )}
        {fatura.procedimentosLinhas.length > 0 && (
          <SecaoFat titulo={`Procedimentos · ${formatBRL(fatura.procedimentosTotal)}`} linhas={fatura.procedimentosLinhas.map(l => ({
            principal: l.descricao, sub: `${fmtDataBr(l.data)} · ${vetNome(l.vetId).split(' ')[0]}`, valor: l.valor,
            onEditar: updateRegistroReproducao ? () => editarRegistro(l.registroId) : null,
            onExcluir: deleteRegistroReproducao ? () => excluirRegistro(l.registroId, `Excluir procedimento ${l.tipo} de ${fmtDataBr(l.data)}? O registro sai do caderno.`) : null,
          }))} />
        )}
        {fatura.avulsosLinhas.length > 0 && (
          <SecaoFat titulo={`Serviços avulsos · ${formatBRL(fatura.avulsosTotal)}`} linhas={fatura.avulsosLinhas.map(l => ({
            principal: l.descricao, sub: `${fmtDataBr(l.data)} · ${vetNome(l.vetId).split(' ')[0]}`, valor: l.valor,
            onEditar: updateRegistroReproducao ? () => editarRegistro(l.registroId) : null,
            onExcluir: deleteRegistroReproducao ? () => excluirRegistro(l.registroId, `Excluir serviço "${l.descricao}" de ${fmtDataBr(l.data)}?`) : null,
          }))} />
        )}
        {fatura.resultadosLinhas.length > 0 && (
          <SecaoFat titulo={`Resultado repro · ${formatBRL(fatura.resultadosTotal)}`} linhas={fatura.resultadosLinhas.map(l => ({
            principal: l.eguaNome,
            sub: `${fmtDataBr(l.data)} · DG30+${l.vetIdInsem ? ` · insem. ${vetNome(l.vetIdInsem).split(' ')[0]}` : ''}`,
            valor: l.valor,
            readOnly: true,
          }))} />
        )}
      </div>

      {(registroEmEdicao || novoRegBase) && (
        <FormRegistroRepro
          registro={registroEmEdicao}
          novoBase={novoRegBase}
          eguasRepro={eguasRepro}
          propRepro={propRepro}
          locaisRepro={locaisRepro}
          currentUser={currentUser}
          servicos={servicos}
          insumos={insumos}
          registrosRepro={registros}
          onSave={(payload) => {
            if (registroEmEdicao) updateRegistroReproducao(registroEmEdicao.id, payload);
            else addRegistroReproducao(payload);
            setEditRegId(null);
            setNovoRegBase(null);
          }}
          onCancel={() => { setEditRegId(null); setNovoRegBase(null); }}
        />
      )}
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
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
        borderTop: i === 0 ? 'none' : '1px solid var(--line-soft, var(--line))',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>{l.principal}</div>
          {l.sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{l.sub}</div>}
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)' }}>{formatBRL(l.valor)}</div>
        {!l.readOnly && (l.onEditar || l.onExcluir) && (
          <div style={{ display: 'flex', gap: 4 }}>
            {l.onEditar && (
              <button onClick={l.onEditar} title="Editar registro" style={{
                width: 26, height: 26, borderRadius: 6, border: '1px solid var(--line)',
                background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer',
                display: 'grid', placeItems: 'center',
              }}>
                <Icon name="edit" size={11} />
              </button>
            )}
            {l.onExcluir && (
              <button onClick={l.onExcluir} title="Excluir" style={{
                width: 26, height: 26, borderRadius: 6, border: '1px solid #dc262640',
                background: '#fee2e2', color: '#dc2626', cursor: 'pointer',
                display: 'grid', placeItems: 'center',
              }}>
                <Icon name="x" size={11} />
              </button>
            )}
          </div>
        )}
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
function ReproCobCatalogo({ tipo, itens, todosInsumos = [], addItem, updateItem, deleteItem }) {
  const [busca, setBusca] = useState('');
  const [importando, setImportando] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', valor: '', injetavel: false, indutorOvulacao: false, descartaveisObrigatorios: [] });

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
    setForm({ nome: '', valor: '', injetavel: false, indutorOvulacao: false, descartaveisObrigatorios: [] });
    setShowForm(true);
  };
  const abrirEditar = (i) => {
    setEditId(i.id);
    setForm({
      nome: i.nome,
      valor: String(tipo === 'insumos' ? (i.valorVenda ?? 0) : (i.valor ?? 0)),
      injetavel: !!i.injetavel,
      indutorOvulacao: !!i.indutorOvulacao,
      descartaveisObrigatorios: Array.isArray(i.descartaveisObrigatorios) ? i.descartaveisObrigatorios : [],
    });
    setShowForm(true);
  };
  const salvar = () => {
    if (!form.nome.trim()) return;
    const valorNum = parseFloat(String(form.valor).replace(',', '.')) || 0;
    // Indutor de ovulação é sempre injetável (cobra agulha/seringa/álcool).
    const injetavelFinal = !!form.injetavel || !!form.indutorOvulacao;
    if (editId) {
      const patch = tipo === 'insumos'
        ? { nome: form.nome.trim(), valorVenda: valorNum, injetavel: injetavelFinal, indutorOvulacao: !!form.indutorOvulacao }
        : { nome: form.nome.trim(), valor: valorNum, descartaveisObrigatorios: form.descartaveisObrigatorios };
      updateItem(editId, patch);
    } else {
      const base = tipo === 'insumos'
        ? { id: 'i_r_' + Date.now().toString(36), nome: form.nome.trim(), categoria: 'descartavel', unidade: 'un', valorVenda: valorNum, valorCompra: 0, injetavel: injetavelFinal, indutorOvulacao: !!form.indutorOvulacao, workspaceId: 'repro' }
        : { id: 's_r_' + Date.now().toString(36), nome: form.nome.trim(), categoria: 'veterinario', valor: valorNum, workspaceId: 'repro', descartaveisObrigatorios: form.descartaveisObrigatorios };
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

          {tipo === 'insumos' && (
            <>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: 'var(--soft)', borderRadius: 10, marginBottom: 8, cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={!!form.injetavel || !!form.indutorOvulacao}
                  disabled={!!form.indutorOvulacao}
                  onChange={e => setForm(f => ({ ...f, injetavel: e.target.checked }))}
                  style={{ width: 16, height: 16, cursor: form.indutorOvulacao ? 'not-allowed' : 'pointer' }}
                />
                <div style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>
                  Insumo injetável 💉
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                    Cada uso cobra automaticamente 1 agulha + 1 seringa + 1 algodão com álcool.
                  </div>
                </div>
              </label>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: 'var(--soft)', borderRadius: 10, marginBottom: 12, cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={!!form.indutorOvulacao}
                  onChange={e => setForm(f => ({ ...f, indutorOvulacao: e.target.checked }))}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <div style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>
                  Indutor de ovulação 🥚
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                    Aparece no bloco "Induzir Ovulação" do Controle Folicular. Marca automaticamente como injetável.
                  </div>
                </div>
              </label>
            </>
          )}

          {tipo === 'servicos' && (
            <BlocoDescartaveisObrigatorios
              insumos={todosInsumos}
              descartaveis={form.descartaveisObrigatorios}
              setDescartaveis={(v) => setForm(f => ({ ...f, descartaveisObrigatorios: v }))}
            />
          )}

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
  sessions = [], activeKey, onSwitchSession, onAddAccount, onRemoveSession,
  onLogout,
}) {
  const [screen, setScreen] = useState('repro-home');
  const [tab, setTab] = useState('home');
  const [cadSub, setCadSub] = useState('locais');
  const [localSelecionado, setLocalSelecionado] = useState(null);
  const [historicoEguaId, setHistoricoEguaId] = useState(null);
  // Pré-preenchimento do form do caderno quando vindo da agenda/calendário
  const [preFillCaderno, setPreFillCaderno] = useState(null);

  // Traduz um evento (retorno/coleta/procedimento) no rascunho de um NOVO
  // registro do caderno pra continuar aquele fluxo.
  const abrirCadernoDoEvento = (ev) => {
    if (!ev) return;
    const hojeIso = new Date().toLocaleDateString('sv-SE');
    let tipoSugerido = 'controle_folicular';
    let dadosSugeridos = {};
    if (ev.tipoEv === 'coleta') {
      // coleta agendada → próximo passo é registrar a TE (coleta) do embrião
      tipoSugerido = 'transferencia_embriao';
      dadosSugeridos = { iaOrigemId: ev.registro?.id };
    } else if (ev.tipoEv === 'retorno' || ev.tipoEv === 'inducao') {
      // retorno/indução → controle folicular pra ver a égua no dia
      tipoSugerido = 'controle_folicular';
    } else if (ev.tipoEv === 'procedimento') {
      tipoSugerido = ev.tipo || 'controle_folicular';
    }
    setPreFillCaderno({
      eguaId: ev.eguaId,
      localId: ev.registro?.localId || null,
      data: hojeIso,
      tipo: tipoSugerido,
      dados: dadosSugeridos,
    });
    setTab('caderno');
    setScreen('repro-caderno');
  };

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
      onSelectEvento={abrirCadernoDoEvento}
    />;
  } else if (screen === 'repro-cadastros') {
    if (historicoEguaId) {
      const eg = eguasRepro.find(x => x.id === historicoEguaId);
      if (!eg) { setHistoricoEguaId(null); content = null; }
      else {
        content = <HistoricoEgua
          egua={eg}
          registrosRepro={registrosRepro}
          vetsExternos={vetsExternos}
          locaisRepro={locaisRepro}
          propRepro={propRepro}
          onBack={() => setHistoricoEguaId(null)}
          onOpenRegistro={(r) => {
            // Abre o form pra edição rápida
            setHistoricoEguaId(null);
            setPreFillCaderno({
              eguaId: r.eguaId, localId: r.localId, data: r.data, tipo: r.tipo, dados: r.dados || {},
            });
            setTab('caderno'); setScreen('repro-caderno');
          }}
        />;
      }
    } else if (localSelecionado) {
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
        onOpenHistoricoEgua={(e) => setHistoricoEguaId(e.id)}
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
      preFill={preFillCaderno}
      onConsumirPreFill={() => setPreFillCaderno(null)}
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
      onSelectEvento={abrirCadernoDoEvento}
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
      addRegistroReproducao={addRegistroReproducao}
      updateRegistroReproducao={updateRegistroReproducao}
      deleteRegistroReproducao={deleteRegistroReproducao}
    />;
  } else if (screen === 'repro-conta') {
    content = <ReproConta
      currentUser={currentUser}
      onLogout={onLogout}
      sessions={sessions}
      activeKey={activeKey}
      onSwitchSession={onSwitchSession}
      onAddAccount={onAddAccount}
      onRemoveSession={onRemoveSession}
    />;
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
