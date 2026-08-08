// auth.jsx — Login screen, users config, and role definitions
import React, { useState } from 'react';
import logoEpona from './assets/logo-epona.png';
import { loginProprietario } from './auth-proprietario';
import { loginVetExterno } from './auth-vet-externo';

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
  proprietario: 'Proprietário',
  repro: 'Epona Repro Team',
};

export const ROLE_COLORS = {
  admin: '#3d6043',
  vet: '#0f766e',
  operacional: '#1e40af',
  proprietario: '#7c2d8c',
  repro: '#7c2d8c',
};

export function LoginScreen({ onLogin, usuarios, onCancelAddAccount = null }) {
  const lista = (usuarios && usuarios.length > 0) ? usuarios : USERS;
  // Modos: 'perfil' (seleção equipe vs proprietário) | 'equipe-select' | 'equipe-senha' | 'proprietario-form'
  const [modo, setModo] = useState('perfil');
  const [selectedUser, setSelectedUser] = useState(null);
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  // Proprietário
  const [propLogin, setPropLogin] = useState('');
  const [propSenha, setPropSenha] = useState('');
  const [propLoading, setPropLoading] = useState(false);
  // Vet externo (Epona Repro Team)
  const [reproLogin, setReproLogin] = useState('');
  const [reproSenha, setReproSenha] = useState('');
  const [reproLoading, setReproLoading] = useState(false);

  const handleSelect = (user) => {
    setSelectedUser(user);
    setSenha('');
    setErro('');
    setModo('equipe-senha');
  };

  const handleLogin = () => {
    if (selectedUser.senha === senha) {
      onLogin(selectedUser);
    } else {
      setErro('Senha incorreta');
    }
  };

  const handleLoginProprietario = async () => {
    setErro('');
    if (!propLogin.trim() || !propSenha) { setErro('Preencha login e senha'); return; }
    setPropLoading(true);
    try {
      const dados = await loginProprietario(propLogin.trim(), propSenha);
      if (!dados) {
        setErro('Login ou senha incorretos');
        return;
      }
      // Monta objeto currentUser no mesmo formato que o app já espera,
      // com role='proprietario' e flags dos gates de onboarding.
      onLogin({
        id: dados.id,
        nome: dados.nome,
        role: 'proprietario',
        login: dados.login,
        iniciais: (dados.nome || '').split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase(),
        senhaProvisoria: dados.senhaProvisoria,
        cadastroCompleto: dados.cadastroCompleto,
        contratoStatus: dados.contratoStatus,
        // Senha em memória para reautenticar em chamadas server-side (Edge
        // Functions do Assinafy). NÃO persiste em localStorage — se o user
        // der refresh precisa logar de novo, o que é aceitável.
        _sessionPassword: propSenha,
      });
    } catch (e) {
      setErro(e.message || 'Erro no login');
    } finally {
      setPropLoading(false);
    }
  };

  const handleLoginRepro = async () => {
    setErro('');
    if (!reproLogin.trim() || !reproSenha) { setErro('Preencha login e senha'); return; }
    setReproLoading(true);
    try {
      const dados = await loginVetExterno(reproLogin.trim(), reproSenha);
      if (!dados) { setErro('Login ou senha incorretos'); return; }
      onLogin({
        id: dados.id,
        nome: dados.nome,
        role: 'repro',
        login: dados.login,
        cor: dados.cor,
        iniciais: (dados.nome || '').split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase(),
        senhaProvisoria: dados.senhaProvisoria,
        // Senha em memória (não persiste) — usada pra trocar_senha_rpc no gate.
        _sessionPassword: reproSenha,
      });
    } catch (e) {
      setErro(e.message || 'Erro no login');
    } finally {
      setReproLoading(false);
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

      {onCancelAddAccount && (
        <button
          onClick={onCancelAddAccount}
          style={{
            width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 12, padding: '10px 14px', color: 'var(--ink-2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--sans)',
            fontSize: 13, marginBottom: 16,
          }}
        >
          ← Voltar sem adicionar
        </button>
      )}

      {modo === 'perfil' && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {onCancelAddAccount ? 'Nova conta — como você acessa?' : 'Como você acessa?'}
          </div>
          <button onClick={() => setModo('equipe-select')} style={{
            width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '18px 18px', marginBottom: 12, textAlign: 'left', color: 'var(--ink)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: ROLE_COLORS.admin, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
            }}>👥</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Sou da equipe</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Admin, veterinário ou operacional</div>
            </div>
            <div style={{ fontSize: 20, color: 'var(--ink-3)' }}>›</div>
          </button>
          <button onClick={() => setModo('proprietario-form')} style={{
            width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '18px 18px', marginBottom: 12, textAlign: 'left', color: 'var(--ink)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: ROLE_COLORS.proprietario, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
            }}>🐴</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Sou proprietário</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Acompanhar meus animais e fatura</div>
            </div>
            <div style={{ fontSize: 20, color: 'var(--ink-3)' }}>›</div>
          </button>
          <button onClick={() => setModo('repro-form')} style={{
            width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '18px 18px', textAlign: 'left', color: 'var(--ink)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: '#7c2d8c', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
            }}>🧬</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Epona Repro Team</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Reprodução extra-haras</div>
            </div>
            <div style={{ fontSize: 20, color: 'var(--ink-3)' }}>›</div>
          </button>
        </div>
      )}

      {modo === 'repro-form' && (
        <div>
          <button onClick={() => setModo('perfil')} style={{
            background: 'none', border: 'none', fontSize: 13, color: 'var(--accent)',
            padding: 0, marginBottom: 22, cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>‹ Voltar</button>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Epona Repro Team
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6, fontWeight: 600 }}>Login</div>
            <input value={reproLogin} onChange={e => { setReproLogin(e.target.value); setErro(''); }}
              autoCapitalize="none" autoCorrect="off" placeholder="seu.login"
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--card)', fontSize: 16, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--sans)' }} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6, fontWeight: 600 }}>Senha</div>
            <input type="password" value={reproSenha} onChange={e => { setReproSenha(e.target.value); setErro(''); }}
              onKeyDown={e => e.key === 'Enter' && !reproLoading && handleLoginRepro()}
              placeholder="Sua senha"
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid ' + (erro ? '#ef4444' : 'var(--line)'), background: 'var(--card)', fontSize: 16, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--sans)' }} />
            {erro && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{erro}</div>}
          </div>
          <button onClick={handleLoginRepro} disabled={reproLoading} style={{
            width: '100%', background: '#7c2d8c', color: '#fff',
            border: 'none', borderRadius: 14, padding: '16px', marginTop: 16,
            fontSize: 16, fontWeight: 700, cursor: reproLoading ? 'default' : 'pointer',
            fontFamily: 'var(--sans)', opacity: reproLoading ? 0.6 : 1,
            boxShadow: '0 8px 20px rgba(124,45,140,0.25)',
          }}>
            {reproLoading ? 'Entrando…' : 'Entrar'}
          </button>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 14, textAlign: 'center' }}>
            Não tem acesso? Fale com Alexandre ou Carolina.
          </div>
        </div>
      )}

      {modo === 'proprietario-form' && (
        <div>
          <button onClick={() => setModo('perfil')} style={{
            background: 'none', border: 'none', fontSize: 13, color: 'var(--accent)',
            padding: 0, marginBottom: 22, cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>‹ Voltar</button>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Acesso do proprietário
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6, fontWeight: 600 }}>Login</div>
            <input value={propLogin} onChange={e => { setPropLogin(e.target.value); setErro(''); }}
              autoCapitalize="none" autoCorrect="off" placeholder="seu.login"
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--card)', fontSize: 16, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--sans)' }} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6, fontWeight: 600 }}>Senha</div>
            <input type="password" value={propSenha} onChange={e => { setPropSenha(e.target.value); setErro(''); }}
              onKeyDown={e => e.key === 'Enter' && !propLoading && handleLoginProprietario()}
              placeholder="Sua senha"
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid ' + (erro ? '#ef4444' : 'var(--line)'), background: 'var(--card)', fontSize: 16, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--sans)' }} />
            {erro && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{erro}</div>}
          </div>
          <button onClick={handleLoginProprietario} disabled={propLoading} style={{
            width: '100%', background: ROLE_COLORS.proprietario, color: '#fff',
            border: 'none', borderRadius: 14, padding: '16px', marginTop: 16,
            fontSize: 16, fontWeight: 700, cursor: propLoading ? 'default' : 'pointer',
            fontFamily: 'var(--sans)', opacity: propLoading ? 0.6 : 1,
            boxShadow: '0 8px 20px rgba(124,45,140,0.25)',
          }}>
            {propLoading ? 'Entrando…' : 'Entrar'}
          </button>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 14, textAlign: 'center' }}>
            Não tem acesso? Fale com o administrador do haras.
          </div>
        </div>
      )}

      {modo === 'equipe-select' && (
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
          <button onClick={() => setModo('perfil')} style={{
            width: '100%', background: 'none', border: 'none', color: 'var(--ink-3)',
            padding: '10px 0', marginTop: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>‹ Voltar</button>
        </div>
      )}

      {modo === 'equipe-senha' && selectedUser && (
        <div>
          <button onClick={() => setModo('equipe-select')} style={{
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
