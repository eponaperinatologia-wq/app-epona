// auth.jsx — Login screen and role definitions
import React, { useState, useEffect } from 'react';
import logoEpona from './assets/logo-epona.png';
import { loginProprietario } from './auth-proprietario';
import { loginVetExterno } from './auth-vet-externo';
import { entrar, listaEquipe } from './auth-conta';

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

export function LoginScreen({ onLogin, onCancelAddAccount = null, aviso = '' }) {
  // Modos: 'perfil' (seleção equipe vs proprietário) | 'equipe-select' | 'equipe-senha' | 'proprietario-form'
  const [modo, setModo] = useState('perfil');
  const [selectedUser, setSelectedUser] = useState(null);
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  // Equipe: nomes vêm do servidor (só quem tem conta); a senha é conferida lá.
  const [lista, setLista] = useState([]);
  const [listaStatus, setListaStatus] = useState('idle'); // idle | carregando | ok | erro
  const [equipeLoading, setEquipeLoading] = useState(false);

  useEffect(() => {
    if (modo !== 'equipe-select' || listaStatus === 'carregando' || listaStatus === 'ok') return;
    setListaStatus('carregando');
    listaEquipe()
      .then(l => { setLista(l); setListaStatus('ok'); })
      .catch(() => setListaStatus('erro'));
  }, [modo, listaStatus]);
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

  const handleLogin = async () => {
    setErro('');
    if (!senha) { setErro('Digite sua senha'); return; }
    setEquipeLoading(true);
    try {
      const user = await entrar('equipe', selectedUser.id, senha);
      if (!user) { setErro('Senha incorreta'); return; }
      await onLogin(user);
    } catch (e) {
      setErro(e.message || 'Erro no login');
    } finally {
      setEquipeLoading(false);
    }
  };

  const handleLoginProprietario = async () => {
    setErro('');
    if (!propLogin.trim() || !propSenha) { setErro('Preencha login e senha'); return; }
    setPropLoading(true);
    try {
      // Usuário já vem montado pelo servidor, com role='proprietario' e as
      // flags dos gates de onboarding.
      const user = await loginProprietario(propLogin.trim(), propSenha);
      if (!user) {
        setErro('Login ou senha incorretos');
        return;
      }
      await onLogin(user);
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
      const user = await loginVetExterno(reproLogin.trim(), reproSenha);
      if (!user) { setErro('Login ou senha incorretos'); return; }
      await onLogin(user);
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

      {aviso && (
        <div style={{
          background: '#fef9c3', border: '1px solid #fde047', color: '#713f12',
          borderRadius: 12, padding: '10px 14px', fontSize: 13, lineHeight: 1.4, marginBottom: 16,
        }}>
          {aviso}
        </div>
      )}

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
          {listaStatus === 'carregando' && (
            <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: '14px 0' }}>Carregando equipe…</div>
          )}
          {listaStatus === 'erro' && (
            <div style={{ fontSize: 13, color: '#b91c1c', padding: '10px 0' }}>
              Não foi possível carregar a equipe.{' '}
              <button onClick={() => setListaStatus('idle')} style={{
                background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer',
                fontSize: 13, padding: 0, fontFamily: 'var(--sans)', textDecoration: 'underline',
              }}>Tentar de novo</button>
            </div>
          )}
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
              onKeyDown={e => e.key === 'Enter' && !equipeLoading && handleLogin()}
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


          <button onClick={handleLogin} disabled={equipeLoading} style={{
            width: '100%', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 14, padding: '16px',
            fontSize: 16, fontWeight: 700, cursor: equipeLoading ? 'default' : 'pointer',
            fontFamily: 'var(--sans)', opacity: equipeLoading ? 0.6 : 1,
            boxShadow: '0 8px 20px rgba(61,96,67,0.25)',
          }}>
            {equipeLoading ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      )}
    </div>
  );
}
