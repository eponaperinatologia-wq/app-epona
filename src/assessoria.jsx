// assessoria.jsx — Área de assessoria clínica (contratos mensais +
// visitas clínicas) do shell Epona Repro Team. Entry é a tela de hub
// de contratos; dali abre o detalhe por contrato (lista de visitas +
// histórico) e o painel de visita em andamento.

import React, { useMemo, useState } from 'react';
import { Icon } from './icons';
import { TopBar } from './screens';
import { calcAgendaVac, calcAgendaVerm } from './veterinaria';
import { gerarPdfVisitaClinica, nomePdfVisitaClinica } from './utils/pdfVisitaClinica';

// Orquestra a navegação entre hub → form → detalhe do contrato.
// Chamado pela VeterinariaScreen quando o card "Assessoria" é clicado.
export function AssessoriaFlow({
  contratosAssessoria = [], visitasClinicas = [],
  proprietarios = [], locais = [], vetsExternos = [],
  addContratoAssessoria, updateContratoAssessoria, deleteContratoAssessoria,
  addVisitaClinica, updateVisitaClinica, deleteVisitaClinica,
  currentUser, onBack, empresaInfo = null,
  // Dados pra pendências do painel (C4)
  cavalos = [], insumos = [], protocolosVacinacao = [], vacinacoesAnimais = [],
  protocolosVermifugacao = [], vermifugacoesAnimais = [], opgs = [],
  medicoes = [], anotacoesClinicas = [], registrosReproducao = [], partos = [],
  // Mutators pros atalhos do caderno (C7, C10)
  addAnotacaoClinica, updateAnotacaoClinica, deleteAnotacaoClinica,
  upsertVacinacaoAnimal, addVermifugacaoAnimal, addOpg, addMedicao,
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
        empresaInfo={empresaInfo}
        cavalos={cavalos}
        insumos={insumos}
        protocolosVacinacao={protocolosVacinacao}
        vacinacoesAnimais={vacinacoesAnimais}
        protocolosVermifugacao={protocolosVermifugacao}
        vermifugacoesAnimais={vermifugacoesAnimais}
        opgs={opgs}
        medicoes={medicoes}
        anotacoesClinicas={anotacoesClinicas}
        registrosReproducao={registrosReproducao}
        partos={partos}
        addAnotacaoClinica={addAnotacaoClinica}
        updateAnotacaoClinica={updateAnotacaoClinica}
        deleteAnotacaoClinica={deleteAnotacaoClinica}
        upsertVacinacaoAnimal={upsertVacinacaoAnimal}
        addVermifugacaoAnimal={addVermifugacaoAnimal}
        addOpg={addOpg}
        addMedicao={addMedicao}
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

const rowStyle = {
  background: 'var(--card)', border: '1px solid var(--line)',
  borderRadius: 8, padding: '8px 12px', marginBottom: 4,
  display: 'flex', alignItems: 'center', gap: 10,
};

// Bloco de pendências pra vacinação OU vermifugação, com 3 sub-grupos
// (atrasadas, do mês, a vencer no próximo mês). Colapsa automaticamente
// os sub-grupos vazios.
const PendenciasBloco = ({ titulo, cor, bg, atrasadas = [], doMes = [], aVencer = [], rotuloItem }) => {
  const total = atrasadas.length + doMes.length + aVencer.length;
  if (total === 0) return null;
  const SubGrupo = ({ label, items, destaque }) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 4 }}>
        <div style={{
          fontSize: 10, color: destaque || cor, textTransform: 'uppercase',
          letterSpacing: '0.05em', fontWeight: 700, padding: '4px 8px',
        }}>{label} · {items.length}</div>
        {items.slice(0, 8).map((it, i) => (
          <div key={i} style={rowStyle}>
            <span style={{ fontSize: 13, color: 'var(--ink)' }}>{rotuloItem(it)}</span>
            {it.dataPrevista && (
              <span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 'auto' }}>
                {fmtData(it.dataPrevista)}
              </span>
            )}
          </div>
        ))}
        {items.length > 8 && (
          <div style={{ fontSize: 11, color: 'var(--ink-3)', padding: '4px 10px' }}>+{items.length - 8} item(ns)</div>
        )}
      </div>
    );
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 11, color: cor, textTransform: 'uppercase',
        letterSpacing: '0.06em', fontWeight: 700, marginBottom: 6, padding: '2px 4px',
      }}>
        {titulo} · {total} pendência{total !== 1 ? 's' : ''}
      </div>
      <div style={{ background: bg + '15', borderRadius: 10, padding: 6 }}>
        <SubGrupo label="Atrasadas" items={atrasadas} destaque="#dc2626" />
        <SubGrupo label="Do mês" items={doMes} />
        <SubGrupo label="A vencer (próx. 30d)" items={aVencer} />
      </div>
    </div>
  );
};

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
// Seção de insumos adicionais a cobrar na visita.
// Em assessoria, vacinas/vermífugos consumidos NÃO entram na fatura
// automaticamente (cliente compra por fora). Esta é a seção pra
// cobrar extras que a Epona forneceu.
function InsumosCobrados({ visita, insumos = [], readonly = false, onChange }) {
  const lista = Array.isArray(visita.insumosCobrados) ? visita.insumosCobrados : [];
  const total = lista.reduce((s, it) => s + (Number(it.qtd) || 0) * (Number(it.valorUnit) || 0), 0);
  const [novo, setNovo] = useState({ insumoId: '', qtd: 1, valorUnit: '', descricao: '' });

  const insumoNome = (id) => (insumos.find(i => i.id === id)?.nome) || '—';
  const insumoUnidade = (id) => (insumos.find(i => i.id === id)?.unidade) || '';
  const sugestoesInsumo = [...insumos]
    .filter(i => i.ativo !== false)
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));

  const canAdd = (novo.insumoId || novo.descricao.trim()) && Number(novo.qtd) > 0 && Number(novo.valorUnit) >= 0;

  const inputStyle = {
    padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)',
    background: 'var(--card)', fontSize: 13, color: 'var(--ink)',
    fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box',
  };

  const adicionar = () => {
    if (!canAdd) return;
    const item = {
      insumoId: novo.insumoId || null,
      descricao: novo.descricao.trim() || (novo.insumoId ? insumoNome(novo.insumoId) : ''),
      qtd: Number(novo.qtd),
      valorUnit: Number(novo.valorUnit),
    };
    onChange([...lista, item]);
    setNovo({ insumoId: '', qtd: 1, valorUnit: '', descricao: '' });
  };
  const remover = (i) => onChange(lista.filter((_, idx) => idx !== i));
  const alterarQtd = (i, qtd) => onChange(lista.map((it, idx) => idx === i ? { ...it, qtd: Number(qtd) || 0 } : it));
  const alterarValor = (i, valor) => onChange(lista.map((it, idx) => idx === i ? { ...it, valorUnit: Number(valor) || 0 } : it));

  // Autofill do valor unitário quando seleciona um insumo do catálogo
  const selecionarInsumo = (id) => {
    const ins = insumos.find(i => i.id === id);
    setNovo(n => ({
      ...n, insumoId: id,
      valorUnit: ins?.valorVenda != null ? String(ins.valorVenda) : n.valorUnit,
      descricao: ins?.nome || n.descricao,
    }));
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
          Insumos extras a cobrar · {lista.length}
        </div>
        {lista.length > 0 && (
          <div style={{ fontSize: 12, color: '#7c2d8c', fontWeight: 700 }}>
            + {formatBRL(total)}
          </div>
        )}
      </div>

      {lista.length === 0 && !readonly && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>
          Vacinas/insumos aplicados nesta visita <strong>não entram automaticamente</strong> na fatura
          (cliente compra por fora). Adicione aqui só o que a Epona forneceu e vai cobrar.
        </div>
      )}

      {lista.map((it, i) => (
        <div key={i} style={{
          background: 'var(--card)', border: '1px solid var(--line)',
          borderRadius: 8, padding: '8px 10px', marginBottom: 4,
          display: 'grid', gridTemplateColumns: '1fr 60px 90px 24px', gap: 6, alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--ink)' }}>{it.descricao || insumoNome(it.insumoId)}</div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>
              {formatBRL((Number(it.qtd) || 0) * (Number(it.valorUnit) || 0))} total
            </div>
          </div>
          {readonly ? (
            <>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'right' }}>
                {it.qtd} {insumoUnidade(it.insumoId)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                {formatBRL(it.valorUnit)}
              </div>
              <div />
            </>
          ) : (
            <>
              <input type="number" min="0" step="0.5" value={it.qtd}
                onChange={e => alterarQtd(i, e.target.value)}
                style={{ ...inputStyle, textAlign: 'right' }} />
              <input type="number" min="0" step="0.01" value={it.valorUnit}
                onChange={e => alterarValor(i, e.target.value)}
                style={{ ...inputStyle, textAlign: 'right' }} />
              <button onClick={() => remover(i)} style={{
                width: 24, height: 24, borderRadius: 6, border: '1px solid var(--line)',
                background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer',
                display: 'grid', placeItems: 'center',
              }}>
                <Icon name="x" size={11} />
              </button>
            </>
          )}
        </div>
      ))}

      {!readonly && (
        <div style={{
          background: 'var(--soft)', border: '1px dashed var(--line)',
          borderRadius: 8, padding: 8, marginTop: 6,
          display: 'grid', gridTemplateColumns: '1fr 60px 90px 60px', gap: 6, alignItems: 'center',
        }}>
          <select value={novo.insumoId} onChange={e => selecionarInsumo(e.target.value)} style={inputStyle}>
            <option value="">— Insumo do catálogo (opcional) —</option>
            {sugestoesInsumo.map(i => (
              <option key={i.id} value={i.id}>{i.nome}{i.workspaceId === 'haras' ? ' (haras)' : ''}</option>
            ))}
          </select>
          <input type="number" min="0" step="0.5" value={novo.qtd}
            onChange={e => setNovo(n => ({ ...n, qtd: e.target.value }))}
            style={{ ...inputStyle, textAlign: 'right' }} placeholder="qtd" />
          <input type="number" min="0" step="0.01" value={novo.valorUnit}
            onChange={e => setNovo(n => ({ ...n, valorUnit: e.target.value }))}
            style={{ ...inputStyle, textAlign: 'right' }} placeholder="valor unit" />
          <button onClick={adicionar} disabled={!canAdd} style={{
            padding: '8px', borderRadius: 8, border: 'none',
            background: canAdd ? '#7c2d8c' : 'var(--soft)',
            color: canAdd ? '#fff' : 'var(--ink-3)',
            fontSize: 12, fontWeight: 700, cursor: canAdd ? 'pointer' : 'default',
            fontFamily: 'var(--sans)',
          }}>+ Add</button>
          {!novo.insumoId && (
            <input value={novo.descricao}
              onChange={e => setNovo(n => ({ ...n, descricao: e.target.value }))}
              placeholder="Ou descrição livre (ex: ivermectina 1 fr)"
              style={{ ...inputStyle, gridColumn: '1 / -1' }} />
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Caderno da visita: observações gerais + anotações clínicas
// vinculadas à visita (por animal). O vet escreve livremente aqui
// durante a visita; vai pro PDF e pro histórico do animal.
// ─────────────────────────────────────────────────────────────
const TIPOS_ANOTACAO = ['Clínica', 'Nutricional', 'Obstétrica', 'Comportamento', 'Outro'];

function CadernoVisita({
  visita, contrato, animaisDoHaras = [], vetsExternos = [],
  anotacoesClinicas = [], addAnotacaoClinica, updateAnotacaoClinica, deleteAnotacaoClinica,
  currentUser, obs, setObs,
  insumos = [], updateVisitaClinica,
}) {
  const readonly = !addAnotacaoClinica;
  // Anotações feitas nesta visita (vinculadas via visita_clinica_id)
  const minhas = useMemo(
    () => anotacoesClinicas
      .filter(a => a.visitaClinicaId === visita.id)
      .sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.hora || '').localeCompare(a.hora || '')),
    [anotacoesClinicas, visita.id],
  );

  const [novaAberto, setNovaAberto] = useState(false);
  const [editId, setEditId] = useState(null);

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
    borderRadius: 10, border: '1px solid var(--line)',
    background: 'var(--card)', fontSize: 14, color: 'var(--ink)',
    fontFamily: 'var(--sans)', outline: 'none',
  };

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Observações gerais da visita (textarea grande, auto-salva) */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 6 }}>
          Observações da visita
        </div>
        <textarea
          value={obs}
          onChange={setObs ? (e => setObs(e.target.value)) : undefined}
          readOnly={!setObs}
          rows={6}
          placeholder="Apontamentos clínicos gerais da visita (nutrição, obstetrícia, comportamento, sugestões, etc.)…"
          style={{
            ...inputStyle, resize: 'vertical', minHeight: 100,
            background: !setObs ? 'var(--soft)' : 'var(--card)',
          }}
        />
        {setObs && (
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>
            Salvamento automático após 1s sem digitar.
          </div>
        )}
      </div>

      {/* Insumos adicionais a cobrar nessa visita (opcional).
          Em assessoria o cliente geralmente compra as vacinas/insumos
          por fora — então nada é cobrado automaticamente. Esta seção
          é pra quando a Epona FORNECEU algum insumo específico e
          precisa cobrar extra do cliente. Vai pro valor da fatura. */}
      <InsumosCobrados
        visita={visita}
        insumos={insumos}
        readonly={!updateVisitaClinica}
        onChange={(novos) => updateVisitaClinica && updateVisitaClinica(visita.id, { insumosCobrados: novos })}
      />

      {/* Anotações clínicas da visita */}
      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
          Anotações por animal · {minhas.length}
        </div>
        {!readonly && !novaAberto && (
          <button onClick={() => { setNovaAberto(true); setEditId(null); }} style={{
            padding: '6px 10px', borderRadius: 8, border: '1px dashed var(--line)',
            background: 'var(--card)', color: '#7c2d8c', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>
            + Nova anotação
          </button>
        )}
      </div>

      {novaAberto && !readonly && (
        <AnotacaoForm
          animaisDoHaras={animaisDoHaras}
          visita={visita}
          currentUser={currentUser}
          onCancel={() => setNovaAberto(false)}
          onSave={(payload) => {
            addAnotacaoClinica(payload);
            setNovaAberto(false);
          }}
        />
      )}

      {minhas.length === 0 && !novaAberto && (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '12px', textAlign: 'center' }}>
          Nenhuma anotação por animal nesta visita ainda.
        </div>
      )}

      {minhas.map(a => (
        <AnotacaoCard
          key={a.id}
          anotacao={a}
          animal={animaisDoHaras.find(c => c.id === a.cavaloId)}
          readonly={readonly}
          editando={editId === a.id}
          onEditar={() => setEditId(a.id)}
          onCancelarEdicao={() => setEditId(null)}
          onSalvar={(payload) => { updateAnotacaoClinica(a.id, payload); setEditId(null); }}
          onExcluir={() => {
            if (window.confirm('Apagar esta anotação?')) deleteAnotacaoClinica(a.id);
          }}
          animaisDoHaras={animaisDoHaras}
        />
      ))}
    </div>
  );
}

const AnotacaoForm = ({ anotacao = null, animaisDoHaras = [], visita, currentUser, onSave, onCancel }) => {
  const [cavaloId, setCavaloId] = useState(anotacao?.cavaloId || '');
  const [tipo, setTipo] = useState(anotacao?.tipo || 'Clínica');
  const [titulo, setTitulo] = useState(anotacao?.titulo || '');
  const [descricao, setDescricao] = useState(anotacao?.descricao || '');
  const canSave = cavaloId && titulo.trim();

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
    borderRadius: 10, border: '1px solid var(--line)',
    background: 'var(--card)', fontSize: 14, color: 'var(--ink)',
    fontFamily: 'var(--sans)', outline: 'none',
  };

  const handleSave = () => {
    if (!canSave) return;
    const hoje = visita?.data || new Date().toISOString().slice(0, 10);
    const payload = {
      id: anotacao?.id || 'anot_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      cavaloId, data: hoje, hora: new Date().toTimeString().slice(0, 5),
      tipo, gravidade: '',
      titulo: titulo.trim(), descricao: descricao.trim(),
      autor: currentUser?.nome || '',
      mes: hoje.slice(0, 7),
      insumosCriados: [], procsCriados: [],
      visitaClinicaId: visita?.id || null,
    };
    onSave(payload);
  };

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid #7c2d8c40',
      borderRadius: 10, padding: 12, marginBottom: 10,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
        <select value={cavaloId} onChange={e => setCavaloId(e.target.value)} style={inputStyle}>
          <option value="">— Animal —</option>
          {[...animaisDoHaras].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt')).map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <select value={tipo} onChange={e => setTipo(e.target.value)} style={inputStyle}>
          {TIPOS_ANOTACAO.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <input value={titulo} onChange={e => setTitulo(e.target.value)}
        placeholder="Título da anotação" style={{ ...inputStyle, marginBottom: 8 }} />
      <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={4}
        placeholder="Descrição / detalhes…"
        style={{ ...inputStyle, resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--line)',
          background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--sans)',
        }}>Cancelar</button>
        <button onClick={handleSave} disabled={!canSave} style={{
          flex: 2, padding: '10px', borderRadius: 8, border: 'none',
          background: '#7c2d8c', color: '#fff', fontSize: 13, fontWeight: 700,
          cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.5,
          fontFamily: 'var(--sans)',
        }}>Salvar anotação</button>
      </div>
    </div>
  );
};

const AnotacaoCard = ({
  anotacao, animal, readonly, editando, onEditar, onCancelarEdicao, onSalvar, onExcluir,
  animaisDoHaras,
}) => {
  if (editando) {
    return (
      <AnotacaoForm
        anotacao={anotacao}
        animaisDoHaras={animaisDoHaras}
        visita={{ id: anotacao.visitaClinicaId, data: anotacao.data }}
        currentUser={{ nome: anotacao.autor }}
        onCancel={onCancelarEdicao}
        onSave={(payload) => onSalvar({
          titulo: payload.titulo, descricao: payload.descricao,
          tipo: payload.tipo, hora: payload.hora, data: payload.data, mes: payload.mes,
        })}
      />
    );
  }
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)',
      borderLeft: '3px solid #7c2d8c',
      borderRadius: 8, padding: '10px 12px', marginBottom: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)' }}>
            {animal?.nome || '(animal removido)'}
          </span>
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 4,
            background: '#f5e8ff', color: '#6b21a8', fontWeight: 700,
          }}>{anotacao.tipo}</span>
        </div>
        {!readonly && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={onEditar} style={iconBtnStyle} title="Editar"><Icon name="edit" size={11} /></button>
            <button onClick={onExcluir} style={{ ...iconBtnStyle, color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }} title="Excluir"><Icon name="x" size={11} /></button>
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600, marginBottom: 4 }}>{anotacao.titulo}</div>
      {anotacao.descricao && (
        <div style={{ fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>{anotacao.descricao}</div>
      )}
      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>
        {anotacao.autor ? `${anotacao.autor} · ` : ''}{anotacao.hora || ''}
      </div>
    </div>
  );
};

const iconBtnStyle = {
  width: 24, height: 24, borderRadius: 6, border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--ink-3)', cursor: 'pointer',
  display: 'grid', placeItems: 'center',
};

// ─────────────────────────────────────────────────────────────
// Lista de animais do haras — info-chave rápida
// ─────────────────────────────────────────────────────────────
function AnimaisDoHaras({ animais = [], proprietarios = [], medicoes = [], vacinacoesAnimais = [], vermifugacoesAnimais = [], anotacoesClinicas = [], contrato = null, locais = [] }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const propContrato = proprietarios.find(p => p.id === contrato?.proprietarioId);
  const localContrato = locais.find(l => l.id === contrato?.localId);
  return (
    <div style={{ marginBottom: 14 }}>
      {animais.length === 0 && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10,
          padding: '12px 14px', fontSize: 12, color: '#92400e',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Nenhum animal encontrado.</div>
          <div style={{ marginBottom: 8 }}>
            A visita busca animais que correspondem a:
            {propContrato && <> <br/>• Proprietário: <strong>{propContrato.nome}</strong></>}
            {localContrato && <> <br/>• Local: <strong>{localContrato.nome}</strong></>}
          </div>
          <div style={{ fontSize: 11, color: '#78350f' }}>
            <strong>Onde cadastrar?</strong> Vá na aba <strong>Cadastros → Éguas</strong>.
            Em cada égua, selecione o proprietário e/ou o local correspondente
            ao contrato. Se o Haras Stark é um local físico, cadastre-o em
            <strong> Cadastros → Locais</strong> primeiro, depois edite as
            éguas apontando pra ele.
          </div>
        </div>
      )}
      {[...animais]
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'))
        .map(c => {
          const minhasMed = medicoes.filter(m => m.cavaloId === c.id).sort((a, b) => (b.dataRegistro || '').localeCompare(a.dataRegistro || ''));
          const ultimaMed = minhasMed[0];
          const minhasAnot = anotacoesClinicas.filter(a => a.cavaloId === c.id).length;
          const minhasVac = vacinacoesAnimais.filter(v => v.cavaloId === c.id && v.feito).length;
          const minhasVerm = vermifugacoesAnimais.filter(v => v.cavaloId === c.id).length;
          const prop = proprietarios.find(p => p.id === c.proprietarioId || (c.proprietarioIds || []).includes(p.id));
          const gestante = c.categoria === 'Gestante' || (c.categorias || []).includes('Gestante') || c.gestacao?.dataCobricao;
          const potro = c.categoria === 'Potro ao pé' || (c.categorias || []).includes('Potro ao pé');
          return (
            <div key={c.id} style={{
              background: 'var(--card)', border: '1px solid var(--line)',
              borderRadius: 10, padding: '10px 12px', marginBottom: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)' }}>{c.nome}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {gestante && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#fce7f3', color: '#be185d', fontWeight: 700 }}>GEST</span>}
                  {potro && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#fef3c7', color: '#b45309', fontWeight: 700 }}>POTRO</span>}
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                {prop?.nome || '—'}{c.categoria ? ` · ${c.categoria}` : ''}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {ultimaMed && <span>Última medição: {fmtData(ultimaMed.dataRegistro)}{ultimaMed.peso ? ` · ${ultimaMed.peso}kg` : ''}</span>}
                {minhasAnot > 0 && <span>{minhasAnot} anotação{minhasAnot !== 1 ? 'ões' : ''}</span>}
                {minhasVac > 0 && <span>{minhasVac} vacinas</span>}
                {minhasVerm > 0 && <span>{minhasVerm} vermífugos</span>}
              </div>
            </div>
          );
        })}
    </div>
  );
}

export function VisitaDetalhe({
  visita, contrato, proprietarios = [], locais = [], vetsExternos = [],
  onBack, updateVisitaClinica, deleteVisitaClinica, currentUser,
  empresaInfo = null,
  cavalos = [], insumos = [], protocolosVacinacao = [], vacinacoesAnimais = [],
  protocolosVermifugacao = [], vermifugacoesAnimais = [], opgs = [],
  medicoes = [], anotacoesClinicas = [], registrosReproducao = [], partos = [],
  addAnotacaoClinica, updateAnotacaoClinica, deleteAnotacaoClinica,
  upsertVacinacaoAnimal, addVermifugacaoAnimal, addOpg, addMedicao,
}) {
  const [editMode, setEditMode] = useState(false);
  const [data, setData] = useState(visita.data);
  const [vetsIds, setVetsIds] = useState(visita.vetsParticipantes || []);
  const [valor, setValor] = useState(String(visita.valorCobrado || contrato?.valorMensal || 0));
  const [obs, setObs] = useState(visita.observacoes || '');
  // Sub-aba atual: caderno (padrão) | pendencias | animais
  const [aba, setAba] = useState('caderno');
  // Autosave do textarea de observações pra não perder enquanto digita
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (obs !== visita.observacoes && updateVisitaClinica) {
        updateVisitaClinica(visita.id, { observacoes: obs });
      }
    }, 1200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obs]);

  const finalizada = visita.status === 'finalizada';
  const vets = (visita.vetsParticipantes || [])
    .map(id => vetsExternos.find(v => v.id === id))
    .filter(Boolean);
  const vetsAtivos = vetsExternos.filter(v => v.ativo !== false);

  // ── Animais do haras cobertos por este contrato ────────────────
  // Regra permissiva: inclui o animal se bater com o proprietário DO
  // contrato OU com o local DO contrato (quando ele tem local). Assim,
  // uma égua cadastrada só com proprietário aparece se o contrato é
  // desse proprietário; uma égua cadastrada só com local aparece se o
  // contrato aponta pra esse local; e cadastrada com os dois aparece
  // em qualquer um dos dois cenários.
  const animaisDoHaras = useMemo(() => {
    if (!contrato) return [];
    return cavalos.filter(c => {
      if (c.presente === false) return false;
      const bateProp = contrato.proprietarioId && (
        c.proprietarioId === contrato.proprietarioId
        || (c.proprietarioIds || []).includes(contrato.proprietarioId)
      );
      const bateLocal = contrato.localId && c.localId === contrato.localId;
      // Se contrato só tem proprietário: filtra por proprietário.
      // Se contrato tem proprietário E local: aceita qualquer um dos dois.
      if (contrato.localId) return bateProp || bateLocal;
      return bateProp;
    });
  }, [contrato, cavalos]);
  const idsHaras = useMemo(() => new Set(animaisDoHaras.map(c => c.id)), [animaisDoHaras]);

  // ── Pendências automáticas ─────────────────────────────────────
  // Mês de referência = mês da data da visita.
  const [refAno, refMes] = (data || new Date().toISOString().slice(0, 10)).split('-');
  const iniMes = `${refAno}-${refMes}-01`;
  const fimMes = `${refAno}-${refMes}-31`;
  const hoje = new Date().toISOString().slice(0, 10);

  const agendaVac = useMemo(
    () => calcAgendaVac(protocolosVacinacao, animaisDoHaras, vacinacoesAnimais).filter(i => idsHaras.has(i.cavaloId)),
    [protocolosVacinacao, animaisDoHaras, vacinacoesAnimais, idsHaras],
  );
  const agendaVerm = useMemo(
    () => calcAgendaVerm(protocolosVermifugacao, animaisDoHaras, vermifugacoesAnimais).filter(i => idsHaras.has(i.cavaloId)),
    [protocolosVermifugacao, animaisDoHaras, vermifugacoesAnimais, idsHaras],
  );

  // Categorização das pendências de vacina/vermifuga:
  //   atrasadas: dataPrevista < iniMes
  //   doMes:     iniMes <= dataPrevista <= fimMes
  //   aVencer:   dataPrevista > fimMes (próximos 30 dias)
  const classifica = (lista) => {
    const atrasadas = []; const doMes = []; const aVencer = [];
    const limiteFuturo = addDiasStr(fimMes, 30);
    for (const it of lista) {
      if (it.feito || it.cancelado) continue;
      const dp = it.dataPrevista || it.proximaData;
      if (!dp) continue;
      if (dp < iniMes) atrasadas.push(it);
      else if (dp <= fimMes) doMes.push(it);
      else if (dp <= limiteFuturo) aVencer.push(it);
    }
    return { atrasadas, doMes, aVencer };
  };
  const vac = useMemo(() => classifica(agendaVac), [agendaVac, iniMes, fimMes]);
  const verm = useMemo(() => classifica(agendaVerm), [agendaVerm, iniMes, fimMes]);

  // OPGs: cavalos SEM OPG nos últimos 90 dias
  const opgsPendentes = useMemo(() => {
    const limite = addDiasStr(hoje, -90);
    return animaisDoHaras.filter(c => {
      const meus = opgs.filter(o => o.cavaloId === c.id && o.dataColeta >= limite);
      return meus.length === 0;
    });
  }, [animaisDoHaras, opgs, hoje]);

  // Éguas gestantes do haras
  const gestantes = useMemo(() => animaisDoHaras.filter(c =>
    c.categoria === 'Gestante' || (c.categorias || []).includes('Gestante') || c.gestacao?.dataCobricao,
  ), [animaisDoHaras]);

  // DGs pendentes: éguas com cobrição/IA onde esperamos DG15/30/45 nessa data
  const dgsPendentes = useMemo(() => {
    const out = [];
    for (const egua of gestantes) {
      const dataCob = egua.gestacao?.dataCobricao;
      if (!dataCob) continue;
      // Para cada marco DG, verifica se já foi feito via registros de reprodução
      for (const marcoDias of [15, 30, 45]) {
        const dataEsperada = addDiasStr(dataCob, marcoDias);
        if (dataEsperada > hoje) continue; // ainda não é o momento
        // Checa se existe algum registro DG dessa égua >= dataEsperada
        const temDg = registrosReproducao.some(r =>
          r.eguaId === egua.id && r.tipo === 'diagnostico_gestacao' && r.data >= dataEsperada,
        );
        if (!temDg) {
          out.push({ egua, marco: `DG${marcoDias}`, dataEsperada });
          break; // só o primeiro DG pendente por égua
        }
      }
    }
    return out;
  }, [gestantes, registrosReproducao, hoje]);

  // Acompanhamento gestacional: pra toda gestante, mostra se tem anotação clínica no mês
  const acompanhamentoGestantes = useMemo(() => {
    return gestantes.map(egua => {
      const anotMes = anotacoesClinicas.filter(a => a.cavaloId === egua.id && a.data >= iniMes && a.data <= fimMes);
      const semanasGestacao = egua.gestacao?.dataCobricao
        ? Math.floor((new Date(hoje + 'T00:00:00') - new Date(egua.gestacao.dataCobricao + 'T00:00:00')) / (7 * 86400000))
        : null;
      return { egua, anotacoesNoMes: anotMes.length, semanasGestacao };
    });
  }, [gestantes, anotacoesClinicas, iniMes, fimMes, hoje]);

  // Potros (ao pé) sem medição nos últimos 30 dias
  const potrosSemMedicao = useMemo(() => {
    const limite = addDiasStr(hoje, -30);
    const potros = animaisDoHaras.filter(c =>
      c.categoria === 'Potro ao pé' || (c.categorias || []).includes('Potro ao pé'),
    );
    return potros.filter(c => {
      const minhas = medicoes.filter(m => m.cavaloId === c.id && m.dataRegistro >= limite);
      return minhas.length === 0;
    });
  }, [animaisDoHaras, medicoes, hoje]);

  // Resumo da visita anterior (última finalizada)
  const visitaAnterior = useMemo(() => {
    // Fazemos a busca "fora" via dependência do contrato (chamador poderia
    // passar), mas por simplicidade computamos aqui com base nas finalizadas
    // deste contrato que já estão na prop visita (indireto). Fallback: null.
    return null;
  }, []);
  // void visitaAnterior pra evitar unused — deixa comentado


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
        action={
          <button
            onClick={() => {
              const doc = gerarPdfVisitaClinica({
                visita, contrato, nomeHaras: haras,
                empresa: empresaInfo || {},
                vetsExternos,
                cavalos: animaisDoHaras,
                insumos,
                anotacoesClinicas,
                vacinacoesAnimais, protocolosVacinacao,
                vermifugacoesAnimais, protocolosVermifugacao,
                opgs, medicoes,
              });
              doc.save(nomePdfVisitaClinica(haras, visita.data));
            }}
            title="Baixar PDF da visita (estilo cupom)"
            style={{
              width: 36, height: 36, borderRadius: 12, background: '#7c2d8c',
              display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer',
            }}
          >
            <Icon name="download" size={16} color="#fff" />
          </button>
        }
      />

      <div style={{ padding: '14px 20px 20px' }}>
        {/* Status chip */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10,
          padding: '4px 10px', borderRadius: 10,
          background: finalizada ? '#dcfce7' : '#fef3c7',
          color: finalizada ? '#166534' : '#92400e',
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {finalizada ? '✓ Finalizada' : '● Em andamento'}
        </div>

        {/* Sub-abas: Caderno (padrão) | Pendências | Animais */}
        <div style={{
          display: 'flex', gap: 2, marginBottom: 14, background: 'var(--soft)',
          borderRadius: 10, padding: 3,
        }}>
          {[
            ['caderno', 'Caderno', (anotacoesClinicas.filter(a => a.visitaClinicaId === visita.id).length)],
            ['pendencias', 'Pendências', null],
            ['animais', 'Animais', animaisDoHaras.length],
          ].map(([k, lbl, badge]) => (
            <button key={k} onClick={() => setAba(k)} style={{
              flex: 1, padding: '8px 6px', borderRadius: 8, border: 'none',
              background: aba === k ? '#7c2d8c' : 'transparent',
              color: aba === k ? '#fff' : 'var(--ink-2)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {lbl}
              {badge != null && badge > 0 && (
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 8,
                  background: aba === k ? 'rgba(255,255,255,0.25)' : '#7c2d8c15',
                  color: aba === k ? '#fff' : '#7c2d8c',
                }}>{badge}</span>
              )}
            </button>
          ))}
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

        {/* Aba Caderno — anotações clínicas da visita + obs gerais */}
        {aba === 'caderno' && (!finalizada || editMode) && (
          <CadernoVisita
            visita={visita} contrato={contrato}
            animaisDoHaras={animaisDoHaras} vetsExternos={vetsExternos}
            anotacoesClinicas={anotacoesClinicas}
            addAnotacaoClinica={addAnotacaoClinica}
            updateAnotacaoClinica={updateAnotacaoClinica}
            deleteAnotacaoClinica={deleteAnotacaoClinica}
            currentUser={currentUser}
            obs={obs} setObs={setObs}
            insumos={insumos}
            updateVisitaClinica={updateVisitaClinica}
          />
        )}

        {/* Aba Caderno quando visita finalizada (só leitura) */}
        {aba === 'caderno' && finalizada && !editMode && (
          <CadernoVisita
            visita={visita} contrato={contrato}
            animaisDoHaras={animaisDoHaras} vetsExternos={vetsExternos}
            anotacoesClinicas={anotacoesClinicas}
            addAnotacaoClinica={null /* readonly */}
            updateAnotacaoClinica={updateAnotacaoClinica}
            deleteAnotacaoClinica={deleteAnotacaoClinica}
            currentUser={currentUser}
            obs={visita.observacoes || ''} setObs={null}
            insumos={insumos}
            updateVisitaClinica={null /* readonly */}
          />
        )}

        {/* Aba Animais — lista do haras */}
        {aba === 'animais' && (
          <AnimaisDoHaras
            animais={animaisDoHaras} proprietarios={proprietarios}
            locais={locais} contrato={contrato}
            medicoes={medicoes} vacinacoesAnimais={vacinacoesAnimais}
            vermifugacoesAnimais={vermifugacoesAnimais}
            anotacoesClinicas={anotacoesClinicas}
          />
        )}

        {/* Aba Pendências — mesmo conteúdo do painel original */}
        {aba === 'pendencias' && (!finalizada || editMode) && (
          <>
            {animaisDoHaras.length === 0 ? (
              <AnimaisDoHaras
                animais={[]} proprietarios={proprietarios}
                locais={locais} contrato={contrato}
              />
            ) : (
              /* Resumo do haras */
              <div style={{
                background: 'var(--soft)', borderRadius: 10, padding: '10px 12px',
                marginBottom: 12, fontSize: 12, color: 'var(--ink-2)',
              }}>
                <strong>{animaisDoHaras.length}</strong> animal{animaisDoHaras.length !== 1 ? 'is' : ''} no haras
                {gestantes.length > 0 && <> · <strong>{gestantes.length}</strong> gestante{gestantes.length !== 1 ? 's' : ''}</>}
                {animaisDoHaras.filter(c => (c.categorias || []).includes('Potro ao pé') || c.categoria === 'Potro ao pé').length > 0 && (
                  <> · <strong>{animaisDoHaras.filter(c => (c.categorias || []).includes('Potro ao pé') || c.categoria === 'Potro ao pé').length}</strong> potro{animaisDoHaras.filter(c => (c.categorias || []).includes('Potro ao pé') || c.categoria === 'Potro ao pé').length !== 1 ? 's' : ''}</>
                )}
              </div>
            )}

            {/* Bloco 1: Vacinação */}
            <PendenciasBloco titulo="Vacinação" cor="#1e40af" bg="#dbeafe"
              atrasadas={vac.atrasadas} doMes={vac.doMes} aVencer={vac.aVencer}
              protocolos={protocolosVacinacao} cavalos={cavalos}
              rotuloItem={(it) => {
                const p = protocolosVacinacao.find(pr => pr.id === it.protocoloId);
                const cav = cavalos.find(c => c.id === it.cavaloId);
                return `${cav?.nome || '—'} · ${p?.nome || 'vacina'}${it.doseIdx != null ? ` (dose ${it.doseIdx + 1})` : ''}`;
              }}
            />

            {/* Bloco 2: Vermifugação */}
            <PendenciasBloco titulo="Vermifugação" cor="#15803d" bg="#dcfce7"
              atrasadas={verm.atrasadas} doMes={verm.doMes} aVencer={verm.aVencer}
              protocolos={protocolosVermifugacao} cavalos={cavalos}
              rotuloItem={(it) => {
                const p = protocolosVermifugacao.find(pr => pr.id === it.protocoloId);
                const cav = cavalos.find(c => c.id === it.cavaloId);
                return `${cav?.nome || '—'} · ${p?.nome || 'vermífugo'}`;
              }}
            />

            {/* Bloco 3: OPGs pendentes */}
            {opgsPendentes.length > 0 && (
              <SecaoLista titulo={`OPGs pendentes (sem coleta nos últimos 90 dias) · ${opgsPendentes.length}`} cor="#92400e" bg="#fef3c7">
                {opgsPendentes.slice(0, 8).map(c => (
                  <div key={c.id} style={rowStyle}>
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{c.nome}</span>
                  </div>
                ))}
                {opgsPendentes.length > 8 && (
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', padding: '6px 10px' }}>+{opgsPendentes.length - 8} animal(is)</div>
                )}
              </SecaoLista>
            )}

            {/* Bloco 4: DGs pendentes */}
            {dgsPendentes.length > 0 && (
              <SecaoLista titulo={`DGs pendentes · ${dgsPendentes.length}`} cor="#6b21a8" bg="#f5e8ff">
                {dgsPendentes.map(({ egua, marco, dataEsperada }) => (
                  <div key={egua.id + marco} style={rowStyle}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, color: 'var(--ink)' }}>{egua.nome}</span>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{marco} esperado em {fmtData(dataEsperada)}</div>
                    </div>
                  </div>
                ))}
              </SecaoLista>
            )}

            {/* Bloco 5: Acompanhamento gestacional */}
            {acompanhamentoGestantes.length > 0 && (
              <SecaoLista titulo={`Acompanhamento gestacional · ${acompanhamentoGestantes.length} égua${acompanhamentoGestantes.length !== 1 ? 's' : ''}`} cor="#be185d" bg="#fce7f3">
                {acompanhamentoGestantes.map(({ egua, anotacoesNoMes, semanasGestacao }) => (
                  <div key={egua.id} style={rowStyle}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, color: 'var(--ink)' }}>{egua.nome}</span>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                        {semanasGestacao != null ? `${semanasGestacao} semana${semanasGestacao !== 1 ? 's' : ''}` : 'sem data cobrição'}
                        {' · '}{anotacoesNoMes === 0 ? 'sem anotação no mês' : `${anotacoesNoMes} anotação(ões) no mês`}
                      </div>
                    </div>
                    {anotacoesNoMes === 0 && (
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                        PENDENTE
                      </span>
                    )}
                  </div>
                ))}
              </SecaoLista>
            )}

            {/* Bloco 6: Potros sem medição */}
            {potrosSemMedicao.length > 0 && (
              <SecaoLista titulo={`Potros sem medição (>30 dias) · ${potrosSemMedicao.length}`} cor="#b45309" bg="#fef3c7">
                {potrosSemMedicao.map(c => (
                  <div key={c.id} style={rowStyle}>
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{c.nome}</span>
                  </div>
                ))}
              </SecaoLista>
            )}

            {/* Dica — pra registrar, usa as abas da Veterinária */}
            <div style={{
              background: '#dbeafe30', border: '1px solid #93c5fd',
              borderRadius: 10, padding: '10px 12px', marginBottom: 14,
              fontSize: 11, color: '#1e3a8a',
            }}>
              💡 Pra registrar vacina, vermífugo, OPG, medição ou anotação clínica,
              use a aba Veterinária. Os registros feitos durante a visita aparecem
              automaticamente no histórico.
            </div>
          </>
        )}

        {/* Form de finalização — fica fora das abas, sempre visível no rodapé
            quando rascunho ou em edição. */}
        {(!finalizada || editMode) && (
          <>
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

              <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 10, padding: '6px 10px', background: 'var(--soft)', borderRadius: 6 }}>
                Observações gerais da visita ficam na aba <strong>Caderno</strong>. O que você escreveu lá vai pro PDF.
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
function addDiasStr(iso, dias) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
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
