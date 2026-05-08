// app.jsx — Main App Epona shell
import React, { useState, useEffect } from 'react';
import { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakSelect } from './tweaks-panel';
import { AddInsumoScreen, EditarInsumoScreen } from './insumo-form';
import {
  HomeScreen, CavalosScreen, CavaloDetalheScreen, EditarCavaloScreen, AddCavaloScreen,
  ProprietarioScreen,
  CadastrosScreen, CadProprietariosScreen, CadInsumosScreen, CadMensalidadesScreen, CadCavalosScreen, CadEmpresaScreen,
  FaturasScreen, FaturaDetalheScreen,
  TabBar, OperacionalTabBar,
} from './screens';
import { AvisosScreen, MovimentacaoScreen } from './extra-screens';
import { RegistrarHub, RegistrarPorCavalo, RegistrarPorInsumo, RegistrarPorSetor } from './register';
import { LoginScreen, ROLE_COLORS } from './auth';
import { NutricionalScreen } from './nutricional';
import { FuncionariosScreen, FuncionarioDetalheScreen, PlannerScreen, MinhaContaScreen } from './funcionarios';
import { RegistrarPartoScreen, PartoDetalheScreen } from './partos';
import { GestacaoPartosScreen, EguaGestanteDetalheScreen } from './gestacao';
import { CadServicosScreen, RegistrarProcedimentoScreen } from './servicos';
import { seedDatabase } from './utils/seedDatabase';
import { supabase } from './utils/supabase';
import {
  fetchAll, dbInsert, dbUpdate, dbDelete,
  fromDbCavalo, fromDbProprietario, fromDbInsumo, fromDbServico, fromDbFuncionario,
  fromDbRegistro, fromDbProcedimento, fromDbParto, fromDbMovimentacao, fromDbEvento,
  fromDbFaturaFechada, toDbFaturaFechada,
  fromDbAviso, toDbAviso,
  fromDbConfiguracao, toDbConfiguracao,
  dbUpsert,
  toDbCavalo, toDbProprietario, toDbInsumo, toDbServico, toDbFuncionario,
  toDbRegistro, toDbProcedimento, toDbParto, toDbMovimentacao, toDbEvento,
  partialToDb, CAVALO_MAP, INSUMO_MAP, SERVICO_MAP, PARTO_MAP,
} from './utils/db';

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "defaultFlow": "cavalo"
}/*EDITMODE-END*/;

function AppEpona() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState('home');
  const [screen, setScreen] = useState('home');
  const [selected, setSelected] = useState(null);

  const [cavalos, setCavalos] = useState([]);
  const [proprietarios, setProprietarios] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [notas, setNotas] = useState({});
  const [eventos, setEventos] = useState([]);
  const [partos, setPartos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [procedimentos, setProcedimentos] = useState([]);
  const [faturasFechadas, setFaturasFechadas] = useState([]);
  const [empresaInfo, setEmpresaInfo] = useState({});
  const hoje = new Date();
  const [faturaRef, setFaturaRef] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 });

  const [novoCavaloPendente, setNovoCavaloPendente] = useState(null);
  const [pendingEntradaCavalo, setPendingEntradaCavalo] = useState(false);
  const [fluxo, setFluxo] = useState(null);
  const [tweaks, setTweak] = useTweaks(TWEAKS_DEFAULTS);

  // ── Carregamento inicial ──────────────────────────────────────
  const loadAllData = async () => {
 await loadAllData();
    
  } catch (dataError) {
    console.error('Erro ao carregar dados:', dataError);
  }
};
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);

        // 1. Restaurar usuário do localStorage
        const savedUserStr = localStorage.getItem('epona_user');
        let parsedUser = null;
        if (savedUserStr) {
          try {
            parsedUser = JSON.parse(savedUserStr);
          } catch (e) {
            localStorage.removeItem('epona_user');
          }
        }

        if (parsedUser) {
          setCurrentUser(parsedUser);
          const targetScreen = parsedUser.role === 'admin' ? 'home' : 'avisos';
          setScreen(targetScreen);
          setTab(0);

          // 2. Tenta carregar dados — SE FALHAR, não vai pro login
          try {
          const [cavalosData, propsData, insumosData, servicosData, funcData,
  registrosData, partosData, eventosData, movsData, procsData, ffData, avisosData, configResult,
] = await Promise.all([
              fetchAll('cavalos', fromDbCavalo),
fetchAll('proprietarios', fromDbProprietario),
fetchAll('insumos', fromDbInsumo),
fetchAll('servicos', fromDbServico),
fetchAll('funcionarios', fromDbFuncionario),
fetchAll('registros', fromDbRegistro),
fetchAll('partos', fromDbParto),
fetchAll('eventos', fromDbEvento),
fetchAll('movimentacoes', fromDbMovimentacao),
fetchAll('procedimentos', fromDbProcedimento),
fetchAll('faturas_fechadas', fromDbFaturaFechada),
fetchAll('avisos', fromDbAviso),
              supabase.from('configuracoes').select('*').eq('id', 'global').single().then(res => res).catch(() => ({ data: null }))
            ]);
            setCavalos(cavalosData || []);
            setProprietarios(propsData || []);
            setInsumos(insumosData || []);
            setServicos(servicosData || []);
            setFuncionarios(funcData || []);
            setRegistros(registrosData || []);
            setPartos(partosData || []);
            setEventos(eventosData || []);
            setMovimentacoes(movsData || []);
            setProcedimentos(procsData || []);
            setFaturasFechadas(ffData || []);
            setAvisos(avisosData || []);
            setEmpresaInfo(configResult?.data || {});
          } catch (dataError) {
            console.error('Erro ao carregar dados (mas mantendo login):', dataError);
            // Não faz nada — o usuário continua logado mesmo sem os dados
          }
        } else {
          setScreen('login');
        }
      } catch (error) {
        console.error('Erro grave:', error);
        setScreen('login');
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // ── Auth ──────────────────────────────────────────────────────
  const handleLogin = (user) => {
  setCurrentUser(user);
  localStorage.setItem('epona_user', JSON.stringify(user)); // ← ADICIONE ESTA LINHA
 await loadAllData();
    if (user.role === 'operacional') {
    setScreen('avisos'); setTab('avisos');
  } else {
    setScreen('home'); setTab('home');
  }
};

  const handleLogout = () => {
  setCurrentUser(null);
  localStorage.removeItem('epona_user'); // ← ADICIONE ESTA LINHA
  setScreen('home');
  setTab('home');
};

  // ── Registros ─────────────────────────────────────────────────
  const addRegistro = (r) => {
    setRegistros(prev => [...prev, r]);
    dbInsert('registros', toDbRegistro(r));
  };

  // ── Insumos ───────────────────────────────────────────────────
  const addInsumo = (ins) => {
    setInsumos(prev => [...prev, ins]);
    dbInsert('insumos', toDbInsumo(ins));
  };
  const updateInsumo = (id, data) => {
    setInsumos(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
    dbUpdate('insumos', id, partialToDb(data, INSUMO_MAP));
  };

  // ── Funcionários ──────────────────────────────────────────────
  const addFuncionario = (data) => {
    const newId = 'fn' + Date.now();
    const newFn = { id: newId, ...data };
    setFuncionarios(prev => [...prev, newFn]);
    dbInsert('funcionarios', toDbFuncionario(newFn));
  };
  const updateFuncionario = (id, data) => {
    setFuncionarios(prev => prev.map(f => f.id === id ? { ...f, ...data } : f));
    dbUpdate('funcionarios', id, data);
  };
  const deleteFuncionario = (id) => {
    setFuncionarios(prev => prev.filter(f => f.id !== id));
    dbDelete('funcionarios', id);
  };

  // ── Eventos ───────────────────────────────────────────────────
  const addEvento = (ev) => {
    const newEv = { id: 'ev' + Date.now(), ...ev };
    setEventos(prev => [...prev, newEv]);
    dbInsert('eventos', toDbEvento(newEv));
  };
  const removeEvento = (id) => {
    setEventos(prev => prev.filter(e => e.id !== id));
    dbDelete('eventos', id);
  };

  // ── Cavalos ───────────────────────────────────────────────────
  const addCavalo = (data) => {
    const newId = 'c_' + Date.now();
    const newCavalo = { id: newId, ...data };
    setCavalos(prev => [...prev, newCavalo]);
    dbInsert('cavalos', toDbCavalo(newCavalo));
    return newId;
  };
  const updateCavalo = (id, partialData) => {
    setCavalos(prev => prev.map(c => c.id === id ? { ...c, ...partialData } : c));
    dbUpdate('cavalos', id, partialToDb(partialData, CAVALO_MAP));
  };
  const deleteCavalo = (id) => {
    setCavalos(prev => prev.filter(c => c.id !== id));
    dbDelete('cavalos', id);
  };

  // ── Proprietários ─────────────────────────────────────────────
  const addProprietario = (nome) => {
    const maxNum = Math.max(0, ...proprietarios.map(p => parseInt(p.id.replace(/\D/g, '')) || 0));
    const newId = 'p' + (maxNum + 1);
    const novoProp = { id: newId, nome, telefone: '', email: '' };
    setProprietarios(prev => [...prev, novoProp]);
    dbInsert('proprietarios', toDbProprietario(novoProp));
    return newId;
  };
  const updateProprietario = (id, updatedData) => {
    setProprietarios(prev => prev.map(p => p.id === id ? { ...p, ...updatedData } : p));
    dbUpdate('proprietarios', id, updatedData);
  };

  // ── Partos ────────────────────────────────────────────────────
  const addParto = (data) => {
    const newId = 'pt_' + Date.now();
    const newParto = { id: newId, ...data };
    setPartos(prev => [...prev, newParto]);
    dbInsert('partos', toDbParto(newParto));
    return newId;
  };
  const updateParto = (id, data) => {
    setPartos(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    dbUpdate('partos', id, partialToDb(data, PARTO_MAP));
  };

  // ── Serviços e Procedimentos ──────────────────────────────────
  const addServico = (data) => {
    const newSv = { id: 'sv_' + Date.now(), ...data };
    setServicos(prev => [...prev, newSv]);
    dbInsert('servicos', toDbServico(newSv));
  };
  const updateServico = (id, data) => {
    setServicos(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    dbUpdate('servicos', id, partialToDb(data, SERVICO_MAP));
  };
  const addProcedimento = (data) => {
    const newProc = { id: 'proc_' + Date.now(), ...data };
    setProcedimentos(prev => [...prev, newProc]);
    dbInsert('procedimentos', toDbProcedimento(newProc));
  };

  // ── Avisos (in-memory) ────────────────────────────────────────
  const addAviso = (a) => {
    const novoAviso = { id: 'av_' + Date.now(), ...a };
    setAvisos(prev => [novoAviso, ...prev]);
    dbInsert('avisos', toDbAviso(novoAviso));
  };
  const removeAviso = (id) => {
    setAvisos(prev => prev.filter(a => a.id !== id));
    dbDelete('avisos', id);
  };

  // ── Movimentações ─────────────────────────────────────────────
  const addMovimentacao = (m) => {
    setMovimentacoes(prev => [...prev, m]);
    dbInsert('movimentacoes', toDbMovimentacao(m));
  };

  // ── Empresa info ─────────────────────────────────────────────
  const updateEmpresaInfo = (data) => {
    setEmpresaInfo(data);
    dbUpsert('configuracoes', toDbConfiguracao(data));
  };

  // ── Faturas fechadas ──────────────────────────────────────────
  const addFaturaFechada = (f) => {
    setFaturasFechadas(prev => [...prev.filter(x => !(x.proprietarioId === f.proprietarioId && x.ano === f.ano && x.mes === f.mes)), f]);
    dbInsert('faturas_fechadas', toDbFaturaFechada(f));
  };

  // ── Minha conta ───────────────────────────────────────────────
  const updateMinhaConta = (data) => {
    if (!currentUser) return;
    const fn = funcionarios.find(f => f.id === currentUser.id);
    if (fn) updateFuncionario(fn.id, { ...fn, ...data });
    setCurrentUser(prev => ({
      ...prev,
      nome: data.nome || prev.nome,
      iniciais: (data.nome || prev.nome).split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase(),
    }));
  };

  // ── Seed (dev only) ───────────────────────────────────────────
  const handleSeed = async () => {
    const log = (msg) => console.log('[Seed]', msg);
    const results = await seedDatabase({ proprietarios, cavalos, insumos, servicos, funcionarios }, log);
    const ok = results.filter(r => r.ok).length;
    const fail = results.filter(r => !r.ok);
    alert(fail.length === 0
      ? `Seed concluído! ${ok} tabelas inseridas.`
      : `Seed parcial: ${ok} ok, ${fail.map(r => r.label).join(', ')} com erro.`);
  };

  // ── Derivados ─────────────────────────────────────────────────
  const usuarios = funcionarios
    .filter(fn => fn.login && fn.senha)
    .map(fn => ({
      id: fn.id, nome: fn.nome, role: fn.funcao, senha: fn.senha,
      iniciais: fn.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(),
    }));

  // ── Tab → screen sync ─────────────────────────────────────────
  useEffect(() => {
    if (tab === 'home')      setScreen('home');
    if (tab === 'cavalos')   setScreen('cavalos');
    if (tab === 'cadastros') setScreen('cadastros');
    if (tab === 'faturas')   setScreen('faturas');
    if (tab === 'nutricional') setScreen('nutricional');
    if (tab === 'avisos')    setScreen('avisos');
    if (tab === 'equipe')    setScreen('planner');
    if (tab === 'partos')    setScreen('partos');
  }, [tab]);

  // ── Fluxo de registro ─────────────────────────────────────────
  useEffect(() => {
    if (screen === 'registrar' && !fluxo) setFluxo(tweaks.defaultFlow);
    if (screen !== 'registrar') setFluxo(null);
  }, [screen]);

  const goScreen = (s) => {
    if (currentUser?.role === 'operacional' && !['avisos', 'nutricional', 'planner', 'minhaConta'].includes(s)) return;
    if (currentUser?.role === 'vet' && ['faturas', 'faturaDetalhe', 'cadMensalidades'].includes(s)) return;
    if (currentUser?.role === 'operacional' && ['partos', 'registrarParto', 'partoDetalhe'].includes(s)) return;
    setScreen(s);
    if (s === 'home') setTab('home');
    if (s === 'cavalos' || s === 'addCavalo') setTab('cavalos');
    if (s === 'cadastros' || s.startsWith('cad') || s === 'addInsumo' || s === 'editarInsumo' || s === 'cadEmpresa') setTab('cadastros');
    if (s === 'faturas' || s === 'faturaDetalhe') setTab('faturas');
    if (s === 'avisos') setTab('avisos');
    if (s === 'nutricional') setTab('nutricional');
    if (s === 'planner' || s === 'funcionarios' || s === 'funcionarioDetalhe') setTab('equipe');
    if (s === 'partos' || s === 'registrarParto' || s === 'partoDetalhe' || s === 'eguaGestanteDetalhe') setTab('partos');
  };

  // ── Render ────────────────────────────────────────────────────
  let content;
  if (loading) {
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
        <img src="assets/logo-epona.png" style={{ width: 52, height: 52, objectFit: 'contain', opacity: 0.5 }} alt="" />
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink-3)' }}>Carregando…</div>
      </div>
    );
  } else if (!currentUser) {
    content = <LoginScreen onLogin={handleLogin} usuarios={usuarios} />;
  } else if (screen === 'home') content = <HomeScreen registros={registros} setScreen={goScreen} density={tweaks.density} avisos={avisos} currentUser={currentUser} onSeed={handleSeed} />;
  else if (screen === 'avisos') content = <AvisosScreen setScreen={goScreen} avisos={avisos} addAviso={addAviso} removeAviso={removeAviso} currentUser={currentUser} />;
  else if (screen === 'nutricional') content = <NutricionalScreen setScreen={goScreen} setSelected={setSelected} cavalos={cavalos} insumos={insumos} currentUser={currentUser} />;
  else if (screen === 'movimentacao') content = <MovimentacaoScreen setScreen={goScreen} addMovimentacao={addMovimentacao} addAtividade={addAviso} cavalos={cavalos} proprietarios={proprietarios} novoCavaloPendente={novoCavaloPendente} setNovoCavaloPendente={setNovoCavaloPendente} setPendingEntradaCavalo={setPendingEntradaCavalo} servicos={servicos} addProcedimento={addProcedimento} />;
  else if (screen === 'cavalos') content = <CavalosScreen setScreen={goScreen} setSelected={setSelected} density={tweaks.density} cavalos={cavalos} setCavalos={setCavalos} proprietarios={proprietarios} />;
  else if (screen === 'addCavalo') content = <AddCavaloScreen setScreen={goScreen} addCavalo={addCavalo} cavalos={cavalos} setNovoCavaloPendente={setNovoCavaloPendente} pendingEntradaCavalo={pendingEntradaCavalo} setPendingEntradaCavalo={setPendingEntradaCavalo} proprietarios={proprietarios} addProprietario={addProprietario} />;
  else if (screen === 'cavaloDetalhe') content = <CavaloDetalheScreen id={selected} setScreen={goScreen} registros={registros} setSelected={setSelected} cavalos={cavalos} updateCavalo={updateCavalo} deleteCavalo={deleteCavalo} proprietarios={proprietarios} />;
  else if (screen === 'editarCavalo') content = <EditarCavaloScreen id={selected} setScreen={goScreen} cavalos={cavalos} updateCavalo={updateCavalo} deleteCavalo={deleteCavalo} proprietarios={proprietarios} addAviso={addAviso} currentUser={currentUser} />;
  else if (screen === 'proprietarioDetalhe') content = <ProprietarioScreen id={selected} setScreen={goScreen} proprietarios={proprietarios} cavalos={cavalos} updateProprietario={updateProprietario} />;
  else if (screen === 'cadastros') content = <CadastrosScreen setScreen={goScreen} currentUser={currentUser} servicosCount={servicos.length} />;
  else if (screen === 'cadProprietarios') content = <CadProprietariosScreen setScreen={goScreen} setSelected={setSelected} proprietarios={proprietarios} cavalos={cavalos} addProprietario={addProprietario} />;
  else if (screen === 'cadCavalos') content = <CadCavalosScreen setScreen={goScreen} setSelected={setSelected} cavalos={cavalos} deleteCavalo={deleteCavalo} proprietarios={proprietarios} />;
  else if (screen === 'cadInsumos') content = <CadInsumosScreen setScreen={goScreen} setSelected={setSelected} insumos={insumos} addInsumo={addInsumo} updateInsumo={updateInsumo} />;
  else if (screen === 'addInsumo') content = <AddInsumoScreen setScreen={goScreen} addInsumo={addInsumo} insumos={insumos} />;
  else if (screen === 'editarInsumo') content = <EditarInsumoScreen id={selected} setScreen={goScreen} insumos={insumos} updateInsumo={updateInsumo} />;
  else if (screen === 'cadServicos') content = <CadServicosScreen setScreen={goScreen} servicos={servicos} addServico={addServico} updateServico={updateServico} setSelected={setSelected} />;
  else if (screen === 'registrarProcedimento') content = <RegistrarProcedimentoScreen setScreen={goScreen} servicos={servicos} cavalos={cavalos} insumos={insumos} addProcedimento={addProcedimento} />;
  else if (screen === 'cadMensalidades') content = <CadMensalidadesScreen setScreen={goScreen} />;
  else if (screen === 'cadEmpresa') content = <CadEmpresaScreen setScreen={goScreen} empresaInfo={empresaInfo} onSave={updateEmpresaInfo} />;
  else if (screen === 'faturas') content = <FaturasScreen setScreen={goScreen} setSelected={setSelected} registros={registros} insumos={insumos} proprietarios={proprietarios} cavalos={cavalos} movimentacoes={movimentacoes} faturaRef={faturaRef} setFaturaRef={setFaturaRef} faturasFechadas={faturasFechadas} />;
  else if (screen === 'faturaDetalhe') content = <FaturaDetalheScreen id={selected} setScreen={goScreen} registros={registros} proprietarios={proprietarios} cavalos={cavalos} insumos={insumos} movimentacoes={movimentacoes} faturaRef={faturaRef} faturasFechadas={faturasFechadas} addFaturaFechada={addFaturaFechada} currentUser={currentUser} empresaInfo={empresaInfo} />;
  else if (screen === 'planner') content = <PlannerScreen setScreen={goScreen} setSelected={setSelected} funcionarios={funcionarios} currentUser={currentUser} notas={notas} setNotas={setNotas} eventos={eventos} addEvento={addEvento} removeEvento={removeEvento} />;
  else if (screen === 'funcionarios') content = <FuncionariosScreen setScreen={goScreen} setSelected={setSelected} funcionarios={funcionarios} currentUser={currentUser} />;
  else if (screen === 'funcionarioDetalhe') content = <FuncionarioDetalheScreen id={selected} setScreen={goScreen} backTo={tab === 'equipe' ? 'planner' : 'funcionarios'} funcionarios={funcionarios} addFuncionario={addFuncionario} updateFuncionario={updateFuncionario} deleteFuncionario={deleteFuncionario} />;
  else if (screen === 'minhaConta') content = <MinhaContaScreen currentUser={currentUser} funcionarios={funcionarios} onSave={updateMinhaConta} onLogout={handleLogout} setScreen={goScreen} />;
  else if (screen === 'partos') content = <GestacaoPartosScreen setScreen={goScreen} setSelected={setSelected} partos={partos} cavalos={cavalos} proprietarios={proprietarios} />;
  else if (screen === 'registrarParto') content = <RegistrarPartoScreen setScreen={goScreen} setSelected={setSelected} cavalos={cavalos} proprietarios={proprietarios} insumos={insumos} addCavalo={addCavalo} addParto={addParto} updateCavalo={updateCavalo} />;
  else if (screen === 'partoDetalhe') content = <PartoDetalheScreen id={selected} setScreen={goScreen} partos={partos} updateParto={updateParto} cavalos={cavalos} proprietarios={proprietarios} insumos={insumos} />;
  else if (screen === 'eguaGestanteDetalhe') content = <EguaGestanteDetalheScreen id={selected} setScreen={goScreen} cavalos={cavalos} updateCavalo={updateCavalo} proprietarios={proprietarios} insumos={insumos} />;
  else if (screen === 'registrar') {
    if (!fluxo) content = <RegistrarHub setScreen={goScreen} setFluxo={setFluxo} />;
    else if (fluxo === 'cavalo') content = <RegistrarPorCavalo setScreen={goScreen} addRegistro={addRegistro} insumos={insumos} />;
    else if (fluxo === 'insumo') content = <RegistrarPorInsumo setScreen={goScreen} addRegistro={addRegistro} insumos={insumos} />;
    else if (fluxo === 'setor') content = <RegistrarPorSetor setScreen={goScreen} addRegistro={addRegistro} insumos={insumos} />;
  }

  const isOperacional = currentUser?.role === 'operacional';
  const showMainTabs = !loading && currentUser && !isOperacional && ['home','cavalos','cavaloDetalhe','editarCavalo','addCavalo','cadastros','cadProprietarios','cadCavalos','cadInsumos','cadMensalidades','cadServicos','cadEmpresa','addInsumo','editarInsumo','proprietarioDetalhe','faturas','faturaDetalhe','nutricional','planner','funcionarios','funcionarioDetalhe','minhaConta','partos','registrarParto','partoDetalhe','eguaGestanteDetalhe','registrarProcedimento'].includes(screen);
  const showOperacionalTabs = !loading && isOperacional && ['avisos','nutricional','planner','funcionarioDetalhe','minhaConta'].includes(screen);

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'var(--bg)',
        fontFamily: 'var(--sans)',
        display: 'flex', flexDirection: 'column',
        maxWidth: 480, margin: '0 auto',
      }}>
          {currentUser && !loading && (
            <div style={{
              display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
              padding: '4px 12px 4px',
              background: 'var(--bg)',
              borderBottom: '1px solid var(--line)',
              flexShrink: 0,
            }}>
              <button onClick={() => goScreen('minhaConta')} style={{
                background: 'var(--card)', borderRadius: 20,
                padding: '3px 10px 3px 5px',
                display: 'flex', alignItems: 'center', gap: 6,
                border: '1px solid var(--line)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                cursor: 'pointer',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 11,
                  background: ROLE_COLORS[currentUser.role], color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, letterSpacing: '-0.02em',
                }}>
                  {currentUser.iniciais}
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink)', fontWeight: 600 }}>
                  {currentUser.nome.split(' ')[0]}
                </span>
                <span style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1 }}>›</span>
              </button>
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
            {content}
          </div>
          {showMainTabs && <TabBar tab={tab} setTab={setTab} role={currentUser?.role} />}
          {showOperacionalTabs && <OperacionalTabBar tab={tab} setTab={setTab} />}
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Densidade da informação">
          <TweakRadio
            value={tweaks.density}
            onChange={(v) => setTweak('density', v)}
            options={[
              { value: 'compact', label: 'Compacta' },
              { value: 'comfortable', label: 'Confortável' },
            ]}
          />
        </TweakSection>
        <TweakSection title="Fluxo de registro padrão">
          <TweakSelect
            value={tweaks.defaultFlow}
            onChange={(v) => setTweak('defaultFlow', v)}
            options={[
              { value: 'cavalo', label: 'Por cavalo (1 cavalo → vários insumos)' },
              { value: 'insumo', label: 'Por insumo (1 insumo → vários cavalos)' },
              { value: 'setor', label: 'Por setor (lote rápido)' },
            ]}
          />
          <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
            Determina qual fluxo abre quando o tratador toca em "Registrar insumo".
          </div>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

export default AppEpona;
