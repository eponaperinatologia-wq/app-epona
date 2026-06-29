// custos-fixos.jsx — Painel de custos fixos do haras
import React, { useState, useMemo } from 'react';
import { Icon } from './icons';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export const CATEGORIAS_CUSTO_FIXO = [
  { id: 'salario',        nome: 'Salários',        cor: '#dc2626', icone: 'users',        incluiEncargos: true,  rateavel: true },
  { id: 'contabilidade',  nome: 'Contabilidade',   cor: '#7c3aed', icone: 'file',         rateavel: true },
  { id: 'energia',        nome: 'Energia',         cor: '#eab308', icone: 'zap',          rateavel: true },
  { id: 'internet',       nome: 'Internet',        cor: '#3b82f6', icone: 'wifi',         rateavel: true },
  { id: 'nutricao',       nome: 'Nutrição',        cor: '#a16207', icone: 'wheat',        rateavel: false, hint: 'Ração, feno, sal mineral, óleo de soja — já considerado no consumo individual' },
  { id: 'suplementacao',  nome: 'Suplementação',   cor: '#15803d', icone: 'leaf',         rateavel: false, hint: 'Já considerado no perfil nutricional individual' },
  { id: 'farmacia',       nome: 'Farmácia',        cor: '#0f766e', icone: 'medkit',       rateavel: false, hint: 'Já considerado nos procedimentos individuais' },
  { id: 'extras',         nome: 'Custos Extras',   cor: '#6b7280', icone: 'more',         rateavel: true },
];

// Encargos trabalhistas padrão (Brasil, CLT)
export const ENCARGOS_PADRAO = {
  fgts: 8,          // 8% do salário
  ferias: 11.11,    // (1 + 1/3) / 12
  decimo: 8.33,     // 1/12
  inssPatronal: 20, // 20% (Simples Nacional pode ser 0)
};
export const ENCARGOS_TOTAL_PADRAO = ENCARGOS_PADRAO.fgts + ENCARGOS_PADRAO.ferias + ENCARGOS_PADRAO.decimo + ENCARGOS_PADRAO.inssPatronal;

const formatBRL = (v) => 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',');
const todayStr = () => new Date().toLocaleDateString('sv-SE');

const inputSt = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid var(--line)', background: 'var(--card)',
  fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)',
  outline: 'none', boxSizing: 'border-box',
};

function CustoFixoForm({ initial, funcionarios = [], onSave, onCancel, mes }) {
  const [categoria, setCategoria] = useState(initial?.categoria || 'salario');
  const [descricao, setDescricao] = useState(initial?.descricao || '');
  const [valor, setValor] = useState(initial?.valor != null ? String(initial.valor) : '');
  const [dataVencimento, setDataVencimento] = useState(initial?.dataVencimento || '');
  const [pago, setPago] = useState(initial?.pago || false);
  const [pagoEm, setPagoEm] = useState(initial?.pagoEm || '');
  const [funcionarioId, setFuncionarioId] = useState(initial?.funcionarioId || '');
  const [encargosPct, setEncargosPct] = useState(initial?.encargosPct != null ? String(initial.encargosPct) : String(ENCARGOS_TOTAL_PADRAO.toFixed(2)));
  const [observacoes, setObservacoes] = useState(initial?.observacoes || '');

  const cat = CATEGORIAS_CUSTO_FIXO.find(c => c.id === categoria);
  const valorNum = parseFloat(String(valor).replace(',', '.')) || 0;
  const encargosNum = parseFloat(String(encargosPct).replace(',', '.')) || 0;
  const totalComEncargos = cat?.incluiEncargos ? valorNum * (1 + encargosNum / 100) : valorNum;

  const canSave = categoria && valorNum > 0;

  const handleSave = () => {
    if (!canSave) return;
    let desc = descricao.trim();
    if (categoria === 'salario' && funcionarioId) {
      const func = funcionarios.find(f => f.id === funcionarioId);
      if (func && !desc) desc = func.nome;
    }
    onSave({
      categoria,
      descricao: desc,
      valor: valorNum,
      mes,
      dataVencimento: dataVencimento || null,
      pago,
      pagoEm: pago ? (pagoEm || todayStr()) : null,
      funcionarioId: categoria === 'salario' ? funcionarioId : '',
      encargosPct: cat?.incluiEncargos ? encargosNum : 0,
      observacoes: observacoes.trim(),
    });
  };

  return (
    <div style={{ background: 'var(--soft)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>{initial ? 'Editar custo' : 'Novo custo fixo'}</div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Categoria</div>
        <select value={categoria} onChange={e => setCategoria(e.target.value)} style={inputSt}>
          {CATEGORIAS_CUSTO_FIXO.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        {cat?.hint && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, fontStyle: 'italic' }}>{cat.hint}</div>}
      </div>

      {categoria === 'salario' && funcionarios.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Funcionário</div>
          <select value={funcionarioId} onChange={e => setFuncionarioId(e.target.value)} style={inputSt}>
            <option value="">— selecionar —</option>
            {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}{f.funcao ? ` · ${f.funcao}` : ''}</option>)}
          </select>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Descrição</div>
        <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder={categoria === 'salario' ? 'Nome do funcionário (auto)' : 'Ex: Conta CPFL, Honorários Out/2025…'} style={inputSt} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>{cat?.incluiEncargos ? 'Salário base (R$)' : 'Valor (R$)'}</div>
          <input type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" style={inputSt} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Vencimento</div>
          <input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} style={inputSt} />
        </div>
      </div>

      {cat?.incluiEncargos && (
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#78350f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Encargos trabalhistas</div>
          <div style={{ fontSize: 11, color: '#78350f', marginBottom: 6 }}>
            Padrão CLT: FGTS 8% + Férias 11,11% + 13º 8,33% + INSS patronal 20% = <strong>{ENCARGOS_TOTAL_PADRAO.toFixed(2)}%</strong>
          </div>
          <div style={{ fontSize: 11, color: '#78350f', marginBottom: 8 }}>
            (Se for Simples Nacional / MEI, ajuste o INSS para 0%. Outras adições típicas: vale-transporte, vale-alimentação, plano de saúde.)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'end' }}>
            <div>
              <div style={{ fontSize: 11, color: '#78350f', marginBottom: 4 }}>% encargos sobre salário</div>
              <input type="number" min="0" step="0.01" value={encargosPct} onChange={e => setEncargosPct(e.target.value)} style={inputSt} />
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: '#78350f', fontWeight: 600 }}>Total com encargos</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#78350f' }}>{formatBRL(totalComEncargos)}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={pago} onChange={e => setPago(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
          <span style={{ fontSize: 13, color: 'var(--ink)' }}>Pago</span>
        </label>
        {pago && (
          <input type="date" value={pagoEm} onChange={e => setPagoEm(e.target.value)} placeholder={todayStr()} style={{ ...inputSt, marginTop: 6 }} />
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>Observações</div>
        <input value={observacoes} onChange={e => setObservacoes(e.target.value)} style={inputSt} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', fontSize: 14, fontFamily: 'var(--sans)' }}>Cancelar</button>
        <button disabled={!canSave} onClick={handleSave} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: canSave ? 'var(--accent)' : 'var(--soft)', color: canSave ? '#fff' : 'var(--ink-3)', fontSize: 14, fontWeight: 700, fontFamily: 'var(--sans)' }}>
          {initial ? 'Salvar' : 'Adicionar'}
        </button>
      </div>
    </div>
  );
}

// Gera entradas de custo_fixo para um mês conforme o regime de cada funcionário
export function gerarSalariosDoMes(funcionarios, mes, custosFixosExistentes, addCustoFixo) {
  const [ano, mesNum] = mes.split('-').map(Number);
  const lastDay = new Date(ano, mesNum, 0).getDate();
  const jaCriados = new Set(custosFixosExistentes.filter(c => c.mes === mes && c.categoria === 'salario').map(c => c.funcionarioId + '|' + (c.dataVencimento || '')));
  let count = 0;

  funcionarios.filter(f => Number(f.salarioBase) > 0).forEach(f => {
    const enc = Number.isFinite(Number(f.encargosPct)) ? Number(f.encargosPct) : ENCARGOS_TOTAL_PADRAO;
    const sal = Number(f.salarioBase);
    const push = (descricao, valor, dia) => {
      const venc = `${mes}-${String(dia).padStart(2, '0')}`;
      if (jaCriados.has(f.id + '|' + venc)) return; // evita duplicar
      addCustoFixo({
        id: 'cf_sal_' + f.id + '_' + mes + '_' + dia + '_' + Math.random().toString(36).slice(2, 6),
        categoria: 'salario', descricao, valor, mes,
        dataVencimento: venc, pago: false, pagoEm: null,
        funcionarioId: f.id, encargosPct: enc, observacoes: '',
      });
      count += 1;
    };

    if (f.regimePagamento === 'semanal') {
      // Sextas-feiras do mês
      const sextas = [];
      for (let d = 1; d <= lastDay; d++) {
        const date = new Date(ano, mesNum - 1, d);
        if (date.getDay() === 5) sextas.push(d);
      }
      if (sextas.length > 0) {
        const valor = sal / sextas.length;
        sextas.forEach((dia, i) => push(`${f.nome} · semana ${i + 1}`, valor, dia));
      }
    } else if (f.regimePagamento === 'split_60_40') {
      push(`${f.nome} · 60% (1ª)`, sal * 0.6, 5);
      push(`${f.nome} · 40% (2ª)`, sal * 0.4, 20);
    } else if (f.regimePagamento === 'mensal_dia_20') {
      push(f.nome, sal, 20);
    } else {
      // mensal_dia_05 (padrão)
      push(f.nome, sal, 5);
    }
  });
  return count;
}

export function CustosFixosScreen({ custosFixos = [], funcionarios = [], cavalos = [], addCustoFixo, updateCustoFixo, deleteCustoFixo, onBack }) {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const [mesRef, setMesRef] = useState(mesAtual);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const cavalosPresentes = cavalos.filter(c => c.presente).length;

  const doMes = useMemo(() => custosFixos.filter(c => c.mes === mesRef), [custosFixos, mesRef]);

  const totalPorCategoria = useMemo(() => {
    const map = {};
    CATEGORIAS_CUSTO_FIXO.forEach(c => { map[c.id] = { total: 0, count: 0, pago: 0 }; });
    doMes.forEach(c => {
      const cat = CATEGORIAS_CUSTO_FIXO.find(x => x.id === c.categoria);
      const totalItem = cat?.incluiEncargos ? c.valor * (1 + (c.encargosPct || 0) / 100) : c.valor;
      if (map[c.categoria]) {
        map[c.categoria].total += totalItem;
        map[c.categoria].count += 1;
        if (c.pago) map[c.categoria].pago += totalItem;
      }
    });
    return map;
  }, [doMes]);

  const totalRateavel = CATEGORIAS_CUSTO_FIXO
    .filter(c => c.rateavel)
    .reduce((s, c) => s + (totalPorCategoria[c.id]?.total || 0), 0);

  const custoPorCavalo = cavalosPresentes > 0 ? totalRateavel / cavalosPresentes : 0;

  const totalGeral = Object.values(totalPorCategoria).reduce((s, x) => s + x.total, 0);
  const totalPago = Object.values(totalPorCategoria).reduce((s, x) => s + x.pago, 0);
  const totalPendente = totalGeral - totalPago;

  const mesLabel = `${MESES[parseInt(mesRef.split('-')[1]) - 1]} ${mesRef.split('-')[0]}`;

  const meses12 = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      arr.push({ key: m, label: `${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}` });
    }
    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = (data) => {
    if (editing) {
      updateCustoFixo(editing.id, data);
    } else {
      addCustoFixo({ id: 'cf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), ...data });
    }
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {onBack && <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 22, padding: 0, cursor: 'pointer', lineHeight: 1 }}>‹</button>}
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', flex: 1 }}>Custos Fixos</div>
          <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Novo</button>
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {meses12.map(m => (
            <button key={m.key} onClick={() => setMesRef(m.key)} style={{
              flexShrink: 0, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: '1px solid ' + (mesRef === m.key ? 'var(--accent)' : 'var(--line)'),
              background: mesRef === m.key ? 'var(--accent)' : 'var(--card)',
              color: mesRef === m.key ? '#fff' : 'var(--ink-2)',
              fontFamily: 'var(--sans)', cursor: 'pointer',
            }}>{m.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 90px' }}>
        {/* Resumo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total {mesLabel}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{formatBRL(totalGeral)}</div>
          </div>
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Pago</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#166534' }}>{formatBRL(totalPago)}</div>
          </div>
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>A pagar</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#991b1b' }}>{formatBRL(totalPendente)}</div>
          </div>
        </div>

        {/* Custo por cavalo */}
        <div style={{ background: 'linear-gradient(135deg, #3d6043, #2d4a32)', borderRadius: 14, padding: 16, marginBottom: 16, color: '#fff' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Custo fixo rateado por cavalo</div>
          <div style={{ fontSize: 28, fontFamily: 'var(--serif)', fontWeight: 400, marginBottom: 4 }}>{formatBRL(custoPorCavalo)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
            {formatBRL(totalRateavel)} (salários, contabilidade, energia, internet, extras) ÷ {cavalosPresentes} cavalos presentes.
            <br />Apenas informativo — não cobrado na fatura.
          </div>
        </div>

        {/* Geração automática de salários */}
        {funcionarios.some(f => Number(f.salarioBase) > 0) && (
          <button onClick={() => {
            const semSalarioConfig = funcionarios.filter(f => !(Number(f.salarioBase) > 0)).length;
            const msg = `Gerar parcelas de salário para ${mesLabel}?\n\nSerá criada uma entrada por funcionário com salário cadastrado, conforme o regime de cada um (mensal, split 60/40 ou semanal).\n\nFuncionários já cadastrados para este mês não serão duplicados.${semSalarioConfig ? `\n\n${semSalarioConfig} funcionário(s) sem salário configurado — abra o cadastro para incluir.` : ''}`;
            if (!window.confirm(msg)) return;
            const n = gerarSalariosDoMes(funcionarios, mesRef, custosFixos, addCustoFixo);
            window.alert(n === 0 ? 'Nenhuma parcela nova criada (todas já existem).' : `${n} parcela(s) criada(s).`);
          }} style={{ width: '100%', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#92400e', cursor: 'pointer', fontFamily: 'var(--sans)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            ⚡ Gerar parcelas de salário do mês
          </button>
        )}

        {showForm && (
          <CustoFixoForm initial={editing} mes={mesRef} funcionarios={funcionarios} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
        )}

        {/* Lista por categoria */}
        {CATEGORIAS_CUSTO_FIXO.map(cat => {
          const items = doMes.filter(c => c.categoria === cat.id);
          if (items.length === 0) return null;
          const stats = totalPorCategoria[cat.id];
          return (
            <div key={cat.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: cat.cor }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>{cat.nome}{cat.rateavel ? '' : ' · não rateado'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700 }}>{formatBRL(stats.total)}</div>
              </div>
              {items.map(item => {
                const totalItem = cat.incluiEncargos ? item.valor * (1 + (item.encargosPct || 0) / 100) : item.valor;
                return (
                  <div key={item.id} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 14px', marginBottom: 6, borderLeft: `3px solid ${cat.cor}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{item.descricao || cat.nome}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                          {cat.incluiEncargos
                            ? `Base ${formatBRL(item.valor)} + ${(item.encargosPct || 0).toFixed(2)}% encargos`
                            : ''}
                          {item.dataVencimento ? `${cat.incluiEncargos ? ' · ' : ''}vence ${new Date(item.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: item.pago ? '#dcfce7' : '#fef3c7', color: item.pago ? '#166534' : '#92400e' }}>
                            {item.pago ? '✓ PAGO' : 'A PAGAR'}
                          </span>
                          {item.observacoes && <span style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic' }}>· {item.observacoes}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{formatBRL(totalItem)}</div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                          <button onClick={() => { setEditing(item); setShowForm(true); }} style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Editar</button>
                          <button onClick={() => { if (window.confirm('Excluir este custo?')) deleteCustoFixo(item.id); }} style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: '3px 6px', cursor: 'pointer' }}><Icon name="x" size={10} color="#dc2626" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {doMes.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)', fontSize: 14 }}>
            Nenhum custo fixo cadastrado para {mesLabel}.<br />
            <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ marginTop: 12, background: 'var(--accent-soft)', border: '1px dashed var(--accent)', borderRadius: 10, padding: '10px 18px', fontSize: 13, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--sans)', fontWeight: 600 }}>+ Adicionar primeiro custo</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper: retorna total rateável + custo / cavalo para um mês
export function custosRateaveisMes(custosFixos, mes, cavalosPresentes) {
  const doMes = custosFixos.filter(c => c.mes === mes);
  const total = doMes.reduce((s, c) => {
    const cat = CATEGORIAS_CUSTO_FIXO.find(x => x.id === c.categoria);
    if (!cat?.rateavel) return s;
    const itemTotal = cat.incluiEncargos ? c.valor * (1 + (c.encargosPct || 0) / 100) : c.valor;
    return s + itemTotal;
  }, 0);
  return { total, porCavalo: cavalosPresentes > 0 ? total / cavalosPresentes : 0 };
}

// Helper: total geral do mês (todos os custos)
export function custosTotaisMes(custosFixos, mes) {
  const doMes = custosFixos.filter(c => c.mes === mes);
  return doMes.reduce((s, c) => {
    const cat = CATEGORIAS_CUSTO_FIXO.find(x => x.id === c.categoria);
    const itemTotal = cat?.incluiEncargos ? c.valor * (1 + (c.encargosPct || 0) / 100) : c.valor;
    return s + itemTotal;
  }, 0);
}
