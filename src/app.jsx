// app.jsx — Main App Epona shell
import React, { useState, useEffect } from 'react';
import { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakSelect } from './tweaks-panel';
import { AddInsumoScreen, EditarInsumoScreen } from './insumo-form';
import {
  HomeScreen, CavalosScreen, CavaloDetalheScreen, EditarCavaloScreen, AddCavaloScreen,
  ProprietarioScreen,
  CadastrosScreen, CadProprietariosScreen, CadInsumosScreen, CadMensalidadesScreen, CadCavalosScreen, CadEmpresaScreen,
  FaturasScreen, FaturaDetalheScreen,
  HistoricoScreen,
  TabBar, OperacionalTabBar,
} from './screens';
import { AvisosScreen, MovimentacaoScreen } from './extra-screens';
import { ListaComprasScreen } from './compras';
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
  fromDbListaCompra, toDbListaCompra,
  fromDbAtividade, toDbAtividade,
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
  const [compras, setCompras] = useState([]);
  const [atividades, setAtividades] = useState([]);
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
  try {
    const [cavalosData, propsData, insumosData, servicosData, funcData,
      registrosData, partosData, eventosData, movsData, procsData, ffData, avisosData, comprasData, atividadesData, configResult
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
      fetchAll('lista_compras', fromDbListaCompra),
      fetchAll('atividades', fromDbAtividade),
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
    setCompras(comprasData || []);
    setAtividades(atividadesData || []);
    setEmpresaInfo(fromDbConfiguracao(configResult?.data));
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
  }
};
  const validateScreen = (s, user) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'operacional') return ['avisos', 'nutricional', 'compras', 'planner', 'funcionarioDetalhe', 'minhaConta'].includes(s);
    if (user.role === 'vet') return !['faturas', 'faturaDetalhe', 'cadMensalidades'].includes(s);
    return true;
  };

   useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        const savedUserStr = localStorage.getItem('epona_user');
        let parsedUser = null;
        if (savedUserStr) {
          try {
            parsedUser = JSON.parse(savedUserStr);
          } catch (e) {
            localStorage.removeItem('epona_user');
          }
        }
        await loadAllData();
        if (parsedUser) {
          setCurrentUser(parsedUser);
          const savedSession = sessionStorage.getItem('epona_session');
          if (savedSession) {
            try {
              const { screen: savedScreen, tab: savedTab, fluxo: savedFluxo, selected: savedSelected } = JSON.parse(savedSession);
              if (savedTab && ['home','cavalos','cadastros','faturas','nutricional','avisos','equipe','partos','compras'].includes(savedTab)) setTab(savedTab);
              if (savedFluxo) setFluxo(savedFluxo);
              if (savedSelected) setSelected(savedSelected);
              if (savedScreen && validateScreen(savedScreen, parsedUser)) setScreen(savedScreen);
              else setScreen(parsedUser.role === 'operacional' ? 'avisos' : 'home');
            } catch (e) {
              const target = parsedUser.role === 'operacional' ? 'avisos' : 'home';
              setScreen(target); setTab('home');
            }
          } else {
            const target = parsedUser.role === 'operacional' ? 'avisos' : 'home';
            setScreen(target); setTab('home');
          }
        } else {
          sessionStorage.removeItem('epona_session');
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

  // ── Session persistence ──────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    try {
      sessionStorage.setItem('epona_session', JSON.stringify({ screen, tab, fluxo, selected }));
    } catch (e) {}
  }, [screen, tab, fluxo, selected, currentUser]);

  // ── Avisos periódicos ────────────────────────────────────
  useEffect(() => {
    if (currentUser && cavalos.length > 0) gerarAvisosPeriodicos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // ── Auth ──────────────────────────────────────────────────────
      const handleLogin = async (user) => {
    setCurrentUser(user);
    localStorage.setItem('epona_user', JSON.stringify(user));
    await loadAllData();
    if (user.role === 'operacional') {
      setScreen('avisos'); setTab('avisos');
    } else {
      setScreen('home'); setTab('home');
    }
  };
  const handleLogout = () => {
  setCurrentUser(null);
  localStorage.removeItem('epona_user');
  sessionStorage.removeItem('epona_session');
  setScreen('login');
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
    dbUpdate('proprietarios', id, toDbProprietario({ ...proprietarios.find(p => p.id === id), ...updatedData }));
  };
  const deleteProprietario = (id) => {
    setProprietarios(prev => prev.filter(p => p.id !== id));
    dbDelete('proprietarios', id);
    setCavalos(prev => prev.map(c => {
      if ((c.proprietarioIds || []).includes(id)) {
        return { ...c, proprietarioIds: c.proprietarioIds.filter(pid => pid !== id) };
      }
      if (c.proprietarioId === id) {
        return { ...c, proprietarioId: undefined };
      }
      return c;
    }));
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

  // ── Avisos ────────────────────────────────────────────────────
  const addAviso = (a) => {
    const novoAviso = { id: 'av_' + Date.now(), resolvido: false, respostas: [], ...a };
    setAvisos(prev => [novoAviso, ...prev]);
    dbInsert('avisos', toDbAviso(novoAviso));
  };
  const removeAviso = (id) => {
    setAvisos(prev => prev.filter(a => a.id !== id));
    dbDelete('avisos', id);
  };

  const getDiaSemana = () => new Date().getDay();
  const isSemanaPar = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const semana = Math.ceil((((d - new Date(d.getFullYear(), 0, 4)) / 86400000) + 1) / 7);
    return semana % 2 === 0;
  };
  const gerarAvisosPeriodicos = () => {
    const hoje = new Date().toISOString().split('T')[0];
    const diaSemana = getDiaSemana();
    const semanaPar = isSemanaPar();
    for (const c of cavalos) {
      if (!c.nutricao?.periodicos) continue;
      for (const p of c.nutricao.periodicos) {
        if (p.diaSemana !== diaSemana) continue;
        if (p.frequencia === 'quinzenal' && !semanaPar) continue;
        const ins = insumos.find(i => i.id === p.insumoId);
        const texto = `📅 ${ins?.nome || p.insumoId} para ${c.nome} (${p.qtd} ${ins?.unidade || 'un'})`;
        const jaExiste = avisos.some(a => a.texto === texto && a.data_entrada === hoje);
        if (!jaExiste) {
          const novoAviso = {
            id: 'av_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            autor: 'Sistema', avatar: '⚙️', tempo: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), texto,
            urgente: false, resolvido: false, resolvidoPor: '',
            tipo: 'periodico', cavaloId: c.id,
            data_entrada: hoje, respostas: [],
          };
          setAvisos(prev => [novoAviso, ...prev]);
          dbInsert('avisos', toDbAviso(novoAviso));
        }
      }
    }
  };
  const resolverAviso = (id) => {
    const nome = currentUser?.nome || 'Usuário';
    setAvisos(prev => prev.map(a => a.id === id ? { ...a, urgente: false, resolvido: true, resolvidoPor: nome } : a));
    dbUpdate('avisos', id, { urgente: false, resolvido: true, resolvido_por: nome });
  };
  const addResposta = (avisoId, texto) => {
    if (!texto.trim()) return;
    const autor = currentUser?.nome || 'Usuário';
    const avatar = currentUser?.iniciais || 'US';
    const reply = { autor, avatar, texto: texto.trim(), tempo: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
    setAvisos(prev => prev.map(a => a.id === avisoId ? { ...a, respostas: [...(a.respostas || []), reply] } : a));
    const aviso = avisos.find(a => a.id === avisoId);
    if (aviso) {
      const novasRespostas = [...(aviso.respostas || []), reply];
      dbUpdate('avisos', avisoId, { respostas: novasRespostas });
    }
  };
  const removeFaturaFechada = (id) => {
    setFaturasFechadas(prev => prev.filter(f => f.id !== id));
    dbDelete('faturas_fechadas', id);
  };

  // ── Lista de Compras ──────────────────────────────────────────
  const addCompra = (c) => {
    const nova = { ...c, id: c.id || 'c_' + Date.now() };
    setCompras(prev => [nova, ...prev]);
    dbInsert('lista_compras', toDbListaCompra(nova));
  };
  const deleteCompra = (id) => {
    setCompras(prev => prev.filter(c => c.id !== id));
    dbDelete('lista_compras', id);
  };
  const toggleCompra = (id) => {
    let toggled;
    setCompras(prev => {
      toggled = prev.find(c => c.id === id);
      return prev.map(c => c.id === id ? { ...c, comprado: !c.comprado } : c);
    });
    if (toggled) dbUpdate('lista_compras', id, { comprado: !toggled.comprado });
  };
  const removeAtividade = (id) => {
    setAtividades(prev => prev.filter(a => a.id !== id));
    dbDelete('atividades', id);
  };

  // ── Atividades (feed da Home) ──────────────────────────────
  const addAtividade = (a) => {
    const nova = { id: a.id || 'at_' + Date.now(), ...a };
    setAtividades(prev => [nova, ...prev]);
    dbInsert('atividades', toDbAtividade(nova));
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
    if (!currentUser) return;
    if (tab === 'home' && !['historico'].includes(screen)) setScreen('home');
    if (tab === 'cavalos' && !['addCavalo', 'cavaloDetalhe', 'editarCavalo'].includes(screen)) setScreen('cavalos');
    if (tab === 'cadastros' && !['cadProprietarios','cadCavalos','cadInsumos','cadMensalidades','cadServicos','cadEmpresa','addInsumo','editarInsumo'].includes(screen)) setScreen('cadastros');
    if (tab === 'faturas' && !['faturaDetalhe'].includes(screen)) setScreen('faturas');
    if (tab === 'nutricional') setScreen('nutricional');
    if (tab === 'avisos')    setScreen('avisos');
    if (tab === 'equipe')    setScreen('planner');
    if (tab === 'partos' && !['registrarParto', 'partoDetalhe', 'eguaGestanteDetalhe'].includes(screen)) setScreen('partos');
    if (tab === 'compras') setScreen('compras');
  }, [tab, currentUser]);

  // ── Fluxo de registro ─────────────────────────────────────────
  useEffect(() => {
    if (screen === 'registrar' && !fluxo) setFluxo(tweaks.defaultFlow);
    if (screen !== 'registrar') setFluxo(null);
  }, [screen]);

  const goScreen = (s) => {
    if (currentUser?.role === 'operacional' && !['avisos', 'nutricional', 'compras', 'planner', 'minhaConta'].includes(s)) return;
    if (currentUser?.role === 'vet' && ['faturas', 'faturaDetalhe', 'cadMensalidades'].includes(s)) return;
    if (currentUser?.role === 'operacional' && ['partos', 'registrarParto', 'partoDetalhe'].includes(s)) return;
    setScreen(s);
    if (s === 'home') setTab('home');
    if (s === 'cavalos' || s === 'addCavalo') setTab('cavalos');
    if (s === 'cadastros' || s.startsWith('cad') || s === 'addInsumo' || s === 'editarInsumo' || s === 'cadEmpresa') setTab('cadastros');
    if (s === 'faturas' || s === 'faturaDetalhe') setTab('faturas');
    if (s === 'avisos') setTab('avisos');
    if (s === 'nutricional') setTab('nutricional');
    if (s === 'compras') setTab('compras');
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
  } else if (screen === 'home') content = <HomeScreen registros={registros} setScreen={goScreen} density={tweaks.density} avisos={avisos} cavalos={cavalos} compras={compras} atividades={atividades} currentUser={currentUser} onSeed={handleSeed} removeAviso={removeAviso} removeAtividade={removeAtividade} />;
  else if (screen === 'avisos') content = <AvisosScreen setScreen={goScreen} avisos={avisos} addAviso={addAviso} removeAviso={removeAviso} resolverAviso={resolverAviso} addResposta={addResposta} currentUser={currentUser} />;
  else if (screen === 'nutricional') content = <NutricionalScreen setScreen={goScreen} setSelected={setSelected} cavalos={cavalos} insumos={insumos} currentUser={currentUser} updateCavalo={updateCavalo} addAviso={addAviso} removeAviso={removeAviso} />;
  else if (screen === 'compras') content = <ListaComprasScreen compras={compras} addCompra={addCompra} deleteCompra={deleteCompra} toggleCompra={toggleCompra} currentUser={currentUser} />;
  else if (screen === 'movimentacao') content = <MovimentacaoScreen setScreen={goScreen} addMovimentacao={addMovimentacao} addAviso={addAviso} addAtividade={addAtividade} cavalos={cavalos} proprietarios={proprietarios} novoCavaloPendente={novoCavaloPendente} setNovoCavaloPendente={setNovoCavaloPendente} setPendingEntradaCavalo={setPendingEntradaCavalo} servicos={servicos} addProcedimento={addProcedimento} updateCavalo={updateCavalo} insumos={insumos} addRegistro={addRegistro} />;
  else if (screen === 'cavalos') content = <CavalosScreen setScreen={goScreen} setSelected={setSelected} density={tweaks.density} cavalos={cavalos} setCavalos={setCavalos} proprietarios={proprietarios} />;
  else if (screen === 'addCavalo') content = <AddCavaloScreen setScreen={goScreen} addCavalo={addCavalo} cavalos={cavalos} setNovoCavaloPendente={setNovoCavaloPendente} pendingEntradaCavalo={pendingEntradaCavalo} setPendingEntradaCavalo={setPendingEntradaCavalo} proprietarios={proprietarios} addProprietario={addProprietario} />;
  else if (screen === 'cavaloDetalhe') content = <CavaloDetalheScreen id={selected} setScreen={goScreen} registros={registros} setSelected={setSelected} cavalos={cavalos} updateCavalo={updateCavalo} deleteCavalo={deleteCavalo} proprietarios={proprietarios} />;
  else if (screen === 'editarCavalo') content = <EditarCavaloScreen id={selected} setScreen={goScreen} cavalos={cavalos} updateCavalo={updateCavalo} deleteCavalo={deleteCavalo} proprietarios={proprietarios} addAviso={addAviso} addAtividade={addAtividade} currentUser={currentUser} />;
  else if (screen === 'proprietarioDetalhe') content = <ProprietarioScreen id={selected} setScreen={goScreen} proprietarios={proprietarios} cavalos={cavalos} updateProprietario={updateProprietario} />;
  else if (screen === 'cadastros') content = <CadastrosScreen setScreen={goScreen} currentUser={currentUser} cavalosCount={cavalos.length} proprietariosCount={proprietarios.length} insumosCount={insumos.length} servicosCount={servicos.length} />;
  else if (screen === 'cadProprietarios') content = <CadProprietariosScreen setScreen={goScreen} setSelected={setSelected} proprietarios={proprietarios} cavalos={cavalos} addProprietario={addProprietario} deleteProprietario={deleteProprietario} />;
  else if (screen === 'cadCavalos') content = <CadCavalosScreen setScreen={goScreen} setSelected={setSelected} cavalos={cavalos} deleteCavalo={deleteCavalo} proprietarios={proprietarios} />;
  else if (screen === 'cadInsumos') content = <CadInsumosScreen setScreen={goScreen} setSelected={setSelected} insumos={insumos} addInsumo={addInsumo} updateInsumo={updateInsumo} />;
  else if (screen === 'addInsumo') content = <AddInsumoScreen setScreen={goScreen} addInsumo={addInsumo} insumos={insumos} />;
  else if (screen === 'editarInsumo') content = <EditarInsumoScreen id={selected} setScreen={goScreen} insumos={insumos} updateInsumo={updateInsumo} />;
  else if (screen === 'cadServicos') content = <CadServicosScreen setScreen={goScreen} servicos={servicos} addServico={addServico} updateServico={updateServico} setSelected={setSelected} />;
  else if (screen === 'registrarProcedimento') content = <RegistrarProcedimentoScreen setScreen={goScreen} servicos={servicos} cavalos={cavalos} insumos={insumos} addProcedimento={addProcedimento} />;
  else if (screen === 'cadMensalidades') content = <CadMensalidadesScreen setScreen={goScreen} />;
  else if (screen === 'cadEmpresa') content = <CadEmpresaScreen setScreen={goScreen} empresaInfo={empresaInfo} onSave={updateEmpresaInfo} />;
  else if (screen === 'faturas') content = <FaturasScreen setScreen={goScreen} setSelected={setSelected} registros={registros} insumos={insumos} proprietarios={proprietarios} cavalos={cavalos} movimentacoes={movimentacoes} faturaRef={faturaRef} setFaturaRef={setFaturaRef} faturasFechadas={faturasFechadas} />;
  else if (screen === 'faturaDetalhe') content = <FaturaDetalheScreen id={selected} setScreen={goScreen} registros={registros} proprietarios={proprietarios} cavalos={cavalos} insumos={insumos} movimentacoes={movimentacoes} faturaRef={faturaRef} faturasFechadas={faturasFechadas} addFaturaFechada={addFaturaFechada} removeFaturaFechada={removeFaturaFechada} currentUser={currentUser} empresaInfo={empresaInfo} />;
  else if (screen === 'planner') content = <PlannerScreen setScreen={goScreen} setSelected={setSelected} funcionarios={funcionarios} currentUser={currentUser} notas={notas} setNotas={setNotas} eventos={eventos} addEvento={addEvento} removeEvento={removeEvento} />;
  else if (screen === 'funcionarios') content = <FuncionariosScreen setScreen={goScreen} setSelected={setSelected} funcionarios={funcionarios} currentUser={currentUser} />;
  else if (screen === 'funcionarioDetalhe') content = <FuncionarioDetalheScreen id={selected} setScreen={goScreen} backTo={tab === 'equipe' ? 'planner' : 'funcionarios'} funcionarios={funcionarios} addFuncionario={addFuncionario} updateFuncionario={updateFuncionario} deleteFuncionario={deleteFuncionario} />;
  else if (screen === 'minhaConta') content = <MinhaContaScreen currentUser={currentUser} funcionarios={funcionarios} onSave={updateMinhaConta} onLogout={handleLogout} setScreen={goScreen} />;
  else if (screen === 'partos') content = <GestacaoPartosScreen setScreen={goScreen} setSelected={setSelected} partos={partos} cavalos={cavalos} proprietarios={proprietarios} />;
  else if (screen === 'registrarParto') content = <RegistrarPartoScreen setScreen={goScreen} setSelected={setSelected} cavalos={cavalos} proprietarios={proprietarios} insumos={insumos} addCavalo={addCavalo} addParto={addParto} updateCavalo={updateCavalo} />;
  else if (screen === 'partoDetalhe') content = <PartoDetalheScreen id={selected} setScreen={goScreen} partos={partos} updateParto={updateParto} cavalos={cavalos} proprietarios={proprietarios} insumos={insumos} />;
  else if (screen === 'eguaGestanteDetalhe') content = <EguaGestanteDetalheScreen id={selected} setScreen={goScreen} cavalos={cavalos} updateCavalo={updateCavalo} proprietarios={proprietarios} insumos={insumos} />;
  else if (screen === 'historico') content = <HistoricoScreen atividades={atividades} setScreen={goScreen} currentUser={currentUser} removeAtividade={removeAtividade} />;
  else if (screen === 'registrar') {
    if (!fluxo) content = <RegistrarHub setScreen={goScreen} setFluxo={setFluxo} />;
    else if (fluxo === 'cavalo') content = <RegistrarPorCavalo setScreen={goScreen} addRegistro={addRegistro} addAtividade={addAtividade} insumos={insumos} cavalos={cavalos} />;
    else if (fluxo === 'insumo') content = <RegistrarPorInsumo setScreen={goScreen} addRegistro={addRegistro} addAtividade={addAtividade} insumos={insumos} cavalos={cavalos} />;
    else if (fluxo === 'setor') content = <RegistrarPorSetor setScreen={goScreen} addRegistro={addRegistro} addAtividade={addAtividade} insumos={insumos} cavalos={cavalos} />;
  }

  const isOperacional = currentUser?.role === 'operacional';
  const showMainTabs = !loading && currentUser && !isOperacional && ['home','cavalos','cavaloDetalhe','editarCavalo','addCavalo','cadastros','cadProprietarios','cadCavalos','cadInsumos','cadMensalidades','cadServicos','cadEmpresa','addInsumo','editarInsumo','proprietarioDetalhe','faturas','faturaDetalhe','nutricional','compras','planner','funcionarios','funcionarioDetalhe','minhaConta','partos','registrarParto','partoDetalhe','eguaGestanteDetalhe','registrarProcedimento','historico'].includes(screen);
  const showOperacionalTabs = !loading && isOperacional && ['avisos','nutricional','compras','planner','funcionarioDetalhe','minhaConta','historico'].includes(screen);

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
