// app.jsx — Main App Epona shell
const { useState, useEffect } = React;

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "defaultFlow": "cavalo"
}/*EDITMODE-END*/;

function AppEpona() {
  const [tab, setTab] = useState('home');
  const [screen, setScreen] = useState('home'); // home, cavalos, cavaloDetalhe, registrar, cadastros, etc
  const [selected, setSelected] = useState(null);
  const [cavalos, setCavalos] = useState(CAVALOS);
  const [proprietarios, setProprietarios] = useState(PROPRIETARIOS);
  const [registros, setRegistros] = useState(REGISTROS_HOJE);
  const [avisos, setAvisos] = useState(AVISOS);
  const [movimentacoes, setMovimentacoes] = useState(MOVIMENTACOES);
  const [novoCavaloPendente, setNovoCavaloPendente] = useState(null);
  const [pendingEntradaCavalo, setPendingEntradaCavalo] = useState(false);
  const [fluxo, setFluxo] = useState(null);
  const [tweaks, setTweak] = useTweaks(TWEAKS_DEFAULTS);

  const addRegistro = (r) => setRegistros(prev => [...prev, r]);
  const addAviso = (a) => setAvisos(prev => [a, ...prev]);
  const addMovimentacao = (m) => setMovimentacoes(prev => [...prev, m]);
  
  const updateCavalo = (id, updatedData) => {
    setCavalos(prev => prev.map(c => c.id === id ? { ...c, ...updatedData } : c));
  };
  
  const deleteCavalo = (id) => {
    setCavalos(prev => prev.filter(c => c.id !== id));
  };

  const addProprietario = (nome) => {
    const maxId = Math.max(...proprietarios.map(p => parseInt(p.id.substring(1))));
    const newId = 'p' + (maxId + 1);
    const novoProp = { id: newId, nome, telefone: '', email: '', cavalos: [] };
    setProprietarios(prev => [...prev, novoProp]);
    return newId;
  };

  const updateProprietario = (id, updatedData) => {
    setProprietarios(prev => prev.map(p => p.id === id ? { ...p, ...updatedData } : p));
  };

  // Sync tab → screen
  useEffect(() => {
    if (tab === 'home') setScreen('home');
    if (tab === 'cavalos') setScreen('cavalos');
    if (tab === 'cadastros') setScreen('cadastros');
    if (tab === 'faturas') setScreen('faturas');
  }, [tab]);

  // Quando entra em registrar, usa fluxo padrão dos tweaks
  useEffect(() => {
    if (screen === 'registrar' && !fluxo) {
      setFluxo(tweaks.defaultFlow);
    }
    if (screen !== 'registrar') {
      setFluxo(null);
    }
  }, [screen]);

  const goScreen = (s) => {
    setScreen(s);
    if (s === 'home') setTab('home');
    if (s === 'cavalos' || s === 'addCavalo') setTab('cavalos');
    if (s === 'cadastros' || s.startsWith('cad')) setTab('cadastros');
    if (s === 'faturas' || s === 'faturaDetalhe') setTab('faturas');
  };

  let content;
  if (screen === 'home') content = <HomeScreen registros={registros} setScreen={goScreen} density={tweaks.density} avisos={avisos} />;
  else if (screen === 'avisos') content = <AvisosScreen setScreen={goScreen} avisos={avisos} addAviso={addAviso} />;
  else if (screen === 'movimentacao') content = <MovimentacaoScreen setScreen={goScreen} addMovimentacao={addMovimentacao} addAtividade={addAviso} cavalos={cavalos} proprietarios={proprietarios} novoCavaloPendente={novoCavaloPendente} setNovoCavaloPendente={setNovoCavaloPendente} setPendingEntradaCavalo={setPendingEntradaCavalo} />;
  else if (screen === 'cavalos') content = <CavalosScreen setScreen={goScreen} setSelected={setSelected} density={tweaks.density} cavalos={cavalos} setCavalos={setCavalos} proprietarios={proprietarios} />;
  else if (screen === 'addCavalo') content = <AddCavaloScreen setScreen={goScreen} setCavalos={setCavalos} cavalos={cavalos} setNovoCavaloPendente={setNovoCavaloPendente} pendingEntradaCavalo={pendingEntradaCavalo} setPendingEntradaCavalo={setPendingEntradaCavalo} proprietarios={proprietarios} addProprietario={addProprietario} />;
  else if (screen === 'cavaloDetalhe') content = <CavaloDetalheScreen id={selected} setScreen={goScreen} registros={registros} setSelected={setSelected} cavalos={cavalos} updateCavalo={updateCavalo} deleteCavalo={deleteCavalo} proprietarios={proprietarios} />;
  else if (screen === 'editarCavalo') content = <EditarCavaloScreen id={selected} setScreen={goScreen} cavalos={cavalos} updateCavalo={updateCavalo} deleteCavalo={deleteCavalo} proprietarios={proprietarios} />;
  else if (screen === 'proprietarioDetalhe') content = <ProprietarioScreen id={selected} setScreen={goScreen} proprietarios={proprietarios} cavalos={cavalos} updateProprietario={updateProprietario} />;
  else if (screen === 'cadastros') content = <CadastrosScreen setScreen={goScreen} />;
  else if (screen === 'cadProprietarios') content = <CadProprietariosScreen setScreen={goScreen} setSelected={setSelected} proprietarios={proprietarios} cavalos={cavalos} addProprietario={addProprietario} />;
  else if (screen === 'cadCavalos') content = <CadCavalosScreen setScreen={goScreen} setSelected={setSelected} cavalos={cavalos} deleteCavalo={deleteCavalo} proprietarios={proprietarios} />;
  else if (screen === 'cadInsumos') content = <CadInsumosScreen setScreen={goScreen} />;
  else if (screen === 'cadMensalidades') content = <CadMensalidadesScreen setScreen={goScreen} />;
  else if (screen === 'faturas') content = <FaturasScreen setScreen={goScreen} setSelected={setSelected} registros={registros} />;
  else if (screen === 'faturaDetalhe') content = <FaturaDetalheScreen id={selected} setScreen={goScreen} registros={registros} proprietarios={proprietarios} />;
  else if (screen === 'registrar') {
    if (!fluxo) content = <RegistrarHub setScreen={goScreen} setFluxo={setFluxo} />;
    else if (fluxo === 'cavalo') content = <RegistrarPorCavalo setScreen={goScreen} addRegistro={addRegistro} />;
    else if (fluxo === 'insumo') content = <RegistrarPorInsumo setScreen={goScreen} addRegistro={addRegistro} />;
    else if (fluxo === 'setor') content = <RegistrarPorSetor setScreen={goScreen} addRegistro={addRegistro} />;
  }

  const showTabs = ['home', 'cavalos', 'cadastros', 'faturas'].includes(screen);

  return (
    <>
      <IOSDevice color="space-black" hasDynamicIsland={false} time="06:42">
        <div data-screen-label={`App · ${screen}`} style={{
          position: 'absolute', inset: 0,
          background: 'var(--bg)', overflow: 'hidden',
          fontFamily: 'var(--sans)',
          display: 'flex', flexDirection: 'column',
        }}>
          <IOSStatusBar dark={false} time="06:42" />
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {content}
          </div>
          {showTabs && <TabBar tab={tab} setTab={setTab} />}
        </div>
      </IOSDevice>

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

ReactDOM.createRoot(document.getElementById('root')).render(<AppEpona />);
