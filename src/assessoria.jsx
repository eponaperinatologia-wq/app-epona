// assessoria.jsx — Área de assessoria clínica (contratos mensais +
// visitas clínicas) do shell Epona Repro Team. Entry é a tela de hub
// de contratos; dali abre o detalhe por contrato (lista de visitas +
// histórico) e o painel de visita em andamento.

import React, { useMemo, useState } from 'react';
import { Icon } from './icons';
import { TopBar } from './screens';

// Orquestra a navegação entre hub → form → detalhe do contrato.
// Chamado pela VeterinariaScreen quando o card "Assessoria" é clicado.
export function AssessoriaFlow({
  contratosAssessoria = [], visitasClinicas = [],
  proprietarios = [], locais = [], vetsExternos = [],
  addContratoAssessoria, updateContratoAssessoria, deleteContratoAssessoria,
  addVisitaClinica, updateVisitaClinica, deleteVisitaClinica,
  currentUser, onBack,
}) {
  const [tela, setTela] = useState('hub'); // 'hub' | 'novoContrato' | 'editarContrato' | 'detalheContrato'
  const [contratoSelId, setContratoSelId] = useState(null);

  const abrirContrato = (id) => { setContratoSelId(id); setTela('detalheContrato'); };
  const abrirNovoContrato = () => { setContratoSelId(null); setTela('novoContrato'); };
  const abrirEditarContrato = (id) => { setContratoSelId(id); setTela('editarContrato'); };
  const voltarHub = () => { setContratoSelId(null); setTela('hub'); };

  if (tela === 'novoContrato') {
    return (
      <ContratoForm
        proprietarios={proprietarios} locais={locais}
        onSave={async (payload) => {
          const id = await addContratoAssessoria(payload);
          if (id) { setContratoSelId(id); setTela('detalheContrato'); }
          else voltarHub();
        }}
        onCancel={voltarHub}
      />
    );
  }
  if (tela === 'editarContrato') {
    const c = contratosAssessoria.find(x => x.id === contratoSelId);
    if (!c) { voltarHub(); return null; }
    return (
      <ContratoForm
        contrato={c}
        proprietarios={proprietarios} locais={locais}
        onSave={(patch) => {
          updateContratoAssessoria(c.id, patch);
          setTela('detalheContrato');
        }}
        onCancel={() => setTela('detalheContrato')}
        onDelete={() => deleteContratoAssessoria(c.id)}
      />
    );
  }
  if (tela === 'detalheContrato') {
    const c = contratosAssessoria.find(x => x.id === contratoSelId);
    if (!c) { voltarHub(); return null; }
    return (
      <ContratoDetalhe
        contrato={c}
        visitasClinicas={visitasClinicas.filter(v => v.contratoId === c.id)}
        proprietarios={proprietarios} locais={locais} vetsExternos={vetsExternos}
        onBack={voltarHub}
        onEditarContrato={() => abrirEditarContrato(c.id)}
        onNovaVisita={async (dataIso) => {
          const id = await addVisitaClinica({
            contratoId: c.id,
            data: dataIso || new Date().toISOString().slice(0, 10),
            localId: c.localId || null,
            vetsParticipantes: currentUser?.id ? [currentUser.id] : [],
            valorCobrado: c.valorMensal,
            observacoes: '',
            status: 'rascunho',
          });
          return id;
        }}
        updateVisitaClinica={updateVisitaClinica}
        deleteVisitaClinica={deleteVisitaClinica}
        currentUser={currentUser}
      />
    );
  }

  // tela === 'hub'
  return (
    <AssessoriaHub
      contratosAssessoria={contratosAssessoria}
      visitasClinicas={visitasClinicas}
      proprietarios={proprietarios} locais={locais} vetsExternos={vetsExternos}
      onAbrirContrato={abrirContrato}
      onNovoContrato={abrirNovoContrato}
      onBack={onBack}
    />
  );
}

const CORES = {
  roxo: '#7c2d8c',
  roxoBg: '#f5e8ff',
  verde: '#16a34a',
  amarelo: '#f59e0b',
  cinza: '#6b7280',
};

// ─────────────────────────────────────────────────────────────
// Hub: lista de contratos ativos (cards) + histórico de encerrados
// ─────────────────────────────────────────────────────────────
export function AssessoriaHub({
  contratosAssessoria = [], visitasClinicas = [],
  proprietarios = [], locais = [], vetsExternos = [],
  onAbrirContrato, onNovoContrato, onBack,
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [mostrarEncerrados, setMostrarEncerrados] = useState(false);

  const ativos = contratosAssessoria.filter(c => !c.fim || c.fim >= hoje);
  const encerrados = contratosAssessoria.filter(c => c.fim && c.fim < hoje);

  const resumoContrato = (c) => {
    const minhasVisitas = visitasClinicas.filter(v => v.contratoId === c.id);
    const finalizadas = minhasVisitas.filter(v => v.status === 'finalizada');
    const ultima = [...finalizadas].sort((a, b) => (b.data || '').localeCompare(a.data || ''))[0];
    const agendadas = minhasVisitas.filter(v => v.status === 'rascunho' && v.data >= hoje);
    const rascunhoHoje = minhasVisitas.find(v => v.status === 'rascunho' && v.data <= hoje);
    return { ultima, agendadas, rascunhoHoje, finalizadas };
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title="Assessoria clínica" subtitle={`${ativos.length} contrato${ativos.length !== 1 ? 's' : ''} ativo${ativos.length !== 1 ? 's' : ''}`} onBack={onBack} action={
        <button onClick={onNovoContrato} style={{
          width: 36, height: 36, borderRadius: 12, background: CORES.roxo,
          display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer',
        }}>
          <Icon name="plus" size={18} color="#fff" />
        </button>
      } />

      <div style={{ padding: '14px 20px 20px' }}>
        {ativos.length === 0 && (
          <div style={{
            background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 12,
            padding: '24px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13,
          }}>
            Nenhum contrato de assessoria ativo. Toque em + pra cadastrar.
          </div>
        )}

        {ativos
          .sort((a, b) => (nomeContrato(a, proprietarios, locais) || '').localeCompare(nomeContrato(b, proprietarios, locais) || '', 'pt'))
          .map(c => {
            const { ultima, agendadas, rascunhoHoje, finalizadas } = resumoContrato(c);
            const diasDesdeUltima = ultima?.data ? diasEntre(ultima.data, hoje) : null;
            return (
              <button key={c.id} onClick={() => onAbrirContrato(c.id)} style={{
                width: '100%', textAlign: 'left', cursor: 'pointer',
                background: 'var(--card)', border: '1px solid var(--line)',
                borderLeft: `3px solid ${CORES.roxo}`,
                borderRadius: 12, padding: '14px', marginBottom: 10, color: 'var(--ink)',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 15, flex: 1, minWidth: 0 }}>
                    {nomeContrato(c, proprietarios, locais)}
                  </div>
                  <div style={{ fontSize: 13, color: CORES.roxo, fontWeight: 700 }}>
                    {formatBRL(c.valorMensal)}/mês
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
                  {ultima ? `Última visita: ${fmtData(ultima.data)}${diasDesdeUltima != null ? ` (há ${diasDesdeUltima}d)` : ''}` : 'Nenhuma visita ainda'}
                  {' · '}{finalizadas.length} visita{finalizadas.length !== 1 ? 's' : ''} finalizada{finalizadas.length !== 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {rascunhoHoje && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, background: '#fef3c7', color: '#92400e' }}>
                      Visita em andamento · {fmtData(rascunhoHoje.data)}
                    </span>
                  )}
                  {agendadas.length > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, background: CORES.roxoBg, color: CORES.roxo }}>
                      {agendadas.length} agendada{agendadas.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

        {encerrados.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <button onClick={() => setMostrarEncerrados(v => !v)} style={{
              background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 11,
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              cursor: 'pointer', padding: '6px 0', fontFamily: 'var(--sans)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {mostrarEncerrados ? '▾' : '▸'} Contratos encerrados ({encerrados.length})
            </button>
            {mostrarEncerrados && encerrados.map(c => (
              <button key={c.id} onClick={() => onAbrirContrato(c.id)} style={{
                width: '100%', textAlign: 'left', cursor: 'pointer',
                background: 'var(--soft)', border: '1px solid var(--line)',
                borderRadius: 10, padding: '10px 12px', marginBottom: 6, color: 'var(--ink-2)',
                opacity: 0.8,
              }}>
                <div style={{ fontSize: 13 }}>{nomeContrato(c, proprietarios, locais)}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                  Encerrado em {fmtData(c.fim)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Form de criar/editar contrato
// ─────────────────────────────────────────────────────────────
export function ContratoForm({
  contrato = null, proprietarios = [], locais = [],
  onSave, onCancel, onDelete,
}) {
  const [proprietarioId, setProprietarioId] = useState(contrato?.proprietarioId || '');
  const [localId, setLocalId] = useState(contrato?.localId || '');
  const [nomeApelido, setNomeApelido] = useState(contrato?.nomeApelido || '');
  const [valorMensal, setValorMensal] = useState(String(contrato?.valorMensal || ''));
  const [diaCobranca, setDiaCobranca] = useState(String(contrato?.diaCobranca || '1'));
  const [inicio, setInicio] = useState(contrato?.inicio || new Date().toISOString().slice(0, 10));
  const [fim, setFim] = useState(contrato?.fim || '');
  const [observacoes, setObservacoes] = useState(contrato?.observacoes || '');

  const canSave = proprietarioId && Number(valorMensal) > 0 && inicio;

  const handleSave = () => {
    if (!canSave) return;
    const payload = {
      proprietarioId,
      localId: localId || null,
      nomeApelido: nomeApelido.trim(),
      valorMensal: Number(valorMensal),
      diaCobranca: Number(diaCobranca) || 1,
      inicio, fim: fim || null,
      observacoes: observacoes.trim(),
    };
    onSave(payload);
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
    borderRadius: 10, border: '1px solid var(--line)',
    background: 'var(--card)', fontSize: 14, color: 'var(--ink)',
    fontFamily: 'var(--sans)', outline: 'none',
  };
  const label = (t) => (
    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontWeight: 700 }}>{t}</div>
  );

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title={contrato ? 'Editar contrato' : 'Novo contrato'} onBack={onCancel} />
      <div style={{ padding: '16px 20px 20px' }}>
        <div style={{ marginBottom: 12 }}>
          {label('Proprietário (quem paga) *')}
          <select value={proprietarioId} onChange={e => setProprietarioId(e.target.value)} style={inputStyle}>
            <option value="">— Selecionar —</option>
            {[...proprietarios].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt')).map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          {label('Local / Haras (opcional — contrato por local)')}
          <select value={localId} onChange={e => setLocalId(e.target.value)} style={inputStyle}>
            <option value="">Sem local específico (cobre tudo do proprietário)</option>
            {[...locais].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt')).map(l => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          {label('Apelido do haras (opcional, pra UI)')}
          <input value={nomeApelido} onChange={e => setNomeApelido(e.target.value)} placeholder="Ex: Haras Brilhante" style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            {label('Valor mensal (R$) *')}
            <input value={valorMensal} onChange={e => setValorMensal(e.target.value)} type="number" min="0" step="50" placeholder="0,00" style={inputStyle} />
          </div>
          <div>
            {label('Dia cobrança')}
            <input value={diaCobranca} onChange={e => setDiaCobranca(e.target.value)} type="number" min="1" max="31" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            {label('Início *')}
            <input value={inicio} onChange={e => setInicio(e.target.value)} type="date" style={inputStyle} />
          </div>
          <div>
            {label('Encerramento (vazio = ativo)')}
            <input value={fim} onChange={e => setFim(e.target.value)} type="date" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          {label('Observações')}
          <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--line)',
            background: 'var(--card)', color: 'var(--ink-2)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>Cancelar</button>
          <button onClick={handleSave} disabled={!canSave} style={{
            flex: 2, padding: '12px', borderRadius: 10, border: 'none',
            background: CORES.roxo, color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.5,
            fontFamily: 'var(--sans)',
          }}>{contrato ? 'Salvar' : 'Criar contrato'}</button>
        </div>

        {contrato && onDelete && (
          <button onClick={() => {
            if (window.confirm('Encerrar este contrato? Vai sumir dos ativos (sem apagar visitas antigas).')) {
              onSave({ fim: new Date().toISOString().slice(0, 10) });
            }
          }} style={{
            width: '100%', marginTop: 10, padding: '10px', borderRadius: 10,
            border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>
            Encerrar contrato (hoje)
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Detalhe do contrato — lista de visitas + histórico
// (preenchido em C3 — por enquanto só placeholder com info básica)
// ─────────────────────────────────────────────────────────────
export function ContratoDetalhe({
  contrato, visitasClinicas = [], proprietarios = [], locais = [], vetsExternos = [],
  onBack, onEditarContrato, onNovaVisita,
  updateVisitaClinica, deleteVisitaClinica, currentUser,
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  const finalizadas = visitasClinicas.filter(v => v.status === 'finalizada')
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const agendadas = visitasClinicas.filter(v => v.status === 'rascunho' && v.data >= hoje)
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  const rascunhos = visitasClinicas.filter(v => v.status === 'rascunho' && v.data < hoje);

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title={nomeContrato(contrato, proprietarios, locais)} subtitle={`${formatBRL(contrato.valorMensal)}/mês`} onBack={onBack} action={
        <button onClick={onEditarContrato} style={{
          width: 36, height: 36, borderRadius: 12, background: 'var(--card)',
          display: 'grid', placeItems: 'center', border: '1px solid var(--line)', cursor: 'pointer',
        }}>
          <Icon name="edit" size={14} color="var(--ink-2)" />
        </button>
      } />

      <div style={{ padding: '14px 20px 20px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={() => onNovaVisita(hoje)} style={{
            flex: 1, padding: '12px', borderRadius: 10, border: 'none',
            background: CORES.roxo, color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>
            + Nova visita hoje
          </button>
          <button onClick={() => {
            const data = window.prompt('Agendar visita para (AAAA-MM-DD):', hoje);
            if (data && /^\d{4}-\d{2}-\d{2}$/.test(data)) onNovaVisita(data);
          }} style={{
            padding: '12px 14px', borderRadius: 10, border: '1px solid var(--line)',
            background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>
            Agendar
          </button>
        </div>

        {/* Rascunhos pendentes de finalizar */}
        {rascunhos.length > 0 && (
          <SecaoLista titulo="Visitas em andamento" cor="#92400e" bg="#fef3c7">
            {rascunhos.map(v => (
              <VisitaRow key={v.id} visita={v} vetsExternos={vetsExternos} />
            ))}
          </SecaoLista>
        )}

        {agendadas.length > 0 && (
          <SecaoLista titulo="Agendadas">
            {agendadas.map(v => (
              <VisitaRow key={v.id} visita={v} vetsExternos={vetsExternos} />
            ))}
          </SecaoLista>
        )}

        <SecaoLista titulo={`Histórico (${finalizadas.length})`}>
          {finalizadas.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '12px' }}>
              Nenhuma visita finalizada ainda.
            </div>
          )}
          {finalizadas.map(v => (
            <VisitaRow key={v.id} visita={v} vetsExternos={vetsExternos} finalizada />
          ))}
        </SecaoLista>

        {contrato.observacoes && (
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--soft)', borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 4 }}>Obs. do contrato</div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{contrato.observacoes}</div>
          </div>
        )}
      </div>
    </div>
  );
}

const SecaoLista = ({ titulo, cor, bg, children }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{
      fontSize: 11, color: cor || 'var(--ink-3)', textTransform: 'uppercase',
      letterSpacing: '0.06em', fontWeight: 700, marginBottom: 6, padding: '2px 4px',
    }}>{titulo}</div>
    <div style={{
      background: bg ? bg + '20' : 'transparent',
      borderRadius: 10,
    }}>
      {children}
    </div>
  </div>
);

const VisitaRow = ({ visita, vetsExternos, finalizada }) => {
  const vets = (visita.vetsParticipantes || [])
    .map(id => vetsExternos.find(v => v.id === id))
    .filter(Boolean);
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)',
      borderRadius: 8, padding: '8px 12px', marginBottom: 4,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)' }}>
          {fmtData(visita.data)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
          {vets.length > 0 ? vets.map(v => v.nome.split(' ')[0]).join(', ') : '(sem vets)'}
          {' · '}{formatBRL(visita.valorCobrado)}
        </div>
      </div>
      {finalizada && <Icon name="check" size={14} color={CORES.verde} />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
export function nomeContrato(c, proprietarios = [], locais = []) {
  if (c?.nomeApelido) return c.nomeApelido;
  const prop = proprietarios.find(p => p.id === c?.proprietarioId);
  const local = locais.find(l => l.id === c?.localId);
  if (local) return `${local.nome}${prop ? ' · ' + prop.nome : ''}`;
  return prop?.nome || 'Contrato';
}

function diasEntre(d1, d2) {
  if (!d1 || !d2) return null;
  const a = new Date(d1 + 'T00:00:00');
  const b = new Date(d2 + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}
function fmtData(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
function formatBRL(n) {
  const v = Number(n) || 0;
  return 'R$ ' + v.toFixed(2).replace('.', ',');
}
