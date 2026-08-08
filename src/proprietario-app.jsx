// proprietario-app.jsx — Shell read-only do proprietário.
//
// Filosofia: reutilizar as telas que já existem (FaturaDetalheScreen,
// CavaloDetalheScreen, EguaGestanteDetalheScreen etc.) apenas escondendo
// os controles de edição via role='proprietario' quando necessário.
//
// Este shell só monta as telas de visualização, filtradas por
// cavalo.proprietarioIds.includes(currentUser.id).
import React, { useState, useMemo } from 'react';
import { Icon } from './icons';
import { formatBRL } from './data';
import { TopBar, FaturaDetalheScreen, CavaloDetalheScreen, calcFaturaProprietario } from './screens';
import { EguaGestanteDetalheScreen } from './gestacao';
import { PartoDetalheScreen } from './partos';
import { VeterinariaScreen } from './veterinaria';
import { NutricionalScreen } from './nutricional';
import { SwitcherContas } from './multiSessionUi';

// ─────────────────────────────────────────────────────────────
// Filtro central: só cavalos que o proprietário logado possui.
// ─────────────────────────────────────────────────────────────
function meusCavalos(cavalos, propId) {
  return (cavalos || []).filter(c =>
    (c.proprietarioIds || []).includes(propId) || c.proprietarioId === propId
  );
}

// ─────────────────────────────────────────────────────────────
// Home — resumo do mês corrente
// ─────────────────────────────────────────────────────────────
function ProprietarioHome({
  currentUser, cavalos, faturaTotal, avisos, atividades, registros,
  setScreen, setTab,
}) {
  const meus = meusCavalos(cavalos, currentUser.id);
  const meusIds = new Set(meus.map(c => c.id));
  const presentes = meus.filter(c => c.presente !== false);
  const nome = (currentUser.nome || '').split(/\s+/)[0];
  const h = new Date().getHours();
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const dataFmt = (() => {
    const d = new Date();
    const dias = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]}`;
  })();

  // Stats do dia — só do escopo do proprietário
  const hojeStr = new Date().toLocaleDateString('sv-SE');
  const avisosMeus = (avisos || []).filter(a => !a.cavaloId || meusIds.has(a.cavaloId));
  const atividadesMinhas = (atividades || []).filter(a => !a.cavaloId || meusIds.has(a.cavaloId));
  const registrosMeus = (registros || []).filter(r => meusIds.has(r.cavaloId));
  const avisosHoje = avisosMeus.filter(a =>
    a.data_entrada === hojeStr || ((a.urgente || a.tipo === 'gta_pendente') && !a.resolvido)
  ).length;
  const registrosHoje = registrosMeus.filter(r => r.data === hojeStr).length;

  const ultimosAvisos = [...avisosMeus]
    .sort((a, b) => {
      const aUrg = a.urgente && !a.resolvido ? 0 : 1;
      const bUrg = b.urgente && !b.resolvido ? 0 : 1;
      if (aUrg !== bUrg) return aUrg - bUrg;
      return ((b.data_entrada || '') + 'T' + (b.tempo || '')).localeCompare((a.data_entrada || '') + 'T' + (a.tempo || ''));
    })
    .slice(0, 4);
  const atividadesRecentes = [...atividadesMinhas]
    .sort((a, b) => ((b.data || '') + 'T' + (b.hora || '')).localeCompare((a.data || '') + 'T' + (a.hora || '')))
    .slice(0, 5);

  const goToTab = (t, s) => { setTab(t); setScreen(s); };

  return (
    <div style={{ padding: '20px 20px 24px' }}>
      {/* Saudação + data */}
      <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {dataFmt}
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: 22 }}>
        {saudacao}, {nome}.
      </div>

      {/* Stats do dia */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Avisos hoje', value: avisosHoje },
          { label: 'Registros hoje', value: registrosHoje },
          { label: 'Cavalos no haras', value: presentes.length, onClick: () => goToTab('cavalos', 'proprietario-cavalos') },
        ].map(s => (
          <button key={s.label} onClick={s.onClick} disabled={!s.onClick} style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
            padding: '12px 12px', textAlign: 'left', color: 'var(--ink)', cursor: s.onClick ? 'pointer' : 'default',
          }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* CTAs grandes: Cuidados + Nutrição */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <button onClick={() => goToTab('cuidados', 'proprietario-cuidados')} style={{
          background: 'linear-gradient(135deg, #0f766e, #0d5c56)', color: '#fff',
          border: 'none', borderRadius: 16, padding: '18px 14px',
          display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left',
          boxShadow: '0 6px 16px rgba(15,118,110,0.22)', cursor: 'pointer',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.18)',
            display: 'grid', placeItems: 'center',
          }}>
            <Icon name="stethoscope" size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.1 }}>Cuidados Veterinários</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>Vacinação, exames, relatórios…</div>
          </div>
        </button>
        <button onClick={() => goToTab('nutricao', 'proprietario-nutricao')} style={{
          background: 'linear-gradient(135deg, #b45309, #854d0e)', color: '#fff',
          border: 'none', borderRadius: 16, padding: '18px 14px',
          display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left',
          boxShadow: '0 6px 16px rgba(180,83,9,0.22)', cursor: 'pointer',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.18)',
            display: 'grid', placeItems: 'center',
          }}>
            <Icon name="wheat" size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.1 }}>Nutrição</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>Ração, suplementos por piquete</div>
          </div>
        </button>
      </div>

      {/* Mural de avisos */}
      {ultimosAvisos.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 400, margin: 0, color: 'var(--ink)' }}>Mural de avisos</h2>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
            {ultimosAvisos.map((a, i) => (
              <div key={a.id} style={{
                padding: '10px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                display: 'flex', gap: 10,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 28, flexShrink: 0,
                  background: a.urgente ? '#fef2e8' : 'var(--soft)',
                  display: 'grid', placeItems: 'center', fontSize: 14,
                }}>{a.avatar || '📌'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{a.autor || 'Sistema'}</span>
                    <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>{a.tempo}</span>
                    {a.urgente && !a.resolvido && (
                      <span style={{ fontSize: 9, background: '#c0392b', color: '#fff', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>URGENTE</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.35 }}>{a.texto}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Atividade recente */}
      {atividadesRecentes.length > 0 && (
        <>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 400, margin: '0 0 8px', color: 'var(--ink)' }}>Atividade recente</h2>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
            {atividadesRecentes.map((a, i) => {
              const cav = a.cavaloId ? cavalos.find(c => c.id === a.cavaloId) : null;
              return (
                <div key={a.id} style={{
                  padding: '10px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                  display: 'flex', gap: 10,
                }}>
                  <div style={{ width: 6, background: 'var(--accent)', borderRadius: 3, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', lineHeight: 1.35 }}>
                      {(cav?.nome ? cav.nome + ': ' : '') + (a.texto || '')}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>
                      {a.data ? new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                      {a.hora ? ` · ${a.hora}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Fatura Hoje — proporcional até hoje, muda amanhã */}
      <button onClick={() => goToTab('fatura', 'proprietario-fatura')} style={{
        width: '100%', textAlign: 'left', border: '1px solid var(--line)',
        background: 'var(--card)', color: 'var(--ink)',
        borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'var(--accent-soft)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name="doc" size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Fatura hoje</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)', marginTop: 1 }}>{formatBRL(faturaTotal)}</div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>Proporcional até hoje — amanhã o valor é outro</div>
        </div>
        <Icon name="chevron-right" size={16} color="var(--ink-3)" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TabBar read-only para o proprietário
// ─────────────────────────────────────────────────────────────
function TabBar({ tab, setTab, setScreen }) {
  const abas = [
    { id: 'home', label: 'Início', icon: 'home' },
    { id: 'cavalos', label: 'Animais', icon: 'horse' },
    { id: 'cuidados', label: 'Cuidados', icon: 'stethoscope' },
    { id: 'nutricao', label: 'Nutrição', icon: 'wheat' },
    { id: 'fatura', label: 'Fatura', icon: 'doc' },
    { id: 'conta', label: 'Conta', icon: 'user' },
  ];
  return (
    <div style={{
      background: 'var(--bg)', borderTop: '1px solid var(--line)',
      paddingTop: 8, paddingBottom: 28,
      display: 'grid', gridTemplateColumns: `repeat(${abas.length}, 1fr)`, gap: 0,
    }}>
      {abas.map(t => (
        <button
          key={t.id}
          onClick={() => {
            setTab(t.id);
            if (t.id === 'home') setScreen('proprietario-home');
            if (t.id === 'cavalos') setScreen('proprietario-cavalos');
            if (t.id === 'cuidados') setScreen('proprietario-cuidados');
            if (t.id === 'nutricao') setScreen('proprietario-nutricao');
            if (t.id === 'fatura') setScreen('proprietario-fatura');
            if (t.id === 'conta') setScreen('proprietario-conta');
          }}
          style={{
            background: 'none', border: 'none', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 2, padding: '6px 0',
            color: tab === t.id ? '#7c2d8c' : 'var(--ink-3)',
            fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <Icon name={t.icon} size={20} />
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tela: Lista dos meus cavalos
// ─────────────────────────────────────────────────────────────
function ProprietarioCavalos({ currentUser, cavalos, setScreen, setSelected }) {
  const meus = meusCavalos(cavalos, currentUser.id);
  return (
    <div>
      <TopBar title="Meus animais" subtitle={`${meus.length} ${meus.length === 1 ? 'animal' : 'animais'}`} />
      <div style={{ padding: '14px 20px 0' }}>
        {meus.map(c => (
          <button key={c.id} onClick={() => { setSelected(c.id); setScreen('proprietario-cavalo'); }} style={{
            width: '100%', textAlign: 'left', background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '14px 16px', marginBottom: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ink)',
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🐴</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{c.nome}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                {c.categoria}{c.baia ? ` · ${c.baia}` : ''}
                {c.presente === false && ' · fora do haras'}
              </div>
            </div>
            <Icon name="chevron-right" size={16} color="var(--ink-3)" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tela: Conta (dados + trocar senha + sair)
// ─────────────────────────────────────────────────────────────
function ProprietarioConta({ currentUser, proprietarioAtual, onLogout, sessions = [], activeKey, onSwitchSession, onAddAccount, onRemoveSession }) {
  const p = proprietarioAtual || {};
  const confirmarSair = () => {
    if (window.confirm('Deseja realmente sair da sua conta?')) onLogout();
  };
  return (
    <div>
      <TopBar title="Minha conta" />
      <div style={{ padding: '14px 20px 24px' }}>
        {sessions.length > 0 && (
          <SwitcherContas
            sessions={sessions}
            activeKey={activeKey}
            currentUser={currentUser}
            onSwitch={onSwitchSession}
            onAddAccount={onAddAccount}
            onRemoveSession={onRemoveSession}
          />
        )}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 4 }}>Nome</div>
          <div style={{ fontSize: 15, color: 'var(--ink)', marginBottom: 12 }}>{p.nomeCompleto || currentUser.nome}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 4 }}>Login</div>
          <div style={{ fontSize: 15, color: 'var(--ink)', marginBottom: 12 }}>{currentUser.login}</div>
          {p.email && <>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 4 }}>Email</div>
            <div style={{ fontSize: 15, color: 'var(--ink)', marginBottom: 12 }}>{p.email}</div>
          </>}
          {p.telefone && <>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 4 }}>Telefone</div>
            <div style={{ fontSize: 15, color: 'var(--ink)' }}>{p.telefone}</div>
          </>}
        </div>

        <button onClick={confirmarSair} style={{
          width: '100%', background: '#fee2e2', border: '1px solid #dc2626', color: '#dc2626',
          borderRadius: 14, padding: '14px', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>Sair da conta</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shell principal — decide qual tela renderizar
// ─────────────────────────────────────────────────────────────
export function ProprietarioApp({
  currentUser, proprietarios, cavalos, registros, procedimentos,
  servicos, insumos, movimentacoes, custosFixos, faturasFechadas, partos,
  faturaRef, setFaturaRef, empresaInfo,
  avisos = [], atividades = [],
  nutricaoOrdem = [],
  // Bundle de dados veterinários pra alimentar a aba "Cuidados". Repassados
  // do app.jsx pra evitar 40 props sem sentido no shell.
  vetData = {},
  sessions = [], activeKey, onSwitchSession, onAddAccount, onRemoveSession,
  onLogout,
}) {
  const [screen, setScreen] = useState('proprietario-home');
  const [tab, setTab] = useState('home');
  const [selected, setSelected] = useState(null);
  // faturaRefLocal: mês em visualização na tela de fatura do proprietário.
  // Independente do faturaRef global (usado pelo admin) — proprietário navega
  // meses só localmente sem afetar o resto do app.
  const hojeInicio = new Date();
  const [faturaRefLocal, setFaturaRefLocal] = useState({ ano: hojeInicio.getFullYear(), mes: hojeInicio.getMonth() + 1 });

  const proprietarioAtual = proprietarios.find(p => p.id === currentUser.id) || {};
  const meus = useMemo(() => meusCavalos(cavalos, currentUser.id), [cavalos, currentUser.id]);
  const meusIds = new Set(meus.map(c => c.id));

  // Filtra tudo pelo proprietário: cada tela reutilizada recebe só o subconjunto.
  const meusRegistros = useMemo(() => registros.filter(r => meusIds.has(r.cavaloId)), [registros, meusIds]);
  const meusProcedimentos = useMemo(() => procedimentos.filter(p => meusIds.has(p.cavaloId)), [procedimentos, meusIds]);
  const meusMovimentacoes = useMemo(() => movimentacoes.filter(m => meusIds.has(m.cavaloId)), [movimentacoes, meusIds]);
  const meusPartos = useMemo(() => partos.filter(p => meusIds.has(p.eguaId) || meusIds.has(p.potroId)), [partos, meusIds]);

  // Total da fatura do mês corrente pra mostrar no home.
  const hoje = new Date();
  const refAtual = faturaRef || { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
  const faturaFechadaAtual = faturasFechadas.find(f =>
    f.proprietarioId === currentUser.id && f.ano === refAtual.ano && f.mes === refAtual.mes
  );

  // Total da fatura em tempo real — usa a MESMA função do FaturaDetalheScreen,
  // não uma estimativa. Isso garante que o valor no home bate com o valor no
  // detalhamento (incluindo mensalidade proporcional, pagarOCusto, perfil
  // nutricional, custo fixo rateado, etc.).
  const faturaTotalEstimada = useMemo(() => {
    if (faturaFechadaAtual) return faturaFechadaAtual.total || 0;
    const r = calcFaturaProprietario(currentUser.id, refAtual, {
      cavalos, registros, procedimentos, servicos, insumos, movimentacoes, custosFixos,
    });
    return r.total || 0;
  }, [faturaFechadaAtual, currentUser.id, cavalos, registros, procedimentos, servicos, insumos, movimentacoes, custosFixos, refAtual]);

  const goHome = () => { setScreen('proprietario-home'); setTab('home'); };

  let content;
  if (screen === 'proprietario-home') {
    content = (
      <ProprietarioHome
        currentUser={currentUser}
        cavalos={cavalos}
        faturaTotal={faturaTotalEstimada}
        avisos={avisos}
        atividades={atividades}
        registros={registros}
        setScreen={setScreen}
        setTab={setTab}
      />
    );
  } else if (screen === 'proprietario-nutricao') {
    // Nutrição read-only, filtrada pros cavalos do proprietário.
    // NutricionalScreen já checa currentUser.role — pra 'proprietario' o
    // podeEditar interno é false. Mesmo assim, passamos os handlers como
    // null pra garantir que nenhuma mutação escape.
    content = (
      <NutricionalScreen
        setScreen={setScreen} setSelected={setSelected}
        cavalos={meus} insumos={insumos}
        currentUser={{ ...currentUser, role: 'proprietario' }}
        updateCavalo={null} addAviso={null} removeAviso={null}
        nutricaoOrdem={nutricaoOrdem} updateNutricaoOrdem={null}
      />
    );
  } else if (screen === 'proprietario-cavalos') {
    content = (
      <ProprietarioCavalos
        currentUser={currentUser}
        cavalos={cavalos}
        setScreen={setScreen}
        setSelected={setSelected}
      />
    );
  } else if (screen === 'proprietario-cavalo') {
    // Verifica ownership antes de renderizar — impede acesso direto a cavalo alheio
    if (!meusIds.has(selected)) {
      content = <NaoAutorizado onBack={() => setScreen('proprietario-cavalos')} />;
    } else {
      const cav = cavalos.find(c => c.id === selected);
      const isEguaGestante = cav && (cav.categoria === 'Gestante' || (cav.categorias || []).includes('Gestante'));
      const shellSetScreen = (s) => {
        // Redireciona telas de edição pra visualização
        if (s === 'cavalos') return setScreen('proprietario-cavalos');
        if (s === 'editarCavalo') return; // proprietário não edita
        if (s === 'partos') return setScreen('proprietario-cavalos');
        if (s === 'partoDetalhe') return setScreen('proprietario-parto');
        if (s === 'eguaGestanteDetalhe') return setScreen('proprietario-egua');
        setScreen(s);
      };
      if (isEguaGestante) {
        content = (
          <EguaGestanteDetalheScreen
            id={selected} setScreen={shellSetScreen} setSelected={setSelected}
            cavalos={cavalos} proprietarios={proprietarios}
            updateCavalo={null} /* read-only: null esconde botões de edição */
            insumos={insumos}
            addAviso={null} addAtividade={null}
            currentUser={{ ...currentUser, role: 'proprietario' }}
            partos={meusPartos}
          />
        );
      } else {
        content = (
          <CavaloDetalheScreen
            id={selected} setScreen={shellSetScreen} setSelected={setSelected}
            registros={meusRegistros} procedimentos={meusProcedimentos}
            cavalos={cavalos} servicos={servicos}
            updateCavalo={null} deleteCavalo={null} /* null → botões editar/excluir escondidos */
            proprietarios={proprietarios}
            deleteRegistro={null} updateRegistro={null} deleteProcedimento={null}
            insumos={insumos}
          />
        );
      }
    }
  } else if (screen === 'proprietario-fatura') {
    content = (
      <FaturaDetalheScreen
        id={currentUser.id} setScreen={goHome} setSelected={setSelected}
        registros={meusRegistros} proprietarios={proprietarios} cavalos={cavalos}
        insumos={insumos} movimentacoes={meusMovimentacoes}
        faturaRef={faturaRefLocal} setFaturaRef={setFaturaRefLocal}
        faturasFechadas={faturasFechadas}
        addFaturaFechada={null} removeFaturaFechada={null}
        currentUser={{ ...currentUser, role: 'proprietario' }}
        procedimentos={meusProcedimentos} servicos={servicos}
        deleteRegistro={null} updateRegistro={null} deleteProcedimento={null}
        custosFixos={custosFixos} setMesRegistroDestino={null}
      />
    );
  } else if (screen === 'proprietario-parto') {
    if (!meusPartos.find(p => p.id === selected)) {
      content = <NaoAutorizado onBack={() => setScreen('proprietario-cuidados')} />;
    } else {
      content = (
        <PartoDetalheScreen
          id={selected}
          setScreen={(s) => {
            if (s === 'partos') return setScreen('proprietario-cuidados');
            if (s === 'cavaloDetalhe') return setScreen('proprietario-cavalo');
            if (s === 'eguaGestanteDetalhe') return setScreen('proprietario-egua');
            setScreen(s);
          }}
          partos={meusPartos}
          updateParto={null} deleteParto={null}
          cavalos={cavalos} updateCavalo={null} deleteCavalo={null}
          proprietarios={proprietarios} insumos={insumos}
        />
      );
    }
  } else if (screen === 'proprietario-egua') {
    if (!meusIds.has(selected)) {
      content = <NaoAutorizado onBack={() => setScreen('proprietario-cavalos')} />;
    } else {
      // Translator idêntico ao do hub: EguaGestante chama setScreen com nomes
      // do admin ('partos' pro back, 'partoDetalhe' pra abrir parto,
      // 'cavaloDetalhe' pra abrir potro). Traduzimos pra rotas do shell.
      content = (
        <EguaGestanteDetalheScreen
          id={selected}
          setScreen={(s) => {
            if (s === 'partos') return setScreen('proprietario-cuidados');
            if (s === 'partoDetalhe') return setScreen('proprietario-parto');
            if (s === 'cavaloDetalhe') return setScreen('proprietario-cavalo');
            if (s === 'eguaGestanteDetalhe') return setScreen('proprietario-egua');
            setScreen(s);
          }}
          setSelected={setSelected}
          cavalos={cavalos} proprietarios={proprietarios}
          updateCavalo={null} /* read-only: null esconde botões de edição */
          insumos={insumos}
          addAviso={null} addAtividade={null}
          currentUser={{ ...currentUser, role: 'proprietario' }}
          partos={meusPartos}
        />
      );
    }
  } else if (screen === 'proprietario-cuidados') {
    // Hub veterinário só com áreas permitidas ao proprietário — sem cronograma,
    // sem emergências. Todos os handlers de escrita ficam null (read-only).
    // O VeterinariaScreen filtra internamente pelos cavalos que recebe, então
    // basta passar `meus` (só os do proprietário) — todo o resto (agendas,
    // gestantes, etc.) fica automaticamente filtrado.
    const anotacoesDosMeus = (vetData.anotacoesClinicas || []).filter(a => meusIds.has(a.cavaloId));
    const medicoesDosMeus = (vetData.medicoes || []).filter(m => meusIds.has(m.cavaloId));
    const examesDosMeus = (vetData.exames || []).filter(e => meusIds.has(e.cavaloId));
    const reproDosMeus = (vetData.registrosReproducao || []).filter(r => meusIds.has(r.eguaId));
    const vacinacoesDosMeus = (vetData.vacinacoesAnimais || []).filter(v => meusIds.has(v.cavaloId));
    const vermifugacoesDosMeus = (vetData.vermifugacoesAnimais || []).filter(v => meusIds.has(v.cavaloId));
    const opgsDosMeus = (vetData.opgs || []).filter(o => meusIds.has(o.cavaloId));

    // O hub e suas sub-telas foram feitos pro admin — chamam setScreen com
    // nomes como 'eguaGestanteDetalhe', 'partoDetalhe', 'cavaloDetalhe' etc.
    // Traduzimos pra rotas do shell do proprietário. Sem esse translator, o
    // clique numa égua deixava a tela em branco (nenhum case matchava).
    const hubSetScreen = (s) => {
      if (s === 'eguaGestanteDetalhe') return setScreen('proprietario-egua');
      if (s === 'partoDetalhe') return setScreen('proprietario-parto');
      if (s === 'cavaloDetalhe') return setScreen('proprietario-cavalo');
      if (s === 'editarCavalo') return; // proprietário não edita
      if (s === 'registrarParto') return; // idem
      // Tudo mais mantém o comportamento default do hub.
      setScreen(s);
    };

    content = (
      <VeterinariaScreen
        setScreen={hubSetScreen} setSelected={setSelected}
        partos={meusPartos} cavalos={meus}
        proprietarios={proprietarios} movimentacoes={meusMovimentacoes}
        insumos={insumos} servicos={servicos}
        registros={meusRegistros} procedimentos={meusProcedimentos}
        empresaInfo={empresaInfo || {}}
        currentUser={{ ...currentUser, role: 'proprietario' }}
        // Todos os add/update/delete = null → sub-telas escondem UI de escrita
        addRegistro={null} addAtividade={null} addProcedimento={null} addAviso={null}
        deleteRegistro={null} deleteProcedimento={null}
        protocolosVacinacao={vetData.protocolosVacinacao || []} vacinacoesAnimais={vacinacoesDosMeus}
        addProtocoloVacinacao={null} updateProtocoloVacinacao={null} deleteProtocoloVacinacao={null}
        upsertVacinacaoAnimal={null}
        protocolosVermifugacao={vetData.protocolosVermifugacao || []} vermifugacoesAnimais={vermifugacoesDosMeus}
        opgs={opgsDosMeus}
        addProtocoloVermifugacao={null} updateProtocoloVermifugacao={null} deleteProtocoloVermifugacao={null}
        addVermifugacaoAnimal={null} addOpg={null} updateOpg={null} deleteOpg={null}
        medicoes={medicoesDosMeus}
        addMedicao={null} updateMedicao={null} deleteMedicao={null}
        anotacoesClinicas={anotacoesDosMeus}
        addAnotacaoClinica={null} updateAnotacaoClinica={null} deleteAnotacaoClinica={null}
        exames={examesDosMeus}
        uploadExame={null} deleteExame={null}
        registrosReproducao={reproDosMeus}
        addRegistroReproducao={null} deleteRegistroReproducao={null}
        // Emergências: passamos arrays vazios pois a seção não é permitida
        emergencias={[]} emergMedicacoes={[]} emergAgendas={[]}
        emergParametros={[]} emergNotas={[]} emergExames={[]}
        frascosAbertos={[]}
        progProgramas={vetData.progProgramas || []} progAplicacoes={vetData.progAplicacoes || []}
        // sectionsAllowed limita o hub — sem cronograma, sem emergências
        sectionsAllowed={['anotacoes', 'reproducao', 'gestacao', 'vacinacao', 'vermifugacao', 'desenvolvimento', 'exames', 'relatorio']}
      />
    );
  } else if (screen === 'proprietario-conta') {
    content = (
      <ProprietarioConta
        currentUser={currentUser}
        proprietarioAtual={proprietarioAtual}
        onLogout={onLogout}
        sessions={sessions}
        activeKey={activeKey}
        onSwitchSession={onSwitchSession}
        onAddAccount={onAddAccount}
        onRemoveSession={onRemoveSession}
      />
    );
  }

  return (
    // Flex column: content rola, TabBar fica fixa no rodapé — nunca cobre
    // botões do form (foi o bug do Sair ficando atrás da barra).
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {content}
      </div>
      <div style={{ flexShrink: 0 }}>
        <TabBar tab={tab} setTab={setTab} setScreen={setScreen} />
      </div>
    </div>
  );
}

function NaoAutorizado({ onBack }) {
  return (
    <div>
      <TopBar title="Acesso negado" onBack={onBack} />
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-3)' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
        <div style={{ fontSize: 14 }}>Este animal não pertence a você.</div>
      </div>
    </div>
  );
}
