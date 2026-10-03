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
  const [tela, setTela] = useState('hub'); // 'hub' | 'novoContrato' | 'editarContrato' | 'detalheContrato' | 'visitaDetalhe'
  const [contratoSelId, setContratoSelId] = useState(null);
  const [visitaSelId, setVisitaSelId] = useState(null);

  const abrirContrato = (id) => { setContratoSelId(id); setTela('detalheContrato'); };
  const abrirNovoContrato = () => { setContratoSelId(null); setTela('novoContrato'); };
  const abrirEditarContrato = (id) => { setContratoSelId(id); setTela('editarContrato'); };
  const abrirVisita = (id) => { setVisitaSelId(id); setTela('visitaDetalhe'); };
  const voltarHub = () => { setContratoSelId(null); setVisitaSelId(null); setTela('hub'); };
  const voltarContrato = () => { setVisitaSelId(null); setTela('detalheContrato'); };

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
        onAbrirVisita={abrirVisita}
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
          if (id) abrirVisita(id);
          return id;
        }}
        updateVisitaClinica={updateVisitaClinica}
        deleteVisitaClinica={deleteVisitaClinica}
        currentUser={currentUser}
      />
    );
  }
  if (tela === 'visitaDetalhe') {
    const v = visitasClinicas.find(x => x.id === visitaSelId);
    if (!v) { voltarHub(); return null; }
    const c = contratosAssessoria.find(x => x.id === v.contratoId);
    return (
      <VisitaDetalhe
        visita={v}
        contrato={c}
        proprietarios={proprietarios} locais={locais} vetsExternos={vetsExternos}
        onBack={voltarContrato}
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
  onBack, onEditarContrato, onNovaVisita, onAbrirVisita,
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
          <AgendarButton onPick={onNovaVisita} />
        </div>

        {/* Rascunhos pendentes de finalizar */}
        {rascunhos.length > 0 && (
          <SecaoLista titulo="Visitas em andamento" cor="#92400e" bg="#fef3c7">
            {rascunhos.map(v => (
              <VisitaRow key={v.id} visita={v} vetsExternos={vetsExternos} onClick={() => onAbrirVisita?.(v.id)} />
            ))}
          </SecaoLista>
        )}

        {agendadas.length > 0 && (
          <SecaoLista titulo="Agendadas">
            {agendadas.map(v => (
              <VisitaRow key={v.id} visita={v} vetsExternos={vetsExternos} onClick={() => onAbrirVisita?.(v.id)} />
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
            <VisitaRow key={v.id} visita={v} vetsExternos={vetsExternos} finalizada onClick={() => onAbrirVisita?.(v.id)} />
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

const VisitaRow = ({ visita, vetsExternos, finalizada, onClick }) => {
  const vets = (visita.vetsParticipantes || [])
    .map(id => vetsExternos.find(v => v.id === id))
    .filter(Boolean);
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', cursor: onClick ? 'pointer' : 'default',
      background: 'var(--card)', border: '1px solid var(--line)',
      borderRadius: 8, padding: '8px 12px', marginBottom: 4,
      display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink)',
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
      {onClick && <Icon name="chevron-right" size={14} color="var(--ink-3)" />}
    </button>
  );
};

// Botão "Agendar" com date picker nativo. Antes era prompt() horrível.
const AgendarButton = ({ onPick }) => {
  const inputRef = React.useRef(null);
  const [valor, setValor] = useState('');
  const abrirPicker = () => inputRef.current?.showPicker?.() || inputRef.current?.focus();
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={abrirPicker} style={{
        padding: '12px 14px', borderRadius: 10, border: '1px solid var(--line)',
        background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'var(--sans)',
      }}>Agendar</button>
      <input
        ref={inputRef}
        type="date"
        value={valor}
        onChange={e => { if (e.target.value) { setValor(''); onPick(e.target.value); } }}
        min={new Date().toISOString().slice(0, 10)}
        style={{
          position: 'absolute', left: 0, bottom: 0, width: 1, height: 1,
          opacity: 0, pointerEvents: 'none',
        }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Detalhe/painel de uma visita (rascunho em andamento OU finalizada).
// Em C4 recebe os blocos de pendências automáticas e atalhos pra
// registrar. Por enquanto: resumo + finalizar/cancelar.
// ─────────────────────────────────────────────────────────────
export function VisitaDetalhe({
  visita, contrato, proprietarios = [], locais = [], vetsExternos = [],
  onBack, updateVisitaClinica, deleteVisitaClinica, currentUser,
}) {
  const [editMode, setEditMode] = useState(false);
  const [data, setData] = useState(visita.data);
  const [vetsIds, setVetsIds] = useState(visita.vetsParticipantes || []);
  const [valor, setValor] = useState(String(visita.valorCobrado || contrato?.valorMensal || 0));
  const [obs, setObs] = useState(visita.observacoes || '');

  const finalizada = visita.status === 'finalizada';
  const vets = (visita.vetsParticipantes || [])
    .map(id => vetsExternos.find(v => v.id === id))
    .filter(Boolean);
  const vetsAtivos = vetsExternos.filter(v => v.ativo !== false);

  const toggleVet = (id) => setVetsIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
  );

  const finalizar = () => {
    if (vetsIds.length === 0) {
      if (!window.confirm('Nenhum vet selecionado. Finalizar mesmo assim? A divisão vai pra 100% Epona.')) return;
    }
    updateVisitaClinica(visita.id, {
      data,
      vetsParticipantes: vetsIds,
      valorCobrado: Number(valor) || 0,
      observacoes: obs.trim(),
      status: 'finalizada',
      finalizadaEm: new Date().toISOString(),
      finalizadaPor: currentUser?.nome || '',
    });
    onBack();
  };

  const reabrirFinalizada = () => {
    if (!window.confirm('Reabrir esta visita? Volta pra rascunho (sai da fatura até finalizar de novo).')) return;
    updateVisitaClinica(visita.id, { status: 'rascunho', finalizadaEm: null, finalizadaPor: '' });
  };

  const cancelarVisita = () => {
    if (!window.confirm('Cancelar/apagar esta visita? Esta ação não pode ser desfeita.')) return;
    deleteVisitaClinica(visita.id);
    onBack();
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

  const haras = nomeContrato(contrato, proprietarios, locais);

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar
        title={haras}
        subtitle={`Visita de ${fmtData(visita.data)}${finalizada ? ' · finalizada' : ''}`}
        onBack={onBack}
      />

      <div style={{ padding: '14px 20px 20px' }}>
        {/* Status chip */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14,
          padding: '4px 10px', borderRadius: 10,
          background: finalizada ? '#dcfce7' : '#fef3c7',
          color: finalizada ? '#166534' : '#92400e',
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {finalizada ? '✓ Finalizada' : '● Em andamento'}
        </div>

        {/* Resumo quando finalizada (snapshot) */}
        {finalizada && !editMode && (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 12, padding: 14, marginBottom: 14,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Data</div>
                <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 2 }}>{fmtData(visita.data)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Valor cobrado</div>
                <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 2, fontFamily: 'var(--serif)' }}>{formatBRL(visita.valorCobrado)}</div>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 4 }}>Vets participantes</div>
              {vets.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>(nenhum selecionado)</div>}
              {vets.map(v => (
                <span key={v.id} style={{
                  display: 'inline-block', margin: '2px 4px 2px 0',
                  padding: '2px 8px', borderRadius: 8,
                  background: v.cor || '#7c2d8c', color: '#fff',
                  fontSize: 11, fontWeight: 600,
                }}>
                  {v.nome}{v.internoEpona ? ' · Epona' : ''}
                </span>
              ))}
            </div>
            {visita.observacoes && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 4 }}>Observações</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>{visita.observacoes}</div>
              </div>
            )}
          </div>
        )}

        {/* Painel de preparação (rascunho) ou edição (finalizada em editMode) */}
        {(!finalizada || editMode) && (
          <>
            <div style={{
              background: '#f5e8ff30', border: '1px dashed #d8b4fe',
              borderRadius: 10, padding: '10px 12px', marginBottom: 12,
              fontSize: 12, color: '#6b21a8',
            }}>
              <strong>Painel de preparação</strong> — pendências automáticas (vacinas,
              OPGs, DGs, gestantes, potros) e atalhos pra registrar virão no próximo
              commit (C4). Por enquanto, use os cards da Veterinária.
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 10 }}>
                Finalizar visita
              </div>

              <div style={{ marginBottom: 10 }}>
                {label('Data')}
                <input type="date" value={data} onChange={e => setData(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ marginBottom: 10 }}>
                {label(`Vets participantes (${vetsIds.length} selecionado${vetsIds.length !== 1 ? 's' : ''})`)}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {vetsAtivos.map(v => {
                    const sel = vetsIds.includes(v.id);
                    return (
                      <button key={v.id} onClick={() => toggleVet(v.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 8,
                        border: `1px solid ${sel ? (v.cor || '#7c2d8c') : 'var(--line)'}`,
                        background: sel ? (v.cor || '#7c2d8c') + '15' : 'var(--card)',
                        cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--sans)',
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 4,
                          background: sel ? (v.cor || '#7c2d8c') : 'transparent',
                          border: `2px solid ${v.cor || '#7c2d8c'}`,
                          display: 'grid', placeItems: 'center',
                          color: '#fff', fontSize: 12, fontWeight: 700,
                        }}>{sel ? '✓' : ''}</div>
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{v.nome}</span>
                        {v.internoEpona && (
                          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#f5e8ff', color: '#6b21a8', fontWeight: 700 }}>EPONA</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6 }}>
                  Divisão: só Epona interno → 100% Epona. Vet externo participando → Epona 50% + externos dividem 50%.
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                {label('Valor cobrado (R$)')}
                <input type="number" min="0" step="50" value={valor} onChange={e => setValor(e.target.value)} style={inputStyle} />
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>
                  Pré-preenchido do contrato ({formatBRL(contrato?.valorMensal)}). Editável se visita extraordinária.
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                {label('Observações gerais')}
                <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {finalizada && editMode && (
                  <button onClick={() => setEditMode(false)} style={{
                    flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--line)',
                    background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--sans)',
                  }}>Cancelar edição</button>
                )}
                <button onClick={finalizar} style={{
                  flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                  background: '#166534', color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'var(--sans)',
                }}>
                  {finalizada ? 'Salvar alterações' : 'Finalizar visita'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Ações pra visitas finalizadas */}
        {finalizada && !editMode && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={() => setEditMode(true)} style={{
              flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--line)',
              background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--sans)',
            }}>Editar</button>
            <button onClick={reabrirFinalizada} style={{
              flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--line)',
              background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--sans)',
            }}>Reabrir</button>
          </div>
        )}

        {!finalizada && (
          <button onClick={cancelarVisita} style={{
            width: '100%', marginTop: 10, padding: '10px', borderRadius: 10,
            border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>
            Cancelar visita (apaga rascunho)
          </button>
        )}
      </div>
    </div>
  );
}

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
