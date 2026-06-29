// screens.jsx — All app screens for App Epona
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Icon, CATEGORIA_ICONS } from './icons';
import { getEmpresa, saveEmpresa } from './utils/empresa';
import { gerarPdfFatura, nomePdfFatura } from './utils/pdfFatura';
import {
  CAVALOS, PROPRIETARIOS, INSUMOS, CATEGORIAS_CAVALO, CATEGORIAS_INSUMOS,
  AVISOS, ATIVIDADES, CATEGORIAS_SERVICOS, SERVICOS,
  getCavalo, getInsumo, getCategoria, idade, formatBRL,
  consumoDiarioCavalo, norm,
} from './data';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const TUBOS_CORES = {
  i_tubo_roxo:     { nome: 'Tubo Roxo',     cor: '#7c3aed' },
  i_tubo_vermelho: { nome: 'Tubo Vermelho',  cor: '#dc2626' },
  i_tubo_verde:    { nome: 'Tubo Verde',     cor: '#16a34a' },
  i_tubo_cinza:    { nome: 'Tubo Cinza',     cor: '#6b7280' },
  i_tubo_amarelo:  { nome: 'Tubo Amarelo',   cor: '#eab308' },
  i_swab_stuart:   { nome: 'Swab + Stuart',  cor: '#0ea5e9' },
  i_swab_seco:     { nome: 'Swab Seco',       cor: '#f97316' },
};

const calcDias = (cavalo, ref, movimentacoes) => {
  const cavaloId = cavalo.id;
  const inicioMes = new Date(ref.ano, ref.mes - 1, 1);
  const fimMes = new Date(ref.ano, ref.mes, 0);
  const diasTotais = fimMes.getDate();
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const isCurrentMonth = today.getFullYear() === ref.ano && today.getMonth() + 1 === ref.mes;
  const fimEfetivo = isCurrentMonth ? new Date(Math.min(today.getTime(), fimMes.getTime())) : fimMes;

  const cavMovs = (movimentacoes || [])
    .filter(m => m.cavaloId === cavaloId)
    .map(m => ({ ...m, d: new Date(m.data) }))
    .sort((a, b) => a.d - b.d);

  const antes = cavMovs.filter(m => m.d < inicioMes);
  const dentroMes = cavMovs.filter(m => m.d >= inicioMes && m.d <= fimMes);

  // Se tem dataEntrada, usa como referência de presença inicial
  let presente;
  if (cavalo.dataEntrada && !cavMovs.find(m => m.tipo === 'entrada' && m.d < inicioMes)) {
    const dataEntradaDate = new Date(cavalo.dataEntrada + 'T00:00:00');
    presente = dataEntradaDate < inicioMes;
  } else {
    presente = antes.length > 0 ? antes[antes.length - 1].tipo === 'entrada' : true;
  }

  if (dentroMes.length === 0) {
    if (!presente) return { dias: 0, total: diasTotais, parcial: true };
    let dataInicio = new Date(inicioMes);
    if (cavalo.dataEntrada && !cavMovs.find(m => m.tipo === 'entrada' && m.d < inicioMes)) {
      const dataEntradaDate = new Date(cavalo.dataEntrada + 'T00:00:00');
      if (dataEntradaDate > inicioMes) dataInicio = dataEntradaDate;
    }
    const diasEfetivos = Math.floor((fimEfetivo - dataInicio) / (1000 * 60 * 60 * 24)) + 1;
    return { dias: Math.min(Math.max(diasEfetivos, 0), diasTotais), total: diasTotais, parcial: true };
  }

  let dias = 0;
  let cursor = new Date(inicioMes);
  for (const m of dentroMes) {
    if (presente) {
      dias += Math.max(0, Math.floor((m.d - cursor) / (1000 * 60 * 60 * 24)) + (m.tipo === 'saida' ? 1 : 0));
    }
    presente = m.tipo === 'entrada';
    cursor = new Date(m.d);
  }
  if (presente) {
    dias += Math.max(0, Math.floor((fimEfetivo - cursor) / (1000 * 60 * 60 * 24)) + 1);
  }
  return { dias: Math.min(dias, diasTotais), total: diasTotais, parcial: true };
};

const calcDiasItem = (cav, ref, movimentacoes, dataInicio, dataFim) => {
  if (!dataInicio && !dataFim) return calcDias(cav, ref, movimentacoes).dias;
  const inicioMes = new Date(ref.ano, ref.mes - 1, 1);
  const fimMes = new Date(ref.ano, ref.mes, 0);
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const rangeS = dataInicio ? new Date(dataInicio + 'T00:00:00') : inicioMes;
  const rangeE = dataFim ? new Date(dataFim + 'T00:00:00') : fimMes;
  const efStart = rangeS > inicioMes ? rangeS : inicioMes;
  const efEndRaw = rangeE < fimMes ? rangeE : fimMes;
  const efEnd = new Date(Math.min(efEndRaw.getTime(), today.getTime()));
  if (efEnd < efStart) return 0;
  const cavaloId = cav.id;
  const cavMovs = (movimentacoes || [])
    .filter(m => m.cavaloId === cavaloId)
    .map(m => ({ ...m, d: new Date(m.data) }))
    .sort((a, b) => a.d - b.d);
  const antes = cavMovs.filter(m => m.d < efStart);
  const dentroPeriodo = cavMovs.filter(m => m.d >= efStart && m.d <= efEnd);
  let presente;
  if (cav.dataEntrada && !cavMovs.find(m => m.tipo === 'entrada' && m.d < efStart)) {
    presente = new Date(cav.dataEntrada + 'T00:00:00') < efStart;
  } else {
    presente = antes.length > 0 ? antes[antes.length - 1].tipo === 'entrada' : true;
  }
  if (dentroPeriodo.length === 0) {
    if (!presente) return 0;
    let contStart = new Date(efStart);
    if (cav.dataEntrada && !cavMovs.find(m => m.tipo === 'entrada' && m.d < efStart)) {
      const ent = new Date(cav.dataEntrada + 'T00:00:00');
      if (ent > efStart) contStart = ent;
    }
    if (contStart > efEnd) return 0;
    return Math.max(0, Math.floor((efEnd - contStart) / 86400000) + 1);
  }
  let dias = 0;
  let cursor = new Date(efStart);
  for (const m of dentroPeriodo) {
    if (presente) dias += Math.max(0, Math.floor((m.d - cursor) / 86400000) + (m.tipo === 'saida' ? 1 : 0));
    presente = m.tipo === 'entrada';
    cursor = new Date(m.d);
  }
  if (presente) dias += Math.max(0, Math.floor((efEnd - cursor) / 86400000) + 1);
  return dias;
};

const calcMensalidadeProporcional = (cav, ref, movimentacoes) => {
  const { dias, total, parcial } = calcDias(cav, ref, movimentacoes);
  const rawBase = Number(cav.mensalidade);
  const valorBase = Number.isFinite(rawBase) ? rawBase : 0;
  const valor = total > 0 ? valorBase * (dias / total) : 0;
  if (cav.nome && (cav.nome.toUpperCase().includes('CAMILA') || cav.nome.toUpperCase().includes('WB 36'))) {
    console.log('[EPONA DEBUG mensalidade]', {
      nome: cav.nome, id: cav.id,
      cav_mensalidade_raw: cav.mensalidade,
      cav_mensalidade_typeof: typeof cav.mensalidade,
      rawBase, valorBase,
      dias, total, parcial,
      valor,
      ref,
      proprietarioId: cav.proprietarioId, proprietarioIds: cav.proprietarioIds,
      dataEntrada: cav.dataEntrada, presente: cav.presente,
    });
  }
  return { dias, total, parcial, valor, valorBase };
};

const calcDosesPeriodico = (p, ref) => {
  const inicioMes = new Date(ref.ano, ref.mes - 1, 1);
  const fimMes = new Date(ref.ano, ref.mes, 0);
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const isCurrentMonth = today.getFullYear() === ref.ano && today.getMonth() + 1 === ref.mes;
  const fimEfetivo = isCurrentMonth ? new Date(Math.min(today.getTime(), fimMes.getTime())) : fimMes;
  const dataInicio = p.dataInicio ? new Date(p.dataInicio + 'T00:00:00') : inicioMes;
  const effectiveStart = new Date(Math.max(dataInicio.getTime(), inicioMes.getTime()));
  if (effectiveStart > fimEfetivo) return 0;
  if (p.frequencia === 'diario') {
    return Math.max(0, Math.floor((fimEfetivo - effectiveStart) / (1000 * 60 * 60 * 24)) + 1);
  }
  const freqDias = p.frequencia === 'quinzenal' ? 14 : p.frequencia === 'semanal' ? 7 :
    p.frequencia?.startsWith('cada') ? (parseInt(p.frequencia.replace('cada', '')) || 7) : 7;
  let cursor = new Date(effectiveStart);
  if (p.frequencia === 'semanal' || p.frequencia === 'quinzenal') {
    const targetDay = p.diaSemana != null ? p.diaSemana : cursor.getDay();
    const offset = (targetDay - cursor.getDay() + 7) % 7;
    cursor.setDate(cursor.getDate() + offset);
  }
  let doses = 0;
  while (cursor <= fimEfetivo) { doses++; cursor.setDate(cursor.getDate() + freqDias); }
  return doses;
};

const calcPerfilMes = (cav, ref, movimentacoes, insumos) => {
  const { dias } = calcDias(cav, ref, movimentacoes);
  if (!cav.nutricao || dias === 0) return { linhas: [], total: 0, dias };
  const findIns = (id) => (insumos || []).find(i => i.id === id);
  const linhas = [];
  if (cav.nutricao.oleoMlDia > 0) {
    const oleoIns = findIns('i_oleo') || (insumos || []).find(i => i.nome?.toLowerCase().includes('óleo') || i.nome?.toLowerCase().includes('oleo'));
    if (oleoIns) linhas.push({ insumoId: oleoIns.id, nome: oleoIns.nome, qtdDia: cav.nutricao.oleoMlDia, unidade: oleoIns.unidade, valorUnit: oleoIns.valorVenda, valorDia: oleoIns.valorVenda * cav.nutricao.oleoMlDia, valorMes: oleoIns.valorVenda * cav.nutricao.oleoMlDia * dias, tipoLinha: 'nutricional', diasUsados: dias });
  }
  for (const s of (cav.nutricao.suplementos || [])) {
    const ins = findIns(s.insumoId);
    if (!ins) continue;
    const diasEfetivos = calcDiasItem(cav, ref, movimentacoes, s.dataInicio, s.dataFim);
    linhas.push({ insumoId: ins.id, nome: ins.nome, qtdDia: s.qtdDia, unidade: ins.unidade, valorUnit: ins.valorVenda, valorDia: ins.valorVenda * s.qtdDia, valorMes: ins.valorVenda * s.qtdDia * diasEfetivos });
  }
  for (const p of (cav.nutricao.periodicos || [])) {
    const ins = findIns(p.insumoId);
    if (!ins) continue;
    const freqDias = p.frequencia === 'quinzenal' ? 14 : p.frequencia === 'semanal' ? 7 : p.frequencia === 'diario' ? 1 : p.frequencia?.startsWith('cada') ? parseInt(p.frequencia.replace('cada', '')) || 7 : 7;
    const qtdDia = p.qtd / freqDias;
    const diasEfetivos = calcDiasItem(cav, ref, movimentacoes, p.dataInicio, p.dataFim);
    linhas.push({ insumoId: ins.id, nome: ins.nome + ' (periódico)', qtdDia, unidade: ins.unidade, valorUnit: ins.valorVenda, valorDia: ins.valorVenda * qtdDia, valorMes: ins.valorVenda * qtdDia * diasEfetivos });
  }
  return { linhas, total: linhas.reduce((s, l) => s + l.valorMes, 0), dias };
};

// ─────────────────────────────────────────────────────────────
// Shared chrome
// ─────────────────────────────────────────────────────────────
const TopBar = ({ title, onBack, action, subtitle }) => (
  <div style={{
    padding: '8px 20px 14px', display: 'flex', alignItems: 'flex-start',
    gap: 12, borderBottom: '1px solid var(--line)', background: 'var(--bg)',
  }}>
    {onBack && (
      <button onClick={onBack} style={{
        width: 36, height: 36, borderRadius: 12, border: '1px solid var(--line)',
        background: 'var(--card)', display: 'grid', placeItems: 'center',
        marginTop: 2, color: 'var(--ink)',
      }}>
        <Icon name="arrow-left" size={18} />
      </button>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <h1 style={{
        fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 26, lineHeight: 1.1,
        margin: 0, color: 'var(--ink)', letterSpacing: '-0.01em',
      }}>{title}</h1>
      {subtitle && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{subtitle}</div>}
    </div>
    {action}
  </div>
);

const TabBarBase = ({ tabs, tab, setTab }) => (
  <div style={{
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'var(--bg)', borderTop: '1px solid var(--line)',
    paddingTop: 8, paddingBottom: 28,
    display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, gap: 0,
    zIndex: 5,
  }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => setTab(t.id)} style={{
        background: 'none', border: 'none', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 3, padding: '6px 0',
        color: tab === t.id ? 'var(--accent)' : 'var(--ink-3)',
        fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500,
      }}>
        <Icon name={t.icon} size={22} />
        <span>{t.label}</span>
      </button>
    ))}
  </div>
);

const TabBar = ({ tab, setTab, role = 'admin' }) => {
  const adminTabs = [
    { id: 'home', label: 'Hoje', icon: 'home' },
    { id: 'cavalos', label: 'Cavalos', icon: 'horse' },
    { id: 'partos', label: 'Veterinária', icon: 'stethoscope' },
    { id: 'cadastros', label: 'Cadastros', icon: 'package' },
    { id: 'nutricional', label: 'Nutrição', icon: 'wheat' },
    { id: 'faturas', label: 'Financeiro', icon: 'doc' },
    { id: 'equipe', label: 'Equipe', icon: 'users' },
  ];
  const vetTabs = [
    { id: 'home', label: 'Hoje', icon: 'home' },
    { id: 'cavalos', label: 'Cavalos', icon: 'horse' },
    { id: 'partos', label: 'Veterinária', icon: 'stethoscope' },
    { id: 'cadastros', label: 'Cadastros', icon: 'package' },
    { id: 'nutricional', label: 'Nutrição', icon: 'wheat' },
    { id: 'compras', label: 'Compras', icon: 'cart' },
    { id: 'equipe', label: 'Equipe', icon: 'users' },
  ];
  const tabs = role === 'vet' ? vetTabs : adminTabs;
  return <TabBarBase tabs={tabs} tab={tab} setTab={setTab} />;
};

const OperacionalTabBar = ({ tab, setTab }) => {
  const tabs = [
    { id: 'avisos', label: 'Avisos', icon: 'bell' },
    { id: 'nutricional', label: 'Nutrição', icon: 'leaf' },
    { id: 'compras', label: 'Compras', icon: 'cart' },
    { id: 'equipe', label: 'Equipe', icon: 'users' },
  ];
  return <TabBarBase tabs={tabs} tab={tab} setTab={setTab} />;
};

// Avatar for cavalos — abstract pelagem swatch with monogram
const HorseAvatar = ({ cavalo, size = 44 }) => {
  const palette = {
    'Tordilho': ['#d4d4d8', '#a1a1aa'],
    'Alazã': ['#c2410c', '#9a3412'],
    'Castanho': ['#78350f', '#5a2509'],
    'Preto': ['#1f1d1a', '#0a0908'],
    'Baia': ['#a16207', '#854d0e'],
    'Rosilha': ['#a8a29e', '#78716c'],
  };
  const [c1, c2] = palette[cavalo.pelagem] || ['#a8a29e', '#78716c'];
  return (
    <div style={{
      width: size, height: size, borderRadius: size,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'grid', placeItems: 'center', flexShrink: 0,
      boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.15)',
      color: '#fff', fontFamily: 'var(--serif)', fontSize: size * 0.42,
      letterSpacing: '-0.02em',
    }}>
      {cavalo.nome[0]}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Activity row — used in Home and Histórico
// ─────────────────────────────────────────────────────────────
const fmtDataHora = (dataStr, horaStr) => {
  if (!dataStr && !horaStr) return '';
  if (!dataStr) return horaStr || '';
  const hoje = new Date().toLocaleDateString('sv-SE');
  const ontem = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE');
  const t = horaStr || '';
  if (dataStr === hoje) return t;
  if (dataStr === ontem) return 'Ontem ' + t;
  const d = dataStr.split('-');
  return `${d[2]}/${d[1]} ${t}`;
};
const ActivityRow = ({ a, first, currentUser, removeAtividade, insumos = [], cavalos = [] }) => {
  const cav = a.cavaloId && (cavalos.find(c => c.id === a.cavaloId) || getCavalo(a.cavaloId));
  let icon, color, title, sub;
  if (a.tipo === 'insumo') {
    const ins = insumos.find(i => i.id === a.insumoId) || getInsumo(a.insumoId);
    const cat = ins ? getCategoria(ins.categoria) : undefined;
    icon = cat?.id ? CATEGORIA_ICONS[cat.id] : 'package';
    color = cat?.cor || '#888';
    title = `${cav?.nome || a.cavaloId} · ${ins?.nome || a.insumoId}`;
    sub = `${a.qtd} ${ins?.unidade || 'un'} · ${a.usuario}`;
  } else if (a.tipo === 'entrada') {
    icon = 'plus'; color = '#3d6043';
    title = `Entrada · ${cav?.nome || a.cavaloId}`;
    sub = `${a.motivo} · ${a.usuario}`;
  } else if (a.tipo === 'saida') {
    icon = 'arrow-left'; color = '#854d0e';
    title = `Saída · ${cav?.nome || a.cavaloId}`;
    sub = `${a.motivo} · ${a.usuario}`;
  } else if (a.tipo === 'cadastro') {
    icon = 'plus'; color = '#0f766e';
    title = `Novo cavalo · ${cav?.nome || a.cavaloId}`;
    sub = `Cadastrado por ${a.usuario}`;
  } else if (a.tipo === 'aviso') {
    icon = 'bell'; color = '#7c2d12';
    title = `Aviso · ${a.autor}`;
    sub = a.texto;
  } else if (a.tipo === 'nutricao') {
    icon = 'wheat'; color = '#3d6043';
    title = `Nutrição · ${cav?.nome || ''}`;
    sub = a.texto || `Atualizado por ${a.usuario}`;
  } else if (a.tipo === 'gestacao') {
    icon = 'heart'; color = '#7c3aed';
    title = a.texto || `Acompanhamento gestacional · ${cav?.nome || ''}`;
    sub = `Por ${a.usuario}`;
  } else if (a.tipo === 'procedimento') {
    icon = 'stethoscope'; color = '#0369a1';
    const linhas = (a.texto || '').split('\n');
    title = linhas[0] || 'Procedimento';
    sub = linhas.slice(1).join('\n');
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
      borderTop: first ? 'none' : '1px solid var(--line)',
    }}>
      {cav ? <HorseAvatar cavalo={cav} size={36} /> : (
        <div style={{ width: 36, height: 36, borderRadius: 36, background: color + '20', color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name={icon} size={18} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.3 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{sub}</div>
      </div>
      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{fmtDataHora(a.data, a.hora)}</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2,
            fontSize: 9, color, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
          }}>
            <Icon name={icon} size={10} />
            <span>{a.tipo === 'insumo' ? (getCategoria((insumos.find(i => i.id === a.insumoId) || getInsumo(a.insumoId))?.categoria)?.nome || 'insumo') : a.tipo}</span>
          </div>
        </div>
        {currentUser?.role === 'admin' && removeAtividade && (
          <button onClick={() => removeAtividade(a.id)} style={{
            background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer',
            color: '#dc2626', fontSize: 16, lineHeight: 1, flexShrink: 0,
          }}>×</button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// HOME · Resumo do dia
// ─────────────────────────────────────────────────────────────
const DIAS_SEMANA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const MESES_HOME = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

const getSaudacao = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const getDataFmt = () => {
  const d = new Date();
  return `${DIAS_SEMANA[d.getDay()]} · ${d.getDate()} de ${MESES_HOME[d.getMonth()]}`;
};

const HomeScreen = ({ registros, setScreen, density, avisos = AVISOS, atividades = ATIVIDADES, cavalos = [], compras = [], currentUser, onSeed, removeAviso, removeAtividade, insumos = [] }) => {
  const hojeStr = new Date().toLocaleDateString('sv-SE');
  const totalHoje = atividades.filter(a => a.data === hojeStr).length;
  const totalCavalos = cavalos.filter(c => c.presente).length;
  const totalAvisos = avisos.length;
  const avisosUrgentes = avisos.filter(a => a.urgente && !a.resolvido).length;
  const comprasPendentes = compras.filter(c => !c.comprado);

  const recentes = [...atividades]
    .sort((a, b) => (b.data + 'T' + b.hora).localeCompare(a.data + 'T' + a.hora))
    .slice(0, density === 'compact' ? 6 : 5);
  const ultimosAvisos = [...avisos]
    .sort((a, b) => {
      const aUrg = a.urgente && !a.resolvido ? 0 : 1;
      const bUrg = b.urgente && !b.resolvido ? 0 : 1;
      if (aUrg !== bUrg) return aUrg - bUrg;
      return ((b.data_entrada || '') + 'T' + (b.tempo || '')).localeCompare((a.data_entrada || '') + 'T' + (a.tempo || ''));
    })
    .slice(0, density === 'compact' ? 4 : 5);

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="assets/logo-epona.png" style={{ width: 28, height: 28, objectFit: 'contain' }} alt="" />
        <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--accent)', letterSpacing: '0.04em' }}>EPONA</div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setScreen('avisos')} style={{
          width: 36, height: 36, borderRadius: 12, border: '1px solid var(--line)',
          background: 'var(--card)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)',
          position: 'relative',
        }}>
          <Icon name="bell" size={18} />
          {avisosUrgentes > 0 && (
            <span style={{
              position: 'absolute', top: -2, right: -2, width: 14, height: 14,
              borderRadius: 14, background: '#c0392b', color: '#fff', fontSize: 9,
              fontWeight: 700, display: 'grid', placeItems: 'center',
              border: '2px solid var(--bg)',
            }}>{avisosUrgentes}</span>
          )}
        </button>
      </div>
      <div style={{ padding: '18px 20px 8px' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {getDataFmt()}
        </div>
        <h1 style={{
          fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 30, lineHeight: 1.1,
          margin: '6px 0 0', color: 'var(--ink)', letterSpacing: '-0.01em',
        }}>{getSaudacao()}, {currentUser ? currentUser.nome.split(' ')[0] : 'bem-vindo'}.</h1>
      </div>

      {/* Stats */}
      <div style={{ padding: '12px 20px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: 'Registros hoje', value: totalHoje, onClick: () => setScreen('historico') },
          { label: 'Cavalos no haras', value: totalCavalos, onClick: () => setScreen('cavalos') },
          { label: 'Avisos', value: totalAvisos, onClick: () => setScreen('avisos') },
        ].map(s => (
          <button key={s.label} onClick={s.onClick} style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
            padding: '12px 12px', textAlign: 'left', color: 'var(--ink)', cursor: 'pointer',
          }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* CTAs de registro */}
      <div style={{ padding: '18px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={() => setScreen('registrar')} style={{
          background: 'var(--accent)', color: 'var(--accent-ink)',
          border: 'none', borderRadius: 18, padding: '18px 16px',
          display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left',
          boxShadow: '0 8px 20px rgba(61, 96, 67, 0.18)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.18)',
            display: 'grid', placeItems: 'center',
          }}>
            <Icon name="plus" size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.1 }}>Registrar insumo</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Ração, suplemento…</div>
          </div>
        </button>
        <button onClick={() => setScreen('registrarProcedimento')} style={{
          background: '#0f766e', color: '#fff',
          border: 'none', borderRadius: 18, padding: '18px 16px',
          display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left',
          boxShadow: '0 8px 20px rgba(15, 118, 110, 0.22)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.18)',
            display: 'grid', placeItems: 'center',
          }}>
            <Icon name="stethoscope" size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.1 }}>Registrar procedimento</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Serviços veterinários…</div>
          </div>
        </button>
      </div>

      {/* Atalhos: Entrada/Saída · Avisos · Cavalos · Faturas */}
      <div style={{ padding: '10px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={() => setScreen('movimentacao')} style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
          padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', color: 'var(--ink)',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: '#e8d8c4', color: '#854d0e',
            display: 'grid', placeItems: 'center',
          }}>
            <Icon name="truck" size={18} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 15, lineHeight: 1.1 }}>Entrada / Saída</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Movimentar animal</div>
          </div>
        </button>
        <button onClick={() => setScreen('avisos')} style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
          padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', color: 'var(--ink)',
          position: 'relative',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'grid', placeItems: 'center',
          }}>
            <Icon name="bell" size={18} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 15, lineHeight: 1.1 }}>Avisos</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{totalAvisos} no mural</div>
          </div>
        </button>
      </div>

      {/* Seed button — admin only */}
      {onSeed && currentUser?.role === 'admin' && cavalos.length === 0 && (
        <div style={{ padding: '10px 20px 0' }}>
          <button onClick={onSeed} style={{
            width: '100%', padding: '10px 16px', borderRadius: 12,
            border: '1px dashed var(--accent)', background: 'var(--accent-soft)',
            color: 'var(--accent)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em',
          }}>
            Banco vazio — Clique para popular com dados iniciais
          </button>
        </div>
      )}

      {/* Avisos preview no Home */}
      {ultimosAvisos.length > 0 && (
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 400, margin: 0, color: 'var(--ink)' }}>Mural de avisos</h2>
            <button onClick={() => setScreen('avisos')} style={{ background: 'transparent', border: 'none', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Ver tudo</button>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {ultimosAvisos.map((a, i) => (
              <div key={a.id} style={{
                padding: '12px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                display: 'flex', gap: 10,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 28, flexShrink: 0,
                  background: a.urgente ? '#fef2e8' : 'var(--soft)',
                  color: a.urgente ? '#c0392b' : 'var(--ink-2)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 10, fontWeight: 700, fontFamily: 'var(--sans)',
                }}>{a.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{a.autor}</span>
                    <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>{fmtDataHora(a.data_entrada, a.tempo)}</span>
                    {a.urgente && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: '#fef2e8', color: '#c0392b', fontWeight: 700, letterSpacing: '0.04em' }}>URGENTE</span>}
                    {currentUser?.role === 'admin' && removeAviso && (
                      <button onClick={() => removeAviso(a.id)} style={{
                        marginLeft: 'auto', background: 'none', border: 'none', padding: 0,
                        cursor: 'pointer', color: '#dc2626', fontSize: 14, lineHeight: 1,
                      }}>×</button>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2, lineHeight: 1.4 }}>{a.texto}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {currentUser?.role === 'admin' && (
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 400, margin: 0, color: 'var(--ink)' }}>Lista de Compras</h2>
            <button onClick={() => setScreen('compras')} style={{ background: 'transparent', border: 'none', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Ver tudo</button>
          </div>
          {comprasPendentes.length === 0 ? (
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
              Nenhum item pendente.
            </div>
          ) : (
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              {comprasPendentes.slice(0, 5).map((c, i) => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, border: '1.5px solid var(--line-2)',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    <Icon name="cart" size={14} color="var(--ink-3)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{c.nome}</div>
                    {c.quantidade && (
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{c.quantidade}</div>
                    )}
                  </div>
                </div>
              ))}
              {comprasPendentes.length > 5 && (
                <div style={{ padding: '10px 14px', textAlign: 'center', borderTop: '1px solid var(--line)' }}>
                  <button onClick={() => setScreen('compras')} style={{ background: 'transparent', border: 'none', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                    +{comprasPendentes.length - 5} itens pendentes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10,
        }}>
          <h2 style={{
            fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 400, margin: 0, color: 'var(--ink)',
          }}>Atividade recente</h2>
          <button onClick={() => setScreen('historico')} style={{ background: 'transparent', border: 'none', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Histórico</button>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          {recentes.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              Sem atividade hoje ainda.
            </div>
          )}
          {recentes.map((a, i) => <ActivityRow key={a.id} a={a} first={i === 0} currentUser={currentUser} removeAtividade={removeAtividade} insumos={insumos} cavalos={cavalos} />)}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// HISTÓRICO · Registro eterno de atividades
// ─────────────────────────────────────────────────────────────
const HistoricoScreen = ({ setScreen, atividades = ATIVIDADES, currentUser, removeAtividade, insumos = [], cavalos = [] }) => {
  const [filtro, setFiltro] = useState('todos');
  const tipos = [
    { id: 'todos', nome: 'Tudo' },
    { id: 'nutricao', nome: 'Nutrição' },
    { id: 'insumo', nome: 'Insumos' },
    { id: 'entrada', nome: 'Entradas' },
    { id: 'saida', nome: 'Saídas' },
    { id: 'cadastro', nome: 'Cadastros' },
    { id: 'aviso', nome: 'Avisos' },
  ];
  const all = [...atividades].sort((a, b) =>
    (b.data + 'T' + b.hora).localeCompare(a.data + 'T' + a.hora)
  );
  const filtered = filtro === 'todos' ? all : all.filter(a => a.tipo === filtro);
  // group by data
  const grupos = {};
  for (const a of filtered) {
    grupos[a.data] = grupos[a.data] || [];
    grupos[a.data].push(a);
  }
  const formatDia = (d) => {
    const dt = new Date(d + 'T00:00:00');
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
    const dia = new Date(d + 'T00:00:00');
    if (dia.getTime() === hoje.getTime()) return 'Hoje';
    if (dia.getTime() === ontem.getTime()) return 'Ontem';
    return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title="Histórico" subtitle="Registro eterno de atividades" onBack={() => setScreen('home')} />
      <div style={{ padding: '12px 20px 4px', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {tipos.map(t => (
          <button key={t.id} onClick={() => setFiltro(t.id)} style={{
            padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
            border: '1px solid ' + (filtro === t.id ? 'var(--accent)' : 'var(--line)'),
            background: filtro === t.id ? 'var(--accent)' : 'var(--card)',
            color: filtro === t.id ? '#fff' : 'var(--ink-2)',
            whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--sans)',
          }}>{t.nome}</button>
        ))}
      </div>
      <div style={{ padding: '8px 20px 0' }}>
        {Object.keys(grupos).map(dia => (
          <div key={dia} style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase',
              letterSpacing: '0.08em', padding: '8px 4px 6px', fontWeight: 600,
            }}>{formatDia(dia)} · {grupos[dia].length}</div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              {grupos[dia].map((a, i) => <ActivityRow key={a.id} a={a} first={i === 0} currentUser={currentUser} removeAtividade={removeAtividade} insumos={insumos} cavalos={cavalos} />)}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Nada por aqui.</div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CAVALOS · Lista
// ─────────────────────────────────────────────────────────────
const CavalosScreen = ({ setScreen, setSelected, density, cavalos = CAVALOS, setCavalos, proprietarios = PROPRIETARIOS }) => {
  const getProprietarioLocal = (id) => proprietarios.find(p => p.id === id);
  const [search, setSearch] = useState('');

  const presentes = cavalos.filter(c => c.presente).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  const ausentes = cavalos.filter(c => !c.presente).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

  const filteredPresentes = presentes.filter(c =>
    norm(c.nome).includes(norm(search)) ||
    norm(c.baia).includes(norm(search))
  );
  const filteredAusentes = ausentes.filter(c =>
    norm(c.nome).includes(norm(search)) ||
    norm(c.baia).includes(norm(search))
  );

  const renderCavalo = (c) => {
    const prop = getProprietarioLocal(c.proprietarioId);
    return (
      <button key={c.id} onClick={() => { setSelected(c.id); setScreen('cavaloDetalhe'); }} style={{
        width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
        borderRadius: 14, padding: density === 'compact' ? '10px 12px' : '14px 14px',
        marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12,
        textAlign: 'left', color: 'var(--ink)',
      }}>
        <HorseAvatar cavalo={c} size={density === 'compact' ? 38 : 46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: density === 'compact' ? 15 : 17, color: 'var(--ink)' }}>{c.nome}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}>{c.baia}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
            {c.pelagem} · {c.categoria} · {c.idade || idade(c.nascimento)}
          </div>
          {density !== 'compact' && (
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>
              {prop?.nome || 'Sem proprietário'}
            </div>
          )}
        </div>
        <Icon name="chevron-right" size={16} color="var(--ink-3)" />
      </button>
    );
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title="Cavalos" subtitle={`${presentes.length} no haras`} action={
        <button onClick={() => setScreen('addCavalo')} style={{
          width: 36, height: 36, borderRadius: 12, border: '1px solid var(--line)',
          background: 'var(--card)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)',
          cursor: 'pointer',
        }}>
          <Icon name="plus" size={18} />
        </button>
      } />
      <div style={{ padding: '12px 20px 0' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon name="search" size={16} color="var(--ink-3)" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nome ou baia"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)',
            }}
          />
        </div>
      </div>

      <div style={{ padding: '12px 20px 0' }}>
        {filteredPresentes.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, padding: '4px 4px 8px' }}>
            No haras · {filteredPresentes.length}
          </div>
        )}
        {filteredPresentes.map(renderCavalo)}
        {filteredAusentes.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, padding: '16px 4px 8px', borderTop: '1px solid var(--line)', marginTop: 8 }}>
            Fora do haras · {filteredAusentes.length}
          </div>
        )}
        {filteredAusentes.map(renderCavalo)}
        {filteredPresentes.length === 0 && filteredAusentes.length === 0 && (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Nenhum cavalo encontrado.</div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CAVALO DETALHE
// ─────────────────────────────────────────────────────────────
const CavaloDetalheScreen = ({ id, setScreen, registros, procedimentos = [], servicos = SERVICOS, setSelected, cavalos = CAVALOS, updateCavalo, deleteCavalo, proprietarios = PROPRIETARIOS, deleteRegistro, updateRegistro, deleteProcedimento, insumos }) => {
  const c = cavalos.find(cav => cav.id === id) || getCavalo(id);
  const getProprietarioLocal = (id) => proprietarios.find(p => p.id === id);
  const props = (c.proprietarioIds || [c.proprietarioId]).map(id => getProprietarioLocal(id) || { nome: 'Sem proprietário' });
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;
  const mesNomeAtual = MESES[hoje.getMonth()];
  const meusRegistros = registros.filter(r => {
    if (r.cavaloId !== id) return false;
    if (!r.data) return false;
    const d = new Date(r.data + 'T12:00:00');
    return d.getFullYear() === anoAtual && d.getMonth() + 1 === mesAtual;
  });
  const meusProcedimentos = procedimentos.filter(p => p.cavaloId === id);
  const [editRegQtd, setEditRegQtd] = useState(null);
  const racao = c.nutricao && getInsumo(c.nutricao.racaoId);
  const consumoDia = consumoDiarioCavalo(c.id, insumos);

  return (
    <div style={{ paddingBottom: 110 }}>
      <TopBar 
        title={c.nome} 
        subtitle={`${c.baia || 'Sem local'} · ${c.sexo === 'M' ? 'Macho' : 'Fêmea'}`} 
        onBack={() => setScreen('cavalos')}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {updateCavalo && (
              <button onClick={() => { setSelected(id); setScreen('editarCavalo'); }} style={{
                width: 36, height: 36, borderRadius: 12, border: '1px solid var(--line)',
                background: 'var(--card)', display: 'grid', placeItems: 'center', color: 'var(--ink)',
              }}>
                <Icon name="pencil" size={18} />
              </button>
            )}
            {deleteCavalo && (
              <button onClick={() => {
                if (window.confirm(`Deseja excluir ${c.nome}? Esta ação não pode ser desfeita.`)) {
                  deleteCavalo(id);
                  setScreen('cavalos');
                }
              }} style={{
                width: 36, height: 36, borderRadius: 12, border: '1px solid var(--line)',
                background: '#fee2e2', display: 'grid', placeItems: 'center', color: '#dc2626',
              }}>
                <Icon name="trash" size={18} />
              </button>
            )}
          </div>
        } 
      />

      <div style={{ padding: '14px 20px 0' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16,
          padding: '16px', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <HorseAvatar cavalo={c} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{c.categoria}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 2, color: 'var(--ink)' }}>{c.pelagem}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>{c.idade || idade(c.nascimento)}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 20px 0' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          <DetailRow label="Proprietário(s)" value={props.map(p => p.nome).join(', ')} />
          <DetailRow label="Mensalidade" value={formatBRL(c.mensalidade)} />
          <DetailRow label="Sexo" value={c.sexo === 'M' ? 'Macho' : 'Fêmea'} />
          <DetailRow label="Idade" value={c.idade || idade(c.nascimento)} />
          <DetailRow label="Nascimento" value={c.nascimento ? new Date(c.nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'} />
          {c.obs && <DetailRow label="Observações" value={c.obs} />}
        </div>
      </div>

      {/* Plano nutricional */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 400, margin: 0, color: 'var(--ink)' }}>Plano nutricional</h2>
          <span style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>por dia</span>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          {racao && (() => {
            const n = c.nutricao || {};
            const manha = n.racaoKgManha ?? (n.racaoKgDia ? n.racaoKgDia / 2 : 0);
            const tarde = n.racaoKgTarde ?? (n.racaoKgDia ? n.racaoKgDia / 2 : 0);
            const total = n.racaoKgDia ?? (manha + tarde);
            return (
              <>
                <NutritionRow
                  icon="package" color="#a16207"
                  nome={racao.nome}
                  qtd={`${total} kg/dia (🌅${manha}kg + 🌇${tarde}kg${n.comeAlmoco ? ` + 🍽️${n.racaoKgAlmoco ?? 0}kg` : ''})`}
                  valor="incluso na mensalidade" first
                />
              </>
            );
          })()}
          {c.nutricao && c.nutricao.oleoMlDia > 0 && (
            <NutritionRow
              icon="package" color="#b45309"
              nome="Óleo de soja" qtd={`${c.nutricao.oleoMlDia} ml`}
              valor={formatBRL(c.nutricao.oleoMlDia * (getInsumo('i_oleo')?.valorVenda ?? 0)) + ' / dia'}
            />
          )}
          {(c.nutricao?.suplementos || []).map(s => {
            const ins = (insumos || []).find(i => i.id === s.insumoId) || getInsumo(s.insumoId);
            if (!ins) return null;
            return (
              <NutritionRow key={s.insumoId}
                icon="suplemento" color="#7c2d12"
                nome={ins.nome} qtd={`${s.qtdDia} ${ins.unidade}`}
                valor={formatBRL(s.qtdDia * ins.valorVenda) + ' / dia'}
              />
            );
          })}
          {(!racao && consumoDia.length === 0) && (
            <div style={{ padding: 18, fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>Sem plano cadastrado.</div>
          )}
          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '12px 14px',
            borderTop: '1px solid var(--line)', background: 'var(--soft)',
            fontFamily: 'var(--sans)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Custo extra/dia (óleo + suplementos)</span>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>
              {formatBRL(consumoDia.reduce((s, l) => s + l.valorDia, 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Registros avulsos do mês */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 400, margin: 0, color: 'var(--ink)' }}>Insumos avulsos · {mesNomeAtual}</h2>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{meusRegistros.length} registros</span>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          {meusRegistros.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              Sem registros este mês.
            </div>
          )}
          {meusRegistros.map((r, i) => {
            const ins = (insumos || []).find(x => x.id === r.insumoId) || getInsumo(r.insumoId);
            if (!ins) return null;
            const cat = getCategoria(ins.categoria) || { cor: '#888', id: 'outro' };
            const editing = editRegQtd === r.id;
            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                borderTop: i === 0 ? 'none' : '1px solid var(--line)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center',
                  background: cat.cor + '15', color: cat.cor,
                }}>
                  <Icon name={CATEGORIA_ICONS[cat.id]} size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{ins.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
                    {r.hora} ·
                    {editing ? (
                      <input type="number" min="0.5" step="0.5" value={r.qtd}
                        onChange={e => updateRegistro(r.id, { qtd: parseFloat(e.target.value) || 0.5 })}
                        onBlur={() => setEditRegQtd(null)}
                        onKeyDown={e => e.key === 'Enter' && setEditRegQtd(null)}
                        style={{ width: 50, border: '1px solid var(--line)', borderRadius: 4, padding: '2px 4px', fontSize: 11, textAlign: 'center', marginLeft: 4 }}
                      />
                    ) : (
                      <span onClick={() => { if (deleteRegistro) setEditRegQtd(r.id); }} style={{ cursor: deleteRegistro ? 'pointer' : 'default' }}> {r.qtd} {ins.unidade}</span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatBRL((ins.valorVenda ?? 0) * r.qtd)}
                </div>
                {deleteRegistro && (
                  <>
                    <button onClick={() => setEditRegQtd(editing ? null : r.id)} style={{
                      background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, cursor: 'pointer', padding: 4,
                      opacity: editing ? 0.5 : 1,
                    }}>
                      <Icon name="pencil" size={14} />
                    </button>
                    <button onClick={() => { if (window.confirm(`Remover ${ins.nome}?`)) deleteRegistro(r.id); }} style={{
                      background: 'none', border: 'none', color: '#dc2626', fontSize: 14, cursor: 'pointer', padding: 4,
                    }}>✕</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Procedimentos do mês */}
      {meusProcedimentos.length > 0 && (
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 400, margin: 0, color: 'var(--ink)' }}>Registro Veterinário</h2>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{meusProcedimentos.length} registros</span>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {meusProcedimentos.map((p, i) => {
              const sv = servicos.find(s => s.id === p.servicoId);
              const cat = CATEGORIAS_SERVICOS.find(c => c.id === sv?.categoria);
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center',
                    background: (cat?.cor || '#888') + '15', color: cat?.cor || '#888',
                  }}>
                    <Icon name="stethoscope" size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{sv?.nome || 'Procedimento'}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
                      {p.hora}{p.laboratorio ? ` · ${p.laboratorio}` : ''} · total {formatBRL(p.total || 0)}
                    </div>
                    {p.motoboy?.ativo && (
                      <div style={{ fontSize: 11, color: '#1e40af', marginTop: 1 }}>
                        Motoboy: {p.motoboy.nome || '—'} ({formatBRL(p.motoboy.valor || 0)})
                      </div>
                    )}
                    {p.tubosSelecionados?.length > 0 && (
                      <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 2, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {p.tubosSelecionados.map(tId => {
                          const nome = TUBOS_CORES[tId]?.nome || tId.replace('i_tubo_', '').replace('i_swab_', '').replace('_', ' ');
                          return <span key={tId} style={{ background: '#7c3aed12', padding: '1px 7px', borderRadius: 6 }}>{nome}</span>;
                        })}
                      </div>
                    )}
                    {p.examesSelecionados?.length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                        {p.examesSelecionados.map((e, i) => (
                          <span key={e.id || i}>{e.nome}{i < p.examesSelecionados.length - 1 ? ', ' : ''}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {deleteProcedimento && (
                    <button onClick={() => { if (window.confirm(`Remover ${sv?.nome || 'procedimento'}?`)) deleteProcedimento(p.id); }} style={{
                      background: 'none', border: 'none', color: '#dc2626', fontSize: 14, cursor: 'pointer', padding: 4,
                    }}>✕</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick action */}
      <div style={{ padding: '20px 20px 0' }}>
        <button onClick={() => { setSelected(id); setScreen('registrar'); }} style={{
          width: '100%', background: 'var(--accent)', color: 'var(--accent-ink)',
          border: 'none', borderRadius: 14, padding: '14px',
          fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Icon name="plus" size={18} color="#fff" />
          Registrar insumo p/ {c.nome.split(' ')[0]}
        </button>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '12px 14px', borderTop: '1px solid var(--line)',
    ...(label === 'Proprietário' ? { borderTop: 'none' } : {}),
  }}>
    <span style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    <span style={{ fontSize: 13, color: 'var(--ink)', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
  </div>
);

const NutritionRow = ({ icon, color, nome, qtd, valor, first }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
    borderTop: first ? 'none' : '1px solid var(--line)',
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center',
      background: color + '15', color,
    }}>
      <Icon name={icon} size={16} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{nome}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1, fontFamily: 'var(--mono)' }}>{qtd} / dia</div>
    </div>
    <div style={{ fontSize: 11, color: 'var(--ink-2)', textAlign: 'right', maxWidth: 120 }}>{valor}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// CADASTROS hub
// ─────────────────────────────────────────────────────────────
const CadastrosScreen = ({ setScreen, currentUser, cavalosCount = 0, proprietariosCount = 0, insumosCount = 0, servicosCount = 0 }) => {
  const items = [
    { id: 'cadProprietarios', label: 'Proprietários', count: proprietariosCount, icon: 'users' },
    { id: 'cadCavalos', label: 'Cavalos', count: cavalosCount, icon: 'horse' },
    { id: 'cadInsumos', label: 'Insumos', count: insumosCount, icon: 'package' },
    { id: 'cadServicos', label: 'Serviços', count: servicosCount, icon: 'stethoscope' },
    { id: 'cadMensalidades', label: 'Mensalidades', count: cavalosCount, icon: 'calendar' },
    { id: 'cadEmpresa', label: 'Dados da empresa', count: null, icon: 'building', sub: 'Endereço, pagamento e fatura' },
    ...(currentUser?.role === 'admin' ? [{ id: 'funcionarios', label: 'Funcionários', count: null, icon: 'user' }] : []),
  ];
  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title="Cadastros" subtitle="Gerencie os dados base do haras" />
      <div style={{ padding: '14px 20px 0' }}>
        {items.map(it => (
          <button key={it.id} onClick={() => setScreen(it.id)} style={{
            width: '100%', background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '16px', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', color: 'var(--ink)',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)',
              display: 'grid', placeItems: 'center',
            }}>
              <Icon name={it.icon} size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)' }}>{it.label}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                {it.sub ?? (it.count !== null ? `${it.count} cadastrados` : 'Equipe e escalas')}
              </div>
            </div>
            <Icon name="chevron-right" size={16} color="var(--ink-3)" />
          </button>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CADASTRO · Proprietários
// ─────────────────────────────────────────────────────────────
const CadProprietariosScreen = ({ setScreen, setSelected, proprietarios = PROPRIETARIOS, cavalos = CAVALOS, addProprietario, deleteProprietario }) => {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const getCavalosDoProprietario = (propId) => cavalos.filter(c => (c.proprietarioIds || []).includes(propId) || c.proprietarioId === propId);

  const handleCreateProprietario = () => {
    if (!addProprietario) return;
    const newId = addProprietario('Novo proprietário');
    setSelected(newId);
    setScreen('proprietarioDetalhe');
  };

  const handleEditProprietario = (id) => {
    setSelected(id);
    setScreen('proprietarioDetalhe');
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title="Proprietários" onBack={() => setScreen('cadastros')} action={
        <button onClick={handleCreateProprietario} style={{
          width: 36, height: 36, borderRadius: 12, background: 'var(--accent)',
          display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer',
        }}>
          <Icon name="plus" size={18} color="#fff" />
        </button>
      } />
      <div style={{ padding: '14px 20px 0' }}>
        {proprietarios.map(p => {
          const ownedCavalos = getCavalosDoProprietario(p.id);
          return (
            <div key={p.id} style={{
              background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
              padding: '14px', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 40, background: 'var(--accent-soft)',
                  display: 'grid', placeItems: 'center',
                  fontFamily: 'var(--serif)', color: 'var(--accent)', fontSize: 16,
                }}>
                  {p.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{p.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                    {ownedCavalos.length} cavalo{ownedCavalos.length !== 1 ? 's' : ''} · {p.telefone || 'Sem telefone'}
                  </div>
                </div>
                <button onClick={() => handleEditProprietario(p.id)} style={{
                  width: 32, height: 32, borderRadius: 10, border: '1px solid var(--line)',
                  background: 'transparent', display: 'grid', placeItems: 'center', color: 'var(--ink-3)', cursor: 'pointer',
                }}>
                  <Icon name="edit" size={14} />
                </button>
                {deleteProprietario && (
                  <button onClick={() => setConfirmDelete(p)} style={{
                    width: 32, height: 32, borderRadius: 10, border: '1px solid #dc262630',
                    background: 'transparent', display: 'grid', placeItems: 'center', color: '#dc2626', cursor: 'pointer',
                  }}>
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingLeft: 52 }}>
                {ownedCavalos.length > 0 ? ownedCavalos.map(cav => (
                  <span key={cav.id} style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 6,
                    background: 'var(--soft)', color: 'var(--ink-2)',
                  }}>{cav.nome} · {formatBRL(cav.mensalidade)}</span>
                )) : (
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Nenhum cavalo cadastrado.</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg)', borderRadius: 16, padding: 24, margin: 20, maxWidth: 360, width: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Excluir proprietário?</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16, lineHeight: 1.4 }}>
              Tem certeza que deseja excluir <strong>{confirmDelete.nome}</strong>?{getCavalosDoProprietario(confirmDelete.id).length > 0 ? ` Ele será removido de ${getCavalosDoProprietario(confirmDelete.id).length} cavalo(s).` : ''}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--line)',
                background: 'var(--card)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={() => { deleteProprietario(confirmDelete.id); setConfirmDelete(null); }} style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                background: '#dc2626', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
              }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CADASTRO · Insumos
// ─────────────────────────────────────────────────────────────
const CadInsumosScreen = ({ setScreen, setSelected, insumos = [], addInsumo, updateInsumo }) => {
  const [filtro, setFiltro] = useState('all');
  const [busca, setBusca] = useState('');
  const cats = [{ id: 'all', nome: 'Todos', cor: '#3d6043' }, ...CATEGORIAS_INSUMOS];
  const filtered = (filtro === 'all' ? insumos : insumos.filter(i => i.categoria === filtro))
    .filter(i => !busca.trim() || norm(i.nome).includes(norm(busca.trim())))
    .slice()
    .sort((a, b) => (a.nome||'').localeCompare(b.nome||'', 'pt'));

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title="Insumos" onBack={() => setScreen('cadastros')} action={
        <button onClick={() => setScreen('addInsumo')} style={{
          width: 36, height: 36, borderRadius: 12, background: 'var(--accent)',
          display: 'grid', placeItems: 'center', border: 'none',
        }}>
          <Icon name="plus" size={18} color="#fff" />
        </button>
      } />
      <div style={{
        padding: '12px 20px 4px', display: 'flex', gap: 6,
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {cats.map(c => (
          <button key={c.id} onClick={() => setFiltro(c.id)} style={{
            padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
            border: '1px solid ' + (filtro === c.id ? c.cor : 'var(--line)'),
            background: filtro === c.id ? c.cor : 'var(--card)',
            color: filtro === c.id ? '#fff' : 'var(--ink-2)',
            whiteSpace: 'nowrap', flexShrink: 0,
            fontFamily: 'var(--sans)',
          }}>{c.nome}</button>
        ))}
      </div>
      <div style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
        margin: '4px 20px 8px',
      }}>
        <Icon name="search" size={16} color="var(--ink-3)" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar insumo…"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: '9px 0',
          }}
        />
        {busca && (
          <button onClick={() => setBusca('')} style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: 'var(--ink-3)', fontSize: 16, lineHeight: 1,
          }}>×</button>
        )}
      </div>
      <div style={{ padding: '0 20px' }}>
        {filtered.map(i => {
          const cat = getCategoria(i.categoria);
          const temDescartaveis = i.descartaveis?.length > 0;
          return (
            <button key={i.id} onClick={() => { setSelected(i.id); setScreen('editarInsumo'); }} style={{
              width: '100%', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
              padding: '12px 14px', marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: 'var(--ink)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center',
                background: (cat?.cor || '#888') + '15', color: cat?.cor || '#888',
              }}>
                <Icon name={CATEGORIA_ICONS[cat?.id] || 'package'} size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{i.nome}</div>
                  {i.injetavel && (
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 4,
                      background: '#fef2e8', color: '#c0392b', fontWeight: 700, letterSpacing: '0.06em',
                    }}>INJETÁVEL</span>
                  )}
                  {temDescartaveis && !i.injetavel && (
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 4,
                      background: '#f0f4ff', color: '#3b4fc3', fontWeight: 700, letterSpacing: '0.06em',
                    }}>+{i.descartaveis.length} DESC.</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
                  por {i.unidade}
                  {i.fornecedor && <span style={{ marginLeft: 6 }}>· {i.fornecedor}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>
                  {formatBRL(i.valorVenda ?? i.valor ?? 0)}
                </div>
                {i.markup > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>+{i.markup}% markup</div>
                )}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            Nenhum insumo nesta categoria.
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CADASTRO · Mensalidades (por cavalo)
// ─────────────────────────────────────────────────────────────
const CadMensalidadesScreen = ({ setScreen }) => (
  <div style={{ paddingBottom: 90 }}>
    <TopBar title="Mensalidades" onBack={() => setScreen('cadastros')} subtitle="Valor por cavalo" />
    <div style={{ padding: '14px 20px 0' }}>
      <div style={{
        background: 'var(--accent-soft)', border: '1px solid #b8c8b0', borderRadius: 12,
        padding: '12px 14px', marginBottom: 12, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5,
      }}>
        A mensalidade <strong style={{ color: 'var(--ink)' }}>já inclui Nutrição Base (ração, feno, sal mineral)</strong>. Óleo, suplementos e insumos avulsos são cobrados à parte.
      </div>
      {CAVALOS.map(c => (
        <div key={c.id} style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
          padding: '12px', marginBottom: 6,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <HorseAvatar cavalo={c} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{c.nome}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
              {c.categoria} · {c.baia}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{formatBRL(c.mensalidade)}</div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>por mês</div>
          </div>
          <button style={{
            width: 30, height: 30, borderRadius: 10, border: '1px solid var(--line)',
            background: 'transparent', display: 'grid', placeItems: 'center', color: 'var(--ink-3)',
          }}>
            <Icon name="edit" size={13} />
          </button>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// CADASTRO · Cavalos (placeholder simples)
// ─────────────────────────────────────────────────────────────
const CadCavalosScreen = ({ setScreen, setSelected, cavalos = CAVALOS, deleteCavalo, proprietarios = PROPRIETARIOS }) => {
  const getProprietarioLocal = (id) => proprietarios.find(p => p.id === id);
  const presentes = cavalos.filter(c => c.presente);
  const ausentes = cavalos.filter(c => !c.presente);
  const renderCavalo = (c) => {
    const prop = getProprietarioLocal(c.proprietarioId);
    return (
      <div key={c.id} style={{
        background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
        padding: '12px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12,
        textAlign: 'left', color: 'var(--ink)',
      }}>
        <button onClick={() => { setSelected(c.id); setScreen('cavaloDetalhe'); }} style={{
          flex: 1, background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 12,
          textAlign: 'left', color: 'var(--ink)', cursor: 'pointer', padding: 0,
        }}>
          <HorseAvatar cavalo={c} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{c.nome}</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>{c.baia}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{prop.nome} · {c.categoria}</div>
          </div>
          <Icon name="chevron-right" size={16} color="var(--ink-3)" />
        </button>
        {deleteCavalo && (
          <button 
            onClick={() => { 
              if (window.confirm(`Deseja excluir ${c.nome}?`)) {
                deleteCavalo(c.id);
              }
            }}
            style={{
              width: 36, height: 36, borderRadius: 10, border: '1px solid var(--line)',
              background: '#fee2e2', display: 'grid', placeItems: 'center', color: '#dc2626',
              cursor: 'pointer',
            }}
          >
            <Icon name="trash" size={16} />
          </button>
        )}
      </div>
    );
  };
  return (
    <div style={{ paddingBottom: 90 }}>
    <TopBar title="Cadastro de cavalos" onBack={() => setScreen('cadastros')} action={
      <button onClick={() => setScreen('addCavalo')} style={{
        width: 36, height: 36, borderRadius: 12, background: 'var(--accent)',
        display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer',
      }}>
        <Icon name="plus" size={18} color="#fff" />
      </button>
    } />
    <div style={{ padding: '14px 20px 0'}}>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, padding: '4px 4px 8px' }}>
        No haras · {presentes.length}
      </div>
      {presentes.map(renderCavalo)}
      {ausentes.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, padding: '16px 4px 8px', borderTop: '1px solid var(--line)', marginTop: 8 }}>
          Fora do haras · {ausentes.length}
        </div>
      )}
      {ausentes.map(renderCavalo)}
    </div>
  </div>
  );
};

// ─────────────────────────────────────────────────────────────
// EDITAR CAVALO
// ─────────────────────────────────────────────────────────────
const EditarCavaloScreen = ({ id, setScreen, cavalos = CAVALOS, updateCavalo, deleteCavalo, proprietarios = PROPRIETARIOS, addAviso, addAtividade, currentUser, insumos: insumosProp = INSUMOS }) => {
  const c = cavalos.find(cav => cav.id === id) || getCavalo(id);
  const getProprietarioLocal = (pid) => proprietarios.find(p => p.id === pid);
  const prop = getProprietarioLocal(c.proprietarioId);

  const [nome, setNome] = useState(c.nome);
  const [baia, setBaia] = useState(c.baia);
  const [piquete, setPiquete] = useState(c.piquete || c.baia || '');
  const existingLocais = useMemo(() => {
    const vals = new Set();
    cavalos.forEach(cv => { if (cv.baia) vals.add(cv.baia); if (cv.piquete) vals.add(cv.piquete); });
    return [...vals].sort((a, b) => a.localeCompare(b, 'pt'));
  }, [cavalos]);
  const [mensalidade, setMensalidade] = useState(Number.isFinite(Number(c.mensalidade)) ? c.mensalidade : 0);
  const [obs, setObs] = useState(c.obs || '');
  const [sexo, setSexo] = useState(c.sexo || '');
  const [pelagem, setPelagem] = useState(c.pelagem || 'Tordilho');
  const pelagenOptions = ['Tordilho', 'Alazã', 'Castanho', 'Preto', 'Baia', 'Rosilha'];
  const [dataEntrada, setDataEntrada] = useState(c.dataEntrada || '');
  const [nascimento, setNascimento] = useState(c.nascimento || '');
  const [selectedProprietarios, setSelectedProprietarios] = useState(c.proprietarioIds || (c.proprietarioId ? [c.proprietarioId] : []));
  const [showPropSelector, setShowPropSelector] = useState(false);
  const [propSearch, setPropSearch] = useState('');
  const sortedProprietarios = [...proprietarios].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  const filteredProprietarios = propSearch.trim()
    ? sortedProprietarios.filter(p => norm(p.nome).includes(norm(propSearch)))
    : sortedProprietarios;
  const [categorias, setCategorias] = useState(new Set(c.categorias || (c.categoria ? [c.categoria] : [])));
  const [dataCobricao, setDataCobricao] = useState(c.gestacao?.dataCobricao || c.dataCobertura || '');
  const [pai, setPai] = useState(c.gestacao?.pai || '');
  const [mae, setMae] = useState(c.gestacao?.mae || '');
  const isGestante = categorias.has('Gestante');
  const isReceptora = categorias.has('Receptora');
  const handleToggleCategoria = cat => setCategorias(prev => {
    const next = new Set(prev);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    return next;
  });
  const [savedMessage, setSavedMessage] = useState(false);

  // Nutritional state
  const [racaoId, setRacaoId] = useState(c.nutricao?.racaoId || 'i2');
  const fallbackMeio = c.nutricao?.racaoKgDia ? c.nutricao.racaoKgDia / 2 : 2;
  const [racaoKgManha, setRacaoKgManha] = useState(String(c.nutricao?.racaoKgManha ?? fallbackMeio));
  const [racaoKgTarde, setRacaoKgTarde] = useState(String(c.nutricao?.racaoKgTarde ?? fallbackMeio));
  const [comeAlmoco, setComeAlmoco] = useState(c.nutricao?.comeAlmoco || false);
  const [racaoKgAlmoco, setRacaoKgAlmoco] = useState(String(c.nutricao?.racaoKgAlmoco ?? 0));
  const [oleoMlManha, setOleoMlManha] = useState(String(c.nutricao?.oleoMlManha ?? (c.nutricao?.oleoMlDia ? c.nutricao.oleoMlDia / 2 : 0)));
  const [oleoMlTarde, setOleoMlTarde] = useState(String(c.nutricao?.oleoMlTarde ?? (c.nutricao?.oleoMlDia ? c.nutricao.oleoMlDia / 2 : 0)));
  const [fenoKgDia, setFenoKgDia] = useState(String(c.nutricao?.fenoKgDia ?? 0));
  const [suplementos, setSuplementos] = useState(c.nutricao?.suplementos || []);
  const [periodicos, setPeriodicos] = useState(c.nutricao?.periodicos || []);
  const [novoPerInsumoId, setNovoPerInsumoId] = useState('');
  const [novoPerQtd, setNovoPerQtd] = useState('');
  const [novoPerFreq, setNovoPerFreq] = useState('semanal');
  const [novoPerDia, setNovoPerDia] = useState(1);
  const [novoPerTurno, setNovoPerTurno] = useState('manha');
  const [novoPerDataInicio, setNovoPerDataInicio] = useState('');
  const [novoPerDataFim, setNovoPerDataFim] = useState('');
  const [showPerForm, setShowPerForm] = useState(false);
  const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const FREQ_OPTIONS = [
    { value: 'diario', label: 'Diário' },
    { value: 'cada2', label: 'Cada 2 dias' },
    { value: 'cada3', label: 'Cada 3 dias' },
    { value: 'cada4', label: 'Cada 4 dias' },
    { value: 'cada5', label: 'Cada 5 dias' },
    { value: 'cada6', label: 'Cada 6 dias' },
    { value: 'semanal', label: 'Semanal' },
    { value: 'quinzenal', label: 'Quinzenal' },
  ];
  const TURNO_OPTIONS = [
    { value: 'manha', label: '🌅 Manhã' },
    { value: 'tarde', label: '🌇 Tarde' },
    { value: 'ambos', label: 'Ambos' },
  ];

  const handleAddSuplemento = (insumoId) => {
    if (!suplementos.find(s => s.insumoId === insumoId))
      setSuplementos(prev => [...prev, { insumoId, qtdDia: 1, manha: true, tarde: false }]);
  };
  const handleRemoveSuplemento = (insumoId) => setSuplementos(prev => prev.filter(s => s.insumoId !== insumoId));
  const handleUpdateSuplementoQtd = (insumoId, qtd) =>
    setSuplementos(prev => prev.map(s => s.insumoId === insumoId ? { ...s, qtdDia: parseFloat(qtd) || 1 } : s));
  const handleToggleSupTurno = (insumoId, turno) =>
    setSuplementos(prev => prev.map(s => s.insumoId === insumoId ? { ...s, [turno]: !s[turno] } : s));
  const handleUpdateSuplementoDatas = (insumoId, field, value) =>
    setSuplementos(prev => prev.map(s => s.insumoId === insumoId ? { ...s, [field]: value || undefined } : s));

  const handleAddPeriodico = () => {
    if (!novoPerInsumoId || !novoPerQtd) return;
    const entry = {
      insumoId: novoPerInsumoId,
      qtd: parseFloat(novoPerQtd) || 0,
      frequencia: novoPerFreq,
      diaSemana: novoPerDia,
      turno: novoPerTurno,
    };
    if (novoPerDataInicio) entry.dataInicio = novoPerDataInicio;
    if (novoPerDataFim) entry.dataFim = novoPerDataFim;
    setPeriodicos(prev => [...prev, entry]);
    setNovoPerInsumoId('');
    setNovoPerQtd('');
    setNovoPerDataInicio('');
    setNovoPerDataFim('');
    setShowPerForm(false);
  };
  const handleRemovePeriodico = (idx) => setPeriodicos(prev => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    const manha = parseFloat(racaoKgManha) || 0;
    const tarde = parseFloat(racaoKgTarde) || 0;
    const almoco = comeAlmoco ? (parseFloat(racaoKgAlmoco) || 0) : 0;
    const newNutricao = {
      racaoId,
      racaoKgManha: manha, racaoKgTarde: tarde,
      racaoKgDia: manha + tarde + almoco,
      comeAlmoco, racaoKgAlmoco: almoco,
      oleoMlManha: parseFloat(oleoMlManha) || 0,
      oleoMlTarde: parseFloat(oleoMlTarde) || 0,
      oleoMlDia: (parseFloat(oleoMlManha) || 0) + (parseFloat(oleoMlTarde) || 0),
      fenoKgDia: parseFloat(fenoKgDia) || 0,
      suplementos,
      periodicos,
    };
    const nutricaoChanged = JSON.stringify(c.nutricao || {}) !== JSON.stringify(newNutricao);

    const gestacaoUpdate = isGestante ? { gestacao: { ...(c.gestacao || {}), dataCobricao, pai, ...(isReceptora ? { mae } : {}) } } : {};
    const categoriasArr = Array.from(categorias);
    const parsedMens = parseInt(mensalidade);
    const safeMens = Number.isFinite(parsedMens) && parsedMens >= 0 ? parsedMens : (Number.isFinite(Number(c.mensalidade)) ? Number(c.mensalidade) : 0);
    updateCavalo(id, { nome, baia, piquete: baia, mensalidade: safeMens, obs, sexo, pelagem, dataEntrada, nascimento: nascimento || undefined, proprietarioId: selectedProprietarios[0] || c.proprietarioId, proprietarioIds: selectedProprietarios, categoria: categoriasArr[0] || '', categorias: categoriasArr, ...gestacaoUpdate, nutricao: newNutricao });

    if (nutricaoChanged && addAtividade) {
      const racaoNome = INSUMOS.find(i => i.id === racaoId)?.nome || racaoId;
      const autor = currentUser?.nome || 'Sistema';
      const supNomes = suplementos.map(s => INSUMOS.find(i => i.id === s.insumoId)?.nome || s.insumoId).join(', ');
      const hoje = new Date(); const mes = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
      const data = hoje.toLocaleDateString('sv-SE');
      const text = `🍽️ Plano nutricional de ${c.nome} atualizado:
${racaoNome} — Manhã ${manha}kg + Tarde ${tarde}kg${comeAlmoco ? ` + Almoço ${almoco}kg` : ''}${parseFloat(oleoMlManha) > 0 || parseFloat(oleoMlTarde) > 0 ? `
Óleo ${(parseFloat(oleoMlManha) || 0) + (parseFloat(oleoMlTarde) || 0)}ml/dia` : ''}${supNomes ? `
Suplementos: ${supNomes}` : ''}`;
      const hora = new Date().toTimeString().slice(0, 5);
      addAtividade({
        id: 'at_' + Date.now(), tipo: 'nutricao',
        cavaloId: c.id, usuario: autor,
        texto: text,
        data, hora, mes,
      });
      if (addAviso) {
        addAviso({
          id: 'nut_' + Date.now(),
          autor,
          avatar: '🍽️',
          tempo: hora,
          texto: `${c.nome} · ${racaoNome} — Manhã ${manha}kg + Tarde ${tarde}kg${comeAlmoco ? ` + Almoço ${almoco}kg` : ''}${parseFloat(oleoMlManha) > 0 || parseFloat(oleoMlTarde) > 0 ? `, óleo ${(parseFloat(oleoMlManha) || 0) + (parseFloat(oleoMlTarde) || 0)}ml/dia` : ''}${supNomes ? `, suplementos: ${supNomes}` : ''}`,
          urgente: false,
          tipo: 'nutricao',
          cavaloId: c.id,
          data_entrada: data,
        });
      }
    }

    setSavedMessage(true);
    setTimeout(() => { setSavedMessage(false); setScreen('cavaloDetalhe'); }, 1200);
  };

  const handleDelete = () => {
    if (window.confirm(`Deseja excluir ${c.nome}? Esta ação não pode ser desfeita.`)) {
      deleteCavalo(id);
      setScreen('cadastros');
    }
  };

  return (
    <div style={{ paddingBottom: 110 }}>
      <TopBar title="Editar cavalo" onBack={() => setScreen('cavaloDetalhe')} />

      <div style={{ padding: '14px 20px 0' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16,
          padding: '16px', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <HorseAvatar cavalo={c} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{c.categoria}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 2, color: 'var(--ink)' }}>{c.pelagem}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>{c.idade || idade(c.nascimento)}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 20px 0' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          <FormField label="Nome do cavalo">
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            <FormField label="Baia / Piquete">
              <input
                value={baia}
                onChange={e => { setBaia(e.target.value); setPiquete(e.target.value); }}
                list="locais-list"
                placeholder="Ex: A-04, Piquete 3…"
                style={{
                  width: '100%', border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
                }}
              />
              <datalist id="locais-list">
                {existingLocais.map(v => <option key={v} value={v} />)}
              </datalist>
          </FormField>
        </div>
        </div>

        {/* Insumos Periódicos */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Insumos periódicos">
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8, lineHeight: 1.4 }}>
              Suplementos/rações administrados semanal ou quinzenalmente. O valor é rateado no faturamento.
            </div>
            {periodicos.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {periodicos.map((p, idx) => {
                  const ins = insumosProp.find(i => i.id === p.insumoId);
                  const fmtData = (d) => d ? d.split('-').reverse().join('/') : null;
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{ins?.nome || p.insumoId}</span>
                        <span style={{ color: 'var(--ink-2)', marginLeft: 6 }}>{p.qtd}{ins?.unidade ? ` ${ins.unidade}` : ''} · {FREQ_OPTIONS.find(f => f.value === p.frequencia)?.label}{p.frequencia === 'diario' || p.frequencia?.startsWith('cada') ? '' : ` · ${DIAS_SEMANA[p.diaSemana]}`} · {TURNO_OPTIONS.find(t => t.value === p.turno)?.label}</span>
                        {(p.dataInicio || p.dataFim) && (
                          <span style={{ display: 'block', fontSize: 11, color: 'var(--accent)', marginTop: 1 }}>
                            📅 {fmtData(p.dataInicio) || 'início'} → {fmtData(p.dataFim) || 'sem fim'}
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleRemovePeriodico(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, padding: 0 }}>×</button>
                    </div>
                  );
                })}
              </div>
            )}
            {!showPerForm ? (
              <button onClick={() => setShowPerForm(true)} style={{
                width: '100%', background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px dashed var(--accent)',
                borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)',
              }}>
                + Adicionar insumo periódico
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select value={novoPerInsumoId} onChange={e => setNovoPerInsumoId(e.target.value)} style={{
                  width: '100%', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px',
                  fontSize: 13, color: 'var(--ink)', background: 'var(--bg)', fontFamily: 'var(--sans)', outline: 'none',
                }}>
                  <option value="">Selecionar insumo…</option>
                  {insumosProp.filter(i => i.categoria === 'suplemento' || i.categoria === 'medicamento' || i.categoria === 'racao').map(i => (
                    <option key={i.id} value={i.id}>{i.nome}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" step="0.1" value={novoPerQtd} onChange={e => setNovoPerQtd(e.target.value)}
                    placeholder="Dose"
                    style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg)', fontFamily: 'var(--sans)', outline: 'none' }} />
                  {novoPerInsumoId && (() => { const i = insumosProp.find(x => x.id === novoPerInsumoId); return <span style={{ fontSize: 11, color: 'var(--ink-3)', alignSelf: 'center' }}>{i?.unidade || 'un'}</span>; })()}
                  <select value={novoPerFreq} onChange={e => setNovoPerFreq(e.target.value)} style={{
                    border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px',
                    fontSize: 13, color: 'var(--ink)', background: 'var(--bg)', fontFamily: 'var(--sans)', outline: 'none',
                  }}>
                    {FREQ_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={novoPerDia} onChange={e => setNovoPerDia(Number(e.target.value))} style={{
                    flex: 1, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px',
                    fontSize: 13, color: 'var(--ink)', background: 'var(--bg)', fontFamily: 'var(--sans)', outline: 'none',
                  }}>
                    {DIAS_SEMANA.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                  <select value={novoPerTurno} onChange={e => setNovoPerTurno(e.target.value)} style={{
                    flex: 1, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px',
                    fontSize: 13, color: 'var(--ink)', background: 'var(--bg)', fontFamily: 'var(--sans)', outline: 'none',
                  }}>
                    {TURNO_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 3 }}>Data início (opc.)</div>
                    <input type="date" value={novoPerDataInicio} onChange={e => setNovoPerDataInicio(e.target.value)}
                      style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg)', fontFamily: 'var(--sans)', outline: 'none' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 3 }}>Data fim (opc.)</div>
                    <input type="date" value={novoPerDataFim} onChange={e => setNovoPerDataFim(e.target.value)}
                      style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg)', fontFamily: 'var(--sans)', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleAddPeriodico} disabled={!novoPerInsumoId || !novoPerQtd || parseFloat(novoPerQtd) <= 0} style={{
                    flex: 1, background: !novoPerInsumoId || !novoPerQtd || parseFloat(novoPerQtd) <= 0 ? 'var(--ink-1)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '8px', fontSize: 13, fontWeight: 600, cursor: !novoPerInsumoId || !novoPerQtd || parseFloat(novoPerQtd) <= 0 ? 'not-allowed' : 'pointer', fontFamily: 'var(--sans)',
                  }}>Adicionar</button>
                  <button onClick={() => { setShowPerForm(false); setNovoPerDataInicio(''); setNovoPerDataFim(''); }} style={{
                    background: 'none', border: '1px solid var(--line)', borderRadius: 8,
                    padding: '8px 16px', fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer', fontFamily: 'var(--sans)',
                  }}>Cancelar</button>
                </div>
              </div>
            )}
          </FormField>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            <FormField label="Mensalidade (R$)">
              <input
                type="number"
                value={mensalidade}
                onChange={e => setMensalidade(e.target.value)}
                style={{
                  width: '100%', border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
                }}
              />
            </FormField>
          </div>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            <FormField label="Observações">
              <textarea
                value={obs}
                onChange={e => setObs(e.target.value)}
                style={{
                  width: '100%', border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
                  minHeight: 60, resize: 'none',
                }}
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* Proprietários */}
      <div style={{ padding: '0 20px', marginTop: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>
          Proprietário(s)
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Proprietário(s)">
            {!showPropSelector ? (
              <button onClick={() => setShowPropSelector(true)} style={{
                width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                textAlign: 'left', color: selectedProprietarios.length === 0 ? 'var(--ink-3)' : 'var(--ink)',
                fontSize: 15, padding: 0,
              }}>
                {selectedProprietarios.length === 0 
                  ? 'Toque para selecionar...' 
                  : sortedProprietarios.filter(p => selectedProprietarios.includes(p.id)).map(p => p.nome).join(', ')}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <input
                  type="text"
                  placeholder="Buscar proprietário..."
                  value={propSearch}
                  onChange={e => setPropSearch(e.target.value)}
                  style={{
                    width: '100%', border: 'none', outline: 'none', background: 'transparent',
                    fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)',
                    padding: '8px 0', borderBottom: '1px solid var(--line)', marginBottom: 8,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                {filteredProprietarios.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--ink)' }}>
                    <input
                      type="checkbox"
                      checked={selectedProprietarios.includes(p.id)}
                      onChange={() => {
                        const next = selectedProprietarios.includes(p.id)
                          ? selectedProprietarios.filter(x => x !== p.id)
                          : [...selectedProprietarios, p.id];
                        setSelectedProprietarios(next);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    {p.nome}
                  </label>
                ))}
                </div>
                <button onClick={() => { setShowPropSelector(false); setPropSearch(''); }} style={{
                  background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10,
                  padding: '8px', fontSize: 13, fontWeight: 600, marginTop: 4, cursor: 'pointer',
                }}>
                  Pronto
                </button>
              </div>
            )}
          </FormField>
        </div>
      </div>

      {/* Sexo */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Sexo">
            <div style={{ display: 'flex', gap: 12 }}>
              {['M', 'F'].map(s => (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: 'var(--ink)' }}>
                  <input type="radio" name="sexoEdit" checked={sexo === s} onChange={() => setSexo(s)} style={{ cursor: 'pointer' }} />
                  {s === 'M' ? 'Macho' : 'Fêmea'}
                </label>
              ))}
            </div>
          </FormField>
        </div>
      </div>

      {/* Pelagem */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Pelagem">
            <select value={pelagem} onChange={e => setPelagem(e.target.value)} style={{
              width: '100%', border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
            }}>
              {pelagenOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </FormField>
        </div>
      </div>

      {/* Datas */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Data de nascimento">
            <input type="date" value={nascimento} onChange={e => setNascimento(e.target.value)} style={{
              width: '100%', border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
            }} />
          </FormField>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            <FormField label="Data de entrada no haras">
              <input type="date" value={dataEntrada} onChange={e => setDataEntrada(e.target.value)} style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }} />
            </FormField>
          </div>
        </div>
      </div>

      {/* Categoria */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10, marginTop: 8 }}>
          Categoria
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>Selecione uma ou mais categorias</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIAS_CAVALO.map(cat => (
              <button key={cat} onClick={() => handleToggleCategoria(cat)} style={{
                padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: `1px solid ${categorias.has(cat) ? 'var(--accent)' : 'var(--line)'}`,
                background: categorias.has(cat) ? 'var(--accent)' : 'var(--bg)',
                color: categorias.has(cat) ? '#fff' : 'var(--ink-2)',
                cursor: 'pointer', fontFamily: 'var(--sans)',
              }}>{cat}</button>
            ))}
          </div>
        </div>

        {isGestante && (
          <div style={{ background: 'var(--card)', border: '1px solid #dc2626', borderRadius: 14, padding: '14px', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              {isReceptora ? 'Transferência de embrião' : 'Dados da gestação'}
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Data de cobrição</div>
              <input type="date" value={dataCobricao} onChange={e => setDataCobricao(e.target.value)} style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
                border: '1px solid var(--line)', background: 'var(--bg)',
                fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
              }} />
            </div>
            <div style={{ marginBottom: isReceptora ? 10 : 0 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Garanhão utilizado no cruzamento</div>
              <input value={pai} onChange={e => setPai(e.target.value)} placeholder="Nome do garanhão…" style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
                border: '1px solid var(--line)', background: 'var(--bg)',
                fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
              }} />
            </div>
            {isReceptora && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Mãe biológica do produto (doadora)</div>
                <input value={mae} onChange={e => setMae(e.target.value)} placeholder="Nome da égua doadora…" style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
                  border: '1px solid var(--line)', background: 'var(--bg)',
                  fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
                }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Plano nutricional */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10, marginTop: 8 }}>
          Plano nutricional
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
          <FormField label="Tipo da ração">
            <select value={racaoId} onChange={e => setRacaoId(e.target.value)} style={{
              width: '100%', border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
            }}>
              {INSUMOS.filter(i => i.categoria === 'racao').map(i => (
                <option key={i.id} value={i.id}>{i.nome}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            <FormField label="🌅 Ração Manhã (kg)">
              <input type="number" step="0.1" value={racaoKgManha} onChange={e => setRacaoKgManha(e.target.value)}
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0 }} />
            </FormField>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            <FormField label="🌇 Ração Tarde (kg)">
              <input type="number" step="0.1" value={racaoKgTarde} onChange={e => setRacaoKgTarde(e.target.value)}
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0 }} />
            </FormField>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            <FormField label="🫒 Óleo Manhã (ml)">
              <input type="number" step="1" value={oleoMlManha} onChange={e => setOleoMlManha(e.target.value)}
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0 }} />
            </FormField>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            <FormField label="🫒 Óleo Tarde (ml)">
              <input type="number" step="1" value={oleoMlTarde} onChange={e => setOleoMlTarde(e.target.value)}
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0 }} />
            </FormField>
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
          <FormField label="🌾 Feno (kg/dia)">
            <input type="number" step="0.5" value={fenoKgDia} onChange={e => setFenoKgDia(e.target.value)}
              style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0 }} />
          </FormField>
        </div>

        <div style={{ marginBottom: 10 }}>
          <button
            onClick={() => setComeAlmoco(v => !v)}
            style={{
              width: '100%', border: `1px solid ${comeAlmoco ? '#dc2626' : 'var(--line)'}`,
              borderRadius: 14, padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
              background: comeAlmoco ? '#fef2f2' : 'var(--card)',
              display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: 'var(--sans)',
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 4, border: `2px solid ${comeAlmoco ? '#dc2626' : 'var(--line)'}`,
              background: comeAlmoco ? '#dc2626' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {comeAlmoco && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: comeAlmoco ? '#dc2626' : 'var(--ink)' }}>Come no almoço</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Trato extra no meio do dia</div>
            </div>
          </button>
          {comeAlmoco && (
            <div style={{ background: 'var(--card)', border: '1px solid #dc2626', borderRadius: 14, overflow: 'hidden', marginTop: 8 }}>
              <FormField label="🍽️ Ração Almoço (kg)">
                <input type="number" step="0.1" value={racaoKgAlmoco} onChange={e => setRacaoKgAlmoco(e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0 }} />
              </FormField>
            </div>
          )}
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
          <FormField label="Suplementos">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {insumosProp.filter(i => i.categoria === 'suplemento').map(i => {
                const sup = suplementos.find(s => s.insumoId === i.id);
                return (
                  <div key={i.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: sup ? 4 : 0 }}>
                      <input type="checkbox" checked={!!sup}
                        onChange={e => e.target.checked ? handleAddSuplemento(i.id) : handleRemoveSuplemento(i.id)}
                        style={{ cursor: 'pointer' }} />
                      <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)', fontWeight: 600 }}>{i.nome}</span>
                      {sup && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input type="number" step={i.unidade === 'kg' || i.unidade === 'l' ? '0.1' : '1'} value={sup.qtdDia}
                            onChange={e => handleUpdateSuplementoQtd(i.id, e.target.value)}
                            placeholder="dose/dia"
                            style={{ width: 65, border: '1px solid var(--line)', borderRadius: 6, padding: '4px 6px', fontSize: 12, color: 'var(--ink)', outline: 'none', textAlign: 'center' }} />
                          <span style={{ fontSize: 11, color: 'var(--ink-3)', minWidth: 16 }}>{i.unidade || 'un'}</span>
                        </span>
                      )}
                    </div>
                    {sup && (
                      <div style={{ display: 'flex', gap: 8, paddingLeft: 32, marginTop: 2 }}>
                        <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!sup.manha} onChange={() => handleToggleSupTurno(i.id, 'manha')} style={{ cursor: 'pointer' }} />
                          🌅 Manhã
                        </label>
                        <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!sup.tarde} onChange={() => handleToggleSupTurno(i.id, 'tarde')} style={{ cursor: 'pointer' }} />
                          🌇 Tarde
                        </label>
                        {sup.manha && sup.tarde && (
                          <span style={{ fontSize: 11, color: 'var(--ink-3)', alignSelf: 'center' }}>
                            ({(sup.qtdDia / 2).toFixed(1)} {i.unidade || 'un'}/trato)
                          </span>
                        )}
                      </div>
                    )}
                    {sup && (
                      <div style={{ display: 'flex', gap: 8, paddingLeft: 32, marginTop: 4 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 2 }}>Início</div>
                          <input type="date" value={sup.dataInicio || ''} onChange={e => handleUpdateSuplementoDatas(i.id, 'dataInicio', e.target.value)}
                            style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 6, padding: '4px 6px', fontSize: 12, color: 'var(--ink)', outline: 'none', background: 'transparent' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 2 }}>Fim (opc.)</div>
                          <input type="date" value={sup.dataFim || ''} onChange={e => handleUpdateSuplementoDatas(i.id, 'dataFim', e.target.value)}
                            style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 6, padding: '4px 6px', fontSize: 12, color: 'var(--ink)', outline: 'none', background: 'transparent' }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </FormField>
        </div>
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        {savedMessage && (
          <div style={{
            background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10,
            padding: '12px', color: '#166534', fontSize: 13, marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="check" size={16} />
            Cavalo atualizado com sucesso!
          </div>
        )}

        <button onClick={handleSave} style={{
          width: '100%', background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 14, padding: '14px',
          fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
          marginBottom: 8,
        }}>
          Salvar alterações
        </button>

        <button onClick={handleDelete} style={{
          width: '100%', background: '#fee2e2', color: '#dc2626',
          border: '1px solid #fca5a5', borderRadius: 14, padding: '14px',
          fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
        }}>
          Excluir cavalo
        </button>
      </div>
    </div>
  );
};

const FormField = ({ label, children }) => (
  <div style={{ padding: '14px' }}>
    <label style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
      {label}
    </label>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────
// ADICIONAR CAVALO
// ─────────────────────────────────────────────────────────────
const AddCavaloScreen = ({ setScreen, addCavalo, cavalos = CAVALOS, setNovoCavaloPendente, pendingEntradaCavalo, setPendingEntradaCavalo, proprietarios: allProprietarios = PROPRIETARIOS, addProprietario }) => {
  const pelagenOptions = ['Tordilho', 'Alazã', 'Castanho', 'Preto', 'Baia', 'Rosilha'];
  
  const [nome, setNome] = useState('');
  const [selectedProprietarios, setSelectedProprietarios] = useState([]);
  const [showPropSelector, setShowPropSelector] = useState(false);
  const [novoProprietarioNome, setNovoProprietarioNome] = useState('');
  const [idade, setIdade] = useState('');
  const [sexo, setSexo] = useState('');
  const [categorias, setCategorias] = useState(new Set());
  const [dataCobertura, setDataCobertura] = useState('');
  const [pelagem, setPelagem] = useState('Tordilho');
  const [baia, setBaia] = useState('');
  const existingLocaisAdd = useMemo(() => {
    const vals = new Set();
    cavalos.forEach(cv => { if (cv.baia) vals.add(cv.baia); if (cv.piquete) vals.add(cv.piquete); });
    return [...vals].sort((a, b) => a.localeCompare(b, 'pt'));
  }, [cavalos]);
  const [mensalidade, setMensalidade] = useState('1950');
  const hoje = new Date().toISOString().split('T')[0];
  const primeiroDiaMes = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-01';
  const [dataEntrada, setDataEntrada] = useState(pendingEntradaCavalo ? hoje : '');
  const [nascimento, setNascimento] = useState('');
  const [obs, setObs] = useState('');
  const [erro, setErro] = useState('');

  // Plano nutricional
  const [racaoId, setRacaoId] = useState('i2');
  const [racaoKgManha, setRacaoKgManha] = useState('2');
  const [racaoKgTarde, setRacaoKgTarde] = useState('2');
  const [comeAlmoco, setComeAlmoco] = useState(false);
  const [racaoKgAlmoco, setRacaoKgAlmoco] = useState('0');
  const [oleoMlManha, setOleoMlManha] = useState('25');
  const [oleoMlTarde, setOleoMlTarde] = useState('25');
  const [fenoKgDia, setFenoKgDia] = useState('0');
  const [suplementos, setSuplementos] = useState([]);
  const [periodicos, setPeriodicos] = useState([]);
  const [novoPerInsumoId, setNovoPerInsumoId] = useState('');
  const [novoPerQtd, setNovoPerQtd] = useState('');
  const [novoPerFreq, setNovoPerFreq] = useState('semanal');
  const [novoPerDia, setNovoPerDia] = useState(1);
  const [novoPerTurno, setNovoPerTurno] = useState('manha');
  const [showPerForm, setShowPerForm] = useState(false);
  const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const FREQ_OPTIONS = [
    { value: 'semanal', label: 'Semanal' },
    { value: 'quinzenal', label: 'Quinzenal' },
  ];
  const TURNO_OPTIONS = [
    { value: 'manha', label: '🌅 Manhã' },
    { value: 'tarde', label: '🌇 Tarde' },
    { value: 'ambos', label: 'Ambos' },
  ];
  const [mae, setMae] = useState('');
  const [pai, setPai] = useState('');

  const isGestante = categorias.has('Gestante');
  const isReceptora = categorias.has('Receptora');

  const handleToggleCategoria = (cat) => {
    const next = new Set(categorias);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setCategorias(next);
  };

  const handleToggleProp = (propId) => {
    const next = selectedProprietarios.includes(propId)
      ? selectedProprietarios.filter(p => p !== propId)
      : [...selectedProprietarios, propId];
    setSelectedProprietarios(next);
  };

  const handleAddNovoProprietario = () => {
    if (!novoProprietarioNome.trim()) return;
    const newId = addProprietario(novoProprietarioNome.trim());
    setSelectedProprietarios(prev => [...prev, newId]);
    setNovoProprietarioNome('');
    setShowPropSelector(true); // talvez manter aberto
  };

  const handleAddSuplemento = (insumoId) => {
    if (!suplementos.find(s => s.insumoId === insumoId)) {
      setSuplementos([...suplementos, { insumoId, qtdDia: 1, manha: true, tarde: false }]);
    }
  };

  const handleRemoveSuplemento = (insumoId) => {
    setSuplementos(suplementos.filter(s => s.insumoId !== insumoId));
  };

  const handleUpdateSuplementoQtd = (insumoId, qtdDia) => {
    setSuplementos(suplementos.map(s => s.insumoId === insumoId ? { ...s, qtdDia: parseFloat(qtdDia) || 0 } : s));
  };

  const handleToggleSupTurno = (insumoId, turno) =>
    setSuplementos(suplementos.map(s => s.insumoId === insumoId ? { ...s, [turno]: !s[turno] } : s));

  const handleAddPeriodico = () => {
    if (!novoPerInsumoId || !novoPerQtd) return;
    setPeriodicos(prev => [...prev, {
      insumoId: novoPerInsumoId, qtd: parseFloat(novoPerQtd) || 0,
      frequencia: novoPerFreq, diaSemana: novoPerDia, turno: novoPerTurno,
    }]);
    setNovoPerInsumoId(''); setNovoPerQtd(''); setShowPerForm(false);
  };
  const handleRemovePeriodico = (idx) => setPeriodicos(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!nome.trim()) { setErro('Nome do cavalo é obrigatório'); return; }
    if (selectedProprietarios.length === 0) { setErro('Selecione pelo menos um proprietário'); return; }
    if (!sexo) { setErro('Sexo é obrigatório'); return; }
    if (categorias.size === 0) { setErro('Selecione pelo menos uma categoria'); return; }
    if (isGestante && !dataCobertura) { setErro('Data de cobrição é obrigatória para gestantes'); return; }

    const categoriasArr = Array.from(categorias);
    const categoria = categoriasArr[0];

    const dataEntradaFinal = dataEntrada || primeiroDiaMes;
    const novoCavaloData = {
      nome: nome.trim(),
      pelagem,
      sexo,
      categoria,
      categorias: categoriasArr,
      proprietarioId: selectedProprietarios[0],
      proprietarioIds: selectedProprietarios,
      baia: baia.trim() || 'A-00',
      piquete: baia.trim() || 'A-00',
      mensalidade: parseInt(mensalidade) || 1950,
      obs: obs.trim(),
      dataEntrada: dataEntradaFinal,
      nascimento: nascimento || undefined,
      ...(isGestante ? { gestacao: { dataCobricao: dataCobertura, pai, ...(isReceptora ? { mae } : {}) } } : {}),
      nutricao: {
        racaoId,
        racaoKgManha: parseFloat(racaoKgManha) || 0,
        racaoKgTarde: parseFloat(racaoKgTarde) || 0,
        racaoKgDia: (parseFloat(racaoKgManha) || 0) + (parseFloat(racaoKgTarde) || 0) + (comeAlmoco ? (parseFloat(racaoKgAlmoco) || 0) : 0),
        comeAlmoco,
        racaoKgAlmoco: comeAlmoco ? (parseFloat(racaoKgAlmoco) || 0) : 0,
        oleoMlManha: parseFloat(oleoMlManha) || 0,
        oleoMlTarde: parseFloat(oleoMlTarde) || 0,
        oleoMlDia: (parseFloat(oleoMlManha) || 0) + (parseFloat(oleoMlTarde) || 0),
        fenoKgDia: parseFloat(fenoKgDia) || 0,
        suplementos: suplementos.filter(s => s.qtdDia > 0),
        periodicos,
      }
    };

    const newId = await addCavalo(novoCavaloData);
    if (pendingEntradaCavalo && setNovoCavaloPendente) {
      setNovoCavaloPendente({ id: newId, dataEntrada: new Date().toISOString().split('T')[0] });
      setPendingEntradaCavalo(false);
      setScreen('movimentacao');
      return;
    }
    setScreen('cavalos');
  };

  const handleBack = () => {
    if (pendingEntradaCavalo && setPendingEntradaCavalo) {
      setPendingEntradaCavalo(false);
      setScreen('movimentacao');
      return;
    }
    setScreen('cavalos');
  };

  return (
    <div style={{ paddingBottom: 110 }}>
      <TopBar title="Adicionar cavalo" onBack={handleBack} />

      {erro && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10,
          padding: '12px 20px', color: '#dc2626', fontSize: 13, margin: '12px 20px 0',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="alert-circle" size={16} />
          {erro}
        </div>
      )}

      <div style={{ padding: '14px 20px 0' }}>
        {/* Nome do cavalo */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Nome do cavalo *">
            <input
              value={nome}
              onChange={e => { setNome(e.target.value); setErro(''); }}
              placeholder="Ex: Indiano"
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
        </div>

        {/* Proprietários */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Proprietário(s) *">
            {!showPropSelector ? (
              <button onClick={() => setShowPropSelector(true)} style={{
                width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                textAlign: 'left', color: selectedProprietarios.length === 0 ? 'var(--ink-3)' : 'var(--ink)',
                fontSize: 15, padding: 0,
              }}>
                {selectedProprietarios.length === 0 
                  ? 'Toque para selecionar...' 
                  : allProprietarios.filter(p => selectedProprietarios.includes(p.id)).map(p => p.nome).join(', ')}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allProprietarios.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--ink)' }}>
                    <input
                      type="checkbox"
                      checked={selectedProprietarios.includes(p.id)}
                      onChange={() => handleToggleProp(p.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    {p.nome}
                  </label>
                ))}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>Adicionar novo proprietário</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={novoProprietarioNome}
                      onChange={e => setNovoProprietarioNome(e.target.value)}
                      placeholder="Nome do proprietário"
                      style={{
                        flex: 1, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px',
                        fontSize: 14, color: 'var(--ink)', outline: 'none',
                      }}
                    />
                    <button onClick={handleAddNovoProprietario} disabled={!novoProprietarioNome.trim()} style={{
                      background: novoProprietarioNome.trim() ? 'var(--accent)' : 'var(--soft)',
                      color: novoProprietarioNome.trim() ? '#fff' : 'var(--ink-3)',
                      border: 'none', borderRadius: 8, padding: '8px 12px',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                      Adicionar
                    </button>
                  </div>
                </div>
                <button onClick={() => setShowPropSelector(false)} style={{
                  background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10,
                  padding: '8px', fontSize: 13, fontWeight: 600, marginTop: 4, cursor: 'pointer',
                }}>
                  Pronto
                </button>
              </div>
            )}
          </FormField>
        </div>

        {/* Datas */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Data de nascimento">
            <input
              type="date"
              value={nascimento}
              onChange={e => setNascimento(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            <FormField label={pendingEntradaCavalo ? 'Data de entrada *' : 'Data de entrada (opcional)'}>
              <input
                type="date"
                value={dataEntrada}
                onChange={e => setDataEntrada(e.target.value)}
                style={{
                  width: '100%', border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
                }}
              />
              {!pendingEntradaCavalo && (
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
                  Se não preenchida, considera entrada no 1º dia do mês vigente
                </div>
              )}
            </FormField>
          </div>
        </div>

        {/* Sexo */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Sexo *">
            <div style={{ display: 'flex', gap: 12 }}>
              {['M', 'F'].map(s => (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: 'var(--ink)' }}>
                  <input
                    type="radio"
                    name="sexo"
                    value={s}
                    checked={sexo === s}
                    onChange={() => { setSexo(s); setErro(''); }}
                    style={{ cursor: 'pointer' }}
                  />
                  {s === 'M' ? 'Macho' : 'Fêmea'}
                </label>
              ))}
            </div>
          </FormField>
        </div>

        {/* Categoria */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Categoria * (marque uma ou mais)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CATEGORIAS_CAVALO.map(cat => (
                <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--ink)' }}>
                  <input
                    type="checkbox"
                    checked={categorias.has(cat)}
                    onChange={() => { handleToggleCategoria(cat); setErro(''); }}
                    style={{ cursor: 'pointer' }}
                  />
                  {cat}
                </label>
              ))}
            </div>
          </FormField>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Idade">
            <input
              value={idade}
              onChange={e => { setIdade(e.target.value); setErro(''); }}
              placeholder="Ex: 2 anos, 10 meses"
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
        </div>

        {/* Dados de gestação - obrigatório para gestantes */}
        {isGestante && (
          <div style={{ background: 'var(--card)', border: '1px solid #dc2626', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
            <FormField label={isReceptora ? 'Transferência de embrião — data de cobrição *' : 'Data de cobrição *'}>
              <input
                type="date"
                value={dataCobertura}
                onChange={e => { setDataCobertura(e.target.value); setErro(''); }}
                style={{
                  width: '100%', border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
                }}
              />
              <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>
                ⚠️ Obrigatório para gestantes
              </div>
            </FormField>
            <div style={{ borderTop: '1px solid var(--line)' }}>
              <FormField label="Garanhão utilizado no cruzamento">
                <input
                  value={pai}
                  onChange={e => setPai(e.target.value)}
                  placeholder="Nome do garanhão…"
                  style={{
                    width: '100%', border: 'none', outline: 'none', background: 'transparent',
                    fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
                  }}
                />
              </FormField>
            </div>
            {isReceptora && (
              <div style={{ borderTop: '1px solid var(--line)' }}>
                <FormField label="Mãe biológica do produto (doadora)">
                  <input
                    value={mae}
                    onChange={e => setMae(e.target.value)}
                    placeholder="Nome da égua doadora…"
                    style={{
                      width: '100%', border: 'none', outline: 'none', background: 'transparent',
                      fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
                    }}
                  />
                </FormField>
              </div>
            )}
          </div>
        )}

        {/* Pelagem */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Pelagem">
            <select
              value={pelagem}
              onChange={e => setPelagem(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            >
              {pelagenOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Baia / Piquete (opcional) */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Baia / Piquete (opcional)">
            <input
              value={baia}
              onChange={e => setBaia(e.target.value)}
              list="locais-list-add"
              placeholder="Ex: A-04, Piquete 3…"
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
            <datalist id="locais-list-add">
              {existingLocaisAdd.map(v => <option key={v} value={v} />)}
            </datalist>
          </FormField>
        </div>

        {/* Mensalidade (opcional) */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Mensalidade (R$) (opcional)">
            <input
              type="number"
              value={mensalidade}
              onChange={e => setMensalidade(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
        </div>

        {/* Observações (opcional) */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Observações (opcional)">
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
                minHeight: 60, resize: 'none',
              }}
            />
          </FormField>
        </div>

        {/* Plano nutricional */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Tipo da ração">
            <select
              value={racaoId}
              onChange={e => setRacaoId(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            >
              {INSUMOS.filter(i => i.categoria === 'racao').map(i => (
                <option key={i.id} value={i.id}>{i.nome}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            <FormField label="🌅 Ração Manhã (kg)">
              <input type="number" step="0.1" value={racaoKgManha} onChange={e => setRacaoKgManha(e.target.value)}
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0 }} />
            </FormField>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            <FormField label="🌇 Ração Tarde (kg)">
              <input type="number" step="0.1" value={racaoKgTarde} onChange={e => setRacaoKgTarde(e.target.value)}
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0 }} />
            </FormField>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            <FormField label="🫒 Óleo Manhã (ml)">
              <input type="number" step="1" value={oleoMlManha} onChange={e => setOleoMlManha(e.target.value)}
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0 }} />
            </FormField>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            <FormField label="🫒 Óleo Tarde (ml)">
              <input type="number" step="1" value={oleoMlTarde} onChange={e => setOleoMlTarde(e.target.value)}
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0 }} />
            </FormField>
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="🌾 Feno (kg/dia)">
            <input type="number" step="0.5" min="0" value={fenoKgDia} onChange={e => setFenoKgDia(e.target.value)}
              style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0 }} />
          </FormField>
        </div>

        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setComeAlmoco(v => !v)}
            style={{
              width: '100%', border: `1px solid ${comeAlmoco ? '#dc2626' : 'var(--line)'}`,
              borderRadius: 14, padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
              background: comeAlmoco ? '#fef2f2' : 'var(--card)',
              display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: 'var(--sans)',
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 4, border: `2px solid ${comeAlmoco ? '#dc2626' : 'var(--line)'}`,
              background: comeAlmoco ? '#dc2626' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {comeAlmoco && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: comeAlmoco ? '#dc2626' : 'var(--ink)' }}>Come no almoço</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Trato extra no meio do dia</div>
            </div>
          </button>
          {comeAlmoco && (
            <div style={{ background: 'var(--card)', border: '1px solid #dc2626', borderRadius: 14, overflow: 'hidden', marginTop: 8 }}>
              <FormField label="🍽️ Ração Almoço (kg)">
                <input type="number" step="0.1" value={racaoKgAlmoco} onChange={e => setRacaoKgAlmoco(e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0 }} />
              </FormField>
            </div>
          )}
        </div>

        {/* Suplementos */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <FormField label="Suplementos">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {INSUMOS.filter(i => i.categoria === 'suplemento').map(i => {
                const sup = suplementos.find(s => s.insumoId === i.id);
                return (
                  <div key={i.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: sup ? 4 : 0 }}>
                      <input
                        type="checkbox"
                        checked={!!sup}
                        onChange={e => e.target.checked ? handleAddSuplemento(i.id) : handleRemoveSuplemento(i.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)', fontWeight: 600 }}>{i.nome}</span>
                      {sup && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number"
                            step={i.unidade === 'kg' || i.unidade === 'l' ? '0.1' : '1'}
                            value={sup.qtdDia}
                            onChange={e => handleUpdateSuplementoQtd(i.id, e.target.value)}
                            placeholder="dose/dia"
                            style={{
                              width: 65, border: '1px solid var(--line)', borderRadius: 6, padding: '4px 6px',
                              fontSize: 12, color: 'var(--ink)', outline: 'none', textAlign: 'center',
                            }}
                          />
                          <span style={{ fontSize: 11, color: 'var(--ink-3)', minWidth: 16 }}>{i.unidade || 'un'}</span>
                        </span>
                      )}
                    </div>
                    {sup && (
                      <div style={{ display: 'flex', gap: 8, paddingLeft: 32, marginTop: 2 }}>
                        <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!sup.manha} onChange={() => handleToggleSupTurno(i.id, 'manha')} style={{ cursor: 'pointer' }} />
                          🌅 Manhã
                        </label>
                        <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!sup.tarde} onChange={() => handleToggleSupTurno(i.id, 'tarde')} style={{ cursor: 'pointer' }} />
                          🌇 Tarde
                        </label>
                        {sup.manha && sup.tarde && (
                          <span style={{ fontSize: 11, color: 'var(--ink-3)', alignSelf: 'center' }}>
                            ({(sup.qtdDia / 2).toFixed(1)} {i.unidade || 'un'}/trato)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </FormField>
        </div>
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        <button onClick={handleSave} style={{
          width: '100%', background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 14, padding: '14px',
          fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
        }}>
          Adicionar cavalo
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PROPRIETÁRIO DETALHE
// ─────────────────────────────────────────────────────────────
const ProprietarioScreen = ({ id, setScreen, proprietarios, cavalos = CAVALOS, updateProprietario }) => {
  const p = proprietarios.find(prop => prop.id === id);
  const ownedCavalos = p ? cavalos.filter(c => (c.proprietarioIds || []).includes(id) || c.proprietarioId === id) : [];

  const [nome, setNome] = useState(p?.nome || '');
  const [telefone, setTelefone] = useState(p?.telefone || '');
  const [email, setEmail] = useState(p?.email || '');
  const [savedMessage, setSavedMessage] = useState(false);

  if (!p) return null;

  const handleSave = () => {
    updateProprietario(id, { nome, telefone, email });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  return (
    <div style={{ paddingBottom: 110 }}>
      <TopBar title={p.nome} onBack={() => setScreen('cadProprietarios')} />

      {savedMessage && (
        <div style={{
          background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 10,
          padding: '12px 20px', color: 'var(--accent)', fontSize: 13, margin: '12px 20px 0',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="check" size={16} />
          Informações salvas
        </div>
      )}

      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          <FormField label="Nome">
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
          <FormField label="Telefone">
            <input
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              placeholder="Ex: (11) 99999-9999"
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
          <FormField label="Email">
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Ex: exemplo@email.com"
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', padding: 0,
              }}
            />
          </FormField>
        </div>

        <div style={{ marginTop: 18, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>Cavalos deste proprietário</div>
          {ownedCavalos.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '10px 0' }}>Nenhum cavalo cadastrado.</div>
          ) : ownedCavalos.map((cav, index) => (
            <div key={cav.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, padding: index === 0 ? '0 0 10px' : '10px 0 10px',
              borderTop: index === 0 ? 'none' : '1px solid var(--line)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HorseAvatar cavalo={cav} size={24} />
                <div>
                  <div style={{ fontSize: 13, color: 'var(--ink)' }}>{cav.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{cav.baia}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 92 }}>
                <div style={{ fontSize: 13, color: 'var(--ink)' }}>{formatBRL(cav.mensalidade)}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>mensalidade</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        <button onClick={handleSave} style={{
          width: '100%', background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 14, padding: '14px',
          fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
        }}>
          Salvar alterações
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// FATURAS · Lista (sub-tela interna do FinanceiroScreen)
// ─────────────────────────────────────────────────────────────
const FaturaListaScreen = ({ setScreen, setSelected, registros, insumos = [], proprietarios = [], cavalos = [], movimentacoes = [], faturaRef, setFaturaRef, faturasFechadas = [] }) => {
  const hoje = new Date();
  const [ref, setRef] = useState(faturaRef || { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 });
  const findInsumo = (id) => insumos.find(i => i.id === id);
  const isCurrentMonth = hoje.getFullYear() === ref.ano && hoje.getMonth() + 1 === ref.mes;

  const getFaturaFechada = (propId) => faturasFechadas.find(f => f.proprietarioId === propId && f.ano === ref.ano && f.mes === ref.mes);

  const shareCount = (c) => Math.max(1, (c.proprietarioIds || []).length || 1);
  const faturas = [...proprietarios].sort((a, b) => a.nome.localeCompare(b.nome, 'pt')).map(p => {
    const ff = getFaturaFechada(p.id);
    const cavalosObj = cavalos.filter(c => (c.proprietarioIds || []).includes(p.id) || c.proprietarioId === p.id);
    if (ff) return { ...p, total: ff.total, mensalidades: ff.mensalidades, perfil: ff.perfilNutricional, insumos: ff.insumosAvulsos, cavalosObj, fechada: true };
    const mensalidades = cavalosObj.reduce((s, c) => s + calcMensalidadeProporcional(c, ref, movimentacoes).valor / shareCount(c), 0);
    const perfilTotal = cavalosObj.reduce((s, c) => s + calcPerfilMes(c, ref, movimentacoes, insumos).total / shareCount(c), 0);
    const cavIds = new Set(cavalosObj.map(c => c.id));
    const myReg = registros.filter(r => {
      if (!cavIds.has(r.cavaloId)) return false;
      if (!r.data) return true;
      const d = new Date(r.data + 'T12:00:00');
      return d.getFullYear() === ref.ano && d.getMonth() + 1 === ref.mes;
    });
    const insumosTotal = myReg.reduce((s, r) => {
      const i = findInsumo(r.insumoId);
      const cav = cavalos.find(c => c.id === r.cavaloId);
      return s + ((i?.valorVenda ?? 0) * r.qtd) / shareCount(cav || {});
    }, 0);
    return { ...p, total: mensalidades + perfilTotal + insumosTotal, mensalidades, perfil: perfilTotal, insumos: insumosTotal, cavalosObj, fechada: false };
  });

  const navMes = (delta) => {
    setRef(prev => {
      let m = prev.mes + delta, a = prev.ano;
      if (m < 1) { m = 12; a--; }
      if (m > 12) { m = 1; a++; }
      const r = { ano: a, mes: m };
      setFaturaRef(r);
      return r;
    });
  };

  return (
    <div>
      <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => navMes(-1)} style={{ background: 'none', border: 'none', padding: '6px 12px', fontSize: 22, color: 'var(--ink-2)', cursor: 'pointer' }}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)' }}>{MESES[ref.mes - 1]} · {ref.ano}</div>
          {isCurrentMonth && <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>proporcional até hoje</div>}
        </div>
        <button onClick={() => navMes(1)} style={{ background: 'none', border: 'none', padding: '6px 12px', fontSize: 22, color: 'var(--ink-2)', cursor: 'pointer', opacity: isCurrentMonth ? 0.25 : 1 }} disabled={isCurrentMonth}>›</button>
      </div>

      <div style={{ padding: '12px 20px 0' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: '16px' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {isCurrentMonth ? 'Faturado até hoje' : 'Total do mês'}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 4 }}>
            {formatBRL(faturas.reduce((s, f) => s + f.total, 0))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
            {faturas.length} proprietários · {cavalos.length} cavalos
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 400, margin: '0 0 8px', color: 'var(--ink-2)' }}>Por proprietário</h2>
        {faturas.map(f => (
          <button key={f.id} onClick={() => { setFaturaRef(ref); setSelected(f.id); setScreen('faturaDetalhe'); }} style={{
            width: '100%', background: 'var(--card)', border: `1px solid ${f.fechada ? 'var(--accent)' : 'var(--line)'}`,
            borderRadius: 14, padding: '14px', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: 'var(--ink)',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 38,
              background: f.fechada ? 'var(--accent)' : 'var(--accent-soft)',
              color: f.fechada ? '#fff' : 'var(--accent)', display: 'grid', placeItems: 'center',
              fontFamily: 'var(--serif)', fontSize: 14,
            }}>
              {f.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>{f.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                {f.cavalosObj.length} cavalo{f.cavalosObj.length !== 1 ? 's' : ''} · {f.fechada ? 'Fatura fechada ✓' : `mens. ${formatBRL(f.mensalidades)} + perfil ${formatBRL(f.perfil)} + ins. ${formatBRL(f.insumos)}`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{formatBRL(f.total)}</div>
              <Icon name="chevron-right" size={14} color="var(--ink-3)" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// FINANCEIRO · Tela principal com sub-abas
// ─────────────────────────────────────────────────────────────
const LancamentoForm = ({ tipo, onSave, onCancel, initial }) => {
  const [valor, setValor] = useState(String(initial?.valor || ''));
  const [data, setData] = useState(initial?.data || new Date().toLocaleDateString('sv-SE'));
  const [quem, setQuem] = useState(initial?.quem || '');
  const [motivo, setMotivo] = useState(initial?.motivo || '');
  const [categoria, setCategoria] = useState(initial?.categoria || '');
  const [pago, setPago] = useState(initial?.pago || false);
  const [pagoEm, setPagoEm] = useState(initial?.pagoEm || '');

  const label = tipo === 'entrada' ? 'Entrada (Recebimento)' : 'Saída (Pagamento)';
  const pagoLabel = tipo === 'entrada' ? 'Recebido' : 'Pago';
  const cor = tipo === 'entrada' ? '#16a34a' : '#dc2626';

  const handleSave = () => {
    if (!valor || !data) return;
    onSave({ tipo, valor: parseFloat(valor) || 0, data, quem, motivo, categoria, pago, pagoEm: pago ? pagoEm : null });
  };

  return (
    <div style={{ background: 'var(--card)', border: `1px solid ${cor}40`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: cor, marginBottom: 12 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>Valor (R$) *</div>
          <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00"
            style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 14, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>Data *</div>
          <input type="date" value={data} onChange={e => setData(e.target.value)}
            style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 14, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>Quem</div>
        <input type="text" value={quem} onChange={e => setQuem(e.target.value)} placeholder={tipo === 'entrada' ? 'Quem pagou' : 'Pagar para quem'}
          style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 14, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>Motivo / Descrição</div>
        <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Mensalidade Epona, Ração, Vacina…"
          style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 14, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>Categoria</div>
        <input type="text" value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ex: Alimentação, Veterinário, Impostos…"
          style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 14, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: pago ? 8 : 12 }}>
        <input type="checkbox" checked={pago} onChange={e => setPago(e.target.checked)} id="chk-pago" style={{ cursor: 'pointer', width: 16, height: 16 }} />
        <label htmlFor="chk-pago" style={{ fontSize: 14, color: 'var(--ink)', cursor: 'pointer' }}>{pagoLabel}</label>
      </div>
      {pago && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>Data do {pagoLabel.toLowerCase()}</div>
          <input type="date" value={pagoEm} onChange={e => setPagoEm(e.target.value)}
            style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 14, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} style={{ flex: 1, background: cor, color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
          Salvar
        </button>
        <button onClick={onCancel} style={{ flex: 1, background: 'var(--soft)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
};

const RecorrenciaForm = ({ tipo, onSave, onCancel, initial }) => {
  const [valor, setValor] = useState(String(initial?.valor || ''));
  const [descricao, setDescricao] = useState(initial?.descricao || '');
  const [categoria, setCategoria] = useState(initial?.categoria || '');
  const [quem, setQuem] = useState(initial?.quem || '');
  const [frequencia, setFrequencia] = useState(initial?.frequencia || 'mensal');
  const [diaMes, setDiaMes] = useState(String(initial?.diaMes || '5'));
  const [dataInicio, setDataInicio] = useState(initial?.dataInicio || new Date().toLocaleDateString('sv-SE'));
  const [dataFim, setDataFim] = useState(initial?.dataFim || '');

  const cor = tipo === 'entrada' ? '#16a34a' : '#dc2626';
  const inp = { width: '100%', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 14, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--sans)', background: 'var(--bg)' };

  const handleSave = () => {
    if (!valor || !dataInicio) return;
    onSave({ tipo, valor: parseFloat(valor) || 0, descricao, categoria, quem, frequencia, diaMes: parseInt(diaMes) || 1, dataInicio, dataFim: dataFim || null, ativo: true });
  };

  return (
    <div style={{ background: 'var(--card)', border: `1px solid ${cor}40`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: cor, marginBottom: 12 }}>↻ {tipo === 'entrada' ? 'Recebimento Recorrente' : 'Pagamento Recorrente'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>Valor (R$) *</div>
          <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" style={inp} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>Frequência</div>
          <select value={frequencia} onChange={e => setFrequencia(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            <option value="mensal">Mensal</option>
            <option value="quinzenal">Quinzenal</option>
            <option value="semanal">Semanal</option>
          </select>
        </div>
      </div>
      {frequencia === 'mensal' && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>Dia do mês (1–28)</div>
          <input type="number" min="1" max="28" value={diaMes} onChange={e => setDiaMes(e.target.value)} style={inp} />
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>Descrição</div>
        <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder={tipo === 'entrada' ? 'Ex: Parcela embrião, Mensalidade barraca…' : 'Ex: Salário Pedro, Conta de luz…'} style={inp} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>{tipo === 'entrada' ? 'Quem paga' : 'Pagar para'}</div>
          <input type="text" value={quem} onChange={e => setQuem(e.target.value)} style={inp} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>Categoria</div>
          <input type="text" value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ex: Pessoal, Utilidades…" style={inp} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>Início *</div>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={inp} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>Fim (vazio = sem fim)</div>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={inp} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} style={{ flex: 1, background: cor, color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Salvar</button>
        <button onClick={onCancel} style={{ flex: 1, background: 'var(--soft)', color: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Cancelar</button>
      </div>
    </div>
  );
};

const LancamentosSubScreen = ({ tipo, lancamentos, addLancamento, updateLancamento, deleteLancamento, recorrencias = [], addRecorrencia, deleteRecorrencia }) => {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showRecForm, setShowRecForm] = useState(false);

  const lista = [...(lancamentos || [])].filter(l => l.tipo === tipo).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const listaRec = (recorrencias || []).filter(r => r.tipo === tipo && r.ativo);
  const total = lista.reduce((s, l) => s + l.valor, 0);
  const pendentes = lista.filter(l => !l.pago).reduce((s, l) => s + l.valor, 0);
  const cor = tipo === 'entrada' ? '#16a34a' : '#dc2626';
  const pagoLabel = tipo === 'entrada' ? 'Recebido' : 'Pago';
  const fmtFreq = r => r.frequencia === 'mensal' ? `todo dia ${r.diaMes}` : r.frequencia === 'quinzenal' ? 'quinzenal' : 'semanal';

  return (
    <div style={{ padding: '12px 20px 0' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', marginTop: 2 }}>{formatBRL(total)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Pendente</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: cor, marginTop: 2 }}>{formatBRL(pendentes)}</div>
          </div>
        </div>
      </div>

      {(showForm && !editId) && (
        <LancamentoForm tipo={tipo} onCancel={() => setShowForm(false)} onSave={data => { addLancamento(data); setShowForm(false); }} />
      )}
      {!showForm && (
        <button onClick={() => setShowForm(true)} style={{ width: '100%', background: cor + '12', border: `1px dashed ${cor}60`, borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 600, color: cor, cursor: 'pointer', fontFamily: 'var(--sans)', marginBottom: 10 }}>
          + Novo lançamento avulso
        </button>
      )}

      {lista.map(l => (
        <div key={l.id}>
          {editId === l.id ? (
            <LancamentoForm tipo={tipo} initial={l} onCancel={() => setEditId(null)} onSave={data => { updateLancamento(l.id, data); setEditId(null); }} />
          ) : (
            <div style={{ background: 'var(--card)', border: `1px solid ${l.pago ? 'var(--line)' : cor + '50'}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: l.pago ? '#9ca3af' : cor, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {l.motivo || '—'}
                  {l.recorrenciaId && <span style={{ fontSize: 10, color: 'var(--ink-3)', background: 'var(--soft)', borderRadius: 6, padding: '1px 5px', fontWeight: 400 }}>↻</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                  {l.data} {l.quem ? `· ${l.quem}` : ''} {l.categoria ? `· ${l.categoria}` : ''}
                </div>
                {l.pago && <div style={{ fontSize: 11, color: '#16a34a', marginTop: 1 }}>✓ {pagoLabel}{l.pagoEm ? ` em ${l.pagoEm}` : ''}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: l.pago ? 'var(--ink-2)' : cor }}>{formatBRL(l.valor)}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'flex-end' }}>
                  {!l.recorrenciaId && <button onClick={() => setEditId(l.id)} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>Editar</button>}
                  <button onClick={() => { if (window.confirm('Excluir este lançamento?')) deleteLancamento(l.id); }} style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#dc2626', cursor: 'pointer', fontFamily: 'var(--sans)' }}>×</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      {lista.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--ink-3)', fontSize: 14 }}>Nenhum lançamento avulso</div>
      )}

      {/* ── Recorrências ── */}
      <div style={{ borderTop: '1px solid var(--line)', marginTop: 16, paddingTop: 14, paddingBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>↻ Recorrências</div>
          {!showRecForm && (
            <button onClick={() => setShowRecForm(true)} style={{ background: cor + '12', border: `1px solid ${cor}40`, borderRadius: 8, padding: '4px 10px', fontSize: 12, color: cor, cursor: 'pointer', fontFamily: 'var(--sans)', fontWeight: 600 }}>+ Nova</button>
          )}
        </div>
        {showRecForm && <RecorrenciaForm tipo={tipo} onCancel={() => setShowRecForm(false)} onSave={data => { addRecorrencia(data); setShowRecForm(false); }} />}
        {listaRec.length === 0 && !showRecForm && (
          <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: '4px 0' }}>Nenhuma recorrência cadastrada</div>
        )}
        {listaRec.map(r => (
          <div key={r.id} style={{ background: cor + '08', border: `1px solid ${cor}30`, borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 16, color: cor }}>↻</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{r.descricao || '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                {formatBRL(r.valor)} · {fmtFreq(r)} · desde {r.dataInicio}{r.dataFim ? ` até ${r.dataFim}` : ' · sem fim'}
              </div>
            </div>
            <button onClick={() => { if (window.confirm('Excluir recorrência? Os lançamentos gerados são mantidos.')) deleteRecorrencia(r.id); }} style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#dc2626', cursor: 'pointer', fontFamily: 'var(--sans)' }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ResumoSubScreen = ({ lancamentos, proprietarios = [], cavalos = [], registros = [], insumos = [], movimentacoes = [], faturasFechadas = [], faturaRef }) => {
  const hoje = new Date();
  const ref = faturaRef || { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
  const shareCount = (c) => Math.max(1, (c.proprietarioIds || []).length || 1);

  const meses6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
    return { ano: d.getFullYear(), mes: d.getMonth() + 1, label: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][d.getMonth()] };
  });

  const faturamentoMes = useMemo(() => {
    return proprietarios.map(prop => {
      const faturaFechada = faturasFechadas.find(f => f.proprietarioId === prop.id && f.ano === ref.ano && f.mes === ref.mes);
      if (faturaFechada) return { propId: prop.id, total: faturaFechada.total || 0 };
      const cavalosObj = cavalos.filter(c => (c.proprietarioIds || []).includes(prop.id));
      const mensalidades = cavalosObj.reduce((s, c) => s + calcMensalidadeProporcional(c, ref, movimentacoes).valor / shareCount(c), 0);
      const perfilTotal = cavalosObj.reduce((s, c) => s + calcPerfilMes(c, ref, movimentacoes, insumos).total / shareCount(c), 0);
      const regTotal = (registros || []).filter(r => (r.proprietarioId === prop.id || (cavalosObj.find(c => c.id === r.cavaloId))) && r.mes === ref.mes && r.ano === ref.ano)
        .reduce((s, r) => {
          const cav = cavalos.find(c => c.id === r.cavaloId);
          const share = shareCount(cav || {});
          return s + ((insumos.find(i => i.id === r.insumoId)?.valorVenda ?? 0) * r.qtd) / share;
        }, 0);
      return { propId: prop.id, total: mensalidades + perfilTotal + regTotal };
    });
  }, [proprietarios, cavalos, registros, insumos, movimentacoes, faturasFechadas, ref]);

  const totalFaturamento = faturamentoMes.reduce((s, f) => s + f.total, 0);

  const porMes = meses6.map(m => {
    const entradas = (lancamentos || []).filter(l => l.tipo === 'entrada' && l.data?.startsWith(`${m.ano}-${String(m.mes).padStart(2, '0')}`)).reduce((s, l) => s + l.valor, 0);
    const saidas = (lancamentos || []).filter(l => l.tipo === 'saida' && l.data?.startsWith(`${m.ano}-${String(m.mes).padStart(2, '0')}`)).reduce((s, l) => s + l.valor, 0);
    return { ...m, entradas, saidas };
  });

  const totalAReceber = (lancamentos || []).filter(l => l.tipo === 'entrada' && !l.pago).reduce((s, l) => s + l.valor, 0);
  const totalAPagar = (lancamentos || []).filter(l => l.tipo === 'saida' && !l.pago).reduce((s, l) => s + l.valor, 0);
  const saldo = totalAReceber - totalAPagar;
  const maxVal = Math.max(1, ...porMes.map(m => Math.max(m.entradas, m.saidas)));

  return (
    <div style={{ padding: '12px 20px 0' }}>
      <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 14, padding: 14, marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Faturamento clientes</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--accent)', marginTop: 4 }}>{formatBRL(totalFaturamento)}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
          {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][ref.mes - 1]}/{ref.ano} · {proprietarios.length} proprietários
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>A Receber</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: '#16a34a', marginTop: 4 }}>{formatBRL(totalAReceber)}</div>
          <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>entradas pendentes</div>
        </div>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>A Pagar</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: '#dc2626', marginTop: 4 }}>{formatBRL(totalAPagar)}</div>
          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>saídas pendentes</div>
        </div>
      </div>
      <div style={{ background: saldo >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${saldo >= 0 ? '#bbf7d0' : '#fecaca'}`, borderRadius: 14, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Saldo projetado (lançamentos)</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: saldo >= 0 ? '#16a34a' : '#dc2626', marginTop: 4 }}>{formatBRL(saldo)}</div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Últimos 6 meses (lançamentos)</div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 12px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 100 }}>
          {porMes.map(m => (
            <div key={`${m.ano}-${m.mes}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 80 }}>
                <div style={{ flex: 1, background: '#bbf7d0', borderRadius: '3px 3px 0 0', height: `${(m.entradas / maxVal) * 80}px` }} />
                <div style={{ flex: 1, background: '#fecaca', borderRadius: '3px 3px 0 0', height: `${(m.saidas / maxVal) * 80}px` }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.2 }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 10 }}>
          <span style={{ fontSize: 11, color: '#15803d', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#bbf7d0', display: 'inline-block', borderRadius: 2 }} />Entradas</span>
          <span style={{ fontSize: 11, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#fecaca', display: 'inline-block', borderRadius: 2 }} />Saídas</span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ESTOQUE · Compras de insumos e nível de estoque
// ─────────────────────────────────────────────────────────────
const CompraForm = ({ onSave, onCancel, insumos = [] }) => {
  const hoje = new Date().toISOString().slice(0, 10);
  const [tipo, setTipo] = useState('compra');
  const [insumoId, setInsumoId] = useState('');
  const [data, setData] = useState(hoje);
  const [qtd, setQtd] = useState('');
  const [valorUnit, setValorUnit] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [obs, setObs] = useState('');
  const [pago, setPago] = useState(false);
  const [dataVencimento, setDataVencimento] = useState('');

  const insumoSel = insumos.find(i => i.id === insumoId);
  const unidade = insumoSel?.unidade || 'un';
  const valorTotal = (parseFloat(qtd) || 0) * (parseFloat(valorUnit) || 0);

  const handleInsumoChange = (id) => {
    setInsumoId(id);
    const ins = insumos.find(i => i.id === id);
    if (ins?.valorCompra) setValorUnit(String(ins.valorCompra));
  };

  const handleSave = () => {
    if (!insumoId || !data || !(parseFloat(qtd) > 0)) return;
    onSave({
      tipo,
      insumoId, data,
      qtd: parseFloat(qtd),
      unidade,
      valorUnit: tipo === 'ajuste' ? 0 : (parseFloat(valorUnit) || 0),
      valorTotal: tipo === 'ajuste' ? 0 : valorTotal,
      fornecedor: fornecedor.trim(),
      obs: obs.trim(),
      pago: tipo === 'compra' ? pago : false,
      dataVencimento: (tipo === 'compra' && !pago && dataVencimento) ? dataVencimento : null,
    });
  };

  const inp = { border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px', fontSize: 14, fontFamily: 'var(--sans)', background: 'var(--bg)', color: 'var(--ink)', width: '100%', boxSizing: 'border-box', outline: 'none' };

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Registrar entrada no estoque</div>

      {/* Toggle tipo */}
      <div style={{ display: 'flex', background: 'var(--soft)', borderRadius: 10, padding: 3, marginBottom: 14 }}>
        {[{ id: 'compra', label: 'Nova compra' }, { id: 'ajuste', label: 'Saldo existente' }].map(t => (
          <button key={t.id} onClick={() => setTipo(t.id)} style={{
            flex: 1, border: 'none', borderRadius: 8, padding: '7px 0',
            fontFamily: 'var(--sans)', fontSize: 13, fontWeight: tipo === t.id ? 700 : 400,
            background: tipo === t.id ? 'var(--card)' : 'transparent',
            color: tipo === t.id ? 'var(--ink)' : 'var(--ink-3)',
            cursor: 'pointer', transition: 'all 0.15s',
            boxShadow: tipo === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>
      {tipo === 'ajuste' && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#92400e' }}>
          Use para registrar o que você já tem hoje. Não gera lançamento financeiro.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Insumo *</div>
          <select value={insumoId} onChange={e => handleInsumoChange(e.target.value)} style={{ ...inp }}>
            <option value="">Selecionar insumo…</option>
            {insumos.slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).map(i => (
              <option key={i.id} value={i.id}>{i.nome}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>
              {tipo === 'ajuste' ? 'Data do inventário *' : 'Data de entrada *'}
            </div>
            <input type="date" value={data} onChange={e => setData(e.target.value)} style={inp} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Qtd ({unidade}) *</div>
            <input type="number" min="0" step="any" value={qtd} onChange={e => setQtd(e.target.value)} placeholder="0" style={inp} />
          </div>
        </div>

        {tipo === 'compra' && (<>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Valor unit. (R$)</div>
              <input type="number" min="0" step="0.01" value={valorUnit} onChange={e => setValorUnit(e.target.value)} placeholder="0,00" style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Total</div>
              <div style={{ ...inp, color: 'var(--ink-2)', background: 'var(--soft)' }}>{formatBRL(valorTotal)}</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Fornecedor</div>
            <input value={fornecedor} onChange={e => setFornecedor(e.target.value)} placeholder="Nome do fornecedor" style={inp} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--soft)', borderRadius: 10, cursor: 'pointer' }} onClick={() => setPago(v => !v)}>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${pago ? '#16a34a' : 'var(--line)'}`, background: pago ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
              {pago && <span style={{ color: '#fff', fontSize: 13, lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ fontSize: 14, color: 'var(--ink)', userSelect: 'none' }}>Já pago</span>
          </div>
          {!pago && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Vencimento do pagamento</div>
              <input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} style={inp} />
            </div>
          )}
        </>)}

        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Observações</div>
          <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" style={inp} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={onCancel} style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 10, padding: '10px 0', fontFamily: 'var(--sans)', fontSize: 14, background: 'none', color: 'var(--ink-2)', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={!insumoId || !data || !(parseFloat(qtd) > 0)} style={{ flex: 2, border: 'none', borderRadius: 10, padding: '10px 0', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 700, background: 'var(--accent)', color: '#fff', cursor: 'pointer', opacity: (!insumoId || !data || !(parseFloat(qtd) > 0)) ? 0.5 : 1 }}>
            {tipo === 'ajuste' ? 'Registrar saldo' : 'Salvar compra'}
          </button>
        </div>
      </div>
    </div>
  );
};

const EstoqueSubScreen = ({ cavalos = [], insumos = [], estoqueCompras = [], addEstoqueCompra, deleteEstoqueCompra }) => {
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const presentes = cavalos.filter(c => c.presente !== false);
  const hoje = new Date();

  const estoquePorInsumo = useMemo(() => {
    return insumos.map(ins => {
      const compras = estoqueCompras.filter(c => c.insumoId === ins.id);
      const totalComprado = compras.reduce((s, c) => s + (c.qtd || 0), 0);
      if (totalComprado === 0 && compras.length === 0) return null;

      const consumoDias = presentes.reduce((linhas, cav) => {
        const l = consumoDiarioCavaloLive(cav, insumos);
        return linhas.concat(l.filter(x => x.insumoId === ins.id));
      }, []);
      const qtdDiaTotal = consumoDias.reduce((s, l) => s + l.qtdDia, 0);

      const primeiraCompra = compras.reduce((min, c) => (!min || c.data < min) ? c.data : min, null);
      const diasDecorridos = primeiraCompra ? Math.max(0, Math.floor((hoje - new Date(primeiraCompra + 'T00:00:00')) / 86400000)) : 0;
      const consumoAcumulado = qtdDiaTotal * diasDecorridos;
      const estoqueAtual = Math.max(0, totalComprado - consumoAcumulado);
      const diasRestantes = qtdDiaTotal > 0 ? Math.floor(estoqueAtual / qtdDiaTotal) : null;

      return { ins, compras, totalComprado, qtdDiaTotal, estoqueAtual, diasRestantes };
    }).filter(Boolean);
  }, [insumos, estoqueCompras, presentes]);

  const corEstoque = (dias) => {
    if (dias === null) return '#2563eb';
    if (dias < 7) return '#dc2626';
    if (dias < 14) return '#d97706';
    return '#16a34a';
  };
  const bgEstoque = (dias) => {
    if (dias === null) return '#eff6ff';
    if (dias < 7) return '#fef2f2';
    if (dias < 14) return '#fffbeb';
    return '#f0fdf4';
  };

  return (
    <div style={{ padding: '12px 16px 0' }}>
      {!showForm && (
        <button onClick={() => setShowForm(true)} style={{ width: '100%', border: '1px dashed var(--accent)', borderRadius: 12, padding: '11px 0', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', cursor: 'pointer', marginBottom: 14 }}>
          + Registrar compra
        </button>
      )}
      {showForm && (
        <CompraForm insumos={insumos} onCancel={() => setShowForm(false)} onSave={data => { addEstoqueCompra(data); setShowForm(false); }} />
      )}

      {estoquePorInsumo.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 14 }}>Nenhuma compra registrada</div>
      )}

      {estoquePorInsumo.map(({ ins, compras, totalComprado, qtdDiaTotal, estoqueAtual, diasRestantes }) => (
        <div key={ins.id} style={{ background: bgEstoque(diasRestantes), border: `1px solid ${corEstoque(diasRestantes)}30`, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
          <div onClick={() => setExpandedId(expandedId === ins.id ? null : ins.id)} style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: corEstoque(diasRestantes), flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{ins.nome}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                {estoqueAtual % 1 === 0 ? estoqueAtual : estoqueAtual.toFixed(1)} {ins.unidade || 'un'} em estoque
                {qtdDiaTotal > 0 && ` · ${qtdDiaTotal % 1 === 0 ? qtdDiaTotal : qtdDiaTotal.toFixed(2)} ${ins.unidade || 'un'}/dia`}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {diasRestantes !== null ? (
                <div style={{ fontSize: 13, fontWeight: 700, color: corEstoque(diasRestantes) }}>
                  {diasRestantes}d
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>sem consumo</div>
              )}
              <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{expandedId === ins.id ? '▲' : '▼'}</div>
            </div>
          </div>
          {expandedId === ins.id && (
            <div style={{ borderTop: '1px solid var(--line)', padding: '10px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Histórico de compras</div>
              {compras.slice().sort((a, b) => b.data.localeCompare(a.data)).map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid var(--line)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {c.qtd % 1 === 0 ? c.qtd : c.qtd.toFixed(2)} {c.unidade}
                      {c.fornecedor ? ` · ${c.fornecedor}` : ''}
                      {c.tipo === 'ajuste' && <span style={{ fontSize: 10, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a', borderRadius: 5, padding: '1px 5px' }}>saldo inicial</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                      {c.data}{c.valorTotal > 0 ? ` · ${formatBRL(c.valorTotal)}` : ''}
                    </div>
                    {c.tipo !== 'ajuste' && c.valorTotal > 0 && (
                      c.pago
                        ? <div style={{ fontSize: 11, color: '#16a34a', marginTop: 1 }}>✓ Pago em {c.data}</div>
                        : <div style={{ fontSize: 11, color: c.dataVencimento && c.dataVencimento < new Date().toISOString().slice(0,10) ? '#dc2626' : '#d97706', marginTop: 1 }}>
                            {c.dataVencimento ? `Vence ${c.dataVencimento}` : 'Pagamento pendente'}
                          </div>
                    )}
                  </div>
                  <button onClick={() => { if (window.confirm('Excluir esta entrada? O lançamento financeiro vinculado também será removido.')) deleteEstoqueCompra(c.id); }} style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#dc2626', cursor: 'pointer', fontFamily: 'var(--sans)', flexShrink: 0 }}>×</button>
                </div>
              ))}
              {compras.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Nenhuma compra</div>}
            </div>
          )}
        </div>
      ))}
      <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', padding: '8px 0 12px' }}>
        Estoque visual · não bloqueia registros ou faturas
      </div>
    </div>
  );
};

const FinanceiroScreen = ({ setScreen, setSelected, registros, insumos, proprietarios, cavalos, movimentacoes, faturaRef, setFaturaRef, faturasFechadas, procedimentos, servicos, lancamentos = [], addLancamento, updateLancamento, deleteLancamento, recorrencias = [], addRecorrencia, deleteRecorrencia, estoqueCompras = [], addEstoqueCompra, deleteEstoqueCompra, currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';
  const [subTab, setSubTab] = useState('faturas');
  const subTabs = isAdmin
    ? [{ id: 'faturas', label: 'Faturas' }, { id: 'entradas', label: 'Entradas' }, { id: 'saidas', label: 'Saídas' }, { id: 'estoque', label: 'Estoque' }, { id: 'resumo', label: 'Resumo' }]
    : [{ id: 'faturas', label: 'Faturas' }];

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title="Financeiro" />
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--bg)', padding: '0 16px', overflowX: 'auto', flexShrink: 0, WebkitOverflowScrolling: 'touch' }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            flexShrink: 0, border: 'none', background: 'none', padding: '10px 10px',
            fontFamily: 'var(--sans)', fontSize: 13, fontWeight: subTab === t.id ? 700 : 400,
            color: subTab === t.id ? 'var(--accent)' : 'var(--ink-3)',
            borderBottom: subTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
        {(isAdmin || currentUser?.role === 'vet') && (
          <button onClick={() => setScreen('consumo')} style={{
            flexShrink: 0, border: 'none', background: 'none', padding: '10px 8px',
            fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 400,
            color: 'var(--ink-3)', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>Consumo ›</button>
        )}
      </div>
      {subTab === 'faturas' && (
        <FaturaListaScreen setScreen={setScreen} setSelected={setSelected} registros={registros} insumos={insumos} proprietarios={proprietarios} cavalos={cavalos} movimentacoes={movimentacoes} faturaRef={faturaRef} setFaturaRef={setFaturaRef} faturasFechadas={faturasFechadas} />
      )}
      {subTab === 'entradas' && isAdmin && (
        <LancamentosSubScreen tipo="entrada" lancamentos={lancamentos} addLancamento={addLancamento} updateLancamento={updateLancamento} deleteLancamento={deleteLancamento} recorrencias={recorrencias} addRecorrencia={addRecorrencia} deleteRecorrencia={deleteRecorrencia} />
      )}
      {subTab === 'saidas' && isAdmin && (
        <LancamentosSubScreen tipo="saida" lancamentos={lancamentos} addLancamento={addLancamento} updateLancamento={updateLancamento} deleteLancamento={deleteLancamento} recorrencias={recorrencias} addRecorrencia={addRecorrencia} deleteRecorrencia={deleteRecorrencia} />
      )}
      {subTab === 'estoque' && isAdmin && (
        <EstoqueSubScreen cavalos={cavalos} insumos={insumos} estoqueCompras={estoqueCompras} addEstoqueCompra={addEstoqueCompra} deleteEstoqueCompra={deleteEstoqueCompra} />
      )}
      {subTab === 'resumo' && isAdmin && (
        <ResumoSubScreen lancamentos={lancamentos} proprietarios={proprietarios} cavalos={cavalos} registros={registros} insumos={insumos} movimentacoes={movimentacoes} faturasFechadas={faturasFechadas} faturaRef={faturaRef} />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CONSUMO · Projeção nutricional por período
// ─────────────────────────────────────────────────────────────
const PERIODOS = [
  { id: 'dia', label: 'Dia', dias: 1 },
  { id: 'semana', label: 'Semana', dias: 7 },
  { id: 'quinzena', label: 'Quinzena', dias: 15 },
  { id: 'mes', label: 'Mês', dias: 30 },
];

const consumoDiarioCavaloLive = (cav, insumos) => {
  if (!cav.nutricao) return [];
  const n = cav.nutricao;
  const findIns = id => (insumos || []).find(i => i.id === id);
  const linhas = [];

  // Ração
  if (n.racaoId) {
    const racao = findIns(n.racaoId);
    if (racao) {
      const kgDia = (n.racaoKgManha || 0) + (n.racaoKgTarde || 0) + (n.comeAlmoco ? (n.racaoKgAlmoco || 0) : 0);
      if (kgDia > 0) linhas.push({ insumoId: racao.id, nome: racao.nome, qtdDia: kgDia, unidade: racao.unidade || 'kg', valorUnit: racao.valorCompra || 0 });
    }
  }

  // Feno
  if ((n.fenoKgDia || 0) > 0) {
    const feno = (insumos || []).find(i => norm(i.nome).includes('feno'));
    if (feno) linhas.push({ insumoId: feno.id, nome: feno.nome, qtdDia: n.fenoKgDia, unidade: feno.unidade || 'kg', valorUnit: feno.valorCompra || 0 });
  }

  // Óleo
  if ((n.oleoMlDia || 0) > 0) {
    const oleo = findIns('i_oleo') || (insumos || []).find(i => norm(i.nome).includes('leo'));
    if (oleo) linhas.push({ insumoId: oleo.id, nome: oleo.nome, qtdDia: n.oleoMlDia, unidade: oleo.unidade || 'ml', valorUnit: oleo.valorCompra || 0 });
  }

  // Suplementos
  for (const s of (n.suplementos || [])) {
    const ins = findIns(s.insumoId);
    if (!ins) continue;
    linhas.push({ insumoId: ins.id, nome: ins.nome, qtdDia: s.qtdDia, unidade: ins.unidade || 'un', valorUnit: ins.valorCompra || 0 });
  }

  // Periódicos
  for (const p of (n.periodicos || [])) {
    const ins = findIns(p.insumoId);
    if (!ins) continue;
    const freqDias = p.frequencia === 'quinzenal' ? 14 : p.frequencia === 'semanal' ? 7 : p.frequencia === 'diario' ? 1 : p.frequencia?.startsWith('cada') ? parseInt(p.frequencia.replace('cada', '')) || 7 : 7;
    linhas.push({ insumoId: ins.id, nome: ins.nome + ' (periódico)', qtdDia: p.qtd / freqDias, unidade: ins.unidade || 'un', valorUnit: ins.valorCompra || 0 });
  }

  return linhas;
};

const ConsumoScreen = ({ setScreen, cavalos = [], insumos = [] }) => {
  const [periodo, setPeriodo] = useState('semana');
  const [busca, setBusca] = useState('');
  const p = PERIODOS.find(x => x.id === periodo) || PERIODOS[1];

  const presentes = cavalos.filter(c => c.presente !== false);
  const filtrados = busca.trim()
    ? presentes.filter(c => norm(c.nome).includes(norm(busca)) || norm(c.baia || '').includes(norm(busca)))
    : presentes;

  const rows = filtrados.map(cav => {
    const linhas = consumoDiarioCavaloLive(cav, insumos);
    const totalDia = linhas.reduce((s, l) => s + l.valorUnit * l.qtdDia, 0);
    return { cav, linhas, totalDia, totalPeriodo: totalDia * p.dias };
  }).filter(r => r.linhas.length > 0 || busca.trim());

  const totalGeral = rows.reduce((s, r) => s + r.totalPeriodo, 0);

  const porInsumo = {};
  rows.forEach(r => r.linhas.forEach(l => {
    if (!porInsumo[l.nome]) porInsumo[l.nome] = { qtd: 0, unidade: l.unidade, valor: 0 };
    porInsumo[l.nome].qtd += l.qtdDia * p.dias;
    porInsumo[l.nome].valor += l.valorUnit * l.qtdDia * p.dias;
  }));

  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title="Consumo" onBack={() => setScreen('faturas')} />

      <div style={{ padding: '10px 16px', display: 'flex', gap: 8 }}>
        {PERIODOS.map(pp => (
          <button key={pp.id} onClick={() => setPeriodo(pp.id)} style={{
            flex: 1, border: `1px solid ${periodo === pp.id ? 'var(--accent)' : 'var(--line)'}`,
            borderRadius: 10, padding: '8px 4px', fontSize: 12, fontWeight: periodo === pp.id ? 700 : 400,
            color: periodo === pp.id ? 'var(--accent)' : 'var(--ink-3)',
            background: periodo === pp.id ? 'var(--accent-soft)' : 'var(--card)',
            cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>{pp.label}</button>
        ))}
      </div>

      <div style={{ padding: '0 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '9px 14px' }}>
          <Icon name="search" size={16} color="var(--ink-3)" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cavalo ou baia…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)' }} />
          {busca && <button onClick={() => setBusca('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink-3)', fontSize: 16 }}>×</button>}
        </div>
      </div>

      <div style={{ padding: '0 16px', marginBottom: 14 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total projetado / {p.label.toLowerCase()}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', marginTop: 2 }}>{formatBRL(totalGeral)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{rows.length} cavalos</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{p.dias} dia{p.dias !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      {Object.keys(porInsumo).length > 0 && (
        <div style={{ padding: '0 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8 }}>Totais por insumo</div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {Object.entries(porInsumo).map(([nome, info], idx, arr) => (
              <div key={nome} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: idx < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span style={{ fontSize: 13, color: 'var(--ink)' }}>{nome}</span>
                <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>{info.qtd % 1 === 0 ? info.qtd : info.qtd.toFixed(1)} {info.unidade} · {formatBRL(info.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8 }}>Por cavalo</div>
        {rows.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 14 }}>
            {busca ? 'Nenhum cavalo encontrado' : 'Nenhum cavalo com plano nutricional'}
          </div>
        )}
        {rows.map(({ cav, linhas, totalPeriodo }) => (
          <div key={cav.id} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: linhas.length > 0 ? 8 : 0 }}>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>{cav.nome}</div>
                {cav.baia && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{cav.baia}</div>}
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--accent)', fontWeight: 700 }}>{formatBRL(totalPeriodo)}</div>
            </div>
            {linhas.map(l => (
              <div key={l.insumoId} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderTop: '1px solid var(--line)' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{l.nome}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {(l.qtdDia * p.dias) % 1 === 0 ? (l.qtdDia * p.dias) : (l.qtdDia * p.dias).toFixed(1)} {l.unidade}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SHARE MODAL
// ─────────────────────────────────────────────────────────────
const ShareModal = ({ onClose, getPdf, fileName, summary, recipientEmail }) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (summary) {
      navigator.clipboard?.writeText(summary).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }).catch(() => {});
    }
  }, []);

  const build = () => {
    try { return getPdf(); } catch (e) { console.error(e); return null; }
  };

  const handleDownload = () => {
    const doc = build(); if (!doc) return;
    doc.save(fileName);
    onClose();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Fatura — ${fileName.replace('.pdf', '')}`);
    const body = encodeURIComponent(summary);
    window.open(`mailto:${recipientEmail || ''}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, '_blank');
  };

  const handleNativeShare = async () => {
    setLoading(true);
    const doc = build(); if (!doc) { setLoading(false); return; }
    try {
      const blob = doc.output('blob');
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
      } else if (navigator.share) {
        await navigator.share({ title: fileName, text: summary });
      } else {
        doc.save(fileName);
      }
    } catch (e) {
      if (e.name !== 'AbortError') doc.save(fileName);
    }
    setLoading(false);
    onClose();
  };

  const btn = (icon, label, color, onClick) => (
    <button onClick={onClick} disabled={loading} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 14,
      padding: '16px 8px', cursor: 'pointer', color: 'var(--ink)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 22, background: color + '18',
        display: 'grid', placeItems: 'center',
      }}>
        <Icon name={icon} size={22} color={color} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', fontFamily: 'var(--sans)' }}>{label}</span>
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{ background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: '16px 20px 36px', boxShadow: '0 -4px 32px rgba(0,0,0,0.14)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line-2)', margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', marginBottom: copied ? 8 : 16 }}>Compartilhar fatura</div>
        {copied && (
          <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '8px 14px', marginBottom: 12, fontSize: 13, color: '#065f46', fontWeight: 600 }}>
            ✓ Resumo copiado para a área de transferência
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          {btn('share',    'Compartilhar', 'var(--accent)',  handleNativeShare)}
          {btn('mail',     'E-mail',       '#3b5fc0',        handleEmail)}
          {btn('download', 'Salvar PDF',   'var(--ink-2)',   handleDownload)}
        </div>
        <button onClick={handleWhatsApp} style={{
          marginTop: 12, width: '100%', background: '#25D36618', border: '1px solid #25D36640',
          borderRadius: 14, padding: '14px', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600,
          color: '#128C47', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
        }}>
          <span style={{ fontSize: 20 }}>📱</span> Enviar resumo via WhatsApp
        </button>
        <button onClick={onClose} style={{
          marginTop: 10, width: '100%', background: 'none', border: 'none',
          fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer', padding: '10px',
        }}>Cancelar</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// FATURA DETALHE · pré-visualização do PDF
// ─────────────────────────────────────────────────────────────
const FaturaDetalheScreen = ({ id, setScreen, registros, proprietarios = [], cavalos = [], insumos = [], movimentacoes = [], faturaRef, faturasFechadas = [], addFaturaFechada, removeFaturaFechada, currentUser, procedimentos = [], servicos = [], deleteRegistro, updateRegistro, deleteProcedimento }) => {
  const [shareOpen, setShareOpen] = useState(false);
  const [editRegId, setEditRegId] = useState(null);
  const [editQtd, setEditQtd] = useState('');
  const empresa = getEmpresa();

  const findInsumo = (iid) => insumos.find(i => i.id === iid);
  const p = proprietarios.find(pr => pr.id === id);
  if (!p) return null;

  const hoje = new Date();
  const ref = faturaRef || { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
  const shareCount = (c) => Math.max(1, (c.proprietarioIds || []).length || 1);
  const faturaExistente = faturasFechadas.find(f => f.proprietarioId === id && f.ano === ref.ano && f.mes === ref.mes);

  const cavalosObj = cavalos.filter(c => (c.proprietarioIds || []).includes(id) || c.proprietarioId === id);
  const cavIds = new Set(cavalosObj.map(c => c.id));
  const myReg = registros.filter(r => {
    if (!cavIds.has(r.cavaloId)) return false;
    if (!r.data) return true;
    const d = new Date(r.data + 'T12:00:00');
    return d.getFullYear() === ref.ano && d.getMonth() + 1 === ref.mes;
  });

  const propMens = cavalosObj.map(c => ({ cav: c, ...calcMensalidadeProporcional(c, ref, movimentacoes), share: shareCount(c) }));
  const mensTotal = propMens.reduce((s, m) => s + m.valor / m.share, 0);
  const propPerfil = cavalosObj.map(c => ({ cav: c, ...calcPerfilMes(c, ref, movimentacoes, insumos), share: shareCount(c) })).filter(pp => pp.linhas.length > 0);
  const perfilTotal = propPerfil.reduce((s, pp) => s + pp.total / pp.share, 0);
  const insumosLinhas = myReg.map(r => {
    const ins = findInsumo(r.insumoId);
    const cav = cavalos.find(c => c.id === r.cavaloId);
    const share = shareCount(cav || {});
    const subtotal = (ins?.valorVenda ?? 0) * r.qtd;
    return { reg: r, ins, cav, subtotal, total: subtotal / share, share };
  });
  const insumosTotal = insumosLinhas.reduce((s, l) => s + l.total, 0);

  const procLinhas = procedimentos.filter(pr => {
    if (!cavIds.has(pr.cavaloId)) return false;
    if (!pr.data) return false;
    const d = new Date(pr.data + 'T12:00:00');
    return d.getFullYear() === ref.ano && d.getMonth() + 1 === ref.mes;
  }).map(pr => {
    const cav = cavalos.find(c => c.id === pr.cavaloId);
    const sv = servicos.find(s => s.id === pr.servicoId);
    const share = shareCount(cav || {});
    const nomeSv = pr.servicoId === '__exames_lab__' ? 'Exames laboratoriais' : (sv?.nome || 'Procedimento');
    return { proc: pr, cav, sv, nomeSv, share, total: (pr.total || 0) / share };
  });
  const procedimentosTotal = procLinhas.reduce((s, l) => s + l.total, 0);

  const total = mensTotal + perfilTotal + insumosTotal + procedimentosTotal;

  const mesNome = MESES[ref.mes - 1];
  const mesAno = `${String(ref.mes).padStart(2, '0')} / ${ref.ano}`;
  const proxMes = ref.mes === 12 ? 1 : ref.mes + 1;
  const proxAno = ref.mes === 12 ? ref.ano + 1 : ref.ano;

  const handleFecharFatura = () => {
    if (faturaExistente || !addFaturaFechada) return;
    const linhas = [
      ...propMens.map(m => ({ tipo: 'mensalidade', cavaloId: m.cav.id, cavaloNome: m.cav.nome, dias: m.dias, totalDias: m.total, parcial: m.parcial, valor: m.valor / m.share, valorBase: m.valorBase })),
      ...propPerfil.flatMap(pp => pp.linhas.map(l => {
        const shareValor = (l.valorMes || l.valor || 0) / pp.share;
        return { tipo: 'perfil', cavaloId: pp.cav.id, cavaloNome: pp.cav.nome, dias: pp.dias, ...l, valorMes: shareValor, valor: shareValor };
      })),
      ...insumosLinhas.map(l => ({ tipo: 'insumo', cavaloId: l.cav?.id, cavaloNome: l.cav?.nome, insumoId: l.ins?.id, insumoNome: l.ins?.nome, qtd: l.reg.qtd, valor: l.total })),
      ...procLinhas.map(l => ({ tipo: 'procedimento', cavaloId: l.cav?.id, cavaloNome: l.cav?.nome, servicoId: l.proc.servicoId, servicoNome: l.nomeSv, data: l.proc.data, valor: l.total })),
    ];
    addFaturaFechada({
      id: `ff_${id}_${ref.ano}_${ref.mes}`,
      proprietarioId: id, ano: ref.ano, mes: ref.mes,
      total, mensalidades: mensTotal, perfilNutricional: perfilTotal, insumosAvulsos: insumosTotal,
      procedimentosAvulsos: procedimentosTotal,
      linhas, fechadaPor: currentUser?.nome || '',
    });
  };

  const getPdf = () => gerarPdfFatura({ proprietario: p, ref, mesNome, propMens, propPerfil, insumosLinhas, procLinhas, mensTotal, perfilTotal, insumosTotal, procedimentosTotal, total, empresa });
  const fileName = nomePdfFatura(p, ref, mesNome);
  const BRL = (v) => 'R$ ' + (v || 0).toFixed(2).replace('.', ',');
  const summary = [
    `*Fatura ${mesNome} ${ref.ano} — ${p.nome}*`,
    `Haras Epona`,
    ``,
    ...propMens.map(m => `• ${m.cav.nome}: ${BRL(m.valor / m.share)}${m.parcial ? ` (${m.dias}/${m.total} dias)` : ''}${m.share > 1 ? ` (${m.share} proprietários)` : ''}`),
    ``,
    `Mensalidades: ${BRL(mensTotal)}`,
    perfilTotal > 0 ? `Óleo & suplementos: ${BRL(perfilTotal)}` : null,
    `Insumos avulsos: ${BRL(insumosTotal)}`,
    procedimentosTotal > 0 ? `Procedimentos: ${BRL(procedimentosTotal)}` : null,
    `*Total: ${BRL(total)}*`,
  ].filter(l => l !== null).join('\n');

  return (
    <div style={{ paddingBottom: 110, background: 'var(--soft)', minHeight: '100%' }}>
      <TopBar title="Fatura" subtitle={`${p.nome} · ${mesNome} ${ref.ano}`} onBack={() => setScreen('faturas')} action={
        <button onClick={() => setShareOpen(true)} style={{
          padding: '8px 12px', borderRadius: 10, background: 'var(--accent)', color: '#fff',
          border: 'none', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
          fontFamily: 'var(--sans)',
        }}>
          <Icon name="share" size={14} color="#fff" /> PDF
        </button>
      } />

      {/* "Folha" da fatura */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          background: '#fffdfa', border: '1px solid var(--line)', borderRadius: 8,
          padding: '24px 22px',
          boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
          fontFamily: 'var(--serif)',
        }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottom: '1.5px solid var(--ink)' }}>
            <img src="assets/logo-epona.png" style={{ width: 32, height: 32, objectFit: 'contain' }} alt="" />
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', letterSpacing: '0.06em' }}>{empresa.nome || 'HARAS EPONA'}</div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Demonstrativo mensal</div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right', fontFamily: 'var(--sans)' }}>
              <div style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Competência</div>
              <div style={{ fontSize: 11, color: 'var(--ink)', fontWeight: 600 }}>{mesAno}</div>
              {faturaExistente && <div style={{ fontSize: 9, color: 'var(--accent)', marginTop: 2, fontFamily: 'var(--sans)' }}>FECHADA</div>}
            </div>
          </div>

          {/* cliente */}
          <div style={{ padding: '14px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontFamily: 'var(--sans)' }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Proprietário</div>
              <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 3 }}>{p.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 1 }}>{p.email}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Vencimento</div>
              <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 3 }}>10 / {MESES[proxMes - 1].slice(0, 3).toLowerCase()} / {proxAno}</div>
            </div>
          </div>

          {/* tabela mensalidades */}
          <SectionTitle>Mensalidades · ração inclusa</SectionTitle>
          {propMens.map(m => (
            <TableRow
              key={m.cav.id}
              left={m.cav.nome}
              sub={`${m.cav.categoria} · ${m.cav.baia}${m.parcial ? ` · ${m.dias}/${m.total} dias` : ''}${m.share > 1 ? ` · ${m.share} proprietários` : ''}`}
              right={formatBRL(m.valor / m.share)}
            />
          ))}

          {propPerfil.length > 0 && <SectionTitle>Óleo & suplementos · perfil × dias</SectionTitle>}
          {propPerfil.flatMap(pp => pp.linhas.map(l => (
            <TableRow
              key={pp.cav.id + l.insumoId}
              left={`${l.nome} · ${pp.cav.nome}`}
              sub={`${l.qtdDia} ${l.unidade}/dia × ${l.dias} dias${pp.share > 1 ? ` · ${pp.share} proprietários` : ''}`}
              right={formatBRL((l.valorMes || 0) / pp.share)}
            />
          )))}

          <SectionTitle>Insumos avulsos</SectionTitle>
          {insumosLinhas.length === 0 && <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ink-3)', padding: '6px 0' }}>Sem insumos avulsos este mês.</div>}
          {insumosLinhas.map(l => {
            const editing = editRegId === l.reg.id;
            return (
              <div key={l.reg.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '5px 0', fontFamily: 'var(--sans)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                    {l.ins?.nome || '—'}
                    {l.ins?.injetavel && <span style={{ marginLeft: 6, fontSize: 8, padding: '1px 4px', borderRadius: 3, background: '#fef2e8', color: '#c0392b', fontWeight: 700, letterSpacing: '0.06em', verticalAlign: 'middle' }}>INJ</span>}
                    {l.ins?.descartaveis?.length > 0 && !l.ins?.injetavel && <span style={{ marginLeft: 6, fontSize: 8, padding: '1px 4px', borderRadius: 3, background: '#f0f4ff', color: '#3b4fc3', fontWeight: 700, letterSpacing: '0.06em', verticalAlign: 'middle' }}>DESC</span>}
                  </div>
                  {editing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <input
                        type="number" min="0.01" step="0.01"
                        value={editQtd}
                        onChange={e => setEditQtd(e.target.value)}
                        style={{ width: 64, border: '1px solid var(--accent)', borderRadius: 6, padding: '2px 6px', fontSize: 12, fontFamily: 'var(--sans)' }}
                        autoFocus
                      />
                      <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>{l.ins?.unidade || ''}</span>
                      <button onClick={() => { const q = parseFloat(editQtd); if (q > 0 && updateRegistro) updateRegistro(l.reg.id, { qtd: q }); setEditRegId(null); }} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--accent)', color: '#fff', border: 'none', fontFamily: 'var(--sans)', fontWeight: 600 }}>OK</button>
                      <button onClick={() => setEditRegId(null)} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--soft)', color: 'var(--ink-2)', border: '1px solid var(--line)', fontFamily: 'var(--sans)' }}>×</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>
                      {l.cav?.nome || '—'} ·{' '}
                      {!faturaExistente && updateRegistro
                        ? <span onClick={() => { setEditRegId(l.reg.id); setEditQtd(String(l.reg.qtd)); }} style={{ cursor: 'pointer', textDecoration: 'underline dotted', color: 'var(--accent)' }}>{l.reg.qtd} {l.ins?.unidade || ''}</span>
                        : `${l.reg.qtd} ${l.ins?.unidade || ''}`
                      }
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{formatBRL(l.total)}</span>
                  {!faturaExistente && deleteRegistro && (
                    <button onClick={() => { if (window.confirm(`Remover ${l.ins?.nome || 'item'}?`)) deleteRegistro(l.reg.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
                  )}
                </div>
              </div>
            );
          })}
          {!faturaExistente && (
            <button onClick={() => setScreen('registrar')} style={{ marginTop: 6, fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px dashed var(--accent)', borderRadius: 6, padding: '4px 10px', fontFamily: 'var(--sans)', cursor: 'pointer' }}>
              + Registrar insumo
            </button>
          )}

          {procLinhas.length > 0 && <SectionTitle>Procedimentos veterinários</SectionTitle>}
          {procLinhas.map(l => (
            <div key={l.proc.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '5px 0', fontFamily: 'var(--sans)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--ink)' }}>{l.nomeSv}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{l.cav?.nome || '—'} · {l.proc.data || ''}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{formatBRL(l.total)}</span>
                {!faturaExistente && deleteProcedimento && (
                  <button onClick={() => { if (window.confirm(`Remover ${l.nomeSv}?`)) deleteProcedimento(l.proc.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
                )}
              </div>
            </div>
          ))}
          {!faturaExistente && (
            <button onClick={() => setScreen('registrarProcedimento')} style={{ marginTop: 6, fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px dashed var(--accent)', borderRadius: 6, padding: '4px 10px', fontFamily: 'var(--sans)', cursor: 'pointer' }}>
              + Registrar procedimento
            </button>
          )}

          {/* totais */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)', fontFamily: 'var(--sans)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-2)', padding: '3px 0' }}>
              <span>Mensalidades</span><span>{formatBRL(mensTotal)}</span>
            </div>
            {perfilTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-2)', padding: '3px 0' }}>
                <span>Óleo & suplementos</span><span>{formatBRL(perfilTotal)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-2)', padding: '3px 0' }}>
              <span>Insumos avulsos</span><span>{formatBRL(insumosTotal)}</span>
            </div>
            {procedimentosTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-2)', padding: '3px 0' }}>
                <span>Procedimentos</span><span>{formatBRL(procedimentosTotal)}</span>
              </div>
            )}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '10px 0 0', borderTop: '1px solid var(--ink)', marginTop: 6,
            }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)' }}>Total</span>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{formatBRL(total)}</span>
            </div>
          </div>

          {/* Dados para pagamento */}
          {(empresa.pix || empresa.banco) && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 9, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Dados para pagamento</div>
              {empresa.pix && <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ink)' }}>PIX: {empresa.pix}</div>}
              {empresa.banco && <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ink)', marginTop: 2, whiteSpace: 'pre-line' }}>{empresa.banco}</div>}
            </div>
          )}

          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed var(--line)', fontFamily: 'var(--sans)', fontSize: 9, color: 'var(--ink-3)', textAlign: 'center', letterSpacing: '0.04em' }}>
            {[empresa.nome || 'Haras Epona', empresa.endereco, empresa.cidade, empresa.email].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>

      {/* Ações */}
      <div style={{ padding: '14px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={() => setShareOpen(true)} style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
          padding: '12px', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Icon name="share" size={16} /> Compartilhar
        </button>
        {faturaExistente ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              flex: 1, background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 12,
              padding: '12px', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
            }}>Fatura fechada ✓</button>
            {removeFaturaFechada && (
              <button onClick={() => { if (window.confirm('Desfazer fechamento da fatura? A cobrança voltará a ser calculada normalmente.')) removeFaturaFechada(faturaExistente.id); }} style={{
                background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 12,
                padding: '12px', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
                whiteSpace: 'nowrap',
              }}>
                <Icon name="x" size={16} /> Desfazer
              </button>
            )}
          </div>
        ) : (
          <button onClick={handleFecharFatura} style={{
            background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12,
            padding: '12px', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
          }}>Fechar fatura</button>
        )}
      </div>

      {shareOpen && (
        <ShareModal
          onClose={() => setShareOpen(false)}
          getPdf={getPdf}
          fileName={fileName}
          summary={summary}
          recipientEmail={p.email}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// DADOS DA EMPRESA
// ─────────────────────────────────────────────────────────────
const empresaInputStyle = {
  width: '100%', border: 'none', outline: 'none',
  fontSize: 14, color: 'var(--ink)', background: 'transparent',
  padding: '0 14px', fontFamily: 'var(--sans)',
};
const empresaTextareaStyle = {
  width: '100%', border: 'none', outline: 'none', resize: 'none',
  fontSize: 14, color: 'var(--ink)', background: 'transparent',
  padding: '8px 14px', fontFamily: 'var(--sans)',
};
const EmpresaRow = ({ label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', minHeight: 46, borderBottom: '1px solid var(--line)' }}>
    <div style={{ width: 120, paddingLeft: 14, fontSize: 12, color: 'var(--ink-3)', flexShrink: 0 }}>{label}</div>
    <div style={{ flex: 1 }}>{children}</div>
  </div>
);

const CadEmpresaScreen = ({ setScreen, empresaInfo = {}, onSave }) => {
  const DEFAULT = { nome: 'Haras Epona', cnpj: '', endereco: '', cidade: '', email: '', telefone: '', pix: '', banco: '' };
  const [data, setData] = useState({ ...DEFAULT, ...empresaInfo });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (onSave) onSave(data);
    saveEmpresa(data); // keep localStorage as fallback for offline
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const set = (key) => (e) => setData(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div style={{ paddingBottom: 110 }}>
      <TopBar title="Dados da empresa" subtitle="Aparecem nas faturas" onBack={() => setScreen('cadastros')} />
      <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px 6px', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Identificação</div>
          <EmpresaRow label="Nome"><input value={data.nome} onChange={set('nome')} placeholder="Haras Epona" style={empresaInputStyle} /></EmpresaRow>
          <EmpresaRow label="CNPJ"><input value={data.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" style={empresaInputStyle} /></EmpresaRow>
          <EmpresaRow label="Endereço"><input value={data.endereco} onChange={set('endereco')} placeholder="Rua das Flores, 123" style={empresaInputStyle} /></EmpresaRow>
          <EmpresaRow label="Cidade / UF"><input value={data.cidade} onChange={set('cidade')} placeholder="Itu / SP" style={empresaInputStyle} /></EmpresaRow>
          <EmpresaRow label="E-mail"><input value={data.email} onChange={set('email')} type="email" placeholder="contato@harasepona.com.br" style={empresaInputStyle} /></EmpresaRow>
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 46 }}>
            <div style={{ width: 120, paddingLeft: 14, fontSize: 12, color: 'var(--ink-3)', flexShrink: 0 }}>Telefone</div>
            <input value={data.telefone} onChange={set('telefone')} placeholder="(11) 98765-4321" style={empresaInputStyle} />
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px 6px', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dados para pagamento</div>
          <EmpresaRow label="Chave PIX"><input value={data.pix} onChange={set('pix')} placeholder="CPF, CNPJ, e-mail ou chave aleatória" style={empresaInputStyle} /></EmpresaRow>
          <div style={{ borderBottom: '1px solid var(--line)' }}>
            <div style={{ padding: '8px 14px 4px', fontSize: 12, color: 'var(--ink-3)' }}>Dados bancários</div>
            <textarea value={data.banco} onChange={set('banco')} placeholder={'Banco: Itaú\nAgência: 1234\nConta: 56789-0'} rows={3} style={empresaTextareaStyle} />
          </div>
        </div>

        <button onClick={handleSave} style={{
          width: '100%', borderRadius: 14, padding: '14px',
          fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600,
          background: saved ? 'var(--accent-soft)' : 'var(--accent)',
          color: saved ? 'var(--accent)' : '#fff',
          border: saved ? '1px solid var(--accent)' : 'none',
        }}>
          {saved ? 'Dados salvos ✓' : 'Salvar dados'}
        </button>
      </div>
    </div>
  );
};

const SectionTitle = ({ children }) => (
  <div style={{
    fontFamily: 'var(--sans)', fontSize: 9, color: 'var(--ink-3)',
    letterSpacing: '0.1em', textTransform: 'uppercase',
    marginTop: 14, marginBottom: 4, paddingBottom: 4, borderBottom: '1px solid var(--line)',
  }}>{children}</div>
);
const TableRow = ({ left, sub, right }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '5px 0', fontFamily: 'var(--sans)',
  }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: 'var(--ink)' }}>{left}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>}
    </div>
    <div style={{ fontSize: 12, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', marginLeft: 12 }}>{right}</div>
  </div>
);

export {
  fmtDataHora,
  TopBar, TabBar, OperacionalTabBar, HorseAvatar, DetailRow, NutritionRow, ActivityRow,
  HomeScreen, HistoricoScreen, CavalosScreen, CavaloDetalheScreen, EditarCavaloScreen, AddCavaloScreen,
  ProprietarioScreen,
  CadastrosScreen, CadProprietariosScreen, CadInsumosScreen, CadMensalidadesScreen, CadCavalosScreen, CadEmpresaScreen,
  FinanceiroScreen, FaturaDetalheScreen, ConsumoScreen,
};
