// app.jsx — Main App Epona shell
import React, { useState, useEffect, useRef } from 'react';
import { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakSelect } from './tweaks-panel';
import { AddInsumoScreen, EditarInsumoScreen } from './insumo-form';
import {
  HomeScreen, CavalosScreen, CavaloDetalheScreen, EditarCavaloScreen, AddCavaloScreen,
  ProprietarioScreen,
  CadastrosScreen, CadProprietariosScreen, CadInsumosScreen, CadMensalidadesScreen, CadCavalosScreen, CadEmpresaScreen,
  FinanceiroScreen, FaturaDetalheScreen, ConsumoScreen,
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
  fetchAll, dbInsert, dbInsertIgnore, dbUpdate, dbDelete,
  fromDbCavalo, fromDbProprietario, fromDbInsumo, fromDbServico, fromDbFuncionario,
  fromDbRegistro, fromDbProcedimento, fromDbParto, fromDbMovimentacao, fromDbEvento,
  fromDbFaturaFechada, toDbFaturaFechada,
  fromDbLancamento, toDbLancamento,
  fromDbRecorrencia, toDbRecorrencia,
  fromDbEstoqueCompra, toDbEstoqueCompra,
  fromDbAviso, toDbAviso,
  fromDbListaCompra, toDbListaCompra,
  fromDbAtividade, toDbAtividade,
  fromDbConfiguracao, toDbConfiguracao,
  dbUpsert,
  toDbCavalo, toDbProprietario, toDbInsumo, toDbServico, toDbFuncionario,
  toDbRegistro, toDbProcedimento, toDbParto, toDbMovimentacao, toDbEvento,
  partialToDb, CAVALO_MAP, INSUMO_MAP, SERVICO_MAP, PARTO_MAP,
} from './utils/db';
import { subscribeToPush, sendPush } from './utils/push';

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "defaultFlow": "cavalo"
}/*EDITMODE-END*/;

function AppEpona() {
  const recentlyUpdatedPartos = useRef(new Set());
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
  const [lancamentos, setLancamentos] = useState([]);
  const [recorrencias, setRecorrencias] = useState([]);
  const [estoqueCompras, setEstoqueCompras] = useState([]);
  const [empresaInfo, setEmpresaInfo] = useState({});
  const hoje = new Date();
  const [faturaRef, setFaturaRef] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 });

  const [novoCavaloPendente, setNovoCavaloPendente] = useState(null);
  const [pendingEntradaCavalo, setPendingEntradaCavalo] = useState(false);
  const [fluxo, setFluxo] = useState(null);
  const [tweaks, setTweak] = useTweaks(TWEAKS_DEFAULTS);
  const [dbErrorMsg, setDbErrorMsg] = useState(null);

  React.useEffect(() => {
    const handler = (e) => {
      setDbErrorMsg(`Erro ao salvar (${e.detail.table}): ${e.detail.msg}`);
      setTimeout(() => setDbErrorMsg(null), 6000);
    };
    window.addEventListener('db-error', handler);
    return () => window.removeEventListener('db-error', handler);
  }, []);

 // ── Carregamento inicial ──────────────────────────────────────
const loadAllData = async () => {
  try {
    const [cavalosData, propsData, insumosData, servicosData, funcData,
      registrosData, partosData, eventosData, movsData, procsData, ffData, avisosData, comprasData, atividadesData, lancamentosData, recorrenciasData, estoqueComprasData, configResult
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
      fetchAll('avisos', fromDbAviso, 5000),
      fetchAll('lista_compras', fromDbListaCompra),
      fetchAll('atividades', fromDbAtividade),
      fetchAll('financeiro_lancamentos', fromDbLancamento),
      fetchAll('lancamentos_recorrentes', fromDbRecorrencia),
      fetchAll('estoque_compras', fromDbEstoqueCompra),
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
    setRecorrencias(recorrenciasData || []);
    setEstoqueCompras(estoqueComprasData || []);
    const novosLans = _gerarLansRecorrentes(recorrenciasData || [], lancamentosData || []);
    setLancamentos([...(lancamentosData || []), ...novosLans]);
    if (novosLans.length > 0) novosLans.forEach(l => dbInsertIgnore('financeiro_lancamentos', toDbLancamento(l)));
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
          subscribeToPush(parsedUser.login || parsedUser.nome, parsedUser.role);
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

  // ── Realtime sync entre logins ────────────────────────────
  useEffect(() => {
    const ch = supabase.channel('epona-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cavalos' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setCavalos(prev => prev.some(c => c.id === n.id) ? prev : [...prev, fromDbCavalo(n)]);
        if (et === 'UPDATE') setCavalos(prev => prev.map(c => c.id === n.id ? fromDbCavalo(n) : c));
        if (et === 'DELETE') setCavalos(prev => prev.filter(c => c.id !== o.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'procedimentos' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setProcedimentos(prev => prev.some(p => p.id === n.id) ? prev : [...prev, fromDbProcedimento(n)]);
        if (et === 'UPDATE') setProcedimentos(prev => prev.map(p => p.id === n.id ? fromDbProcedimento(n) : p));
        if (et === 'DELETE') setProcedimentos(prev => prev.filter(p => p.id !== o.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atividades' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setAtividades(prev => prev.some(a => a.id === n.id) ? prev : [...prev, fromDbAtividade(n)]);
        if (et === 'UPDATE') setAtividades(prev => prev.map(a => a.id === n.id ? fromDbAtividade(n) : a));
        if (et === 'DELETE') setAtividades(prev => prev.filter(a => a.id !== o.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setRegistros(prev => prev.some(r => r.id === n.id) ? prev : [...prev, fromDbRegistro(n)]);
        if (et === 'UPDATE') setRegistros(prev => prev.map(r => r.id === n.id ? fromDbRegistro(n) : r));
        if (et === 'DELETE') setRegistros(prev => prev.filter(r => r.id !== o.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'avisos' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setAvisos(prev => prev.some(a => a.id === n.id) ? prev : [fromDbAviso(n), ...prev]);
        if (et === 'UPDATE') setAvisos(prev => prev.map(a => a.id === n.id ? fromDbAviso(n) : a));
        if (et === 'DELETE') setAvisos(prev => prev.filter(a => a.id !== o.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partos' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setPartos(prev => prev.some(p => p.id === n.id) ? prev : [...prev, fromDbParto(n)]);
        if (et === 'UPDATE' && !recentlyUpdatedPartos.current.has(n.id)) setPartos(prev => prev.map(p => p.id === n.id ? fromDbParto(n) : p));
        if (et === 'DELETE') setPartos(prev => prev.filter(p => p.id !== o.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimentacoes' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setMovimentacoes(prev => prev.some(m => m.id === n.id) ? prev : [...prev, fromDbMovimentacao(n)]);
        if (et === 'UPDATE') setMovimentacoes(prev => prev.map(m => m.id === n.id ? fromDbMovimentacao(n) : m));
        if (et === 'DELETE') setMovimentacoes(prev => prev.filter(m => m.id !== o.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lista_compras' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setCompras(prev => prev.some(c => c.id === n.id) ? prev : [...prev, fromDbListaCompra(n)]);
        if (et === 'UPDATE') setCompras(prev => prev.map(c => c.id === n.id ? fromDbListaCompra(n) : c));
        if (et === 'DELETE') setCompras(prev => prev.filter(c => c.id !== o.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faturas_fechadas' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setFaturasFechadas(prev => prev.some(f => f.id === n.id) ? prev : [...prev, fromDbFaturaFechada(n)]);
        if (et === 'UPDATE') setFaturasFechadas(prev => prev.map(f => f.id === n.id ? fromDbFaturaFechada(n) : f));
        if (et === 'DELETE') setFaturasFechadas(prev => prev.filter(f => f.id !== o.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financeiro_lancamentos' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setLancamentos(prev => prev.some(l => l.id === n.id) ? prev : [...prev, fromDbLancamento(n)]);
        if (et === 'UPDATE') setLancamentos(prev => prev.map(l => l.id === n.id ? fromDbLancamento(n) : l));
        if (et === 'DELETE') setLancamentos(prev => prev.filter(l => l.id !== o.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos_recorrentes' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setRecorrencias(prev => prev.some(r => r.id === n.id) ? prev : [...prev, fromDbRecorrencia(n)]);
        if (et === 'UPDATE') setRecorrencias(prev => prev.map(r => r.id === n.id ? fromDbRecorrencia(n) : r));
        if (et === 'DELETE') setRecorrencias(prev => prev.filter(r => r.id !== o.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_compras' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setEstoqueCompras(prev => prev.some(c => c.id === n.id) ? prev : [...prev, fromDbEstoqueCompra(n)]);
        if (et === 'UPDATE') setEstoqueCompras(prev => prev.map(c => c.id === n.id ? fromDbEstoqueCompra(n) : c));
        if (et === 'DELETE') setEstoqueCompras(prev => prev.filter(c => c.id !== o.id));
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  // ── Session persistence ──────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    try {
      sessionStorage.setItem('epona_session', JSON.stringify({ screen, tab, fluxo, selected }));
    } catch (e) {}
  }, [screen, tab, fluxo, selected, currentUser]);

  // ── Recorrência: helper puro (não usa state) ─────────────
  const _gerarDatasRec = (rec, hoje) => {
    const datas = [];
    const ini = new Date(rec.dataInicio + 'T00:00:00');
    const limite = new Date((rec.dataFim && rec.dataFim < hoje ? rec.dataFim : hoje) + 'T00:00:00');
    if (rec.frequencia === 'mensal') {
      let a = ini.getFullYear(), m = ini.getMonth();
      for (let i = 0; i < 360; i++) {
        const d = new Date(a, m, rec.diaMes || 1);
        if (d > limite) break;
        if (d >= ini) datas.push(d.toISOString().split('T')[0]);
        m++; if (m > 11) { m = 0; a++; }
      }
    } else {
      const iv = rec.frequencia === 'quinzenal' ? 14 : 7;
      let d = new Date(ini);
      while (d <= limite) { datas.push(d.toISOString().split('T')[0]); d = new Date(d.getTime() + iv * 86400000); }
    }
    return datas;
  };

  const _gerarLansRecorrentes = (recs, lans) => {
    const hoje = new Date().toISOString().split('T')[0];
    const novos = [];
    for (const rec of recs) {
      if (!rec.ativo) continue;
      for (const data of _gerarDatasRec(rec, hoje)) {
        const id = `lan_rec_${rec.id}_${data}`;
        if (!lans.some(l => l.id === id)) {
          novos.push({ id, tipo: rec.tipo, valor: rec.valor, data, quem: rec.quem || '', motivo: rec.descricao || '', categoria: rec.categoria || '', pago: false, pagoEm: null, recorrenciaId: rec.id });
        }
      }
    }
    return novos;
  };

  // ── Recorrências CRUD ─────────────────────────────────────
  const addRecorrencia = (data) => {
    const nova = { id: 'rec_' + Date.now(), ...data };
    setRecorrencias(prev => [...prev, nova]);
    dbInsert('lancamentos_recorrentes', toDbRecorrencia(nova));
    setLancamentos(prev => {
      const novos = _gerarLansRecorrentes([nova], prev);
      if (novos.length > 0) novos.forEach(l => dbInsertIgnore('financeiro_lancamentos', toDbLancamento(l)));
      return [...prev, ...novos];
    });
  };
  const deleteRecorrencia = (id) => {
    setRecorrencias(prev => prev.filter(r => r.id !== id));
    dbDelete('lancamentos_recorrentes', id);
  };

  // ── Estoque de compras CRUD ───────────────────────────────
  const addEstoqueCompra = (data) => {
    const ecId = 'ec_' + Date.now();
    const ins = insumos.find(i => i.id === data.insumoId);
    let lancamentoId = null;

    if (data.tipo !== 'ajuste' && (data.valorTotal || 0) > 0) {
      const lancId = 'lan_ec_' + ecId;
      lancamentoId = lancId;
      const dataLan = data.pago ? data.data : (data.dataVencimento || data.data);
      const lancamento = {
        id: lancId, tipo: 'saida', valor: data.valorTotal,
        data: dataLan,
        quem: data.fornecedor || '',
        motivo: `${data.qtd} ${data.unidade || ins?.unidade || 'un'} de ${ins?.nome || data.insumoId}`,
        categoria: 'Compra de Insumo',
        pago: data.pago || false,
        pagoEm: data.pago ? data.data : null,
        recorrenciaId: null,
      };
      setLancamentos(prev => [...prev, lancamento]);
      dbInsert('financeiro_lancamentos', toDbLancamento(lancamento));
    }

    const novaCompra = { ...data, id: ecId, lancamentoId };
    setEstoqueCompras(prev => [...prev, novaCompra]);
    dbInsert('estoque_compras', toDbEstoqueCompra(novaCompra));
  };
  const deleteEstoqueCompra = (id) => {
    const compra = estoqueCompras.find(c => c.id === id);
    setEstoqueCompras(prev => prev.filter(c => c.id !== id));
    dbDelete('estoque_compras', id);
    if (compra?.lancamentoId) {
      setLancamentos(prev => prev.filter(l => l.id !== compra.lancamentoId));
      dbDelete('financeiro_lancamentos', compra.lancamentoId);
    }
  };

  // ── Avisos periódicos + maternidade ──────────────────────
  useEffect(() => {
    if (currentUser && cavalos.length > 0) {
      gerarAvisosPeriodicos();
      gerarAvisosMaternidade();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // ── Auth ──────────────────────────────────────────────────────
      const handleLogin = async (user) => {
    setCurrentUser(user);
    localStorage.setItem('epona_user', JSON.stringify(user));
    await loadAllData();
    subscribeToPush(user.login || user.nome, user.role);
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
  const deleteRegistro = (id) => {
    setRegistros(prev => prev.filter(r => r.id !== id));
    dbDelete('registros', id);
  };
  const updateRegistro = (id, data) => {
    setRegistros(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    dbUpdate('registros', id, data);
  };
  const deleteProcedimento = (id) => {
    setProcedimentos(prev => prev.filter(p => p.id !== id));
    dbDelete('procedimentos', id);
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
  const deleteInsumo = (id) => {
    setInsumos(prev => prev.filter(i => i.id !== id));
    dbDelete('insumos', id);
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
  const addCavalo = async (data) => {
    const newId = 'c_' + Date.now();
    const newCavalo = { id: newId, ...data };
    setCavalos(prev => [...prev, newCavalo]);
    await dbInsert('cavalos', toDbCavalo(newCavalo));
    return newId;
  };
  const updateCavalo = async (id, partialData) => {
    setCavalos(prev => prev.map(c => c.id === id ? { ...c, ...partialData } : c));
    const ok = await dbUpdate('cavalos', id, partialToDb(partialData, CAVALO_MAP));
    if (!ok) {
      const { data } = await supabase.from('cavalos').select('*').eq('id', id).single();
      if (data) setCavalos(prev => prev.map(c => c.id === id ? fromDbCavalo(data) : c));
    }
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
    recentlyUpdatedPartos.current.add(id);
    clearTimeout(recentlyUpdatedPartos.current['t_' + id]);
    recentlyUpdatedPartos.current['t_' + id] = setTimeout(() => {
      recentlyUpdatedPartos.current.delete(id);
    }, 3000);
    setPartos(prev => {
      const next = prev.map(p => {
        if (p.id !== id) return p;
        const merged = { ...p, ...data };
        dbUpdate('partos', id, toDbParto(merged));
        return merged;
      });
      return next;
    });
  };
  const deleteParto = (id) => {
    setPartos(prev => prev.filter(p => p.id !== id));
    dbDelete('partos', id);
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
  const deleteServico = (id) => {
    setServicos(prev => prev.filter(s => s.id !== id));
    dbDelete('servicos', id);
  };
  const addProcedimento = (data) => {
    const newProc = { id: 'proc_' + Date.now(), ...data };
    setProcedimentos(prev => [...prev, newProc]);
    dbInsert('procedimentos', toDbProcedimento(newProc));
  };

  // ── Lançamentos financeiros ───────────────────────────────────
  const addLancamento = (data) => {
    const novo = { id: 'lan_' + Date.now(), ...data };
    setLancamentos(prev => [...prev, novo]);
    dbInsert('financeiro_lancamentos', toDbLancamento(novo));
  };
  const updateLancamento = (id, changes) => {
    setLancamentos(prev => {
      const updated = prev.map(l => l.id === id ? { ...l, ...changes } : l);
      const full = updated.find(l => l.id === id);
      if (full) dbUpdate('financeiro_lancamentos', id, toDbLancamento(full));
      return updated;
    });
  };
  const deleteLancamento = (id) => {
    setLancamentos(prev => prev.filter(l => l.id !== id));
    dbDelete('financeiro_lancamentos', id);
  };

  // ── Avisos ────────────────────────────────────────────────────
  const addAviso = (a) => {
    const novoAviso = { id: 'av_' + Date.now(), resolvido: false, respostas: [], ...a };
    setAvisos(prev => [novoAviso, ...prev]);
    dbInsert('avisos', toDbAviso(novoAviso));
    if (novoAviso.urgente) {
      sendPush('⚠️ Aviso urgente', novoAviso.texto, 'all');
    }
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
  const getFreqDias = (freq) => {
    if (freq === 'diario') return 1;
    if (freq === 'semanal') return 7;
    if (freq === 'quinzenal') return 14;
    if (freq?.startsWith('cada')) return parseInt(freq.replace('cada', '')) || 7;
    return 7;
  };
  const gerarAvisosPeriodicos = () => {
    const hoje = new Date().toISOString().split('T')[0];
    const diaSemana = getDiaSemana();
    const semanaPar = isSemanaPar();
    for (const c of cavalos) {
      if (!c.nutricao?.periodicos) continue;
      for (const p of c.nutricao.periodicos) {
        if (p.frequencia === 'diario') {
          // always create alert for daily items
        } else if (p.frequencia?.startsWith('cada')) {
          const interval = getFreqDias(p.frequencia);
          const daysSinceEpoch = Math.floor(Date.now() / 86400000);
          if (daysSinceEpoch % interval !== 0) continue;
        } else {
          if (p.diaSemana !== diaSemana) continue;
          if (p.frequencia === 'quinzenal' && !semanaPar) continue;
        }
        const ins = insumos.find(i => i.id === p.insumoId);
        const texto = `📅 ${ins?.nome || p.insumoId} para ${c.nome} (${p.qtd} ${ins?.unidade || 'un'})`;
        const avisoId = `av_per_${hoje}_${c.id}_${(p.insumoId || 'x').replace(/[^a-zA-Z0-9]/g, '_')}`;
        const jaExiste = avisos.some(a => a.id === avisoId || (a.texto === texto && a.data_entrada === hoje));
        if (!jaExiste) {
          const novoAviso = {
            id: avisoId,
            autor: 'Sistema', avatar: '⚙️', tempo: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), texto,
            urgente: false, resolvido: false, resolvidoPor: '',
            tipo: 'periodico', cavaloId: c.id,
            data_entrada: hoje, respostas: [],
          };
          setAvisos(prev => prev.some(a => a.id === avisoId) ? prev : [novoAviso, ...prev]);
          dbInsertIgnore('avisos', toDbAviso(novoAviso));
        }
      }
    }
  };
  const gerarAvisosMaternidade = () => {
    const hoje = new Date().toISOString().split('T')[0];
    for (const c of cavalos) {
      if (!c.gestacao?.dataCobricao) continue;
      const dataCobricao = new Date(c.gestacao.dataCobricao + 'T00:00:00');
      const diasDeGestacao = Math.floor((Date.now() - dataCobricao.getTime()) / (1000 * 60 * 60 * 24));
      if (diasDeGestacao < 300) continue;
      const avisoId = 'av_mat_' + c.id + '_' + c.gestacao.dataCobricao;
      const jaExiste = avisos.some(a =>
        a.id === avisoId ||
        (a.tipo === 'maternidade' && a.cavaloId === c.id)
      );
      if (jaExiste) continue;
      const texto = `A égua ${c.nome} completou ${diasDeGestacao} dias de gestação e deve ser transferida para o piquete maternidade.`;
      const novoAviso = {
        id: avisoId,
        autor: 'Sistema', avatar: '🏥',
        tempo: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        texto, urgente: true, resolvido: false, resolvidoPor: '',
        tipo: 'maternidade', cavaloId: c.id,
        data_entrada: hoje, respostas: [],
      };
      setAvisos(prev => {
        if (prev.some(a => a.id === novoAviso.id)) return prev;
        dbInsertIgnore('avisos', toDbAviso(novoAviso));
        sendPush('🏥 Alerta maternidade', texto, 'all');
        return [novoAviso, ...prev];
      });
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
    setAvisos(prev => {
      const aviso = prev.find(a => a.id === avisoId);
      if (!aviso) return prev;
      const novasRespostas = [...(aviso.respostas || []), reply];
      dbUpdate('avisos', avisoId, { respostas: novasRespostas });
      return prev.map(a => a.id === avisoId ? { ...a, respostas: novasRespostas } : a);
    });
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
    sendPush('🛒 Lista de compras', `${nova.nome}${nova.quantidade ? ' · ' + nova.quantidade : ''} adicionado`, 'admin');
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
    if (tab === 'faturas' && !['faturaDetalhe', 'consumo'].includes(screen)) setScreen('faturas');
    if (tab === 'nutricional' && !['editarCavalo', 'cavaloDetalhe'].includes(screen)) setScreen('nutricional');
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
    if (s === 'home' || s === 'historico') setTab('home');
    if (s === 'cavalos' || s === 'addCavalo' || s === 'cavaloDetalhe' || s === 'editarCavalo') setTab('cavalos');
    if (s === 'cadastros' || s.startsWith('cad') || s === 'addInsumo' || s === 'editarInsumo' || s === 'cadEmpresa') setTab('cadastros');
    if (s === 'faturas' || s === 'faturaDetalhe' || s === 'consumo') setTab('faturas');
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
  } else if (screen === 'home') content = <HomeScreen registros={registros} setScreen={goScreen} density={tweaks.density} avisos={avisos} cavalos={cavalos} compras={compras} atividades={atividades} currentUser={currentUser} onSeed={handleSeed} removeAviso={removeAviso} removeAtividade={removeAtividade} insumos={insumos} />;
  else if (screen === 'avisos') content = <AvisosScreen setScreen={goScreen} avisos={avisos} addAviso={addAviso} removeAviso={removeAviso} resolverAviso={resolverAviso} addResposta={addResposta} currentUser={currentUser} />;
  else if (screen === 'nutricional') content = <NutricionalScreen setScreen={goScreen} setSelected={setSelected} cavalos={cavalos} insumos={insumos} currentUser={currentUser} updateCavalo={updateCavalo} addAviso={addAviso} removeAviso={removeAviso} />;
  else if (screen === 'compras') content = <ListaComprasScreen compras={compras} addCompra={addCompra} deleteCompra={deleteCompra} toggleCompra={toggleCompra} currentUser={currentUser} />;
  else if (screen === 'movimentacao') content = <MovimentacaoScreen setScreen={goScreen} addMovimentacao={addMovimentacao} addAviso={addAviso} addAtividade={addAtividade} cavalos={cavalos} proprietarios={proprietarios} novoCavaloPendente={novoCavaloPendente} setNovoCavaloPendente={setNovoCavaloPendente} setPendingEntradaCavalo={setPendingEntradaCavalo} servicos={servicos} addProcedimento={addProcedimento} updateCavalo={updateCavalo} insumos={insumos} addRegistro={addRegistro} />;
  else if (screen === 'cavalos') content = <CavalosScreen setScreen={goScreen} setSelected={setSelected} density={tweaks.density} cavalos={cavalos} setCavalos={setCavalos} proprietarios={proprietarios} />;
  else if (screen === 'addCavalo') content = <AddCavaloScreen setScreen={goScreen} addCavalo={addCavalo} cavalos={cavalos} setNovoCavaloPendente={setNovoCavaloPendente} pendingEntradaCavalo={pendingEntradaCavalo} setPendingEntradaCavalo={setPendingEntradaCavalo} proprietarios={proprietarios} addProprietario={addProprietario} insumos={insumos} />;
  else if (screen === 'cavaloDetalhe') content = <CavaloDetalheScreen id={selected} setScreen={goScreen} registros={registros} procedimentos={procedimentos} setSelected={setSelected} cavalos={cavalos} servicos={servicos} updateCavalo={updateCavalo} deleteCavalo={deleteCavalo} proprietarios={proprietarios} deleteRegistro={deleteRegistro} updateRegistro={updateRegistro} deleteProcedimento={deleteProcedimento} insumos={insumos} />;
  else if (screen === 'editarCavalo') content = <EditarCavaloScreen id={selected} setScreen={goScreen} cavalos={cavalos} updateCavalo={updateCavalo} deleteCavalo={deleteCavalo} proprietarios={proprietarios} addAviso={addAviso} addAtividade={addAtividade} currentUser={currentUser} insumos={insumos} />;
  else if (screen === 'proprietarioDetalhe') content = <ProprietarioScreen id={selected} setScreen={goScreen} proprietarios={proprietarios} cavalos={cavalos} updateProprietario={updateProprietario} />;
  else if (screen === 'cadastros') content = <CadastrosScreen setScreen={goScreen} currentUser={currentUser} cavalosCount={cavalos.length} proprietariosCount={proprietarios.length} insumosCount={insumos.length} servicosCount={servicos.length} />;
  else if (screen === 'cadProprietarios') content = <CadProprietariosScreen setScreen={goScreen} setSelected={setSelected} proprietarios={proprietarios} cavalos={cavalos} addProprietario={addProprietario} deleteProprietario={deleteProprietario} />;
  else if (screen === 'cadCavalos') content = <CadCavalosScreen setScreen={goScreen} setSelected={setSelected} cavalos={cavalos} deleteCavalo={deleteCavalo} proprietarios={proprietarios} />;
  else if (screen === 'cadInsumos') content = <CadInsumosScreen setScreen={goScreen} setSelected={setSelected} insumos={insumos} addInsumo={addInsumo} updateInsumo={updateInsumo} deleteInsumo={deleteInsumo} />;
  else if (screen === 'addInsumo') content = <AddInsumoScreen setScreen={goScreen} addInsumo={addInsumo} insumos={insumos} />;
  else if (screen === 'editarInsumo') content = <EditarInsumoScreen id={selected} setScreen={goScreen} insumos={insumos} updateInsumo={updateInsumo} />;
  else if (screen === 'cadServicos') content = <CadServicosScreen setScreen={goScreen} servicos={servicos} addServico={addServico} updateServico={updateServico} setSelected={setSelected} deleteServico={deleteServico} insumos={insumos} />;
  else if (screen === 'registrarProcedimento') content = <RegistrarProcedimentoScreen setScreen={goScreen} servicos={servicos} cavalos={cavalos} insumos={insumos} addProcedimento={addProcedimento} addAtividade={addAtividade} />;
  else if (screen === 'cadMensalidades') content = <CadMensalidadesScreen setScreen={goScreen} />;
  else if (screen === 'cadEmpresa') content = <CadEmpresaScreen setScreen={goScreen} empresaInfo={empresaInfo} onSave={updateEmpresaInfo} />;
  else if (screen === 'faturas') content = <FinanceiroScreen setScreen={goScreen} setSelected={setSelected} registros={registros} insumos={insumos} proprietarios={proprietarios} cavalos={cavalos} movimentacoes={movimentacoes} faturaRef={faturaRef} setFaturaRef={setFaturaRef} faturasFechadas={faturasFechadas} procedimentos={procedimentos} servicos={servicos} lancamentos={lancamentos} addLancamento={addLancamento} updateLancamento={updateLancamento} deleteLancamento={deleteLancamento} recorrencias={recorrencias} addRecorrencia={addRecorrencia} deleteRecorrencia={deleteRecorrencia} estoqueCompras={estoqueCompras} addEstoqueCompra={addEstoqueCompra} deleteEstoqueCompra={deleteEstoqueCompra} currentUser={currentUser} />;
  else if (screen === 'consumo') content = <ConsumoScreen setScreen={goScreen} cavalos={cavalos} insumos={insumos} />;
  else if (screen === 'faturaDetalhe') content = <FaturaDetalheScreen id={selected} setScreen={goScreen} registros={registros} proprietarios={proprietarios} cavalos={cavalos} insumos={insumos} movimentacoes={movimentacoes} faturaRef={faturaRef} faturasFechadas={faturasFechadas} addFaturaFechada={addFaturaFechada} removeFaturaFechada={removeFaturaFechada} currentUser={currentUser} empresaInfo={empresaInfo} procedimentos={procedimentos} servicos={servicos} deleteRegistro={deleteRegistro} updateRegistro={updateRegistro} deleteProcedimento={deleteProcedimento} />;
  else if (screen === 'planner') content = <PlannerScreen setScreen={goScreen} setSelected={setSelected} funcionarios={funcionarios} currentUser={currentUser} notas={notas} setNotas={setNotas} eventos={eventos} addEvento={addEvento} removeEvento={removeEvento} />;
  else if (screen === 'funcionarios') content = <FuncionariosScreen setScreen={goScreen} setSelected={setSelected} funcionarios={funcionarios} currentUser={currentUser} />;
  else if (screen === 'funcionarioDetalhe') content = <FuncionarioDetalheScreen id={selected} setScreen={goScreen} backTo={tab === 'equipe' ? 'planner' : 'funcionarios'} funcionarios={funcionarios} addFuncionario={addFuncionario} updateFuncionario={updateFuncionario} deleteFuncionario={deleteFuncionario} />;
  else if (screen === 'minhaConta') content = <MinhaContaScreen currentUser={currentUser} funcionarios={funcionarios} onSave={updateMinhaConta} onLogout={handleLogout} setScreen={goScreen} />;
  else if (screen === 'partos') content = <GestacaoPartosScreen setScreen={goScreen} setSelected={setSelected} partos={partos} cavalos={cavalos} proprietarios={proprietarios} movimentacoes={movimentacoes} />;
  else if (screen === 'registrarParto') content = <RegistrarPartoScreen setScreen={goScreen} setSelected={setSelected} cavalos={cavalos} proprietarios={proprietarios} insumos={insumos} addCavalo={addCavalo} addParto={addParto} updateCavalo={updateCavalo} partos={partos} />;
  else if (screen === 'partoDetalhe') content = <PartoDetalheScreen id={selected} setScreen={goScreen} partos={partos} updateParto={updateParto} deleteParto={deleteParto} cavalos={cavalos} updateCavalo={updateCavalo} deleteCavalo={deleteCavalo} proprietarios={proprietarios} insumos={insumos} addProcedimento={addProcedimento} />;
  else if (screen === 'eguaGestanteDetalhe') content = <EguaGestanteDetalheScreen id={selected} setScreen={goScreen} setSelected={setSelected} cavalos={cavalos} updateCavalo={updateCavalo} proprietarios={proprietarios} insumos={insumos} addAviso={addAviso} addAtividade={addAtividade} currentUser={currentUser} partos={partos} />;
  else if (screen === 'historico') content = <HistoricoScreen atividades={atividades} setScreen={goScreen} currentUser={currentUser} removeAtividade={removeAtividade} insumos={insumos} cavalos={cavalos} />;
  else if (screen === 'registrar') {
    if (!fluxo) content = <RegistrarHub setScreen={goScreen} setFluxo={setFluxo} />;
    else if (fluxo === 'cavalo') content = <RegistrarPorCavalo setScreen={goScreen} addRegistro={addRegistro} addAtividade={addAtividade} insumos={insumos} cavalos={cavalos} currentUser={currentUser} />;
    else if (fluxo === 'insumo') content = <RegistrarPorInsumo setScreen={goScreen} addRegistro={addRegistro} addAtividade={addAtividade} insumos={insumos} cavalos={cavalos} currentUser={currentUser} />;
    else if (fluxo === 'setor') content = <RegistrarPorSetor setScreen={goScreen} addRegistro={addRegistro} addAtividade={addAtividade} insumos={insumos} cavalos={cavalos} currentUser={currentUser} />;
  }

  const isOperacional = currentUser?.role === 'operacional';
  const showMainTabs = !loading && currentUser && !isOperacional && ['home','cavalos','cavaloDetalhe','editarCavalo','addCavalo','cadastros','cadProprietarios','cadCavalos','cadInsumos','cadMensalidades','cadServicos','cadEmpresa','addInsumo','editarInsumo','proprietarioDetalhe','faturas','faturaDetalhe','nutricional','compras','planner','funcionarios','funcionarioDetalhe','minhaConta','partos','registrarParto','partoDetalhe','eguaGestanteDetalhe','registrarProcedimento','historico','consumo'].includes(screen);
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
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'relative', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
            {content}
          </div>
          {showMainTabs && <TabBar tab={tab} setTab={setTab} role={currentUser?.role} />}
          {showOperacionalTabs && <OperacionalTabBar tab={tab} setTab={setTab} />}
          {dbErrorMsg && (
            <div style={{
              position: 'absolute', bottom: 80, left: 12, right: 12, zIndex: 999,
              background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12,
              padding: '12px 14px', fontSize: 13, color: '#991b1b',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}>
              ⚠️ {dbErrorMsg}
            </div>
          )}
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
