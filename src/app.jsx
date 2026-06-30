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
  calcMensalidadeProporcional, calcPerfilMes, cavaloAtivoNoMes, calcFaturaProprietario,
} from './screens';
import { isProprietarioProprio } from './utils/empresa';

// Cutoff: faturas com competência >= esta data ganham lançamento de entrada vinculado.
// Faturas anteriores são fechadas (auto ou manualmente) sem lançar em Entradas.
const CUTOFF_LANCAMENTO = '2026-06'; // junho/2026 em diante
const isCompetenciaAptaParaLancamento = (ano, mes) => `${ano}-${String(mes).padStart(2, '0')}` >= CUTOFF_LANCAMENTO;
import { AvisosScreen, MovimentacaoScreen } from './extra-screens';
import { ListaComprasScreen } from './compras';
import { CustosFixosScreen } from './custos-fixos';
import { RegistrarHub, RegistrarPorCavalo, RegistrarPorInsumo, RegistrarPorSetor } from './register';
import { LoginScreen, ROLE_COLORS } from './auth';
import { NutricionalScreen } from './nutricional';
import { FuncionariosScreen, FuncionarioDetalheScreen, PlannerScreen, MinhaContaScreen } from './funcionarios';
import { RegistrarPartoScreen, PartoDetalheScreen } from './partos';
import { GestacaoPartosScreen, EguaGestanteDetalheScreen } from './gestacao';
import { VeterinariaScreen } from './veterinaria';
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
  fromDbProtocoloVacinacao, toDbProtocoloVacinacao,
  fromDbCampanhaVacinacao, toDbCampanhaVacinacao,
  fromDbVacinacaoAnimal, toDbVacinacaoAnimal,
  fromDbProtocoloVermifugacao, toDbProtocoloVermifugacao,
  fromDbVermifugacaoAnimal, toDbVermifugacaoAnimal,
  fromDbOpg, toDbOpg,
  fromDbCustoFixo, toDbCustoFixo,
  dbUpsert,
  toDbCavalo, toDbProprietario, toDbInsumo, toDbServico, toDbFuncionario,
  toDbRegistro, toDbProcedimento, toDbParto, toDbMovimentacao, toDbEvento,
  partialToDb, CAVALO_MAP, INSUMO_MAP, SERVICO_MAP, PARTO_MAP, FUNCIONARIO_MAP, CUSTO_FIXO_MAP,
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
  const [nutricaoOrdem, setNutricaoOrdem] = useState([]);
  const [protocolosVacinacao, setProtocolosVacinacao] = useState([]);
  const [campanhasVacinacao, setCampanhasVacinacao] = useState([]);
  const [vacinacoesAnimais, setVacinacoesAnimais] = useState([]);
  const [protocolosVermifugacao, setProtocolosVermifugacao] = useState([]);
  const [vermifugacoesAnimais, setVermifugacoesAnimais] = useState([]);
  const [opgs, setOpgs] = useState([]);
  const [medicoes, setMedicoes] = useState([]);
  const [anotacoesClinicas, setAnotacoesClinicas] = useState([]);
  const [exames, setExames] = useState([]);
  const [registrosReproducao, setRegistrosReproducao] = useState([]);
  const [custosFixos, setCustosFixos] = useState([]);
  const [loadError, setLoadError] = useState(null);
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
      registrosData, partosData, eventosData, movsData, procsData, ffData, avisosData, comprasData, atividadesData, lancamentosData, recorrenciasData, estoqueComprasData, configResult,
      protocolosVacData, campanhasVacData, vacinacoesAnimaisData,
      protocolosVermData, vermifugacoesData, opgsData, medicoesData, anotacoesData, examesData, reprosData, custosFixosData
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
      supabase.from('configuracoes').select('*').eq('id', 'global').maybeSingle().then(res => res).catch(() => ({ data: null })),
      fetchAll('protocolos_vacinacao', fromDbProtocoloVacinacao),
      fetchAll('campanhas_vacinacao', fromDbCampanhaVacinacao),
      fetchAll('vacinacoes_animais', fromDbVacinacaoAnimal),
      fetchAll('protocolos_vermifugacao', fromDbProtocoloVermifugacao),
      fetchAll('vermifugacoes_animais_verm', fromDbVermifugacaoAnimal),
      fetchAll('opgs', fromDbOpg),
      fetchAll('medicoes', r => ({ id: r.id, cavaloId: r.cavalo_id, dataRegistro: r.data_registro, peso: r.peso, alturaCernelha: r.altura_cernelha, perimetroCanela: r.perimetro_canela, perimetroAbdominal: r.perimetro_abdominal, perimetroToracico: r.perimetro_toracico, perimetroPescoco1: r.perimetro_pescoco_1, perimetroPescoco2: r.perimetro_pescoco_2, perimetroPescoco3: r.perimetro_pescoco_3, gorduraBaseCauda: r.gordura_base_cauda, gorduraCostelas: r.gordura_costelas, gorduraPescoco: r.gordura_pescoco, observacoes: r.observacoes, registradoPor: r.registrado_por })),
      fetchAll('anotacoes_clinicas', r => ({ id: r.id, cavaloId: r.cavalo_id, data: r.data, hora: r.hora || '', tipo: r.tipo || 'Outro', gravidade: r.gravidade || '', titulo: r.titulo, descricao: r.descricao || '', autor: r.autor || '', mes: r.mes, insumosCriados: r.insumos_criados || [], procsCriados: r.procs_criados || [] })),
      fetchAll('exames_complementares', r => ({ id: r.id, cavaloId: r.cavalo_id, data: r.data, tipo: r.tipo, descricao: r.descricao || '', arquivoUrl: r.arquivo_url || '', arquivoNome: r.arquivo_nome || '', arquivoTipo: r.arquivo_tipo || '', mes: r.mes })),
      fetchAll('reproducao_registros', r => ({ id: r.id, eguaId: r.egua_id, data: r.data, tipo: r.tipo, dados: typeof r.dados === 'string' ? JSON.parse(r.dados || '{}') : (r.dados || {}), insumosUsados: typeof r.insumos_usados === 'string' ? JSON.parse(r.insumos_usados || '[]') : (r.insumos_usados || []), dataRetorno: r.data_retorno || null, autor: r.autor || '', mes: r.mes })),
      fetchAll('custos_fixos', fromDbCustoFixo),
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
    setProtocolosVacinacao(protocolosVacData || []);
    setCampanhasVacinacao(campanhasVacData || []);
    setVacinacoesAnimais(vacinacoesAnimaisData || []);
    setProtocolosVermifugacao(protocolosVermData || []);
    setVermifugacoesAnimais(vermifugacoesData || []);
    setOpgs(opgsData || []);
    setMedicoes(medicoesData || []);
    setAnotacoesClinicas(anotacoesData || []);
    setExames(examesData || []);
    setRegistrosReproducao(reprosData || []);
    setCustosFixos(custosFixosData || []);

    // Migração: cria saídas para compras de estoque cujo lancamento não chegou ao banco
    const today = new Date().toISOString().slice(0, 10);
    const lancamentosIds = new Set((lancamentosData || []).map(l => l.id));
    const comprasSemLan = (estoqueComprasData || []).filter(c =>
      c.tipo !== 'ajuste' && (c.valorTotal || 0) > 0 &&
      (!c.lancamentoId || !lancamentosIds.has(c.lancamentoId))
    );
    console.log('[EPONA] loadAllData estoque_compras:', estoqueComprasData?.length, '| lancamentos no DB:', lancamentosData?.length, '| comprasSemLan:', comprasSemLan.length, comprasSemLan.map(c => ({ id: c.id, tipo: c.tipo, valor: c.valorTotal, lancId: c.lancamentoId })));
    const lansEstoque = comprasSemLan.map(c => {
      const ins = (insumosData || []).find(i => i.id === c.insumoId);
      const lancId = c.lancamentoId || ('lan_' + c.id);
      const dataLan = c.pago ? c.data : (c.dataVencimento || c.data || today);
      return {
        id: lancId, tipo: 'saida', valor: c.valorTotal,
        data: dataLan, quem: c.fornecedor || '',
        motivo: `${c.qtd} ${c.unidade || ins?.unidade || 'un'} de ${ins?.nome || c.insumoId}`,
        categoria: 'Compra de Insumo',
        pago: c.pago || false, pagoEm: c.pago ? c.data : null, recorrenciaId: null,
        _ecId: c.id, _novoId: !c.lancamentoId,
      };
    });
    if (lansEstoque.length > 0) {
      lansEstoque.forEach(({ _ecId, _novoId, ...lan }) => {
        dbInsertIgnore('financeiro_lancamentos', toDbLancamento(lan));
        if (_novoId) dbUpdate('estoque_compras', _ecId, { lancamento_id: lan.id });
      });
    }
    setEstoqueCompras((estoqueComprasData || []).map(c => {
      const lan = lansEstoque.find(l => l._ecId === c.id);
      return lan ? { ...c, lancamentoId: lan.id } : c;
    }));

    const novosLans = _gerarLansRecorrentes(recorrenciasData || [], lancamentosData || []);
    const lansEstoqueLimpos = lansEstoque.map(({ _ecId, _novoId, ...l }) => l);

    // Backfill: limpa lançamentos órfãos vinculados a faturas anteriores ao cutoff.
    // (Antes desta correção, qualquer fatura fechada gerava lançamento — agora só >= cutoff.)
    let lancamentosCorrigidos = [...(lancamentosData || [])];
    const lansParaDeletar = [];
    (ffData || []).forEach(f => {
      if (isCompetenciaAptaParaLancamento(f.ano, f.mes)) return;
      const lanId = `lan_${f.id}`;
      const idx = lancamentosCorrigidos.findIndex(l => l.id === lanId);
      if (idx !== -1) {
        lansParaDeletar.push(lanId);
        lancamentosCorrigidos.splice(idx, 1);
      }
    });

    setLancamentos([...lancamentosCorrigidos, ...novosLans, ...lansEstoqueLimpos]);
    if (novosLans.length > 0) novosLans.forEach(l => dbInsertIgnore('financeiro_lancamentos', toDbLancamento(l)));
    lansParaDeletar.forEach(id => dbDelete('financeiro_lancamentos', id));
    setEmpresaInfo(fromDbConfiguracao(configResult?.data));
    setNutricaoOrdem(configResult?.data?.nutricao_ordem || []);
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
    setLoadError(err?.message || 'Falha ao carregar dados. Verifique conexão e tente novamente.');
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
              if (savedTab && ['home','cavalos','cadastros','faturas','nutricional','avisos','equipe','partos','compras','veterinaria'].includes(savedTab)) setTab(savedTab);
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
        if (et === 'DELETE') setCavalos(prev => o?.id ? prev.filter(c => c.id !== o.id) : prev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'procedimentos' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setProcedimentos(prev => prev.some(p => p.id === n.id) ? prev : [...prev, fromDbProcedimento(n)]);
        if (et === 'UPDATE') setProcedimentos(prev => prev.map(p => p.id === n.id ? fromDbProcedimento(n) : p));
        if (et === 'DELETE') setProcedimentos(prev => o?.id ? prev.filter(p => p.id !== o.id) : prev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atividades' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setAtividades(prev => prev.some(a => a.id === n.id) ? prev : [...prev, fromDbAtividade(n)]);
        if (et === 'UPDATE') setAtividades(prev => prev.map(a => a.id === n.id ? fromDbAtividade(n) : a));
        if (et === 'DELETE') setAtividades(prev => o?.id ? prev.filter(a => a.id !== o.id) : prev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setRegistros(prev => prev.some(r => r.id === n.id) ? prev : [...prev, fromDbRegistro(n)]);
        if (et === 'UPDATE') setRegistros(prev => prev.map(r => r.id === n.id ? fromDbRegistro(n) : r));
        if (et === 'DELETE') setRegistros(prev => o?.id ? prev.filter(r => r.id !== o.id) : prev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'avisos' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setAvisos(prev => prev.some(a => a.id === n.id) ? prev : [fromDbAviso(n), ...prev]);
        if (et === 'UPDATE') setAvisos(prev => prev.map(a => a.id === n.id ? fromDbAviso(n) : a));
        if (et === 'DELETE') setAvisos(prev => o?.id ? prev.filter(a => a.id !== o.id) : prev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partos' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setPartos(prev => prev.some(p => p.id === n.id) ? prev : [...prev, fromDbParto(n)]);
        if (et === 'UPDATE' && !recentlyUpdatedPartos.current.has(n.id)) setPartos(prev => prev.map(p => p.id === n.id ? fromDbParto(n) : p));
        if (et === 'DELETE') setPartos(prev => o?.id ? prev.filter(p => p.id !== o.id) : prev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimentacoes' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setMovimentacoes(prev => prev.some(m => m.id === n.id) ? prev : [...prev, fromDbMovimentacao(n)]);
        if (et === 'UPDATE') setMovimentacoes(prev => prev.map(m => m.id === n.id ? fromDbMovimentacao(n) : m));
        if (et === 'DELETE') setMovimentacoes(prev => o?.id ? prev.filter(m => m.id !== o.id) : prev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lista_compras' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setCompras(prev => prev.some(c => c.id === n.id) ? prev : [...prev, fromDbListaCompra(n)]);
        if (et === 'UPDATE') setCompras(prev => prev.map(c => c.id === n.id ? fromDbListaCompra(n) : c));
        if (et === 'DELETE') setCompras(prev => o?.id ? prev.filter(c => c.id !== o.id) : prev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faturas_fechadas' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setFaturasFechadas(prev => prev.some(f => f.id === n.id) ? prev : [...prev, fromDbFaturaFechada(n)]);
        if (et === 'UPDATE') setFaturasFechadas(prev => prev.map(f => f.id === n.id ? fromDbFaturaFechada(n) : f));
        if (et === 'DELETE') setFaturasFechadas(prev => o?.id ? prev.filter(f => f.id !== o.id) : prev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financeiro_lancamentos' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setLancamentos(prev => prev.some(l => l.id === n.id) ? prev : [...prev, fromDbLancamento(n)]);
        if (et === 'UPDATE') setLancamentos(prev => prev.map(l => l.id === n.id ? fromDbLancamento(n) : l));
        if (et === 'DELETE') setLancamentos(prev => o?.id ? prev.filter(l => l.id !== o.id) : prev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos_recorrentes' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setRecorrencias(prev => prev.some(r => r.id === n.id) ? prev : [...prev, fromDbRecorrencia(n)]);
        if (et === 'UPDATE') setRecorrencias(prev => prev.map(r => r.id === n.id ? fromDbRecorrencia(n) : r));
        if (et === 'DELETE') setRecorrencias(prev => o?.id ? prev.filter(r => r.id !== o.id) : prev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_compras' }, ({ eventType: et, new: n, old: o }) => {
        if (et === 'INSERT') setEstoqueCompras(prev => prev.some(c => c.id === n.id) ? prev : [...prev, fromDbEstoqueCompra(n)]);
        if (et === 'UPDATE') setEstoqueCompras(prev => prev.map(c => c.id === n.id ? fromDbEstoqueCompra(n) : c));
        if (et === 'DELETE') setEstoqueCompras(prev => o?.id ? prev.filter(c => c.id !== o.id) : prev);
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
  const updateRecorrencia = (id, data) => {
    setRecorrencias(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    dbUpdate('lancamentos_recorrentes', id, toDbRecorrencia({ id, ...data }));
  };
  const deleteRecorrencia = (id) => {
    setRecorrencias(prev => prev.filter(r => r.id !== id));
    dbDelete('lancamentos_recorrentes', id);
  };

  // ── Vacinação CRUD ───────────────────────────────────────
  const addProtocoloVacinacao = (p) => {
    setProtocolosVacinacao(prev => [...prev, p]);
    dbInsert('protocolos_vacinacao', toDbProtocoloVacinacao(p));
  };
  const updateProtocoloVacinacao = (id, data) => {
    setProtocolosVacinacao(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    dbUpdate('protocolos_vacinacao', id, toDbProtocoloVacinacao({ id, ...data }));
  };
  const deleteProtocoloVacinacao = (id) => {
    setProtocolosVacinacao(prev => prev.filter(p => p.id !== id));
    dbDelete('protocolos_vacinacao', id);
  };
  const addCampanhaVacinacao = (c) => {
    setCampanhasVacinacao(prev => [...prev, c]);
    dbInsert('campanhas_vacinacao', toDbCampanhaVacinacao(c));
  };
  const updateCampanhaVacinacao = (id, data) => {
    setCampanhasVacinacao(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    dbUpdate('campanhas_vacinacao', id, toDbCampanhaVacinacao({ id, ...data }));
  };
  const deleteCampanhaVacinacao = (id) => {
    setCampanhasVacinacao(prev => prev.filter(c => c.id !== id));
    setVacinacoesAnimais(prev => prev.filter(v => v.campanhaId !== id));
    dbDelete('campanhas_vacinacao', id);
  };
  const upsertVacinacaoAnimal = (v) => {
    setVacinacoesAnimais(prev => prev.some(x => x.id === v.id) ? prev.map(x => x.id === v.id ? v : x) : [...prev, v]);
    dbUpsert('vacinacoes_animais', toDbVacinacaoAnimal(v));
  };

  // ── Vermifugação CRUD ─────────────────────────────────────
  const addProtocoloVermifugacao = (p) => {
    setProtocolosVermifugacao(prev => [...prev, p]);
    dbInsert('protocolos_vermifugacao', toDbProtocoloVermifugacao(p));
  };
  const updateProtocoloVermifugacao = (id, data) => {
    setProtocolosVermifugacao(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    const dbRow = toDbProtocoloVermifugacao({ id, ...data });
    delete dbRow.id;
    dbUpdate('protocolos_vermifugacao', id, dbRow);
  };
  const deleteProtocoloVermifugacao = (id) => {
    setProtocolosVermifugacao(prev => prev.filter(p => p.id !== id));
    dbDelete('protocolos_vermifugacao', id);
  };
  const addVermifugacaoAnimal = (v) => {
    setVermifugacoesAnimais(prev => [...prev, v]);
    dbInsert('vermifugacoes_animais_verm', toDbVermifugacaoAnimal(v));
  };

  // ── OPG CRUD ─────────────────────────────────────────────
  const addOpg = (o) => {
    setOpgs(prev => [...prev, o]);
    dbInsert('opgs', toDbOpg(o));
  };
  const updateOpg = (id, data) => {
    setOpgs(prev => prev.map(o => o.id === id ? { ...o, ...data } : o));
    const dbRow = toDbOpg({ id, ...data });
    delete dbRow.id;
    dbUpdate('opgs', id, dbRow);
  };
  const deleteOpg = (id) => {
    setOpgs(prev => prev.filter(o => o.id !== id));
    dbDelete('opgs', id);
  };

  // ── Medições (Desenvolvimento) CRUD ──────────────────────
  const MED_FIELD_MAP = { peso:'peso', alturaCernelha:'altura_cernelha', perimetroCanela:'perimetro_canela', perimetroAbdominal:'perimetro_abdominal', perimetroToracico:'perimetro_toracico', perimetroPescoco1:'perimetro_pescoco_1', perimetroPescoco2:'perimetro_pescoco_2', perimetroPescoco3:'perimetro_pescoco_3', gorduraBaseCauda:'gordura_base_cauda', gorduraCostelas:'gordura_costelas', gorduraPescoco:'gordura_pescoco' };
  const medToDb = (src) => { const r = {}; Object.entries(MED_FIELD_MAP).forEach(([c,s]) => { if (src[c] != null) r[s] = src[c]; }); return r; };
  const addMedicao = (m) => {
    setMedicoes(prev => [...prev, m]);
    dbInsert('medicoes', { id: m.id, cavalo_id: m.cavaloId, data_registro: m.dataRegistro, ...medToDb(m), observacoes: m.observacoes || null, registrado_por: m.registradoPor || null });
  };
  const updateMedicao = (id, data) => {
    setMedicoes(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
    dbUpdate('medicoes', id, { data_registro: data.dataRegistro, ...medToDb(data), observacoes: data.observacoes || null });
  };
  const deleteMedicao = (id) => {
    setMedicoes(prev => prev.filter(m => m.id !== id));
    dbDelete('medicoes', id);
  };

  const addAnotacaoClinica = (a) => {
    setAnotacoesClinicas(prev => [a, ...prev]);
    dbInsert('anotacoes_clinicas', { id: a.id, cavalo_id: a.cavaloId, data: a.data, hora: a.hora || '', tipo: a.tipo, gravidade: a.gravidade || null, titulo: a.titulo, descricao: a.descricao || '', autor: a.autor || '', mes: a.mes, insumos_criados: a.insumosCriados || [], procs_criados: a.procsCriados || [] });
  };
  const updateAnotacaoClinica = (id, data) => {
    setAnotacoesClinicas(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    dbUpdate('anotacoes_clinicas', id, { titulo: data.titulo, descricao: data.descricao || '', tipo: data.tipo, gravidade: data.gravidade || null, hora: data.hora || '', data: data.data, mes: data.mes });
  };
  const deleteAnotacaoClinica = (id) => {
    setAnotacoesClinicas(prev => prev.filter(a => a.id !== id));
    dbDelete('anotacoes_clinicas', id);
  };

  const uploadExame = async (meta, file) => {
    const ext = file.name.split('.').pop();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${meta.cavaloId}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage.from('exames').upload(path, file, { upsert: false });
    if (upErr) {
      window.dispatchEvent(new CustomEvent('db-error', { detail: { op: 'upload', table: 'exames', msg: upErr.message } }));
      return;
    }
    const { data: urlData } = supabase.storage.from('exames').getPublicUrl(path);
    const exame = { id: 'exm_' + Date.now(), ...meta, arquivoUrl: urlData.publicUrl, arquivoNome: file.name, arquivoTipo: file.type };
    setExames(prev => [exame, ...prev]);
    dbInsert('exames_complementares', { id: exame.id, cavalo_id: exame.cavaloId, data: exame.data, tipo: exame.tipo, descricao: exame.descricao || '', arquivo_url: exame.arquivoUrl, arquivo_nome: exame.arquivoNome, arquivo_tipo: exame.arquivoTipo, mes: exame.mes });
  };

  const deleteExame = (id) => {
    setExames(prev => prev.filter(e => e.id !== id));
    dbDelete('exames_complementares', id);
  };

  const addRegistroReproducao = (r) => {
    setRegistrosReproducao(prev => [r, ...prev]);
    dbInsert('reproducao_registros', { id: r.id, egua_id: r.eguaId, data: r.data, tipo: r.tipo, dados: r.dados || {}, insumos_usados: r.insumosUsados || [], data_retorno: r.dataRetorno || null, autor: r.autor || '', mes: r.mes });
  };
  const deleteRegistroReproducao = (id) => {
    setRegistrosReproducao(prev => prev.filter(r => r.id !== id));
    dbDelete('reproducao_registros', id);
  };

  // ── Custos Fixos CRUD ────────────────────────────────────
  const addCustoFixo = (c) => {
    setCustosFixos(prev => [c, ...prev]);
    dbInsert('custos_fixos', toDbCustoFixo(c));
  };
  const updateCustoFixo = (id, data) => {
    setCustosFixos(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    dbUpdate('custos_fixos', id, partialToDb(data, CUSTO_FIXO_MAP));
  };
  const deleteCustoFixo = (id) => {
    setCustosFixos(prev => prev.filter(c => c.id !== id));
    dbDelete('custos_fixos', id);
  };

  // ── Ordem dos grupos de nutrição ─────────────────────────
  const updateNutricaoOrdem = (ordem) => {
    setNutricaoOrdem(ordem);
    dbUpdate('configuracoes', 'global', { nutricao_ordem: ordem });
  };

  // ── Estoque de compras CRUD ───────────────────────────────
  const addEstoqueCompra = (data) => {
    const ecId = 'ec_' + Date.now();
    const ins = insumos.find(i => i.id === data.insumoId);
    let lancamentoId = null;

    if (data.tipo !== 'ajuste' && (data.valorTotal || 0) > 0) {
      const lancId = 'lan_' + ecId;
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
  const addInsumo = async (ins) => {
    setInsumos(prev => [...prev, ins]);
    const ok = await dbInsert('insumos', toDbInsumo(ins));
    if (!ok) setInsumos(prev => prev.filter(i => i.id !== ins.id));
    return ok;
  };
  const updateInsumo = async (id, data) => {
    const prevState = insumos;
    setInsumos(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
    const ok = await dbUpdate('insumos', id, partialToDb(data, INSUMO_MAP));
    if (!ok) setInsumos(prevState);
    return ok;
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
    dbUpdate('funcionarios', id, partialToDb(data, FUNCIONARIO_MAP));
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
    const newId = 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newCavalo = { id: newId, ...data };
    setCavalos(prev => [...prev, newCavalo]);
    const ok = await dbInsert('cavalos', toDbCavalo(newCavalo));
    if (!ok) {
      setCavalos(prev => prev.filter(c => c.id !== newId));
      return null;
    }
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
    // Sufixo aleatório para evitar colisão em cliques duplos / multi-usuário.
    const newId = 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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
    let merged = null;
    setPartos(prev => prev.map(p => {
      if (p.id !== id) return p;
      merged = { ...p, ...data };
      return merged;
    }));
    if (merged) {
      const dbRow = toDbParto(merged);
      delete dbRow.id;
      dbUpdate('partos', id, dbRow);
    }
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
    // Remove o lançamento de entrada vinculado, se existir
    const lanId = `lan_${id}`;
    setLancamentos(prev => prev.filter(l => l.id !== lanId));
    dbDelete('financeiro_lancamentos', lanId);
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
  const addFaturaFechada = async (f) => {
    const prevSnapshot = faturasFechadas;
    setFaturasFechadas(prev => [...prev.filter(x => !(x.proprietarioId === f.proprietarioId && x.ano === f.ano && x.mes === f.mes)), f]);
    // Upsert: refechar (após Desfazer) ou auto-fechar bater com manual sobrescreve em vez de quebrar com PK duplicada.
    const ok = await dbUpsert('faturas_fechadas', toDbFaturaFechada(f));
    if (!ok) {
      // DB rejeitou (coluna faltando, RLS, etc.) — desfaz o estado otimista
      // para que o usuário NÃO veja "fechada ✓" enganosamente.
      setFaturasFechadas(prevSnapshot);
      return false;
    }
    // Cria lançamento de entrada apenas para faturas com competência >= cutoff (junho/2026).
    // Competências anteriores são fechadas sem lançar — o usuário cadastrará atrasos manualmente.
    if ((f.total || 0) > 0 && isCompetenciaAptaParaLancamento(f.ano, f.mes)) {
      const prop = proprietarios.find(p => p.id === f.proprietarioId);
      const mesNome = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][f.mes - 1];
      // Vencimento = data de fechamento + 5 dias (editável depois individualmente)
      const fechadaEm = f.fechadaEm ? new Date(f.fechadaEm) : new Date();
      const vencD = new Date(fechadaEm);
      vencD.setDate(vencD.getDate() + 5);
      const dataLanc = vencD.toLocaleDateString('sv-SE');
      const vencimentoStr = vencD.toLocaleDateString('pt-BR');
      const lanc = {
        id: `lan_${f.id}`,
        tipo: 'entrada',
        valor: f.total,
        data: dataLanc,
        quem: prop?.nome || f.proprietarioNome || '',
        motivo: `Fatura ${mesNome}/${f.ano} — ${prop?.nome || f.proprietarioNome || ''} (venc. ${vencimentoStr})`,
        categoria: 'Faturamento clientes',
        pago: false,
        pagoEm: null,
        recorrenciaId: null,
        _faturaFechadaId: f.id,
      };
      setLancamentos(prev => [lanc, ...prev.filter(l => l.id !== lanc.id)]);
      // Upsert para tolerar PK duplicada quando a fatura é reaberta e refechada.
      dbUpsert('financeiro_lancamentos', toDbLancamento(lanc));
    }
    return true;
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

  // ── Auto-fechar faturas dos meses anteriores ─────────────────
  // Roda uma vez por sessão, depois do carregamento dos dados.
  // Fecha todas as faturas de competências anteriores ao mês atual que ainda
  // não estão fechadas. Para competências < cutoff (junho/2026), addFaturaFechada
  // não cria lançamento de entrada — exatamente o comportamento desejado.
  const autoFechouRef = useRef(false);
  useEffect(() => {
    if (autoFechouRef.current) return;
    if (loading) return;
    if (proprietarios.length === 0 || cavalos.length === 0) return;
    autoFechouRef.current = true;

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;
    const deps = { cavalos, registros, procedimentos, servicos, insumos, movimentacoes, custosFixos };

    const fechamentos = [];
    // Volta até 24 meses ou até encontrar 3 meses consecutivos sem nada para fechar
    let mesesConsecutivosVazios = 0;
    for (let i = 1; i <= 24 && mesesConsecutivosVazios < 3; i++) {
      const d = new Date(anoAtual, mesAtual - 1 - i, 1);
      const ano = d.getFullYear();
      const mes = d.getMonth() + 1;
      const ref = { ano, mes };
      let fechadosEsseMes = 0;

      proprietarios.forEach(prop => {
        // Epona Stud (próprio) não tem fatura.
        if (isProprietarioProprio(prop, empresaInfo)) return;
        const jaFechada = faturasFechadas.find(f => f.proprietarioId === prop.id && f.ano === ano && f.mes === mes);
        if (jaFechada) return;
        const r = calcFaturaProprietario(prop.id, ref, deps);
        if (r.cavalosObj.length === 0) return;
        if (r.total <= 0) return;

        const linhas = [
          ...r.propMens.map(m => ({ tipo: 'mensalidade', cavaloId: m.cav.id, cavaloNome: m.cav.nome, dias: m.dias, totalDias: m.total, parcial: m.parcial, valor: m.valor / m.share, valorBase: m.valorBase, share: m.share })),
          ...r.propPerfil.flatMap(pp => pp.linhas.map(l => {
            const shareValor = (l.valorMes || l.valor || 0) / pp.share;
            return { tipo: 'perfil', cavaloId: pp.cav.id, cavaloNome: pp.cav.nome, dias: pp.dias, ...l, valorMes: shareValor, valor: shareValor, share: pp.share };
          })),
          ...r.insumosLinhas.map(l => ({ tipo: 'insumo', cavaloId: l.cav?.id, cavaloNome: l.cav?.nome, insumoId: l.ins?.id, insumoNome: l.ins?.nome, qtd: l.reg.qtd, valor: l.total, share: l.share, data: l.reg.data })),
          ...r.procLinhas.map(l => ({ tipo: 'procedimento', cavaloId: l.cav?.id, cavaloNome: l.cav?.nome, servicoId: l.proc.servicoId, servicoNome: l.nomeSv, data: l.proc.data, valor: l.total, share: l.share })),
          ...r.cfLinhas.map(l => ({ tipo: 'custoFixo', cavaloId: l.cav.id, cavaloNome: l.cav.nome, dias: l.dias, totalDias: l.totalDias, valor: l.valor, share: l.share, cotaMensal: l.cotaMensal })),
        ];

        fechamentos.push({
          id: `ff_${prop.id}_${ano}_${mes}`,
          proprietarioId: prop.id, proprietarioNome: prop.nome,
          ano, mes,
          total: r.total, mensalidades: r.mensalidades, perfilNutricional: r.perfilNutricional,
          insumosAvulsos: r.insumosAvulsos, procedimentosAvulsos: r.procedimentosAvulsos,
          custoFixoRateado: r.custoFixoRateado,
          linhas, fechadaPor: 'Sistema (auto)',
          fechadaEm: new Date().toISOString(),
        });
        fechadosEsseMes++;
      });

      if (fechadosEsseMes === 0) mesesConsecutivosVazios++;
      else mesesConsecutivosVazios = 0;
    }

    if (fechamentos.length > 0) {
      console.log(`[Auto-fechar] ${fechamentos.length} fatura(s) anteriores serão fechadas (sem lançar em Entradas para competências < ${CUTOFF_LANCAMENTO})`);
      fechamentos.forEach(f => addFaturaFechada(f));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, proprietarios.length, cavalos.length]);

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

  // ── Banner global de erros ────────────────────────────────────
  const ErrorBanners = () => (
    <>
      {loadError && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#fee2e2', borderBottom: '1px solid #fecaca', color: '#991b1b', padding: '10px 16px', fontFamily: 'var(--sans)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span>⚠️ Falha ao carregar dados: {loadError}</span>
          <button onClick={() => { setLoadError(null); loadAllData(); }} style={{ background: '#991b1b', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Tentar novamente</button>
        </div>
      )}
      {dbErrorMsg && (
        <div style={{ position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 9999, background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 12px', borderRadius: 10, fontFamily: 'var(--sans)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <span>⚠️ {dbErrorMsg}</span>
          <button onClick={() => setDbErrorMsg(null)} style={{ background: 'none', border: 'none', color: '#991b1b', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>
      )}
    </>
  );

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
  else if (screen === 'nutricional') content = <NutricionalScreen setScreen={goScreen} setSelected={setSelected} cavalos={cavalos} insumos={insumos} currentUser={currentUser} updateCavalo={updateCavalo} addAviso={addAviso} removeAviso={removeAviso} nutricaoOrdem={nutricaoOrdem} updateNutricaoOrdem={updateNutricaoOrdem} />;
  else if (screen === 'compras') content = <ListaComprasScreen compras={compras} addCompra={addCompra} deleteCompra={deleteCompra} toggleCompra={toggleCompra} currentUser={currentUser} />;
  else if (screen === 'movimentacao') content = <MovimentacaoScreen setScreen={goScreen} addMovimentacao={addMovimentacao} addAviso={addAviso} addAtividade={addAtividade} cavalos={cavalos} proprietarios={proprietarios} novoCavaloPendente={novoCavaloPendente} setNovoCavaloPendente={setNovoCavaloPendente} setPendingEntradaCavalo={setPendingEntradaCavalo} servicos={servicos} addProcedimento={addProcedimento} updateCavalo={updateCavalo} insumos={insumos} addRegistro={addRegistro} currentUser={currentUser} />;
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
  else if (screen === 'faturas') content = <FinanceiroScreen setScreen={goScreen} setSelected={setSelected} registros={registros} insumos={insumos} proprietarios={proprietarios} cavalos={cavalos} movimentacoes={movimentacoes} faturaRef={faturaRef} setFaturaRef={setFaturaRef} faturasFechadas={faturasFechadas} procedimentos={procedimentos} servicos={servicos} lancamentos={lancamentos} addLancamento={addLancamento} updateLancamento={updateLancamento} deleteLancamento={deleteLancamento} recorrencias={recorrencias} addRecorrencia={addRecorrencia} deleteRecorrencia={deleteRecorrencia} updateRecorrencia={updateRecorrencia} estoqueCompras={estoqueCompras} addEstoqueCompra={addEstoqueCompra} deleteEstoqueCompra={deleteEstoqueCompra} currentUser={currentUser} custosFixos={custosFixos} updateCustoFixo={updateCustoFixo} />;
  else if (screen === 'consumo') content = <ConsumoScreen setScreen={goScreen} cavalos={cavalos} insumos={insumos} custosFixos={custosFixos} proprietarios={proprietarios} />;
  else if (screen === 'custosFixos') content = <CustosFixosScreen custosFixos={custosFixos} funcionarios={funcionarios} cavalos={cavalos} addCustoFixo={addCustoFixo} updateCustoFixo={updateCustoFixo} deleteCustoFixo={deleteCustoFixo} onBack={() => goScreen('faturas')} />;
  else if (screen === 'faturaDetalhe') content = <FaturaDetalheScreen id={selected} setScreen={goScreen} setSelected={setSelected} registros={registros} proprietarios={proprietarios} cavalos={cavalos} insumos={insumos} movimentacoes={movimentacoes} faturaRef={faturaRef} faturasFechadas={faturasFechadas} addFaturaFechada={addFaturaFechada} removeFaturaFechada={removeFaturaFechada} currentUser={currentUser} empresaInfo={empresaInfo} procedimentos={procedimentos} servicos={servicos} deleteRegistro={deleteRegistro} updateRegistro={updateRegistro} deleteProcedimento={deleteProcedimento} custosFixos={custosFixos} />;
  else if (screen === 'planner') content = <PlannerScreen setScreen={goScreen} setSelected={setSelected} funcionarios={funcionarios} currentUser={currentUser} notas={notas} setNotas={setNotas} eventos={eventos} addEvento={addEvento} removeEvento={removeEvento} />;
  else if (screen === 'funcionarios') content = <FuncionariosScreen setScreen={goScreen} setSelected={setSelected} funcionarios={funcionarios} currentUser={currentUser} />;
  else if (screen === 'funcionarioDetalhe') content = <FuncionarioDetalheScreen id={selected} setScreen={goScreen} backTo={tab === 'equipe' ? 'planner' : 'funcionarios'} funcionarios={funcionarios} addFuncionario={addFuncionario} updateFuncionario={updateFuncionario} deleteFuncionario={deleteFuncionario} />;
  else if (screen === 'minhaConta') content = <MinhaContaScreen currentUser={currentUser} funcionarios={funcionarios} onSave={updateMinhaConta} onLogout={handleLogout} setScreen={goScreen} />;
  else if (screen === 'partos') content = <VeterinariaScreen setScreen={goScreen} setSelected={setSelected} partos={partos} cavalos={cavalos} proprietarios={proprietarios} movimentacoes={movimentacoes} insumos={insumos} servicos={servicos} registros={registros} procedimentos={procedimentos} empresaInfo={empresaInfo} currentUser={currentUser} addRegistro={addRegistro} addAtividade={addAtividade} addProcedimento={addProcedimento} addAviso={addAviso} deleteRegistro={deleteRegistro} deleteProcedimento={deleteProcedimento} protocolosVacinacao={protocolosVacinacao} vacinacoesAnimais={vacinacoesAnimais} addProtocoloVacinacao={addProtocoloVacinacao} updateProtocoloVacinacao={updateProtocoloVacinacao} deleteProtocoloVacinacao={deleteProtocoloVacinacao} upsertVacinacaoAnimal={upsertVacinacaoAnimal} protocolosVermifugacao={protocolosVermifugacao} vermifugacoesAnimais={vermifugacoesAnimais} opgs={opgs} addProtocoloVermifugacao={addProtocoloVermifugacao} updateProtocoloVermifugacao={updateProtocoloVermifugacao} deleteProtocoloVermifugacao={deleteProtocoloVermifugacao} addVermifugacaoAnimal={addVermifugacaoAnimal} addOpg={addOpg} updateOpg={updateOpg} deleteOpg={deleteOpg} medicoes={medicoes} addMedicao={addMedicao} updateMedicao={updateMedicao} deleteMedicao={deleteMedicao} anotacoesClinicas={anotacoesClinicas} addAnotacaoClinica={addAnotacaoClinica} updateAnotacaoClinica={updateAnotacaoClinica} deleteAnotacaoClinica={deleteAnotacaoClinica} exames={exames} uploadExame={uploadExame} deleteExame={deleteExame} registrosReproducao={registrosReproducao} addRegistroReproducao={addRegistroReproducao} deleteRegistroReproducao={deleteRegistroReproducao} />;
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
  const showMainTabs = !loading && currentUser && !isOperacional && ['home','cavalos','cavaloDetalhe','editarCavalo','addCavalo','cadastros','cadProprietarios','cadCavalos','cadInsumos','cadMensalidades','cadServicos','cadEmpresa','addInsumo','editarInsumo','proprietarioDetalhe','faturas','faturaDetalhe','nutricional','compras','planner','funcionarios','funcionarioDetalhe','minhaConta','partos','registrarParto','partoDetalhe','eguaGestanteDetalhe','registrarProcedimento','historico','consumo','veterinaria'].includes(screen);
  const showOperacionalTabs = !loading && isOperacional && ['avisos','nutricional','compras','planner','funcionarioDetalhe','minhaConta','historico'].includes(screen);

  return (
    <>
      <ErrorBanners />
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
