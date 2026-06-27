// veterinaria.jsx — Módulo Veterinária: dashboard + Gestação + Vacinação (+ futuras seções)
import React, { useState, useMemo } from 'react';
import { Icon } from './icons';
import { GestacaoPartosScreen } from './gestacao';

// ─────────────────────────────────────────────────────────────
// Utilitários de data
// ─────────────────────────────────────────────────────────────
const pad2 = n => String(n).padStart(2, '0');
const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (ds, n) => {
  if (!ds) return null;
  const d = new Date(ds + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const fmtDate = ds => {
  if (!ds) return '—';
  const [y, m, d] = ds.split('-');
  return `${parseInt(d)}/${parseInt(m)}/${y}`;
};
const diffDays = (a, b = todayStr()) => {
  const da = new Date(a + 'T12:00:00'), db = new Date(b + 'T12:00:00');
  return Math.round((da - db) / 86400000);
};

// ─────────────────────────────────────────────────────────────
// Lógica de agenda: calcula doses previstas por protocolo + animal
// ─────────────────────────────────────────────────────────────
function calcDoseDate(protocolo, doseIdx, cavalo) {
  const dose = protocolo.doses?.[doseIdx];
  if (!dose) return null;
  if (protocolo.tipo === 'gestante') {
    return addDays(cavalo.gestacao?.dataCobricao, dose.diasDesdeEvento);
  }
  if (protocolo.tipo === 'potro') {
    return addDays(cavalo.nascimento, dose.diasDesdeEvento);
  }
  return null;
}

function calcAgenda(protocolos, cavalos, vacinacoesAnimais) {
  const feitas = new Set(vacinacoesAnimais.filter(v => v.feito).map(v => `${v.protocoloId}_${v.doseIdx}_${v.cavaloId}`));
  const items = [];
  const today = todayStr();
  const em30 = addDays(today, 30);

  for (const prot of protocolos) {
    if (!prot.ativo) continue;
    const cavalosAlvo = cavalos.filter(c => {
      if (!c.presente) return false;
      if (prot.tipo === 'gestante') return !!c.gestacao?.dataCobricao;
      if (prot.tipo === 'potro') return !!c.nascimento;
      return false;
    });
    for (const cavalo of cavalosAlvo) {
      for (let i = 0; i < (prot.doses || []).length; i++) {
        const dataPrev = calcDoseDate(prot, i, cavalo);
        if (!dataPrev) continue;
        const key = `${prot.id}_${i}_${cavalo.id}`;
        items.push({
          key, protocoloId: prot.id, protocoloNome: prot.nome,
          doseIdx: i, dose: prot.doses[i],
          cavaloId: cavalo.id, cavaloNome: cavalo.nome,
          dataPrevista: dataPrev, feito: feitas.has(key),
          diasRestantes: diffDays(dataPrev),
        });
      }
    }
  }
  return items;
}

const inputSt = {
  width: '100%', padding: '11px 13px', borderRadius: 11,
  border: '1px solid var(--line)', background: 'var(--card)',
  fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)',
  outline: 'none', boxSizing: 'border-box',
};

// ─────────────────────────────────────────────────────────────
// VeterinariaScreen — Dashboard principal
// ─────────────────────────────────────────────────────────────
export function VeterinariaScreen({
  setScreen, setSelected, partos, cavalos, proprietarios, movimentacoes, insumos,
  currentUser, addRegistro, addAtividade,
  protocolosVacinacao, campanhasVacinacao, vacinacoesAnimais,
  addProtocoloVacinacao, updateProtocoloVacinacao, deleteProtocoloVacinacao,
  addCampanhaVacinacao, updateCampanhaVacinacao, deleteCampanhaVacinacao,
  upsertVacinacaoAnimal,
}) {
  const [secao, setSecao] = useState(null);

  const gestantes = cavalos.filter(c => c.presente && (
    c.categoria === 'Gestante' || (c.categorias || []).includes('Gestante') || c.gestacao?.dataCobricao
  ));

  const agenda = useMemo(
    () => calcAgenda(protocolosVacinacao, cavalos, vacinacoesAnimais),
    [protocolosVacinacao, cavalos, vacinacoesAnimais]
  );
  const dosesHoje = agenda.filter(i => !i.feito && i.diasRestantes === 0).length;
  const dosesAtrasadas = agenda.filter(i => !i.feito && i.diasRestantes < 0).length;
  const dosesTotal = dosesHoje + dosesAtrasadas;

  if (secao === 'gestacao') {
    return (
      <GestacaoPartosScreen
        setScreen={setScreen} setSelected={setSelected}
        partos={partos} cavalos={cavalos}
        proprietarios={proprietarios} movimentacoes={movimentacoes}
        onBack={() => setSecao(null)}
      />
    );
  }
  if (secao === 'vacinacao') {
    return (
      <VacinacaoScreen
        cavalos={cavalos} insumos={insumos} currentUser={currentUser}
        addRegistro={addRegistro} addAtividade={addAtividade}
        protocolos={protocolosVacinacao} vacinacoesAnimais={vacinacoesAnimais}
        addProtocolo={addProtocoloVacinacao} updateProtocolo={updateProtocoloVacinacao}
        deleteProtocolo={deleteProtocoloVacinacao}
        upsertVacinacao={upsertVacinacaoAnimal}
        agenda={agenda}
        onBack={() => setSecao(null)}
      />
    );
  }

  const CARDS = [
    {
      id: 'gestacao', label: 'Gestação', icon: 'heart', cor: '#9d174d', bg: '#fce7f3',
      badge: gestantes.length > 0 ? `${gestantes.length} gestante${gestantes.length > 1 ? 's' : ''}` : null,
    },
    {
      id: 'vacinacao', label: 'Vacinação', icon: 'stethoscope', cor: '#1d4ed8', bg: '#dbeafe',
      badge: dosesTotal > 0 ? `${dosesTotal} dose${dosesTotal > 1 ? 's' : ''} pendente${dosesTotal > 1 ? 's' : ''}` : `${agenda.filter(i=>!i.feito).length} agendadas`,
      badgeCor: dosesAtrasadas > 0 ? '#dc2626' : dosesHoje > 0 ? '#d97706' : '#6b7280',
    },
    { id: 'vermifugacao', label: 'Vermifugação', icon: 'leaf', cor: '#15803d', bg: '#dcfce7', emBreve: true },
    { id: 'desenvolvimento', label: 'Desenvolvimento', icon: 'bar-chart', cor: '#b45309', bg: '#fef3c7', emBreve: true },
    { id: 'anotacoes', label: 'Anotações\nClínicas', icon: 'edit', cor: '#7c3aed', bg: '#f3e8ff', emBreve: true },
    { id: 'exames', label: 'Exames\nComplementares', icon: 'doc', cor: '#0e7490', bg: '#cffafe', emBreve: true },
    { id: 'relatorio', label: 'Relatório\nVeterinário', icon: 'list', cor: '#374151', bg: '#f3f4f6', emBreve: true },
  ];

  return (
    <div style={{ paddingBottom: 90, overflowY: 'auto', height: '100%' }}>
      <div style={{ padding: '20px 20px 8px' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--ink)', marginBottom: 4 }}>
          Veterinária
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>
          {cavalos.filter(c => c.presente).length} animais presentes
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {CARDS.map(card => (
            <button
              key={card.id}
              onClick={() => !card.emBreve && setSecao(card.id)}
              style={{
                background: card.emBreve ? 'var(--soft)' : 'var(--card)',
                border: `1.5px solid ${card.emBreve ? 'var(--line)' : card.bg}`,
                borderRadius: 18, padding: '20px 16px',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
                textAlign: 'left', cursor: card.emBreve ? 'default' : 'pointer',
                opacity: card.emBreve ? 0.6 : 1,
                boxShadow: card.emBreve ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: card.emBreve ? 'var(--line)' : card.bg,
                display: 'grid', placeItems: 'center',
              }}>
                <Icon name={card.icon} size={26} color={card.emBreve ? 'var(--ink-3)' : card.cor} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: card.emBreve ? 'var(--ink-3)' : 'var(--ink)', lineHeight: 1.3, whiteSpace: 'pre-line' }}>
                  {card.label}
                </div>
                {card.emBreve ? (
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4, fontStyle: 'italic' }}>em breve</div>
                ) : card.badge ? (
                  <div style={{ fontSize: 11, fontWeight: 600, color: card.badgeCor || card.cor, marginTop: 4 }}>
                    {card.badge}
                  </div>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// VacinacaoScreen
// ─────────────────────────────────────────────────────────────
function VacinacaoScreen({
  cavalos, insumos, currentUser, addRegistro, addAtividade,
  protocolos, vacinacoesAnimais, agenda,
  addProtocolo, updateProtocolo, deleteProtocolo, upsertVacinacao,
  onBack,
}) {
  const [vista, setVista] = useState('agenda'); // 'agenda' | 'protocolos'
  const [editProt, setEditProt] = useState(null);
  const [showProtForm, setShowProtForm] = useState(false);
  const isAdmin = currentUser?.role === 'admin';

  const today = todayStr();
  const atrasadas = agenda.filter(i => !i.feito && i.diasRestantes < 0)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
  const hoje = agenda.filter(i => !i.feito && i.diasRestantes === 0);
  const proximas = agenda.filter(i => !i.feito && i.diasRestantes > 0 && i.diasRestantes <= 30)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
  const futuras = agenda.filter(i => !i.feito && i.diasRestantes > 30)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
  const feitas = agenda.filter(i => i.feito)
    .sort((a, b) => (b.dataPrevista || '').localeCompare(a.dataPrevista || ''));

  const handleVacinar = (item) => {
    const vacId = `vac_${item.protocoloId}_${item.doseIdx}_${item.cavaloId}`;
    const cavalo = cavalos.find(c => c.id === item.cavaloId);
    const vacina = insumos.find(i => i.id === item.dose?.insumoId);

    upsertVacinacao({
      id: vacId, protocoloId: item.protocoloId, doseIdx: item.doseIdx,
      cavaloId: item.cavaloId, dataPrevista: item.dataPrevista,
      feito: true, feitoPor: currentUser?.nome || '', feitoEm: new Date().toISOString(),
    });

    if (vacina && cavalo) {
      const dataReg = today;
      addRegistro({
        id: 'reg_vac_' + Date.now() + '_' + cavalo.id,
        cavaloId: cavalo.id, insumoId: vacina.id,
        qtd: 1, hora: new Date().toTimeString().slice(0, 5),
        usuario: currentUser?.nome || '', isAuto: false, data: dataReg,
      });
      (vacina.descartaveis || []).forEach(d => {
        addRegistro({
          id: 'reg_vac_desc_' + d.insumoId + '_' + Date.now() + '_' + cavalo.id,
          cavaloId: cavalo.id, insumoId: d.insumoId,
          qtd: d.qtd || 1, hora: new Date().toTimeString().slice(0, 5),
          usuario: currentUser?.nome || '', isAuto: true, data: dataReg,
        });
      });
      addAtividade({
        id: 'at_vac_' + Date.now() + '_' + cavalo.id,
        tipo: 'vacinacao', cavaloId: cavalo.id, insumoId: vacina.id,
        qtd: 1, motivo: `${item.protocoloNome} · ${item.dose?.label || 'Dose ' + (item.doseIdx + 1)}`,
        usuario: currentUser?.nome || '', autor: currentUser?.nome || '',
        mes: dataReg.slice(0, 7), data: dataReg,
        hora: new Date().toTimeString().slice(0, 5), texto: '',
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px 0', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', color: 'var(--accent)',
            fontSize: 22, padding: 0, cursor: 'pointer', lineHeight: 1,
          }}>‹</button>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)' }}>Vacinação</div>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {[['agenda', 'Agenda'], ['protocolos', 'Protocolos']].map(([v, l]) => (
            <button key={v} onClick={() => setVista(v)} style={{
              background: 'none', border: 'none', padding: '8px 16px 10px',
              fontSize: 14, fontWeight: vista === v ? 700 : 400,
              color: vista === v ? 'var(--accent)' : 'var(--ink)',
              borderBottom: vista === v ? '2px solid var(--accent)' : '2px solid transparent',
              fontFamily: 'var(--sans)', cursor: 'pointer',
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 90px' }}>

        {/* ── AGENDA ── */}
        {vista === 'agenda' && (
          <>
            {agenda.filter(i => !i.feito).length === 0 && protocolos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 14 }}>
                Nenhum protocolo cadastrado. Crie um em "Protocolos".
              </div>
            )}
            {agenda.filter(i => !i.feito).length === 0 && protocolos.length > 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 14 }}>
                Nenhuma dose pendente nos próximos 30 dias.
              </div>
            )}

            {atrasadas.length > 0 && (
              <AgendaGrupo titulo="Atrasadas" cor="#dc2626" items={atrasadas}
                cavalos={cavalos} insumos={insumos} onVacinar={handleVacinar} />
            )}
            {hoje.length > 0 && (
              <AgendaGrupo titulo="Hoje" cor="var(--accent)" items={hoje}
                cavalos={cavalos} insumos={insumos} onVacinar={handleVacinar} />
            )}
            {proximas.length > 0 && (
              <AgendaGrupo titulo="Próximos 30 dias" cor="#b45309" items={proximas}
                cavalos={cavalos} insumos={insumos} onVacinar={handleVacinar} />
            )}
            {futuras.length > 0 && (
              <AgendaGrupo titulo="Futuros" cor="var(--ink-3)" items={futuras}
                cavalos={cavalos} insumos={insumos} onVacinar={handleVacinar} collapsed />
            )}
            {feitas.length > 0 && (
              <AgendaGrupo titulo={`Realizadas (${feitas.length})`} cor="#6b7280" items={feitas}
                cavalos={cavalos} insumos={insumos} onVacinar={null} collapsed />
            )}
          </>
        )}

        {/* ── PROTOCOLOS ── */}
        {vista === 'protocolos' && (
          <>
            {isAdmin && !showProtForm && (
              <button onClick={() => { setEditProt(null); setShowProtForm(true); }} style={{
                width: '100%', background: 'var(--accent-soft)', border: '1px dashed var(--accent)',
                borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, color: 'var(--accent)',
                marginBottom: 14, fontFamily: 'var(--sans)',
              }}>
                + Novo protocolo
              </button>
            )}
            {showProtForm && (
              <ProtocoloForm
                initial={editProt}
                insumos={insumos}
                onSave={data => {
                  if (editProt) updateProtocolo(editProt.id, data);
                  else addProtocolo({ id: 'prot_' + Date.now(), ...data });
                  setShowProtForm(false); setEditProt(null);
                }}
                onCancel={() => { setShowProtForm(false); setEditProt(null); }}
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
                onEdit={() => { setEditProt(p); setShowProtForm(true); }}
                onDelete={() => deleteProtocolo(p.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Grupo de agenda (atrasadas / hoje / próximas / feitas)
// ─────────────────────────────────────────────────────────────
function AgendaGrupo({ titulo, cor, items, cavalos, insumos, onVacinar, collapsed: initCollapsed = false }) {
  const [open, setOpen] = useState(!initCollapsed);

  return (
    <div style={{ marginBottom: 18 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: 'none', border: 'none', padding: '4px 0 10px',
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: '100%',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: cor }}>
          {titulo}
        </span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>
          ({items.length})
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink-3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
      </button>

      {open && items.map(item => (
        <AgendaItem
          key={item.key} item={item} cavalos={cavalos} insumos={insumos}
          onVacinar={onVacinar} cor={cor}
        />
      ))}
    </div>
  );
}

function AgendaItem({ item, cavalos, insumos, onVacinar, cor }) {
  const vacina = insumos.find(i => i.id === item.dose?.insumoId);
  const dr = item.diasRestantes;
  const labelDias = item.feito ? fmtDate(item.dataPrevista)
    : dr === 0 ? 'Hoje'
    : dr < 0 ? `${Math.abs(dr)} dia${Math.abs(dr) > 1 ? 's' : ''} atrás`
    : `em ${dr} dia${dr > 1 ? 's' : ''}`;

  return (
    <div style={{
      background: 'var(--card)', border: `1px solid ${item.feito ? 'var(--line)' : cor + '40'}`,
      borderRadius: 13, padding: '12px 14px', marginBottom: 8,
      display: 'flex', alignItems: 'center', gap: 12,
      opacity: item.feito ? 0.6 : 1,
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: 5, flexShrink: 0,
        background: item.feito ? '#9ca3af' : cor,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
          {item.cavaloNome}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
          {vacina?.nome || '—'} · {item.dose?.label || `Dose ${item.doseIdx + 1}`}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
          {item.protocoloNome} · {fmtDate(item.dataPrevista)}
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        {item.feito ? (
          <span style={{ fontSize: 11, color: '#6b7280' }}>✓ {item.feitoPor || 'feito'}</span>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: cor, marginBottom: 6 }}>{labelDias}</div>
            <button onClick={() => onVacinar?.(item)} style={{
              background: cor, color: '#fff', border: 'none',
              borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--sans)',
            }}>
              Aplicar ✓
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Card de Protocolo
// ─────────────────────────────────────────────────────────────
const TIPO_LABELS = { gestante: 'Éguas gestantes', potro: 'Potros', geral: 'Tropa geral' };
const TIPO_EVENTO = { gestante: 'data de cobertura', potro: 'data de nascimento' };

function ProtocoloCard({ protocolo, insumos, isAdmin, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)',
      borderRadius: 14, marginBottom: 10, overflow: 'hidden',
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', background: 'none', border: 'none', padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: '#dbeafe',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <Icon name="stethoscope" size={20} color="#1d4ed8" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{protocolo.nome}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
            {TIPO_LABELS[protocolo.tipo]} · {(protocolo.doses || []).length} dose{(protocolo.doses||[]).length !== 1 ? 's' : ''}
          </div>
        </div>
        <span style={{ fontSize: 16, color: 'var(--ink-3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
      </button>

      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          {protocolo.descricao && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10, fontStyle: 'italic' }}>
              {protocolo.descricao}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Doses · a partir da {TIPO_EVENTO[protocolo.tipo] || ''}
          </div>
          {(protocolo.doses || []).map((dose, i) => {
            const vacina = insumos.find(ins => ins.id === dose.insumoId);
            const meses = Math.round(dose.diasDesdeEvento / 30);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: i < protocolo.doses.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 12,
                  background: '#dbeafe', color: '#1d4ed8',
                  display: 'grid', placeItems: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                    {vacina?.nome || <span style={{ color: '#dc2626' }}>Insumo não encontrado</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                    {dose.label || `Dose ${i + 1}`} · {dose.diasDesdeEvento} dias ({meses} {meses === 1 ? 'mês' : 'meses'})
                  </div>
                </div>
              </div>
            );
          })}
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={onEdit} style={{
                flex: 1, padding: '9px 0', borderRadius: 9, border: '1px solid var(--line)',
                background: 'var(--soft)', color: 'var(--ink)', fontSize: 13, fontFamily: 'var(--sans)',
              }}>Editar</button>
              <button onClick={onDelete} style={{
                padding: '9px 14px', borderRadius: 9, border: 'none',
                background: '#fef2f2', color: '#dc2626', fontFamily: 'var(--sans)',
              }}>
                <Icon name="x" size={14} color="#dc2626" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Form de Protocolo — múltiplas doses
// ─────────────────────────────────────────────────────────────
function ProtocoloForm({ initial, insumos, onSave, onCancel }) {
  const [nome, setNome] = useState(initial?.nome || '');
  const [tipo, setTipo] = useState(initial?.tipo || 'gestante');
  const [descricao, setDescricao] = useState(initial?.descricao || '');
  const [doses, setDoses] = useState(
    initial?.doses?.length ? initial.doses : [{ insumoId: '', diasDesdeEvento: 150, label: '' }]
  );

  const addDose = () => setDoses(d => [...d, { insumoId: '', diasDesdeEvento: 0, label: '' }]);
  const removeDose = i => setDoses(d => d.filter((_, idx) => idx !== i));
  const updateDose = (i, field, val) => setDoses(d => d.map((d2, idx) => idx === i ? { ...d2, [field]: val } : d2));

  const canSave = nome.trim() && doses.length > 0 && doses.every(d => d.insumoId && d.diasDesdeEvento > 0);

  const EVENTO_LABEL = { gestante: 'data de cobertura', potro: 'data de nascimento', geral: 'data da campanha' };

  return (
    <div style={{ background: 'var(--soft)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>
        {initial ? 'Editar protocolo' : 'Novo protocolo vacinal'}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Nome do protocolo</div>
        <input value={nome} onChange={e => setNome(e.target.value)}
          placeholder="Ex: Protocolo Gestantes, Protocolo Potros…" style={inputSt} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Aplicar em</div>
          <select value={tipo} onChange={e => setTipo(e.target.value)} style={inputSt}>
            <option value="gestante">Éguas gestantes</option>
            <option value="potro">Potros</option>
            <option value="geral">Tropa geral</option>
          </select>
        </div>
      </div>

      {tipo !== 'geral' && (
        <div style={{
          background: '#dbeafe', borderRadius: 10, padding: '8px 12px',
          fontSize: 12, color: '#1d4ed8', marginBottom: 14,
        }}>
          Os dias são contados a partir da <strong>{EVENTO_LABEL[tipo]}</strong> de cada animal.
        </div>
      )}

      {/* Lista de doses */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
        Doses
      </div>

      {doses.map((dose, i) => (
        <div key={i} style={{
          background: 'var(--card)', borderRadius: 12, padding: '12px 14px',
          marginBottom: 8, border: '1px solid var(--line)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{
              width: 22, height: 22, borderRadius: 11, background: '#dbeafe',
              color: '#1d4ed8', fontSize: 11, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>{i + 1}</span>
            {doses.length > 1 && (
              <button onClick={() => removeDose(i)} style={{
                background: 'none', border: 'none', color: '#dc2626',
                cursor: 'pointer', padding: '2px 6px', fontSize: 14,
              }}>×</button>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Vacina (insumo)</div>
            <select value={dose.insumoId} onChange={e => updateDose(i, 'insumoId', e.target.value)} style={inputSt}>
              <option value="">— selecionar —</option>
              {insumos.map(ins => <option key={ins.id} value={ins.id}>{ins.nome}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Dias desde evento</div>
              <input type="number" min="1" value={dose.diasDesdeEvento}
                onChange={e => updateDose(i, 'diasDesdeEvento', Number(e.target.value))}
                style={inputSt} />
              {dose.diasDesdeEvento > 0 && (
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>
                  ≈ {Math.round(dose.diasDesdeEvento / 30)} mês(es)
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Rótulo (opcional)</div>
              <input value={dose.label} onChange={e => updateDose(i, 'label', e.target.value)}
                placeholder="Ex: 5º mês, Reforço…" style={inputSt} />
            </div>
          </div>
        </div>
      ))}

      <button onClick={addDose} style={{
        width: '100%', background: 'none', border: '1px dashed var(--line-2)',
        borderRadius: 10, padding: '10px 0', fontSize: 13, color: 'var(--ink-3)',
        cursor: 'pointer', marginBottom: 14, fontFamily: 'var(--sans)',
      }}>
        + Adicionar dose
      </button>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Observações (opcional)</div>
        <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="" style={inputSt} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--line)',
          background: 'var(--card)', color: 'var(--ink)', fontSize: 14, fontFamily: 'var(--sans)',
        }}>Cancelar</button>
        <button disabled={!canSave} onClick={() => onSave({ nome: nome.trim(), tipo, descricao, doses, ativo: true })} style={{
          flex: 2, padding: 12, borderRadius: 10, border: 'none',
          background: canSave ? 'var(--accent)' : 'var(--soft)',
          color: canSave ? '#fff' : 'var(--ink-3)',
          fontSize: 14, fontWeight: 700, fontFamily: 'var(--sans)',
        }}>
          Salvar protocolo
        </button>
      </div>
    </div>
  );
}
