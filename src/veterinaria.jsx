// veterinaria.jsx
import React, { useState, useMemo } from 'react';
import { Icon } from './icons';
import { GestacaoPartosScreen } from './gestacao';

// ─── Utilitários de data ────────────────────────────────────────
const pad2 = n => String(n).padStart(2, '0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
};
const addDays = (ds, n) => {
  if (!ds) return null;
  const d = new Date(ds + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
};
const fmtDate = ds => {
  if (!ds) return '—';
  const [y, m, d] = ds.split('-');
  return `${parseInt(d)}/${parseInt(m)}/${y}`;
};
const diffDays = (a, b = todayStr()) => {
  if (!a) return 9999;
  const da = new Date(a + 'T12:00:00'), db = new Date(b + 'T12:00:00');
  return Math.round((da - db) / 86400000);
};
const MESES_ABREV = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

// ─── Paleta de cores para protocolos ──────────────────────────
const PROT_COLORS = ['#1d4ed8','#9d174d','#15803d','#b45309','#7c3aed','#0e7490','#dc2626','#c2410c'];
const getProtColor = (protId, allProts) => {
  const idx = allProts.findIndex(p => p.id === protId);
  return PROT_COLORS[idx >= 0 ? idx % PROT_COLORS.length : 0];
};

const inputSt = {
  width: '100%', padding: '11px 13px', borderRadius: 11,
  border: '1px solid var(--line)', background: 'var(--card)',
  fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)',
  outline: 'none', boxSizing: 'border-box',
};

// ─── Vacinação: cálculo de agenda ─────────────────────────────
function calcDoseDate(protocolo, doseIdx, cavalo) {
  const dose = protocolo.doses?.[doseIdx];
  if (!dose) return null;
  if (protocolo.tipo === 'gestante') return addDays(cavalo.gestacao?.dataCobricao, dose.diasDesdeEvento);
  if (protocolo.tipo === 'potro') return addDays(cavalo.nascimento, dose.diasDesdeEvento);
  return null;
}

function calcAgendaVac(protocolos, cavalos, vacinacoesAnimais) {
  const feitas = new Set(vacinacoesAnimais.filter(v => v.feito).map(v => `${v.protocoloId}_${v.doseIdx}_${v.cavaloId}`));
  const items = [];
  for (const prot of protocolos) {
    if (!prot.ativo) continue;
    const alvo = cavalos.filter(c => {
      if (!c.presente) return false;
      if (prot.tipo === 'gestante') return !!c.gestacao?.dataCobricao;
      if (prot.tipo === 'potro') return !!c.nascimento;
      return false;
    });
    for (const cavalo of alvo) {
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

// ─── Vermifugação: cálculo de agenda ──────────────────────────
function calcAgendaVerm(protocolos, cavalos, vermifugacoesAnimais) {
  const items = [];
  const today = todayStr();
  for (const prot of protocolos) {
    if (!prot.ativo) continue;
    const alvo = cavalos.filter(c => {
      if (!c.presente) return false;
      if (prot.tipo === 'gestante') return !!(c.categorias||[]).includes('Gestante') || !!c.gestacao?.dataCobricao;
      if (prot.tipo === 'potro') return !!c.nascimento && diffDays(today, c.nascimento) <= 730;
      return true;
    });
    for (const cavalo of alvo) {
      const historico = (vermifugacoesAnimais || [])
        .filter(v => v.cavaloId === cavalo.id && v.protocoloId === prot.id)
        .sort((a, b) => b.dataRealizacao.localeCompare(a.dataRealizacao));
      const ultimo = historico[0];
      const dataPrevista = ultimo
        ? addDays(ultimo.dataRealizacao, prot.intervaloDias)
        : addDays(today, -1);
      items.push({
        key: `verm_${prot.id}_${cavalo.id}`,
        protocoloId: prot.id, protocoloNome: prot.nome,
        cavaloId: cavalo.id, cavaloNome: cavalo.nome,
        dataPrevista, diasRestantes: diffDays(dataPrevista),
        ultimaRealizacao: ultimo?.dataRealizacao || null,
        insumoId: prot.insumoId,
      });
    }
  }
  return items;
}

// ─── VacPlanner ───────────────────────────────────────────────
function VacPlanner({ agenda, protocolos }) {
  const today = todayStr();
  const upcoming = agenda.filter(i => !i.feito && i.diasRestantes >= -30 && i.diasRestantes <= 120);
  const byDate = {};
  upcoming.forEach(item => {
    const d = item.dataPrevista;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(item);
  });
  const dates = Object.keys(byDate).sort();
  if (dates.length === 0) return (
    <div style={{ padding: '12px 0 4px', fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>
      Nenhuma vacina nos próximos 120 dias
    </div>
  );
  return (
    <div>
      {/* Legenda de protocolos */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        {protocolos.map((p, idx) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: PROT_COLORS[idx % PROT_COLORS.length], flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{p.nome}</span>
          </div>
        ))}
      </div>
      {/* Timeline horizontal */}
      <div style={{ overflowX: 'auto', display: 'flex', gap: 6, paddingBottom: 6 }}>
        {dates.map(d => {
          const items = byDate[d];
          const [, m, day] = d.split('-');
          const past = d < today;
          const isToday = d === today;
          const protIds = [...new Set(items.map(i => i.protocoloId))];
          return (
            <div key={d} style={{
              flexShrink: 0, textAlign: 'center', width: 50,
              background: isToday ? 'var(--accent)' : past ? '#fff1f2' : 'var(--card)',
              border: `1.5px solid ${isToday ? 'var(--accent)' : past ? '#fca5a5' : 'var(--line)'}`,
              borderRadius: 12, padding: '8px 4px 6px',
            }}>
              <div style={{ fontSize: 10, color: isToday ? 'rgba(255,255,255,0.75)' : 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase' }}>
                {MESES_ABREV[parseInt(m) - 1]}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1, color: isToday ? '#fff' : past ? '#dc2626' : 'var(--ink)' }}>
                {parseInt(day)}
              </div>
              <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 5, flexWrap: 'wrap' }}>
                {protIds.map(pid => (
                  <div key={pid} style={{
                    width: 7, height: 7, borderRadius: 4,
                    background: getProtColor(pid, protocolos),
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 9, color: isToday ? 'rgba(255,255,255,0.7)' : 'var(--ink-3)', marginTop: 3 }}>
                {items.length} dose{items.length > 1 ? 's' : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── VeterinariaScreen — Dashboard ────────────────────────────
export function VeterinariaScreen({
  setScreen, setSelected, partos, cavalos, proprietarios, movimentacoes, insumos,
  currentUser, addRegistro, addAtividade,
  protocolosVacinacao, vacinacoesAnimais,
  addProtocoloVacinacao, updateProtocoloVacinacao, deleteProtocoloVacinacao,
  upsertVacinacaoAnimal,
  protocolosVermifugacao, vermifugacoesAnimais, opgs,
  addProtocoloVermifugacao, updateProtocoloVermifugacao, deleteProtocoloVermifugacao,
  addVermifugacaoAnimal, addOpg, updateOpg, deleteOpg,
  medicoes, addMedicao, updateMedicao, deleteMedicao,
}) {
  const [secao, setSecao] = useState(null);

  const gestantes = cavalos.filter(c => c.presente && (
    c.categoria === 'Gestante' || (c.categorias || []).includes('Gestante') || c.gestacao?.dataCobricao
  ));

  const agendaVac = useMemo(
    () => calcAgendaVac(protocolosVacinacao, cavalos, vacinacoesAnimais),
    [protocolosVacinacao, cavalos, vacinacoesAnimais]
  );
  const agendaVerm = useMemo(
    () => calcAgendaVerm(protocolosVermifugacao || [], cavalos, vermifugacoesAnimais || []),
    [protocolosVermifugacao, cavalos, vermifugacoesAnimais]
  );

  const dosesVacPend = agendaVac.filter(i => !i.feito && i.diasRestantes <= 0).length;
  const dosesVermPend = agendaVerm.filter(i => i.diasRestantes <= 0).length;

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
        agenda={agendaVac}
        onBack={() => setSecao(null)}
      />
    );
  }
  if (secao === 'vermifugacao') {
    return (
      <VermifugacaoScreen
        cavalos={cavalos} insumos={insumos || []} currentUser={currentUser}
        addAtividade={addAtividade}
        protocolos={protocolosVermifugacao || []}
        vermifugacoesAnimais={vermifugacoesAnimais || []}
        opgs={opgs || []}
        addProtocolo={addProtocoloVermifugacao}
        updateProtocolo={updateProtocoloVermifugacao}
        deleteProtocolo={deleteProtocoloVermifugacao}
        addVermifugacao={addVermifugacaoAnimal}
        addOpg={addOpg} updateOpg={updateOpg} deleteOpg={deleteOpg}
        agenda={agendaVerm}
        onBack={() => setSecao(null)}
      />
    );
  }
  if (secao === 'desenvolvimento') {
    return (
      <DesenvolvimentoScreen
        cavalos={cavalos} currentUser={currentUser}
        medicoes={medicoes || []}
        addMedicao={addMedicao} updateMedicao={updateMedicao} deleteMedicao={deleteMedicao}
        onBack={() => setSecao(null)}
      />
    );
  }

  const animaisMedidos = new Set((medicoes || []).map(m => m.cavaloId)).size;

  const CARDS = [
    {
      id: 'gestacao', label: 'Gestação', icon: 'heart', cor: '#9d174d', bg: '#fce7f3',
      badge: gestantes.length > 0 ? `${gestantes.length} gestante${gestantes.length > 1 ? 's' : ''}` : null,
    },
    {
      id: 'vacinacao', label: 'Vacinação', icon: 'stethoscope', cor: '#1d4ed8', bg: '#dbeafe',
      badge: dosesVacPend > 0 ? `${dosesVacPend} pendente${dosesVacPend > 1 ? 's' : ''}` : `${agendaVac.filter(i=>!i.feito).length} agendadas`,
      badgeCor: dosesVacPend > 0 ? '#dc2626' : '#6b7280',
    },
    {
      id: 'vermifugacao', label: 'Vermifugação', icon: 'leaf', cor: '#15803d', bg: '#dcfce7',
      badge: dosesVermPend > 0 ? `${dosesVermPend} pendente${dosesVermPend > 1 ? 's' : ''}` : `${agendaVerm.length} agendados`,
      badgeCor: dosesVermPend > 0 ? '#dc2626' : '#6b7280',
    },
    { id: 'desenvolvimento', label: 'Desenvolvimento', icon: 'bar-chart', cor: '#b45309', bg: '#fef3c7', badge: animaisMedidos > 0 ? `${(medicoes||[]).length} medições` : 'Biometria', badgeCor: '#b45309' },
    { id: 'anotacoes', label: 'Anotações\nClínicas', icon: 'edit', cor: '#7c3aed', bg: '#f3e8ff', emBreve: true },
    { id: 'exames', label: 'Exames\nComplementares', icon: 'doc', cor: '#0e7490', bg: '#cffafe', emBreve: true },
    { id: 'relatorio', label: 'Relatório\nVeterinário', icon: 'list', cor: '#374151', bg: '#f3f4f6', emBreve: true },
  ];

  return (
    <div style={{ paddingBottom: 90, overflowY: 'auto', height: '100%' }}>
      <div style={{ padding: '20px 20px 8px' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--ink)', marginBottom: 4 }}>Veterinária</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>
          {cavalos.filter(c => c.presente).length} animais presentes
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {CARDS.map(card => (
            <button key={card.id} onClick={() => !card.emBreve && setSecao(card.id)} style={{
              background: card.emBreve ? 'var(--soft)' : 'var(--card)',
              border: `1.5px solid ${card.emBreve ? 'var(--line)' : card.bg}`,
              borderRadius: 18, padding: '20px 16px',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
              textAlign: 'left', cursor: card.emBreve ? 'default' : 'pointer',
              opacity: card.emBreve ? 0.6 : 1,
              boxShadow: card.emBreve ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: card.emBreve ? 'var(--line)' : card.bg, display: 'grid', placeItems: 'center' }}>
                <Icon name={card.icon} size={26} color={card.emBreve ? 'var(--ink-3)' : card.cor} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: card.emBreve ? 'var(--ink-3)' : 'var(--ink)', lineHeight: 1.3, whiteSpace: 'pre-line' }}>
                  {card.label}
                </div>
                {card.emBreve ? (
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4, fontStyle: 'italic' }}>em breve</div>
                ) : card.badge ? (
                  <div style={{ fontSize: 11, fontWeight: 600, color: card.badgeCor || card.cor, marginTop: 4 }}>{card.badge}</div>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── VacinacaoScreen ──────────────────────────────────────────
function VacinacaoScreen({
  cavalos, insumos, currentUser, addRegistro, addAtividade,
  protocolos, vacinacoesAnimais, agenda,
  addProtocolo, updateProtocolo, deleteProtocolo, upsertVacinacao, onBack,
}) {
  const [vista, setVista] = useState('agenda');
  const [editProt, setEditProt] = useState(null);
  const [showProtForm, setShowProtForm] = useState(false);
  const [filtroProtocolo, setFiltroProtocolo] = useState(null);
  const isAdmin = currentUser?.role === 'admin';
  const today = todayStr();

  const agendaFiltrada = filtroProtocolo
    ? agenda.filter(i => i.protocoloId === filtroProtocolo)
    : agenda;

  const atrasadas = agendaFiltrada.filter(i => !i.feito && i.diasRestantes < 0).sort((a,b) => a.diasRestantes - b.diasRestantes);
  const hoje = agendaFiltrada.filter(i => !i.feito && i.diasRestantes === 0);
  const proximas = agendaFiltrada.filter(i => !i.feito && i.diasRestantes > 0 && i.diasRestantes <= 30).sort((a,b) => a.diasRestantes - b.diasRestantes);
  const futuras = agendaFiltrada.filter(i => !i.feito && i.diasRestantes > 30).sort((a,b) => a.diasRestantes - b.diasRestantes);
  const feitas = agendaFiltrada.filter(i => i.feito).sort((a,b) => (b.dataPrevista||'').localeCompare(a.dataPrevista||''));

  const handleVacinar = (item, dataRealizada) => {
    const data = dataRealizada || today;
    const vacId = `vac_${item.protocoloId}_${item.doseIdx}_${item.cavaloId}`;
    const cavalo = cavalos.find(c => c.id === item.cavaloId);
    const vacina = insumos.find(i => i.id === item.dose?.insumoId);
    const ehMesAtual = data.slice(0, 7) === today.slice(0, 7);

    upsertVacinacao({
      id: vacId, protocoloId: item.protocoloId, doseIdx: item.doseIdx,
      cavaloId: item.cavaloId, dataPrevista: item.dataPrevista,
      feito: true, feitoPor: currentUser?.nome || '', feitoEm: data + 'T12:00:00',
    });

    if (vacina && cavalo && ehMesAtual) {
      addRegistro({ id: 'reg_vac_'+Date.now()+'_'+cavalo.id, cavaloId: cavalo.id, insumoId: vacina.id, qtd: 1, hora: new Date().toTimeString().slice(0,5), usuario: currentUser?.nome||'', isAuto: false, data });
      (vacina.descartaveis||[]).forEach(d => {
        addRegistro({ id: 'reg_vac_desc_'+d.insumoId+'_'+Date.now()+'_'+cavalo.id, cavaloId: cavalo.id, insumoId: d.insumoId, qtd: d.qtd||1, hora: new Date().toTimeString().slice(0,5), usuario: currentUser?.nome||'', isAuto: true, data });
      });
    }
    if (vacina && cavalo) {
      addAtividade({ id: 'at_vac_'+Date.now()+'_'+cavalo.id, tipo: 'vacinacao', cavaloId: cavalo.id, insumoId: vacina.id, qtd: 1, motivo: `${item.protocoloNome} · ${item.dose?.label||'Dose '+(item.doseIdx+1)}`, usuario: currentUser?.nome||'', autor: currentUser?.nome||'', mes: data.slice(0,7), data, hora: new Date().toTimeString().slice(0,5), texto: '' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 20px 0', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 22, padding: 0, cursor: 'pointer', lineHeight: 1 }}>‹</button>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)' }}>Vacinação</div>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {[['agenda','Agenda'],['protocolos','Protocolos']].map(([v,l]) => (
            <button key={v} onClick={() => setVista(v)} style={{
              background: 'none', border: 'none', padding: '8px 16px 10px',
              fontSize: 14, fontWeight: vista===v ? 700 : 400,
              color: vista===v ? 'var(--accent)' : 'var(--ink)',
              borderBottom: vista===v ? '2px solid var(--accent)' : '2px solid transparent',
              fontFamily: 'var(--sans)', cursor: 'pointer',
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 90px' }}>

        {vista === 'agenda' && (
          <>
            {/* Planner visual */}
            {protocolos.length > 0 && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 10 }}>
                  Calendário · próximos 120 dias
                </div>
                <VacPlanner agenda={agenda} protocolos={protocolos} />
              </div>
            )}

            {/* Filtro por protocolo */}
            {protocolos.length > 1 && (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
                <button onClick={() => setFiltroProtocolo(null)} style={{
                  flexShrink: 0, padding: '5px 12px', borderRadius: 20,
                  border: `1.5px solid ${filtroProtocolo === null ? 'var(--accent)' : 'var(--line)'}`,
                  background: filtroProtocolo === null ? 'var(--accent)' : 'var(--card)',
                  color: filtroProtocolo === null ? '#fff' : 'var(--ink)',
                  fontSize: 12, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer',
                }}>Todos</button>
                {protocolos.map((p, idx) => {
                  const cor = PROT_COLORS[idx % PROT_COLORS.length];
                  const ativo = filtroProtocolo === p.id;
                  return (
                    <button key={p.id} onClick={() => setFiltroProtocolo(ativo ? null : p.id)} style={{
                      flexShrink: 0, padding: '5px 12px', borderRadius: 20,
                      border: `1.5px solid ${ativo ? cor : 'var(--line)'}`,
                      background: ativo ? cor : 'var(--card)',
                      color: ativo ? '#fff' : 'var(--ink)',
                      fontSize: 12, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: 4, background: ativo ? '#fff' : cor, flexShrink: 0 }} />
                      {p.nome}
                    </button>
                  );
                })}
              </div>
            )}

            {agendaFiltrada.filter(i => !i.feito).length === 0 && protocolos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 14 }}>Nenhum protocolo cadastrado. Crie em "Protocolos".</div>
            )}
            {agendaFiltrada.filter(i => !i.feito).length === 0 && protocolos.length > 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 14 }}>Nenhuma dose pendente.</div>
            )}
            {atrasadas.length > 0 && <AgendaGrupo titulo="Atrasadas" cor="#dc2626" items={atrasadas} cavalos={cavalos} insumos={insumos} onVacinar={handleVacinar} protocolos={protocolos} />}
            {hoje.length > 0 && <AgendaGrupo titulo="Hoje" cor="var(--accent)" items={hoje} cavalos={cavalos} insumos={insumos} onVacinar={handleVacinar} protocolos={protocolos} />}
            {proximas.length > 0 && <AgendaGrupo titulo="Próximos 30 dias" cor="#b45309" items={proximas} cavalos={cavalos} insumos={insumos} onVacinar={handleVacinar} protocolos={protocolos} />}
            {futuras.length > 0 && <AgendaGrupo titulo="Futuros" cor="var(--ink-3)" items={futuras} cavalos={cavalos} insumos={insumos} onVacinar={handleVacinar} collapsed protocolos={protocolos} />}
            {feitas.length > 0 && <AgendaGrupo titulo={`Realizadas (${feitas.length})`} cor="#6b7280" items={feitas} cavalos={cavalos} insumos={insumos} onVacinar={null} collapsed protocolos={protocolos} />}
          </>
        )}

        {vista === 'protocolos' && (
          <>
            {isAdmin && !showProtForm && (
              <button onClick={() => { setEditProt(null); setShowProtForm(true); }} style={{ width: '100%', background: 'var(--accent-soft)', border: '1px dashed var(--accent)', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, color: 'var(--accent)', marginBottom: 14, fontFamily: 'var(--sans)' }}>
                + Novo protocolo
              </button>
            )}
            {showProtForm && (
              <ProtocoloVacForm initial={editProt} insumos={insumos}
                onSave={data => { if (editProt) updateProtocolo(editProt.id, data); else addProtocolo({ id: 'prot_'+Date.now(), ...data }); setShowProtForm(false); setEditProt(null); }}
                onCancel={() => { setShowProtForm(false); setEditProt(null); }} />
            )}
            {protocolos.length === 0 && !showProtForm && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 14 }}>Nenhum protocolo cadastrado.</div>
            )}
            {protocolos.map((p, idx) => (
              <ProtocoloVacCard key={p.id} protocolo={p} insumos={insumos} isAdmin={isAdmin} cor={PROT_COLORS[idx % PROT_COLORS.length]}
                onEdit={() => { setEditProt(p); setShowProtForm(true); }}
                onDelete={() => deleteProtocolo(p.id)} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── AgendaGrupo ──────────────────────────────────────────────
function AgendaGrupo({ titulo, cor, items, cavalos, insumos, onVacinar, collapsed: initCollapsed = false, protocolos = [] }) {
  const [open, setOpen] = useState(!initCollapsed);
  return (
    <div style={{ marginBottom: 18 }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', padding: '4px 0 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: '100%' }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: cor }}>{titulo}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>({items.length})</span>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink-3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
      </button>
      {open && items.map(item => (
        <AgendaItem key={item.key} item={item} cavalos={cavalos} insumos={insumos} onVacinar={onVacinar} cor={getProtColor(item.protocoloId, protocolos) || cor} />
      ))}
    </div>
  );
}

function AgendaItem({ item, cavalos, insumos, onVacinar, cor }) {
  const [confirmando, setConfirmando] = useState(false);
  const [dataReal, setDataReal] = useState(todayStr());
  const hoje = todayStr();
  const vacina = insumos.find(i => i.id === item.dose?.insumoId);
  const dr = item.diasRestantes;
  const labelDias = item.feito ? fmtDate(item.dataPrevista)
    : dr === 0 ? 'Hoje' : dr < 0 ? `${Math.abs(dr)} dia${Math.abs(dr)>1?'s':''} atrás` : `em ${dr} dia${dr>1?'s':''}`;
  const ehMesAtual = dataReal.slice(0,7) === hoje.slice(0,7);

  return (
    <div style={{ background: 'var(--card)', border: `1px solid ${item.feito ? 'var(--line)' : confirmando ? cor : cor+'40'}`, borderRadius: 13, padding: '12px 14px', marginBottom: 8, opacity: item.feito ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: 5, flexShrink: 0, background: item.feito ? '#9ca3af' : cor }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{item.cavaloNome}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{vacina?.nome || '—'} · {item.dose?.label||`Dose ${item.doseIdx+1}`}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{item.protocoloNome} · {fmtDate(item.dataPrevista)}</div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          {item.feito ? (
            <span style={{ fontSize: 11, color: '#6b7280' }}>✓ {item.feitoPor || 'feito'}</span>
          ) : !confirmando ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: cor, marginBottom: 6 }}>{labelDias}</div>
              <button onClick={() => setConfirmando(true)} style={{ background: cor, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Aplicar ✓</button>
            </>
          ) : null}
        </div>
      </div>
      {confirmando && (
        <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--soft)', borderRadius: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Quando foi aplicada?</div>
          <input type="date" value={dataReal} max={hoje} onChange={e => setDataReal(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--card)', fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
          {!ehMesAtual && <div style={{ fontSize: 11, color: '#b45309', background: '#fef3c7', borderRadius: 8, padding: '6px 10px', marginBottom: 8 }}>Data em mês anterior — registrado no histórico, <strong>sem lançamento na fatura</strong>.</div>}
          {ehMesAtual && <div style={{ fontSize: 11, color: '#15803d', background: '#f0fdf4', borderRadius: 8, padding: '6px 10px', marginBottom: 8 }}>Mês atual — será lançado na fatura do proprietário.</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setConfirmando(false)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', fontSize: 13, fontFamily: 'var(--sans)' }}>Cancelar</button>
            <button onClick={() => { onVacinar?.(item, dataReal); setConfirmando(false); }} style={{ flex: 2, padding: '8px 0', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)' }}>Confirmar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ProtocoloVacCard ─────────────────────────────────────────
const TIPO_LABELS = { gestante: 'Éguas gestantes', potro: 'Potros', geral: 'Tropa geral' };
const TIPO_EVENTO = { gestante: 'data de cobertura', potro: 'data de nascimento' };

function ProtocoloVacCard({ protocolo, insumos, isAdmin, onEdit, onDelete, cor }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: 'var(--card)', border: `1px solid ${cor}30`, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'none', border: 'none', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: cor+'20', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="stethoscope" size={20} color={cor} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{protocolo.nome}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
            {TIPO_LABELS[protocolo.tipo]} · {(protocolo.doses||[]).length} dose{(protocolo.doses||[]).length!==1?'s':''}
          </div>
        </div>
        <span style={{ fontSize: 16, color: 'var(--ink-3)', transform: open?'rotate(90deg)':'none', transition: 'transform 0.15s' }}>›</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          {protocolo.descricao && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10, fontStyle: 'italic' }}>{protocolo.descricao}</div>}
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Doses · a partir da {TIPO_EVENTO[protocolo.tipo]||''}</div>
          {(protocolo.doses||[]).map((dose, i) => {
            const vacina = insumos.find(ins => ins.id === dose.insumoId);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i<protocolo.doses.length-1?'1px solid var(--line)':'none' }}>
                <div style={{ width: 24, height: 24, borderRadius: 12, background: cor+'20', color: cor, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i+1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{vacina?.nome||<span style={{color:'#dc2626'}}>Insumo não encontrado</span>}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{dose.label||`Dose ${i+1}`} · {dose.diasDesdeEvento} dias (≈{Math.round(dose.diasDesdeEvento/30)} mês)</div>
                </div>
              </div>
            );
          })}
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={onEdit} style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 13, fontFamily: 'var(--sans)' }}>Editar</button>
              <button onClick={onDelete} style={{ padding: '9px 14px', borderRadius: 9, border: 'none', background: '#fef2f2', color: '#dc2626', fontFamily: 'var(--sans)' }}><Icon name="x" size={14} color="#dc2626" /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ProtocoloVacForm ─────────────────────────────────────────
function ProtocoloVacForm({ initial, insumos, onSave, onCancel }) {
  const [nome, setNome] = useState(initial?.nome||'');
  const [tipo, setTipo] = useState(initial?.tipo||'gestante');
  const [descricao, setDescricao] = useState(initial?.descricao||'');
  const [doses, setDoses] = useState(initial?.doses?.length ? initial.doses : [{ insumoId:'', diasDesdeEvento:150, label:'' }]);

  const addDose = () => setDoses(d => [...d, { insumoId:'', diasDesdeEvento:0, label:'' }]);
  const removeDose = i => setDoses(d => d.filter((_,idx) => idx!==i));
  const updateDose = (i, field, val) => setDoses(d => d.map((d2,idx) => idx===i ? {...d2,[field]:val} : d2));
  const canSave = nome.trim() && doses.length>0 && doses.every(d => d.insumoId && d.diasDesdeEvento>0);
  const EVENTO_LABEL = { gestante:'data de cobertura', potro:'data de nascimento', geral:'data da campanha' };

  return (
    <div style={{ background: 'var(--soft)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>{initial?'Editar protocolo':'Novo protocolo vacinal'}</div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Nome do protocolo</div>
        <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Protocolo Gestantes…" style={inputSt} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Aplicar em</div>
        <select value={tipo} onChange={e=>setTipo(e.target.value)} style={inputSt}>
          <option value="gestante">Éguas gestantes</option>
          <option value="potro">Potros</option>
          <option value="geral">Tropa geral</option>
        </select>
      </div>
      {tipo!=='geral' && (
        <div style={{ background:'#dbeafe', borderRadius:10, padding:'8px 12px', fontSize:12, color:'#1d4ed8', marginBottom:14 }}>
          Os dias são contados a partir da <strong>{EVENTO_LABEL[tipo]}</strong>.
        </div>
      )}
      <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>Doses</div>
      {doses.map((dose, i) => (
        <div key={i} style={{ background:'var(--card)', borderRadius:12, padding:'12px 14px', marginBottom:8, border:'1px solid var(--line)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ width:22, height:22, borderRadius:11, background:'#dbeafe', color:'#1d4ed8', fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{i+1}</span>
            {doses.length>1 && <button onClick={()=>removeDose(i)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', padding:'2px 6px', fontSize:14 }}>×</button>}
          </div>
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>Vacina (insumo)</div>
            <select value={dose.insumoId} onChange={e=>updateDose(i,'insumoId',e.target.value)} style={inputSt}>
              <option value="">— selecionar —</option>
              {insumos.map(ins=><option key={ins.id} value={ins.id}>{ins.nome}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>Dias desde evento</div>
              <input type="number" min="1" value={dose.diasDesdeEvento} onChange={e=>updateDose(i,'diasDesdeEvento',Number(e.target.value))} style={inputSt} />
              {dose.diasDesdeEvento>0 && <div style={{ fontSize:10, color:'var(--ink-3)', marginTop:3 }}>≈ {Math.round(dose.diasDesdeEvento/30)} mês(es)</div>}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>Rótulo (opcional)</div>
              <input value={dose.label} onChange={e=>updateDose(i,'label',e.target.value)} placeholder="Ex: 5º mês…" style={inputSt} />
            </div>
          </div>
        </div>
      ))}
      <button onClick={addDose} style={{ width:'100%', background:'none', border:'1px dashed var(--line-2)', borderRadius:10, padding:'10px 0', fontSize:13, color:'var(--ink-3)', cursor:'pointer', marginBottom:14, fontFamily:'var(--sans)' }}>+ Adicionar dose</button>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Observações</div>
        <input value={descricao} onChange={e=>setDescricao(e.target.value)} style={inputSt} />
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:10, border:'1px solid var(--line)', background:'var(--card)', color:'var(--ink)', fontSize:14, fontFamily:'var(--sans)' }}>Cancelar</button>
        <button disabled={!canSave} onClick={()=>onSave({nome:nome.trim(),tipo,descricao,doses,ativo:true})} style={{ flex:2, padding:12, borderRadius:10, border:'none', background:canSave?'var(--accent)':'var(--soft)', color:canSave?'#fff':'var(--ink-3)', fontSize:14, fontWeight:700, fontFamily:'var(--sans)' }}>Salvar protocolo</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VERMIFUGAÇÃO
// ═══════════════════════════════════════════════════════════════

const INTERVALO_OPTIONS = [
  { value: 90,  label: 'Trimestral (90 dias)' },
  { value: 120, label: 'Cada 4 meses (120 dias)' },
  { value: 180, label: 'Semestral (180 dias)' },
  { value: 365, label: 'Anual (365 dias)' },
];

function VermifugacaoScreen({
  cavalos, insumos, currentUser, addAtividade,
  protocolos, vermifugacoesAnimais, opgs, agenda,
  addProtocolo, updateProtocolo, deleteProtocolo,
  addVermifugacao, addOpg, updateOpg, deleteOpg, onBack,
}) {
  const [vista, setVista] = useState('agenda');
  const [editProt, setEditProt] = useState(null);
  const [showProtForm, setShowProtForm] = useState(false);
  const [filtroProtocolo, setFiltroProtocolo] = useState(null);
  const isAdmin = currentUser?.role === 'admin';
  const today = todayStr();

  const agendaFiltrada = filtroProtocolo ? agenda.filter(i => i.protocoloId === filtroProtocolo) : agenda;
  const atrasadas = agendaFiltrada.filter(i => i.diasRestantes < 0).sort((a,b)=>a.diasRestantes-b.diasRestantes);
  const hoje = agendaFiltrada.filter(i => i.diasRestantes === 0);
  const proximas = agendaFiltrada.filter(i => i.diasRestantes > 0 && i.diasRestantes <= 60).sort((a,b)=>a.diasRestantes-b.diasRestantes);
  const futuras = agendaFiltrada.filter(i => i.diasRestantes > 60).sort((a,b)=>a.diasRestantes-b.diasRestantes);

  const handleVermifugar = (item, dataRealizada) => {
    const data = dataRealizada || today;
    const cavalo = cavalos.find(c => c.id === item.cavaloId);
    const insumo = insumos.find(i => i.id === item.insumoId);
    addVermifugacao({
      id: 'verm_' + Date.now() + '_' + item.cavaloId,
      protocoloId: item.protocoloId,
      cavaloId: item.cavaloId,
      dataRealizacao: data,
      produto: insumo?.nome || '',
      registradoPor: currentUser?.nome || '',
    });
    if (cavalo) {
      addAtividade({
        id: 'at_verm_' + Date.now() + '_' + cavalo.id,
        tipo: 'vermifugacao', cavaloId: cavalo.id,
        insumoId: item.insumoId,
        qtd: 1, motivo: item.protocoloNome,
        usuario: currentUser?.nome || '', autor: currentUser?.nome || '',
        mes: data.slice(0,7), data, hora: new Date().toTimeString().slice(0,5), texto: '',
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 20px 0', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 22, padding: 0, cursor: 'pointer', lineHeight: 1 }}>‹</button>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)' }}>Vermifugação</div>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {[['agenda','Agenda'],['protocolos','Protocolos'],['opg','OPG']].map(([v,l]) => (
            <button key={v} onClick={() => setVista(v)} style={{
              background: 'none', border: 'none', padding: '8px 14px 10px',
              fontSize: 14, fontWeight: vista===v ? 700 : 400,
              color: vista===v ? 'var(--accent)' : 'var(--ink)',
              borderBottom: vista===v ? '2px solid var(--accent)' : '2px solid transparent',
              fontFamily: 'var(--sans)', cursor: 'pointer',
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 90px' }}>

        {vista === 'agenda' && (
          <>
            {/* Planner vermifugação */}
            {protocolos.length > 0 && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 10 }}>
                  Calendário de vermifugação
                </div>
                <VermPlanner agenda={agenda} protocolos={protocolos} />
              </div>
            )}

            {/* Filtro por protocolo */}
            {protocolos.length > 1 && (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
                <button onClick={() => setFiltroProtocolo(null)} style={{ flexShrink:0, padding:'5px 12px', borderRadius:20, border:`1.5px solid ${filtroProtocolo===null?'var(--accent)':'var(--line)'}`, background:filtroProtocolo===null?'var(--accent)':'var(--card)', color:filtroProtocolo===null?'#fff':'var(--ink)', fontSize:12, fontWeight:600, fontFamily:'var(--sans)', cursor:'pointer' }}>Todos</button>
                {protocolos.map((p,idx) => {
                  const cor = PROT_COLORS[idx % PROT_COLORS.length];
                  const ativo = filtroProtocolo === p.id;
                  return (
                    <button key={p.id} onClick={() => setFiltroProtocolo(ativo?null:p.id)} style={{ flexShrink:0, padding:'5px 12px', borderRadius:20, border:`1.5px solid ${ativo?cor:'var(--line)'}`, background:ativo?cor:'var(--card)', color:ativo?'#fff':'var(--ink)', fontSize:12, fontWeight:600, fontFamily:'var(--sans)', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{ width:7, height:7, borderRadius:4, background:ativo?'#fff':cor, flexShrink:0 }} />
                      {p.nome}
                    </button>
                  );
                })}
              </div>
            )}

            {agendaFiltrada.length === 0 && protocolos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 14 }}>Nenhum protocolo cadastrado. Crie em "Protocolos".</div>
            )}
            {atrasadas.length > 0 && <VermGrupo titulo="Atrasadas" cor="#dc2626" items={atrasadas} cavalos={cavalos} insumos={insumos} onVermifugar={handleVermifugar} protocolos={protocolos} />}
            {hoje.length > 0 && <VermGrupo titulo="Hoje" cor="var(--accent)" items={hoje} cavalos={cavalos} insumos={insumos} onVermifugar={handleVermifugar} protocolos={protocolos} />}
            {proximas.length > 0 && <VermGrupo titulo="Próximos 60 dias" cor="#b45309" items={proximas} cavalos={cavalos} insumos={insumos} onVermifugar={handleVermifugar} protocolos={protocolos} />}
            {futuras.length > 0 && <VermGrupo titulo="Futuros" cor="var(--ink-3)" items={futuras} cavalos={cavalos} insumos={insumos} onVermifugar={handleVermifugar} collapsed protocolos={protocolos} />}
          </>
        )}

        {vista === 'protocolos' && (
          <>
            {isAdmin && !showProtForm && (
              <button onClick={() => { setEditProt(null); setShowProtForm(true); }} style={{ width:'100%', background:'var(--accent-soft)', border:'1px dashed var(--accent)', borderRadius:12, padding:13, fontSize:14, fontWeight:600, color:'var(--accent)', marginBottom:14, fontFamily:'var(--sans)' }}>
                + Novo protocolo
              </button>
            )}
            {showProtForm && (
              <ProtocoloVermForm initial={editProt} insumos={insumos}
                onSave={data => { if(editProt) updateProtocolo(editProt.id,data); else addProtocolo({id:'pverm_'+Date.now(),...data}); setShowProtForm(false); setEditProt(null); }}
                onCancel={() => { setShowProtForm(false); setEditProt(null); }} />
            )}
            {protocolos.length === 0 && !showProtForm && (
              <div style={{ textAlign:'center', padding:'32px 0', color:'var(--ink-3)', fontSize:14 }}>Nenhum protocolo cadastrado.</div>
            )}
            {protocolos.map((p, idx) => (
              <ProtocoloVermCard key={p.id} protocolo={p} insumos={insumos} isAdmin={isAdmin} cor={PROT_COLORS[idx%PROT_COLORS.length]}
                onEdit={() => { setEditProt(p); setShowProtForm(true); }}
                onDelete={() => deleteProtocolo(p.id)} />
            ))}
          </>
        )}

        {vista === 'opg' && (
          <OPGScreen cavalos={cavalos} opgs={opgs} isAdmin={isAdmin} currentUser={currentUser} addOpg={addOpg} updateOpg={updateOpg} deleteOpg={deleteOpg} insumos={insumos} />
        )}
      </div>
    </div>
  );
}

// ─── VermPlanner ──────────────────────────────────────────────
function VermPlanner({ agenda, protocolos }) {
  const today = todayStr();
  const upcoming = agenda.filter(i => i.diasRestantes >= -30 && i.diasRestantes <= 120);
  const byDate = {};
  upcoming.forEach(item => {
    const d = item.dataPrevista;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(item);
  });
  const dates = Object.keys(byDate).sort();
  if (dates.length === 0) return <div style={{ fontSize:12, color:'var(--ink-3)', padding:'8px 0' }}>Nenhuma vermifugação nos próximos 120 dias.</div>;
  return (
    <div>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:10 }}>
        {protocolos.map((p,idx) => (
          <div key={p.id} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:10, height:10, borderRadius:5, background:PROT_COLORS[idx%PROT_COLORS.length], flexShrink:0 }} />
            <span style={{ fontSize:11, color:'var(--ink-2)' }}>{p.nome}</span>
          </div>
        ))}
      </div>
      <div style={{ overflowX:'auto', display:'flex', gap:6, paddingBottom:6 }}>
        {dates.map(d => {
          const items = byDate[d];
          const [,m,day] = d.split('-');
          const past = d < today;
          const isToday = d === today;
          const protIds = [...new Set(items.map(i => i.protocoloId))];
          return (
            <div key={d} style={{ flexShrink:0, textAlign:'center', width:50, background:isToday?'#15803d':past?'#fff1f2':'var(--card)', border:`1.5px solid ${isToday?'#15803d':past?'#fca5a5':'var(--line)'}`, borderRadius:12, padding:'8px 4px 6px' }}>
              <div style={{ fontSize:10, color:isToday?'rgba(255,255,255,0.75)':'var(--ink-3)', fontWeight:600, textTransform:'uppercase' }}>{MESES_ABREV[parseInt(m)-1]}</div>
              <div style={{ fontSize:20, fontWeight:700, lineHeight:1.1, color:isToday?'#fff':past?'#dc2626':'var(--ink)' }}>{parseInt(day)}</div>
              <div style={{ display:'flex', gap:2, justifyContent:'center', marginTop:5, flexWrap:'wrap' }}>
                {protIds.map(pid => <div key={pid} style={{ width:7, height:7, borderRadius:4, background:getProtColor(pid,protocolos) }} />)}
              </div>
              <div style={{ fontSize:9, color:isToday?'rgba(255,255,255,0.7)':'var(--ink-3)', marginTop:3 }}>{items.length} animal{items.length>1?'is':''}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── VermGrupo e VermItem ─────────────────────────────────────
function VermGrupo({ titulo, cor, items, cavalos, insumos, onVermifugar, collapsed: initCollapsed = false, protocolos = [] }) {
  const [open, setOpen] = useState(!initCollapsed);
  return (
    <div style={{ marginBottom: 18 }}>
      <button onClick={() => setOpen(o=>!o)} style={{ background:'none', border:'none', padding:'4px 0 10px', display:'flex', alignItems:'center', gap:8, cursor:'pointer', width:'100%' }}>
        <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:cor }}>{titulo}</span>
        <span style={{ fontSize:11, color:'var(--ink-3)' }}>({items.length})</span>
        <span style={{ marginLeft:'auto', fontSize:13, color:'var(--ink-3)', transform:open?'rotate(90deg)':'none', transition:'transform 0.15s' }}>›</span>
      </button>
      {open && items.map(item => (
        <VermItem key={item.key} item={item} cavalos={cavalos} insumos={insumos} onVermifugar={onVermifugar} cor={getProtColor(item.protocoloId, protocolos) || cor} />
      ))}
    </div>
  );
}

function VermItem({ item, cavalos, insumos, onVermifugar, cor }) {
  const [confirmando, setConfirmando] = useState(false);
  const [dataReal, setDataReal] = useState(todayStr());
  const hoje = todayStr();
  const insumo = insumos.find(i => i.id === item.insumoId);
  const dr = item.diasRestantes;
  const labelDias = dr === 0 ? 'Hoje' : dr < 0 ? `${Math.abs(dr)} dia${Math.abs(dr)>1?'s':''} atrás` : `em ${dr} dia${dr>1?'s':''}`;

  return (
    <div style={{ background:'var(--card)', border:`1px solid ${confirmando?cor:cor+'40'}`, borderRadius:13, padding:'12px 14px', marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:10, height:10, borderRadius:5, flexShrink:0, background:cor }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>{item.cavaloNome}</div>
          <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>{insumo?.nome||'—'} · {item.protocoloNome}</div>
          {item.ultimaRealizacao && (
            <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:1 }}>Última: {fmtDate(item.ultimaRealizacao)}</div>
          )}
          {!item.ultimaRealizacao && (
            <div style={{ fontSize:11, color:'#b45309', marginTop:1 }}>Nunca realizada</div>
          )}
        </div>
        <div style={{ flexShrink:0, textAlign:'right' }}>
          {!confirmando && (
            <>
              <div style={{ fontSize:11, fontWeight:600, color:cor, marginBottom:6 }}>{labelDias}</div>
              <button onClick={()=>setConfirmando(true)} style={{ background:cor, color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--sans)' }}>Aplicar ✓</button>
            </>
          )}
        </div>
      </div>
      {confirmando && (
        <div style={{ marginTop:12, padding:'12px 14px', background:'var(--soft)', borderRadius:10 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)', marginBottom:8 }}>Quando foi aplicada?</div>
          <input type="date" value={dataReal} max={hoje} onChange={e=>setDataReal(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid var(--line)', background:'var(--card)', fontSize:14, color:'var(--ink)', fontFamily:'var(--sans)', outline:'none', boxSizing:'border-box', marginBottom:8 }} />
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setConfirmando(false)} style={{ flex:1, padding:'8px 0', borderRadius:8, border:'1px solid var(--line)', background:'var(--card)', color:'var(--ink)', fontSize:13, fontFamily:'var(--sans)' }}>Cancelar</button>
            <button onClick={()=>{ onVermifugar?.(item,dataReal); setConfirmando(false); }} style={{ flex:2, padding:'8px 0', borderRadius:8, border:'none', background:cor, color:'#fff', fontSize:13, fontWeight:700, fontFamily:'var(--sans)' }}>Confirmar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ProtocoloVermCard ────────────────────────────────────────
function ProtocoloVermCard({ protocolo, insumos, isAdmin, onEdit, onDelete, cor }) {
  const [open, setOpen] = useState(false);
  const insumo = insumos.find(i => i.id === protocolo.insumoId);
  const intervOpt = INTERVALO_OPTIONS.find(o => o.value === protocolo.intervaloDias);
  return (
    <div style={{ background:'var(--card)', border:`1px solid ${cor}30`, borderRadius:14, marginBottom:10, overflow:'hidden' }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:'100%', background:'none', border:'none', padding:'14px 16px', display:'flex', alignItems:'center', gap:12, textAlign:'left', cursor:'pointer' }}>
        <div style={{ width:40, height:40, borderRadius:12, background:cor+'20', display:'grid', placeItems:'center', flexShrink:0 }}>
          <Icon name="leaf" size={20} color={cor} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{protocolo.nome}</div>
          <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>
            {TIPO_LABELS[protocolo.tipo]||'Tropa geral'} · {intervOpt?.label||`${protocolo.intervaloDias} dias`}
          </div>
        </div>
        <span style={{ fontSize:16, color:'var(--ink-3)', transform:open?'rotate(90deg)':'none', transition:'transform 0.15s' }}>›</span>
      </button>
      {open && (
        <div style={{ padding:'0 16px 14px' }}>
          <div style={{ fontSize:13, color:'var(--ink)', marginBottom:6 }}>
            <span style={{ color:'var(--ink-3)' }}>Produto: </span>{insumo?.nome||protocolo.produto||'—'}
          </div>
          <div style={{ fontSize:13, color:'var(--ink)', marginBottom:6 }}>
            <span style={{ color:'var(--ink-3)' }}>Intervalo: </span>{intervOpt?.label||`${protocolo.intervaloDias} dias`}
          </div>
          {protocolo.observacoes && <div style={{ fontSize:12, color:'var(--ink-3)', fontStyle:'italic', marginBottom:8 }}>{protocolo.observacoes}</div>}
          {isAdmin && (
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button onClick={onEdit} style={{ flex:1, padding:'9px 0', borderRadius:9, border:'1px solid var(--line)', background:'var(--soft)', color:'var(--ink)', fontSize:13, fontFamily:'var(--sans)' }}>Editar</button>
              <button onClick={onDelete} style={{ padding:'9px 14px', borderRadius:9, border:'none', background:'#fef2f2', color:'#dc2626', fontFamily:'var(--sans)' }}><Icon name="x" size={14} color="#dc2626" /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ProtocoloVermForm ────────────────────────────────────────
function ProtocoloVermForm({ initial, insumos, onSave, onCancel }) {
  const [nome, setNome] = useState(initial?.nome||'');
  const [tipo, setTipo] = useState(initial?.tipo||'geral');
  const [insumoId, setInsumoId] = useState(initial?.insumoId||'');
  const [intervaloDias, setIntervaloDias] = useState(initial?.intervaloDias||90);
  const [observacoes, setObservacoes] = useState(initial?.observacoes||'');
  const canSave = nome.trim() && intervaloDias > 0;

  return (
    <div style={{ background:'var(--soft)', borderRadius:16, padding:16, marginBottom:16 }}>
      <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:14 }}>{initial?'Editar protocolo':'Novo protocolo de vermifugação'}</div>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Nome</div>
        <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Protocolo Trimestral…" style={inputSt} />
      </div>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Aplicar em</div>
        <select value={tipo} onChange={e=>setTipo(e.target.value)} style={inputSt}>
          <option value="geral">Tropa geral</option>
          <option value="gestante">Éguas gestantes</option>
          <option value="potro">Potros</option>
        </select>
      </div>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Produto (insumo)</div>
        <select value={insumoId} onChange={e=>setInsumoId(e.target.value)} style={inputSt}>
          <option value="">— selecionar (opcional) —</option>
          {insumos.map(i=><option key={i.id} value={i.id}>{i.nome}</option>)}
        </select>
      </div>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Intervalo</div>
        <select value={intervaloDias} onChange={e=>setIntervaloDias(Number(e.target.value))} style={inputSt}>
          {INTERVALO_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          <option value={60}>Bimestral (60 dias)</option>
        </select>
      </div>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Observações</div>
        <input value={observacoes} onChange={e=>setObservacoes(e.target.value)} style={inputSt} />
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:10, border:'1px solid var(--line)', background:'var(--card)', color:'var(--ink)', fontSize:14, fontFamily:'var(--sans)' }}>Cancelar</button>
        <button disabled={!canSave} onClick={()=>onSave({nome:nome.trim(),tipo,insumoId,intervaloDias,observacoes,ativo:true})} style={{ flex:2, padding:12, borderRadius:10, border:'none', background:canSave?'#15803d':'var(--soft)', color:canSave?'#fff':'var(--ink-3)', fontSize:14, fontWeight:700, fontFamily:'var(--sans)' }}>Salvar protocolo</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// OPG
// ═══════════════════════════════════════════════════════════════
function OPGScreen({ cavalos, opgs, isAdmin, currentUser, addOpg, updateOpg, deleteOpg, insumos }) {
  const [showForm, setShowForm] = useState(false);
  const [editOpg, setEditOpg] = useState(null);
  const [filtroAnimal, setFiltroAnimal] = useState('');

  const opgFiltrados = [...(opgs || [])]
    .filter(o => !filtroAnimal || o.cavaloId === filtroAnimal)
    .sort((a, b) => b.dataColeta.localeCompare(a.dataColeta));

  return (
    <div>
      <div style={{ fontSize:12, color:'var(--ink-3)', marginBottom:12, lineHeight:1.5 }}>
        Registro de Ovos por Grama (OPG). Monitore a carga parasitária por animal e registre o princípio ativo utilizado após o exame.
      </div>

      {/* Filtro por animal */}
      <div style={{ marginBottom:12 }}>
        <select value={filtroAnimal} onChange={e=>setFiltroAnimal(e.target.value)} style={{ ...inputSt, fontSize:13 }}>
          <option value="">Todos os animais</option>
          {cavalos.filter(c=>c.presente).sort((a,b)=>a.nome.localeCompare(b.nome,'pt')).map(c=>(
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {(isAdmin || true) && !showForm && (
        <button onClick={()=>{ setEditOpg(null); setShowForm(true); }} style={{ width:'100%', background:'var(--accent-soft)', border:'1px dashed var(--accent)', borderRadius:12, padding:13, fontSize:14, fontWeight:600, color:'var(--accent)', marginBottom:14, fontFamily:'var(--sans)' }}>
          + Registrar OPG
        </button>
      )}

      {showForm && (
        <OPGForm
          initial={editOpg} cavalos={cavalos} insumos={insumos}
          onSave={data => {
            if (editOpg) updateOpg(editOpg.id, data);
            else addOpg({ id: 'opg_'+Date.now(), ...data });
            setShowForm(false); setEditOpg(null);
          }}
          onCancel={() => { setShowForm(false); setEditOpg(null); }}
        />
      )}

      {opgFiltrados.length === 0 && !showForm && (
        <div style={{ textAlign:'center', padding:'32px 0', color:'var(--ink-3)', fontSize:14 }}>Nenhum OPG registrado.</div>
      )}

      {opgFiltrados.map(opg => {
        const cavalo = cavalos.find(c => c.id === opg.cavaloId);
        return (
          <div key={opg.id} style={{ background:'var(--card)', border:'1px solid var(--line)', borderRadius:14, padding:'14px 16px', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{cavalo?.nome||'—'}</div>
                <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>Coleta: {fmtDate(opg.dataColeta)}</div>
              </div>
              {isAdmin && (
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>{ setEditOpg(opg); setShowForm(true); }} style={{ background:'var(--soft)', border:'1px solid var(--line)', borderRadius:8, padding:'4px 10px', fontSize:12, cursor:'pointer', fontFamily:'var(--sans)' }}>Editar</button>
                  <button onClick={()=>deleteOpg(opg.id)} style={{ background:'#fef2f2', border:'none', borderRadius:8, padding:'4px 8px', cursor:'pointer' }}><Icon name="x" size={12} color="#dc2626" /></button>
                </div>
              )}
            </div>

            {/* Resultados */}
            {(opg.resultado||[]).length > 0 && (
              <div style={{ marginTop:10, background:'var(--soft)', borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink-3)', marginBottom:6 }}>Resultado</div>
                {opg.resultado.map((r,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom: i<opg.resultado.length-1?'1px solid var(--line)':'none' }}>
                    <span style={{ fontSize:13, color:'var(--ink)' }}>{r.especie||'Espécie não identificada'}</span>
                    <span style={{ fontSize:13, fontWeight:600, color: r.contagem > 500 ? '#dc2626' : r.contagem > 200 ? '#b45309' : '#15803d' }}>
                      {r.contagem} OPG
                    </span>
                  </div>
                ))}
              </div>
            )}
            {(opg.resultado||[]).length === 0 && (
              <div style={{ marginTop:8, fontSize:12, color:'var(--ink-3)' }}>Resultado negativo / sem ovos</div>
            )}

            {opg.principioAtivo && (
              <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:11, color:'var(--ink-3)' }}>Tratamento:</span>
                <span style={{ fontSize:12, fontWeight:600, color:'#15803d', background:'#f0fdf4', padding:'2px 8px', borderRadius:6 }}>{opg.principioAtivo}</span>
              </div>
            )}
            {opg.observacoes && (
              <div style={{ marginTop:6, fontSize:12, color:'var(--ink-3)', fontStyle:'italic' }}>{opg.observacoes}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OPGForm({ initial, cavalos, insumos, onSave, onCancel }) {
  const [cavaloId, setCavaloId] = useState(initial?.cavaloId||'');
  const [dataColeta, setDataColeta] = useState(initial?.dataColeta||todayStr());
  const [resultado, setResultado] = useState(initial?.resultado?.length ? initial.resultado : [{ especie:'', contagem:'' }]);
  const [principioAtivo, setPrincipioAtivo] = useState(initial?.principioAtivo||'');
  const [observacoes, setObservacoes] = useState(initial?.observacoes||'');

  const addEspecie = () => setResultado(r => [...r, { especie:'', contagem:'' }]);
  const removeEspecie = i => setResultado(r => r.filter((_,idx)=>idx!==i));
  const updateEspecie = (i, field, val) => setResultado(r => r.map((r2,idx)=>idx===i?{...r2,[field]:val}:r2));

  const resultadoValido = resultado.filter(r => r.especie.trim() && r.contagem !== '');
  const canSave = cavaloId && dataColeta;

  return (
    <div style={{ background:'var(--soft)', borderRadius:16, padding:16, marginBottom:16 }}>
      <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:14 }}>{initial?'Editar OPG':'Novo resultado de OPG'}</div>

      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Animal *</div>
        <select value={cavaloId} onChange={e=>setCavaloId(e.target.value)} style={inputSt}>
          <option value="">— selecionar —</option>
          {cavalos.filter(c=>c.presente).sort((a,b)=>a.nome.localeCompare(b.nome,'pt')).map(c=>(
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Data da coleta *</div>
        <input type="date" value={dataColeta} onChange={e=>setDataColeta(e.target.value)} style={inputSt} />
      </div>

      {/* Resultado por espécie */}
      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--ink-3)', marginBottom:8 }}>
        Resultado (espécies encontradas)
      </div>
      <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:10 }}>
        Deixe em branco se o resultado for negativo.
      </div>
      {resultado.map((r, i) => (
        <div key={i} style={{ background:'var(--card)', borderRadius:10, padding:'10px 12px', marginBottom:8, border:'1px solid var(--line)' }}>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ flex:2 }}>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>Espécie</div>
              <input value={r.especie} onChange={e=>updateEspecie(i,'especie',e.target.value)} placeholder="Ex: Cyathostomum, Strongylus…" style={{ ...inputSt, padding:'8px 10px', fontSize:13 }} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>Contagem</div>
              <input type="number" min="0" value={r.contagem} onChange={e=>updateEspecie(i,'contagem',Number(e.target.value))} placeholder="OPG" style={{ ...inputSt, padding:'8px 10px', fontSize:13 }} />
            </div>
            {resultado.length > 1 && (
              <button onClick={()=>removeEspecie(i)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:16, padding:'4px', marginTop:16 }}>×</button>
            )}
          </div>
        </div>
      ))}
      <button onClick={addEspecie} style={{ width:'100%', background:'none', border:'1px dashed var(--line-2)', borderRadius:10, padding:'8px 0', fontSize:12, color:'var(--ink-3)', cursor:'pointer', marginBottom:14, fontFamily:'var(--sans)' }}>+ Adicionar espécie</button>

      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Princípio ativo utilizado após o OPG</div>
        <input value={principioAtivo} onChange={e=>setPrincipioAtivo(e.target.value)} placeholder="Ex: Ivermectina 1%, Moxidectina…" style={inputSt} />
      </div>

      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Observações</div>
        <input value={observacoes} onChange={e=>setObservacoes(e.target.value)} style={inputSt} />
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:10, border:'1px solid var(--line)', background:'var(--card)', color:'var(--ink)', fontSize:14, fontFamily:'var(--sans)' }}>Cancelar</button>
        <button disabled={!canSave} onClick={()=>onSave({ cavaloId, dataColeta, resultado:resultadoValido, principioAtivo, observacoes })} style={{ flex:2, padding:12, borderRadius:10, border:'none', background:canSave?'#15803d':'var(--soft)', color:canSave?'#fff':'var(--ink-3)', fontSize:14, fontWeight:700, fontFamily:'var(--sans)' }}>Salvar OPG</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DESENVOLVIMENTO — Biometria + Gráficos de Crescimento
// ═══════════════════════════════════════════════════════════════

const COR_DESENV = '#b45309';
const COR_PESO = '#1d4ed8';
const COR_ALTURA = '#15803d';

function MiniLineChart({ dados, cor, unidade, titulo }) {
  if (!dados || dados.length < 2) return null;
  const W = 300, H = 90;
  const pad = { top: 12, right: 36, bottom: 16, left: 36 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;
  const vals = dados.map(d => d.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pts = dados.map((d, i) => ({
    x: pad.left + (i / (dados.length - 1)) * cw,
    y: pad.top + ch - ((d.v - min) / range) * ch,
    v: d.v, label: d.label,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${pts[pts.length-1].x.toFixed(1)},${(pad.top+ch).toFixed(1)} L${pts[0].x.toFixed(1)},${(pad.top+ch).toFixed(1)}Z`;
  const last = pts[pts.length - 1];
  const delta = dados.length >= 2 ? dados[dados.length-1].v - dados[dados.length-2].v : null;
  return (
    <div>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:11, fontWeight:700, color:cor, textTransform:'uppercase', letterSpacing:'0.06em' }}>{titulo}</span>
        {delta !== null && (
          <span style={{ fontSize:11, fontWeight:700, color: delta > 0 ? '#15803d' : delta < 0 ? '#dc2626' : 'var(--ink-3)' }}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)}{unidade} vs. anterior
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%' }}>
        <text x={pad.left-4} y={pad.top+3} textAnchor="end" fontSize="9" fill="var(--ink-3)">{max.toFixed(0)}</text>
        <text x={pad.left-4} y={pad.top+ch+3} textAnchor="end" fontSize="9" fill="var(--ink-3)">{min.toFixed(0)}</text>
        <line x1={pad.left} y1={pad.top} x2={pad.left+cw} y2={pad.top} stroke="var(--line)" strokeWidth="0.5" />
        <line x1={pad.left} y1={pad.top+ch} x2={pad.left+cw} y2={pad.top+ch} stroke="var(--line)" strokeWidth="0.5" />
        <path d={areaD} fill={cor} fillOpacity="0.1" />
        <path d={pathD} fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r={i===pts.length-1?4:3} fill={cor} />)}
        <text x={last.x+5} y={last.y+3} fontSize="10" fill={cor} fontWeight="700">{last.v.toFixed(0)}{unidade}</text>
        {dados.length <= 8 && pts.map((p,i) => (
          <text key={i} x={p.x} y={pad.top+ch+13} textAnchor="middle" fontSize="8" fill="var(--ink-3)">{p.label}</text>
        ))}
      </svg>
    </div>
  );
}

// Campos de medição — ordem e metadados
const CAMPOS_MEDICAO = [
  { id: 'alturaCernelha',    label: 'Altura de Cernelha',     unidade: 'cm',  grupo: 'principal' },
  { id: 'peso',              label: 'Peso',                    unidade: 'kg',  grupo: 'principal' },
  { id: 'perimetroCanela',   label: 'Perímetro da Canela',     unidade: 'cm',  grupo: 'perimetros' },
  { id: 'perimetroAbdominal',label: 'Perímetro Abdominal',     unidade: 'cm',  grupo: 'perimetros' },
  { id: 'perimetroToracico', label: 'Perímetro Torácico',      unidade: 'cm',  grupo: 'perimetros' },
  { id: 'perimetroPescoco1', label: 'Perímetro de Pescoço 1',  unidade: 'cm',  grupo: 'perimetros' },
  { id: 'perimetroPescoco2', label: 'Perímetro de Pescoço 2',  unidade: 'cm',  grupo: 'perimetros' },
  { id: 'perimetroPescoco3', label: 'Perímetro de Pescoço 3',  unidade: 'cm',  grupo: 'perimetros' },
  { id: 'gorduraBaseCauda',  label: 'Gordura — Base de Cauda', unidade: '',    grupo: 'gordura' },
  { id: 'gorduraCostelas',   label: 'Gordura — Costelas',      unidade: '',    grupo: 'gordura' },
  { id: 'gorduraPescoco',    label: 'Gordura — Pescoço',       unidade: '',    grupo: 'gordura' },
];

function DesenvolvimentoScreen({ cavalos, currentUser, medicoes, addMedicao, updateMedicao, deleteMedicao, onBack }) {
  const [cavaloId, setCavaloId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editMed, setEditMed] = useState(null);

  const cavalosPresentes = cavalos.filter(c => c.presente).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  const meusHistorico = (medicoes || [])
    .filter(m => m.cavaloId === cavaloId)
    .sort((a, b) => a.dataRegistro.localeCompare(b.dataRegistro));

  const ultimaMedicao = meusHistorico[meusHistorico.length - 1];
  const penultimaMedicao = meusHistorico[meusHistorico.length - 2];

  const fmtLbl = ds => { const [,m,d] = ds.split('-'); return `${parseInt(d)}/${parseInt(m)}`; };

  const dadosPeso = meusHistorico.filter(m => m.peso != null).map(m => ({ v: Number(m.peso), label: fmtLbl(m.dataRegistro) }));
  const dadosAltura = meusHistorico.filter(m => m.alturaCernelha != null).map(m => ({ v: Number(m.alturaCernelha), label: fmtLbl(m.dataRegistro) }));

  const delta = (campo) => {
    if (!ultimaMedicao?.[campo] || !penultimaMedicao?.[campo]) return null;
    return Number(ultimaMedicao[campo]) - Number(penultimaMedicao[campo]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 20px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 22, padding: 0, cursor: 'pointer', lineHeight: 1 }}>‹</button>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)' }}>Desenvolvimento</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 90px' }}>
        {/* Seletor de animal */}
        <div style={{ marginBottom: 16 }}>
          <select value={cavaloId} onChange={e => { setCavaloId(e.target.value); setShowForm(false); setEditMed(null); }} style={{ ...inputSt, fontSize: 14 }}>
            <option value="">— Selecionar animal —</option>
            {cavalosPresentes.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        {/* Visão geral quando nenhum animal selecionado */}
        {!cavaloId && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 10 }}>
              Última medição por animal
            </div>
            {cavalosPresentes.map(c => {
              const hist = (medicoes || []).filter(m => m.cavaloId === c.id).sort((a,b) => b.dataRegistro.localeCompare(a.dataRegistro));
              const ult = hist[0];
              return (
                <button key={c.id} onClick={() => setCavaloId(c.id)} style={{ width: '100%', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 13, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fef3c7', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon name="bar-chart" size={20} color={COR_DESENV} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{c.nome}</div>
                    {ult ? (
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                        {fmtDate(ult.dataRegistro)}
                        {ult.peso != null ? ` · ${ult.peso} kg` : ''}
                        {ult.alturaCernelha != null ? ` · ${ult.alturaCernelha} cm` : ''}
                        {` · ${hist.length} medição${hist.length > 1 ? 'ões' : ''}`}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Sem medições</div>
                    )}
                  </div>
                  <span style={{ fontSize: 16, color: 'var(--ink-3)' }}>›</span>
                </button>
              );
            })}
            {cavalosPresentes.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 14 }}>Nenhum animal presente.</div>}
          </>
        )}

        {cavaloId && (
          <>
            {/* Última medição — resumo principal */}
            {ultimaMedicao && (
              <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: COR_DESENV, marginBottom: 10 }}>
                  Última medição · {fmtDate(ultimaMedicao.dataRegistro)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  {ultimaMedicao.peso != null && (
                    <div style={{ background: COR_PESO+'12', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: COR_PESO }}>{ultimaMedicao.peso}<span style={{ fontSize: 12, fontWeight: 400 }}> kg</span></div>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>Peso</div>
                      {delta('peso') !== null && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: delta('peso') >= 0 ? '#15803d' : '#dc2626', marginTop: 2 }}>
                          {delta('peso') >= 0 ? '+' : ''}{delta('peso').toFixed(1)} kg vs. anterior
                        </div>
                      )}
                    </div>
                  )}
                  {ultimaMedicao.alturaCernelha != null && (
                    <div style={{ background: COR_ALTURA+'12', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: COR_ALTURA }}>{ultimaMedicao.alturaCernelha}<span style={{ fontSize: 12, fontWeight: 400 }}> cm</span></div>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>Altura cernelha</div>
                      {delta('alturaCernelha') !== null && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: delta('alturaCernelha') >= 0 ? '#15803d' : '#dc2626', marginTop: 2 }}>
                          {delta('alturaCernelha') >= 0 ? '+' : ''}{delta('alturaCernelha').toFixed(1)} cm vs. anterior
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 10, color: '#b45309', fontStyle: 'italic' }}>
                  Peso e altura alimentam o Relatório Veterinário do mês.
                </div>
              </div>
            )}

            {/* Gráficos de crescimento */}
            {(dadosPeso.length >= 2 || dadosAltura.length >= 2) && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-3)', marginBottom: 12 }}>
                  Curva de crescimento
                </div>
                {dadosPeso.length >= 2 && (
                  <div style={{ marginBottom: 16 }}>
                    <MiniLineChart dados={dadosPeso} cor={COR_PESO} unidade="kg" titulo="Peso (kg)" />
                  </div>
                )}
                {dadosAltura.length >= 2 && (
                  <MiniLineChart dados={dadosAltura} cor={COR_ALTURA} unidade="cm" titulo="Altura na Cernelha (cm)" />
                )}
              </div>
            )}

            {/* Botão nova medição */}
            {!showForm && (
              <button onClick={() => { setEditMed(null); setShowForm(true); }} style={{ width: '100%', background: 'var(--accent-soft)', border: '1px dashed var(--accent)', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, color: 'var(--accent)', marginBottom: 14, fontFamily: 'var(--sans)' }}>
                + Nova medição
              </button>
            )}

            {/* Formulário */}
            {showForm && (
              <MedicaoForm
                initial={editMed}
                onSave={data => {
                  if (editMed) updateMedicao(editMed.id, data);
                  else addMedicao({ id: 'med_'+Date.now(), cavaloId, ...data, registradoPor: currentUser?.nome||'' });
                  setShowForm(false); setEditMed(null);
                }}
                onCancel={() => { setShowForm(false); setEditMed(null); }}
              />
            )}

            {/* Histórico */}
            {meusHistorico.length === 0 && !showForm && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 14 }}>Nenhuma medição registrada.</div>
            )}
            {[...meusHistorico].reverse().map(med => (
              <div key={med.id} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COR_DESENV }}>{fmtDate(med.dataRegistro)}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setEditMed(med); setShowForm(true); }} style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 8, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--sans)', color: 'var(--ink)' }}>Editar</button>
                    <button onClick={() => { if (window.confirm('Excluir medição?')) deleteMedicao(med.id); }} style={{ background: '#fef2f2', border: 'none', borderRadius: 8, padding: '3px 8px', cursor: 'pointer' }}><Icon name="x" size={12} color="#dc2626" /></button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CAMPOS_MEDICAO.filter(c => med[c.id] != null && med[c.id] !== '').map(c => (
                    <MedicaoChip key={c.id} label={c.label} valor={`${med[c.id]}${c.unidade ? ' '+c.unidade : ''}`} destaque={c.grupo === 'principal'} />
                  ))}
                </div>
                {med.observacoes && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8, fontStyle: 'italic' }}>{med.observacoes}</div>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function MedicaoChip({ label, valor, destaque }) {
  return (
    <div style={{ background: destaque ? '#fef3c7' : 'var(--soft)', borderRadius: 8, padding: '4px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: destaque ? '1px solid #fcd34d' : 'none' }}>
      <span style={{ fontSize: 9, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: destaque ? COR_DESENV : 'var(--ink)' }}>{valor}</span>
    </div>
  );
}

function MedicaoForm({ initial, onSave, onCancel }) {
  const toStr = v => v != null ? String(v) : '';
  const [dataRegistro, setDataRegistro] = useState(initial?.dataRegistro || todayStr());
  const [vals, setVals] = useState(() => {
    const o = {};
    CAMPOS_MEDICAO.forEach(c => { o[c.id] = toStr(initial?.[c.id]); });
    return o;
  });
  const [observacoes, setObservacoes] = useState(initial?.observacoes || '');
  const setVal = (id, v) => setVals(prev => ({ ...prev, [id]: v }));
  const toNum = v => v !== '' && v != null ? Number(v) : undefined;
  const canSave = dataRegistro && CAMPOS_MEDICAO.some(c => vals[c.id] !== '');

  const GRUPOS = [
    { id: 'principal', label: 'Biometria Principal', desc: 'Alimentam gráfico e Relatório Veterinário' },
    { id: 'perimetros', label: 'Perímetros' },
    { id: 'gordura', label: 'Escore de Gordura' },
  ];

  return (
    <div style={{ background: 'var(--soft)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>
        {initial ? 'Editar medição' : 'Nova medição biométrica'}
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Data do registro *</div>
        <input type="date" value={dataRegistro} onChange={e => setDataRegistro(e.target.value)} style={inputSt} />
      </div>
      {GRUPOS.map(grupo => {
        const campos = CAMPOS_MEDICAO.filter(c => c.grupo === grupo.id);
        return (
          <div key={grupo.id} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: grupo.id === 'principal' ? COR_DESENV : 'var(--ink-3)', marginBottom: grupo.desc ? 2 : 8 }}>
              {grupo.label}
            </div>
            {grupo.desc && <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 8 }}>{grupo.desc}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {campos.map(c => (
                <div key={c.id}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>{c.label}{c.unidade ? ` (${c.unidade})` : ''}</div>
                  <input
                    type="number" min="0" step="0.1"
                    value={vals[c.id]}
                    onChange={e => setVal(c.id, e.target.value)}
                    style={{ ...inputSt, padding: '9px 11px', fontSize: 14 }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Observações</div>
        <input value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Ex: Crescimento acelerado após desmame…" style={inputSt} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', fontSize: 14, fontFamily: 'var(--sans)' }}>Cancelar</button>
        <button disabled={!canSave} onClick={() => {
          const data = { dataRegistro, observacoes };
          CAMPOS_MEDICAO.forEach(c => { data[c.id] = toNum(vals[c.id]); });
          onSave(data);
        }} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: canSave ? COR_DESENV : 'var(--soft)', color: canSave ? '#fff' : 'var(--ink-3)', fontSize: 14, fontWeight: 700, fontFamily: 'var(--sans)' }}>
          Salvar medição
        </button>
      </div>
    </div>
  );
}
