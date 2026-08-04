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
import { TopBar, FaturaDetalheScreen, CavaloDetalheScreen } from './screens';
import { EguaGestanteDetalheScreen } from './gestacao';
import { PartoDetalheScreen } from './partos';

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
function ProprietarioHome({ currentUser, cavalos, faturaTotal, setScreen, setSelected }) {
  const meus = meusCavalos(cavalos, currentUser.id);
  const presentes = meus.filter(c => c.presente !== false);
  const nome = (currentUser.nome || '').split(/\s+/)[0];
  const saudacao = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div style={{ padding: '20px 20px 24px' }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 4 }}>
        {saudacao}, {nome}.
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>
        {presentes.length} {presentes.length === 1 ? 'animal' : 'animais'} no haras
      </div>

      {/* Meus animais — foco principal */}
      <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, margin: '0 4px 10px' }}>
        Meus animais
      </div>
      {meus.length === 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 20, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, marginBottom: 12 }}>
          Nenhum animal registrado.
        </div>
      )}
      {meus.map(c => (
        <button key={c.id} onClick={() => { setSelected(c.id); setScreen('proprietario-cavalo'); }} style={{
          width: '100%', textAlign: 'left', background: 'var(--card)', border: '1px solid var(--line)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 8, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ink)',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: c.presente === false ? '#e5e7eb' : 'var(--soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
          }}>🐴</div>
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

      {/* Fatura do mês — resumo discreto no fim, com link pro detalhamento */}
      <button onClick={() => setScreen('proprietario-fatura')} style={{
        width: '100%', textAlign: 'left', border: '1px solid var(--line)',
        background: 'var(--card)', color: 'var(--ink)',
        borderRadius: 14, padding: '14px 16px', marginTop: 20, cursor: 'pointer',
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
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Fatura do mês</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)', marginTop: 1 }}>{formatBRL(faturaTotal)}</div>
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
            if (t.id === 'fatura') setScreen('proprietario-fatura');
            if (t.id === 'conta') setScreen('proprietario-conta');
          }}
          style={{
            background: 'none', border: 'none', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3, padding: '6px 0',
            color: tab === t.id ? '#7c2d8c' : 'var(--ink-3)',
            fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <Icon name={t.icon} size={22} />
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
function ProprietarioConta({ currentUser, proprietarioAtual, onLogout }) {
  const p = proprietarioAtual || {};
  const confirmarSair = () => {
    if (window.confirm('Deseja realmente sair da sua conta?')) onLogout();
  };
  return (
    <div>
      <TopBar title="Minha conta" />
      <div style={{ padding: '14px 20px 24px' }}>
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
  faturaRef, setFaturaRef,
  onLogout,
}) {
  const [screen, setScreen] = useState('proprietario-home');
  const [tab, setTab] = useState('home');
  const [selected, setSelected] = useState(null);

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

  // Estima o total da fatura em tempo real. Reutiliza a fórmula "grosseira"
  // do FaturaDetalheScreen mas de forma simplificada (o cálculo completo
  // acontece dentro da própria tela quando o proprietário clica).
  const faturaTotalEstimada = useMemo(() => {
    if (faturaFechadaAtual) return faturaFechadaAtual.total || 0;
    // Só marcamos a estimativa como "insumos avulsos + procedimentos do mês"
    // pra evitar duplicar toda a lógica aqui. A tela de fatura tem o total
    // exato — este número é só um "aviso" no home.
    const dentroDoMes = (data) => {
      if (!data) return false;
      const d = new Date(data + 'T12:00:00');
      return d.getFullYear() === refAtual.ano && d.getMonth() + 1 === refAtual.mes;
    };
    let total = 0;
    meus.filter(c => c.presente !== false).forEach(c => {
      total += Number(c.mensalidade) || 0;
    });
    meusRegistros.filter(r => dentroDoMes(r.data)).forEach(r => {
      const ins = insumos.find(i => i.id === r.insumoId);
      total += (Number(ins?.valorVenda) || 0) * (Number(r.qtd) || 0);
    });
    meusProcedimentos.filter(p => dentroDoMes(p.data)).forEach(p => {
      total += Number(p.total) || 0;
    });
    return total;
  }, [faturaFechadaAtual, meus, meusRegistros, meusProcedimentos, insumos, refAtual]);

  const goHome = () => { setScreen('proprietario-home'); setTab('home'); };

  let content;
  if (screen === 'proprietario-home') {
    content = (
      <ProprietarioHome
        currentUser={currentUser}
        cavalos={cavalos}
        faturaTotal={faturaTotalEstimada}
        setScreen={setScreen}
        setSelected={setSelected}
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
            updateCavalo={() => {}} /* read-only */
            insumos={insumos}
            addAviso={() => {}} addAtividade={() => {}}
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
            updateCavalo={() => {}} deleteCavalo={() => {}}
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
        faturaRef={refAtual} faturasFechadas={faturasFechadas}
        addFaturaFechada={null} removeFaturaFechada={null}
        currentUser={{ ...currentUser, role: 'proprietario' }}
        procedimentos={meusProcedimentos} servicos={servicos}
        deleteRegistro={null} updateRegistro={null} deleteProcedimento={null}
        custosFixos={custosFixos} setMesRegistroDestino={null}
      />
    );
  } else if (screen === 'proprietario-parto') {
    if (!meusPartos.find(p => p.id === selected)) {
      content = <NaoAutorizado onBack={() => setScreen('proprietario-home')} />;
    } else {
      content = (
        <PartoDetalheScreen
          id={selected}
          setScreen={(s) => s === 'partos' ? setScreen('proprietario-home') : setScreen(s)}
          partos={meusPartos}
          updateParto={() => {}} deleteParto={() => {}}
          cavalos={cavalos} updateCavalo={() => {}} deleteCavalo={() => {}}
          proprietarios={proprietarios} insumos={insumos}
        />
      );
    }
  } else if (screen === 'proprietario-egua') {
    if (!meusIds.has(selected)) {
      content = <NaoAutorizado onBack={() => setScreen('proprietario-cavalos')} />;
    } else {
      content = (
        <EguaGestanteDetalheScreen
          id={selected}
          setScreen={(s) => {
            if (s === 'partos') return setScreen('proprietario-cavalos');
            if (s === 'partoDetalhe') return setScreen('proprietario-parto');
            setScreen(s);
          }}
          setSelected={setSelected}
          cavalos={cavalos} proprietarios={proprietarios}
          updateCavalo={() => {}}
          insumos={insumos}
          addAviso={() => {}} addAtividade={() => {}}
          currentUser={{ ...currentUser, role: 'proprietario' }}
          partos={meusPartos}
        />
      );
    }
  } else if (screen === 'proprietario-conta') {
    content = (
      <ProprietarioConta
        currentUser={currentUser}
        proprietarioAtual={proprietarioAtual}
        onLogout={onLogout}
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
