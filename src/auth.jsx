// auth.jsx — Login screen, users config, and role definitions
import React, { useState } from 'react';
import logoEpona from './assets/logo-epona.png';

export const USERS = [
  { id: 'u1', nome: 'Carolina', role: 'admin', senha: '1234', iniciais: 'CA' },
  { id: 'u2', nome: 'Dr. Marcos', role: 'vet', senha: '1234', iniciais: 'DM' },
  { id: 'u3', nome: 'José', role: 'operacional', senha: '1234', iniciais: 'JT' },
  { id: 'u4', nome: 'Ana', role: 'operacional', senha: '1234', iniciais: 'AS' },
];

export const ROLE_LABELS = {
  admin: 'Administrador',
  vet: 'Veterinário',
  operacional: 'Operacional',
};

export const ROLE_COLORS = {
  admin: '#3d6043',
  vet: '#0f766e',
  operacional: '#1e40af',
};

export function LoginScreen({ onLogin, usuarios }) {
  const lista = (usuarios && usuarios.length > 0) ? usuarios : USERS;
  const [step, setStep] = useState('select');
  const [selectedUser, setSelectedUser] = useState(null);
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleSelect = (user) => {
    setSelectedUser(user);
    setSenha('');
    setErro('');
    setStep('senha');
  };

  const handleLogin = () => {
    if (selectedUser.senha === senha) {
      onLogin(selectedUser);
    } else {
      setErro('Senha incorreta');
    }
  };

  return (
    <div style={{
      minHeight: '100%', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      padding: '32px 24px 40px',
    }}>
      {/* Branding */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ margin: '0 auto 14px', width: 80, height: 80 }}>
          <img src={logoEpona} alt="Epona" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
          Epona
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Gestão equestre
        </div>
      </div>

      {step === 'select' ? (
        <div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Selecione seu perfil
          </div>
          {lista.map(u => (
            <button key={u.id} onClick={() => handleSelect(u)} style={{
              width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '14px 16px', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
              color: 'var(--ink)', cursor: 'pointer',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 22,
                background: ROLE_COLORS[u.role], color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, flexShrink: 0,
                letterSpacing: '-0.02em',
              }}>
                {u.iniciais}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{u.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                  {ROLE_LABELS[u.role]}
                </div>
              </div>
              <div style={{ fontSize: 20, color: 'var(--ink-3)', lineHeight: 1 }}>›</div>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button onClick={() => setStep('select')} style={{
            background: 'none', border: 'none', fontSize: 13, color: 'var(--accent)',
            padding: 0, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 5,
            cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>
            ‹ Trocar perfil
          </button>

          <div style={{
            background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '16px', marginBottom: 22,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: 25,
              background: ROLE_COLORS[selectedUser.role], color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em',
            }}>
              {selectedUser.iniciais}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{selectedUser.nome}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                {ROLE_LABELS[selectedUser.role]}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
              Senha
            </div>
            <input
              type="password"
              value={senha}
              onChange={e => { setSenha(e.target.value); setErro(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Digite sua senha"
              autoFocus
              style={{
                width: '100%', padding: '14px', borderRadius: 12,
                border: '1px solid ' + (erro ? '#ef4444' : 'var(--line)'),
                background: 'var(--card)', fontSize: 16,
                color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
                fontFamily: 'var(--sans)',
              }}
            />
            {erro && (
              <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{erro}</div>
            )}
          </div>


          <button onClick={handleLogin} style={{
            width: '100%', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 14, padding: '16px',
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'var(--sans)',
            boxShadow: '0 8px 20px rgba(61,96,67,0.25)',
          }}>
            Entrar
          </button>
        </div>
      )}
    </div>
  );
}
