// insumos-proprietario.jsx — Farmácia/estoque particular do
// PROPRIETÁRIO: insumos que ele comprou e trouxe para o haras.
//
// Vale para qualquer insumo — ração, feno, serragem, suplemento,
// medicamento, vacina, vermífugo. É direito dele trazer e não ser
// cobrado. Diferente da farmácia compartilhada do haras, aqui a
// quantidade é controlada de verdade, porque é o saldo que decide o que
// entra na fatura.
//
// Duas mecânicas sobre o mesmo saldo (ver utils/insumosProp.js):
//  - por registro: cada uso baixa do saldo; passou do saldo, é cobrado
//  - periódico (dieta): consumo projetado; ao acabar não cobra, só avisa
//
// O estoque é do proprietário + insumo, e os cavalos que consomem dele
// são escolhidos um por um: ele pode trazer para um cavalo só.

import React, { useState, useMemo } from 'react';
import { Icon } from './icons';
import { TopBar } from './screens';
import {
  calcEstoqueProp, STATUS_META, hojeIso, precisaReposicao,
} from './utils/insumosProp';

export { calcEstoqueProp };

const fmtDataBr = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const fmtNum = (v) => {
  const n = Number(v) || 0;
  const s = n % 1 === 0 ? String(n) : n.toFixed(2).replace(/0$/, '');
  return s.replace('.', ',');
};

// ─────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '9px 10px', borderRadius: 9,
  border: '1px solid var(--line)', background: 'var(--card)',
  color: 'var(--ink)', fontSize: 14, fontFamily: 'var(--sans)',
};
const cardStyle = {
  background: 'var(--card)', border: '1px solid var(--line)',
  borderRadius: 12, padding: 12, marginBottom: 10,
};
const btnPrim = {
  padding: '10px 14px', borderRadius: 10, border: 'none',
  background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700,
  fontFamily: 'var(--sans)', cursor: 'pointer',
};
const btnGhost = {
  padding: '8px 12px', borderRadius: 9, border: '1px solid var(--line)',
  background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13,
  fontFamily: 'var(--sans)', cursor: 'pointer',
};
const rotulo = {
  fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase',
  letterSpacing: '0.06em', fontWeight: 700, marginBottom: 5,
};

const Badge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.ok;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6,
      background: m.bg, color: m.ink, whiteSpace: 'nowrap',
    }}>{m.label}</span>
  );
};

// ─────────────────────────────────────────────────────────────
// Tela
// ─────────────────────────────────────────────────────────────
export function InsumosProprietarioScreen({
  setScreen, cavalos = [], proprietarios = [], insumos = [], registros = [],
  insumosProp = [], addInsumoProp, updateInsumoProp, deleteInsumoProp,
  updateCavalo, currentUser,
}) {
  const hoje = hojeIso();
  const podeEditar = currentUser?.role === 'admin' || currentUser?.role === 'vet';

  const [novoAberto, setNovoAberto] = useState(false);
  const [nPropId, setNPropId] = useState('');
  const [nInsumoId, setNInsumoId] = useState('');
  const [nCavalos, setNCavalos] = useState([]);
  const [nQtd, setNQtd] = useState('');
  const [nData, setNData] = useState(hoje);
  const [entregaAberta, setEntregaAberta] = useState(null); // stockId
  const [eQtd, setEQtd] = useState('');
  const [eData, setEData] = useState(hoje);
  const [histAberto, setHistAberto] = useState(new Set());

  const insumoNome = (id) => insumos.find(i => i.id === id)?.nome || id;
  const insumoUnid = (id) => insumos.find(i => i.id === id)?.unidade || '';
  const propNome = (id) => proprietarios.find(p => p.id === id)?.nome || '—';
  const cavaloNome = (id) => cavalos.find(c => c.id === id)?.nome || id;

  // Cavalos de um proprietário (titularidade atual)
  const cavalosDoProp = (propId) => cavalos.filter(c =>
    (c.proprietarioIds || (c.proprietarioId ? [c.proprietarioId] : [])).includes(propId));

  // Suplementos que aparecem na dieta de algum cavalo daquele dono —
  // é o conjunto útil pra escolher. Se o insumo não está na dieta de
  // ninguém, ainda assim deixamos escolher (ele pode cadastrar a dieta
  // depois), então a lista cai pra todos os suplementos.
  // Qualquer insumo serve: ração, feno, serragem, medicamento, vacina,
  // vermífugo. Agrupa por categoria só para a lista não virar uma sopa.
  const insumosEscolhiveis = useMemo(() => insumos.slice().sort((a, b) =>
    (a.categoria || '').localeCompare(b.categoria || '', 'pt')
    || (a.nome || '').localeCompare(b.nome || '', 'pt')), [insumos]);

  // Marca/desmarca o flag que a fatura lê (screens.jsx: calcPerfilMes).
  // Só mexe no suplemento daquele insumo; o resto da dieta fica intacto.
  const marcarFornecido = (cavaloId, insumoId, valor) => {
    const cav = cavalos.find(c => c.id === cavaloId);
    if (!cav || !updateCavalo) return;
    const sups = cav.nutricao?.suplementos || [];
    if (!sups.some(s => s.insumoId === insumoId)) return; // não está na dieta
    const novos = sups.map(s => s.insumoId === insumoId
      ? (valor ? { ...s, fornecidoProp: true } : { ...s, fornecidoProp: undefined })
      : s);
    updateCavalo(cavaloId, { nutricao: { ...(cav.nutricao || {}), suplementos: novos } });
  };

  const linhas = useMemo(() => {
    return insumosProp
      .filter(s => s.ativo !== false)
      .map(s => ({ stock: s, calc: calcEstoqueProp(s, cavalos, registros, hoje) }))
      .sort((a, b) => {
        const oa = STATUS_META[a.calc.status]?.ordem ?? 9;
        const ob = STATUS_META[b.calc.status]?.ordem ?? 9;
        if (oa !== ob) return oa - ob;
        return insumoNome(a.stock.insumoId).localeCompare(insumoNome(b.stock.insumoId), 'pt');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insumosProp, cavalos, registros, hoje, insumos]);

  const alertas = linhas.filter(l => precisaReposicao(l.calc));

  const salvarNovo = async () => {
    const qtd = parseFloat(String(nQtd).replace(',', '.'));
    if (!nPropId || !nInsumoId) return;
    const entregas = (qtd > 0 && nData) ? [{ data: nData, qtd }] : [];
    const criado = await addInsumoProp?.({
      proprietarioId: nPropId, insumoId: nInsumoId,
      cavaloIds: nCavalos, entregas, ativo: true,
    });
    if (criado) nCavalos.forEach(cid => marcarFornecido(cid, nInsumoId, true));
    setNovoAberto(false);
    setNPropId(''); setNInsumoId(''); setNCavalos([]); setNQtd(''); setNData(hoje);
  };

  const registrarEntrega = (stock) => {
    const qtd = parseFloat(String(eQtd).replace(',', '.'));
    if (!(qtd > 0) || !eData) return;
    updateInsumoProp?.(stock.id, {
      entregas: [...(stock.entregas || []), { data: eData, qtd }],
    });
    setEntregaAberta(null); setEQtd(''); setEData(hoje);
  };

  const toggleCavaloNoEstoque = (stock, cavaloId) => {
    const atual = stock.cavaloIds || [];
    const dentro = atual.includes(cavaloId);
    const novos = dentro ? atual.filter(x => x !== cavaloId) : [...atual, cavaloId];
    updateInsumoProp?.(stock.id, { cavaloIds: novos });
    marcarFornecido(cavaloId, stock.insumoId, !dentro);
  };

  const removerEstoque = (stock) => {
    if (!window.confirm(`Remover o estoque de ${insumoNome(stock.insumoId)} de ${propNome(stock.proprietarioId)}?\n\nOs cavalos vinculados voltam a ser cobrados por esse insumo.`)) return;
    (stock.cavaloIds || []).forEach(cid => marcarFornecido(cid, stock.insumoId, false));
    deleteInsumoProp?.(stock.id);
  };

  const toggleHist = (id) => setHistAberto(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar
        title="Insumos de proprietários"
        subtitle={`${linhas.length} em controle${alertas.length ? ` · ${alertas.length} precisa(m) de reposição` : ''}`}
        onBack={() => setScreen('cadastros')}
      />

      <div style={{ padding: '10px 14px 0' }}>
        <div style={{
          ...cardStyle, background: 'var(--bg)', fontSize: 12,
          color: 'var(--ink-2)', lineHeight: 1.5,
        }}>
          Insumo que o <strong style={{ color: 'var(--ink)' }}>proprietário comprou e trouxe</strong> —
          ração, feno, serragem, medicamento, vacina, vermífugo, suplemento.
          Enquanto houver saldo, o uso não é cobrado dele.
          <br /><br />
          <strong style={{ color: 'var(--ink)' }}>Uso avulso</strong> (medicamento, vacina): cada registro baixa do
          saldo; o que passar do saldo volta a ser cobrado.
          <br />
          <strong style={{ color: 'var(--ink)' }}>Uso na dieta</strong> (suplemento, ração): o consumo diário é
          descontado e o app avisa quando está acabando. Ao acabar não volta
          a cobrar sozinho — se o haras seguir com insumo próprio, isso é
          cadastrado na dieta normalmente e aí sim é cobrado.
        </div>

        {alertas.length > 0 && (
          <div style={{
            ...cardStyle, background: '#fffbeb', border: '1px solid #fcd34d',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
              Avisar o proprietário
            </div>
            {alertas.map(({ stock, calc }) => (
              <div key={stock.id} style={{ fontSize: 13, color: '#78350f', marginBottom: 3 }}>
                {propNome(stock.proprietarioId)} · {insumoNome(stock.insumoId)} —{' '}
                {calc.status === 'acabou'
                  ? 'acabou'
                  : `acaba em ${calc.diasRestantes} dia(s), ${fmtDataBr(calc.dataTermino)}`}
              </div>
            ))}
          </div>
        )}

        {podeEditar && !novoAberto && (
          <button onClick={() => setNovoAberto(true)} style={{ ...btnPrim, width: '100%', marginBottom: 12 }}>
            + Registrar insumo trazido
          </button>
        )}

        {novoAberto && (
          <div style={{ ...cardStyle, border: '1.5px solid var(--accent)' }}>
            <div style={{ ...rotulo, marginBottom: 8 }}>Novo insumo de proprietário</div>

            <div style={{ marginBottom: 10 }}>
              <div style={rotulo}>Proprietário</div>
              <select value={nPropId} onChange={e => { setNPropId(e.target.value); setNCavalos([]); }} style={inputStyle}>
                <option value="">— Selecione —</option>
                {[...proprietarios].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'))
                  .map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={rotulo}>Insumo</div>
              <select value={nInsumoId} onChange={e => setNInsumoId(e.target.value)} style={inputStyle}>
                <option value="">— Selecione —</option>
                {insumosEscolhiveis.map(i => (
                  <option key={i.id} value={i.id}>{i.categoria ? `[${i.categoria}] ` : ''}{i.nome}{i.unidade ? ` (${i.unidade})` : ''}</option>
                ))}
              </select>
            </div>

            {nPropId && (
              <div style={{ marginBottom: 10 }}>
                <div style={rotulo}>Cavalos que vão consumir desse estoque</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>
                  Marque um por um. Não vale automaticamente para todos os cavalos dele.
                </div>
                {cavalosDoProp(nPropId).length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Esse proprietário não tem cavalos cadastrados.</div>
                )}
                {cavalosDoProp(nPropId).map(c => {
                  const sup = (c.nutricao?.suplementos || []).find(s => s.insumoId === nInsumoId);
                  return (
                    <label key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                      fontSize: 13, color: 'var(--ink)', cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={nCavalos.includes(c.id)}
                        onChange={e => setNCavalos(prev => e.target.checked
                          ? [...prev, c.id] : prev.filter(x => x !== c.id))}
                      />
                      <span style={{ flex: 1 }}>{c.nome}</span>
                      <span style={{ fontSize: 11, color: sup ? 'var(--ink-3)' : '#b45309' }}>
                        {nInsumoId
                          ? (sup ? `${fmtNum(sup.qtdDia)} ${insumoUnid(nInsumoId)}/dia na dieta` : 'uso avulso')
                          : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={rotulo}>Quantidade entregue</div>
                <input value={nQtd} onChange={e => setNQtd(e.target.value)} inputMode="decimal"
                  placeholder={insumoUnid(nInsumoId) || '0'} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={rotulo}>Data da entrega</div>
                <input type="date" value={nData} onChange={e => setNData(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={salvarNovo} disabled={!nPropId || !nInsumoId}
                style={{ ...btnPrim, flex: 1, opacity: (!nPropId || !nInsumoId) ? 0.5 : 1 }}>
                Salvar
              </button>
              <button onClick={() => setNovoAberto(false)} style={btnGhost}>Cancelar</button>
            </div>
          </div>
        )}

        {linhas.length === 0 && !novoAberto && (
          <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            Nenhum insumo de proprietário em controle.
          </div>
        )}

        {linhas.map(({ stock, calc }) => {
          const unid = insumoUnid(stock.insumoId);
          return (
            <div key={stock.id} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                    {insumoNome(stock.insumoId)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {propNome(stock.proprietarioId)}
                  </div>
                </div>
                <Badge status={calc.status} />
              </div>

              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>SALDO</div>
                  <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 700 }}>
                    {fmtNum(calc.saldo)}{unid ? ` ${unid}` : ''}
                    <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-3)' }}>
                      {' '}de {fmtNum(calc.totalEntregue)}
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>CONSUMO</div>
                  <div style={{ fontSize: 14, color: 'var(--ink)' }}>
                    {calc.consumoDia > 0 ? `${fmtNum(calc.consumoDia)}${unid ? ` ${unid}` : ''}/dia` : '—'}
                  </div>
                  {calc.consumidoRegistros > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                      + {fmtNum(calc.consumidoRegistros)}{unid ? ` ${unid}` : ''} em registros
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>PREVISÃO</div>
                  <div style={{
                    fontSize: 14,
                    color: calc.status === 'acabou' ? '#991b1b' : calc.status === 'acabando' ? '#92400e' : 'var(--ink)',
                  }}>
                    {calc.status === 'acabou' ? 'Acabou'
                      : calc.dataTermino ? `${fmtDataBr(calc.dataTermino)} (${calc.diasRestantes}d)`
                      : '—'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 8 }}>
                <span style={{ color: 'var(--ink-3)' }}>Cavalos: </span>
                {(stock.cavaloIds || []).length
                  ? (stock.cavaloIds || []).map(cavaloNome).join(', ')
                  : 'nenhum vinculado'}
              </div>

              {podeEditar && (
                <>
                  <div style={{ ...rotulo, marginTop: 10 }}>Vincular cavalos deste proprietário</div>
                  {cavalosDoProp(stock.proprietarioId).map(c => {
                    const sup = (c.nutricao?.suplementos || []).find(s => s.insumoId === stock.insumoId);
                    return (
                      <label key={c.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
                        fontSize: 13, color: 'var(--ink)', cursor: 'pointer',
                      }}>
                        <input
                          type="checkbox"
                          checked={(stock.cavaloIds || []).includes(c.id)}
                          onChange={() => toggleCavaloNoEstoque(stock, c.id)}
                        />
                        <span style={{ flex: 1 }}>{c.nome}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                          {sup ? `${fmtNum(sup.qtdDia)} ${unid}/dia na dieta` : 'uso avulso'}
                        </span>
                      </label>
                    );
                  })}
                </>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {podeEditar && entregaAberta !== stock.id && (
                  <button onClick={() => { setEntregaAberta(stock.id); setEQtd(''); setEData(hoje); }} style={btnGhost}>
                    + Nova entrega
                  </button>
                )}
                <button onClick={() => toggleHist(stock.id)} style={btnGhost}>
                  {histAberto.has(stock.id) ? 'Ocultar entregas' : `Entregas (${calc.entregas.length})`}
                </button>
                {podeEditar && (
                  <button onClick={() => removerEstoque(stock)} style={{ ...btnGhost, color: '#b91c1c' }}>
                    <Icon name="trash" size={13} /> Remover
                  </button>
                )}
              </div>

              {entregaAberta === stock.id && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <div style={rotulo}>Quantidade</div>
                    <input value={eQtd} onChange={e => setEQtd(e.target.value)} inputMode="decimal"
                      placeholder={unid || '0'} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={rotulo}>Data</div>
                    <input type="date" value={eData} onChange={e => setEData(e.target.value)} style={inputStyle} />
                  </div>
                  <button onClick={() => registrarEntrega(stock)} style={btnPrim}>OK</button>
                </div>
              )}

              {histAberto.has(stock.id) && (
                <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
                  {calc.entregas.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Nenhuma entrega registrada.</div>
                  )}
                  {calc.entregas.map((e, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: 13, color: 'var(--ink-2)', padding: '3px 0',
                    }}>
                      <span>{fmtDataBr(e.data)}</span>
                      <span>{fmtNum(e.qtd)}{unid ? ` ${unid}` : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default InsumosProprietarioScreen;
