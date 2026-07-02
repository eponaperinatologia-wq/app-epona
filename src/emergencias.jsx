// emergencias.jsx — Área de Emergências veterinárias
// Fase 3: lista, criar/encerrar/reabrir, observação urgente sempre visível.
// Medicações, parâmetros, notas e exames virão nas próximas fases.

import React, { useState, useMemo } from 'react';
import { Icon } from './icons';
import { TopBar } from './screens';
import { addDescartaveis } from './data';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const fmtDataHora = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};
const fmtData = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const diasDesde = (iso) => {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
};

// ─────────────────────────────────────────────────────────────
// COBRANÇA: helpers reutilizáveis pelas 3 telas (medicações, cronograma
// individual, cronograma central). Reutilizam pipeline addRegistro/
// addProcedimento existentes — nunca refazem regra de fatura.
//
// Regras (recap):
//   por_uso: addRegistro(qtd=doseQtd). Se injetável, addDescartaveis 1×.
//   frasco_ao_abrir: reutiliza frasco aberto do (cavalo, insumo) se válido +
//     tem capacidade. Se sim → só soma consumido, custo 0. Se não → abre
//     frasco novo cobrando qtd=capacidade (opção A). Independente disso, se
//     o insumo é injetável, cobra descartáveis 1× por dose.
//   Cancelar/editar antes de feito NÃO cobra. Desmarcar feito remove todos
//     os registros criados.
// ─────────────────────────────────────────────────────────────
async function marcarMedicacaoFeita({
  m, emergencia, insumos, servicos, frascosAbertos,
  addRegistro, addProcedimento, addAtividade,
  updateEmergMedicacao, addFrascoAberto, updateFrascoAberto,
  currentUser,
}) {
  if (!m || m.status === 'feito') return;
  const usuario = currentUser?.nome || '';
  const hora = new Date().toTimeString().slice(0, 5);

  if (m.insumoId) {
    const insumo = insumos.find(i => i.id === m.insumoId);
    const doseQtd = Number(m.doseQtd) || 1;
    const usaFrasco = insumo?.formaCobranca === 'frasco_ao_abrir' && insumo?.capacidadePorFrasco > 0;
    const injetavel = !!(insumo?.injetavel && insumo?.descartaveis?.length);

    // Descartáveis: SEMPRE cobrados por dose se o insumo for injetável
    // (tanto no fluxo por_uso quanto no frasco).
    const descartaveisRegistros = injetavel
      ? addDescartaveis(addRegistro, m.insumoId, emergencia.cavaloId, 1, insumos, hora, usuario, m.data)
      : [];

    if (usaFrasco) {
      await _marcarFeitoComFrasco({
        m, insumo, doseQtd, hora, usuario, descartaveisRegistros,
        emergencia, frascosAbertos, addRegistro, addAtividade,
        updateEmergMedicacao, addFrascoAberto, updateFrascoAberto,
      });
      return;
    }

    // Fluxo por_uso normal: cobra a dose × valorVenda
    const rid = 'reg_emg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    addRegistro({
      id: rid, cavaloId: emergencia.cavaloId, insumoId: m.insumoId,
      qtd: doseQtd, hora, data: m.data, usuario, isAuto: false,
    });
    addAtividade && addAtividade({
      id: 'at_' + rid, tipo: 'insumo', cavaloId: emergencia.cavaloId,
      insumoId: m.insumoId, qtd: doseQtd,
      motivo: `Emergência: ${emergencia.titulo}`, usuario, autor: usuario,
      mes: m.data.slice(0, 7), data: m.data, hora, texto: '',
    });
    await updateEmergMedicacao(m.id, {
      status: 'feito', feitoEm: new Date().toISOString(), feitoPor: usuario,
      registroId: rid, descartaveisRegistros,
    });
    return;
  }

  if (m.servicoId) {
    const sv = servicos.find(s => s.id === m.servicoId);
    const pid = 'proc_emg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    // Insumos adicionais que o usuário incluiu no form (ex.: soros, vitaminas)
    const insAdics = (m.insumosAdicionais || [])
      .filter(a => a.insumoId && Number(a.qtd) > 0)
      .map(a => ({ insumoId: a.insumoId, qtd: Number(a.qtd) }));
    let total = sv?.valor || 0;
    (sv?.descartaveisObrigatorios || []).forEach(d => {
      const ins = insumos.find(i => i.id === d.insumoId);
      total += (ins?.valorVenda || 0) * d.qtd;
    });
    insAdics.forEach(a => {
      const ins = insumos.find(i => i.id === a.insumoId);
      total += (ins?.valorVenda || 0) * a.qtd;
    });
    addProcedimento({
      id: pid, cavaloId: emergencia.cavaloId, servicoId: m.servicoId,
      valorServico: sv?.valor || 0, total,
      descartaveisObrigatorios: sv?.descartaveisObrigatorios || [],
      insumosAdicionais: insAdics,
      motoboy: { ativo: false, valor: 0, nome: '' },
      laboratorio: '', tubosSelecionados: [], examesSelecionados: [],
      hora, nota: `Emergência: ${emergencia.titulo}`, data: m.data,
    });
    const detalheInsAdics = insAdics.length > 0
      ? ` (+ ${insAdics.length} insumo${insAdics.length > 1 ? 's' : ''})`
      : '';
    addAtividade && addAtividade({
      id: 'at_' + pid, tipo: 'procedimento', cavaloId: emergencia.cavaloId,
      insumoId: null, qtd: null,
      motivo: `Emergência: ${emergencia.titulo} — ${sv?.nome || ''}${detalheInsAdics}`,
      usuario, autor: usuario, mes: m.data.slice(0, 7),
      data: m.data, hora, texto: '',
    });
    await updateEmergMedicacao(m.id, {
      status: 'feito', feitoEm: new Date().toISOString(), feitoPor: usuario, procedimentoId: pid,
    });
  }
}

async function _marcarFeitoComFrasco({
  m, insumo, doseQtd, hora, usuario, descartaveisRegistros,
  emergencia, frascosAbertos, addRegistro, addAtividade,
  updateEmergMedicacao, addFrascoAberto, updateFrascoAberto,
}) {
  const agora = new Date();
  const agoraIso = agora.toISOString();
  const capacidade = Number(insumo.capacidadePorFrasco);
  const validadeDias = Number(insumo.validadeAposAbertaDias) || 5;

  // 1) tenta reutilizar frasco aberto válido e com capacidade
  const validos = frascosAbertos
    .filter(f =>
      f.cavaloId === emergencia.cavaloId &&
      f.insumoId === m.insumoId &&
      new Date(f.validoAte) >= agora &&
      (Number(f.consumido) + doseQtd) <= Number(f.capacidade)
    )
    .sort((a, b) => (a.validoAte || '').localeCompare(b.validoAte || ''));

  if (validos.length > 0) {
    const frasco = validos[0];
    const novoConsumido = Number(frasco.consumido) + doseQtd;
    await updateFrascoAberto(frasco.id, { consumido: novoConsumido });
    addAtividade && addAtividade({
      id: 'at_frs_' + Date.now(), tipo: 'insumo', cavaloId: emergencia.cavaloId,
      insumoId: m.insumoId, qtd: doseQtd,
      motivo: `Emergência: ${emergencia.titulo} · dose do frasco em uso (não cobra medicamento)`,
      usuario, autor: usuario, mes: m.data.slice(0, 7), data: m.data, hora, texto: '',
    });
    await updateEmergMedicacao(m.id, {
      status: 'feito', feitoEm: agoraIso, feitoPor: usuario,
      frascoId: frasco.id, descartaveisRegistros,
    });
    return;
  }

  // 2) sem frasco válido — abre novo(s) frasco(s)
  const frascosNecessarios = Math.max(1, Math.ceil(doseQtd / capacidade));
  let ultimoFrascoId = null;
  let doseRestante = doseQtd;
  for (let i = 0; i < frascosNecessarios; i++) {
    const consumoNesse = Math.min(doseRestante, capacidade);
    doseRestante -= consumoNesse;
    const validoAteMs = agora.getTime() + validadeDias * 86400000;
    const validoAte = new Date(validoAteMs).toISOString();
    const rid = 'reg_emg_frs_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 4);
    addRegistro({
      id: rid, cavaloId: emergencia.cavaloId, insumoId: m.insumoId,
      qtd: capacidade, hora, data: m.data, usuario, isAuto: false,
    });
    addAtividade && addAtividade({
      id: 'at_' + rid, tipo: 'insumo', cavaloId: emergencia.cavaloId,
      insumoId: m.insumoId, qtd: capacidade,
      motivo: `Emergência: ${emergencia.titulo} · frasco aberto (válido até ${new Date(validoAte).toLocaleDateString('pt-BR')})`,
      usuario, autor: usuario, mes: m.data.slice(0, 7), data: m.data, hora, texto: '',
    });
    const novoFrasco = await addFrascoAberto({
      insumoId: m.insumoId, cavaloId: emergencia.cavaloId, emergenciaId: emergencia.id,
      abertoEm: agoraIso, validoAte, capacidade,
      consumido: consumoNesse,
      valorCobrado: (Number(insumo.valorVenda) || 0) * capacidade,
      registroId: rid,
    });
    if (novoFrasco?.id) ultimoFrascoId = novoFrasco.id;
  }
  await updateEmergMedicacao(m.id, {
    status: 'feito', feitoEm: agoraIso, feitoPor: usuario,
    frascoId: ultimoFrascoId, descartaveisRegistros,
  });
}

// ─────────────────────────────────────────────────────────────
// UI reutilizável: Acordeão de seção
// ─────────────────────────────────────────────────────────────
function SecaoAccordion({ titulo, icone, cor, contador, defaultOpen = false, children, acao }) {
  const [aberto, setAberto] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 10, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: aberto ? '1px solid var(--line)' : 'none' }}>
        <button
          onClick={() => setAberto(v => !v)}
          style={{ flex: 1, background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: 0 }}
        >
          <span style={{ width: 28, height: 28, borderRadius: 8, background: cor + '22', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Icon name={icone} size={15} color={cor} />
          </span>
          <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{titulo}</span>
          {contador != null && contador > 0 && (
            <span style={{ background: cor + '18', color: cor, borderRadius: 10, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
              {contador}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--ink-3)', transform: aberto ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', marginLeft: 4 }}>▸</span>
        </button>
        {acao}
      </div>
      {aberto && (
        <div style={{ padding: '10px 12px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// UI reutilizável: navegação horizontal por dias
// Recebe lista de itens (cada um com .dataHora), agrupa por dia, mostra abas
// e passa itens do dia selecionado pra render.
// ─────────────────────────────────────────────────────────────
function NavegacaoDias({ itens, itemsPorDia, renderItem, emptyText = 'Nada pendente.', destacaAtrasado = false }) {
  const dias = itemsPorDia || useMemo(() => {
    const map = new Map();
    (itens || []).forEach(it => {
      const dia = (it.dataHora || '').slice(0, 10);
      if (!dia) return;
      if (!map.has(dia)) map.set(dia, []);
      map.get(dia).push(it);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [itens]);

  const hoje = _fmtDataLocal(new Date());
  const idxInicial = dias.findIndex(([d]) => d >= hoje);
  const [diaIdx, setDiaIdx] = useState(idxInicial >= 0 ? idxInicial : 0);

  if (dias.length === 0) {
    return (
      <div style={{ background: 'var(--soft)', border: '1px dashed var(--line)', borderRadius: 10, padding: '12px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>
        {emptyText}
      </div>
    );
  }

  const idxAtual = Math.min(Math.max(diaIdx, 0), dias.length - 1);
  const [diaSel, itensSel] = dias[idxAtual];
  const atrasadosNoDia = destacaAtrasado
    ? itensSel.filter(it => new Date(it.dataHora) < new Date()).length
    : 0;

  return (
    <div>
      {/* Abas horizontais de dias */}
      <div style={{ display: 'flex', overflowX: 'auto', gap: 6, marginBottom: 10, paddingBottom: 3, WebkitOverflowScrolling: 'touch' }}>
        {dias.map(([d, lista], i) => {
          const eHoje = d === hoje;
          const ativa = i === idxAtual;
          const [ano, mes, dia] = d.split('-');
          const dow = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][new Date(d + 'T12:00:00').getDay()];
          const atrasados = destacaAtrasado ? lista.filter(it => new Date(it.dataHora) < new Date()).length : 0;
          return (
            <button
              key={d}
              onClick={() => setDiaIdx(i)}
              style={{
                flexShrink: 0, minWidth: 54,
                background: ativa ? 'var(--accent)' : eHoje ? 'var(--accent-soft)' : 'var(--card)',
                color: ativa ? '#fff' : 'var(--ink)',
                border: `1px solid ${ativa ? 'var(--accent)' : eHoje ? 'var(--accent)' : 'var(--line)'}`,
                borderRadius: 10, padding: '6px 8px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                cursor: 'pointer', fontFamily: 'var(--sans)', position: 'relative',
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, opacity: ativa ? 0.85 : 0.6, letterSpacing: '0.05em' }}>{dow}</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, lineHeight: 1, fontWeight: 500 }}>{parseInt(dia)}</div>
              <div style={{ fontSize: 8, opacity: ativa ? 0.7 : 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][parseInt(mes) - 1]}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: ativa ? '#fff' : 'var(--ink-3)', marginTop: 2, padding: '0 4px', background: ativa ? 'rgba(255,255,255,0.2)' : 'var(--soft)', borderRadius: 4 }}>
                {lista.length}
              </div>
              {atrasados > 0 && !ativa && (
                <div style={{ position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: 12, background: '#dc2626', border: '2px solid var(--card)' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Itens do dia selecionado */}
      <div>
        {atrasadosNoDia > 0 && (
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7f1d1d', marginBottom: 6 }}>
            ⚠ {atrasadosNoDia} atrasado{atrasadosNoDia > 1 ? 's' : ''}
          </div>
        )}
        {itensSel
          .sort((a, b) => (a.dataHora || '').localeCompare(b.dataHora || ''))
          .map(it => renderItem(it))}
      </div>
    </div>
  );
}

async function desmarcarMedicacaoFeita({
  m, frascosAbertos,
  deleteRegistro, deleteProcedimento,
  updateEmergMedicacao, updateFrascoAberto,
}) {
  if (!m || m.status !== 'feito') return;
  if (!window.confirm('Desfazer? Isso remove as cobranças (medicamento e descartáveis) da fatura.')) return;

  // Serviço/procedimento
  if (m.procedimentoId) { try { deleteProcedimento && deleteProcedimento(m.procedimentoId); } catch (e) { console.error(e); } }

  // Descartáveis criados (agulha, seringa, algodão) — sempre remove
  (m.descartaveisRegistros || []).forEach(d => {
    try { deleteRegistro && deleteRegistro(d.registroId); } catch (e) { console.error(e); }
  });

  // Insumo com frasco: 2 cenários
  if (m.frascoId) {
    const frasco = frascosAbertos.find(f => f.id === m.frascoId);
    if (frasco) {
      if (frasco.registroId && frasco.registroId === m.registroId) {
        try { deleteRegistro && deleteRegistro(m.registroId); } catch (e) { console.error(e); }
        try { updateFrascoAberto && updateFrascoAberto(frasco.id, { consumido: 0 }); } catch (e) {}
      } else {
        const novoConsumido = Math.max(0, Number(frasco.consumido) - Number(m.doseQtd || 0));
        try { updateFrascoAberto && updateFrascoAberto(frasco.id, { consumido: novoConsumido }); } catch (e) {}
      }
    }
  } else if (m.registroId) {
    try { deleteRegistro && deleteRegistro(m.registroId); } catch (e) { console.error(e); }
  }

  await updateEmergMedicacao(m.id, {
    status: 'programado', feitoEm: null, feitoPor: '',
    registroId: null, procedimentoId: null, frascoId: null, descartaveisRegistros: [],
  });
}

// ─────────────────────────────────────────────────────────────
// TELA PRINCIPAL — lista com ativas / encerradas
// ─────────────────────────────────────────────────────────────
export function EmergenciasScreen({
  cavalos = [], currentUser, onBack,
  emergencias = [], emergMedicacoes = [], emergAgendas = [], emergParametros = [], emergNotas = [], emergExames = [],
  addEmergencia, updateEmergencia, encerrarEmergencia, deleteEmergencia,
  addEmergMedicacao, updateEmergMedicacao, deleteEmergMedicacao,
  addEmergAgenda, updateEmergAgenda, deleteEmergAgenda,
  addEmergParametro, updateEmergParametro, deleteEmergParametro,
  addEmergNota, updateEmergNota, deleteEmergNota,
  uploadEmergExame, deleteEmergExame,
  insumos = [], servicos = [],
  // Passados adiante pra cobrança via pipeline existente:
  addRegistro, deleteRegistro, addProcedimento, deleteProcedimento, addAtividade,
  // Frascos (Fase 5)
  frascosAbertos = [], addFrascoAberto, updateFrascoAberto,
}) {
  const [showForm, setShowForm] = useState(false);
  const [fichaId, setFichaId] = useState(null);
  const [mostraEncerradas, setMostraEncerradas] = useState(false);

  const ativas = useMemo(
    () => emergencias.filter(e => e.status === 'ativa').sort((a, b) => (b.abertaEm || '').localeCompare(a.abertaEm || '')),
    [emergencias]
  );
  const encerradas = useMemo(
    () => emergencias.filter(e => e.status === 'encerrada').sort((a, b) => (b.encerradaEm || '').localeCompare(a.encerradaEm || '')),
    [emergencias]
  );

  // Se estamos na ficha, renderiza a ficha
  if (fichaId) {
    const emerg = emergencias.find(e => e.id === fichaId);
    if (!emerg) { setFichaId(null); return null; }
    return (
      <EmergenciaFicha
        key={`ef_${fichaId}`}
        emergencia={emerg}
        cavalos={cavalos}
        currentUser={currentUser}
        insumos={insumos}
        servicos={servicos}
        emergMedicacoes={emergMedicacoes.filter(m => m.emergenciaId === fichaId)}
        emergAgendas={emergAgendas.filter(a => a.emergenciaId === fichaId)}
        emergParametros={emergParametros.filter(p => p.emergenciaId === fichaId)}
        emergNotas={emergNotas.filter(n => n.emergenciaId === fichaId)}
        emergExames={emergExames.filter(e => e.emergenciaId === fichaId)}
        updateEmergencia={updateEmergencia}
        encerrarEmergencia={encerrarEmergencia}
        deleteEmergencia={deleteEmergencia}
        addEmergMedicacao={addEmergMedicacao}
        updateEmergMedicacao={updateEmergMedicacao}
        deleteEmergMedicacao={deleteEmergMedicacao}
        addEmergAgenda={addEmergAgenda}
        updateEmergAgenda={updateEmergAgenda}
        deleteEmergAgenda={deleteEmergAgenda}
        addEmergParametro={addEmergParametro}
        updateEmergParametro={updateEmergParametro}
        deleteEmergParametro={deleteEmergParametro}
        addEmergNota={addEmergNota}
        updateEmergNota={updateEmergNota}
        deleteEmergNota={deleteEmergNota}
        uploadEmergExame={uploadEmergExame}
        deleteEmergExame={deleteEmergExame}
        addRegistro={addRegistro}
        deleteRegistro={deleteRegistro}
        addProcedimento={addProcedimento}
        deleteProcedimento={deleteProcedimento}
        addAtividade={addAtividade}
        frascosAbertos={frascosAbertos}
        addFrascoAberto={addFrascoAberto}
        updateFrascoAberto={updateFrascoAberto}
        onBack={() => setFichaId(null)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 22, padding: 0, cursor: 'pointer', lineHeight: 1 }}>‹</button>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', flex: 1 }}>Emergências</div>
          <button onClick={() => setShowForm(true)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)', cursor: 'pointer' }}>+ Nova</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 90px' }}>
        {showForm && (
          <NovaEmergenciaForm
            cavalos={cavalos.filter(c => c.presente)}
            onCancel={() => setShowForm(false)}
            onSave={async (data) => {
              const id = await addEmergencia(data);
              setShowForm(false);
              if (id) setFichaId(id);
            }}
          />
        )}

        {/* Cronograma central — agregação de tudo pendente de emergências ativas */}
        {!showForm && ativas.length > 0 && (
          <CronogramaCentral
            emergencias={ativas}
            cavalos={cavalos}
            insumos={insumos}
            servicos={servicos}
            emergMedicacoes={emergMedicacoes}
            emergAgendas={emergAgendas}
            emergParametros={emergParametros}
            currentUser={currentUser}
            onOpenFicha={setFichaId}
            addRegistro={addRegistro}
            addProcedimento={addProcedimento}
            addAtividade={addAtividade}
            updateEmergMedicacao={updateEmergMedicacao}
            addEmergParametro={addEmergParametro}
            frascosAbertos={frascosAbertos}
            addFrascoAberto={addFrascoAberto}
            updateFrascoAberto={updateFrascoAberto}
          />
        )}

        {/* Bloco Ativas */}
        {!showForm && (
          <>
            <SectionHeader
              titulo="Ativas"
              cor="#dc2626"
              badge={ativas.length}
            />
            {ativas.length === 0 ? (
              <div style={{ background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 12, padding: '18px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, marginBottom: 20 }}>
                Nenhuma emergência ativa.
              </div>
            ) : (
              <div style={{ marginBottom: 22 }}>
                {ativas.map(e => (
                  <EmergenciaCard
                    key={e.id}
                    emergencia={e}
                    cavalo={cavalos.find(c => c.id === e.cavaloId)}
                    onOpen={() => setFichaId(e.id)}
                  />
                ))}
              </div>
            )}

            {/* Bloco Encerradas — colapsado */}
            {encerradas.length > 0 && (
              <>
                <button
                  onClick={() => setMostraEncerradas(v => !v)}
                  style={{
                    width: '100%', background: 'none', border: 'none', padding: '4px 0 10px',
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    fontFamily: 'var(--sans)', color: 'var(--ink-2)',
                  }}
                >
                  <span style={{ fontSize: 12, transform: mostraEncerradas ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▸</span>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)' }}>
                    Encerradas
                  </span>
                  <span style={{ background: 'var(--soft)', color: 'var(--ink-3)', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
                    {encerradas.length}
                  </span>
                </button>
                {mostraEncerradas && encerradas.map(e => (
                  <EmergenciaCard
                    key={e.id}
                    emergencia={e}
                    cavalo={cavalos.find(c => c.id === e.cavaloId)}
                    onOpen={() => setFichaId(e.id)}
                    dim
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Card de emergência na lista
// ─────────────────────────────────────────────────────────────
function EmergenciaCard({ emergencia: e, cavalo, onOpen, dim }) {
  const cor = e.status === 'ativa' ? '#dc2626' : '#6b7280';
  const dias = diasDesde(e.abertaEm);
  return (
    <button
      onClick={onOpen}
      style={{
        width: '100%', textAlign: 'left',
        background: 'var(--card)', border: `1px solid ${dim ? 'var(--line)' : cor + '55'}`,
        borderLeft: `4px solid ${cor}`, borderRadius: 12, padding: '12px 14px',
        marginBottom: 8, cursor: 'pointer', color: 'var(--ink)', opacity: dim ? 0.7 : 1,
        fontFamily: 'var(--sans)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>
          {cavalo?.nome || '—'}
          {cavalo?.baia && (
            <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--sans)', fontWeight: 500, background: 'var(--soft)', borderRadius: 4, padding: '1px 6px', marginLeft: 6, letterSpacing: '0.04em' }}>
              {cavalo.baia}
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: cor, background: cor + '18', borderRadius: 6, padding: '2px 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {e.status === 'ativa' ? 'Ativa' : 'Encerrada'}
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600, marginBottom: 3 }}>{e.titulo}</div>
      {e.motivo && (
        <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 4, lineHeight: 1.4 }}>{e.motivo}</div>
      )}
      {e.observacaoUrgente && (
        <div style={{ fontSize: 11, color: '#991b1b', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 8px', marginTop: 6, lineHeight: 1.4 }}>
          ⚠️ {e.observacaoUrgente}
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 5 }}>
        Aberta em {fmtData(e.abertaEm)}
        {e.status === 'ativa' && dias >= 0 && ` · ${dias === 0 ? 'hoje' : `${dias} dia${dias > 1 ? 's' : ''} em cuidado`}`}
        {e.status === 'encerrada' && e.encerradaEm && ` · encerrada em ${fmtData(e.encerradaEm)}`}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Cabeçalho de seção
// ─────────────────────────────────────────────────────────────
function SectionHeader({ titulo, cor, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: cor }}>
        {titulo}
      </span>
      {badge != null && (
        <span style={{ background: cor + '18', color: cor, borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Form: nova emergência
// ─────────────────────────────────────────────────────────────
function NovaEmergenciaForm({ cavalos, onCancel, onSave }) {
  const [cavaloId, setCavaloId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacaoUrgente, setObservacaoUrgente] = useState('');
  const [busca, setBusca] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = cavaloId && titulo.trim() && !saving;
  const cavalosOrd = [...cavalos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  const cavalosFiltrados = busca.trim()
    ? cavalosOrd.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()))
    : cavalosOrd;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ cavaloId, titulo: titulo.trim(), motivo: motivo.trim(), observacaoUrgente: observacaoUrgente.trim() });
    } finally {
      setSaving(false);
    }
  };

  const inputSt = {
    width: '100%', padding: '10px 12px', border: '1px solid var(--line)',
    borderRadius: 10, background: 'var(--card)', fontSize: 14,
    color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px', marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 17, marginBottom: 12, color: 'var(--ink)' }}>Nova emergência</div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Animal</div>
        {cavaloId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 12px' }}>
            <span style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600, flex: 1 }}>
              {cavalos.find(c => c.id === cavaloId)?.nome}
            </span>
            <button onClick={() => setCavaloId('')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 18, cursor: 'pointer', padding: 0 }}>×</button>
          </div>
        ) : (
          <>
            <input
              value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome…"
              style={{ ...inputSt, marginBottom: 6 }}
            />
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--card)' }}>
              {cavalosFiltrados.length === 0 ? (
                <div style={{ padding: 10, fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>Nenhum animal encontrado</div>
              ) : cavalosFiltrados.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCavaloId(c.id); setBusca(''); }}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', padding: '9px 12px', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)' }}
                >
                  {c.nome}
                  {c.baia && <span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 8 }}>· {c.baia}</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Título *</div>
        <input
          value={titulo} onChange={e => setTitulo(e.target.value)}
          placeholder="Ex: Cólica com refluxo · Laminite aguda"
          style={inputSt}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Motivo / história inicial</div>
        <textarea
          value={motivo} onChange={e => setMotivo(e.target.value)}
          placeholder="Contexto, sintomas iniciais, decisão de manejo…"
          rows={3}
          style={{ ...inputSt, resize: 'vertical', minHeight: 60, fontFamily: 'var(--sans)' }}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, fontWeight: 700 }}>⚠ Observação urgente (opcional)</div>
        <textarea
          value={observacaoUrgente} onChange={e => setObservacaoUrgente(e.target.value)}
          placeholder="Ex: Não pode fazer sombra ao insulinar · Aguarda retorno do exame ABC"
          rows={2}
          style={{ ...inputSt, resize: 'vertical', minHeight: 50, background: '#fee2e2', borderColor: '#fecaca', fontFamily: 'var(--sans)' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer' }}
        >Cancelar</button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            flex: 2, background: canSave ? '#dc2626' : 'var(--soft)',
            border: 'none', color: canSave ? '#fff' : 'var(--ink-3)',
            borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700,
            fontFamily: 'var(--sans)', cursor: canSave ? 'pointer' : 'default',
          }}
        >Abrir emergência</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FICHA — detalhe de uma emergência
// ─────────────────────────────────────────────────────────────
function EmergenciaFicha({
  emergencia, cavalos, currentUser, insumos = [], servicos = [],
  emergMedicacoes, emergAgendas, emergParametros, emergNotas, emergExames,
  updateEmergencia, encerrarEmergencia, deleteEmergencia,
  addEmergMedicacao, updateEmergMedicacao, deleteEmergMedicacao,
  addEmergAgenda, updateEmergAgenda, deleteEmergAgenda,
  addEmergParametro, updateEmergParametro, deleteEmergParametro,
  addEmergNota, updateEmergNota, deleteEmergNota,
  uploadEmergExame, deleteEmergExame,
  addRegistro, deleteRegistro, addProcedimento, deleteProcedimento, addAtividade,
  frascosAbertos = [], addFrascoAberto, updateFrascoAberto,
  onBack,
}) {
  const cavalo = cavalos.find(c => c.id === emergencia.cavaloId);
  const ativa = emergencia.status === 'ativa';
  const [obsLocal, setObsLocal] = useState(emergencia.observacaoUrgente || '');
  const [obsSalvo, setObsSalvo] = useState(false);

  // Sincroniza com props se realtime trouxer edição de outro usuário
  React.useEffect(() => {
    setObsLocal(emergencia.observacaoUrgente || '');
  }, [emergencia.observacaoUrgente]);

  const salvarObs = async () => {
    if (obsLocal === emergencia.observacaoUrgente) return;
    const ok = await updateEmergencia(emergencia.id, { observacaoUrgente: obsLocal });
    if (ok) {
      setObsSalvo(true);
      setTimeout(() => setObsSalvo(false), 1200);
    }
  };

  const handleEncerrar = async () => {
    if (!window.confirm('Encerrar emergência? Medicações programadas viram "canceladas" e as agendas de parâmetros são desativadas.')) return;
    await encerrarEmergencia(emergencia.id);
  };
  const handleReabrir = async () => {
    if (!window.confirm('Reabrir emergência? Voltará ao status ativa (medicações canceladas continuam canceladas).')) return;
    await updateEmergencia(emergencia.id, { status: 'ativa', encerradaEm: null });
  };
  const handleDelete = async () => {
    if (!window.confirm('EXCLUIR emergência? Isso não pode ser desfeito. Todas as medicações, parâmetros, notas e exames vinculados serão removidos.')) return;
    await deleteEmergencia(emergencia.id);
    onBack();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Cabeçalho fixo */}
      <div style={{ padding: '12px 20px 6px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 22, padding: 0, cursor: 'pointer', lineHeight: 1 }}>‹</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', lineHeight: 1.15 }}>
              {cavalo?.nome || '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
              {emergencia.titulo}
            </div>
          </div>
          <span style={{ fontSize: 11, color: ativa ? '#dc2626' : '#6b7280', background: (ativa ? '#dc2626' : '#6b7280') + '18', borderRadius: 6, padding: '3px 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {ativa ? 'Ativa' : 'Encerrada'}
          </span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>
          Aberta em {fmtDataHora(emergencia.abertaEm)}{emergencia.autorAbertura ? ` por ${emergencia.autorAbertura}` : ''}
          {emergencia.encerradaEm && ` · encerrada em ${fmtDataHora(emergencia.encerradaEm)}`}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 100px' }}>
        {/* Observação urgente — SEMPRE visível, editável em 1 toque */}
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 12px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#991b1b' }}>
              ⚠ Observação urgente
            </span>
            {obsSalvo && (
              <span style={{ fontSize: 10, color: '#15803d', fontWeight: 600 }}>✓ salvo</span>
            )}
          </div>
          <textarea
            value={obsLocal}
            onChange={e => setObsLocal(e.target.value)}
            onBlur={salvarObs}
            placeholder="Toque para escrever. Aparece em destaque na lista de emergências e no topo desta ficha."
            rows={2}
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              resize: 'vertical', minHeight: 42, padding: 0,
              fontSize: 14, color: '#450a0a', fontFamily: 'var(--sans)', lineHeight: 1.45,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Motivo / história inicial */}
        {emergencia.motivo && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '11px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 4 }}>Motivo / história</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{emergencia.motivo}</div>
          </div>
        )}

        {/* Placeholders das seções que virão */}
        {/* Todas as seções em accordions. Cronograma aberto por padrão. */}
        <SecaoAccordion
          titulo="Cronograma do animal"
          icone="clock" cor="#0e7490"
          contador={emergMedicacoes.filter(m => m.status === 'programado').length}
          defaultOpen
        >
          <SecaoCronogramaIndividual
            emergencia={emergencia}
            insumos={insumos}
            servicos={servicos}
            medicacoes={emergMedicacoes}
            agendas={emergAgendas}
            parametros={emergParametros}
            currentUser={currentUser}
            updateEmergMedicacao={updateEmergMedicacao}
            addRegistro={addRegistro}
            addProcedimento={addProcedimento}
            addAtividade={addAtividade}
            frascosAbertos={frascosAbertos}
            addFrascoAberto={addFrascoAberto}
            updateFrascoAberto={updateFrascoAberto}
            addEmergParametro={addEmergParametro}
          />
        </SecaoAccordion>

        <SecaoAccordion
          titulo="Medicações e insumos"
          icone="package" cor="#1d4ed8"
          contador={emergMedicacoes.length}
        >
          <SecaoMedicacoes
            emergencia={emergencia}
            currentUser={currentUser}
            insumos={insumos}
            servicos={servicos}
            medicacoes={emergMedicacoes}
            addEmergMedicacao={addEmergMedicacao}
            updateEmergMedicacao={updateEmergMedicacao}
            deleteEmergMedicacao={deleteEmergMedicacao}
            addRegistro={addRegistro}
            deleteRegistro={deleteRegistro}
            addProcedimento={addProcedimento}
            deleteProcedimento={deleteProcedimento}
            addAtividade={addAtividade}
            frascosAbertos={frascosAbertos}
            addFrascoAberto={addFrascoAberto}
            updateFrascoAberto={updateFrascoAberto}
          />
        </SecaoAccordion>
        <SecaoAccordion
          titulo="Parâmetros solicitados"
          icone="bell" cor="#b45309"
          contador={emergAgendas.filter(a => a.ativo).length}
        >
          <SecaoParametrosSolicitados
            emergencia={emergencia}
            agendas={emergAgendas}
            addEmergAgenda={addEmergAgenda}
            updateEmergAgenda={updateEmergAgenda}
            deleteEmergAgenda={deleteEmergAgenda}
          />
        </SecaoAccordion>

        <SecaoAccordion
          titulo="Parâmetros aferidos"
          icone="bar-chart" cor="#15803d"
          contador={emergParametros.length}
        >
          <SecaoParametrosAferidos
            emergencia={emergencia}
            currentUser={currentUser}
            parametros={emergParametros}
            addEmergParametro={addEmergParametro}
            updateEmergParametro={updateEmergParametro}
            deleteEmergParametro={deleteEmergParametro}
          />
        </SecaoAccordion>

        <SecaoAccordion
          titulo="Observações clínicas"
          icone="edit" cor="#7c3aed"
          contador={emergNotas.length}
        >
          <SecaoNotasClinicas
            emergencia={emergencia}
            currentUser={currentUser}
            notas={emergNotas}
            addEmergNota={addEmergNota}
            updateEmergNota={updateEmergNota}
            deleteEmergNota={deleteEmergNota}
          />
        </SecaoAccordion>

        <SecaoAccordion
          titulo="Exames laboratoriais"
          icone="doc" cor="#0e7490"
          contador={emergExames.length}
        >
          <SecaoExames
            emergencia={emergencia}
            currentUser={currentUser}
            exames={emergExames}
            uploadEmergExame={uploadEmergExame}
            deleteEmergExame={deleteEmergExame}
          />
        </SecaoAccordion>

        {/* Copiar resumo — sempre acima das ações de status */}
        <div style={{ marginTop: 22, marginBottom: 8 }}>
          <BotaoCopiarResumo
            emergencia={emergencia}
            cavalo={cavalo}
            insumos={insumos}
            servicos={servicos}
            medicacoes={emergMedicacoes}
            agendas={emergAgendas}
            parametros={emergParametros}
            notas={emergNotas}
            exames={emergExames}
          />
        </div>

        {/* Ações de status — sempre no rodapé */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ativa ? (
            <button
              onClick={handleEncerrar}
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}
            >Encerrar emergência</button>
          ) : (
            <button
              onClick={handleReabrir}
              style={{ background: 'var(--card)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}
            >Reabrir emergência</button>
          )}
          <button
            onClick={handleDelete}
            style={{ background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 12, padding: '11px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}
          >Excluir emergência</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SEÇÃO: Medicações e insumos programados
// ─────────────────────────────────────────────────────────────
// Regra de cobrança (crítica):
//   - programado -> marcar feito -> chama addRegistro/addProcedimento existentes
//   - status feito -> desmarcar -> chama deleteRegistro/deleteProcedimento
//   - cancelado / excluído antes de feito -> NÃO cobra nada
// TODO Fase 5: se insumo.formaCobranca === 'frasco_ao_abrir', usar pipeline de
// frasco. Por ora, cai no fluxo por_uso (comportamento seguro).
// ─────────────────────────────────────────────────────────────
function SecaoMedicacoes({
  emergencia, currentUser, insumos, servicos, medicacoes,
  addEmergMedicacao, updateEmergMedicacao, deleteEmergMedicacao,
  addRegistro, deleteRegistro, addProcedimento, deleteProcedimento, addAtividade,
  frascosAbertos = [], addFrascoAberto, updateFrascoAberto,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null); // id da medicação em edição
  const emergAtiva = emergencia.status === 'ativa';

  // Agrupa por data (asc). Dentro do dia, ordena por hora asc.
  const porDia = useMemo(() => {
    const map = new Map();
    medicacoes.forEach(m => {
      if (!map.has(m.data)) map.set(m.data, []);
      map.get(m.data).push(m);
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, itens]) => ({
        data,
        itens: itens.sort((a, b) => (a.hora || '').localeCompare(b.hora || '')),
      }));
  }, [medicacoes]);

  const findItem = (m) => {
    if (m.insumoId) return { tipo: 'insumo', nome: insumos.find(i => i.id === m.insumoId)?.nome || m.insumoId, unidade: insumos.find(i => i.id === m.insumoId)?.unidade || m.unidade || '' };
    if (m.servicoId) return { tipo: 'servico', nome: servicos.find(s => s.id === m.servicoId)?.nome || m.servicoId, unidade: '' };
    return { tipo: '?', nome: '—', unidade: '' };
  };

  const handleMarcarFeito = (m) => marcarMedicacaoFeita({
    m, emergencia, insumos, servicos, frascosAbertos,
    addRegistro, addProcedimento, addAtividade,
    updateEmergMedicacao, addFrascoAberto, updateFrascoAberto,
    currentUser,
  });

  const handleDesmarcar = (m) => desmarcarMedicacaoFeita({
    m, frascosAbertos,
    deleteRegistro, deleteProcedimento,
    updateEmergMedicacao, updateFrascoAberto,
  });

  const handleCancelar = async (m) => {
    if (m.status === 'feito') return;
    if (!window.confirm('Cancelar esta dose programada?')) return;
    await updateEmergMedicacao(m.id, { status: 'cancelado' });
  };

  const handleReativar = async (m) => {
    if (m.status !== 'cancelado') return;
    await updateEmergMedicacao(m.id, { status: 'programado' });
  };

  const handleExcluir = async (m) => {
    const isAdmin = currentUser?.role === 'admin';
    if (!isAdmin) return;
    if (m.status === 'feito') {
      alert('Não é possível excluir uma dose já feita. Desmarque primeiro.');
      return;
    }
    if (!window.confirm('Excluir esta dose do histórico da emergência? Não pode ser desfeito.')) return;
    deleteEmergMedicacao(m.id);
  };

  const handleEditar = (m) => {
    if (m.status === 'feito') {
      alert('Dose já feita — desmarque antes de editar.');
      return;
    }
    setEditando(m.id);
    setShowForm(true);
  };

  return (
    <div>
      {emergAtiva && !showForm && (
        <button
          onClick={() => { setEditando(null); setShowForm(true); }}
          style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)', marginBottom: 10 }}
        >+ Nova medicação</button>
      )}

      {/* Form inline */}
      {showForm && (
        <MedicacaoForm
          initial={editando ? medicacoes.find(m => m.id === editando) : null}
          insumos={insumos}
          servicos={servicos}
          onCancel={() => { setShowForm(false); setEditando(null); }}
          onSave={async (dadosBase) => {
            if (editando) {
              await updateEmergMedicacao(editando, dadosBase);
            } else {
              // Expansão de recorrência: se recorrência != 'unica', gera N ocorrências.
              const ocorrencias = expandirRecorrencia(dadosBase);
              for (const oc of ocorrencias) {
                await addEmergMedicacao({ ...oc, emergenciaId: emergencia.id });
              }
            }
            setShowForm(false);
            setEditando(null);
          }}
        />
      )}

      {/* Lista agrupada por dia */}
      {!showForm && (
        <>
          {porDia.length === 0 ? (
            <div style={{ background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 10, padding: '14px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>
              Nenhuma medicação programada. {emergAtiva && 'Toque em "+ Nova" para começar.'}
            </div>
          ) : porDia.map(({ data, itens }) => (
            <div key={data} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 4 }}>
                {fmtDataDiaSemana(data)}
              </div>
              {itens.map(m => {
                const item = findItem(m);
                return (
                  <LinhaMedicacao
                    key={m.id}
                    m={m} item={item} emergAtiva={emergAtiva}
                    isAdmin={currentUser?.role === 'admin'}
                    insumos={insumos}
                    onFeito={() => handleMarcarFeito(m)}
                    onDesmarcar={() => handleDesmarcar(m)}
                    onCancelar={() => handleCancelar(m)}
                    onReativar={() => handleReativar(m)}
                    onEditar={() => handleEditar(m)}
                    onExcluir={() => handleExcluir(m)}
                  />
                );
              })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// Uma linha de medicação — estilo compacto, ações contextuais
function LinhaMedicacao({ m, item, emergAtiva, isAdmin, insumos = [], onFeito, onDesmarcar, onCancelar, onReativar, onEditar, onExcluir }) {
  const CFG = {
    programado: { cor: '#1d4ed8', bg: '#1d4ed810', ico: '●', label: 'Prog.' },
    feito:      { cor: '#15803d', bg: '#15803d10', ico: '✓', label: 'Feito' },
    cancelado:  { cor: '#6b7280', bg: '#6b728010', ico: '✕', label: 'Cancel.' },
  };
  const c = CFG[m.status] || CFG.programado;

  return (
    <div style={{
      background: 'var(--card)', border: `1px solid var(--line)`, borderLeft: `3px solid ${c.cor}`,
      borderRadius: 8, padding: '8px 10px', marginBottom: 5,
      display: 'flex', alignItems: 'center', gap: 10,
      opacity: m.status === 'cancelado' ? 0.6 : 1,
    }}>
      <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12, color: 'var(--ink-2)', fontWeight: 700, minWidth: 42 }}>
        {m.hora || '—'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)', textDecoration: m.status === 'cancelado' ? 'line-through' : 'none' }}>
          <b>{m.doseQtd || ''} {item.unidade}</b> {item.nome}
        </div>
        {(m.insumosAdicionais || []).length > 0 && (
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1, lineHeight: 1.4 }}>
            + {m.insumosAdicionais.map((a) => {
              const ins = insumos.find(i => i.id === a.insumoId);
              return `${a.qtd} ${ins?.unidade || 'un'} ${ins?.nome || a.insumoId}`;
            }).join(' · ')}
          </div>
        )}
        {m.recorrencia?.tipo && m.recorrencia.tipo !== 'unica' && (
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>
            ↻ {descreveRecorrencia(m.recorrencia)}
          </div>
        )}
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', color: c.cor, background: c.bg, padding: '2px 6px', borderRadius: 5, textTransform: 'uppercase' }}>
        {c.label}
      </span>
      {emergAtiva && (
        <div style={{ display: 'flex', gap: 3 }}>
          {m.status === 'programado' && (
            <>
              <button onClick={onFeito} title="Marcar feito" style={btnIco('#15803d')}>✓</button>
              <button onClick={onEditar} title="Editar" style={btnIco('#374151')}>✎</button>
              <button onClick={onCancelar} title="Cancelar dose" style={btnIco('#b45309')}>⊘</button>
              {isAdmin && <button onClick={onExcluir} title="Excluir" style={btnIco('#dc2626')}>×</button>}
            </>
          )}
          {m.status === 'feito' && (
            <button onClick={onDesmarcar} title="Desfazer (remove da fatura)" style={btnIco('#dc2626')}>↺</button>
          )}
          {m.status === 'cancelado' && (
            <>
              <button onClick={onReativar} title="Reativar" style={btnIco('#1d4ed8')}>↻</button>
              {isAdmin && <button onClick={onExcluir} title="Excluir" style={btnIco('#dc2626')}>×</button>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const btnIco = (cor) => ({
  width: 26, height: 26, borderRadius: 6,
  background: cor + '15', border: `1px solid ${cor}45`,
  color: cor, cursor: 'pointer', fontSize: 13, fontWeight: 700,
  display: 'grid', placeItems: 'center', fontFamily: 'var(--sans)',
});

// ─────────────────────────────────────────────────────────────
// Form: nova/editar medicação
// ─────────────────────────────────────────────────────────────
function MedicacaoForm({ initial, insumos, servicos, onCancel, onSave }) {
  const isEdit = !!initial;
  const [tipo, setTipo] = useState(initial?.insumoId ? 'insumo' : initial?.servicoId ? 'servico' : 'insumo');
  const [itemId, setItemId] = useState(initial?.insumoId || initial?.servicoId || '');
  const [busca, setBusca] = useState('');
  const [doseQtd, setDoseQtd] = useState(initial?.doseQtd != null ? String(initial.doseQtd) : '');
  const [data, setData] = useState(initial?.data || new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState(initial?.hora || new Date().toTimeString().slice(0, 5));
  const [recType, setRecType] = useState(initial?.recorrencia?.tipo || 'unica');
  const [recValor, setRecValor] = useState(initial?.recorrencia?.valor != null ? String(initial.recorrencia.valor) : '8');
  const [recAte, setRecAte] = useState(initial?.recorrencia?.ate || '');
  // Insumos adicionais só valem quando tipo === 'servico' (ex: soroterapia +
  // soros + vitaminas). Estrutura: [{ insumoId, qtd }]
  const [insAdics, setInsAdics] = useState(
    (initial?.insumosAdicionais || []).map(a => ({ insumoId: a.insumoId, qtd: a.qtd || 1 }))
  );
  const [insAdicBusca, setInsAdicBusca] = useState('');
  const [insAdicShow, setInsAdicShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const opcoes = useMemo(() => {
    const lista = tipo === 'insumo'
      ? insumos.filter(i => i.categoria !== 'descartavel').sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
      : [...servicos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
    if (!busca.trim()) return lista.slice(0, 30);
    return lista.filter(x => x.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 30);
  }, [tipo, insumos, servicos, busca]);

  const item = tipo === 'insumo'
    ? insumos.find(i => i.id === itemId)
    : servicos.find(s => s.id === itemId);
  const unidade = tipo === 'insumo' ? (item?.unidade || '') : '';

  const canSave = itemId && (tipo === 'servico' || (Number(doseQtd) > 0)) && data && hora && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const insAdicsClean = tipo === 'servico'
        ? insAdics.filter(a => a.insumoId && Number(a.qtd) > 0).map(a => ({ insumoId: a.insumoId, qtd: Number(a.qtd) }))
        : [];
      const payload = {
        insumoId: tipo === 'insumo' ? itemId : null,
        servicoId: tipo === 'servico' ? itemId : null,
        doseQtd: Number(doseQtd) || 0,
        unidade,
        data, hora,
        recorrencia: recType === 'unica'
          ? { tipo: 'unica' }
          : { tipo: recType, valor: Number(recValor) || 0, ate: recAte || null },
        insumosAdicionais: insAdicsClean,
      };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  const inputSt = {
    width: '100%', padding: '8px 10px', border: '1px solid var(--line)',
    borderRadius: 8, background: 'var(--card)', fontSize: 13,
    color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
        {isEdit ? 'Editar medicação' : 'Nova medicação'}
      </div>

      {/* Tipo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
        {[{ id: 'insumo', label: 'Insumo' }, { id: 'servico', label: 'Serviço/Proc.' }].map(o => {
          const sel = tipo === o.id;
          return (
            <button key={o.id} disabled={isEdit} onClick={() => { setTipo(o.id); setItemId(''); }} style={{
              background: sel ? '#1d4ed8' : 'var(--card)',
              color: sel ? '#fff' : 'var(--ink)',
              border: `1px solid ${sel ? '#1d4ed8' : 'var(--line)'}`,
              borderRadius: 8, padding: '7px 10px', fontSize: 12, fontWeight: 700,
              cursor: isEdit ? 'default' : 'pointer', fontFamily: 'var(--sans)',
              opacity: isEdit ? 0.6 : 1,
            }}>
              {o.label}
            </button>
          );
        })}
      </div>

      {/* Item */}
      {!itemId ? (
        <>
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder={`Buscar ${tipo === 'insumo' ? 'insumo' : 'serviço'}…`}
            style={{ ...inputSt, marginBottom: 5 }}
          />
          <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--card)', marginBottom: 8 }}>
            {opcoes.length === 0 ? (
              <div style={{ padding: 10, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>Nada encontrado</div>
            ) : opcoes.map(x => (
              <button
                key={x.id} onClick={() => { setItemId(x.id); setBusca(''); }}
                style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', padding: '7px 10px', textAlign: 'left', cursor: 'pointer', fontSize: 12, color: 'var(--ink)', fontFamily: 'var(--sans)' }}
              >
                {x.nome}
                {tipo === 'insumo' && <span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 6 }}>· {x.unidade}</span>}
                {tipo === 'servico' && <span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 6 }}>· R$ {(x.valor || 0).toFixed(2)}</span>}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 8, padding: '7px 10px', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, flex: 1 }}>
            {item?.nome} {tipo === 'insumo' && item?.unidade && <span style={{ fontWeight: 400 }}>· {item.unidade}</span>}
          </span>
          <button onClick={() => setItemId('')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 16, cursor: 'pointer', padding: 0 }}>×</button>
        </div>
      )}

      {/* Dose + data/hora */}
      {tipo === 'insumo' && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Dose ({unidade || 'un'})</div>
          <input
            type="number" min="0" step="0.01" value={doseQtd}
            onChange={e => setDoseQtd(e.target.value)}
            placeholder="Ex: 10"
            style={inputSt}
          />
        </div>
      )}

      {/* Insumos adicionais ao serviço (ex.: soroterapia + soros + vitaminas) */}
      {tipo === 'servico' && itemId && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, padding: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Insumos adicionais {insAdics.length > 0 && `(${insAdics.length})`}
            </div>
            <button
              onClick={() => setInsAdicShow(v => !v)}
              style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--sans)' }}
            >{insAdicShow ? '× fechar' : '+ Adicionar'}</button>
          </div>

          {insAdicShow && (
            <div style={{ marginBottom: 6 }}>
              <input
                value={insAdicBusca} onChange={e => setInsAdicBusca(e.target.value)}
                placeholder="Buscar insumo…"
                style={{ ...inputSt, marginBottom: 4 }}
              />
              <div style={{ maxHeight: 130, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--card)' }}>
                {insumos
                  .filter(i => i.categoria !== 'descartavel')
                  .filter(i => !insAdics.some(a => a.insumoId === i.id))
                  .filter(i => !insAdicBusca.trim() || i.nome.toLowerCase().includes(insAdicBusca.toLowerCase()))
                  .slice(0, 20)
                  .map(i => (
                    <button
                      key={i.id}
                      onClick={() => {
                        setInsAdics(prev => [...prev, { insumoId: i.id, qtd: 1 }]);
                        setInsAdicBusca('');
                      }}
                      style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', padding: '6px 9px', textAlign: 'left', cursor: 'pointer', fontSize: 12, color: 'var(--ink)', fontFamily: 'var(--sans)' }}
                    >
                      {i.nome} <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>· {i.unidade}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {insAdics.map((a, idx) => {
            const ins = insumos.find(i => i.id === a.insumoId);
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 6, padding: '5px 8px', marginBottom: 4 }}>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>
                  {ins?.nome || a.insumoId}
                </span>
                <input
                  type="number" min="0" step="0.01" value={a.qtd}
                  onChange={e => setInsAdics(prev => prev.map((x, j) => j === idx ? { ...x, qtd: e.target.value } : x))}
                  style={{ width: 60, padding: '4px 6px', border: '1px solid var(--line)', borderRadius: 5, fontSize: 12, background: 'var(--card)', fontFamily: 'var(--sans)', textAlign: 'right' }}
                />
                <span style={{ fontSize: 10, color: 'var(--ink-3)', minWidth: 22 }}>{ins?.unidade || 'un'}</span>
                <button
                  onClick={() => setInsAdics(prev => prev.filter((_, j) => j !== idx))}
                  style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 14, cursor: 'pointer', padding: 0, width: 20 }}
                >×</button>
              </div>
            );
          })}

          {insAdics.length === 0 && !insAdicShow && (
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', padding: '4px 0', fontStyle: 'italic' }}>
              Nenhum insumo adicional. Clique em "+ Adicionar" pra incluir soros, vitaminas, etc.
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Data</div>
          <input type="date" value={data} onChange={e => setData(e.target.value)} style={inputSt} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Hora</div>
          <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={inputSt} />
        </div>
      </div>

      {/* Recorrência — só permite em criação (editar cada ocorrência individualmente) */}
      {!isEdit && (
        <div style={{ marginBottom: 10, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Recorrência</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 8 }}>
            {[
              { id: 'unica', label: 'Única' },
              { id: 'a_cada_h', label: 'A cada X h' },
              { id: 'a_cada_dia', label: 'A cada X d' },
            ].map(o => {
              const sel = recType === o.id;
              return (
                <button key={o.id} onClick={() => setRecType(o.id)} style={{
                  background: sel ? 'var(--accent)' : 'var(--card)',
                  color: sel ? '#fff' : 'var(--ink)',
                  border: `1px solid ${sel ? 'var(--accent)' : 'var(--line)'}`,
                  borderRadius: 7, padding: '6px 4px', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'var(--sans)',
                }}>
                  {o.label}
                </button>
              );
            })}
          </div>
          {recType !== 'unica' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 3 }}>Intervalo</div>
                <input
                  type="number" min="1" step="1" value={recValor}
                  onChange={e => setRecValor(e.target.value)}
                  style={inputSt}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 3 }}>Até (opcional, padrão 7 dias)</div>
                <input type="date" value={recAte} onChange={e => setRecAte(e.target.value)} style={inputSt} />
              </div>
            </div>
          )}
          {recType !== 'unica' && (
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.4 }}>
              Vão ser criadas ocorrências separadas a cada {recValor}{recType === 'a_cada_h' ? 'h' : ' dia(s)'} até {recAte || 'daqui 7 dias'}.
              Você pode cancelar, editar ou excluir cada uma individualmente.
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer' }}
        >Cancelar</button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            flex: 2, background: canSave ? '#1d4ed8' : 'var(--soft)',
            border: 'none', color: canSave ? '#fff' : 'var(--ink-3)',
            borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 700,
            fontFamily: 'var(--sans)', cursor: canSave ? 'pointer' : 'default',
          }}
        >{isEdit ? 'Salvar edição' : 'Programar'}</button>
      </div>
    </div>
  );
}

// Expande recorrência em ocorrências separadas (uma linha por ocorrência).
// Assim é fácil cancelar/editar cada uma sem quebrar a linha do tempo.
// IMPORTANTE: usa data/hora LOCAL (não UTC) pra não deslocar ocorrências entre
// dias quando a hora cruza a meia-noite UTC (bug do fuso: dose das 23h local em
// São Paulo virava data do dia seguinte via toISOString).
function _fmtDataLocal(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function _fmtHoraLocal(d) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mn = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mn}`;
}
function expandirRecorrencia({ recorrencia, data, hora, ...resto }) {
  const rec = recorrencia || { tipo: 'unica' };
  if (rec.tipo === 'unica' || !rec.valor) {
    return [{ ...resto, data, hora, recorrencia: { tipo: 'unica' } }];
  }
  const inicio = new Date(`${data}T${hora}:00`);
  const ate = rec.ate ? new Date(`${rec.ate}T23:59:59`) : new Date(inicio.getTime() + 7 * 24 * 60 * 60 * 1000);
  const passoMs = rec.tipo === 'a_cada_h'
    ? Number(rec.valor) * 60 * 60 * 1000
    : Number(rec.valor) * 24 * 60 * 60 * 1000;
  if (passoMs <= 0) return [{ ...resto, data, hora, recorrencia: rec }];
  const out = [];
  let cursor = inicio;
  let safety = 0;
  while (cursor <= ate && safety < 500) {
    out.push({ ...resto, data: _fmtDataLocal(cursor), hora: _fmtHoraLocal(cursor), recorrencia: rec });
    cursor = new Date(cursor.getTime() + passoMs);
    safety++;
  }
  return out;
}

function descreveRecorrencia(rec) {
  if (!rec || rec.tipo === 'unica') return '';
  if (rec.tipo === 'a_cada_h') return `A cada ${rec.valor}h`;
  if (rec.tipo === 'a_cada_dia') return `A cada ${rec.valor} dia(s)`;
  return '';
}

function fmtDataDiaSemana(dataStr) {
  const d = new Date(dataStr + 'T12:00:00');
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${dias[d.getDay()]}, ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

// ═════════════════════════════════════════════════════════════
// FASE 6 — PARÂMETROS SOLICITADOS (agendas de aferição recorrente)
// ═════════════════════════════════════════════════════════════
const PARAM_LABELS = { temperatura: 'Temperatura', fc: 'FC', fr: 'FR', mucosas: 'Mucosas', fezes: 'Fezes', urina: 'Urina', atitude: 'Atitude' };
const PARAM_LIST = Object.keys(PARAM_LABELS);

function SecaoParametrosSolicitados({ emergencia, agendas, addEmergAgenda, updateEmergAgenda, deleteEmergAgenda }) {
  const [showForm, setShowForm] = useState(false);
  const emergAtiva = emergencia.status === 'ativa';

  const ativas = useMemo(() => agendas.filter(a => a.ativo), [agendas]);
  const inativas = useMemo(() => agendas.filter(a => !a.ativo), [agendas]);

  return (
    <div>
      {emergAtiva && !showForm && (
        <button onClick={() => setShowForm(true)} style={{ background: '#b45309', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)', marginBottom: 10 }}>+ Nova solicitação</button>
      )}

      {showForm && (
        <AgendaForm
          onCancel={() => setShowForm(false)}
          onSave={async (data) => {
            await addEmergAgenda({ ...data, emergenciaId: emergencia.id });
            setShowForm(false);
          }}
        />
      )}

      {!showForm && agendas.length === 0 ? (
        <div style={{ background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 10, padding: '12px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>
          Nenhuma aferição solicitada. {emergAtiva && 'Toque em "+ Nova" pra criar um lembrete recorrente.'}
        </div>
      ) : !showForm && (
        <>
          {ativas.map(a => (
            <AgendaLinha key={a.id} agenda={a} emergAtiva={emergAtiva} onPausar={() => updateEmergAgenda(a.id, { ativo: false })} onExcluir={() => { if (window.confirm('Excluir esta solicitação?')) deleteEmergAgenda(a.id); }} />
          ))}
          {inativas.length > 0 && (
            <div style={{ opacity: 0.6, marginTop: 6 }}>
              {inativas.map(a => (
                <AgendaLinha key={a.id} agenda={a} emergAtiva={emergAtiva} inativa onReativar={() => updateEmergAgenda(a.id, { ativo: true })} onExcluir={() => { if (window.confirm('Excluir esta solicitação?')) deleteEmergAgenda(a.id); }} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AgendaLinha({ agenda, emergAtiva, inativa, onPausar, onReativar, onExcluir }) {
  const quais = (agenda.quais || []).map(q => PARAM_LABELS[q] || q).join(', ');
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderLeft: `3px solid #b45309`, borderRadius: 8, padding: '8px 10px', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>A cada {agenda.intervaloHoras}h</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
          {quais || 'todos os parâmetros'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
          {agenda.inicio ? `Desde ${new Date(agenda.inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
          {agenda.ate ? ` · até ${new Date(agenda.ate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit' })}` : ''}
        </div>
      </div>
      {emergAtiva && (
        <div style={{ display: 'flex', gap: 3 }}>
          {inativa ? (
            <button onClick={onReativar} title="Reativar" style={btnIco('#1d4ed8')}>↻</button>
          ) : (
            <button onClick={onPausar} title="Pausar" style={btnIco('#6b7280')}>⏸</button>
          )}
          <button onClick={onExcluir} title="Excluir" style={btnIco('#dc2626')}>×</button>
        </div>
      )}
    </div>
  );
}

function AgendaForm({ onCancel, onSave, initial }) {
  const [intervaloHoras, setIntervaloHoras] = useState(initial?.intervaloHoras ? String(initial.intervaloHoras) : '4');
  const nowIso = new Date().toISOString().slice(0, 16);
  const [inicio, setInicio] = useState(initial?.inicio ? initial.inicio.slice(0, 16) : nowIso);
  const [ate, setAte] = useState(initial?.ate ? initial.ate.slice(0, 16) : '');
  const [quais, setQuais] = useState(new Set(initial?.quais || PARAM_LIST));
  const [saving, setSaving] = useState(false);

  const toggleParam = (p) => {
    setQuais(prev => {
      const n = new Set(prev);
      if (n.has(p)) n.delete(p); else n.add(p);
      return n;
    });
  };
  const canSave = Number(intervaloHoras) > 0 && inicio && !saving && quais.size > 0;
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        intervaloHoras: Number(intervaloHoras),
        inicio: new Date(inicio).toISOString(),
        ate: ate ? new Date(ate).toISOString() : null,
        quais: Array.from(quais),
        ativo: true,
      });
    } finally { setSaving(false); }
  };
  const inputSt = { width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--card)', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Nova solicitação de aferição</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 3 }}>A cada (h)</div>
          <input type="number" min="1" step="1" value={intervaloHoras} onChange={e => setIntervaloHoras(e.target.value)} style={inputSt} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 3 }}>Início</div>
          <input type="datetime-local" value={inicio} onChange={e => setInicio(e.target.value)} style={inputSt} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 3 }}>Até quando (opcional)</div>
        <input type="datetime-local" value={ate} onChange={e => setAte(e.target.value)} style={inputSt} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 5 }}>Quais parâmetros?</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {PARAM_LIST.map(p => {
            const sel = quais.has(p);
            return (
              <button key={p} onClick={() => toggleParam(p)} style={{
                background: sel ? '#b45309' : 'var(--card)',
                color: sel ? '#fff' : 'var(--ink)',
                border: `1px solid ${sel ? '#b45309' : 'var(--line)'}`,
                borderRadius: 6, padding: '5px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)',
              }}>{PARAM_LABELS[p]}</button>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onCancel} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer' }}>Cancelar</button>
        <button onClick={handleSave} disabled={!canSave} style={{ flex: 2, background: canSave ? '#b45309' : 'var(--soft)', border: 'none', color: canSave ? '#fff' : 'var(--ink-3)', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)', cursor: canSave ? 'pointer' : 'default' }}>Criar solicitação</button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// FASE 6 — PARÂMETROS AFERIDOS (registros TPR + timeline)
// ═════════════════════════════════════════════════════════════
function SecaoParametrosAferidos({ emergencia, currentUser, parametros, addEmergParametro, updateEmergParametro, deleteEmergParametro }) {
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const emergAtiva = emergencia.status === 'ativa';

  // Timeline: mais recente primeiro
  const timeline = useMemo(
    () => [...parametros].sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || '')),
    [parametros]
  );

  return (
    <div>
      {emergAtiva && !showForm && (
        <button onClick={() => { setEditando(null); setShowForm(true); }} style={{ background: '#15803d', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)', marginBottom: 10 }}>+ Aferir</button>
      )}

      {showForm && (
        <ParametroForm
          initial={editando ? timeline.find(p => p.id === editando) : null}
          onCancel={() => { setShowForm(false); setEditando(null); }}
          onSave={async (data) => {
            if (editando) await updateEmergParametro(editando, data);
            else await addEmergParametro({ ...data, emergenciaId: emergencia.id });
            setShowForm(false);
            setEditando(null);
          }}
        />
      )}

      {!showForm && timeline.length === 0 ? (
        <div style={{ background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 10, padding: '12px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>
          Nenhuma aferição registrada.
        </div>
      ) : !showForm && timeline.map(p => (
        <ParametroLinha
          key={p.id}
          p={p}
          emergAtiva={emergAtiva}
          onEditar={() => { setEditando(p.id); setShowForm(true); }}
          onExcluir={() => { if (window.confirm('Excluir esta aferição?')) deleteEmergParametro(p.id); }}
        />
      ))}
    </div>
  );
}

function ParametroLinha({ p, emergAtiva, onEditar, onExcluir }) {
  const partes = [];
  if (p.temperatura != null) partes.push({ label: 'T', v: `${Number(p.temperatura).toFixed(1)}°C` });
  if (p.fc != null) partes.push({ label: 'FC', v: `${p.fc} bpm` });
  if (p.fr != null) partes.push({ label: 'FR', v: `${p.fr} mpm` });
  if (p.mucosas) partes.push({ label: 'Muc.', v: p.mucosas });
  if (p.fezes) partes.push({ label: 'Fezes', v: p.fezes });
  if (p.urina) partes.push({ label: 'Urina', v: p.urina });
  if (p.atitude) partes.push({ label: 'Ati.', v: p.atitude });

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderLeft: '3px solid #15803d', borderRadius: 8, padding: '8px 10px', marginBottom: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', fontFamily: 'var(--mono, monospace)' }}>
          {new Date(p.dataHora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </div>
        {p.autor && <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{p.autor}</div>}
        {emergAtiva && (
          <div style={{ display: 'flex', gap: 3 }}>
            <button onClick={onEditar} title="Editar" style={btnIco('#374151')}>✎</button>
            <button onClick={onExcluir} title="Excluir" style={btnIco('#dc2626')}>×</button>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {partes.map((x, i) => (
          <span key={i} style={{ background: '#15803d15', color: '#15803d', borderRadius: 5, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>
            {x.label} <b>{x.v}</b>
          </span>
        ))}
      </div>
      {p.obs && (
        <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 5, lineHeight: 1.4, fontStyle: 'italic' }}>
          {p.obs}
        </div>
      )}
    </div>
  );
}

function ParametroForm({ initial, onCancel, onSave }) {
  const nowLocal = new Date();
  const isoLocal = new Date(nowLocal.getTime() - nowLocal.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [dataHora, setDataHora] = useState(initial?.dataHora ? initial.dataHora.slice(0, 16) : isoLocal);
  const [temperatura, setTemperatura] = useState(initial?.temperatura != null ? String(initial.temperatura) : '');
  const [fc, setFc] = useState(initial?.fc != null ? String(initial.fc) : '');
  const [fr, setFr] = useState(initial?.fr != null ? String(initial.fr) : '');
  const [mucosas, setMucosas] = useState(initial?.mucosas || '');
  const [fezes, setFezes] = useState(initial?.fezes || '');
  const [urina, setUrina] = useState(initial?.urina || '');
  const [atitude, setAtitude] = useState(initial?.atitude || '');
  const [obs, setObs] = useState(initial?.obs || '');
  const [saving, setSaving] = useState(false);

  const canSave = dataHora && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        dataHora: new Date(dataHora).toISOString(),
        temperatura: temperatura === '' ? null : Number(temperatura),
        fc: fc === '' ? null : Number(fc),
        fr: fr === '' ? null : Number(fr),
        mucosas: mucosas.trim(), fezes: fezes.trim(), urina: urina.trim(), atitude: atitude.trim(),
        obs: obs.trim(),
      });
    } finally { setSaving(false); }
  };
  const inputSt = { width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--card)', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>{initial ? 'Editar aferição' : 'Nova aferição'}</div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 3 }}>Data / hora</div>
        <input type="datetime-local" value={dataHora} onChange={e => setDataHora(e.target.value)} style={inputSt} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 3 }}>Temp (°C)</div>
          <input type="number" step="0.1" value={temperatura} onChange={e => setTemperatura(e.target.value)} style={inputSt} placeholder="37,5" />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 3 }}>FC (bpm)</div>
          <input type="number" step="1" value={fc} onChange={e => setFc(e.target.value)} style={inputSt} placeholder="40" />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 3 }}>FR (mpm)</div>
          <input type="number" step="1" value={fr} onChange={e => setFr(e.target.value)} style={inputSt} placeholder="16" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 3 }}>Mucosas</div>
          <input value={mucosas} onChange={e => setMucosas(e.target.value)} style={inputSt} placeholder="róseas úmidas" />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 3 }}>Atitude</div>
          <input value={atitude} onChange={e => setAtitude(e.target.value)} style={inputSt} placeholder="alerta / apática" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 3 }}>Fezes</div>
          <input value={fezes} onChange={e => setFezes(e.target.value)} style={inputSt} placeholder="normais / diarreia" />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 3 }}>Urina</div>
          <input value={urina} onChange={e => setUrina(e.target.value)} style={inputSt} placeholder="clara / concentrada" />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 3 }}>Observações</div>
        <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} style={{ ...inputSt, resize: 'vertical', minHeight: 50, fontFamily: 'var(--sans)' }} placeholder="Detalhes adicionais…" />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onCancel} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer' }}>Cancelar</button>
        <button onClick={handleSave} disabled={!canSave} style={{ flex: 2, background: canSave ? '#15803d' : 'var(--soft)', border: 'none', color: canSave ? '#fff' : 'var(--ink-3)', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)', cursor: canSave ? 'pointer' : 'default' }}>Salvar aferição</button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// FASE 7 — NOTAS CLÍNICAS (timeline com autor)
// ═════════════════════════════════════════════════════════════
function SecaoNotasClinicas({ emergencia, currentUser, notas, addEmergNota, updateEmergNota, deleteEmergNota }) {
  const [novoTexto, setNovoTexto] = useState('');
  const [editando, setEditando] = useState(null);
  const [textoEd, setTextoEd] = useState('');
  const [saving, setSaving] = useState(false);
  const emergAtiva = emergencia.status === 'ativa';

  const timeline = useMemo(
    () => [...notas].sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || '')),
    [notas]
  );

  const handleAdicionar = async () => {
    if (!novoTexto.trim() || saving) return;
    setSaving(true);
    try {
      await addEmergNota({ emergenciaId: emergencia.id, dataHora: new Date().toISOString(), texto: novoTexto.trim() });
      setNovoTexto('');
    } finally { setSaving(false); }
  };

  const salvarEdicao = async (id) => {
    if (!textoEd.trim()) return;
    await updateEmergNota(id, { texto: textoEd.trim() });
    setEditando(null);
    setTextoEd('');
  };

  const inputSt = { width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--card)', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box', resize: 'vertical' };

  return (
    <div>
      {emergAtiva && (
        <div style={{ marginBottom: 8 }}>
          <textarea value={novoTexto} onChange={e => setNovoTexto(e.target.value)} rows={2} style={{ ...inputSt, minHeight: 50, marginBottom: 5 }} placeholder="Adicionar observação clínica…" />
          <button onClick={handleAdicionar} disabled={!novoTexto.trim() || saving} style={{ background: novoTexto.trim() ? '#7c3aed' : 'var(--soft)', border: 'none', color: novoTexto.trim() ? '#fff' : 'var(--ink-3)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--sans)', cursor: novoTexto.trim() ? 'pointer' : 'default' }}>+ Adicionar</button>
        </div>
      )}

      {timeline.length === 0 ? (
        <div style={{ background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 10, padding: '12px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>
          Sem observações registradas.
        </div>
      ) : timeline.map(n => (
        <div key={n.id} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderLeft: '3px solid #7c3aed', borderRadius: 8, padding: '9px 12px', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)' }}>
              {new Date(n.dataHora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              {n.autor && <span style={{ fontWeight: 400, color: 'var(--ink-3)', marginLeft: 6 }}>· {n.autor}</span>}
            </div>
            {emergAtiva && editando !== n.id && (
              <div style={{ display: 'flex', gap: 3 }}>
                <button onClick={() => { setEditando(n.id); setTextoEd(n.texto); }} title="Editar" style={btnIco('#374151')}>✎</button>
                <button onClick={() => { if (window.confirm('Excluir esta observação?')) deleteEmergNota(n.id); }} title="Excluir" style={btnIco('#dc2626')}>×</button>
              </div>
            )}
          </div>
          {editando === n.id ? (
            <>
              <textarea value={textoEd} onChange={e => setTextoEd(e.target.value)} rows={2} style={{ ...inputSt, minHeight: 50, marginBottom: 5 }} />
              <div style={{ display: 'flex', gap: 5 }}>
                <button onClick={() => { setEditando(null); setTextoEd(''); }} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 7, padding: '6px', fontSize: 12, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={() => salvarEdicao(n.id)} style={{ flex: 1, background: '#7c3aed', border: 'none', color: '#fff', borderRadius: 7, padding: '6px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--sans)', cursor: 'pointer' }}>Salvar</button>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n.texto}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// FASE 7 — EXAMES LABORATORIAIS (upload + preview)
// ═════════════════════════════════════════════════════════════
function SecaoExames({ emergencia, currentUser, exames, uploadEmergExame, deleteEmergExame }) {
  const [nome, setNome] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const emergAtiva = emergencia.status === 'ativa';

  const timeline = useMemo(
    () => [...exames].sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || '')),
    [exames]
  );

  const handleUpload = async () => {
    if (!nome.trim() || !file || uploading) return;
    setUploading(true);
    try {
      await uploadEmergExame({ emergenciaId: emergencia.id, nome: nome.trim() }, file);
      setNome(''); setFile(null);
    } finally { setUploading(false); }
  };

  const inputSt = { width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--card)', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box' };

  return (
    <div>
      {emergAtiva && (
        <div style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 10, padding: 10, marginBottom: 8 }}>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do exame (ex: Hemograma pré)" style={{ ...inputSt, marginBottom: 6 }} />
          <input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} style={{ ...inputSt, padding: 6, marginBottom: 6 }} />
          <button
            onClick={handleUpload}
            disabled={!nome.trim() || !file || uploading}
            style={{ background: (nome.trim() && file && !uploading) ? '#0e7490' : 'var(--soft)', border: 'none', color: (nome.trim() && file && !uploading) ? '#fff' : 'var(--ink-3)', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--sans)', cursor: (nome.trim() && file && !uploading) ? 'pointer' : 'default', width: '100%' }}
          >{uploading ? 'Enviando…' : '↑ Enviar exame'}</button>
        </div>
      )}

      {timeline.length === 0 ? (
        <div style={{ background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 10, padding: '12px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>
          Nenhum exame enviado.
        </div>
      ) : timeline.map(e => {
        const isImg = e.arquivoTipo?.startsWith('image/');
        return (
          <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderLeft: '3px solid #0e7490', borderRadius: 8, padding: '8px 10px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
            {isImg && e.arquivoUrl ? (
              <img src={e.arquivoUrl} alt={e.nome} onClick={() => window.open(e.arquivoUrl, '_blank')} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }} />
            ) : (
              <div onClick={() => e.arquivoUrl && window.open(e.arquivoUrl, '_blank')} style={{ width: 48, height: 48, borderRadius: 6, background: '#0e749018', display: 'grid', placeItems: 'center', cursor: e.arquivoUrl ? 'pointer' : 'default', flexShrink: 0, color: '#0e7490', fontWeight: 700, fontSize: 10 }}>PDF</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{e.nome}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                {new Date(e.dataHora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                {e.autor && ` · ${e.autor}`}
              </div>
              {e.arquivoUrl && (
                <a href={e.arquivoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#0e7490', textDecoration: 'underline' }}>abrir</a>
              )}
            </div>
            {emergAtiva && (
              <button onClick={() => { if (window.confirm('Excluir este exame?')) deleteEmergExame(e.id); }} title="Excluir" style={btnIco('#dc2626')}>×</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// FASE 8 — CRONOGRAMA INDIVIDUAL (do animal) — nav horizontal por dia
// ═════════════════════════════════════════════════════════════
function SecaoCronogramaIndividual({ emergencia, insumos, servicos, medicacoes, agendas, parametros, currentUser, updateEmergMedicacao, addRegistro, addProcedimento, addAtividade, frascosAbertos, addFrascoAberto, updateFrascoAberto, addEmergParametro }) {
  const itens = useMemo(() => construirCronograma({
    emergencias: [emergencia], medicacoes, agendas, insumos, servicos, parametros,
  }), [emergencia, medicacoes, agendas, insumos, servicos, parametros]);

  const [showParamForm, setShowParamForm] = useState(false);
  const [paramInicialData, setParamInicialData] = useState(null);

  const marcarFeito = async (it) => {
    if (it.tipoItem === 'parametro') {
      setParamInicialData({ agendaId: it.agendaId, dataHora: it.dataHora });
      setShowParamForm(true);
      return;
    }
    if (it.tipoItem === 'medicacao') {
      // Recupera a medicação real e chama o helper de cobrança
      const m = medicacoes.find(x => x.id === it.medicacaoId);
      if (!m) return;
      await marcarMedicacaoFeita({
        m, emergencia, insumos, servicos, frascosAbertos,
        addRegistro, addProcedimento, addAtividade,
        updateEmergMedicacao, addFrascoAberto, updateFrascoAberto,
        currentUser,
      });
    }
  };

  return (
    <div>
      {showParamForm && (
        <ParametroForm
          initial={paramInicialData}
          onCancel={() => { setShowParamForm(false); setParamInicialData(null); }}
          onSave={async (data) => {
            await addEmergParametro({ ...data, emergenciaId: emergencia.id, agendaId: paramInicialData?.agendaId });
            setShowParamForm(false); setParamInicialData(null);
          }}
        />
      )}

      <NavegacaoDias
        itens={itens}
        destacaAtrasado
        emptyText="Nada pendente. Programe medicações ou solicite parâmetros abaixo."
        renderItem={(it) => (
          <ItemCronograma
            key={it.id}
            it={it}
            atrasado={new Date(it.dataHora) < new Date()}
            onAcao={() => marcarFeito(it)}
          />
        )}
      />
    </div>
  );
}

function ItemCronograma({ it, atrasado, onAcao, mostraAnimal, onAbrirFicha }) {
  const cor = it.tipoItem === 'medicacao' ? '#1d4ed8' : '#b45309';
  const [, hora] = it.dataHora.split('T');
  const horaFmt = hora ? hora.slice(0, 5) : '';
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)',
      borderLeft: `3px solid ${atrasado ? '#dc2626' : cor}`,
      borderRadius: 8, padding: '8px 10px', marginBottom: 5,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12, color: atrasado ? '#dc2626' : 'var(--ink-2)', fontWeight: 700, minWidth: 42 }}>
        {horaFmt}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)' }}>
          {it.label}
          {atrasado && <span style={{ marginLeft: 6, fontSize: 9, color: '#dc2626', background: '#fee2e2', borderRadius: 4, padding: '1px 5px', fontWeight: 700, letterSpacing: '0.05em' }}>ATRASADO</span>}
        </div>
        {mostraAnimal && it.animalNome && (
          onAbrirFicha ? (
            <button onClick={onAbrirFicha} style={{ background: 'none', border: 'none', color: 'var(--accent)', padding: 0, marginTop: 2, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
              🐴 {it.animalNome}
            </button>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2, fontWeight: 600 }}>🐴 {it.animalNome}</div>
          )
        )}
        {it.sub && (
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{it.sub}</div>
        )}
      </div>
      {onAcao && (
        <button onClick={onAcao} title={it.tipoItem === 'parametro' ? 'Registrar aferição' : 'Marcar feito'} style={btnIco(atrasado ? '#dc2626' : '#15803d')}>
          ✓
        </button>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// FASE 8 — CRONOGRAMA CENTRAL (todas emergências ativas) — nav horizontal por dia
// ═════════════════════════════════════════════════════════════
function CronogramaCentral({
  emergencias, cavalos, insumos, servicos, emergMedicacoes, emergAgendas, emergParametros,
  currentUser, onOpenFicha,
  addRegistro, addProcedimento, addAtividade, updateEmergMedicacao, addEmergParametro,
  frascosAbertos, addFrascoAberto, updateFrascoAberto,
}) {
  const itens = useMemo(() => construirCronograma({
    emergencias, medicacoes: emergMedicacoes, agendas: emergAgendas,
    insumos, servicos, parametros: emergParametros, comAnimal: true, cavalos,
  }), [emergencias, emergMedicacoes, emergAgendas, insumos, servicos, emergParametros, cavalos]);

  const [aberto, setAberto] = useState(true);
  const [showParamForm, setShowParamForm] = useState(false);
  const [paramInicialData, setParamInicialData] = useState(null);

  if (itens.length === 0) return null;

  const atrasados = itens.filter(i => new Date(i.dataHora) < new Date());

  const marcarFeito = async (it) => {
    const emerg = emergencias.find(e => e.id === it.emergenciaId);
    if (!emerg) return;
    if (it.tipoItem === 'parametro') {
      setParamInicialData({
        emergenciaId: emerg.id, agendaId: it.agendaId, dataHora: it.dataHora,
      });
      setShowParamForm(true);
      return;
    }
    if (it.tipoItem === 'medicacao') {
      const m = emergMedicacoes.find(x => x.id === it.medicacaoId);
      if (!m) return;
      await marcarMedicacaoFeita({
        m, emergencia: emerg, insumos, servicos, frascosAbertos,
        addRegistro, addProcedimento, addAtividade,
        updateEmergMedicacao, addFrascoAberto, updateFrascoAberto,
        currentUser,
      });
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(180deg, #fef2f2, #fff)',
      border: '1px solid #fecaca', borderRadius: 14, padding: 12, marginBottom: 18,
    }}>
      <button
        onClick={() => setAberto(v => !v)}
        style={{ width: '100%', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: 0, marginBottom: aberto ? 10 : 0 }}
      >
        <span style={{ width: 30, height: 30, borderRadius: 8, background: '#dc262620', display: 'grid', placeItems: 'center' }}>
          <Icon name="clock" size={16} color="#dc2626" />
        </span>
        <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 700, color: '#991b1b' }}>
          Cronograma do plantão
        </span>
        <span style={{ background: '#dc2626', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
          {itens.length}
        </span>
        {atrasados.length > 0 && (
          <span style={{ background: '#7f1d1d', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
            {atrasados.length} atrasado{atrasados.length > 1 ? 's' : ''}
          </span>
        )}
        <span style={{ fontSize: 12, color: '#dc2626', transform: aberto ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▸</span>
      </button>

      {aberto && (
        <>
          {showParamForm && (
            <ParametroForm
              initial={paramInicialData}
              onCancel={() => { setShowParamForm(false); setParamInicialData(null); }}
              onSave={async (data) => {
                if (addEmergParametro && paramInicialData?.emergenciaId) {
                  await addEmergParametro({
                    ...data,
                    emergenciaId: paramInicialData.emergenciaId,
                    agendaId: paramInicialData.agendaId,
                  });
                }
                setShowParamForm(false); setParamInicialData(null);
              }}
            />
          )}
          <NavegacaoDias
            itens={itens}
            destacaAtrasado
            emptyText="Nada pendente no plantão."
            renderItem={(it) => (
              <ItemCronograma
                key={it.id}
                it={it}
                atrasado={new Date(it.dataHora) < new Date()}
                mostraAnimal
                onAcao={() => marcarFeito(it)}
                onAbrirFicha={() => onOpenFicha && onOpenFicha(it.emergenciaId)}
              />
            )}
          />
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// AGREGAÇÃO: constrói o cronograma (medicações programadas + próximas ocorrências das agendas)
// ═════════════════════════════════════════════════════════════
function construirCronograma({ emergencias, medicacoes, agendas, insumos = [], servicos = [], parametros = [], comAnimal = false, cavalos = [] }) {
  const itens = [];
  const agora = new Date();
  const limiteFuturo = new Date(agora.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 dias adiante

  emergencias.forEach(emerg => {
    if (emerg.status !== 'ativa') return;
    const animalNome = comAnimal ? (cavalos.find(c => c.id === emerg.cavaloId)?.nome || '') : '';

    // Medicações programadas
    medicacoes.filter(m => m.emergenciaId === emerg.id && m.status === 'programado').forEach(m => {
      const dataHora = m.hora ? `${m.data}T${m.hora}:00` : `${m.data}T09:00:00`;
      if (new Date(dataHora) > limiteFuturo) return;
      const ins = m.insumoId ? insumos.find(i => i.id === m.insumoId) : null;
      const sv = m.servicoId ? servicos.find(s => s.id === m.servicoId) : null;
      itens.push({
        id: `med_${m.id}`,
        emergenciaId: emerg.id,
        medicacaoId: m.id,
        tipoItem: 'medicacao',
        dataHora,
        label: ins ? `${m.doseQtd || ''} ${ins.unidade || ''} ${ins.nome}`.trim() : (sv ? sv.nome : '—'),
        sub: null,
        animalNome,
      });
    });

    // Próximas ocorrências das agendas ativas
    agendas.filter(a => a.emergenciaId === emerg.id && a.ativo).forEach(a => {
      const inicio = new Date(a.inicio);
      const ate = a.ate ? new Date(a.ate) : new Date(agora.getTime() + 7 * 86400000);
      const intervaloMs = (Number(a.intervaloHoras) || 4) * 3600 * 1000;
      if (intervaloMs <= 0) return;
      // Descobre próxima ocorrência não aferida
      let cursor = new Date(inicio);
      let safety = 0;
      while (cursor <= ate && cursor <= limiteFuturo && safety < 200) {
        // já foi aferido nas proximidades? consideramos "já aferido" se existe um parametro nesta agenda dentro de ±30min
        const janela = 30 * 60 * 1000;
        const jaAferido = parametros.some(p =>
          p.emergenciaId === emerg.id && p.agendaId === a.id &&
          Math.abs(new Date(p.dataHora).getTime() - cursor.getTime()) < janela
        );
        if (!jaAferido) {
          itens.push({
            id: `age_${a.id}_${cursor.getTime()}`,
            emergenciaId: emerg.id,
            agendaId: a.id,
            tipoItem: 'parametro',
            dataHora: cursor.toISOString(),
            label: `Aferir ${(a.quais || []).map(q => PARAM_LABELS[q] || q).join(', ') || 'parâmetros'}`,
            sub: `A cada ${a.intervaloHoras}h`,
            animalNome,
          });
        }
        cursor = new Date(cursor.getTime() + intervaloMs);
        safety++;
      }
    });
  });

  return itens.sort((a, b) => a.dataHora.localeCompare(b.dataHora));
}

// ═════════════════════════════════════════════════════════════
// FASE 9 — COPIAR RESUMO EM TEXTO
// ═════════════════════════════════════════════════════════════
function BotaoCopiarResumo({ emergencia, cavalo, insumos, servicos, medicacoes, agendas, parametros, notas, exames }) {
  const [copiado, setCopiado] = useState(false);

  const gerarResumo = () => {
    const linhas = [];
    linhas.push(`⚠️ EMERGÊNCIA — ${cavalo?.nome || '—'}`);
    linhas.push(`Título: ${emergencia.titulo}`);
    linhas.push(`Status: ${emergencia.status.toUpperCase()}`);
    linhas.push(`Aberta em ${fmtDataHora(emergencia.abertaEm)}${emergencia.autorAbertura ? ' por ' + emergencia.autorAbertura : ''}`);
    if (emergencia.encerradaEm) linhas.push(`Encerrada em ${fmtDataHora(emergencia.encerradaEm)}`);
    if (emergencia.observacaoUrgente) linhas.push(`\n⚠️ ${emergencia.observacaoUrgente}`);
    if (emergencia.motivo) linhas.push(`\nMotivo/história:\n${emergencia.motivo}`);

    // Medicações últimas 10 feitas
    const feitas = medicacoes.filter(m => m.status === 'feito').sort((a, b) => (b.feitoEm || '').localeCompare(a.feitoEm || '')).slice(0, 10);
    if (feitas.length > 0) {
      linhas.push('\n💊 MEDICAÇÕES / INSUMOS (últimas 10):');
      feitas.forEach(m => {
        const ins = m.insumoId ? insumos.find(i => i.id === m.insumoId) : null;
        const sv = m.servicoId ? servicos.find(s => s.id === m.servicoId) : null;
        const nome = ins?.nome || sv?.nome || '—';
        const dose = ins ? `${m.doseQtd || ''} ${ins.unidade || ''}` : '';
        linhas.push(`· ${m.data} ${m.hora} — ${nome} ${dose}`.trim());
      });
    }

    const programadas = medicacoes.filter(m => m.status === 'programado').sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)).slice(0, 10);
    if (programadas.length > 0) {
      linhas.push('\n📅 PROGRAMADAS (próximas 10):');
      programadas.forEach(m => {
        const ins = m.insumoId ? insumos.find(i => i.id === m.insumoId) : null;
        const sv = m.servicoId ? servicos.find(s => s.id === m.servicoId) : null;
        const nome = ins?.nome || sv?.nome || '—';
        const dose = ins ? `${m.doseQtd || ''} ${ins.unidade || ''}` : '';
        linhas.push(`· ${m.data} ${m.hora} — ${nome} ${dose}`.trim());
      });
    }

    const agendasAtivas = agendas.filter(a => a.ativo);
    if (agendasAtivas.length > 0) {
      linhas.push('\n🔔 PARÂMETROS SOLICITADOS:');
      agendasAtivas.forEach(a => {
        const quais = (a.quais || []).map(q => PARAM_LABELS[q] || q).join(', ') || 'todos';
        linhas.push(`· A cada ${a.intervaloHoras}h — ${quais}`);
      });
    }

    const ultimosParam = [...parametros].sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || '')).slice(0, 5);
    if (ultimosParam.length > 0) {
      linhas.push('\n📊 ÚLTIMAS 5 AFERIÇÕES:');
      ultimosParam.forEach(p => {
        const d = new Date(p.dataHora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const partes = [];
        if (p.temperatura != null) partes.push(`T ${p.temperatura}°C`);
        if (p.fc != null) partes.push(`FC ${p.fc}`);
        if (p.fr != null) partes.push(`FR ${p.fr}`);
        if (p.mucosas) partes.push(`Muc: ${p.mucosas}`);
        if (p.fezes) partes.push(`Fezes: ${p.fezes}`);
        if (p.urina) partes.push(`Urina: ${p.urina}`);
        if (p.atitude) partes.push(`Ati: ${p.atitude}`);
        linhas.push(`· ${d} — ${partes.join(' · ')}${p.obs ? ` (${p.obs})` : ''}`);
      });
    }

    const ultimasNotas = [...notas].sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || '')).slice(0, 5);
    if (ultimasNotas.length > 0) {
      linhas.push('\n📝 ÚLTIMAS 5 OBSERVAÇÕES:');
      ultimasNotas.forEach(n => {
        const d = new Date(n.dataHora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        linhas.push(`· ${d}${n.autor ? ` (${n.autor})` : ''}: ${n.texto}`);
      });
    }

    if (exames.length > 0) {
      linhas.push('\n📄 EXAMES ANEXADOS:');
      exames.forEach(e => {
        const d = new Date(e.dataHora).toLocaleDateString('pt-BR');
        linhas.push(`· ${d} — ${e.nome}${e.arquivoUrl ? ` (${e.arquivoUrl})` : ''}`);
      });
    }

    return linhas.join('\n');
  };

  const handleCopiar = async () => {
    const texto = gerarResumo();
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      // Fallback: abre uma janela de alerta pra o usuário copiar manualmente
      window.prompt('Copie o resumo abaixo:', texto);
    }
  };

  return (
    <button
      onClick={handleCopiar}
      style={{
        width: '100%', background: 'var(--card)', color: 'var(--ink)',
        border: '1px solid var(--line)', borderRadius: 12,
        padding: '11px', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'var(--sans)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}
    >
      {copiado ? '✓ Copiado!' : '📋 Copiar resumo em texto'}
    </button>
  );
}

function SecaoPendente({ titulo, icone, cor, nota }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 12, padding: '12px 14px', marginBottom: 8, opacity: 0.85 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: cor + '18', display: 'grid', placeItems: 'center' }}>
          <Icon name={icone} size={15} color={cor} />
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{titulo}</span>
        <span style={{ fontSize: 9, color: 'var(--ink-3)', background: 'var(--soft)', borderRadius: 6, padding: '2px 7px', letterSpacing: '0.05em', fontWeight: 700, textTransform: 'uppercase' }}>em breve</span>
      </div>
      {nota && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 36, lineHeight: 1.5 }}>{nota}</div>
      )}
    </div>
  );
}
