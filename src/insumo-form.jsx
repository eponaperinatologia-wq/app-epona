// insumo-form.jsx — Telas de cadastro e edição de insumos
import React, { useState } from 'react';
import { Icon, CATEGORIA_ICONS } from './icons';
import { CATEGORIAS_INSUMOS, DESCARTAVEIS_INJETAVEL, formatBRL } from './data';
import { TopBar } from './screens';

// ─────────────────────────────────────────────────────────────
// Helpers de formulário
// ─────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
      {label}
    </div>
    {children}
  </div>
);

const inputSt = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  border: '1px solid var(--line)', background: 'var(--card)',
  fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)',
  outline: 'none', boxSizing: 'border-box',
};

const Toggle = ({ value, onChange, label, desc }) => (
  <button onClick={() => onChange(!value)} style={{
    width: '100%', background: value ? 'var(--accent-soft)' : 'var(--card)',
    border: '1px solid ' + (value ? 'var(--accent)' : 'var(--line)'),
    borderRadius: 14, padding: '14px 16px',
    display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', color: 'var(--ink)',
  }}>
    <div style={{
      width: 44, height: 24, borderRadius: 24,
      background: value ? 'var(--accent)' : 'var(--line-2)',
      position: 'relative', transition: 'background 0.18s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 2, left: value ? 22 : 2,
        width: 20, height: 20, borderRadius: 20,
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.18s',
      }} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
      {desc && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{desc}</div>}
    </div>
  </button>
);

// ─────────────────────────────────────────────────────────────
// Form compartilhado
// ─────────────────────────────────────────────────────────────
function InsumoForm({ initialValues, onSave, onBack, title, insumos, onDelete }) {
  const [nome, setNome] = useState(initialValues.nome || '');
  const [categoria, setCategoria] = useState(initialValues.categoria || 'medicamento');
  const [fornecedor, setFornecedor] = useState(initialValues.fornecedor || '');
  const [unidade, setUnidade] = useState(initialValues.unidade || 'dose');
  const [valorCompraStr, setValorCompraStr] = useState(
    initialValues.valorCompra != null ? String(initialValues.valorCompra) : ''
  );
  const [markupStr, setMarkupStr] = useState(
    initialValues.markup != null ? String(initialValues.markup) : '0'
  );
  const [valorVendaStr, setValorVendaStr] = useState(
    initialValues.valorVenda != null ? String(initialValues.valorVenda) : ''
  );
  const [injetavel, setInjetavel] = useState(initialValues.injetavel || false);
  const [incluidoMensalidade, setIncluidoMensalidade] = useState(initialValues.incluidoMensalidade || false);
  // Forma de cobrança do insumo. 'por_uso' (padrão): cobra dose × valor.
  // 'frasco_ao_abrir': cobra 1 frasco inteiro no momento em que abre; doses
  // seguintes usam o mesmo frasco até esgotar ou vencer. Ver Fase 4+ do fluxo.
  const [formaCobranca, setFormaCobranca] = useState(initialValues.formaCobranca || 'por_uso');
  const [capacidadePorFrascoStr, setCapacidadePorFrascoStr] = useState(
    initialValues.capacidadePorFrasco != null ? String(initialValues.capacidadePorFrasco) : ''
  );
  const [validadeAposAbertaDiasStr, setValidadeAposAbertaDiasStr] = useState(
    initialValues.validadeAposAbertaDias != null ? String(initialValues.validadeAposAbertaDias) : ''
  );
  const [usaDescartaveis, setUsaDescartaveis] = useState(
    !!(initialValues.descartaveis?.length && !initialValues.injetavel)
  );
  const [descExtras, setDescExtras] = useState(
    (initialValues.descartaveis || []).filter(
      d => !DESCARTAVEIS_INJETAVEL.some(ob => ob.insumoId === d.insumoId)
    )
  );

  const recalcVenda = (compra, mk) => {
    const c = parseFloat(compra);
    const m = parseFloat(mk);
    if (!isNaN(c) && !isNaN(m)) return (c * (1 + m / 100)).toFixed(2);
    return '';
  };

  const handleCompraChange = (v) => {
    setValorCompraStr(v);
    setValorVendaStr(recalcVenda(v, markupStr));
  };

  const handleMarkupChange = (v) => {
    setMarkupStr(v);
    setValorVendaStr(recalcVenda(valorCompraStr, v));
  };

  const toggleDescExtra = (insumoId) => {
    setDescExtras(prev =>
      prev.find(d => d.insumoId === insumoId)
        ? prev.filter(d => d.insumoId !== insumoId)
        : [...prev, { insumoId, qtd: 1 }]
    );
  };

  const descartaveisFinais = () => {
    const base = injetavel ? [...DESCARTAVEIS_INJETAVEL] : [];
    if (!usaDescartaveis) return base;
    const extras = descExtras.filter(d => !base.some(b => b.insumoId === d.insumoId));
    return [...base, ...extras];
  };

  // Descartáveis disponíveis para extras (categoria descartavel, excluindo os obrigatórios de injetável)
  const descartaveisDisponiveis = insumos.filter(i =>
    i.categoria === 'descartavel' && !DESCARTAVEIS_INJETAVEL.some(ob => ob.insumoId === i.id)
  );

  const parseNum = (s) => {
    const str = String(s ?? '').trim().replace(',', '.');
    if (str === '') return NaN;
    const n = parseFloat(str);
    return Number.isFinite(n) ? n : NaN;
  };
  const valorCompraNum = parseNum(valorCompraStr);
  const valorVendaNum = parseNum(valorVendaStr);
  const markupNum = parseNum(markupStr);
  const capacidadeNum = parseNum(capacidadePorFrascoStr);
  const validadeNum = parseNum(validadeAposAbertaDiasStr);
  const canSave = nome.trim()
    && Number.isFinite(valorVendaNum) && valorVendaNum >= 0
    && (formaCobranca !== 'frasco_ao_abrir' || (
      Number.isFinite(capacidadeNum) && capacidadeNum > 0
      && Number.isFinite(validadeNum) && validadeNum > 0
    ));

  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSave({
        nome: nome.trim(),
        categoria,
        incluidoMensalidade,
        fornecedor,
        unidade: unidade.trim() || 'unidade',
        valorCompra: Number.isFinite(valorCompraNum) ? valorCompraNum : 0,
        markup: Number.isFinite(markupNum) ? markupNum : 0,
        valorVenda: valorVendaNum,
        injetavel,
        descartaveis: descartaveisFinais(),
        formaCobranca,
        // Só grava os campos de frasco quando aplicável — evita lixo em insumos por_uso.
        capacidadePorFrasco: formaCobranca === 'frasco_ao_abrir' ? capacidadeNum : 0,
        validadeAposAbertaDias: formaCobranca === 'frasco_ao_abrir' ? Math.round(validadeNum) : 0,
        // valor_frasco derivado: valor por dose × capacidade. Guardo pra facilitar
        // relatórios; a cobrança real ainda usa valorVenda × capacidade no fluxo.
        valorFrasco: formaCobranca === 'frasco_ao_abrir' ? (valorVendaNum * capacidadeNum) : 0,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title={title} onBack={onBack} />

      <div style={{ padding: '16px 20px 0' }}>
        <Field label="Nome do insumo">
          <input
            value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Ex: Ivermectina 1%"
            style={inputSt}
          />
        </Field>

        <Field label="Categoria">
          <select value={categoria} onChange={e => setCategoria(e.target.value)} style={inputSt}>
            {CATEGORIAS_INSUMOS.map(c => (
              <option key={c.id} value={c.id}>{c.nome}{c.incluidoMensalidade ? ' · incluso na mensalidade' : ''}</option>
            ))}
          </select>
        </Field>
        {(categoria === 'nutricao_base' || categoria === 'racao') && (
          <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#78350f', marginTop: -6, marginBottom: 14 }}>
            Categoria já inclusa na mensalidade · não cobrado à parte nas faturas.
          </div>
        )}

        <Field label="Cobrança na mensalidade">
          <Toggle
            value={incluidoMensalidade}
            onChange={setIncluidoMensalidade}
            label="Incluso na mensalidade"
            desc="Quando marcado, o consumo deste insumo não aparece nem é cobrado na fatura do proprietário."
          />
        </Field>

        <Field label="Fornecedor (opcional)">
          <input
            value={fornecedor} onChange={e => setFornecedor(e.target.value)}
            placeholder="Ex: Distribuidora Veterinária Silva"
            style={inputSt}
          />
        </Field>

        <Field label="Unidade de medida">
          <input
            value={unidade} onChange={e => setUnidade(e.target.value)}
            placeholder="dose, ml, kg, aplicação, serviço…"
            style={inputSt}
          />
        </Field>

        {/* Forma de cobrança */}
        <Field label="Forma de cobrança">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { id: 'por_uso', titulo: 'Por uso', desc: 'Cobra dose × valor. Padrão.' },
              { id: 'frasco_ao_abrir', titulo: 'Frasco ao abrir', desc: 'Cobra frasco inteiro quando abre. Ex.: Minoxel.' },
            ].map(opt => {
              const sel = formaCobranca === opt.id;
              return (
                <button key={opt.id} onClick={() => setFormaCobranca(opt.id)} style={{
                  background: sel ? 'var(--accent-soft)' : 'var(--card)',
                  border: `1px solid ${sel ? 'var(--accent)' : 'var(--line)'}`,
                  borderRadius: 12, padding: '10px 12px', textAlign: 'left', color: 'var(--ink)',
                  cursor: 'pointer',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: sel ? 'var(--accent)' : 'var(--ink)', marginBottom: 3 }}>
                    {sel ? '● ' : '○ '}{opt.titulo}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', lineHeight: 1.4 }}>{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </Field>

        {/* Bloco de precificação */}
        <div style={{
          background: 'var(--soft)', borderRadius: 16, padding: '16px',
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, fontWeight: 700 }}>
            Precificação
          </div>

          <Field label="Valor de compra (R$ / unidade)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, color: 'var(--ink-3)', width: 22 }}>R$</span>
              <input
                type="number" min="0" step="0.01"
                value={valorCompraStr} onChange={e => handleCompraChange(e.target.value)}
                placeholder="0,00"
                style={{ ...inputSt, flex: 1 }}
              />
            </div>
          </Field>

          <Field label="Markup (%)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number" min="0" step="1"
                value={markupStr} onChange={e => handleMarkupChange(e.target.value)}
                placeholder="0"
                style={{ ...inputSt, flex: 1 }}
              />
              <span style={{ fontSize: 15, color: 'var(--ink-3)', width: 16 }}>%</span>
            </div>
          </Field>

          <Field label="Valor de venda (R$ / unidade) — cobrado na fatura">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, color: 'var(--ink-3)', width: 22 }}>R$</span>
              <input
                type="number" min="0" step="0.01"
                value={valorVendaStr} onChange={e => setValorVendaStr(e.target.value)}
                placeholder="0,00"
                style={{ ...inputSt, flex: 1, background: '#fffbe8', borderColor: '#d4a017' }}
              />
            </div>
            {valorCompraStr && valorVendaStr && (
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 5 }}>
                Custo {formatBRL(parseFloat(valorCompraStr) || 0)} + {markupStr || 0}% markup
                = <strong style={{ color: 'var(--accent)' }}>{formatBRL(parseFloat(valorVendaStr) || 0)}</strong>
              </div>
            )}
          </Field>

          {formaCobranca === 'frasco_ao_abrir' && (
            <>
              <div style={{
                background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10,
                padding: '10px 12px', fontSize: 11, color: '#78350f', marginTop: 8, marginBottom: 12, lineHeight: 1.5,
              }}>
                <b>Valor por dose × capacidade = valor do frasco.</b> Ao aplicar a primeira dose,
                cobra o frasco cheio na fatura. As doses seguintes usam o mesmo frasco (custo 0)
                até esgotar ou passar da validade.
              </div>

              <Field label={`Capacidade por frasco (${unidade.trim() || 'un'})`}>
                <input
                  type="number" min="0" step="1"
                  value={capacidadePorFrascoStr}
                  onChange={e => setCapacidadePorFrascoStr(e.target.value)}
                  placeholder="Ex: 50 (ml) ou 10 (aplicações)"
                  style={inputSt}
                />
              </Field>

              <Field label="Validade após aberto (dias)">
                <input
                  type="number" min="1" step="1"
                  value={validadeAposAbertaDiasStr}
                  onChange={e => setValidadeAposAbertaDiasStr(e.target.value)}
                  placeholder="Ex: 5"
                  style={inputSt}
                />
              </Field>

              {Number.isFinite(capacidadeNum) && capacidadeNum > 0 && Number.isFinite(valorVendaNum) && valorVendaNum > 0 && (
                <div style={{
                  background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 10,
                  padding: '10px 12px', fontSize: 13, color: 'var(--accent)', marginTop: 4,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>Valor do frasco cheio</span>
                  <strong>{formatBRL(valorVendaNum * capacidadeNum)}</strong>
                </div>
              )}
            </>
          )}
        </div>

        {/* Injetável */}
        <div style={{ marginBottom: 12 }}>
          <Toggle
            value={injetavel}
            onChange={setInjetavel}
            label="Injetável"
            desc="Cobra seringa, agulha e algodão com álcool a cada aplicação"
          />
          {injetavel && (
            <div style={{
              marginTop: 8, padding: '12px 14px',
              background: '#fef9ec', border: '1px solid #f5d76e', borderRadius: 12,
              fontSize: 12, color: '#856404', lineHeight: 1.6,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Descartáveis cobrados automaticamente:</div>
              {DESCARTAVEIS_INJETAVEL.map(d => {
                const ins = insumos.find(i => i.id === d.insumoId);
                return ins ? (
                  <div key={d.insumoId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>· {d.qtd}× {ins.nome}</span>
                    <span style={{ fontWeight: 600 }}>{formatBRL(ins.valorVenda)}</span>
                  </div>
                ) : null;
              })}
              <div style={{ fontSize: 11, color: '#b45309', marginTop: 6 }}>
                Edite os valores em Cadastros → Insumos → Descartável
              </div>
            </div>
          )}
        </div>

        {/* Descartáveis extras */}
        <div style={{ marginBottom: 16 }}>
          <Toggle
            value={usaDescartaveis}
            onChange={v => { setUsaDescartaveis(v); if (!v) setDescExtras([]); }}
            label="Usa descartáveis adicionais"
            desc="Itens cobrados automaticamente junto a este insumo"
          />
          {usaDescartaveis && (
            <div style={{ marginTop: 8 }}>
              {descartaveisDisponiveis.length === 0 ? (
                <div style={{
                  padding: '12px 14px', background: 'var(--card)', border: '1px solid var(--line)',
                  borderRadius: 12, fontSize: 12, color: 'var(--ink-3)',
                }}>
                  Nenhum descartável extra cadastrado. Adicione em Cadastros → Insumos → Descartável.
                </div>
              ) : descartaveisDisponiveis.map(i => {
                const sel = descExtras.some(d => d.insumoId === i.id);
                return (
                  <button key={i.id} onClick={() => toggleDescExtra(i.id)} style={{
                    width: '100%', background: sel ? 'var(--accent-soft)' : 'var(--card)',
                    border: '1px solid ' + (sel ? 'var(--accent)' : 'var(--line)'),
                    borderRadius: 12, padding: '10px 14px', marginBottom: 6,
                    display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: 'var(--ink)',
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      border: '1.5px solid ' + (sel ? 'var(--accent)' : 'var(--line-2)'),
                      background: sel ? 'var(--accent)' : 'transparent',
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                    }}>
                      {sel && <Icon name="check" size={13} color="#fff" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{i.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                        {formatBRL(i.valorVenda)} / {i.unidade}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Botão salvar */}
        <button onClick={salvar} disabled={!canSave || saving} style={{
          width: '100%', background: (canSave && !saving) ? 'var(--accent)' : 'var(--soft)',
          color: (canSave && !saving) ? '#fff' : 'var(--ink-3)', border: 'none', borderRadius: 14,
          padding: '16px', fontSize: 15, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: (canSave && !saving) ? '0 8px 20px rgba(61,96,67,0.25)' : 'none',
          marginTop: 8, marginBottom: 8,
        }}>
          <Icon name="check" size={18} color={canSave ? '#fff' : 'var(--ink-3)'} />
          Salvar insumo
        </button>

        {/* Botão excluir (só em edição) */}
        {onDelete && (
          <button onClick={() => {
            if (!window.confirm(`Excluir "${nome || 'este insumo'}"? Essa ação não pode ser desfeita.`)) return;
            onDelete();
          }} style={{
            width: '100%', background: 'transparent',
            color: '#dc2626', border: '1px solid #fecaca', borderRadius: 14,
            padding: '13px', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 4, marginBottom: 8, cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>
            <Icon name="trash" size={16} color="#dc2626" />
            Excluir insumo
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ADD INSUMO
// ─────────────────────────────────────────────────────────────
export function AddInsumoScreen({ setScreen, addInsumo, insumos }) {
  return (
    <InsumoForm
      title="Novo insumo"
      initialValues={{ categoria: 'medicamento', markup: 0, valorCompra: '', valorVenda: '' }}
      insumos={insumos}
      onBack={() => setScreen('cadInsumos')}
      onSave={(data) => {
        addInsumo({ id: 'i_' + Date.now(), ...data });
        setScreen('cadInsumos');
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// EDITAR INSUMO
// ─────────────────────────────────────────────────────────────
export function EditarInsumoScreen({ id, setScreen, insumos, updateInsumo, deleteInsumo }) {
  const insumo = insumos.find(i => i.id === id);
  if (!insumo) return null;

  return (
    <InsumoForm
      title={insumo.nome}
      initialValues={insumo}
      insumos={insumos}
      onBack={() => setScreen('cadInsumos')}
      onSave={(data) => {
        updateInsumo(id, data);
        setScreen('cadInsumos');
      }}
      onDelete={deleteInsumo ? () => {
        deleteInsumo(id);
        setScreen('cadInsumos');
      } : undefined}
    />
  );
}
