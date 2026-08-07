// repro-admin.jsx — Tela do admin para gerenciar vets externos
// (Epona Repro Team). Cria/edita nome, cor (badge no caderno/planner
// do repro), login e senha padrão. Senha vai por RPC (bcrypt).
import React, { useState } from 'react';
import { Icon } from './icons';
import { norm } from './data';
import { TopBar } from './screens';
import { criarCredencialVetExterno } from './auth-vet-externo';

// Paleta de cores sugeridas — o admin pode escolher qualquer uma delas
// ou digitar um hex customizado. Todas com contraste bom com texto branco.
const CORES_SUGERIDAS = [
  '#7c2d8c', '#1d4ed8', '#0f766e', '#b45309', '#dc2626', '#16a34a',
  '#0e7490', '#7c3aed', '#be123c', '#374151',
];

export function CadVetsExternosScreen({
  setScreen, vetsExternos = [], addVetExterno, updateVetExterno,
  deleteVetExterno, refetchVetExterno,
}) {
  const [busca, setBusca] = useState('');
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState(CORES_SUGERIDAS[0]);
  const [ativo, setAtivo] = useState(true);

  // Form de credencial (login + senha padrão)
  const [showCredForm, setShowCredForm] = useState(false);
  const [credLogin, setCredLogin] = useState('');
  const [credSenha, setCredSenha] = useState('');
  const [credErro, setCredErro] = useState('');
  const [credOk, setCredOk] = useState(false);
  const [credLoading, setCredLoading] = useState(false);
  const [credTargetId, setCredTargetId] = useState(null);

  const lista = [...vetsExternos]
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'))
    .filter(v => !busca.trim() || norm(`${v.nome || ''} ${v.login || ''}`).includes(norm(busca.trim())));

  const abrirNovo = () => {
    setEditId(null);
    setNome('');
    setCor(CORES_SUGERIDAS[0]);
    setAtivo(true);
    setShowForm(true);
  };

  const abrirEditar = (v) => {
    setEditId(v.id);
    setNome(v.nome);
    setCor(v.cor || CORES_SUGERIDAS[0]);
    setAtivo(v.ativo !== false);
    setShowForm(true);
  };

  const salvarBasico = () => {
    if (!nome.trim()) return;
    if (editId) {
      updateVetExterno(editId, { nome: nome.trim(), cor, ativo });
    } else {
      addVetExterno({ nome: nome.trim(), cor, ativo });
    }
    setShowForm(false);
  };

  const abrirCredencial = (v) => {
    setCredTargetId(v.id);
    setCredLogin(v.login || (v.nome || '').toLowerCase().trim().split(/\s+/)[0] || '');
    setCredSenha('');
    setCredErro('');
    setCredOk(false);
    setShowCredForm(true);
  };

  const salvarCredencial = async () => {
    setCredErro('');
    if (!credLogin.trim()) { setCredErro('Login não pode ser vazio'); return; }
    if (credSenha.length < 4) { setCredErro('Senha precisa ter ao menos 4 caracteres'); return; }
    setCredLoading(true);
    try {
      await criarCredencialVetExterno(credTargetId, credLogin.trim(), credSenha);
      setCredOk(true);
      setShowCredForm(false);
      if (refetchVetExterno) await refetchVetExterno(credTargetId);
      setTimeout(() => setCredOk(false), 2500);
    } catch (e) {
      setCredErro(e.message || 'Erro ao salvar credencial');
    } finally {
      setCredLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--line)', background: 'var(--bg)',
    fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar
        title="Vets externos"
        subtitle="Epona Repro Team"
        onBack={() => setScreen('equipe')}
        action={
          <button onClick={abrirNovo} style={{
            width: 36, height: 36, borderRadius: 12, background: '#7c2d8c',
            display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer',
          }}>
            <Icon name="plus" size={18} color="#fff" />
          </button>
        }
      />

      <div style={{ padding: '12px 20px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--card)', border: '1px solid var(--line)',
          borderRadius: 12, padding: '9px 14px',
        }}>
          <Icon name="search" size={16} color="var(--ink-3)" />
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar vet…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)' }}
          />
          {busca && (
            <button onClick={() => setBusca('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink-3)', fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </div>
      </div>

      {credOk && (
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="check" size={14} /> Credencial salva. Passe login e senha ao vet.
          </div>
        </div>
      )}

      <div style={{ padding: '12px 20px 0' }}>
        {lista.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
            {busca ? 'Nenhum vet encontrado.' : 'Nenhum vet externo cadastrado. Toque em + para criar.'}
          </div>
        )}
        {lista.map(v => (
          <div key={v.id} style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
            padding: 14, marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 40, background: v.cor || '#7c2d8c', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700,
              }}>
                {(v.nome || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'V'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{v.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                  {v.temAcesso ? (
                    <>
                      Login <strong style={{ color: 'var(--ink-2)' }}>{v.login}</strong>
                      {v.senhaProvisoria && <span style={{ marginLeft: 6, color: '#92400e' }}>· aguardando 1º login</span>}
                    </>
                  ) : 'Sem acesso configurado'}
                  {v.ativo === false && <span style={{ marginLeft: 6, color: '#dc2626' }}>· inativo</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => abrirEditar(v)} style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)',
                background: 'var(--card)', color: 'var(--ink-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)',
              }}>Editar dados</button>
              <button onClick={() => abrirCredencial(v)} style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #7c2d8c',
                background: v.temAcesso ? 'var(--card)' : '#7c2d8c', color: v.temAcesso ? '#7c2d8c' : '#fff',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)',
              }}>{v.temAcesso ? 'Resetar senha' : 'Criar credencial'}</button>
              {deleteVetExterno && (
                <button onClick={() => { if (window.confirm(`Excluir ${v.nome}?`)) deleteVetExterno(v.id); }} style={{
                  width: 36, padding: '8px', borderRadius: 8, border: '1px solid #dc262640',
                  background: '#fee2e2', color: '#dc2626', cursor: 'pointer',
                  display: 'grid', placeItems: 'center',
                }}>
                  <Icon name="trash" size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: form básico (nome/cor/ativo) */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', marginBottom: 16 }}>
            {editId ? 'Editar vet externo' : 'Novo vet externo'}
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, fontWeight: 700 }}>Nome</div>
            <input value={nome} onChange={e => setNome(e.target.value)} style={inputStyle} placeholder="Ex: Dr. João Silva" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, fontWeight: 700 }}>Cor no calendário/caderno</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CORES_SUGERIDAS.map(c => (
                <button key={c} onClick={() => setCor(c)} style={{
                  width: 34, height: 34, borderRadius: 10, border: cor === c ? '3px solid var(--ink)' : '1px solid var(--line)',
                  background: c, cursor: 'pointer', padding: 0,
                }} />
              ))}
              <input value={cor} onChange={e => setCor(e.target.value)} style={{ ...inputStyle, width: 100, padding: '6px 10px', fontSize: 12 }} placeholder="#hex" />
            </div>
          </div>
          {editId && (
            <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontSize: 14, color: 'var(--ink)' }}>Vet ativo (permite login)</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Cancelar</button>
            <button onClick={salvarBasico} disabled={!nome.trim()} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: '#7c2d8c', color: '#fff', fontSize: 13, fontWeight: 700, cursor: nome.trim() ? 'pointer' : 'default', fontFamily: 'var(--sans)', opacity: nome.trim() ? 1 : 0.5 }}>{editId ? 'Salvar' : 'Criar'}</button>
          </div>
        </Modal>
      )}

      {/* Modal: credencial (login + senha) */}
      {showCredForm && (
        <Modal onClose={() => setShowCredForm(false)}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', marginBottom: 6 }}>
            {vetsExternos.find(v => v.id === credTargetId)?.temAcesso ? 'Resetar senha' : 'Criar credencial'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 14, lineHeight: 1.4 }}>
            Vet será obrigado a trocar a senha no 1º acesso.
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, fontWeight: 700 }}>Login</div>
            <input value={credLogin} onChange={e => setCredLogin(e.target.value)} disabled={vetsExternos.find(v => v.id === credTargetId)?.temAcesso} style={{ ...inputStyle, background: vetsExternos.find(v => v.id === credTargetId)?.temAcesso ? 'var(--soft)' : 'var(--bg)' }} placeholder="ex: joao.silva" />
            {vetsExternos.find(v => v.id === credTargetId)?.temAcesso && (
              <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>Login não pode ser alterado — só a senha.</div>
            )}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, fontWeight: 700 }}>Senha padrão</div>
            <input type="text" value={credSenha} onChange={e => setCredSenha(e.target.value)} style={inputStyle} placeholder="mín. 4 caracteres" />
          </div>
          {credErro && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 10 }}>{credErro}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowCredForm(false)} disabled={credLoading} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Cancelar</button>
            <button onClick={salvarCredencial} disabled={credLoading} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: '#7c2d8c', color: '#fff', fontSize: 13, fontWeight: 700, cursor: credLoading ? 'default' : 'pointer', fontFamily: 'var(--sans)', opacity: credLoading ? 0.6 : 1 }}>
              {credLoading ? 'Salvando…' : 'Salvar credencial'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Modal genérico — overlay com card centralizado
function Modal({ onClose, children }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg)', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {children}
      </div>
    </div>
  );
}
