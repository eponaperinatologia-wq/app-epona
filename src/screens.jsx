// screens.jsx — All app screens for App Epona
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Icon, CATEGORIA_ICONS } from './icons';
import { getEmpresa, saveEmpresa } from './utils/empresa';
import { gerarPdfFatura, nomePdfFatura } from './utils/pdfFatura';
import {
  CAVALOS, PROPRIETARIOS, INSUMOS, CATEGORIAS_CAVALO, CATEGORIAS_INSUMOS,
  AVISOS, ATIVIDADES, CATEGORIAS_SERVICOS, SERVICOS,
  getCavalo, getInsumo, getCategoria, idade, formatBRL,
  consumoDiarioCavalo,
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

const calcMensalidadeProporcional = (cav, ref, movimentacoes) => {
  const { dias, total, parcial } = calcDias(cav, ref, movimentacoes);
  const valorBase = cav.mensalidade || 0;
  return { dias, total, parcial, valor: total > 0 ? valorBase * (dias / total) : 0, valorBase };
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
    linhas.push({ insumoId: ins.id, nome: ins.nome, qtdDia: s.qtdDia, unidade: ins.unidade, valorUnit: ins.valorVenda, valorDia: ins.valorVenda * s.qtdDia, valorMes: ins.valorVenda * s.qtdDia * dias, tipoLinha: 'nutricional', diasUsados: dias });
  }
  for (const p of (cav.nutricao.periodicos || [])) {
    const ins = findIns(p.insumoId);
    if (!ins) continue;
    const doses = calcDosesPeriodico(p, ref);
    if (doses === 0) continue;
    linhas.push({ insumoId: ins.id, nome: ins.nome + ' (periódico)', qtd: p.qtd, unidade: ins.unidade, valorUnit: ins.valorVenda, valorMes: ins.valorVenda * p.qtd * doses, tipoLinha: 'periodico', doses });
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
    { id: 'partos', label: 'Gestação', icon: 'heart' },
    { id: 'cadastros', label: 'Cadastros', icon: 'package' },
    { id: 'nutricional', label: 'Nutrição', icon: 'wheat' },
    { id: 'faturas', label: 'Faturas', icon: 'doc' },
    { id: 'equipe', label: 'Equipe', icon: 'users' },
  ];
  const vetTabs = [
    { id: 'home', label: 'Hoje', icon: 'home' },
    { id: 'cavalos', label: 'Cavalos', icon: 'horse' },
    { id: 'partos', label: 'Gestação', icon: 'heart' },
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
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.baia.toLowerCase().includes(search.toLowerCase())
  );
  const filteredAusentes = ausentes.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.baia.toLowerCase().includes(search.toLowerCase())
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
  const meusRegistros = registros.filter(r => r.cavaloId === id);
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
          <DetailRow label="Nascimento" value={new Date(c.nascimento).toLocaleDateString('pt-BR')} />
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
              valor={formatBRL(c.nutricao.oleoMlDia * getInsumo('i_oleo').valorVenda) + ' / dia'}
            />
          )}
          {(c.nutricao?.suplementos || []).map(s => {
            const ins = getInsumo(s.insumoId);
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
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 400, margin: 0, color: 'var(--ink)' }}>Insumos avulsos · maio</h2>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{meusRegistros.length} registros</span>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          {meusRegistros.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              Sem registros este mês.
            </div>
          )}
          {meusRegistros.map((r, i) => {
            const ins = getInsumo(r.insumoId);
            const cat = getCategoria(ins.categoria);
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
                    <button onClick={() => { if (win
