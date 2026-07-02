// veterinaria.jsx
import React, { useState, useMemo, useRef } from 'react';
import { Icon } from './icons';
import { EmergenciasScreen } from './emergencias';
import { GestacaoPartosScreen } from './gestacao';
import { gerarPdfRelatorio, gerarResumoRelatorio, nomePdfRelatorio } from './utils/pdfRelatorioVet';
import { supabase } from './utils/supabase';
import { ReproducaoScreen, resumoReproducaoMes } from './reproducao';
import { addDescartaveis } from './data';
import { CronogramaVetScreen } from './cronograma-vet';

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

// ─── Anotações clínicas ────────────────────────────────────────
const TIPOS_ANOT = ['Cólica','Ferimento','Infecção','Doença','Cirurgia','Medicação','Exame','Acompanhamento','Outro'];
const TIPO_COR = { 'Cólica':'#dc2626','Ferimento':'#b45309','Infecção':'#7c3aed','Doença':'#0e7490','Cirurgia':'#9d174d','Medicação':'#1d4ed8','Exame':'#15803d','Acompanhamento':'#374151','Outro':'#6b7280' };
const GRAV_COR = { 'Leve':'#15803d','Moderada':'#b45309','Grave':'#dc2626' };
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
export function calcDoseDate(protocolo, doseIdx, cavalo) {
  const dose = protocolo.doses?.[doseIdx];
  if (!dose) return null;
  if (protocolo.tipo === 'gestante') return addDays(cavalo.gestacao?.dataCobricao, dose.diasDesdeEvento);
  if (protocolo.tipo === 'potro') return addDays(cavalo.nascimento, dose.diasDesdeEvento);
  return null;
}

// ─── Cutoff pra evitar backlog histórico ────────────────────
// Retorna true quando uma dose/etapa DEVE ser pulada. Usada só para itens
// ainda NÃO feitos — o histórico marcado como feito não é afetado.
// Duas condições (qualquer uma → pula):
//   1) Dose planejada ANTES da entrada do cavalo no haras (não é
//      responsabilidade do haras atual).
//   2) Dose mais de 90 dias no passado (janela realista de catch-up).
function isDoseHistoricaSemAplicacao(dataPrevista, cavalo) {
  if (!dataPrevista) return false;
  const cutoffAtraso = addDays(todayStr(), -90);
  if (dataPrevista < cutoffAtraso) return true;
  const dataEntrada = cavalo?.dataEntrada;
  if (dataEntrada && dataPrevista < dataEntrada) return true;
  return false;
}

export function calcAgendaVac(protocolos, cavalos, vacinacoesAnimais) {
  const feitas = new Set(vacinacoesAnimais.filter(v => v.feito).map(v => `${v.protocoloId}_${v.doseIdx}_${v.cavaloId}`));
  const cancelados = new Set(vacinacoesAnimais.filter(v => v.cancelado).map(v => `${v.protocoloId}_${v.doseIdx}_${v.cavaloId}`));
  const items = [];
  const today = todayStr();
  for (const prot of protocolos) {
    if (!prot.ativo) continue;

    // Evento único
    if (prot.eventoUnico) {
      const alvo = cavalos.filter(c => c.presente && (prot.animaisAlvo||[]).includes(c.id));
      for (const cavalo of alvo) {
        const key = `${prot.id}_0_${cavalo.id}`;
        if (feitas.has(key) || cancelados.has(key)) continue;
        items.push({
          key, protocoloId: prot.id, protocoloNome: prot.nome,
          doseIdx: 0, dose: { insumoId: prot.insumoId, label: 'Aplicação única' },
          cavaloId: cavalo.id, cavaloNome: cavalo.nome,
          dataPrevista: prot.dataFixa, feito: false,
          diasRestantes: diffDays(prot.dataFixa),
        });
      }
      continue;
    }

    // Recorrente por intervalo + animaisAlvo (sem doses por evento)
    const isEtapas = (prot.tipo === 'gestante' || prot.tipo === 'potro') && (prot.doses||[]).length > 0 && !(prot.animaisAlvo||[]).length;
    if (!isEtapas && (prot.animaisAlvo||[]).length > 0 && prot.intervaloDias > 0) {
      const alvo = cavalos.filter(c => c.presente && prot.animaisAlvo.includes(c.id));
      for (const cavalo of alvo) {
        const historico = vacinacoesAnimais
          .filter(v => v.cavaloId === cavalo.id && v.protocoloId === prot.id && v.feito)
          .sort((a, b) => (b.feitoEm||'').localeCompare(a.feitoEm||''));
        const ultimo = historico[0];
        const dataPrev = ultimo
          ? addDays((ultimo.feitoEm||'').slice(0,10) || ultimo.dataPrevista, prot.intervaloDias)
          : addDays(today, -1);
        const nextIdx = historico.length;
        const key = `${prot.id}_${nextIdx}_${cavalo.id}`;
        if (feitas.has(key) || cancelados.has(key)) continue;
        items.push({
          key, protocoloId: prot.id, protocoloNome: prot.nome,
          doseIdx: nextIdx, dose: { insumoId: prot.insumoId, label: 'Recorrente' },
          cavaloId: cavalo.id, cavaloNome: cavalo.nome,
          dataPrevista: dataPrev, feito: false,
          diasRestantes: diffDays(dataPrev),
        });
      }
      continue;
    }

    // Etapas (legacy: gestante/potro com doses por evento)
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
        const jaFeito = feitas.has(key);
        if (cancelados.has(key)) continue;
        // Pula doses históricas não aplicáveis ao cavalo atual (ex.: cavalo
        // nascido em 2006 sendo cadastrado agora — não fazer o vet clicar
        // Aplicar em dose de 2006).
        if (!jaFeito && isDoseHistoricaSemAplicacao(dataPrev, cavalo)) continue;
        items.push({
          key, protocoloId: prot.id, protocoloNome: prot.nome,
          doseIdx: i, dose: prot.doses[i],
          cavaloId: cavalo.id, cavaloNome: cavalo.nome,
          dataPrevista: dataPrev, feito: jaFeito,
          diasRestantes: diffDays(dataPrev),
        });
      }
    }
  }
  return items;
}

// ─── Categorias de protocolo (filtros para pré-seleção) ──────
const CATEGORIAS_PROTOCOLO = [
  { key: 'tropa_geral',   label: 'Tropa geral',     filter: () => true },
  { key: 'recem_nascido', label: 'Recém-nascidos',  filter: c => c.nascimento && diffDays(todayStr(), c.nascimento) <= 30 },
  { key: 'potro_ao_pe',   label: 'Potros ao pé',    filter: c => (c.categorias||[]).includes('Potro ao pé') || (c.nascimento && diffDays(todayStr(), c.nascimento) > 30 && diffDays(todayStr(), c.nascimento) <= 180) },
  { key: 'potro',         label: 'Potros',          filter: c => (c.categorias||[]).includes('Potro') || (c.nascimento && diffDays(todayStr(), c.nascimento) <= 730) },
  { key: 'jovem',         label: 'Jovens',          filter: c => (c.categorias||[]).includes('Jovem') },
  { key: 'adulto',        label: 'Adultos',         filter: c => (c.categorias||[]).includes('Adulto') },
  { key: 'gestante',      label: 'Éguas gestantes', filter: c => (c.categorias||[]).includes('Gestante') || !!c.gestacao?.dataCobricao },
  { key: 'matriz',        label: 'Matrizes',        filter: c => (c.categorias||[]).includes('Matriz') },
  { key: 'doadora',       label: 'Doadoras',        filter: c => (c.categorias||[]).includes('Doadora') },
  { key: 'receptora',     label: 'Receptoras',      filter: c => (c.categorias||[]).includes('Receptora') },
  { key: 'garanhao',      label: 'Garanhões',       filter: c => (c.categorias||[]).includes('Garanhão') },
  { key: 'castrado',      label: 'Castrados',       filter: c => (c.categorias||[]).includes('Castrado') },
];

// ─── Vermifugação: cálculo de agenda ──────────────────────────
export function calcAgendaVerm(protocolos, cavalos, vermifugacoesAnimais) {
  const items = [];
  const today = todayStr();
  for (const prot of protocolos) {
    if (!prot.ativo) continue;
    if (prot.subtipo === 'opg') continue;
    if (prot.eventoUnico || prot.tipo === 'unico') {
      const alvo = cavalos.filter(c => c.presente && (prot.animaisAlvo||[]).includes(c.id));
      for (const cavalo of alvo) {
        const feito = (vermifugacoesAnimais || []).some(v => v.cavaloId === cavalo.id && v.protocoloId === prot.id);
        if (feito) continue;
        items.push({
          key: `verm_unico_${prot.id}_${cavalo.id}`,
          protocoloId: prot.id, protocoloNome: prot.nome,
          cavaloId: cavalo.id, cavaloNome: cavalo.nome,
          dataPrevista: prot.dataFixa,
          diasRestantes: diffDays(prot.dataFixa),
          ultimaRealizacao: null,
          insumoId: prot.insumoId,
        });
      }
      continue;
    }
    const isEtapas = (prot.etapas||[]).length > 0 && (prot.tipo === 'potro' || prot.tipo === 'gestante' || prot.eventoReferencia);
    const ref = prot.eventoReferencia || (prot.tipo === 'gestante' ? 'cobertura' : 'nascimento');
    const getBase = (c) => ref === 'cobertura' ? c.gestacao?.dataCobricao : c.nascimento;
    const alvo = cavalos.filter(c => {
      if (!c.presente) return false;
      if (isEtapas) {
        if (ref === 'cobertura') return !!c.gestacao?.dataCobricao;
        return !!c.nascimento && diffDays(today, c.nascimento) <= 730;
      }
      if (prot.animaisAlvo && prot.animaisAlvo.length > 0) return prot.animaisAlvo.includes(c.id);
      if (prot.tipo === 'gestante') return !!(c.categorias||[]).includes('Gestante') || !!c.gestacao?.dataCobricao;
      if (prot.tipo === 'potro') return !!c.nascimento && diffDays(today, c.nascimento) <= 730;
      return true;
    });
    for (const cavalo of alvo) {
      if (isEtapas) {
        const baseDate = getBase(cavalo);
        prot.etapas.forEach((etapa, etapaIdx) => {
          if (etapa.subtipo === 'opg') return;
          const dataPrevista = addDays(baseDate, etapa.diasDesdeNascimento);
          if (!dataPrevista) return;
          const registro = (vermifugacoesAnimais || []).find(v =>
            v.cavaloId === cavalo.id && v.protocoloId === prot.id && v.etapaIdx === etapaIdx
          );
          const feito = registro && !registro.cancelado;
          const cancelado = registro && registro.cancelado;
          if (cancelado) return; // dose cancelada — não mostrar
          if (!feito) {
            // Pula etapa histórica não aplicável (mesma regra da vacinação).
            if (isDoseHistoricaSemAplicacao(dataPrevista, cavalo)) return;
            items.push({
              key: `verm_${prot.id}_${cavalo.id}_${etapaIdx}`,
              protocoloId: prot.id, protocoloNome: prot.nome,
              cavaloId: cavalo.id, cavaloNome: cavalo.nome,
              dataPrevista, diasRestantes: diffDays(dataPrevista),
              ultimaRealizacao: null,
              insumoId: etapa.insumoId || '',
              etapaIdx, etapaLabel: etapa.label || `Etapa ${etapaIdx + 1}`,
            });
          }
        });
      } else {
        // Intervalo por histórico — ignora rows canceladas no cálculo do próximo
        const historico = (vermifugacoesAnimais || [])
          .filter(v => v.cavaloId === cavalo.id && v.protocoloId === prot.id && v.etapaIdx == null && !v.cancelado)
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
  }
  return items;
}

// ─── OPG: cálculo de agenda ───────────────────────────────────
function calcAgendaOpg(protocolos, cavalos, opgs) {
  const items = [];
  const today = todayStr();
  for (const prot of protocolos) {
    if (!prot.ativo) continue;

    // Evento único OPG
    if ((prot.eventoUnico || prot.tipo === 'unico') && prot.subtipo === 'opg') {
      const alvo = cavalos.filter(c => c.presente && (prot.animaisAlvo||[]).includes(c.id));
      for (const cavalo of alvo) {
        const feito = (opgs || []).some(o => o.cavaloId === cavalo.id && o.protocoloId === prot.id && o.aplicado);
        if (feito) continue;
        const opgPendente = (opgs || []).find(o => o.cavaloId === cavalo.id && o.protocoloId === prot.id && !o.aplicado) || null;
        items.push({
          key: `opg_unico_${prot.id}_${cavalo.id}`,
          isOpg: true,
          protocoloId: prot.id, protocoloNome: prot.nome,
          cavaloId: cavalo.id, cavaloNome: cavalo.nome,
          laboratorio: prot.laboratorio || '',
          servicoId: prot.servicoId || '',
          dataPrevista: prot.dataFixa,
          diasRestantes: diffDays(prot.dataFixa),
          ultimaColeta: null,
          opgPendente,
          isSequencial: false,
        });
      }
      continue;
    }

    // Etapas com OPG (potro ou gestante)
    if ((prot.etapas||[]).length > 0 && (prot.tipo === 'potro' || prot.tipo === 'gestante' || prot.eventoReferencia)) {
      const ref = prot.eventoReferencia || (prot.tipo === 'gestante' ? 'cobertura' : 'nascimento');
      const alvo = cavalos.filter(c => {
        if (!c.presente) return false;
        if (ref === 'cobertura') return !!c.gestacao?.dataCobricao;
        return !!c.nascimento && diffDays(today, c.nascimento) <= 730;
      });
      for (const cavalo of alvo) {
        const baseDate = ref === 'cobertura' ? cavalo.gestacao?.dataCobricao : cavalo.nascimento;
        prot.etapas.forEach((etapa, etapaIdx) => {
          if (etapa.subtipo !== 'opg') return;
          const dataPrevista = addDays(baseDate, etapa.diasDesdeNascimento);
          if (!dataPrevista) return;
          const feito = (opgs || []).find(o =>
            o.cavaloId === cavalo.id && o.protocoloId === prot.id && o.etapaIdx === etapaIdx && o.aplicado
          );
          if (feito) return;
          // Pula etapa histórica sem aplicação (mesma regra da vac/verm):
          // não faz sentido gerar exames de OPG de anos atrás pra um cavalo
          // que nasceu antes da existência do protocolo.
          if (isDoseHistoricaSemAplicacao(dataPrevista, cavalo)) return;
          const opgPendente = (opgs || []).find(o =>
            o.cavaloId === cavalo.id && o.protocoloId === prot.id && o.etapaIdx === etapaIdx && !o.aplicado
          ) || null;
          items.push({
            key: `opg_${prot.id}_${cavalo.id}_${etapaIdx}`,
            isOpg: true,
            protocoloId: prot.id, protocoloNome: prot.nome,
            cavaloId: cavalo.id, cavaloNome: cavalo.nome,
            laboratorio: etapa.laboratorio || prot.laboratorio || '',
            servicoId: etapa.servicoId || prot.servicoId || '',
            dataPrevista, diasRestantes: diffDays(dataPrevista),
            ultimaColeta: null, opgPendente,
            etapaIdx, etapaLabel: etapa.label || `OPG Etapa ${etapaIdx + 1}`,
            isSequencial: false,
          });
        });
      }
      continue;
    }

    // Regular OPG protocol (subtipo === 'opg')
    if (prot.subtipo !== 'opg') continue;
    const alvo = cavalos.filter(c => {
      if (!c.presente) return false;
      if (prot.animaisAlvo && prot.animaisAlvo.length > 0) return prot.animaisAlvo.includes(c.id);
      if (prot.tipo === 'gestante') return !!(c.categorias||[]).includes('Gestante') || !!c.gestacao?.dataCobricao;
      if (prot.tipo === 'potro') return !!c.nascimento && diffDays(today, c.nascimento) <= 730;
      return true;
    });
    for (const cavalo of alvo) {
      const historico = (opgs || [])
        .filter(o => o.cavaloId === cavalo.id && o.protocoloId === prot.id && o.aplicado)
        .sort((a, b) => b.dataColeta.localeCompare(a.dataColeta));
      const ultimo = historico[0];
      const dataPrevista = ultimo?.proximaData
        ? ultimo.proximaData
        : ultimo
          ? addDays(ultimo.dataColeta, prot.intervaloDias)
          : addDays(today, -1);
      const opgPendente = (opgs || []).find(o =>
        o.cavaloId === cavalo.id && o.protocoloId === prot.id && !o.aplicado
      ) || null;
      items.push({
        key: `opg_${prot.id}_${cavalo.id}`,
        isOpg: true,
        protocoloId: prot.id, protocoloNome: prot.nome,
        cavaloId: cavalo.id, cavaloNome: cavalo.nome,
        laboratorio: prot.laboratorio || '',
        servicoId: prot.servicoId || '',
        dataPrevista, diasRestantes: diffDays(dataPrevista),
        ultimaColeta: ultimo?.dataColeta || null,
        opgPendente, isSequencial: true,
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
  servicos, registros, procedimentos, empresaInfo,
  currentUser, addRegistro, addAtividade, addProcedimento, addAviso,
  deleteRegistro, deleteProcedimento,
  protocolosVacinacao, vacinacoesAnimais,
  addProtocoloVacinacao, updateProtocoloVacinacao, deleteProtocoloVacinacao,
  upsertVacinacaoAnimal,
  protocolosVermifugacao, vermifugacoesAnimais, opgs,
  addProtocoloVermifugacao, updateProtocoloVermifugacao, deleteProtocoloVermifugacao,
  addVermifugacaoAnimal, addOpg, updateOpg, deleteOpg,
  medicoes, addMedicao, updateMedicao, deleteMedicao,
  anotacoesClinicas, addAnotacaoClinica, updateAnotacaoClinica, deleteAnotacaoClinica,
  exames, uploadExame, deleteExame,
  registrosReproducao, addRegistroReproducao, deleteRegistroReproducao,
  // Emergências
  emergencias, emergMedicacoes, emergAgendas, emergParametros, emergNotas, emergExames,
  addEmergencia, updateEmergencia, encerrarEmergencia, deleteEmergencia,
  addEmergMedicacao, updateEmergMedicacao, deleteEmergMedicacao,
  addEmergAgenda, updateEmergAgenda, deleteEmergAgenda,
  addEmergParametro, updateEmergParametro, deleteEmergParametro,
  addEmergNota, updateEmergNota, deleteEmergNota,
  uploadEmergExame, deleteEmergExame,
  frascosAbertos, addFrascoAberto, updateFrascoAberto,
  progProgramas, progAplicacoes,
  addProgesteronaPrograma, encerrarProgesteronaPrograma, deleteProgesteronaPrograma,
  updateProgesteronaAplicacao,
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
        insumos={insumos} currentUser={currentUser}
        progProgramas={progProgramas} progAplicacoes={progAplicacoes}
        addProgesteronaPrograma={addProgesteronaPrograma}
        encerrarProgesteronaPrograma={encerrarProgesteronaPrograma}
        deleteProgesteronaPrograma={deleteProgesteronaPrograma}
        updateProgesteronaAplicacao={updateProgesteronaAplicacao}
        addRegistro={addRegistro} deleteRegistro={deleteRegistro} addAtividade={addAtividade}
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
        addAtividade={addAtividade} addRegistro={addRegistro}
        protocolos={protocolosVermifugacao || []}
        vermifugacoesAnimais={vermifugacoesAnimais || []}
        opgs={opgs || []}
        addProtocolo={addProtocoloVermifugacao}
        updateProtocolo={updateProtocoloVermifugacao}
        deleteProtocolo={deleteProtocoloVermifugacao}
        addVermifugacao={addVermifugacaoAnimal}
        addOpg={addOpg} updateOpg={updateOpg} deleteOpg={deleteOpg}
        addProcedimento={addProcedimento}
        servicos={servicos || []}
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
  if (secao === 'anotacoes') {
    return (
      <AnotacoesClinicasScreen
        cavalos={cavalos} insumos={insumos || []} servicos={servicos || []}
        currentUser={currentUser}
        anotacoesClinicas={anotacoesClinicas || []}
        addAnotacaoClinica={addAnotacaoClinica}
        updateAnotacaoClinica={updateAnotacaoClinica}
        deleteAnotacaoClinica={deleteAnotacaoClinica}
        addRegistro={addRegistro} addAtividade={addAtividade}
        addProcedimento={addProcedimento}
        deleteRegistro={deleteRegistro} deleteProcedimento={deleteProcedimento}
        onBack={() => setSecao(null)}
      />
    );
  }
  if (secao === 'relatorio') {
    return (
      <RelatorioVetScreen
        cavalos={cavalos} insumos={insumos || []} servicos={servicos || []}
        anotacoesClinicas={anotacoesClinicas || []}
        medicoes={medicoes || []}
        registros={registros || []}
        procedimentos={procedimentos || []}
        empresaInfo={empresaInfo || {}}
        registrosReproducao={registrosReproducao || []}
        onBack={() => setSecao(null)}
      />
    );
  }
  if (secao === 'exames') {
    return (
      <ExamesComplementaresScreen
        cavalos={cavalos}
        exames={exames || []}
        uploadExame={uploadExame}
        deleteExame={deleteExame}
        onBack={() => setSecao(null)}
      />
    );
  }
  if (secao === 'reproducao') {
    return (
      <ReproducaoScreen
        cavalos={cavalos} insumos={insumos || []}
        registrosReproducao={registrosReproducao || []}
        addRegistroReproducao={addRegistroReproducao}
        deleteRegistroReproducao={deleteRegistroReproducao}
        addRegistro={addRegistro} addAtividade={addAtividade}
        addAviso={addAviso}
        currentUser={currentUser}
        onBack={() => setSecao(null)}
      />
    );
  }
  if (secao === 'cronograma') {
    return (
      <CronogramaVetScreen
        cavalos={cavalos} insumos={insumos || []} servicos={servicos || []}
        currentUser={currentUser}
        addRegistro={addRegistro} addAtividade={addAtividade}
        addProcedimento={addProcedimento}
        deleteRegistro={deleteRegistro} deleteProcedimento={deleteProcedimento}
        emergencias={emergencias || []}
        emergMedicacoes={emergMedicacoes || []}
        emergAgendas={emergAgendas || []}
        emergParametros={emergParametros || []}
        updateEmergMedicacao={updateEmergMedicacao}
        addEmergParametro={addEmergParametro}
        frascosAbertos={frascosAbertos || []}
        addFrascoAberto={addFrascoAberto}
        updateFrascoAberto={updateFrascoAberto}
        protocolosVacinacao={protocolosVacinacao || []}
        vacinacoesAnimais={vacinacoesAnimais || []}
        upsertVacinacaoAnimal={upsertVacinacaoAnimal}
        protocolosVermifugacao={protocolosVermifugacao || []}
        vermifugacoesAnimais={vermifugacoesAnimais || []}
        addVermifugacaoAnimal={addVermifugacaoAnimal}
        progProgramas={progProgramas || []}
        progAplicacoes={progAplicacoes || []}
        updateProgesteronaAplicacao={updateProgesteronaAplicacao}
        onBack={() => setSecao(null)}
        onAbrirEmergencia={() => setSecao('emergencias')}
      />
    );
  }
  if (secao === 'emergencias') {
    return (
      <EmergenciasScreen
        cavalos={cavalos} currentUser={currentUser}
        insumos={insumos || []} servicos={servicos || []}
        emergencias={emergencias || []}
        emergMedicacoes={emergMedicacoes || []}
        emergAgendas={emergAgendas || []}
        emergParametros={emergParametros || []}
        emergNotas={emergNotas || []}
        emergExames={emergExames || []}
        addEmergencia={addEmergencia}
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
        frascosAbertos={frascosAbertos || []}
        addFrascoAberto={addFrascoAberto}
        updateFrascoAberto={updateFrascoAberto}
        onBack={() => setSecao(null)}
      />
    );
  }

  const animaisMedidos = new Set((medicoes || []).map(m => m.cavaloId)).size;
  const totalAnotacoes = (anotacoesClinicas || []).length;
  const totalExames = (exames || []).length;
  const emergenciasAtivas = (emergencias || []).filter(e => e.status === 'ativa').length;

  const hojeStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const tarefasHoje =
    agendaVac.filter(i => !i.feito && i.dataPrevista === hojeStr).length +
    agendaVerm.filter(i => i.dataPrevista === hojeStr).length +
    (emergMedicacoes || []).filter(m => m.status === 'programado' && m.data === hojeStr).length +
    (progAplicacoes || []).filter(a => a.status === 'programado' && a.data === hojeStr).length;

  const CARDS = [
    {
      id: 'emergencias', label: 'Emergências', icon: 'medical-cross', cor: '#dc2626', bg: '#fee2e2',
      badge: emergenciasAtivas > 0 ? `${emergenciasAtivas} ativa${emergenciasAtivas > 1 ? 's' : ''}` : 'Painel · plantão',
      badgeCor: emergenciasAtivas > 0 ? '#dc2626' : '#6b7280',
    },
    { id: 'anotacoes', label: 'Anotações\nClínicas', icon: 'edit', cor: '#7c3aed', bg: '#f3e8ff', badge: totalAnotacoes > 0 ? `${totalAnotacoes} registro${totalAnotacoes>1?'s':''}` : 'Novo', badgeCor: '#7c3aed' },
    { id: 'reproducao', label: 'Reprodução', icon: 'sperm-egg', cor: '#7c2d8c', bg: '#f5e8ff', badge: (registrosReproducao||[]).length > 0 ? `${(registrosReproducao||[]).length} registro${(registrosReproducao||[]).length>1?'s':''}` : 'Caderno · Planner', badgeCor: '#7c2d8c' },
    {
      id: 'gestacao', label: 'Gestação\ne Parto', icon: 'heart', cor: '#9d174d', bg: '#fce7f3',
      badge: gestantes.length > 0 ? `${gestantes.length} gestante${gestantes.length > 1 ? 's' : ''}` : null,
    },
    {
      id: 'vacinacao', label: 'Vacinação', icon: 'syringe', cor: '#1d4ed8', bg: '#dbeafe',
      badge: dosesVacPend > 0 ? `${dosesVacPend} pendente${dosesVacPend > 1 ? 's' : ''}` : `${agendaVac.filter(i=>!i.feito).length} agendadas`,
      badgeCor: dosesVacPend > 0 ? '#dc2626' : '#6b7280',
    },
    {
      id: 'vermifugacao', label: 'Vermifugação', icon: 'worm', cor: '#15803d', bg: '#dcfce7',
      badge: dosesVermPend > 0 ? `${dosesVermPend} pendente${dosesVermPend > 1 ? 's' : ''}` : `${agendaVerm.length} agendados`,
      badgeCor: dosesVermPend > 0 ? '#dc2626' : '#6b7280',
    },
    { id: 'desenvolvimento', label: 'Desenvolvimento', icon: 'bar-chart', cor: '#b45309', bg: '#fef3c7', badge: animaisMedidos > 0 ? `${(medicoes||[]).length} medições` : 'Biometria', badgeCor: '#b45309' },
    { id: 'exames', label: 'Exames\nComplementares', icon: 'test-tube', cor: '#0e7490', bg: '#cffafe', badge: totalExames > 0 ? `${totalExames} arquivo${totalExames>1?'s':''}` : 'PDF · Imagens', badgeCor: '#0e7490' },
    { id: 'relatorio', label: 'Relatório\nVeterinário', icon: 'clipboard', cor: '#374151', bg: '#f3f4f6', badge: 'Por animal · mês', badgeCor: '#374151' },
    {
      id: 'cronograma', label: 'Cronograma\nVeterinário', icon: 'clock', cor: '#0f766e', bg: '#ccfbf1',
      badge: tarefasHoje > 0 ? `${tarefasHoje} hoje` : 'Agenda central',
      badgeCor: tarefasHoje > 0 ? '#0f766e' : '#6b7280',
    },
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
    const vacinaId = item.dose?.insumoId || item.insumoId;
    const vacina = insumos.find(i => i.id === vacinaId);
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

  const handleCancelarVacina = (item) => {
    if (!window.confirm('Cancelar esta dose de vacina? Ela some da agenda.')) return;
    const vacId = `vac_${item.protocoloId}_${item.doseIdx}_${item.cavaloId}`;
    upsertVacinacao({
      id: vacId, protocoloId: item.protocoloId, doseIdx: item.doseIdx,
      cavaloId: item.cavaloId, dataPrevista: item.dataPrevista,
      feito: false, cancelado: true,
      canceladoPor: currentUser?.nome || '', canceladoEm: new Date().toISOString(),
    });
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
            {atrasadas.length > 0 && <AgendaGrupo titulo="Atrasadas" cor="#dc2626" items={atrasadas} cavalos={cavalos} insumos={insumos} onVacinar={handleVacinar} onCancelar={handleCancelarVacina} protocolos={protocolos} />}
            {hoje.length > 0 && <AgendaGrupo titulo="Hoje" cor="var(--accent)" items={hoje} cavalos={cavalos} insumos={insumos} onVacinar={handleVacinar} onCancelar={handleCancelarVacina} protocolos={protocolos} />}
            {proximas.length > 0 && <AgendaGrupo titulo="Próximos 30 dias" cor="#b45309" items={proximas} cavalos={cavalos} insumos={insumos} onVacinar={handleVacinar} onCancelar={handleCancelarVacina} protocolos={protocolos} />}
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
              <ProtocoloVacForm initial={editProt} insumos={insumos} cavalos={cavalos||[]}
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
function AgendaGrupo({ titulo, cor, items, cavalos, insumos, onVacinar, onCancelar, collapsed: initCollapsed = false, protocolos = [] }) {
  const [open, setOpen] = useState(!initCollapsed);
  return (
    <div style={{ marginBottom: 18 }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', padding: '4px 0 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: '100%' }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: cor }}>{titulo}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>({items.length})</span>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink-3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
      </button>
      {open && items.map(item => (
        <AgendaItem key={item.key} item={item} cavalos={cavalos} insumos={insumos} onVacinar={onVacinar} onCancelar={onCancelar} cor={getProtColor(item.protocoloId, protocolos) || cor} />
      ))}
    </div>
  );
}

function AgendaItem({ item, cavalos, insumos, onVacinar, onCancelar, cor }) {
  const [confirmando, setConfirmando] = useState(false);
  const [dataReal, setDataReal] = useState(item.dataPrevista < todayStr() ? item.dataPrevista : todayStr());
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
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmando(true)} style={{ background: cor, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Aplicar ✓</button>
                {onCancelar && (
                  <button onClick={() => onCancelar(item)} title="Cancelar esta dose" style={{ background: 'transparent', color: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>⊘</button>
                )}
              </div>
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
  const hasDoses = (protocolo.doses||[]).length > 0 && !(protocolo.animaisAlvo||[]).length;
  const isUnico = !!protocolo.eventoUnico;
  const nAnimais = (protocolo.animaisAlvo||[]).length;
  const insumoUnico = insumos.find(i => i.id === protocolo.insumoId);
  return (
    <div style={{ background: 'var(--card)', border: `1px solid ${cor}30`, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'none', border: 'none', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: cor+'20', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="stethoscope" size={20} color={cor} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{protocolo.nome}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
            {isUnico && <span style={{ fontSize:10, background:'#fff7ed', color:'#9a3412', borderRadius:4, padding:'1px 6px', marginRight:6, fontWeight:700 }}>EVENTO ÚNICO</span>}
            {hasDoses
              ? `${TIPO_LABELS[protocolo.tipo]} · ${protocolo.doses.length} dose${protocolo.doses.length!==1?'s':''}`
              : isUnico
                ? `${protocolo.dataFixa ? new Date(protocolo.dataFixa+'T12:00:00').toLocaleDateString('pt-BR') : '—'} · ${nAnimais} animal(is)`
                : `Recorrente · ${protocolo.intervaloDias} dias · ${nAnimais} animal(is)`}
          </div>
        </div>
        <span style={{ fontSize: 16, color: 'var(--ink-3)', transform: open?'rotate(90deg)':'none', transition: 'transform 0.15s' }}>›</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          {protocolo.descricao && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10, fontStyle: 'italic' }}>{protocolo.descricao}</div>}
          {hasDoses ? (
            <>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Doses · a partir da {TIPO_EVENTO[protocolo.tipo]||''}</div>
              {protocolo.doses.map((dose, i) => {
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
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>
                <span style={{ color: 'var(--ink-3)' }}>Vacina: </span>{insumoUnico?.nome||'—'}
              </div>
              {isUnico ? (
                <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>
                  <span style={{ color: 'var(--ink-3)' }}>Data: </span>{protocolo.dataFixa ? new Date(protocolo.dataFixa+'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>
                  <span style={{ color: 'var(--ink-3)' }}>Intervalo: </span>{protocolo.intervaloDias} dias
                </div>
              )}
              <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>
                <span style={{ color: 'var(--ink-3)' }}>Animais: </span>{nAnimais}
              </div>
            </>
          )}
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
function ProtocoloVacForm({ initial, insumos, cavalos, onSave, onCancel }) {
  const [nome, setNome] = useState(initial?.nome||'');
  const hasLegacyDoses = (initial?.doses||[]).length > 0 && (initial?.tipo === 'gestante' || initial?.tipo === 'potro') && !(initial?.animaisAlvo||[]).length;
  const [modoEtapas, setModoEtapas] = useState(hasLegacyDoses);
  const [tipo, setTipo] = useState(initial?.tipo === 'gestante' || initial?.tipo === 'potro' ? initial.tipo : 'gestante');
  const [descricao, setDescricao] = useState(initial?.descricao||'');
  const [doses, setDoses] = useState(initial?.doses?.length ? initial.doses : [{ insumoId:'', diasDesdeEvento:150, label:'' }]);
  const [insumoId, setInsumoId] = useState(initial?.insumoId||'');
  const [intervaloDias, setIntervaloDias] = useState(initial?.intervaloDias||365);
  const [eventoUnico, setEventoUnico] = useState(!!initial?.eventoUnico);
  const [dataFixa, setDataFixa] = useState(initial?.dataFixa||'');
  const [animaisAlvo, setAnimaisAlvo] = useState(initial?.animaisAlvo||[]);
  const [animalSearch, setAnimalSearch] = useState('');

  const insumosVacina = [...insumos].filter(i=>i.categoria==='vacina').sort((a,b)=>a.nome.localeCompare(b.nome,'pt'));
  const cavalosPresentes = (cavalos||[]).filter(c=>c.presente).sort((a,b)=>a.nome.localeCompare(b.nome,'pt'));
  const cavalosFiltrados = animalSearch.trim() ? cavalosPresentes.filter(c=>c.nome.toLowerCase().includes(animalSearch.trim().toLowerCase())) : cavalosPresentes;

  const categoriasMarcadas = CATEGORIAS_PROTOCOLO.filter(cat => {
    const matches = cavalosPresentes.filter(cat.filter);
    return matches.length > 0 && matches.every(c => animaisAlvo.includes(c.id));
  }).map(c => c.key);

  const toggleCategoria = (catKey) => {
    const cat = CATEGORIAS_PROTOCOLO.find(c => c.key === catKey);
    if (!cat) return;
    const matchingIds = cavalosPresentes.filter(cat.filter).map(c => c.id);
    if (categoriasMarcadas.includes(catKey)) {
      setAnimaisAlvo(prev => prev.filter(id => !matchingIds.includes(id)));
    } else {
      setAnimaisAlvo(prev => Array.from(new Set([...prev, ...matchingIds])));
    }
  };

  const addDose = () => setDoses(d => [...d, { insumoId:'', diasDesdeEvento:0, label:'' }]);
  const removeDose = i => setDoses(d => d.filter((_,idx) => idx!==i));
  const updateDose = (i, field, val) => setDoses(d => d.map((d2,idx) => idx===i ? {...d2,[field]:val} : d2));
  const toggleAnimal = id => setAnimaisAlvo(a => a.includes(id) ? a.filter(x=>x!==id) : [...a, id]);
  const selectAllAnimais = () => setAnimaisAlvo(cavalosPresentes.map(c=>c.id));
  const clearAnimais = () => setAnimaisAlvo([]);
  const canSave = nome.trim() && (
    modoEtapas ? (doses.length>0 && doses.every(d => d.insumoId && d.diasDesdeEvento>0)) :
    eventoUnico ? (insumoId && dataFixa && animaisAlvo.length>0) :
    (insumoId && intervaloDias>0 && animaisAlvo.length>0)
  );
  const EVENTO_LABEL = { gestante:'data de cobertura', potro:'data de nascimento' };

  const handleSave = () => {
    if (modoEtapas) {
      onSave({ nome:nome.trim(), tipo, descricao, doses, insumoId:'', intervaloDias:0, eventoUnico:false, dataFixa:null, animaisAlvo:[], ativo:true });
    } else if (eventoUnico) {
      onSave({ nome:nome.trim(), tipo:'geral', descricao, doses:[], insumoId, intervaloDias:0, eventoUnico:true, dataFixa, animaisAlvo, ativo:true });
    } else {
      onSave({ nome:nome.trim(), tipo:'geral', descricao, doses:[], insumoId, intervaloDias, eventoUnico:false, dataFixa:null, animaisAlvo, ativo:true });
    }
  };

  return (
    <div style={{ background: 'var(--soft)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>{initial?'Editar protocolo':'Novo protocolo vacinal'}</div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Nome do protocolo</div>
        <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Influenza Tropa…" style={inputSt} />
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:modoEtapas?'#dbeafe':'var(--card)', border:`1px solid ${modoEtapas?'#1d4ed8':'var(--line)'}`, borderRadius:10, cursor:'pointer' }}>
          <input type="checkbox" checked={modoEtapas} onChange={e=>setModoEtapas(e.target.checked)} style={{ width:18, height:18, cursor:'pointer' }} />
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>Etapas baseadas em datas</div>
            <div style={{ fontSize:11, color:'var(--ink-3)' }}>Cada dose é agendada a partir da data de cobertura (gestantes) ou nascimento (potros) de cada animal.</div>
          </div>
        </label>
      </div>

      {modoEtapas ? (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Aplicar em</div>
            <select value={tipo} onChange={e=>setTipo(e.target.value)} style={inputSt}>
              <option value="gestante">Éguas gestantes</option>
              <option value="potro">Potros</option>
            </select>
          </div>
          <div style={{ background:'#dbeafe', borderRadius:10, padding:'8px 12px', fontSize:12, color:'#1d4ed8', marginBottom:14 }}>
            Os dias são contados a partir da <strong>{EVENTO_LABEL[tipo]}</strong>.
          </div>
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
                  {insumosVacina.map(ins=><option key={ins.id} value={ins.id}>{ins.nome}</option>)}
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
        </>
      ) : (
        <>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Vacina (insumo)</div>
            <select value={insumoId} onChange={e=>setInsumoId(e.target.value)} style={inputSt}>
              <option value="">— selecionar —</option>
              {insumosVacina.map(i=><option key={i.id} value={i.id}>{i.nome}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Intervalo entre aplicações</div>
            <select value={eventoUnico ? 'unico' : String(intervaloDias)} onChange={e=>{
              if (e.target.value === 'unico') setEventoUnico(true);
              else { setEventoUnico(false); setIntervaloDias(Number(e.target.value)); }
            }} style={inputSt}>
              <option value={90}>Trimestral (90 dias)</option>
              <option value={180}>Semestral (180 dias)</option>
              <option value={365}>Anual (365 dias)</option>
              <option value="unico">Evento único (data fixa, sem recorrência)</option>
            </select>
          </div>
          {eventoUnico && (
            <>
              <div style={{ background:'#fff7ed', borderRadius:10, padding:'8px 12px', fontSize:12, color:'#9a3412', marginBottom:12 }}>
                Agendamento único. Após aplicado em cada animal, o item sai da agenda.
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Data do evento</div>
                <input type="date" value={dataFixa} onChange={e=>setDataFixa(e.target.value)} style={inputSt} />
              </div>
            </>
          )}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:6 }}>Aplicar em (marque uma ou mais categorias)</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {CATEGORIAS_PROTOCOLO.map(cat => {
                const matches = cavalosPresentes.filter(cat.filter);
                if (matches.length === 0 && cat.key !== 'tropa_geral') return null;
                const ativo = categoriasMarcadas.includes(cat.key);
                return (
                  <button key={cat.key} onClick={()=>toggleCategoria(cat.key)} style={{ padding:'6px 12px', borderRadius:18, border:`1.5px solid ${ativo?'var(--accent)':'var(--line)'}`, background:ativo?'var(--accent)':'var(--card)', color:ativo?'#fff':'var(--ink)', fontSize:12, fontWeight:600, fontFamily:'var(--sans)', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                    {ativo && <span style={{ fontSize:11 }}>✓</span>}
                    {cat.label} <span style={{ opacity:0.7, fontSize:11 }}>({matches.length})</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <div style={{ fontSize:11, color:'var(--ink-3)' }}>Animais ({animaisAlvo.length}/{cavalosPresentes.length})</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={selectAllAnimais} style={{ background:'none', border:'none', color:'var(--accent)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--sans)', textDecoration:'underline' }}>Selecionar todos</button>
                <button onClick={clearAnimais} style={{ background:'none', border:'none', color:'var(--ink-3)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--sans)', textDecoration:'underline' }}>Limpar</button>
              </div>
            </div>
            <input value={animalSearch} onChange={e=>setAnimalSearch(e.target.value)} placeholder="Buscar animal…" style={{...inputSt, marginBottom:6, fontSize:13}} />
            <div style={{ maxHeight:200, overflowY:'auto', border:'1px solid var(--line)', borderRadius:10, background:'var(--card)' }}>
              {cavalosFiltrados.length === 0 && <div style={{ padding:10, fontSize:12, color:'var(--ink-3)', textAlign:'center' }}>Nenhum animal</div>}
              {cavalosFiltrados.map(c => {
                const checked = animaisAlvo.includes(c.id);
                return (
                  <button key={c.id} onClick={()=>toggleAnimal(c.id)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:checked?'#dbeafe':'transparent', border:'none', borderBottom:'1px solid var(--line)', cursor:'pointer', textAlign:'left' }}>
                    <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${checked?'var(--accent)':'var(--line-2)'}`, background:checked?'var(--accent)':'transparent', display:'grid', placeItems:'center', flexShrink:0 }}>
                      {checked && <span style={{ color:'#fff', fontSize:11, fontWeight:700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:13, color:'var(--ink)', fontFamily:'var(--sans)' }}>{c.nome}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Observações</div>
        <input value={descricao} onChange={e=>setDescricao(e.target.value)} style={inputSt} />
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:10, border:'1px solid var(--line)', background:'var(--card)', color:'var(--ink)', fontSize:14, fontFamily:'var(--sans)' }}>Cancelar</button>
        <button disabled={!canSave} onClick={handleSave} style={{ flex:2, padding:12, borderRadius:10, border:'none', background:canSave?'var(--accent)':'var(--soft)', color:canSave?'#fff':'var(--ink-3)', fontSize:14, fontWeight:700, fontFamily:'var(--sans)' }}>Salvar protocolo</button>
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
  cavalos, insumos, currentUser, addAtividade, addRegistro,
  protocolos, vermifugacoesAnimais, opgs, agenda,
  addProtocolo, updateProtocolo, deleteProtocolo,
  addVermifugacao, addOpg, updateOpg, deleteOpg,
  addProcedimento, servicos, onBack,
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
      etapaIdx: item.etapaIdx ?? null,
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

  const handleCancelarVerm = (item) => {
    if (!window.confirm('Cancelar esta dose de vermífugo? Ela some da agenda.')) return;
    addVermifugacao({
      id: 'verm_cancel_' + Date.now() + '_' + item.cavaloId,
      protocoloId: item.protocoloId,
      cavaloId: item.cavaloId,
      dataRealizacao: today,
      produto: '(cancelada)',
      registradoPor: currentUser?.nome || '',
      etapaIdx: item.etapaIdx ?? null,
      cancelado: true,
      canceladoPor: currentUser?.nome || '',
      canceladoEm: new Date().toISOString(),
    });
  };

  const agendaOpg = useMemo(
    () => calcAgendaOpg(protocolos, cavalos, opgs || []),
    [protocolos, cavalos, opgs]
  );
  const agendaOpgFiltrada = (filtroProtocolo ? agendaOpg.filter(i => i.protocoloId === filtroProtocolo) : agendaOpg)
    .slice()
    .sort((a, b) => (a.dataPrevista || '').localeCompare(b.dataPrevista || ''));

  const handleOPGAplicar = (item, data) => {
    const { dataColeta, resultado, precisaVermifugacao, insumoVermId, dataAplicacao, aplicado, proximaData, motoboy, servicoId, etapaIdx } = data;
    const hojeStr = todayStr();
    const opgExistente = item.opgPendente;
    const opgData = {
      cavaloId: item.cavaloId, protocoloId: item.protocoloId,
      dataColeta, resultado, precisaVermifugacao,
      insumoVermId: insumoVermId||'', dataAplicacao: dataAplicacao||'',
      aplicado: !!aplicado, principioAtivo:'', observacoes:'',
      proximaData: proximaData || '',
      etapaIdx: etapaIdx ?? null,
    };
    if (opgExistente) updateOpg(opgExistente.id, opgData);
    else addOpg({ id: 'opg_'+Date.now(), ...opgData });
    if (servicoId && addProcedimento && aplicado) {
      addProcedimento({
        id: 'proc_opg_'+Date.now()+'_'+item.cavaloId,
        cavaloId: item.cavaloId, servicoId,
        data: dataColeta,
        nota: `OPG · ${item.protocoloNome}${item.laboratorio ? ' · ' + item.laboratorio : ''}`,
        motoboy: !!motoboy,
        usuario: currentUser?.nome || '',
        mes: dataColeta.slice(0,7),
      });
    }
    if (precisaVermifugacao && insumoVermId && aplicado) {
      const appDate = dataAplicacao || hojeStr;
      const ehMesAtual = appDate.slice(0,7) === hojeStr.slice(0,7);
      if (ehMesAtual && addRegistro) {
        addRegistro({ id:'reg_opg_'+Date.now(), cavaloId:item.cavaloId, insumoId:insumoVermId, qtd:1, hora:new Date().toTimeString().slice(0,5), usuario:currentUser?.nome||'', isAuto:false, data:appDate });
      }
      addAtividade({ id:'at_opg_'+Date.now(), tipo:'vermifugacao', cavaloId:item.cavaloId, insumoId:insumoVermId, qtd:1, motivo:`OPG · ${item.protocoloNome}`, usuario:currentUser?.nome||'', autor:currentUser?.nome||'', mes:appDate.slice(0,7), data:appDate, hora:new Date().toTimeString().slice(0,5), texto:'' });
    }
  };

  const handleDispensarOpg = (item) => {
    const hojeStr = todayStr();
    const opgExistente = item.opgPendente;
    const data = {
      cavaloId: item.cavaloId, protocoloId: item.protocoloId,
      dataColeta: hojeStr, resultado: [],
      precisaVermifugacao: false, insumoVermId: '', dataAplicacao: '',
      aplicado: true, dispensado: true,
      principioAtivo: '', observacoes: 'Dispensado — OPG não realizado',
      proximaData: null, etapaIdx: item.etapaIdx ?? null,
    };
    if (opgExistente) updateOpg(opgExistente.id, data);
    else addOpg({ id: 'opg_disp_' + Date.now() + '_' + Math.random().toString(36).slice(2,6) + '_' + item.cavaloId, ...data });
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
            {atrasadas.length > 0 && <VermGrupo titulo="Atrasadas" cor="#dc2626" items={atrasadas} cavalos={cavalos} insumos={insumos} onVermifugar={handleVermifugar} onCancelar={handleCancelarVerm} protocolos={protocolos} />}
            {hoje.length > 0 && <VermGrupo titulo="Hoje" cor="var(--accent)" items={hoje} cavalos={cavalos} insumos={insumos} onVermifugar={handleVermifugar} onCancelar={handleCancelarVerm} protocolos={protocolos} />}
            {proximas.length > 0 && <VermGrupo titulo="Próximos 60 dias" cor="#b45309" items={proximas} cavalos={cavalos} insumos={insumos} onVermifugar={handleVermifugar} onCancelar={handleCancelarVerm} protocolos={protocolos} />}
            {futuras.length > 0 && <VermGrupo titulo="Futuros" cor="var(--ink-3)" items={futuras} cavalos={cavalos} insumos={insumos} onVermifugar={handleVermifugar} onCancelar={handleCancelarVerm} collapsed protocolos={protocolos} />}
            {agendaOpgFiltrada.length > 0 && (
              <div style={{ marginTop: agendaFiltrada.length > 0 ? 16 : 0 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#7c3aed', marginBottom:10 }}>
                  OPG · Coleta Programada ({agendaOpgFiltrada.length})
                </div>
                {agendaOpgFiltrada.map(item => (
                  <OPGAgendaItem key={`${item.key}_${item.opgPendente?.id||'novo'}`} item={item} insumos={insumos} servicos={servicos||[]} addProcedimento={addProcedimento} onAplicar={handleOPGAplicar} onDispensar={handleDispensarOpg} cor="#7c3aed" />
                ))}
              </div>
            )}
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
              <ProtocoloVermForm initial={editProt} insumos={insumos} servicos={servicos||[]} cavalos={cavalos||[]}
                onSave={data => { if(editProt) updateProtocolo(editProt.id,data); else addProtocolo({id:'pverm_'+Date.now(),...data}); setShowProtForm(false); setEditProt(null); }}
                onCancel={() => { setShowProtForm(false); setEditProt(null); }} />
            )}
            {protocolos.length === 0 && !showProtForm && (
              <div style={{ textAlign:'center', padding:'32px 0', color:'var(--ink-3)', fontSize:14 }}>Nenhum protocolo cadastrado.</div>
            )}
            {protocolos.map((p, idx) => (
              <ProtocoloVermCard key={p.id} protocolo={p} insumos={insumos} servicos={servicos||[]} isAdmin={isAdmin} cor={PROT_COLORS[idx%PROT_COLORS.length]}
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
function VermGrupo({ titulo, cor, items, cavalos, insumos, onVermifugar, onCancelar, collapsed: initCollapsed = false, protocolos = [] }) {
  const [open, setOpen] = useState(!initCollapsed);
  return (
    <div style={{ marginBottom: 18 }}>
      <button onClick={() => setOpen(o=>!o)} style={{ background:'none', border:'none', padding:'4px 0 10px', display:'flex', alignItems:'center', gap:8, cursor:'pointer', width:'100%' }}>
        <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:cor }}>{titulo}</span>
        <span style={{ fontSize:11, color:'var(--ink-3)' }}>({items.length})</span>
        <span style={{ marginLeft:'auto', fontSize:13, color:'var(--ink-3)', transform:open?'rotate(90deg)':'none', transition:'transform 0.15s' }}>›</span>
      </button>
      {open && items.map(item => (
        <VermItem key={item.key} item={item} cavalos={cavalos} insumos={insumos} onVermifugar={onVermifugar} onCancelar={onCancelar} cor={getProtColor(item.protocoloId, protocolos) || cor} />
      ))}
    </div>
  );
}

function VermItem({ item, cavalos, insumos, onVermifugar, onCancelar, cor }) {
  const [confirmando, setConfirmando] = useState(false);
  const [dataReal, setDataReal] = useState(item.dataPrevista < todayStr() ? item.dataPrevista : todayStr());
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
          <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>{insumo?.nome||'—'} · {item.etapaLabel || item.protocoloNome}</div>
          {item.ultimaRealizacao && (
            <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:1 }}>Última: {fmtDate(item.ultimaRealizacao)}</div>
          )}
          {!item.ultimaRealizacao && !item.etapaLabel && (
            <div style={{ fontSize:11, color:'#b45309', marginTop:1 }}>Nunca realizada</div>
          )}
        </div>
        <div style={{ flexShrink:0, textAlign:'right' }}>
          {!confirmando && (
            <>
              <div style={{ fontSize:11, fontWeight:600, color:cor, marginBottom:6 }}>{labelDias}</div>
              <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                <button onClick={()=>setConfirmando(true)} style={{ background:cor, color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--sans)' }}>Aplicar ✓</button>
                {onCancelar && (
                  <button onClick={()=>onCancelar(item)} title="Cancelar esta dose" style={{ background:'transparent', color:'var(--ink-3)', border:'1px solid var(--line)', borderRadius:8, padding:'6px 10px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--sans)' }}>⊘</button>
                )}
              </div>
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
function ProtocoloVermCard({ protocolo, insumos, servicos, isAdmin, onEdit, onDelete, cor }) {
  const [open, setOpen] = useState(false);
  const insumo = insumos.find(i => i.id === protocolo.insumoId);
  const intervOpt = INTERVALO_OPTIONS.find(o => o.value === protocolo.intervaloDias);
  const isPotroEtapas = (protocolo.tipo === 'potro' || protocolo.tipo === 'gestante') && (protocolo.etapas||[]).length > 0;
  const refEtapas = protocolo.eventoReferencia || (protocolo.tipo === 'gestante' ? 'cobertura' : 'nascimento');
  const labelEtapas = refEtapas === 'cobertura' ? 'Gestantes' : 'Potros';
  const isUnico = !!protocolo.eventoUnico || protocolo.tipo === 'unico';
  const nAnimais = (protocolo.animaisAlvo||[]).length;
  return (
    <div style={{ background:'var(--card)', border:`1px solid ${cor}30`, borderRadius:14, marginBottom:10, overflow:'hidden' }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:'100%', background:'none', border:'none', padding:'14px 16px', display:'flex', alignItems:'center', gap:12, textAlign:'left', cursor:'pointer' }}>
        <div style={{ width:40, height:40, borderRadius:12, background:cor+'20', display:'grid', placeItems:'center', flexShrink:0 }}>
          <Icon name="leaf" size={20} color={cor} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{protocolo.nome}</div>
          <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>
            {protocolo.subtipo==='opg' && !isPotroEtapas && <span style={{ fontSize:10, background:'#ede9fe', color:'#7c3aed', borderRadius:4, padding:'1px 6px', marginRight:6, fontWeight:700 }}>OPG</span>}
            {isUnico && <span style={{ fontSize:10, background:'#fff7ed', color:'#9a3412', borderRadius:4, padding:'1px 6px', marginRight:6, fontWeight:700 }}>EVENTO ÚNICO</span>}
            {isPotroEtapas
              ? `${labelEtapas} · ${protocolo.etapas.length} etapa${protocolo.etapas.length!==1?'s':''}`
              : isUnico
                ? `${protocolo.dataFixa ? new Date(protocolo.dataFixa+'T12:00:00').toLocaleDateString('pt-BR') : '—'} · ${nAnimais} animal(is)`
                : `${intervOpt?.label||`${protocolo.intervaloDias} dias`} · ${nAnimais} animal(is)`}
          </div>
        </div>
        <span style={{ fontSize:16, color:'var(--ink-3)', transform:open?'rotate(90deg)':'none', transition:'transform 0.15s' }}>›</span>
      </button>
      {open && (
        <div style={{ padding:'0 16px 14px' }}>
          {isPotroEtapas ? (
            <div>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.07em' }}>Etapas · dias desde nascimento</div>
              {protocolo.etapas.map((etapa, i) => {
                const ins = insumos.find(x => x.id === etapa.insumoId);
                const sv = (servicos||[]).find(x => x.id === etapa.servicoId);
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:i<protocolo.etapas.length-1?'1px solid var(--line)':'none' }}>
                    <div style={{ width:24, height:24, borderRadius:12, background:cor+'20', color:cor, display:'grid', placeItems:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{i+1}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>
                        {etapa.subtipo==='opg' ? (sv?.nome||'OPG') : (ins?.nome||'—')}
                        <span style={{ fontSize:10, background:etapa.subtipo==='opg'?'#ede9fe':'#f0fdf4', color:etapa.subtipo==='opg'?'#7c3aed':'#15803d', borderRadius:4, padding:'1px 5px', marginLeft:6 }}>{etapa.subtipo==='opg'?'OPG':'Verm'}</span>
                      </div>
                      <div style={{ fontSize:11, color:'var(--ink-3)' }}>{etapa.label||`Etapa ${i+1}`} · {etapa.diasDesdeNascimento} dias (≈{Math.round(etapa.diasDesdeNascimento/30)} mês)</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : isUnico ? (
            <>
              <div style={{ fontSize:13, color:'var(--ink)', marginBottom:6 }}>
                <span style={{ color:'var(--ink-3)' }}>Data: </span>{protocolo.dataFixa ? new Date(protocolo.dataFixa+'T12:00:00').toLocaleDateString('pt-BR') : '—'}
              </div>
              {protocolo.subtipo==='opg' ? (
                <div style={{ fontSize:13, color:'var(--ink)', marginBottom:6 }}>
                  <span style={{ color:'var(--ink-3)' }}>Laboratório: </span>{protocolo.laboratorio||'—'}
                </div>
              ) : (
                <div style={{ fontSize:13, color:'var(--ink)', marginBottom:6 }}>
                  <span style={{ color:'var(--ink-3)' }}>Princípio ativo: </span>{insumo?.nome||'—'}
                </div>
              )}
              <div style={{ fontSize:13, color:'var(--ink)', marginBottom:6 }}>
                <span style={{ color:'var(--ink-3)' }}>Animais: </span>{(protocolo.animaisAlvo||[]).length}
              </div>
            </>
          ) : (
            <>
              {protocolo.subtipo==='opg' ? (
                <div style={{ fontSize:13, color:'var(--ink)', marginBottom:6 }}>
                  <span style={{ color:'var(--ink-3)' }}>Laboratório: </span>{protocolo.laboratorio||'—'}
                </div>
              ) : (
                <div style={{ fontSize:13, color:'var(--ink)', marginBottom:6 }}>
                  <span style={{ color:'var(--ink-3)' }}>Produto: </span>{insumo?.nome||protocolo.produto||'—'}
                </div>
              )}
              <div style={{ fontSize:13, color:'var(--ink)', marginBottom:6 }}>
                <span style={{ color:'var(--ink-3)' }}>Intervalo: </span>{intervOpt?.label||`${protocolo.intervaloDias} dias`}
              </div>
            </>
          )}
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
function ProtocoloVermForm({ initial, insumos, servicos, cavalos, onSave, onCancel }) {
  const [nome, setNome] = useState(initial?.nome||'');
  const [modoEtapas, setModoEtapas] = useState((initial?.tipo === 'potro' || initial?.tipo === 'gestante') && (initial?.etapas||[]).length > 0);
  const [eventoReferencia, setEventoReferencia] = useState(initial?.eventoReferencia || (initial?.tipo === 'gestante' ? 'cobertura' : 'nascimento'));
  const [subtipo, setSubtipo] = useState(initial?.subtipo||'vermifugacao');
  const [insumoId, setInsumoId] = useState(initial?.insumoId||'');
  const [laboratorio, setLaboratorio] = useState(initial?.laboratorio||'');
  const [intervaloDias, setIntervaloDias] = useState(initial?.intervaloDias||90);
  const [observacoes, setObservacoes] = useState(initial?.observacoes||'');
  const [eventoUnico, setEventoUnico] = useState(!!initial?.eventoUnico || initial?.tipo === 'unico');
  const [dataFixa, setDataFixa] = useState(initial?.dataFixa||'');
  const [animaisAlvo, setAnimaisAlvo] = useState(initial?.animaisAlvo||[]);
  const [animalSearch, setAnimalSearch] = useState('');
  const [etapas, setEtapas] = useState(
    initial?.etapas?.length ? initial.etapas : [{ diasDesdeNascimento:60, subtipo:'vermifugacao', insumoId:'', servicoId:'', laboratorio:'', label:'' }]
  );

  const insumosVerm = [...insumos].filter(i=>i.categoria==='vermifugo').sort((a,b)=>a.nome.localeCompare(b.nome,'pt'));
  const opgServico = (servicos||[]).find(s => (s.nome||'').toUpperCase().includes('OPG'));
  const cavalosPresentes = (cavalos||[]).filter(c=>c.presente).sort((a,b)=>a.nome.localeCompare(b.nome,'pt'));
  const cavalosFiltrados = animalSearch.trim() ? cavalosPresentes.filter(c=>c.nome.toLowerCase().includes(animalSearch.trim().toLowerCase())) : cavalosPresentes;

  // Categorias que estão "totalmente marcadas" (todos os animais matching estão em animaisAlvo)
  const categoriasMarcadas = CATEGORIAS_PROTOCOLO.filter(cat => {
    const matches = cavalosPresentes.filter(cat.filter);
    return matches.length > 0 && matches.every(c => animaisAlvo.includes(c.id));
  }).map(c => c.key);

  const toggleCategoria = (catKey) => {
    const cat = CATEGORIAS_PROTOCOLO.find(c => c.key === catKey);
    if (!cat) return;
    const matchingIds = cavalosPresentes.filter(cat.filter).map(c => c.id);
    if (categoriasMarcadas.includes(catKey)) {
      setAnimaisAlvo(prev => prev.filter(id => !matchingIds.includes(id)));
    } else {
      setAnimaisAlvo(prev => Array.from(new Set([...prev, ...matchingIds])));
    }
  };

  const addEtapa = () => setEtapas(e=>[...e,{diasDesdeNascimento:0,subtipo:'vermifugacao',insumoId:'',servicoId:'',laboratorio:'',label:''}]);
  const removeEtapa = i => setEtapas(e=>e.filter((_,idx)=>idx!==i));
  const updateEtapa = (i,field,val) => setEtapas(e=>e.map((e2,idx)=>idx===i?{...e2,[field]:val}:e2));
  const toggleAnimal = id => setAnimaisAlvo(a => a.includes(id) ? a.filter(x=>x!==id) : [...a, id]);
  const selectAllAnimais = () => setAnimaisAlvo(cavalosPresentes.map(c=>c.id));
  const clearAnimais = () => setAnimaisAlvo([]);
  const canSave = nome.trim() && (
    modoEtapas ? etapas.length>0 :
    eventoUnico ? (dataFixa && animaisAlvo.length>0) :
    (intervaloDias>0 && animaisAlvo.length>0)
  );

  const handleSave = () => {
    const opgId = opgServico?.id || '';
    if (modoEtapas) {
      const etapasFinal = etapas.map(e => e.subtipo === 'opg' ? { ...e, servicoId: opgId } : e);
      const tipoFromEvento = eventoReferencia === 'cobertura' ? 'gestante' : 'potro';
      onSave({ nome:nome.trim(), tipo:tipoFromEvento, eventoReferencia, subtipo:'', insumoId:'', servicoId:'', laboratorio:'', intervaloDias:0, etapas:etapasFinal, eventoUnico:false, dataFixa:null, animaisAlvo:[], observacoes, ativo:true });
    } else if (eventoUnico) {
      onSave({ nome:nome.trim(), tipo:'geral', subtipo, insumoId:subtipo==='vermifugacao'?insumoId:'', servicoId:subtipo==='opg'?opgId:'', laboratorio:subtipo==='opg'?laboratorio:'', intervaloDias:0, etapas:[], eventoUnico:true, dataFixa, animaisAlvo, observacoes, ativo:true });
    } else {
      onSave({ nome:nome.trim(), tipo:'geral', subtipo, insumoId:subtipo==='vermifugacao'?insumoId:'', servicoId:subtipo==='opg'?opgId:'', laboratorio:subtipo==='opg'?laboratorio:'', intervaloDias, etapas:[], eventoUnico:false, dataFixa:null, animaisAlvo, observacoes, ativo:true });
    }
  };

  return (
    <div style={{ background:'var(--soft)', borderRadius:16, padding:16, marginBottom:16 }}>
      <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:14 }}>{initial?'Editar protocolo':'Novo protocolo de vermifugação'}</div>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Nome</div>
        <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Protocolo Potros…" style={inputSt} />
      </div>
      <div style={{ marginBottom:12 }}>
        <label style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:modoEtapas?'#f0fdf4':'var(--card)', border:`1px solid ${modoEtapas?'#15803d':'var(--line)'}`, borderRadius:10, cursor:'pointer' }}>
          <input type="checkbox" checked={modoEtapas} onChange={e=>setModoEtapas(e.target.checked)} style={{ width:18, height:18, cursor:'pointer' }} />
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>Etapas baseadas em datas</div>
            <div style={{ fontSize:11, color:'var(--ink-3)' }}>Cada etapa é agendada a partir da data de nascimento (potros) ou cobertura (gestantes) de cada animal.</div>
          </div>
        </label>
      </div>

      {modoEtapas ? (
        <>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Evento de referência</div>
            <select value={eventoReferencia} onChange={e=>setEventoReferencia(e.target.value)} style={inputSt}>
              <option value="nascimento">Data de nascimento (potros)</option>
              <option value="cobertura">Data de cobertura (éguas gestantes)</option>
            </select>
          </div>
          <div style={{ background:'#f0fdf4', borderRadius:10, padding:'8px 12px', fontSize:12, color:'#15803d', marginBottom:14 }}>
            Cada etapa é agendada com base na {eventoReferencia==='cobertura'?'data de cobertura da égua':'data de nascimento do potro'}.
          </div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>Etapas</div>
          {etapas.map((etapa, i) => (
            <div key={i} style={{ background:'var(--card)', borderRadius:12, padding:'12px 14px', marginBottom:8, border:'1px solid var(--line)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ width:22, height:22, borderRadius:11, background:'#dcfce7', color:'#15803d', fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{i+1}</span>
                {etapas.length>1 && <button onClick={()=>removeEtapa(i)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', padding:'2px 6px', fontSize:14 }}>×</button>}
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                <button onClick={()=>updateEtapa(i,'subtipo','vermifugacao')} style={{ flex:1, padding:'8px 0', borderRadius:9, border:`1.5px solid ${etapa.subtipo==='vermifugacao'?'#15803d':'var(--line)'}`, background:etapa.subtipo==='vermifugacao'?'#15803d':'var(--card)', color:etapa.subtipo==='vermifugacao'?'#fff':'var(--ink)', fontSize:12, fontWeight:600, fontFamily:'var(--sans)', cursor:'pointer' }}>Vermifugação</button>
                <button onClick={()=>updateEtapa(i,'subtipo','opg')} style={{ flex:1, padding:'8px 0', borderRadius:9, border:`1.5px solid ${etapa.subtipo==='opg'?'#7c3aed':'var(--line)'}`, background:etapa.subtipo==='opg'?'#7c3aed':'var(--card)', color:etapa.subtipo==='opg'?'#fff':'var(--ink)', fontSize:12, fontWeight:600, fontFamily:'var(--sans)', cursor:'pointer' }}>OPG</button>
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>Dias desde {eventoReferencia==='cobertura'?'cobertura':'nascimento'}</div>
                  <input type="number" min="0" value={etapa.diasDesdeNascimento} onChange={e=>updateEtapa(i,'diasDesdeNascimento',Number(e.target.value))} style={inputSt} />
                  {etapa.diasDesdeNascimento>0 && <div style={{ fontSize:10, color:'var(--ink-3)', marginTop:3 }}>≈ {Math.round(etapa.diasDesdeNascimento/30)} mês(es)</div>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>Rótulo (opcional)</div>
                  <input value={etapa.label} onChange={e=>updateEtapa(i,'label',e.target.value)} placeholder="Ex: 2º mês…" style={inputSt} />
                </div>
              </div>
              {etapa.subtipo==='vermifugacao' ? (
                <div>
                  <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>Produto (insumo)</div>
                  <select value={etapa.insumoId} onChange={e=>updateEtapa(i,'insumoId',e.target.value)} style={inputSt}>
                    <option value="">— selecionar (opcional) —</option>
                    {insumosVerm.map(ins=><option key={ins.id} value={ins.id}>{ins.nome}</option>)}
                  </select>
                </div>
              ) : (
                <>
                  {opgServico ? (
                    <div style={{ background:'#f5f3ff', border:'1px solid #c4b5fd', borderRadius:9, padding:'8px 10px', marginBottom:8 }}>
                      <div style={{ fontSize:10, color:'#7c3aed', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>Procedimento vinculado</div>
                      <div style={{ fontSize:13, color:'var(--ink)', fontWeight:600 }}>{opgServico.nome}</div>
                      <div style={{ fontSize:10, color:'var(--ink-3)' }}>R$ {Number(opgServico.valor||0).toFixed(2)}</div>
                    </div>
                  ) : (
                    <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:9, padding:'8px 10px', marginBottom:8, fontSize:11, color:'#dc2626', fontWeight:600 }}>
                      ⚠ Cadastre serviço "OPG" em Cadastros
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>Laboratório</div>
                    <input value={etapa.laboratorio} onChange={e=>updateEtapa(i,'laboratorio',e.target.value)} placeholder="Ex: Lab Vet…" style={inputSt} />
                  </div>
                </>
              )}
            </div>
          ))}
          <button onClick={addEtapa} style={{ width:'100%', background:'none', border:'1px dashed var(--line-2)', borderRadius:10, padding:'10px 0', fontSize:13, color:'var(--ink-3)', cursor:'pointer', marginBottom:14, fontFamily:'var(--sans)' }}>+ Adicionar etapa</button>
        </>
      ) : (
        <>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:8 }}>Tipo de protocolo</div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setSubtipo('vermifugacao')} style={{ flex:1, padding:'10px 0', borderRadius:10, border:`1.5px solid ${subtipo==='vermifugacao'?'#15803d':'var(--line)'}`, background:subtipo==='vermifugacao'?'#15803d':'var(--card)', color:subtipo==='vermifugacao'?'#fff':'var(--ink)', fontSize:13, fontWeight:600, fontFamily:'var(--sans)', cursor:'pointer' }}>Vermifugação</button>
              <button onClick={()=>setSubtipo('opg')} style={{ flex:1, padding:'10px 0', borderRadius:10, border:`1.5px solid ${subtipo==='opg'?'#7c3aed':'var(--line)'}`, background:subtipo==='opg'?'#7c3aed':'var(--card)', color:subtipo==='opg'?'#fff':'var(--ink)', fontSize:13, fontWeight:600, fontFamily:'var(--sans)', cursor:'pointer' }}>OPG Sequencial</button>
            </div>
          </div>
          {subtipo==='vermifugacao' ? (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Produto (insumo)</div>
              <select value={insumoId} onChange={e=>setInsumoId(e.target.value)} style={inputSt}>
                <option value="">— selecionar (opcional) —</option>
                {insumosVerm.map(i=><option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            </div>
          ) : (
            <>
              {!eventoUnico && (
                <div style={{ background:'#ede9fe', borderRadius:10, padding:'8px 12px', fontSize:12, color:'#7c3aed', marginBottom:12 }}>
                  Protocolo sequencial: após cada OPG, você define a data do próximo.
                </div>
              )}
              {opgServico ? (
                <div style={{ marginBottom:12, background:'#f5f3ff', border:'1px solid #c4b5fd', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:11, color:'#7c3aed', fontWeight:700, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>Procedimento vinculado</div>
                  <div style={{ fontSize:14, color:'var(--ink)', fontWeight:600 }}>{opgServico.nome}</div>
                  <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>R$ {Number(opgServico.valor||0).toFixed(2)} · {(opgServico.descartaveisObrigatorios||[]).length} descartável(eis) obrigatório(s) · editar em Cadastros → Serviços</div>
                </div>
              ) : (
                <div style={{ marginBottom:12, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 12px', fontSize:12, color:'#dc2626', fontWeight:600 }}>
                  ⚠ Cadastre o serviço "OPG" em Cadastros → Serviços para usar este protocolo.
                </div>
              )}
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Laboratório</div>
                <input value={laboratorio} onChange={e=>setLaboratorio(e.target.value)} placeholder="Ex: Exame Vet, Lab Central…" style={inputSt} />
              </div>
            </>
          )}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Intervalo entre {subtipo==='opg'?'coletas':'aplicações'}</div>
            <select value={eventoUnico ? 'unico' : String(intervaloDias)} onChange={e=>{
              if (e.target.value === 'unico') setEventoUnico(true);
              else { setEventoUnico(false); setIntervaloDias(Number(e.target.value)); }
            }} style={inputSt}>
              {INTERVALO_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              <option value={60}>Bimestral (60 dias)</option>
              <option value="unico">Evento único (data fixa, sem recorrência)</option>
            </select>
          </div>
          {eventoUnico && (
            <>
              <div style={{ background:'#fff7ed', borderRadius:10, padding:'8px 12px', fontSize:12, color:'#9a3412', marginBottom:12 }}>
                Agendamento único. Após aplicado em cada animal, o item sai da agenda.
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Data do evento</div>
                <input type="date" value={dataFixa} onChange={e=>setDataFixa(e.target.value)} style={inputSt} />
              </div>
            </>
          )}
          {/* Aplicar em — chips de categoria (sempre visível) */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:6 }}>Aplicar em (marque uma ou mais categorias)</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {CATEGORIAS_PROTOCOLO.map(cat => {
                const matches = cavalosPresentes.filter(cat.filter);
                if (matches.length === 0 && cat.key !== 'tropa_geral') return null;
                const ativo = categoriasMarcadas.includes(cat.key);
                return (
                  <button key={cat.key} onClick={()=>toggleCategoria(cat.key)} style={{ padding:'6px 12px', borderRadius:18, border:`1.5px solid ${ativo?'#15803d':'var(--line)'}`, background:ativo?'#15803d':'var(--card)', color:ativo?'#fff':'var(--ink)', fontSize:12, fontWeight:600, fontFamily:'var(--sans)', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                    {ativo && <span style={{ fontSize:11 }}>✓</span>}
                    {cat.label} <span style={{ opacity:0.7, fontSize:11 }}>({matches.length})</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Lista de animais — sempre visível */}
          <div style={{ marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <div style={{ fontSize:11, color:'var(--ink-3)' }}>Animais ({animaisAlvo.length}/{cavalosPresentes.length})</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={selectAllAnimais} style={{ background:'none', border:'none', color:'var(--accent)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--sans)', textDecoration:'underline' }}>Selecionar todos</button>
                <button onClick={clearAnimais} style={{ background:'none', border:'none', color:'var(--ink-3)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--sans)', textDecoration:'underline' }}>Limpar</button>
              </div>
            </div>
            <input value={animalSearch} onChange={e=>setAnimalSearch(e.target.value)} placeholder="Buscar animal…" style={{...inputSt, marginBottom:6, fontSize:13}} />
            <div style={{ maxHeight:200, overflowY:'auto', border:'1px solid var(--line)', borderRadius:10, background:'var(--card)' }}>
              {cavalosFiltrados.length === 0 && <div style={{ padding:10, fontSize:12, color:'var(--ink-3)', textAlign:'center' }}>Nenhum animal</div>}
              {cavalosFiltrados.map(c => {
                const checked = animaisAlvo.includes(c.id);
                return (
                  <button key={c.id} onClick={()=>toggleAnimal(c.id)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:checked?'#f0fdf4':'transparent', border:'none', borderBottom:'1px solid var(--line)', cursor:'pointer', textAlign:'left' }}>
                    <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${checked?'#15803d':'var(--line-2)'}`, background:checked?'#15803d':'transparent', display:'grid', placeItems:'center', flexShrink:0 }}>
                      {checked && <span style={{ color:'#fff', fontSize:11, fontWeight:700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:13, color:'var(--ink)', fontFamily:'var(--sans)' }}>{c.nome}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:5 }}>Observações</div>
        <input value={observacoes} onChange={e=>setObservacoes(e.target.value)} style={inputSt} />
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={onCancel} style={{ flex:1, padding:12, borderRadius:10, border:'1px solid var(--line)', background:'var(--card)', color:'var(--ink)', fontSize:14, fontFamily:'var(--sans)' }}>Cancelar</button>
        <button disabled={!canSave} onClick={handleSave} style={{ flex:2, padding:12, borderRadius:10, border:'none', background:canSave?'#15803d':'var(--soft)', color:canSave?'#fff':'var(--ink-3)', fontSize:14, fontWeight:700, fontFamily:'var(--sans)' }}>Salvar protocolo</button>
      </div>
    </div>
  );
}

// ─── OPGAgendaItem ────────────────────────────────────────────
function OPGAgendaItem({ item, insumos, servicos, addProcedimento, onAplicar, onDispensar, cor }) {
  const [open, setOpen] = useState(false);
  const opg = item.opgPendente;
  const [dataColeta, setDataColeta] = useState(opg?.dataColeta || item.dataPrevista);
  const [resultado, setResultado] = useState(opg?.resultado?.length ? opg.resultado : [{ especie:'', contagem:'' }]);
  const [precisaVerm, setPrecisaVerm] = useState(opg?.precisaVermifugacao !== undefined && opg?.precisaVermifugacao !== null ? opg.precisaVermifugacao : null);
  const [insumoVermId, setInsumoVermId] = useState(opg?.insumoVermId||'');
  const [dataAplicacao, setDataAplicacao] = useState(opg?.dataAplicacao||todayStr());
  const [proximaData, setProximaData] = useState(opg?.proximaData||'');
  const [motoboy, setMotoboy] = useState(false);

  const dr = item.diasRestantes;
  const labelDias = dr===0?'Hoje':dr<0?`${Math.abs(dr)} dia${Math.abs(dr)>1?'s':''} atrás`:`em ${dr} dia${dr>1?'s':''}`;
  const insumosVerm = [...insumos].filter(i=>i.categoria==='vermifugo').sort((a,b)=>a.nome.localeCompare(b.nome,'pt'));
  const resultadoValido = resultado.filter(r=>r.especie.trim());
  const servico = (servicos||[]).find(s=>s.id===item.servicoId);

  const addEspecie = () => setResultado(r=>[...r,{especie:'',contagem:''}]);
  const removeEspecie = i => setResultado(r=>r.filter((_,idx)=>idx!==i));
  const updateEspecie = (i, field, val) => setResultado(r=>r.map((r2,idx)=>idx===i?{...r2,[field]:val}:r2));

  const badge = opg
    ? (opg.aplicado ? '✓ Concluído' : opg.precisaVermifugacao !== null ? 'Aguard. tratamento' : 'Resultado recebido')
    : null;

  const handleAplicar = () => {
    onAplicar(item, { dataColeta, resultado:resultadoValido, precisaVermifugacao:true, insumoVermId, dataAplicacao, aplicado:true, proximaData, motoboy, servicoId:item.servicoId, etapaIdx:item.etapaIdx??null });
    setOpen(false);
  };
  const handleSemNecessidade = () => {
    onAplicar(item, { dataColeta, resultado:resultadoValido, precisaVermifugacao:false, insumoVermId:'', dataAplicacao:'', aplicado:true, proximaData, motoboy, servicoId:item.servicoId, etapaIdx:item.etapaIdx??null });
    setOpen(false);
  };

  return (
    <div style={{ background:'var(--card)', border:`1px solid ${open?cor:cor+'40'}`, borderRadius:13, padding:'12px 14px', marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:10, height:10, borderRadius:5, flexShrink:0, background:cor }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>{item.cavaloNome}</div>
          <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>OPG · {item.etapaLabel||item.protocoloNome}{item.laboratorio?` · ${item.laboratorio}`:''}</div>
          {servico && <div style={{ fontSize:11, color:'#7c3aed', marginTop:1 }}>{servico.nome}{servico.valor?` · R$ ${Number(servico.valor).toFixed(2)}`:''}</div>}
          {badge && <div style={{ fontSize:11, color:badge.startsWith('✓')?'#15803d':'#b45309', marginTop:2 }}>{badge}</div>}
          {!opg && item.ultimaColeta && <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:1 }}>Última coleta: {fmtDate(item.ultimaColeta)}</div>}
        </div>
        <div style={{ flexShrink:0, textAlign:'right' }}>
          <div style={{ fontSize:11, fontWeight:600, color:opg?.aplicado?'#9ca3af':cor, marginBottom:6 }}>{labelDias}</div>
          {!opg?.aplicado && (
            <button onClick={()=>setOpen(o=>!o)} style={{ background:open?cor:'var(--soft)', color:open?'#fff':'var(--ink)', border:`1px solid ${open?cor:'var(--line)'}`, borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--sans)' }}>
              {open?'Fechar':opg?'Continuar':'Registrar'}
            </button>
          )}
        </div>
      </div>
      {open && (
        <div style={{ marginTop:12, padding:'12px 14px', background:'var(--soft)', borderRadius:10 }}>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>Data da coleta</div>
            <input type="date" value={dataColeta} onChange={e=>setDataColeta(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid var(--line)', background:'var(--card)', fontSize:14, color:'var(--ink)', fontFamily:'var(--sans)', outline:'none', boxSizing:'border-box' }} />
          </div>
          {servico && (
            <div style={{ marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:motoboy?'#ede9fe':'var(--card)', border:`1px solid ${motoboy?'#7c3aed':'var(--line)'}`, borderRadius:10, padding:'10px 12px' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{servico.nome}</div>
                  {servico.valor && <div style={{ fontSize:11, color:'var(--ink-3)' }}>R$ {Number(servico.valor).toFixed(2)}</div>}
                </div>
                <button onClick={()=>setMotoboy(m=>!m)} style={{ padding:'7px 14px', borderRadius:8, border:`1.5px solid ${motoboy?'#7c3aed':'var(--line)'}`, background:motoboy?'#7c3aed':'var(--card)', color:motoboy?'#fff':'var(--ink)', fontSize:12, fontWeight:700, fontFamily:'var(--sans)', cursor:'pointer' }}>
                  {motoboy?'🛵 Motoboy ✓':'🛵 Motoboy'}
                </button>
              </div>
            </div>
          )}
          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>Resultado (OPG)</div>
          <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:8 }}>Deixe em branco se negativo.</div>
          {resultado.map((r,i)=>(
            <div key={i} style={{ display:'flex', gap:6, alignItems:'center', marginBottom:6 }}>
              <input value={r.especie} onChange={e=>updateEspecie(i,'especie',e.target.value)} placeholder="Espécie…" style={{ flex:2, padding:'7px 10px', borderRadius:8, border:'1px solid var(--line)', background:'var(--card)', fontSize:13, color:'var(--ink)', fontFamily:'var(--sans)', outline:'none' }} />
              <input type="number" min="0" value={r.contagem} onChange={e=>updateEspecie(i,'contagem',Number(e.target.value))} placeholder="OPG" style={{ flex:1, padding:'7px 10px', borderRadius:8, border:'1px solid var(--line)', background:'var(--card)', fontSize:13, color:'var(--ink)', fontFamily:'var(--sans)', outline:'none' }} />
              {resultado.length>1 && <button onClick={()=>removeEspecie(i)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:16, padding:'4px' }}>×</button>}
            </div>
          ))}
          <button onClick={addEspecie} style={{ width:'100%', background:'none', border:'1px dashed var(--line-2)', borderRadius:8, padding:'7px 0', fontSize:12, color:'var(--ink-3)', cursor:'pointer', marginBottom:14, fontFamily:'var(--sans)' }}>+ Adicionar espécie</button>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Necessita vermifugação?</div>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            <button onClick={()=>setPrecisaVerm(true)} style={{ flex:1, padding:'9px 0', borderRadius:9, border:`1.5px solid ${precisaVerm===true?cor:'var(--line)'}`, background:precisaVerm===true?cor:'var(--card)', color:precisaVerm===true?'#fff':'var(--ink)', fontSize:13, fontWeight:600, fontFamily:'var(--sans)', cursor:'pointer' }}>Sim</button>
            <button onClick={()=>setPrecisaVerm(false)} style={{ flex:1, padding:'9px 0', borderRadius:9, border:`1.5px solid ${precisaVerm===false?'#15803d':'var(--line)'}`, background:precisaVerm===false?'#15803d':'var(--card)', color:precisaVerm===false?'#fff':'var(--ink)', fontSize:13, fontWeight:600, fontFamily:'var(--sans)', cursor:'pointer' }}>Não</button>
          </div>
          {precisaVerm===true && (
            <>
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>Princípio ativo (insumo)</div>
                <select value={insumoVermId} onChange={e=>setInsumoVermId(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid var(--line)', background:'var(--card)', fontSize:14, color:'var(--ink)', fontFamily:'var(--sans)', outline:'none', boxSizing:'border-box' }}>
                  <option value="">— selecionar —</option>
                  {insumosVerm.map(i=><option key={i.id} value={i.id}>{i.nome}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>Data de aplicação</div>
                <input type="date" value={dataAplicacao} onChange={e=>setDataAplicacao(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid var(--line)', background:'var(--card)', fontSize:14, color:'var(--ink)', fontFamily:'var(--sans)', outline:'none', boxSizing:'border-box' }} />
              </div>
            </>
          )}
          {item.isSequencial && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>Data do próximo OPG</div>
              <input type="date" value={proximaData} onChange={e=>setProximaData(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid var(--line)', background:'var(--card)', fontSize:14, color:'var(--ink)', fontFamily:'var(--sans)', outline:'none', boxSizing:'border-box' }} />
            </div>
          )}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setOpen(false)} style={{ flex:1, padding:'8px 0', borderRadius:8, border:'1px solid var(--line)', background:'var(--card)', color:'var(--ink)', fontSize:13, fontFamily:'var(--sans)' }}>Cancelar</button>
            {precisaVerm===false && <button onClick={handleSemNecessidade} style={{ flex:2, padding:'8px 0', borderRadius:8, border:'none', background:'#15803d', color:'#fff', fontSize:13, fontWeight:700, fontFamily:'var(--sans)' }}>✓ Sem necessidade</button>}
            {precisaVerm===true && <button onClick={handleAplicar} disabled={!insumoVermId||!dataAplicacao} style={{ flex:2, padding:'8px 0', borderRadius:8, border:'none', background:insumoVermId&&dataAplicacao?cor:'var(--soft)', color:insumoVermId&&dataAplicacao?'#fff':'var(--ink-3)', fontSize:13, fontWeight:700, fontFamily:'var(--sans)' }}>Aplicar ✓</button>}
            {precisaVerm===null && <button disabled style={{ flex:2, padding:'8px 0', borderRadius:8, border:'none', background:'var(--soft)', color:'var(--ink-3)', fontSize:13, fontFamily:'var(--sans)' }}>Selecione acima</button>}
          </div>
          {onDispensar && (
            <button onClick={()=>{ if(window.confirm(`Marcar como exame não realizado (${item.cavaloNome})?`)) { onDispensar(item); setOpen(false); } }} style={{ width:'100%', marginTop:10, background:'none', border:'none', color:'var(--ink-3)', fontSize:12, textDecoration:'underline', cursor:'pointer', fontFamily:'var(--sans)', padding:'4px 0' }}>
              Exame não realizado
            </button>
          )}
        </div>
      )}
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
    .filter(o => !o.dispensado)
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

  const CATS_DESENV = ['Potro ao pé', 'Potro', 'Jovem'];
  const cavalosPresentes = cavalos
    .filter(c => c.presente && (c.categorias?.length ? c.categorias : [c.categoria]).some(cat => CATS_DESENV.includes(cat)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
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

// ─── Anotações Clínicas ────────────────────────────────────────

function AnotacoesClinicasScreen({ cavalos, insumos, servicos, currentUser, anotacoesClinicas, addAnotacaoClinica, updateAnotacaoClinica, deleteAnotacaoClinica, addRegistro, addAtividade, addProcedimento, deleteRegistro, deleteProcedimento, onBack }) {
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editNota, setEditNota] = useState(null);

  const cavalosOrdenados = cavalos.filter(c => c.presente).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

  // Busca no nome do cavalo, título, descrição, tipo. Case-insensitive.
  const normBusca = (busca || '').trim().toLowerCase();
  const matchesBusca = (nota) => {
    if (!normBusca) return true;
    const cav = cavalos.find(c => c.id === nota.cavaloId);
    const alvo = [
      cav?.nome, cav?.baia, cav?.piquete,
      nota.titulo, nota.descricao, nota.tipo, nota.gravidade, nota.autor,
    ].filter(Boolean).join(' ').toLowerCase();
    return alvo.includes(normBusca);
  };

  const lista = anotacoesClinicas
    .filter(matchesBusca)
    .sort((a, b) => (b.data + (b.hora || '')).localeCompare(a.data + (a.hora || '')));

  const meses = [...new Set(lista.map(a => a.mes))].sort((a, b) => b.localeCompare(a));

  // Paginação por mês: só um mês por página.
  const [mesIdx, setMesIdx] = useState(0);
  // Reset quando a busca muda ou o mês some da lista.
  React.useEffect(() => { setMesIdx(0); }, [normBusca]);
  React.useEffect(() => { if (mesIdx >= meses.length && meses.length > 0) setMesIdx(0); }, [meses.length, mesIdx]);
  const mesAtualKey = meses[mesIdx];

  // Agrupa SÓ o mês atual por Dia → Animal. Preserva ordem descendente.
  const paginaMes = useMemo(() => {
    if (!mesAtualKey) return null;
    const notasDoMes = lista.filter(n => n.mes === mesAtualKey);
    const byDia = new Map();
    notasDoMes.forEach(n => {
      if (!byDia.has(n.data)) byDia.set(n.data, new Map());
      const byAnimal = byDia.get(n.data);
      if (!byAnimal.has(n.cavaloId)) byAnimal.set(n.cavaloId, []);
      byAnimal.get(n.cavaloId).push(n);
    });
    return {
      mes: mesAtualKey,
      dias: [...byDia.keys()].sort((a, b) => b.localeCompare(a)).map(data => ({
        data,
        animais: [...byDia.get(data).entries()].map(([cavaloId, notas]) => ({
          cavaloId,
          notas: notas.sort((a, b) => (b.hora || '').localeCompare(a.hora || '')),
        })).sort((a, b) => {
          const na = cavalos.find(c => c.id === a.cavaloId)?.nome || '';
          const nb = cavalos.find(c => c.id === b.cavaloId)?.nome || '';
          return na.localeCompare(nb, 'pt');
        }),
      })),
    };
  }, [lista, mesAtualKey, cavalos]);

  const fmtDataCurta = (dStr) => {
    const d = new Date(dStr + 'T12:00:00');
    const dia = d.getDate();
    const mes = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    return { dia, mes: mes.charAt(0).toUpperCase() + mes.slice(1) };
  };
  const fmtDiaSemana = (dStr) => {
    const d = new Date(dStr + 'T12:00:00');
    return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()];
  };
  const isHoje = (dStr) => dStr === todayStr();

  const handleSave = (notaData, insumosUsados, procsUsados) => {
    const hora = new Date().toTimeString().slice(0, 5);
    const mes = notaData.data.slice(0, 7);
    const usuarioNome = currentUser?.nome || '';

    if (editNota) {
      (editNota.insumosCriados || []).forEach(c => deleteRegistro && deleteRegistro(c.registroId));
      (editNota.procsCriados || []).forEach(c => deleteProcedimento && deleteProcedimento(c.procId));
    }

    const insumosCriados = [];
    insumosUsados.forEach(({ insumoId, qtd }) => {
      if (!insumoId || !qtd) return;
      const rid = 'reg_anot_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const qtdNum = Number(qtd);
      addRegistro({ id: rid, cavaloId: notaData.cavaloId, insumoId, qtd: qtdNum, hora, usuario: usuarioNome, isAuto: false, data: notaData.data });
      addAtividade({ id: 'at_' + rid, tipo: 'insumo', cavaloId: notaData.cavaloId, insumoId, qtd: qtdNum, motivo: `Anotação clínica: ${notaData.titulo}`, usuario: usuarioNome, autor: usuarioNome, mes, data: notaData.data, hora, texto: '' });
      insumosCriados.push({ registroId: rid, insumoId, qtd: qtdNum });
      const descs = addDescartaveis(addRegistro, insumoId, notaData.cavaloId, qtdNum, insumos, hora, 'Sistema (auto)', notaData.data);
      descs.forEach(d => insumosCriados.push(d));
    });

    const procsCriados = [];
    procsUsados.forEach(({ servicoId, notaProc, insumosAdicionais }) => {
      if (!servicoId) return;
      const sv = (servicos || []).find(s => s.id === servicoId);
      const pid = 'proc_anot_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const insAdics = (insumosAdicionais || []).filter(a => a.insumoId && Number(a.qtd) > 0).map(a => ({ insumoId: a.insumoId, qtd: Number(a.qtd) }));
      let total = sv?.valor || 0;
      (sv?.descartaveisObrigatorios || []).forEach(d => {
        const ins = insumos.find(i => i.id === d.insumoId);
        total += (ins?.valorVenda || 0) * d.qtd;
      });
      insAdics.forEach(a => {
        const ins = insumos.find(i => i.id === a.insumoId);
        total += (ins?.valorVenda || 0) * a.qtd;
      });
      addProcedimento({ id: pid, cavaloId: notaData.cavaloId, servicoId, valorServico: sv?.valor || 0, total, descartaveisObrigatorios: sv?.descartaveisObrigatorios || [], insumosAdicionais: insAdics, motoboy: { ativo: false, valor: 0, nome: '' }, laboratorio: '', tubosSelecionados: [], examesSelecionados: [], hora, nota: notaProc || '', data: notaData.data });
      addAtividade({ id: 'at_' + pid, tipo: 'procedimento', cavaloId: notaData.cavaloId, insumoId: null, qtd: null, motivo: `Anotação clínica: ${notaData.titulo} — ${sv?.nome || ''}`, usuario: usuarioNome, autor: usuarioNome, mes, data: notaData.data, hora, texto: '' });
      procsCriados.push({ procId: pid, servicoId, nota: notaProc, insumosAdicionais: insAdics });
    });

    if (editNota) {
      updateAnotacaoClinica(editNota.id, { ...notaData, mes, insumosCriados, procsCriados });
    } else {
      addAnotacaoClinica({ id: 'anot_' + Date.now(), mes, autor: usuarioNome, hora, insumosCriados, procsCriados, ...notaData });
    }
    setShowForm(false);
    setEditNota(null);
  };

  const fmtMesLabel = m => {
    const [a, mm] = m.split('-');
    return new Date(parseInt(a), parseInt(mm) - 1, 15).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 22, padding: 0, cursor: 'pointer', lineHeight: 1 }}>‹</button>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', flex: 1 }}>Anotações Clínicas</div>
          <button onClick={() => { setEditNota(null); setShowForm(true); }} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer' }}>+ Nova</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 90px' }}>
        {/* Busca livre */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--card)', border: '1px solid var(--line)',
          borderRadius: 10, padding: '8px 12px', marginBottom: 12,
        }}>
          <Icon name="search" size={14} color="var(--ink-3)" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por animal, título, descrição, tipo…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)',
            }}
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink-3)', fontSize: 16, lineHeight: 1 }}
            >×</button>
          )}
        </div>

        {normBusca && (
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 12, paddingLeft: 4 }}>
            {lista.length} {lista.length === 1 ? 'anotação encontrada' : 'anotações encontradas'} em {meses.length} {meses.length === 1 ? 'mês' : 'meses'}
          </div>
        )}

        {!showForm && meses.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--soft)', borderRadius: 10, padding: '6px 10px',
            marginBottom: 18, border: '1px solid var(--line)',
          }}>
            <button
              onClick={() => setMesIdx(i => Math.min(i + 1, meses.length - 1))}
              disabled={mesIdx >= meses.length - 1}
              style={{
                background: 'none', border: 'none', fontSize: 20, padding: '2px 12px',
                color: mesIdx >= meses.length - 1 ? 'var(--ink-3)' : 'var(--accent)',
                cursor: mesIdx >= meses.length - 1 ? 'default' : 'pointer',
                fontFamily: 'var(--sans)', opacity: mesIdx >= meses.length - 1 ? 0.35 : 1,
              }}
            >‹</button>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>
                {fmtMesLabel(mesAtualKey)}
              </div>
              {meses.length > 1 && (
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>
                  Página {mesIdx + 1} de {meses.length}
                </div>
              )}
            </div>
            <button
              onClick={() => setMesIdx(i => Math.max(i - 1, 0))}
              disabled={mesIdx === 0}
              style={{
                background: 'none', border: 'none', fontSize: 20, padding: '2px 12px',
                color: mesIdx === 0 ? 'var(--ink-3)' : 'var(--accent)',
                cursor: mesIdx === 0 ? 'default' : 'pointer',
                fontFamily: 'var(--sans)', opacity: mesIdx === 0 ? 0.35 : 1,
              }}
            >›</button>
          </div>
        )}

        {showForm && (
          <AnotacaoForm
            initial={editNota}
            cavalos={cavalosOrdenados}
            insumos={insumos}
            servicos={servicos}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditNota(null); }}
          />
        )}

        {!showForm && lista.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 14 }}>Nenhuma anotação registrada.</div>
        )}

        {!showForm && paginaMes && (
          <div style={{ marginBottom: 28 }}>
            {paginaMes.dias.map(({ data, animais }) => {
              const { dia, mes: mesTxt } = fmtDataCurta(data);
              const hoje = isHoje(data);
              return (
                <div key={data} style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
                  {/* Coluna esquerda — data em selo tipo caderno */}
                  <div style={{
                    flexShrink: 0, width: 54, textAlign: 'center',
                    background: hoje ? 'var(--accent)' : 'var(--card)',
                    color: hoje ? '#fff' : 'var(--ink)',
                    border: `1px solid ${hoje ? 'var(--accent)' : 'var(--line)'}`,
                    borderRadius: 10, padding: '8px 4px', fontFamily: 'var(--sans)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                    height: 'fit-content',
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', opacity: hoje ? 0.8 : 0.55 }}>
                      {fmtDiaSemana(data).toUpperCase()}
                    </div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 24, lineHeight: 1, fontWeight: 400 }}>{dia}</div>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: hoje ? 0.8 : 0.55 }}>{mesTxt}</div>
                    {hoje && <div style={{ fontSize: 8, marginTop: 3, opacity: 0.85, letterSpacing: '0.08em' }}>HOJE</div>}
                  </div>

                  {/* Coluna direita — animais e suas notas */}
                  <div style={{ flex: 1, minWidth: 0, borderLeft: '1px dashed var(--line)', paddingLeft: 12 }}>
                    {animais.map(({ cavaloId, notas }) => {
                      const cavalo = cavalos.find(c => c.id === cavaloId);
                      return (
                        <div key={cavaloId} style={{ marginBottom: 10 }}>
                          {cavalo && (
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
                              fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--accent)', fontWeight: 400,
                            }}>
                              <span>🐴</span>
                              <span>{cavalo.nome}</span>
                              {cavalo.baia && (
                                <span style={{
                                  fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--sans)',
                                  fontWeight: 500, background: 'var(--soft)', borderRadius: 4,
                                  padding: '1px 6px', letterSpacing: '0.04em',
                                }}>{cavalo.baia}</span>
                              )}
                              <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>
                                · {notas.length} {notas.length === 1 ? 'anotação' : 'anotações'}
                              </span>
                            </div>
                          )}
                          {notas.map(nota => (
                            <AnotacaoCard
                              key={nota.id}
                              nota={nota}
                              cavalo={cavalo}
                              insumos={insumos}
                              servicos={servicos}
                              showAnimal={false}
                              onEdit={() => { setEditNota(nota); setShowForm(true); }}
                              onDelete={() => { if (window.confirm('Excluir anotação?')) deleteAnotacaoClinica(nota.id); }}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AnotacaoCard({ nota, cavalo, insumos, servicos, showAnimal, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const cor = TIPO_COR[nota.tipo] || '#6b7280';
  const temItens = (nota.insumosCriados?.length || 0) + (nota.procsCriados?.length || 0) > 0;

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '11px 14px', marginBottom: 7, borderLeft: `3px solid ${cor}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            {nota.hora && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', fontFamily: 'var(--mono, monospace)', letterSpacing: '0.02em' }}>
                {nota.hora}
              </span>
            )}
            {showAnimal && cavalo && <span style={{ fontSize: 12, color: cor, fontWeight: 600 }}>{cavalo.nome}</span>}
            <span style={{ background: cor + '22', color: cor, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{nota.tipo}</span>
            {nota.gravidade && <span style={{ background: (GRAV_COR[nota.gravidade] || '#6b7280') + '22', color: GRAV_COR[nota.gravidade] || '#6b7280', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{nota.gravidade}</span>}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: nota.descricao ? 4 : 0 }}>{nota.titulo}</div>
          {nota.descricao && <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{nota.descricao}</div>}
          {temItens && (
            <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, padding: '4px 0 0', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
              {expanded ? '▲' : '▼'} {(nota.insumosCriados?.length || 0) + (nota.procsCriados?.length || 0)} item(ns) registrado(s)
            </button>
          )}
          {expanded && (
            <div style={{ marginTop: 6, paddingLeft: 4 }}>
              {(nota.insumosCriados || []).map((ins, i) => {
                const insumo = insumos.find(n => n.id === ins.insumoId);
                return <div key={i} style={{ fontSize: 12, color: 'var(--ink-2)', padding: '2px 0' }}>💊 {insumo?.nome || ins.insumoId} · {ins.qtd} {insumo?.unidade || ''}</div>;
              })}
              {(nota.procsCriados || []).map((p, i) => {
                const sv = (servicos || []).find(s => s.id === p.servicoId);
                return (
                  <div key={i} style={{ padding: '2px 0' }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>🔬 {sv?.nome || p.servicoId}{p.nota ? ` — ${p.nota}` : ''}</div>
                    {(p.insumosAdicionais || []).map((a, k) => {
                      const insumo = insumos.find(n => n.id === a.insumoId);
                      return <div key={k} style={{ fontSize: 11, color: 'var(--ink-3)', paddingLeft: 18 }}>· {insumo?.nome || a.insumoId} ×{a.qtd} {insumo?.unidade || ''}</div>;
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={onEdit} style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 8, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--sans)', color: 'var(--ink)' }}>Editar</button>
          <button onClick={onDelete} style={{ background: '#fef2f2', border: 'none', borderRadius: 8, padding: '3px 8px', cursor: 'pointer' }}><Icon name="x" size={12} color="#dc2626" /></button>
        </div>
      </div>
    </div>
  );
}

function AnotacaoForm({ initial, cavalos, insumos, servicos, onSave, onCancel }) {
  const [cavaloId, setCavaloId] = useState(initial?.cavaloId || '');
  const [data, setData] = useState(initial?.data || todayStr());
  const [tipo, setTipo] = useState(initial?.tipo || 'Outro');
  const [gravidade, setGravidade] = useState(initial?.gravidade || '');
  const [titulo, setTitulo] = useState(initial?.titulo || '');
  const [descricao, setDescricao] = useState(initial?.descricao || '');
  const [insumosUsados, setInsumosUsados] = useState(
    (initial?.insumosCriados || [])
      .filter(c => !c.isAuto)
      .map(c => ({ insumoId: c.insumoId, qtd: c.qtd }))
  );
  const [procsUsados, setProcsUsados] = useState(
    (initial?.procsCriados || []).map(c => ({ servicoId: c.servicoId, notaProc: c.nota || '', insumosAdicionais: c.insumosAdicionais || [] }))
  );

  const canSave = cavaloId && data && titulo.trim();

  const setInsumo = (i, key, val) => setInsumosUsados(prev => prev.map((x, j) => j === i ? { ...x, [key]: val } : x));
  const setProc = (i, key, val) => setProcsUsados(prev => prev.map((x, j) => j === i ? { ...x, [key]: val } : x));
  const addProcInsumo = (i) => setProcsUsados(prev => prev.map((x, j) => j === i ? { ...x, insumosAdicionais: [...(x.insumosAdicionais||[]), { insumoId: '', qtd: 1 }] } : x));
  const removeProcInsumo = (i, k) => setProcsUsados(prev => prev.map((x, j) => j === i ? { ...x, insumosAdicionais: (x.insumosAdicionais||[]).filter((_, kk) => kk !== k) } : x));
  const setProcInsumo = (i, k, key, val) => setProcsUsados(prev => prev.map((x, j) => j === i ? { ...x, insumosAdicionais: (x.insumosAdicionais||[]).map((a, kk) => kk === k ? { ...a, [key]: val } : a) } : x));

  return (
    <div style={{ background: 'var(--soft)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>
        {initial ? 'Editar anotação' : 'Nova anotação clínica'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Animal *</div>
          <select value={cavaloId} onChange={e => setCavaloId(e.target.value)} style={inputSt}>
            <option value="">— Selecionar —</option>
            {cavalos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Data *</div>
          <input type="date" value={data} onChange={e => setData(e.target.value)} style={inputSt} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>Tipo</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TIPOS_ANOT.map(t => {
            const c = TIPO_COR[t] || '#6b7280';
            const sel = tipo === t;
            return <button key={t} onClick={() => setTipo(t)} style={{ padding: '5px 11px', borderRadius: 8, border: `1px solid ${sel ? c : 'var(--line)'}`, background: sel ? c + '22' : 'var(--card)', color: sel ? c : 'var(--ink-2)', fontSize: 12, fontWeight: sel ? 700 : 400, cursor: 'pointer', fontFamily: 'var(--sans)' }}>{t}</button>;
          })}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>Gravidade (opcional)</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Leve', 'Moderada', 'Grave'].map(g => {
            const c = GRAV_COR[g];
            const sel = gravidade === g;
            return <button key={g} onClick={() => setGravidade(sel ? '' : g)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${sel ? c : 'var(--line)'}`, background: sel ? c + '22' : 'var(--card)', color: sel ? c : 'var(--ink-2)', fontSize: 13, fontWeight: sel ? 700 : 400, cursor: 'pointer', fontFamily: 'var(--sans)' }}>{g}</button>;
          })}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Título *</div>
        <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Cólica espasmódica leve pós-pastejo" style={inputSt} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Descrição / observações</div>
        <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes, evolução, tratamento aplicado…" rows={3} style={{ ...inputSt, resize: 'vertical', fontFamily: 'var(--sans)', lineHeight: 1.5 }} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Insumos utilizados</div>
          <button onClick={() => setInsumosUsados(prev => [...prev, { insumoId: '', qtd: 1 }])} style={{ background: 'var(--accent-soft)', border: '1px dashed var(--accent)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>+ Adicionar</button>
        </div>
        {insumosUsados.map((ins, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px auto', gap: 6, marginBottom: 6 }}>
            <select value={ins.insumoId} onChange={e => setInsumo(i, 'insumoId', e.target.value)} style={{ ...inputSt, padding: '8px 10px' }}>
              <option value="">— Insumo —</option>
              {[...insumos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt')).map(n => <option key={n.id} value={n.id}>{n.nome}</option>)}
            </select>
            <input type="number" min="0.1" step="0.1" value={ins.qtd} onChange={e => setInsumo(i, 'qtd', e.target.value)} placeholder="Qtd" style={{ ...inputSt, padding: '8px 10px', textAlign: 'center' }} />
            <button onClick={() => setInsumosUsados(prev => prev.filter((_, j) => j !== i))} style={{ background: '#fef2f2', border: 'none', borderRadius: 8, padding: '0 10px', cursor: 'pointer' }}><Icon name="x" size={12} color="#dc2626" /></button>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Procedimentos / Exames</div>
          <button onClick={() => setProcsUsados(prev => [...prev, { servicoId: '', notaProc: '' }])} style={{ background: 'var(--accent-soft)', border: '1px dashed var(--accent)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>+ Adicionar</button>
        </div>
        {procsUsados.map((p, i) => {
          const sv = (servicos || []).find(s => s.id === p.servicoId);
          const insAdics = p.insumosAdicionais || [];
          return (
            <div key={i} style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, marginBottom: 4 }}>
                <select value={p.servicoId} onChange={e => setProc(i, 'servicoId', e.target.value)} style={{ ...inputSt, padding: '8px 10px' }}>
                  <option value="">— Serviço / Exame —</option>
                  {[...servicos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt')).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
                <button onClick={() => setProcsUsados(prev => prev.filter((_, j) => j !== i))} style={{ background: '#fef2f2', border: 'none', borderRadius: 8, padding: '0 10px', cursor: 'pointer' }}><Icon name="x" size={12} color="#dc2626" /></button>
              </div>
              <input value={p.notaProc} onChange={e => setProc(i, 'notaProc', e.target.value)} placeholder="Observação / resultado" style={{ ...inputSt, padding: '8px 10px', fontSize: 13, marginBottom: 8 }} />
              {sv && (sv.descartaveisObrigatorios||[]).length > 0 && (
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 6, fontStyle: 'italic' }}>
                  Descartáveis obrigatórios incluídos: {sv.descartaveisObrigatorios.map(d => { const ins = insumos.find(x => x.id === d.insumoId); return `${ins?.nome || d.insumoId} ×${d.qtd}`; }).join(', ')}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Insumos do procedimento</div>
                <button onClick={() => addProcInsumo(i)} style={{ background: 'none', border: '1px dashed var(--line-2)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>+ Insumo</button>
              </div>
              {insAdics.length === 0 && <div style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic' }}>Nenhum insumo adicional.</div>}
              {insAdics.map((a, k) => (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 80px auto', gap: 6, marginBottom: 4 }}>
                  <select value={a.insumoId} onChange={e => setProcInsumo(i, k, 'insumoId', e.target.value)} style={{ ...inputSt, padding: '6px 8px', fontSize: 12 }}>
                    <option value="">— Insumo —</option>
                    {[...insumos].sort((a2, b2) => a2.nome.localeCompare(b2.nome, 'pt')).map(n => <option key={n.id} value={n.id}>{n.nome}</option>)}
                  </select>
                  <input type="number" min="0.1" step="0.1" value={a.qtd} onChange={e => setProcInsumo(i, k, 'qtd', e.target.value)} placeholder="Qtd" style={{ ...inputSt, padding: '6px 8px', textAlign: 'center', fontSize: 12 }} />
                  <button onClick={() => removeProcInsumo(i, k)} style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: '0 8px', cursor: 'pointer' }}><Icon name="x" size={10} color="#dc2626" /></button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', fontSize: 14, fontFamily: 'var(--sans)' }}>Cancelar</button>
        <button disabled={!canSave} onClick={() => onSave({ cavaloId, data, tipo, gravidade, titulo: titulo.trim(), descricao }, insumosUsados.filter(x => x.insumoId), procsUsados.filter(x => x.servicoId))} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: canSave ? '#7c3aed' : 'var(--soft)', color: canSave ? '#fff' : 'var(--ink-3)', fontSize: 14, fontWeight: 700, fontFamily: 'var(--sans)', cursor: canSave ? 'pointer' : 'default' }}>
          {initial ? 'Salvar alterações' : 'Registrar anotação'}
        </button>
      </div>
    </div>
  );
}

// ─── Share Sheet ──────────────────────────────────────────────

function VetShareSheet({ onClose, getPdf, fileName, summary }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = () => { getPdf()?.save(fileName); onClose(); };

  const handleWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, '_blank');

  const handleShare = async () => {
    setLoading(true);
    const doc = getPdf(); if (!doc) { setLoading(false); return; }
    try {
      const blob = doc.output('blob');
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
      } else if (navigator.share) {
        await navigator.share({ title: fileName, text: summary });
      } else {
        doc.save(fileName);
      }
    } catch (e) { if (e.name !== 'AbortError') getPdf()?.save(fileName); }
    setLoading(false); onClose();
  };

  const btn = (icon, label, color, onClick) => (
    <button onClick={onClick} disabled={loading} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 8px', cursor: 'pointer' }}>
      <div style={{ width: 44, height: 44, borderRadius: 22, background: color + '18', display: 'grid', placeItems: 'center' }}><Icon name={icon} size={22} color={color} /></div>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', fontFamily: 'var(--sans)' }}>{label}</span>
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{ background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: '16px 20px 36px', boxShadow: '0 -4px 32px rgba(0,0,0,0.14)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line-2)', margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', marginBottom: 16 }}>Exportar relatório</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          {btn('share', 'Compartilhar', 'var(--accent)', handleShare)}
          {btn('download', 'Salvar PDF', 'var(--ink-2)', handleDownload)}
        </div>
        <button onClick={handleWhatsApp} style={{ width: '100%', background: '#25D36618', border: '1px solid #25D36640', borderRadius: 14, padding: 14, fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600, color: '#128C47', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
          <span style={{ fontSize: 20 }}>📱</span> Enviar resumo via WhatsApp
        </button>
        <button onClick={onClose} style={{ marginTop: 10, width: '100%', background: 'none', border: 'none', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer', padding: 10 }}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── Relatório Veterinário ─────────────────────────────────────

function RelatorioVetScreen({ cavalos, insumos, servicos, anotacoesClinicas, medicoes, registros, procedimentos, empresaInfo, registrosReproducao, onBack }) {
  const [cavaloId, setCavaloId] = useState('');
  const [mes, setMes] = useState('');
  const [shareOpen, setShareOpen] = useState(false);

  const mesesDisponiveis = useMemo(() => {
    if (!cavaloId) return [];
    const s = new Set();
    anotacoesClinicas.filter(a => a.cavaloId === cavaloId).forEach(a => s.add(a.mes));
    medicoes.filter(m => m.cavaloId === cavaloId).forEach(m => s.add(m.dataRegistro.slice(0, 7)));
    registros.filter(r => r.cavaloId === cavaloId && r.data).forEach(r => s.add(r.data.slice(0, 7)));
    procedimentos.filter(p => p.cavaloId === cavaloId && p.data).forEach(p => s.add(p.data.slice(0, 7)));
    (registrosReproducao || []).filter(r => r.eguaId === cavaloId).forEach(r => s.add(r.mes));
    return [...s].sort((a, b) => b.localeCompare(a));
  }, [cavaloId, anotacoesClinicas, medicoes, registros, procedimentos, registrosReproducao]);

  React.useEffect(() => {
    if (mesesDisponiveis.length > 0 && !mesesDisponiveis.includes(mes)) setMes(mesesDisponiveis[0]);
  }, [mesesDisponiveis]);

  const cavalo = cavalos.find(c => c.id === cavaloId);

  const notas = anotacoesClinicas.filter(a => a.cavaloId === cavaloId && a.mes === mes)
    .sort((a, b) => b.data.localeCompare(a.data));
  const medsMes = medicoes.filter(m => m.cavaloId === cavaloId && m.dataRegistro.slice(0, 7) === mes)
    .sort((a, b) => a.dataRegistro.localeCompare(b.dataRegistro));
  const regsMes = registros.filter(r => r.cavaloId === cavaloId && r.data?.slice(0, 7) === mes);
  const procsMes = procedimentos.filter(p => p.cavaloId === cavaloId && p.data?.slice(0, 7) === mes);
  const reprosMes = resumoReproducaoMes(registrosReproducao, cavaloId, mes);

  const mesAnterior = mes ? (() => {
    const [a, mm] = mes.split('-');
    const m2 = parseInt(mm) - 1;
    return m2 === 0 ? `${parseInt(a) - 1}-12` : `${a}-${String(m2).padStart(2, '0')}`;
  })() : '';
  const medsAnt = medicoes.filter(m => m.cavaloId === cavaloId && m.dataRegistro.slice(0, 7) === mesAnterior)
    .sort((a, b) => b.dataRegistro.localeCompare(a.dataRegistro));
  const ultimaMed = medsMes[medsMes.length - 1];
  const ultimaMedAnt = medsAnt[0];
  const deltaPeso = ultimaMed?.peso != null && ultimaMedAnt?.peso != null ? Number(ultimaMed.peso) - Number(ultimaMedAnt.peso) : null;
  const deltaAltura = ultimaMed?.alturaCernelha != null && ultimaMedAnt?.alturaCernelha != null ? Number(ultimaMed.alturaCernelha) - Number(ultimaMedAnt.alturaCernelha) : null;

  const fmtMesLabel = m => {
    if (!m) return '';
    const [a, mm] = m.split('-');
    return new Date(parseInt(a), parseInt(mm) - 1, 15).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const cavalosPresentes = cavalos.filter(c => c.presente).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

  const secTitle = (txt) => (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-3)', marginBottom: 8 }}>{txt}</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 22, padding: 0, cursor: 'pointer', lineHeight: 1 }}>‹</button>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', flex: 1 }}>Relatório Veterinário</div>
          {cavaloId && mes && (
            <button onClick={() => setShareOpen(true)} style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="share" size={14} color="#fff" /> PDF
            </button>
          )}
        </div>
      </div>

      {shareOpen && cavaloId && mes && (() => {
        const pdfArgs = { cavalo, mesLabel: fmtMesLabel(mes), notas, medsMes, regsMes, procsMes, insumos, servicos, deltaPeso, deltaAltura, empresa: empresaInfo, reprosMes };
        return (
          <VetShareSheet
            onClose={() => setShareOpen(false)}
            getPdf={() => gerarPdfRelatorio(pdfArgs)}
            fileName={nomePdfRelatorio(cavalo, fmtMesLabel(mes))}
            summary={gerarResumoRelatorio(pdfArgs)}
          />
        );
      })()}

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 90px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Animal</div>
            <select value={cavaloId} onChange={e => { setCavaloId(e.target.value); setMes(''); }} style={inputSt}>
              <option value="">— Selecionar —</option>
              {cavalosPresentes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Mês</div>
            <select value={mes} onChange={e => setMes(e.target.value)} style={inputSt} disabled={!cavaloId || mesesDisponiveis.length === 0}>
              <option value="">— Mês —</option>
              {mesesDisponiveis.map(m => <option key={m} value={m}>{fmtMesLabel(m)}</option>)}
            </select>
          </div>
        </div>

        {!cavaloId && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 14 }}>Selecione um animal para ver o relatório.</div>}
        {cavaloId && !mes && mesesDisponiveis.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 14 }}>Nenhum registro para {cavalo?.nome}.</div>}

        {cavaloId && mes && (
          <>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', marginBottom: 18 }}>
              {cavalo?.nome} · {fmtMesLabel(mes)}
            </div>

            {medsMes.length > 0 && (
              <div style={{ background: 'var(--card)', borderRadius: 14, padding: '14px 16px', marginBottom: 14, border: '1px solid var(--line)' }}>
                {secTitle('📏 Biometria')}
                {medsMes.map((m, idx) => (
                  <div key={m.id} style={{ marginBottom: idx < medsMes.length - 1 ? 12 : 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>{new Date(m.dataRegistro + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {m.peso != null && <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>Peso: {m.peso} kg</span>}
                      {m.alturaCernelha != null && <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>Altura: {m.alturaCernelha} cm</span>}
                      {CAMPOS_MEDICAO.filter(f => f.grupo !== 'principal' && m[f.id] != null).map(f => (
                        <span key={f.id} style={{ background: 'var(--soft)', borderRadius: 8, padding: '3px 10px', fontSize: 11, color: 'var(--ink)' }}>{f.label}: {m[f.id]}{f.unidade ? ' ' + f.unidade : ''}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {(deltaPeso != null || deltaAltura != null) && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {deltaPeso != null && <span style={{ fontSize: 12, color: deltaPeso >= 0 ? '#15803d' : '#dc2626', fontWeight: 700 }}>{deltaPeso >= 0 ? '▲' : '▼'} Peso: {deltaPeso > 0 ? '+' : ''}{deltaPeso.toFixed(1)} kg vs mês anterior</span>}
                    {deltaAltura != null && <span style={{ fontSize: 12, color: deltaAltura >= 0 ? '#15803d' : '#dc2626', fontWeight: 700 }}>{deltaAltura >= 0 ? '▲' : '▼'} Altura: {deltaAltura > 0 ? '+' : ''}{deltaAltura.toFixed(1)} cm vs mês anterior</span>}
                  </div>
                )}
              </div>
            )}

            {notas.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                {secTitle(`🩺 Anotações Clínicas (${notas.length})`)}
                {notas.map(nota => {
                  const cor = TIPO_COR[nota.tipo] || '#6b7280';
                  return (
                    <div key={nota.id} style={{ background: 'var(--card)', borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: '1px solid var(--line)', borderLeft: `3px solid ${cor}` }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{new Date(nota.data + 'T12:00:00').toLocaleDateString('pt-BR')}{nota.hora ? ` · ${nota.hora}` : ''}</span>
                        <span style={{ background: cor + '22', color: cor, borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{nota.tipo}</span>
                        {nota.gravidade && <span style={{ background: (GRAV_COR[nota.gravidade] || '#6b7280') + '22', color: GRAV_COR[nota.gravidade] || '#6b7280', borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{nota.gravidade}</span>}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{nota.titulo}</div>
                      {nota.descricao && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 3, lineHeight: 1.5 }}>{nota.descricao}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {regsMes.length > 0 && (
              <div style={{ background: 'var(--card)', borderRadius: 14, padding: '14px 16px', marginBottom: 14, border: '1px solid var(--line)' }}>
                {secTitle('💊 Insumos administrados')}
                {regsMes.map(r => {
                  const ins = insumos.find(i => i.id === r.insumoId);
                  return (
                    <div key={r.id} style={{ fontSize: 13, color: 'var(--ink)', padding: '5px 0', borderBottom: '1px solid var(--soft)' }}>
                      <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>{new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR')} · </span>
                      {ins?.nome || r.insumoId} — {r.qtd} {ins?.unidade || ''}
                    </div>
                  );
                })}
              </div>
            )}

            {procsMes.length > 0 && (
              <div style={{ background: 'var(--card)', borderRadius: 14, padding: '14px 16px', marginBottom: 14, border: '1px solid var(--line)' }}>
                {secTitle('🔬 Procedimentos realizados')}
                {procsMes.map(p => {
                  const sv = (servicos || []).find(s => s.id === p.servicoId);
                  return (
                    <div key={p.id} style={{ fontSize: 13, color: 'var(--ink)', padding: '5px 0', borderBottom: '1px solid var(--soft)' }}>
                      <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>{p.data ? new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—'} · </span>
                      {sv?.nome || p.servicoId}{p.nota ? ` — ${p.nota}` : ''}
                    </div>
                  );
                })}
              </div>
            )}

            {reprosMes.length > 0 && (
              <div style={{ background: 'var(--card)', borderRadius: 14, padding: '14px 16px', marginBottom: 14, border: '1px solid var(--line)' }}>
                {secTitle('🐴 Registros Reprodutivos')}
                {reprosMes.map(r => {
                  const TIPO_REPROD_LABEL = { controle_folicular: 'Controle Folicular', inseminacao_artificial: 'Inseminação Artificial', coleta_embriao: 'Coleta de Embrião', lavagem_uterina: 'Lavagem Uterina', diagnostico_gestacao: 'Diagnóstico de Gestação' };
                  const TIPO_REPROD_COR = { controle_folicular: '#0e7490', inseminacao_artificial: '#1d4ed8', coleta_embriao: '#b45309', lavagem_uterina: '#15803d', diagnostico_gestacao: '#9d174d' };
                  const cor = TIPO_REPROD_COR[r.tipo] || '#6b7280';
                  const label = TIPO_REPROD_LABEL[r.tipo] || r.tipo;
                  const d = r.dados || {};
                  const detalhes = [];
                  if (r.tipo === 'inseminacao_artificial') { if (d.garanhao) detalhes.push(d.garanhao); if (d.qtdPalhetas) detalhes.push(`${d.qtdPalhetas} palheta${d.qtdPalhetas>1?'s':''}`); }
                  if (r.tipo === 'coleta_embriao' && d.resultado) detalhes.push(d.resultado === 'positivo' ? '✓ Positiva' : '✗ Negativa');
                  if (r.tipo === 'diagnostico_gestacao' && d.resultado) detalhes.push(d.resultado === 'positivo' ? '✓ Gestante' : '✗ Vazio');
                  if (r.tipo === 'controle_folicular' && d.induzirOvulacao) detalhes.push('⚡ Ovulação induzida');
                  return (
                    <div key={r.id} style={{ fontSize: 13, color: 'var(--ink)', padding: '6px 0', borderBottom: '1px solid var(--soft)' }}>
                      <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>{new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR')} · </span>
                      <span style={{ background: cor + '20', color: cor, borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 600, marginRight: 6 }}>{label}</span>
                      {detalhes.join(' · ')}
                    </div>
                  );
                })}
              </div>
            )}

            {notas.length === 0 && medsMes.length === 0 && regsMes.length === 0 && procsMes.length === 0 && reprosMes.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 14 }}>Nenhum registro clínico para este mês.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Exames Complementares ────────────────────────────────────

const TIPOS_EXAME = ['Raio-X','Ultrassom','Endoscopia','Odontograma','Hemograma','Bioquímica','Laudo','Eletrocardiograma','Outros'];
const TIPO_EXAME_COR = { 'Raio-X':'#1d4ed8','Ultrassom':'#0e7490','Endoscopia':'#7c3aed','Odontograma':'#9d174d','Hemograma':'#dc2626','Bioquímica':'#b45309','Laudo':'#374151','Eletrocardiograma':'#15803d','Outros':'#6b7280' };

function ExamesComplementaresScreen({ cavalos, exames, uploadExame, deleteExame, onBack }) {
  const [filtroAnimal, setFiltroAnimal] = useState('');
  const [showForm, setShowForm] = useState(false);

  const cavalosOrdenados = cavalos.filter(c => c.presente).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

  const lista = (exames || [])
    .filter(e => !filtroAnimal || e.cavaloId === filtroAnimal)
    .sort((a, b) => b.data.localeCompare(a.data));

  const meses = [...new Set(lista.map(e => e.mes))].sort((a, b) => b.localeCompare(a));

  const fmtMesLabel = m => {
    const [a, mm] = m.split('-');
    return new Date(parseInt(a), parseInt(mm) - 1, 15).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const ehImagem = (tipo) => tipo && tipo.startsWith('image/');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 22, padding: 0, cursor: 'pointer', lineHeight: 1 }}>‹</button>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', flex: 1 }}>Exames Complementares</div>
          <button onClick={() => setShowForm(true)} style={{ background: '#0e7490', color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer' }}>+ Anexar</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 90px' }}>
        <select value={filtroAnimal} onChange={e => setFiltroAnimal(e.target.value)} style={{ ...inputSt, marginBottom: 16, fontSize: 13 }}>
          <option value="">Todos os animais</option>
          {cavalosOrdenados.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        {showForm && (
          <ExameUploadForm
            cavalos={cavalosOrdenados}
            onSave={async (meta, file) => { await uploadExame(meta, file); setShowForm(false); }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {!showForm && lista.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 14 }}>
            Nenhum exame anexado.
          </div>
        )}

        {!showForm && meses.map(m => (
          <div key={m} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 10 }}>{fmtMesLabel(m)}</div>
            {lista.filter(e => e.mes === m).map(exame => {
              const cavalo = cavalos.find(c => c.id === exame.cavaloId);
              const cor = TIPO_EXAME_COR[exame.tipo] || '#6b7280';
              const isImg = ehImagem(exame.arquivoTipo);
              const isPdf = exame.arquivoTipo === 'application/pdf';
              return (
                <div key={exame.id} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', marginBottom: 10, borderLeft: `3px solid ${cor}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {isImg && exame.arquivoUrl && (
                      <img src={exame.arquivoUrl} alt={exame.arquivoNome} onClick={() => window.open(exame.arquivoUrl, '_blank')} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0, cursor: 'pointer' }} />
                    )}
                    {!isImg && (
                      <div onClick={() => exame.arquivoUrl && window.open(exame.arquivoUrl, '_blank')} style={{ width: 60, height: 60, borderRadius: 8, background: cor + '18', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: exame.arquivoUrl ? 'pointer' : 'default' }}>
                        <Icon name="doc" size={24} color={cor} />
                        {isPdf && <span style={{ fontSize: 8, color: cor, fontWeight: 700, marginTop: 2 }}>PDF</span>}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ background: cor + '22', color: cor, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{exame.tipo}</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{new Date(exame.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        {!filtroAnimal && cavalo && <span style={{ fontSize: 12, color: cor, fontWeight: 600 }}>· {cavalo.nome}</span>}
                      </div>
                      {exame.descricao && <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 6 }}>{exame.descricao}</div>}
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>{exame.arquivoNome}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {exame.arquivoUrl && (
                          <button onClick={() => window.open(exame.arquivoUrl, '_blank')} style={{ background: cor + '18', border: `1px solid ${cor}40`, borderRadius: 8, padding: '4px 12px', fontSize: 12, color: cor, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                            {isImg ? 'Ver imagem' : 'Abrir'}
                          </button>
                        )}
                        <button onClick={() => { if (window.confirm('Excluir exame?')) deleteExame(exame.id); }} style={{ background: '#fef2f2', border: 'none', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}><Icon name="x" size={12} color="#dc2626" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExameUploadForm({ cavalos, onSave, onCancel }) {
  const [cavaloId, setCavaloId] = useState('');
  const [data, setData] = useState(todayStr());
  const [tipo, setTipo] = useState('Outros');
  const [descricao, setDescricao] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const canSave = cavaloId && data && file;

  const handleSave = async () => {
    if (!canSave) return;
    setLoading(true);
    try {
      await onSave({ cavaloId, data, tipo, descricao, mes: data.slice(0, 7) }, file);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--soft)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Anexar exame</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Animal *</div>
          <select value={cavaloId} onChange={e => setCavaloId(e.target.value)} style={inputSt}>
            <option value="">— Selecionar —</option>
            {cavalos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Data *</div>
          <input type="date" value={data} onChange={e => setData(e.target.value)} style={inputSt} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>Tipo de exame</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TIPOS_EXAME.map(t => {
            const c = TIPO_EXAME_COR[t] || '#6b7280';
            const sel = tipo === t;
            return <button key={t} onClick={() => setTipo(t)} style={{ padding: '5px 11px', borderRadius: 8, border: `1px solid ${sel ? c : 'var(--line)'}`, background: sel ? c + '22' : 'var(--card)', color: sel ? c : 'var(--ink-2)', fontSize: 12, fontWeight: sel ? 700 : 400, cursor: 'pointer', fontFamily: 'var(--sans)' }}>{t}</button>;
          })}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Descrição / observações</div>
        <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Raio-X lateral esquerdo — fratura confirmada" style={inputSt} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>Arquivo * (PDF, imagem, raio-X)</div>
        <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.gif,.tiff,.dcm" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
        <button onClick={() => fileRef.current?.click()} style={{ width: '100%', background: file ? '#dcfce7' : 'var(--card)', border: `2px dashed ${file ? '#15803d' : 'var(--line)'}`, borderRadius: 12, padding: 16, cursor: 'pointer', fontSize: 14, color: file ? '#15803d' : 'var(--ink-3)', fontFamily: 'var(--sans)', fontWeight: file ? 600 : 400 }}>
          {file ? `✓ ${file.name}` : '📎 Toque para selecionar arquivo'}
        </button>
        {file && (
          <button onClick={() => setFile(null)} style={{ marginTop: 6, background: 'none', border: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Remover arquivo</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', fontSize: 14, fontFamily: 'var(--sans)' }}>Cancelar</button>
        <button disabled={!canSave || loading} onClick={handleSave} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: canSave && !loading ? '#0e7490' : 'var(--soft)', color: canSave && !loading ? '#fff' : 'var(--ink-3)', fontSize: 14, fontWeight: 700, fontFamily: 'var(--sans)', cursor: canSave && !loading ? 'pointer' : 'default' }}>
          {loading ? 'Enviando…' : 'Salvar exame'}
        </button>
      </div>
    </div>
  );
}
