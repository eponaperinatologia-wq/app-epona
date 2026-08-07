// repro-app.jsx — Shell do Epona Repro Team.
// Fase 1: Home + Locais + Proprietários (workspace='repro') + Éguas + Caderno + Conta.
// Fase 2 (depois): DG, dashboard, cores no calendário, faturamento km.
import React, { useState, useMemo, useEffect } from 'react';
import { Icon } from './icons';
import { norm, formatBRL } from './data';
import { TopBar } from './screens';
import { trocarSenhaVetExterno } from './auth-vet-externo';

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
    { id: 'cobrancas', label: 'Cobranças', icon: 'doc', screen: 'repro-cobrancas' },
    { id: 'conta', label: 'Conta', icon: 'user', screen: 'repro-conta' },
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
function ReproHome({ currentUser, locaisRepro, propRepro, eguasRepro, registrosRepro, setScreen, setTab, goCadastros }) {
  const nome = (currentUser.nome || '').split(/\s+/)[0];
  const h = new Date().getHours();
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const hojeStr = new Date().toLocaleDateString('sv-SE');
  const meusRegistrosHoje = (registrosRepro || []).filter(r => r.data === hojeStr && r.vetId === currentUser.id).length;

  const stats = [
    { label: 'Locais', value: locaisRepro.length, cadSub: 'locais' },
    { label: 'Proprietários', value: propRepro.length, cadSub: 'proprietarios' },
    { label: 'Éguas', value: eguasRepro.length, cadSub: 'eguas' },
    { label: 'Meus regs hoje', value: meusRegistrosHoje, screen: 'repro-caderno', tab: 'caderno' },
  ];
  const abrirStat = (s) => {
    if (s.cadSub) goCadastros(s.cadSub);
    else { setTab(s.tab); setScreen(s.screen); }
  };

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
        {stats.map(s => (
          <button key={s.label} onClick={() => abrirStat(s)} style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
            padding: '14px 14px', textAlign: 'left', color: 'var(--ink)', cursor: 'pointer',
          }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 24, letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
          </button>
        ))}
      </div>

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
function FormRegistroRepro({ registro, eguasRepro, propRepro, locaisRepro, currentUser, onSave, onCancel }) {
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
    const payload = {
      id: registro?.id || 'rr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      eguaId, data, tipo, dados, dataRetorno: dataRetorno || null,
      insumosUsados: registro?.insumosUsados || [],
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
          <div style={{
            background: '#f5e8ff', border: '1px solid #d8b4fe', borderRadius: 10,
            padding: '10px 12px', fontSize: 12, color: '#6b21a8', lineHeight: 1.5, marginBottom: 12,
          }}>
            <strong>Descartáveis obrigatórios</strong> (cobrados na fatura):
            luva de palpação, pipeta de inseminação, dose de lubrificante estéril.
          </div>
        </>
      )}

      {tipo === 'transferencia_embriao' && (
        <>
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
function ReproCobrancas({ currentUser, locaisRepro, vetKmLocais, upsertVetKmLocal }) {
  return (
    <div>
      <TopBar title="Cobranças" subtitle="Km por local — sua tabela" />
      <ReproCobKm
        currentUser={currentUser}
        locaisRepro={locaisRepro}
        vetKmLocais={vetKmLocais}
        upsertVetKmLocal={upsertVetKmLocal}
      />
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
      registrosRepro={registrosRepro}
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
      addRegistroReproducao={addRegistroReproducao}
      updateRegistroReproducao={updateRegistroReproducao}
      deleteRegistroReproducao={deleteRegistroReproducao}
    />;
  } else if (screen === 'repro-cobrancas') {
    content = <ReproCobrancas
      currentUser={currentUser}
      locaisRepro={locaisRepro}
      vetKmLocais={vetKmLocais}
      upsertVetKmLocal={upsertVetKmLocal}
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
