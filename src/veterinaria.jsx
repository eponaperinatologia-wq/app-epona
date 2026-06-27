// veterinaria.jsx — Módulo Veterinária: Gestação, Vacinação, e futuras seções
import React, { useState, useMemo } from 'react';
import { Icon } from './icons';
import { TopBar } from './screens';
import { GestacaoPartosScreen } from './gestacao';

const fmtDate = ds => {
  if (!ds) return '—';
  const [y, m, d] = ds.split('-');
  return `${parseInt(d)}/${parseInt(m)}/${y}`;
};
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (ds, n) => {
  const d = new Date(ds + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const inputSt = {
  width: '100%', padding: '11px 13px', borderRadius: 11,
  border: '1px solid var(--line)', background: 'var(--card)',
  fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)',
  outline: 'none', boxSizing: 'border-box',
};

// ─────────────────────────────────────────────────────────────
// VeterinariaScreen — wrapper com sub-abas
// ─────────────────────────────────────────────────────────────
export function VeterinariaScreen({
  setScreen, setSelected, partos, cavalos, proprietarios, movimentacoes, insumos,
  currentUser, addRegistro, addAtividade,
  protocolosVacinacao, campanhasVacinacao, vacinacoesAnimais,
  addProtocoloVacinacao, updateProtocoloVacinacao, deleteProtocoloVacinacao,
  addCampanhaVacinacao, updateCampanhaVacinacao, deleteCampanhaVacinacao,
  upsertVacinacaoAnimal,
}) {
  const [aba, setAba] = useState('gestacao');

  const ABAS = [
    { id: 'gestacao', label: 'Gestação' },
    { id: 'vacinacao', label: 'Vacinação' },
    { id: 'vermifugacao', label: 'Vermifugação', emBreve: true },
    { id: 'desenvolvimento', label: 'Desenvolvimento', emBreve: true },
    { id: 'anotacoes', label: 'Anotações', emBreve: true },
    { id: 'exames', label: 'Exames', emBreve: true },
    { id: 'relatorio', label: 'Relatório', emBreve: true },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', marginBottom: 12 }}>
          Veterinária
        </div>
        {/* Sub-tabs com scroll horizontal */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', marginLeft: -20, marginRight: -20, paddingLeft: 20 }}>
          {ABAS.map(a => (
            <button
              key={a.id}
              onClick={() => !a.emBreve && setAba(a.id)}
              style={{
                background: 'none', border: 'none', padding: '8px 16px 10px',
                fontSize: 14, fontWeight: aba === a.id ? 700 : 400,
                color: a.emBreve ? 'var(--ink-3)' : aba === a.id ? 'var(--accent)' : 'var(--ink)',
                borderBottom: aba === a.id ? '2px solid var(--accent)' : '2px solid transparent',
                whiteSpace: 'nowrap', cursor: a.emBreve ? 'default' : 'pointer',
                fontFamily: 'var(--sans)',
              }}
            >
              {a.label}
              {a.emBreve && <span style={{ fontSize: 9, color: 'var(--ink-3)', marginLeft: 4 }}>em breve</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {aba === 'gestacao' && (
          <GestacaoPartosScreen
            setScreen={setScreen} setSelected={setSelected}
            partos={partos} cavalos={cavalos}
            proprietarios={proprietarios} movimentacoes={movimentacoes}
            embutida
          />
        )}
        {aba === 'vacinacao' && (
          <VacinacaoTab
            cavalos={cavalos} insumos={insumos} currentUser={currentUser}
            addRegistro={addRegistro} addAtividade={addAtividade}
            protocolos={protocolosVacinacao} campanhas={campanhasVacinacao}
            vacinacoesAnimais={vacinacoesAnimais}
            addProtocolo={addProtocoloVacinacao} updateProtocolo={updateProtocoloVacinacao} deleteProtocolo={deleteProtocoloVacinacao}
            addCampanha={addCampanhaVacinacao} updateCampanha={updateCampanhaVacinacao} deleteCampanha={deleteCampanhaVacinacao}
            upsertVacinacao={upsertVacinacaoAnimal}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Vacinação
// ─────────────────────────────────────────────────────────────
function VacinacaoTab({
  cavalos, insumos, currentUser,
  addRegistro, addAtividade,
  protocolos, campanhas, vacinacoesAnimais,
  addProtocolo, updateProtocolo, deleteProtocolo,
  addCampanha, updateCampanha, deleteCampanha,
  upsertVacinacao,
}) {
  const [vista, setVista] = useState('campanhas'); // 'campanhas' | 'protocolos' | 'checkoff'
  const [campanhaCheckId, setCampanhaCheckId] = useState(null);
  const [showProtForm, setShowProtForm] = useState(false);
  const [editProtId, setEditProtId] = useState(null);
  const [showCampForm, setShowCampForm] = useState(false);
  const isAdmin = currentUser?.role === 'admin';
  const todayStr = today();

  const handleCheckoff = (campanhaId) => {
    setCampanhaCheckId(campanhaId);
    setVista('checkoff');
  };

  if (vista === 'checkoff' && campanhaCheckId) {
    const campanha = campanhas.find(c => c.id === campanhaCheckId);
    const protocolo = protocolos.find(p => p.id === campanha?.protocoloId);
    return (
      <CheckOffView
        campanha={campanha} protocolo={protocolo} cavalos={cavalos} insumos={insumos}
        vacinacoesAnimais={vacinacoesAnimais} currentUser={currentUser}
        addRegistro={addRegistro} addAtividade={addAtividade}
        upsertVacinacao={upsertVacinacao} updateCampanha={updateCampanha}
        onBack={() => setVista('campanhas')}
      />
    );
  }

  return (
    <div style={{ padding: '16px 20px 90px' }}>
      {/* Alternador Campanhas / Protocolos */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['campanhas', 'protocolos'].map(v => (
          <button key={v} onClick={() => setVista(v)} style={{
            flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: '1px solid ' + (vista === v ? 'var(--accent)' : 'var(--line)'),
            background: vista === v ? 'var(--accent-soft)' : 'var(--card)',
            color: vista === v ? 'var(--accent)' : 'var(--ink)', fontFamily: 'var(--sans)',
          }}>
            {v === 'campanhas' ? 'Campanhas' : 'Protocolos'}
          </button>
        ))}
      </div>

      {/* ── CAMPANHAS ── */}
      {vista === 'campanhas' && (
        <>
          {isAdmin && (
            <button onClick={() => setShowCampForm(true)} style={{
              width: '100%', background: 'var(--accent-soft)', border: '1px dashed var(--accent)',
              borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, color: 'var(--accent)',
              marginBottom: 14, fontFamily: 'var(--sans)',
            }}>
              + Agendar vacinação
            </button>
          )}
          {showCampForm && (
            <CampanhaForm
              protocolos={protocolos}
              onSave={data => { addCampanha({ id: 'camp_' + Date.now(), ...data }); setShowCampForm(false); }}
              onCancel={() => setShowCampForm(false)}
            />
          )}
          {campanhas.length === 0 && !showCampForm && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 14 }}>
              Nenhuma campanha agendada.<br />
              {protocolos.length === 0
                ? 'Crie um protocolo primeiro em "Protocolos".'
                : 'Clique em "+ Agendar vacinação".'}
            </div>
          )}
          {[...campanhas].sort((a, b) => (b.data || '').localeCompare(a.data || '')).map(c => (
            <CampanhaCard
              key={c.id} campanha={c}
              protocolo={protocolos.find(p => p.id === c.protocoloId)}
              vacinacoesAnimais={vacinacoesAnimais}
              cavalos={cavalos} isAdmin={isAdmin}
              onCheckoff={() => handleCheckoff(c.id)}
              onDelete={() => deleteCampanha(c.id)}
              onConcluir={() => updateCampanha(c.id, { ...c, status: 'concluida' })}
            />
          ))}
        </>
      )}

      {/* ── PROTOCOLOS ── */}
      {vista === 'protocolos' && (
        <>
          {isAdmin && (
            <button onClick={() => { setShowProtForm(true); setEditProtId(null); }} style={{
              width: '100%', background: 'var(--accent-soft)', border: '1px dashed var(--accent)',
              borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, color: 'var(--accent)',
              marginBottom: 14, fontFamily: 'var(--sans)',
            }}>
              + Novo protocolo
            </button>
          )}
          {(showProtForm) && (
            <ProtocoloForm
              initial={editProtId ? protocolos.find(p => p.id === editProtId) : null}
              insumos={insumos}
              onSave={data => {
                if (editProtId) updateProtocolo(editProtId, data);
                else addProtocolo({ id: 'prot_' + Date.now(), ...data });
                setShowProtForm(false); setEditProtId(null);
              }}
              onCancel={() => { setShowProtForm(false); setEditProtId(null); }}
            />
          )}
          {protocolos.length === 0 && !showProtForm && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 14 }}>
              Nenhum protocolo cadastrado.
            </div>
          )}
          {protocolos.map(p => (
            <ProtocoloCard
              key={p.id} protocolo={p} insumos={insumos} isAdmin={isAdmin}
              onEdit={() => { setEditProtId(p.id); setShowProtForm(true); }}
              onDelete={() => deleteProtocolo(p.id)}
            />
          ))}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Card de Campanha
// ─────────────────────────────────────────────────────────────
const TIPO_LABELS = { geral: 'Tropa geral', potros: 'Potros', gestantes: 'Éguas gestantes' };

function CampanhaCard({ campanha, protocolo, vacinacoesAnimais, cavalos, isAdmin, onCheckoff, onDelete, onConcluir }) {
  const todayStr = today();
  const isHoje = campanha.data === todayStr;
  const isPassada = campanha.data < todayStr;
  const isConcluida = campanha.status === 'concluida';
  const animaisTotal = vacinacoesAnimais.filter(v => v.campanhaId === campanha.id).length;
  const animaisFeitos = vacinacoesAnimais.filter(v => v.campanhaId === campanha.id && v.feito).length;
  const cor = isConcluida ? '#6b7280' : isHoje ? 'var(--accent)' : isPassada ? '#dc2626' : 'var(--ink)';

  return (
    <div style={{
      background: 'var(--card)', border: `1px solid ${isHoje && !isConcluida ? 'var(--accent)' : 'var(--line)'}`,
      borderRadius: 14, padding: '14px 16px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
            {protocolo?.nome || 'Protocolo removido'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
            {TIPO_LABELS[protocolo?.tipo] || protocolo?.tipo} · {fmtDate(campanha.data)}
          </div>
          {campanha.proximaData && (
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
              Próxima: {fmtDate(campanha.proximaData)}
            </div>
          )}
          {campanha.obs && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, fontStyle: 'italic' }}>{campanha.obs}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: isConcluida ? '#f3f4f6' : isHoje ? 'var(--accent-soft)' : isPassada ? '#fef2f2' : '#f0fdf4',
            color: cor,
          }}>
            {isConcluida ? 'Concluída' : isHoje ? 'Hoje' : isPassada ? 'Atrasada' : 'Agendada'}
          </span>
          {animaisTotal > 0 && (
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{animaisFeitos}/{animaisTotal} ✓</span>
          )}
        </div>
      </div>

      {!isConcluida && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={onCheckoff} style={{
            flex: 1, background: isHoje ? 'var(--accent)' : 'var(--soft)',
            color: isHoje ? '#fff' : 'var(--ink)', border: 'none', borderRadius: 10,
            padding: '9px 0', fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)',
          }}>
            {isHoje ? '✓ Iniciar vacinação' : 'Ver lista'}
          </button>
          {isAdmin && (
            <>
              <button onClick={onConcluir} style={{
                padding: '9px 12px', background: 'var(--soft)', border: 'none',
                borderRadius: 10, fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--sans)',
              }}>Concluir</button>
              <button onClick={onDelete} style={{
                padding: '9px 10px', background: '#fef2f2', border: 'none',
                borderRadius: 10, color: '#dc2626', fontFamily: 'var(--sans)',
              }}>
                <Icon name="x" size={14} color="#dc2626" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Card de Protocolo
// ─────────────────────────────────────────────────────────────
function ProtocoloCard({ protocolo, insumos, isAdmin, onEdit, onDelete }) {
  const vacina = insumos.find(i => i.id === protocolo.insumoId);
  const intervalLabel = protocolo.intervaloDias >= 365
    ? `${Math.round(protocolo.intervaloDias / 365)} ano(s)`
    : protocolo.intervaloDias >= 30
    ? `${Math.round(protocolo.intervaloDias / 30)} mês(es)`
    : `${protocolo.intervaloDias} dias`;

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)',
      borderRadius: 14, padding: '14px 16px', marginBottom: 10,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, background: 'var(--accent-soft)',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        <Icon name="stethoscope" size={20} color="var(--accent)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{protocolo.nome}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
          {TIPO_LABELS[protocolo.tipo] || protocolo.tipo} · {intervalLabel}
        </div>
        {vacina && (
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
            Vacina: {vacina.nome}
          </div>
        )}
        {protocolo.descricao && (
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, fontStyle: 'italic' }}>
            {protocolo.descricao}
          </div>
        )}
      </div>
      {isAdmin && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onEdit} style={{
            padding: '7px 10px', background: 'var(--soft)', border: 'none',
            borderRadius: 8, color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 12,
          }}>Editar</button>
          <button onClick={onDelete} style={{
            padding: '7px 10px', background: '#fef2f2', border: 'none',
            borderRadius: 8, color: '#dc2626', fontFamily: 'var(--sans)',
          }}>
            <Icon name="x" size={13} color="#dc2626" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Form de Protocolo
// ─────────────────────────────────────────────────────────────
function ProtocoloForm({ initial, insumos, onSave, onCancel }) {
  const [nome, setNome] = useState(initial?.nome || '');
  const [insumoId, setInsumoId] = useState(initial?.insumoId || '');
  const [intervaloDias, setIntervaloDias] = useState(initial?.intervaloDias || 365);
  const [tipo, setTipo] = useState(initial?.tipo || 'geral');
  const [descricao, setDescricao] = useState(initial?.descricao || '');

  const vacinas = insumos.filter(i => i.categoria === 'medicamento');

  return (
    <div style={{ background: 'var(--soft)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>
        {initial ? 'Editar protocolo' : 'Novo protocolo'}
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Nome do protocolo</div>
        <input value={nome} onChange={e => setNome(e.target.value)}
          placeholder="Ex: Antirrábica anual" style={inputSt} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Vacina (insumo)</div>
        <select value={insumoId} onChange={e => setInsumoId(e.target.value)} style={inputSt}>
          <option value="">— selecionar —</option>
          {vacinas.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
          {insumos.filter(i => i.categoria !== 'medicamento').length > 0 && (
            <optgroup label="Outros insumos">
              {insumos.filter(i => i.categoria !== 'medicamento').map(i => (
                <option key={i.id} value={i.id}>{i.nome}</option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Intervalo (dias)</div>
          <input type="number" min="1" value={intervaloDias}
            onChange={e => setIntervaloDias(Number(e.target.value))}
            style={inputSt} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Aplicar em</div>
          <select value={tipo} onChange={e => setTipo(e.target.value)} style={inputSt}>
            <option value="geral">Tropa geral</option>
            <option value="potros">Potros</option>
            <option value="gestantes">Éguas gestantes</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Descrição / observações</div>
        <input value={descricao} onChange={e => setDescricao(e.target.value)}
          placeholder="Opcional" style={inputSt} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: 11, borderRadius: 10, border: '1px solid var(--line)',
          background: 'var(--card)', color: 'var(--ink)', fontSize: 14, fontFamily: 'var(--sans)',
        }}>Cancelar</button>
        <button
          disabled={!nome.trim()}
          onClick={() => onSave({ nome: nome.trim(), insumoId: insumoId || null, intervaloDias: Number(intervaloDias) || 365, tipo, descricao, ativo: true })}
          style={{
            flex: 2, padding: 11, borderRadius: 10, border: 'none',
            background: nome.trim() ? 'var(--accent)' : 'var(--soft)',
            color: nome.trim() ? '#fff' : 'var(--ink-3)',
            fontSize: 14, fontWeight: 700, fontFamily: 'var(--sans)',
          }}>
          Salvar protocolo
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Form de Campanha
// ─────────────────────────────────────────────────────────────
function CampanhaForm({ protocolos, onSave, onCancel }) {
  const [protocoloId, setProtocoloId] = useState(protocolos[0]?.id || '');
  const [data, setData] = useState(today());
  const [proximaData, setProximaData] = useState('');
  const [obs, setObs] = useState('');
  const protocolo = protocolos.find(p => p.id === protocoloId);

  // Auto-sugere próxima data quando protocolo ou data muda
  const proximaSugerida = protocolo && data ? addDays(data, protocolo.intervaloDias) : '';

  return (
    <div style={{ background: 'var(--soft)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>
        Agendar vacinação
      </div>

      {protocolos.length === 0 ? (
        <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>
          Cadastre um protocolo primeiro em "Protocolos".
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Protocolo</div>
            <select value={protocoloId} onChange={e => setProtocoloId(e.target.value)} style={inputSt}>
              {protocolos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Data da vacinação</div>
              <input type="date" value={data} onChange={e => setData(e.target.value)} style={inputSt} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>
                Próxima vacinação
                {proximaSugerida && !proximaData && (
                  <button onClick={() => setProximaData(proximaSugerida)} style={{
                    background: 'none', border: 'none', color: 'var(--accent)',
                    fontSize: 10, cursor: 'pointer', padding: '0 0 0 4px',
                  }}>sugerir</button>
                )}
              </div>
              <input type="date" value={proximaData || proximaSugerida} onChange={e => setProximaData(e.target.value)} style={inputSt} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Observações</div>
            <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" style={inputSt} />
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: 11, borderRadius: 10, border: '1px solid var(--line)',
          background: 'var(--card)', color: 'var(--ink)', fontSize: 14, fontFamily: 'var(--sans)',
        }}>Cancelar</button>
        {protocolos.length > 0 && (
          <button
            disabled={!protocoloId || !data}
            onClick={() => onSave({
              protocoloId, data, proximaData: proximaData || proximaSugerida || null,
              obs, status: 'pendente',
            })}
            style={{
              flex: 2, padding: 11, borderRadius: 10, border: 'none',
              background: protocoloId && data ? 'var(--accent)' : 'var(--soft)',
              color: protocoloId && data ? '#fff' : 'var(--ink-3)',
              fontSize: 14, fontWeight: 700, fontFamily: 'var(--sans)',
            }}>
            Salvar campanha
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Check-off — tela de vacinação no dia
// ─────────────────────────────────────────────────────────────
function CheckOffView({
  campanha, protocolo, cavalos, insumos, vacinacoesAnimais,
  currentUser, addRegistro, addAtividade, upsertVacinacao, updateCampanha, onBack,
}) {
  const todayStr = today();

  // Filtra cavalos conforme tipo do protocolo
  const cavalosAlvo = useMemo(() => {
    const presentes = cavalos.filter(c => c.presente);
    if (!protocolo) return presentes;
    if (protocolo.tipo === 'potros') {
      return presentes.filter(c => {
        if (!c.nascimento) return false;
        const meses = Math.floor((new Date() - new Date(c.nascimento + 'T12:00:00')) / (30 * 24 * 3600 * 1000));
        return meses <= 36 || (c.categoria || '').toLowerCase().includes('potro') || (c.categorias || []).some(x => x.toLowerCase().includes('potro'));
      });
    }
    if (protocolo.tipo === 'gestantes') {
      return presentes.filter(c => !!c.gestacao?.dataCobricao);
    }
    return presentes;
  }, [cavalos, protocolo]);

  const vacina = insumos.find(i => i.id === protocolo?.insumoId);

  // Garante que todos os cavalos-alvo têm registro nesta campanha
  const registrosMap = useMemo(() => {
    const m = {};
    vacinacoesAnimais.filter(v => v.campanhaId === campanha?.id).forEach(v => { m[v.cavaloId] = v; });
    return m;
  }, [vacinacoesAnimais, campanha]);

  const totalFeitos = cavalosAlvo.filter(c => registrosMap[c.id]?.feito).length;

  const handleCheck = (cavalo) => {
    const existing = registrosMap[cavalo.id];
    if (existing?.feito) return;

    const vid = existing?.id || ('vac_' + campanha.id + '_' + cavalo.id);
    upsertVacinacao({
      id: vid, campanhaId: campanha.id, cavaloId: cavalo.id,
      feito: true, feitoPor: currentUser?.nome || '', feitoEm: new Date().toISOString(),
    });

    // Lança registro de insumo (aparece na fatura)
    if (vacina) {
      const dataReg = campanha.data || todayStr;
      addRegistro({
        id: 'reg_' + Date.now() + '_' + cavalo.id,
        cavaloId: cavalo.id, insumoId: vacina.id,
        qtd: 1, hora: new Date().toTimeString().slice(0, 5),
        usuario: currentUser?.nome || '', isAuto: false, data: dataReg,
      });
      // Descartáveis obrigatórios da vacina
      (vacina.descartaveis || []).forEach(d => {
        const ins = insumos.find(i => i.id === d.insumoId);
        if (ins) {
          addRegistro({
            id: 'reg_' + Date.now() + '_desc_' + d.insumoId + '_' + cavalo.id,
            cavaloId: cavalo.id, insumoId: d.insumoId,
            qtd: d.qtd || 1, hora: new Date().toTimeString().slice(0, 5),
            usuario: currentUser?.nome || '', isAuto: true, data: dataReg,
          });
        }
      });
      // Atividade no histórico
      addAtividade({
        id: 'at_' + Date.now() + '_' + cavalo.id,
        tipo: 'vacinacao', cavaloId: cavalo.id, insumoId: vacina.id,
        qtd: 1, motivo: `Campanha: ${protocolo?.nome || ''}`,
        usuario: currentUser?.nome || '', autor: currentUser?.nome || '',
        mes: dataReg.slice(0, 7), data: dataReg,
        hora: new Date().toTimeString().slice(0, 5), texto: '',
      });
    }
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 20px 0' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: 'var(--accent)',
          fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 12, fontFamily: 'var(--sans)',
        }}>
          ← Voltar
        </button>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', marginBottom: 4 }}>
          {protocolo?.nome || 'Vacinação'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>
          {fmtDate(campanha?.data)} · {TIPO_LABELS[protocolo?.tipo] || ''}
          {vacina && ` · ${vacina.nome}`}
        </div>

        {/* Progresso */}
        <div style={{ background: 'var(--soft)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            <span>Progresso</span>
            <span style={{ color: totalFeitos === cavalosAlvo.length && cavalosAlvo.length > 0 ? '#16a34a' : 'var(--accent)' }}>
              {totalFeitos}/{cavalosAlvo.length} vacinados
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--line)', borderRadius: 6 }}>
            <div style={{
              height: 6, borderRadius: 6, background: 'var(--accent)',
              width: cavalosAlvo.length > 0 ? `${(totalFeitos / cavalosAlvo.length) * 100}%` : '0%',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>

        {cavalosAlvo.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-3)', fontSize: 14 }}>
            Nenhum animal corresponde ao tipo "{TIPO_LABELS[protocolo?.tipo] || protocolo?.tipo}".
          </div>
        )}

        {cavalosAlvo.map(c => {
          const reg = registrosMap[c.id];
          const feito = !!reg?.feito;
          return (
            <button
              key={c.id}
              onClick={() => handleCheck(c)}
              disabled={feito}
              style={{
                width: '100%', background: feito ? '#f0fdf4' : 'var(--card)',
                border: `1px solid ${feito ? '#86efac' : 'var(--line)'}`,
                borderRadius: 13, padding: '12px 14px', marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                cursor: feito ? 'default' : 'pointer',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: feito ? '#16a34a' : 'var(--soft)',
                border: feito ? 'none' : '2px solid var(--line-2)',
                display: 'grid', placeItems: 'center',
              }}>
                {feito && <Icon name="check" size={16} color="#fff" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{c.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  {c.baia || c.piquete || 'Sem local'}{c.proprietarioIds?.length > 0 ? '' : ''}
                </div>
              </div>
              {feito && (
                <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                  ✓ {reg.feitoPor ? `${reg.feitoPor}` : 'Vacinado'}
                </span>
              )}
            </button>
          );
        })}

        {totalFeitos === cavalosAlvo.length && cavalosAlvo.length > 0 && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #86efac',
            borderRadius: 12, padding: '14px 16px', textAlign: 'center',
            marginTop: 8, color: '#16a34a', fontWeight: 700, fontSize: 15,
          }}>
            ✓ Todos vacinados!
            <div style={{ fontSize: 12, fontWeight: 400, marginTop: 4, color: '#15803d' }}>
              Marque a campanha como concluída na tela anterior.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
