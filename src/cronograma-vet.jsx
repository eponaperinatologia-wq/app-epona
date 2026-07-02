// cronograma-vet.jsx — Cronograma central da Veterinária
// Agrega tarefas de: Emergências (medicações + parâmetros),
// Vacinação, Vermifugação, OPG, Progesterona e Gestação (parto previsto).
// Cada item pode ser marcado feito diretamente aqui — a ação usa a MESMA
// pipeline da tela original, então a informação flui de volta.

import React, { useState, useMemo } from 'react';
import { Icon } from './icons';
import {
  NavegacaoDias, ItemCronograma, ParametroForm,
  _fmtDataLocal, marcarMedicacaoFeita,
} from './emergencias';
import { calcAgendaVac, calcAgendaVerm } from './veterinaria';
import { addDescartaveis } from './data';

function todayISO() { return _fmtDataLocal(new Date()); }
function nowHHMM() { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function dataHoraISO(dataYmd, hora = '09:00') { return `${dataYmd}T${hora}:00`; }

// ─── Coleta de tarefas ─────────────────────────────────────────
function coletarTarefas({
  cavalos, insumos,
  emergencias, emergMedicacoes, emergAgendas, emergParametros,
  protocolosVacinacao, vacinacoesAnimais,
  protocolosVermifugacao, vermifugacoesAnimais,
  progProgramas, progAplicacoes,
  janelaDiasPassado = 60, janelaDiasFuturo = 60,
}) {
  const itens = [];
  const agora = new Date();
  const cutoffPassado = new Date(agora.getTime() - janelaDiasPassado * 86400000);
  const cutoffFuturo = new Date(agora.getTime() + janelaDiasFuturo * 86400000);
  const cavalosMap = new Map((cavalos || []).map(c => [c.id, c]));

  // ── EMERGÊNCIAS: medicações programadas ───────────────────────
  (emergencias || []).filter(e => e.status === 'ativa').forEach(emerg => {
    const animalNome = cavalosMap.get(emerg.cavaloId)?.nome || '';
    (emergMedicacoes || [])
      .filter(m => m.emergenciaId === emerg.id && m.status === 'programado')
      .forEach(m => {
        const dh = dataHoraISO(m.data, m.hora || '09:00');
        const d = new Date(dh);
        if (d < cutoffPassado || d > cutoffFuturo) return;
        const ins = m.insumoId ? insumos.find(i => i.id === m.insumoId) : null;
        itens.push({
          id: `emgm_${m.id}`,
          tipoItem: 'emerg-medicacao',
          dataHora: dh, cavaloId: emerg.cavaloId, animalNome,
          label: ins ? `${m.doseQtd || ''} ${ins.unidade || ''} ${ins.nome}`.trim() : (m.servicoId ? '(serviço)' : '—'),
          sub: `Emergência · ${emerg.titulo || 'sem título'}`,
          _raw: { medicacao: m, emergencia: emerg },
        });
      });

    // ── EMERGÊNCIAS: agendas de parâmetros ────────────────────
    (emergAgendas || []).filter(a => a.emergenciaId === emerg.id && a.ativo).forEach(a => {
      const inicio = new Date(a.inicio);
      const ate = a.ate ? new Date(a.ate) : new Date(agora.getTime() + 7 * 86400000);
      const intervaloMs = (Number(a.intervaloHoras) || 4) * 3600 * 1000;
      if (intervaloMs <= 0) return;
      let cursor = new Date(inicio);
      let safety = 0;
      while (cursor <= ate && cursor <= cutoffFuturo && safety < 200) {
        if (cursor >= cutoffPassado) {
          const janela = 30 * 60 * 1000;
          const jaAferido = (emergParametros || []).some(p =>
            p.emergenciaId === emerg.id && p.agendaId === a.id &&
            Math.abs(new Date(p.dataHora).getTime() - cursor.getTime()) < janela
          );
          if (!jaAferido) {
            itens.push({
              id: `emga_${a.id}_${cursor.getTime()}`,
              tipoItem: 'emerg-parametro',
              dataHora: cursor.toISOString(), cavaloId: emerg.cavaloId, animalNome,
              label: `Aferir parâmetros`,
              sub: `Emergência · a cada ${a.intervaloHoras}h`,
              _raw: { agenda: a, emergencia: emerg },
            });
          }
        }
        cursor = new Date(cursor.getTime() + intervaloMs);
        safety++;
      }
    });
  });

  // ── VACINAÇÃO ─────────────────────────────────────────────────
  const agendaVac = calcAgendaVac(protocolosVacinacao || [], cavalos || [], vacinacoesAnimais || []);
  agendaVac.filter(v => !v.feito).forEach(v => {
    if (!v.dataPrevista) return;
    const d = new Date(v.dataPrevista + 'T09:00:00');
    if (d < cutoffPassado || d > cutoffFuturo) return;
    const nome = cavalosMap.get(v.cavaloId)?.nome || '';
    const insumo = insumos.find(i => i.id === v.dose?.insumoId);
    itens.push({
      id: `vac_${v.protocoloId}_${v.doseIdx}_${v.cavaloId}`,
      tipoItem: 'vacinacao',
      dataHora: dataHoraISO(v.dataPrevista, '09:00'),
      cavaloId: v.cavaloId, animalNome: nome,
      label: `${insumo?.nome || 'Vacina'} · ${v.dose?.label || `Dose ${v.doseIdx+1}`}`,
      sub: `Vacinação · ${v.protocoloNome || ''}`,
      _raw: { agendaItem: v },
    });
  });

  // ── VERMIFUGAÇÃO ──────────────────────────────────────────────
  const agendaVerm = calcAgendaVerm(protocolosVermifugacao || [], cavalos || [], vermifugacoesAnimais || []);
  agendaVerm.forEach(v => {
    if (!v.dataPrevista) return;
    const d = new Date(v.dataPrevista + 'T09:00:00');
    if (d < cutoffPassado || d > cutoffFuturo) return;
    const nome = cavalosMap.get(v.cavaloId)?.nome || '';
    const insumo = insumos.find(i => i.id === v.insumoId);
    itens.push({
      id: `verm_${v.protocoloId}_${v.cavaloId}_${v.etapaIdx ?? 0}_${v.dataPrevista}`,
      tipoItem: 'vermifugacao',
      dataHora: dataHoraISO(v.dataPrevista, '09:00'),
      cavaloId: v.cavaloId, animalNome: nome,
      label: `${insumo?.nome || 'Vermífugo'} · ${v.etapaLabel || v.protocoloNome || ''}`,
      sub: 'Vermifugação',
      _raw: { agendaItem: v },
    });
  });

  // ── PROGESTERONA ──────────────────────────────────────────────
  const programasMap = new Map((progProgramas || []).map(p => [p.id, p]));
  (progAplicacoes || []).forEach(apl => {
    if (apl.status !== 'programado') return;
    if (!apl.data) return;
    const d = new Date(apl.data + 'T09:00:00');
    if (d < cutoffPassado || d > cutoffFuturo) return;
    const prog = programasMap.get(apl.programaId);
    if (!prog || prog.status !== 'ativo') return;
    const nome = cavalosMap.get(prog.cavaloId)?.nome || '';
    const insumo = insumos.find(i => i.id === prog.insumoId);
    itens.push({
      id: `prog_${apl.id}`,
      tipoItem: 'progesterona',
      dataHora: dataHoraISO(apl.data, '09:00'),
      cavaloId: prog.cavaloId, animalNome: nome,
      label: `${insumo?.nome || 'Progesterona'} · ${prog.doseQtd || 1} ${insumo?.unidade || ''}`.trim(),
      sub: 'Progesterona',
      _raw: { aplicacao: apl, programa: prog },
    });
  });

  // ── GESTAÇÃO: parto previsto (informativo) ────────────────────
  (cavalos || []).forEach(c => {
    if (!c.presente) return;
    const dc = c.gestacao?.dataCobricao;
    if (!dc) return;
    const parto = new Date(dc + 'T09:00:00');
    parto.setDate(parto.getDate() + 340);
    if (parto < cutoffPassado || parto > cutoffFuturo) return;
    itens.push({
      id: `parto_${c.id}`,
      tipoItem: 'parto-previsto',
      dataHora: parto.toISOString(),
      cavaloId: c.id, animalNome: c.nome || '',
      label: 'Parto previsto',
      sub: `Cobricao ${dc}`,
      _raw: { cavalo: c },
    });
  });

  return itens.sort((a, b) => a.dataHora.localeCompare(b.dataHora));
}

// ─── Screen ────────────────────────────────────────────────────
export function CronogramaVetScreen({
  cavalos, insumos, servicos, currentUser,
  addRegistro, addAtividade, addProcedimento, deleteRegistro, deleteProcedimento,
  // Emergências
  emergencias, emergMedicacoes, emergAgendas, emergParametros,
  updateEmergMedicacao, addEmergParametro,
  frascosAbertos, addFrascoAberto, updateFrascoAberto,
  // Vacinação
  protocolosVacinacao, vacinacoesAnimais, upsertVacinacaoAnimal,
  // Vermifugação
  protocolosVermifugacao, vermifugacoesAnimais,
  addVermifugacaoAnimal,
  // Progesterona
  progProgramas, progAplicacoes, updateProgesteronaAplicacao,
  onBack, onAbrirEmergencia,
}) {
  const [itemAbertoId, setItemAbertoId] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('todos');

  const itens = useMemo(() => coletarTarefas({
    cavalos, insumos,
    emergencias, emergMedicacoes, emergAgendas, emergParametros,
    protocolosVacinacao, vacinacoesAnimais,
    protocolosVermifugacao, vermifugacoesAnimais,
    progProgramas, progAplicacoes,
  }), [
    cavalos, insumos,
    emergencias, emergMedicacoes, emergAgendas, emergParametros,
    protocolosVacinacao, vacinacoesAnimais,
    protocolosVermifugacao, vermifugacoesAnimais,
    progProgramas, progAplicacoes,
  ]);

  const itensFiltrados = useMemo(() => {
    if (filtroTipo === 'todos') return itens;
    if (filtroTipo === 'emergencia') return itens.filter(i => i.tipoItem.startsWith('emerg'));
    return itens.filter(i => i.tipoItem === filtroTipo);
  }, [itens, filtroTipo]);

  const marcarFeito = async (it) => {
    if (it.tipoItem === 'emerg-medicacao') {
      const { medicacao, emergencia } = it._raw;
      await marcarMedicacaoFeita({
        m: medicacao, emergencia, insumos, servicos, frascosAbertos,
        addRegistro, addProcedimento, addAtividade,
        updateEmergMedicacao, addFrascoAberto, updateFrascoAberto,
        currentUser,
      });
      return;
    }
    if (it.tipoItem === 'vacinacao') {
      const v = it._raw.agendaItem;
      const today = todayISO();
      const cavalo = cavalos.find(c => c.id === v.cavaloId);
      const vacinaId = v.dose?.insumoId || v.insumoId;
      const vacina = insumos.find(i => i.id === vacinaId);
      const vacId = `vac_${v.protocoloId}_${v.doseIdx}_${v.cavaloId}`;
      const ehMesAtual = today.slice(0,7) === today.slice(0,7);
      upsertVacinacaoAnimal({
        id: vacId, protocoloId: v.protocoloId, doseIdx: v.doseIdx,
        cavaloId: v.cavaloId, dataPrevista: v.dataPrevista,
        feito: true, feitoPor: currentUser?.nome || '', feitoEm: today + 'T12:00:00',
      });
      if (vacina && cavalo && ehMesAtual) {
        addRegistro && addRegistro({
          id: 'reg_vac_' + Date.now() + '_' + cavalo.id,
          cavaloId: cavalo.id, insumoId: vacina.id, qtd: 1,
          hora: nowHHMM(), usuario: currentUser?.nome || '', isAuto: false, data: today,
        });
        (vacina.descartaveis || []).forEach(d => {
          addRegistro && addRegistro({
            id: 'reg_vac_desc_' + d.insumoId + '_' + Date.now() + '_' + cavalo.id,
            cavaloId: cavalo.id, insumoId: d.insumoId, qtd: d.qtd || 1,
            hora: nowHHMM(), usuario: currentUser?.nome || '', isAuto: true, data: today,
          });
        });
      }
      if (vacina && cavalo) {
        addAtividade && addAtividade({
          id: 'at_vac_' + Date.now() + '_' + cavalo.id,
          tipo: 'vacinacao', cavaloId: cavalo.id, insumoId: vacina.id, qtd: 1,
          motivo: `${v.protocoloNome || ''} · ${v.dose?.label || 'Dose ' + (v.doseIdx+1)}`,
          usuario: currentUser?.nome || '', autor: currentUser?.nome || '',
          mes: today.slice(0,7), data: today, hora: nowHHMM(), texto: '',
        });
      }
      return;
    }
    if (it.tipoItem === 'vermifugacao') {
      const v = it._raw.agendaItem;
      const today = todayISO();
      const cavalo = cavalos.find(c => c.id === v.cavaloId);
      const insumo = insumos.find(i => i.id === v.insumoId);
      addVermifugacaoAnimal && addVermifugacaoAnimal({
        id: 'verm_' + Date.now() + '_' + v.cavaloId,
        protocoloId: v.protocoloId, cavaloId: v.cavaloId,
        dataRealizacao: today, produto: insumo?.nome || '',
        registradoPor: currentUser?.nome || '',
        etapaIdx: v.etapaIdx ?? null,
      });
      if (cavalo && insumo) {
        addAtividade && addAtividade({
          id: 'at_verm_' + Date.now() + '_' + cavalo.id,
          tipo: 'vermifugacao', cavaloId: cavalo.id, insumoId: insumo.id, qtd: 1,
          motivo: v.protocoloNome || '',
          usuario: currentUser?.nome || '', autor: currentUser?.nome || '',
          mes: today.slice(0,7), data: today, hora: nowHHMM(), texto: '',
        });
      }
      return;
    }
    if (it.tipoItem === 'progesterona') {
      const { aplicacao, programa } = it._raw;
      const insumo = insumos.find(i => i.id === programa.insumoId);
      const today = todayISO();
      const hora = nowHHMM();
      const usuario = currentUser?.nome || '';
      const rid = 'reg_prog_' + Date.now() + '_' + Math.random().toString(36).slice(2,5);
      let descartaveisRegistros = [];
      if (insumo) {
        addRegistro && addRegistro({
          id: rid, cavaloId: programa.cavaloId, insumoId: insumo.id,
          qtd: Number(programa.doseQtd) || 1,
          hora, usuario, isAuto: false, data: today,
        });
        addAtividade && addAtividade({
          id: 'at_' + rid, tipo: 'insumo', cavaloId: programa.cavaloId,
          insumoId: insumo.id, qtd: Number(programa.doseQtd) || 1,
          motivo: `Progesterona · ${insumo.nome}`,
          usuario, autor: usuario, mes: today.slice(0,7),
          data: today, hora, texto: '',
        });
        if (insumo.injetavel && insumo.descartaveis?.length) {
          descartaveisRegistros = addDescartaveis(
            addRegistro, insumo.id, programa.cavaloId, 1,
            insumos, hora, usuario, today
          );
        }
      }
      updateProgesteronaAplicacao && updateProgesteronaAplicacao(aplicacao.id, {
        status: 'feito', feitoEm: new Date().toISOString(),
        feitoPor: usuario, registroId: rid,
        descartaveisRegistros,
      });
      return;
    }
  };

  const TIPOS = [
    ['todos', 'Todos', 'var(--accent)'],
    ['emergencia', 'Emergências', '#dc2626'],
    ['vacinacao', 'Vacinação', '#1d4ed8'],
    ['vermifugacao', 'Vermifugação', '#15803d'],
    ['progesterona', 'Progesterona', '#9d174d'],
    ['parto-previsto', 'Partos', '#c2410c'],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 20px 0', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 22, padding: 0, cursor: 'pointer', lineHeight: 1 }}>‹</button>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)' }}>Cronograma Veterinário</div>
        </div>
        <div style={{ display: 'flex', overflowX: 'auto', gap: 6, paddingBottom: 10, WebkitOverflowScrolling: 'touch' }}>
          {TIPOS.map(([id, label, cor]) => {
            const ativo = filtroTipo === id;
            return (
              <button
                key={id}
                onClick={() => setFiltroTipo(id)}
                style={{
                  flexShrink: 0,
                  background: ativo ? cor : 'var(--card)',
                  color: ativo ? '#fff' : 'var(--ink)',
                  border: `1px solid ${ativo ? cor : 'var(--line)'}`,
                  borderRadius: 10, padding: '6px 12px',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--sans)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 90px' }}>
        <NavegacaoDias
          itens={itensFiltrados}
          destacaAtrasado
          emptyText="Nada pendente para essa faixa."
          renderItem={(it) => {
            const isParam = it.tipoItem === 'emerg-parametro';
            const abertoInline = itemAbertoId === it.id;
            const readOnly = it.tipoItem === 'parto-previsto';
            return (
              <React.Fragment key={it.id}>
                <ItemCronograma
                  it={it}
                  atrasado={new Date(it.dataHora) < new Date()}
                  mostraAnimal
                  ativa={abertoInline}
                  onBoxClick={isParam ? () => setItemAbertoId(abertoInline ? null : it.id) : undefined}
                  onAcao={!isParam && !readOnly ? () => marcarFeito(it) : undefined}
                  onAbrirFicha={it.tipoItem.startsWith('emerg') && onAbrirEmergencia
                    ? () => onAbrirEmergencia(it._raw.emergencia.id)
                    : undefined}
                />
                {isParam && abertoInline && (
                  <div style={{ marginBottom: 8, marginLeft: 12, borderLeft: '2px solid #b45309', paddingLeft: 10 }}>
                    <ParametroForm
                      initial={{ agendaId: it._raw.agenda.id, dataHora: it.dataHora }}
                      onCancel={() => setItemAbertoId(null)}
                      onSave={async (data) => {
                        await addEmergParametro({
                          ...data,
                          emergenciaId: it._raw.emergencia.id,
                          agendaId: it._raw.agenda.id,
                        });
                        setItemAbertoId(null);
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          }}
        />
      </div>
    </div>
  );
}
