// Componente compartilhado pelas 3 shells (admin, proprietário, repro)
// pra listar sessões ativas e trocar entre elas. Fica embutido na tela
// "Conta" de cada shell.

import React from 'react';
import { Icon } from './icons';

const ROLE_LABEL = {
  admin: 'Admin Epona Stud',
  operacional: 'Operacional',
  proprietario: 'Proprietário',
  repro: 'Epona Repro Team',
};
const ROLE_COR = {
  admin: '#3d6043',
  operacional: '#a16207',
  proprietario: '#1e3a8a',
  repro: '#7c2d8c',
};

function iniciais(nome) {
  return String(nome || '?')
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function SwitcherContas({
  sessions = [],
  activeKey,
  currentUser,
  onSwitch,
  onAddAccount,
  onRemoveSession,
}) {
  const cor = ROLE_COR[currentUser?.role] || '#888';

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)',
      borderRadius: 14, padding: 14, marginBottom: 12,
    }}>
      <div style={{
        fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase',
        letterSpacing: '0.06em', marginBottom: 10, fontWeight: 700,
      }}>
        Suas contas
      </div>

      {sessions.map(s => {
        const u = s.user;
        const ativa = s.key === activeKey;
        const c = ROLE_COR[u.role] || cor;
        return (
          <div key={s.key} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px',
            background: ativa ? '#f5e8ff' : 'transparent',
            border: ativa ? '1px solid #d8b4fe' : '1px solid transparent',
            borderRadius: 10, marginBottom: 4,
          }}>
            <button
              onClick={() => !ativa && onSwitch(s.key)}
              disabled={ativa}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                background: 'none', border: 'none', padding: 0,
                cursor: ativa ? 'default' : 'pointer', textAlign: 'left',
                color: 'var(--ink)',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 34,
                background: c, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>{iniciais(u.nome)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  {u.nome || '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: 6, background: c, display: 'inline-block',
                  }} />
                  {ROLE_LABEL[u.role] || u.role}
                  {ativa && <span style={{
                    marginLeft: 6, fontSize: 10, background: '#7c2d8c', color: '#fff',
                    padding: '1px 6px', borderRadius: 4, fontWeight: 700,
                  }}>Ativa</span>}
                </div>
              </div>
            </button>
            {!ativa && (
              <button
                onClick={() => {
                  if (window.confirm(`Remover a sessão de ${u.nome}? Você precisará fazer login de novo pra usá-la.`)) {
                    onRemoveSession(s.key);
                  }
                }}
                title="Remover esta sessão"
                style={{
                  width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)',
                  background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer',
                  display: 'grid', placeItems: 'center',
                }}
              >
                <Icon name="x" size={12} />
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={onAddAccount}
        style={{
          width: '100%', marginTop: 4, padding: '11px 12px', borderRadius: 10,
          border: '1px dashed var(--line)', background: 'transparent',
          color: 'var(--ink-2)', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--sans)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <Icon name="plus" size={14} /> Adicionar outra conta
      </button>
    </div>
  );
}
