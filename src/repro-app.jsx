// repro-app.jsx — Shell do Epona Repro Team.
// Fase 1: Home + Locais + Proprietários (workspace='repro') + Éguas + Caderno + Conta.
// Fase 2 (depois): DG, dashboard, cores no calendário, faturamento km.
import React, { useState, useMemo } from 'react';
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
    { id: 'locais', label: 'Locais', icon: 'building', screen: 'repro-locais' },
    { id: 'proprietarios', label: 'Prop.', icon: 'user', screen: 'repro-proprietarios' },
    { id: 'eguas', label: 'Éguas', icon: 'horse', screen: 'repro-eguas' },
    { id: 'caderno', label: 'Caderno', icon: 'edit', screen: 'repro-caderno' },
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
function ReproHome({ currentUser, locaisRepro, propRepro, eguasRepro, registrosRepro, setScreen, setTab }) {
  const nome = (currentUser.nome || '').split(/\s+/)[0];
  const h = new Date().getHours();
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const hojeStr = new Date().toLocaleDateString('sv-SE');
  const meusRegistrosHoje = (registrosRepro || []).filter(r => r.data === hojeStr && r.vetId === currentUser.id).length;

  const goToTab = (t, s) => { setTab(t); setScreen(s); };

  const stats = [
    { label: 'Locais', value: locaisRepro.length, tab: 'locais', screen: 'repro-locais' },
    { label: 'Proprietários', value: propRepro.length, tab: 'proprietarios', screen: 'repro-proprietarios' },
    { label: 'Éguas', value: eguasRepro.length, tab: 'eguas', screen: 'repro-eguas' },
    { label: 'Meus regs hoje', value: meusRegistrosHoje, tab: 'caderno', screen: 'repro-caderno' },
  ];

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }}>
        {stats.map(s => (
          <button key={s.label} onClick={() => goToTab(s.tab, s.screen)} style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
            padding: '14px 14px', textAlign: 'left', color: 'var(--ink)', cursor: 'pointer',
          }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 24, letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
          </button>
        ))}
      </div>

      <button onClick={() => goToTab('caderno', 'repro-caderno')} style={{
        width: '100%', background: `linear-gradient(135deg, ${CORES_TAB_ATIVA}, #591e6a)`, color: '#fff',
        border: 'none', borderRadius: 16, padding: '20px 18px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
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
function ReproLocais({ locaisRepro, addLocalRepro, updateLocalRepro, deleteLocalRepro }) {
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
        {lista.map(l => (
          <div key={l.id} style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
            padding: '14px 16px', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
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
            </div>
            <button onClick={() => abrirEditar(l)} style={{
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
  const [form, setForm] = useState({ nome: '', telefone: '', email: '' });

  const lista = [...propRepro]
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'))
    .filter(p => !busca.trim() || norm(`${p.nome || ''} ${p.email || ''} ${p.telefone || ''}`).includes(norm(busca.trim())));

  const abrirNovo = () => {
    setEditId(null);
    setForm({ nome: '', telefone: '', email: '' });
    setShowForm(true);
  };
  const abrirEditar = (p) => {
    setEditId(p.id);
    setForm({ nome: p.nome, telefone: p.telefone || '', email: p.email || '' });
    setShowForm(true);
  };
  const salvar = () => {
    if (!form.nome.trim()) return;
    if (editId) {
      updateProprietario(editId, { ...form, workspaceId: 'repro' });
    } else {
      // addProprietario apenas cria com nome; depois updateProprietario com resto
      const id = addProprietario(form.nome.trim(), 'repro');
      if (id && (form.telefone || form.email)) {
        updateProprietario(id, { ...form, workspaceId: 'repro' });
      }
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
// Caderno de reprodução — Placeholder Fase 1
// (IA/TE detalhados vêm na fase seguinte com DG, receptora, retorno,
//  divisão de km, etc. Aqui só a lista pra confirmar que o shell funciona.)
// ─────────────────────────────────────────────────────────────
function ReproCaderno({ registrosRepro, eguasRepro, locaisRepro, vetsExternos, currentUser }) {
  const [busca, setBusca] = useState('');

  const lista = [...(registrosRepro || [])]
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
    .filter(r => {
      if (!busca.trim()) return true;
      const egua = eguasRepro.find(e => e.id === r.eguaId);
      return norm(`${egua?.nome || ''} ${r.tipo || ''}`).includes(norm(busca.trim()));
    });

  return (
    <div>
      <TopBar title="Caderno de reprodução" subtitle={`${lista.length} registro${lista.length !== 1 ? 's' : ''}`} />
      <div style={{ padding: '12px 20px 0' }}>
        <SearchBar value={busca} onChange={setBusca} placeholder="Buscar por égua ou tipo…" />
      </div>
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{
          background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 12,
          padding: '14px 16px', marginBottom: 14, fontSize: 13, color: '#92400e', lineHeight: 1.5,
        }}>
          <strong>Fase 1:</strong> shell do caderno está pronto. Registro completo de IA/TE com DG,
          receptora, data de retorno e faturamento por km chegam no próximo commit.
        </div>
        {lista.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
            Sem registros ainda.
          </div>
        )}
        {lista.map(r => {
          const egua = eguasRepro.find(e => e.id === r.eguaId);
          const vet = vetsExternos.find(v => v.id === r.vetId);
          const local = locaisRepro.find(l => l.id === r.localId);
          return (
            <div key={r.id} style={{
              background: 'var(--card)', border: `1px solid var(--line)`,
              borderLeft: `3px solid ${vet?.cor || CORES_TAB_ATIVA}`,
              borderRadius: 12, padding: '12px 14px', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{r.data}</span>
                {vet && (
                  <span style={{ fontSize: 10, color: '#fff', background: vet.cor, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                    {vet.nome.split(' ')[0]}
                  </span>
                )}
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>{egua?.nome || '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
                {r.tipo}{local ? ` · ${local.nome}` : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shell principal — decide qual tela renderizar
// ─────────────────────────────────────────────────────────────
export function ReproApp({
  currentUser, vetsExternos, locaisRepro, proprietarios, cavalos, registrosReproducao = [],
  addLocalRepro, updateLocalRepro, deleteLocalRepro,
  addProprietario, updateProprietario, deleteProprietario,
  addCavalo, updateCavalo, deleteCavalo,
  onLogout,
}) {
  const [screen, setScreen] = useState('repro-home');
  const [tab, setTab] = useState('home');

  // Filtra dados por workspace='repro'
  const propRepro = useMemo(() => proprietarios.filter(p => p.workspaceId === 'repro'), [proprietarios]);
  const eguasRepro = useMemo(() => cavalos.filter(c => c.workspaceId === 'repro'), [cavalos]);
  const registrosRepro = useMemo(() => (registrosReproducao || []).filter(r => r.workspaceId === 'repro'), [registrosReproducao]);

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
    />;
  } else if (screen === 'repro-locais') {
    content = <ReproLocais
      locaisRepro={locaisRepro}
      addLocalRepro={addLocalRepro}
      updateLocalRepro={updateLocalRepro}
      deleteLocalRepro={deleteLocalRepro}
    />;
  } else if (screen === 'repro-proprietarios') {
    content = <ReproProprietarios
      propRepro={propRepro}
      locaisRepro={locaisRepro}
      addProprietario={addProprietario}
      updateProprietario={updateProprietario}
      deleteProprietario={deleteProprietario}
    />;
  } else if (screen === 'repro-eguas') {
    content = <ReproEguas
      eguasRepro={eguasRepro}
      propRepro={propRepro}
      locaisRepro={locaisRepro}
      addCavalo={addCavalo}
      updateCavalo={updateCavalo}
      deleteCavalo={deleteCavalo}
    />;
  } else if (screen === 'repro-caderno') {
    content = <ReproCaderno
      registrosRepro={registrosRepro}
      eguasRepro={eguasRepro}
      locaisRepro={locaisRepro}
      vetsExternos={vetsExternos}
      currentUser={currentUser}
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
