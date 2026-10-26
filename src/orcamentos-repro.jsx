// Orçamentos do Epona Repro Team.
//
// Fluxo: a equipe monta um orçamento pra cliente (atual ou prospect)
// antes de executar os procedimentos. É só estimativa — não cria
// nada no sistema. Pode exportar PDF.
//
// Shape de 1 item (persistido em orcamentos_repro.itens):
//   { id, tipo: 'visita'|'procedimento'|'insumo'|'resultado'|'personalizado',
//     descricao, qtd, valorUnit, servicoId?, insumoId?,
//     descartaveis?: [{insumoId, qtd, valorUnit}] }
// Total do item = qtd × valorUnit + Σ (descartaveis.qtd × descartaveis.valorUnit)

import React, { useState, useMemo } from 'react';
import { Icon } from './icons';
import { servicosPadrao, servicoTeParaResultado } from './utils/faturaRepro';
import { gerarPdfOrcamentoRepro, nomePdfOrcamentoRepro } from './utils/pdfOrcamentoRepro';

const CORES_TAB_ATIVA = '#7c2d8c';
const BRL = (v) => 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',');
const fmtDataBrCurto = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y.slice(2)}`;
};

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
  border: '1px solid var(--line)', background: 'var(--bg)', fontSize: 14, color: 'var(--ink)',
  fontFamily: 'var(--sans)', outline: 'none',
};
const inputStyleSmall = { ...inputStyle, padding: '8px 10px', fontSize: 13 };

function Modal({ children, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 0,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg)', width: '100%', maxWidth: 480,
          maxHeight: '92vh', overflowY: 'auto',
          borderRadius: '16px 16px 0 0', padding: 20,
          boxShadow: '0 -8px 30px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4, fontWeight: 700 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// Calcula valor total de 1 item (incluindo descartáveis)
function totalItem(item) {
  const base = (Number(item.qtd) || 0) * (Number(item.valorUnit) || 0);
  const desc = (item.descartaveis || []).reduce((s, d) => s + (Number(d.qtd) || 0) * (Number(d.valorUnit) || 0), 0);
  return base + desc;
}

// Agrupa itens por tipo pra visualização/PDF
function agruparPorTipo(itens = []) {
  const grupos = {
    visita: { label: 'Visitas', itens: [], total: 0 },
    procedimento: { label: 'Procedimentos', itens: [], total: 0 },
    insumo: { label: 'Insumos', itens: [], total: 0 },
    resultado: { label: 'Resultado reprodutivo (DG45+)', itens: [], total: 0 },
    personalizado: { label: 'Outros', itens: [], total: 0 },
  };
  for (const it of itens) {
    const g = grupos[it.tipo] || grupos.personalizado;
    g.itens.push(it);
    g.total += totalItem(it);
  }
  return Object.entries(grupos).filter(([, g]) => g.itens.length > 0);
}

// ─────────────────────────────────────────────────────────────
// Tela principal: lista + form
// ─────────────────────────────────────────────────────────────
export function ReproOrcamentos({
  orcamentosRepro = [], propRepro = [], locaisRepro = [], vetKmLocais = [],
  vetsExternos = [], servicos = [], insumos = [], empresaInfo = null, currentUser,
  addOrcamentoRepro, updateOrcamentoRepro, deleteOrcamentoRepro,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => (
    [...orcamentosRepro]
      .sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))
      .filter(o => {
        if (!busca.trim()) return true;
        const t = busca.toLowerCase();
        return (o.titulo || '').toLowerCase().includes(t)
          || (o.destinatarioNome || '').toLowerCase().includes(t)
          || (propRepro.find(p => p.id === o.proprietarioId)?.nome || '').toLowerCase().includes(t);
      })
  ), [orcamentosRepro, busca, propRepro]);

  const abrirNovo = () => { setEditId(null); setShowForm(true); };
  const abrirEditar = (id) => { setEditId(id); setShowForm(true); };
  const editReg = editId ? orcamentosRepro.find(o => o.id === editId) : null;

  const exportarPdf = (orc) => {
    const doc = gerarPdfOrcamentoRepro({
      orcamento: orc,
      empresa: empresaInfo || {},
      proprietario: propRepro.find(p => p.id === orc.proprietarioId) || null,
      local: locaisRepro.find(l => l.id === orc.localId) || null,
    });
    doc.save(nomePdfOrcamentoRepro(orc));
  };

  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ padding: '12px 20px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por título ou proprietário…" style={{ ...inputStyle, flex: 1 }} />
        <button onClick={abrirNovo} style={{
          width: 44, height: 44, borderRadius: 12, background: CORES_TAB_ATIVA,
          border: 'none', cursor: 'pointer', color: '#fff',
          display: 'grid', placeItems: 'center',
        }}>
          <Icon name="plus" size={18} color="#fff" />
        </button>
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        {lista.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)', fontSize: 13 }}>
            {busca ? 'Nenhum orçamento encontrado.' : 'Nenhum orçamento ainda. Toque em + para criar.'}
          </div>
        )}
        {lista.map(o => {
          const prop = propRepro.find(p => p.id === o.proprietarioId);
          const local = locaisRepro.find(l => l.id === o.localId);
          const nomeDest = prop?.nome || o.destinatarioNome || '—';
          return (
            <div key={o.id} style={{
              background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
              padding: '14px 16px', marginBottom: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{o.titulo || '(sem título)'}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                    {nomeDest}{local ? ` · ${local.nome}` : ''}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: CORES_TAB_ATIVA, fontWeight: 700 }}>
                  {BRL(o.total)}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>
                {o.criadoEm ? `Criado em ${fmtDataBrCurto(o.criadoEm.slice(0, 10))}` : ''}
                {o.criadoPor ? ` · ${o.criadoPor}` : ''}
                {` · ${(o.itens || []).length} ite${(o.itens || []).length === 1 ? 'm' : 'ns'}`}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => abrirEditar(o.id)} style={{
                  flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)',
                  background: 'transparent', color: 'var(--ink-2)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>Editar</button>
                <button onClick={() => exportarPdf(o)} style={{
                  flex: 1, padding: '8px 10px', borderRadius: 8, border: 'none',
                  background: CORES_TAB_ATIVA, color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>PDF</button>
                <button onClick={() => { if (window.confirm(`Excluir orçamento "${o.titulo}"?`)) deleteOrcamentoRepro(o.id); }} style={{
                  padding: '8px 10px', borderRadius: 8, border: '1px solid #dc262640',
                  background: '#fee2e2', color: '#dc2626',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>Excluir</button>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <OrcamentoForm
          registro={editReg}
          propRepro={propRepro} locaisRepro={locaisRepro} vetKmLocais={vetKmLocais}
          vetsExternos={vetsExternos} servicos={servicos} insumos={insumos}
          currentUser={currentUser}
          onSave={(payload) => {
            if (editId) updateOrcamentoRepro(editId, payload);
            else addOrcamentoRepro(payload);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Form de criação/edição
// ─────────────────────────────────────────────────────────────
function OrcamentoForm({
  registro = null, propRepro = [], locaisRepro = [], vetKmLocais = [],
  vetsExternos = [], servicos = [], insumos = [], currentUser,
  onSave, onCancel,
}) {
  const [titulo, setTitulo] = useState(registro?.titulo || '');
  const [proprietarioId, setProprietarioId] = useState(registro?.proprietarioId || '');
  const [destinatarioNome, setDestinatarioNome] = useState(registro?.destinatarioNome || '');
  const [localId, setLocalId] = useState(registro?.localId || '');
  const [observacoes, setObservacoes] = useState(registro?.observacoes || '');
  const [itens, setItens] = useState(registro?.itens || []);

  // Valor de visita (km) estimado pro local: usa a média dos vets que
  // cadastraram km nesse local (ou o único cadastrado). O usuário pode
  // editar linha a linha depois.
  const valorKmLocal = useMemo(() => {
    if (!localId) return 0;
    const kms = vetKmLocais.filter(k => k.localId === localId);
    if (kms.length === 0) return 0;
    return kms.reduce((s, k) => s + Number(k.valor || 0), 0) / kms.length;
  }, [localId, vetKmLocais]);

  const totalGeral = itens.reduce((s, it) => s + totalItem(it), 0);

  const addItemVisita = () => {
    setItens(prev => [...prev, {
      id: 'it_' + Date.now().toString(36),
      tipo: 'visita', descricao: localId
        ? `Visita a ${locaisRepro.find(l => l.id === localId)?.nome || 'local'}`
        : 'Visita (km)',
      qtd: 1, valorUnit: valorKmLocal,
    }]);
  };
  // Procedimento = puxa descartáveis obrigatórios do serviço vinculado.
  const addItemProcedimento = (chave) => {
    // chave: 'ia', 'ce+', 'ce-', 'cf', 'inovulacao', ou id de serviço avulso
    const padrao = servicosPadrao(servicos);
    let sv = null;
    let descricao = '';
    if (chave === 'ia') { sv = padrao.ia; descricao = 'Inseminação Artificial'; }
    else if (chave === 'ce+') { sv = servicoTeParaResultado(servicos, 'positivo'); descricao = 'Coleta de Embrião (positiva)'; }
    else if (chave === 'ce-') { sv = servicoTeParaResultado(servicos, 'negativo'); descricao = 'Coleta de Embrião (negativa)'; }
    else if (chave === 'cf') {
      // CF não tem serviço vinculado — adiciona só como entrada de visita+manejo.
      // Pra incluir CF no orçamento, usuário usa "Visita" (controle é incluso).
      sv = null; descricao = 'Controle Folicular (manejo incluso na visita)';
    }
    else if (chave === 'inovulacao') { sv = servicos.find(s => /inovul/i.test(s.nome || '')); descricao = 'Inovulação de Embrião'; }
    else if (chave === 'tu') { sv = servicos.find(s => /tratamento.*uter/i.test(s.nome || '')); descricao = 'Tratamento Uterino'; }
    else {
      sv = servicos.find(s => s.id === chave);
      descricao = sv?.nome || 'Procedimento';
    }
    const descartaveis = (sv?.descartaveisObrigatorios || [])
      .map(d => {
        const ins = insumos.find(i => i.id === d.insumoId);
        if (!ins) return null;
        return { insumoId: ins.id, nome: ins.nome, qtd: Number(d.qtd) || 1, valorUnit: Number(ins.valorVenda) || 0 };
      })
      .filter(Boolean);
    setItens(prev => [...prev, {
      id: 'it_' + Date.now().toString(36),
      tipo: 'procedimento', descricao,
      qtd: 1,
      valorUnit: Number(sv?.valor) || 0,
      servicoId: sv?.id || null,
      descartaveis,
    }]);
  };
  const addItemInsumo = () => {
    setItens(prev => [...prev, {
      id: 'it_' + Date.now().toString(36),
      tipo: 'insumo', descricao: '',
      qtd: 1, valorUnit: 0, insumoId: null,
    }]);
  };
  const addItemResultado = () => {
    const prop = propRepro.find(p => p.id === proprietarioId);
    const valor = Number(prop?.valorResultadoRepro) || 0;
    setItens(prev => [...prev, {
      id: 'it_' + Date.now().toString(36),
      tipo: 'resultado',
      descricao: 'Resultado reprodutivo (DG45+)',
      qtd: 1, valorUnit: valor,
    }]);
  };
  const addItemPersonalizado = () => {
    setItens(prev => [...prev, {
      id: 'it_' + Date.now().toString(36),
      tipo: 'personalizado', descricao: '',
      qtd: 1, valorUnit: 0,
    }]);
  };

  const atualizar = (idx, patch) => setItens(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const remover = (idx) => setItens(prev => prev.filter((_, i) => i !== idx));

  const salvar = () => {
    if (!titulo.trim()) { window.alert('Preencha o título.'); return; }
    const prop = propRepro.find(p => p.id === proprietarioId);
    const payload = {
      titulo: titulo.trim(),
      proprietarioId: proprietarioId || null,
      destinatarioNome: proprietarioId ? '' : destinatarioNome.trim(),
      localId: localId || null,
      observacoes: observacoes.trim(),
      itens,
      total: totalGeral,
      ...(prop ? {} : {}),
      criadoPor: currentUser?.nome || '',
    };
    onSave(payload);
  };

  const totalPorTipo = agruparPorTipo(itens);

  return (
    <Modal onClose={onCancel}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 20, marginBottom: 14 }}>
        {registro ? 'Editar orçamento' : 'Novo orçamento'}
      </div>

      <FormField label="Título *">
        <input value={titulo} onChange={e => setTitulo(e.target.value)} style={inputStyle}
          placeholder="Ex: Tratamento uterino Égua Luna" />
      </FormField>

      <FormField label="Proprietário (opcional — cadastrado no sistema)">
        <select value={proprietarioId} onChange={e => setProprietarioId(e.target.value)} style={inputStyle}>
          <option value="">— Prospect / não cadastrado —</option>
          {[...propRepro].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt')).map(p => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </FormField>
      {!proprietarioId && (
        <FormField label="Nome do destinatário (livre)">
          <input value={destinatarioNome} onChange={e => setDestinatarioNome(e.target.value)} style={inputStyle}
            placeholder="Nome do cliente" />
        </FormField>
      )}

      <FormField label="Local (opcional — usa valor de km como visita padrão)">
        <select value={localId} onChange={e => setLocalId(e.target.value)} style={inputStyle}>
          <option value="">— Sem local específico —</option>
          {[...locaisRepro].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt')).map(l => (
            <option key={l.id} value={l.id}>{l.nome}{l.cidade ? ` · ${l.cidade}` : ''}</option>
          ))}
        </select>
        {localId && valorKmLocal > 0 && (
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
            Km médio cadastrado: {BRL(valorKmLocal)}
          </div>
        )}
      </FormField>

      {/* Lista de itens */}
      <div style={{ marginTop: 14, marginBottom: 10 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8,
        }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
            Itens
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 700 }}>
            Total: {BRL(totalGeral)}
          </div>
        </div>

        {itens.length === 0 && (
          <div style={{
            padding: '18px 10px', textAlign: 'center', fontSize: 12, color: 'var(--ink-3)',
            border: '1px dashed var(--line)', borderRadius: 10, marginBottom: 10,
          }}>
            Nenhum item ainda. Use os atalhos abaixo pra começar.
          </div>
        )}

        {itens.map((it, idx) => (
          <ItemRow
            key={it.id || idx}
            item={it}
            insumos={insumos}
            onChange={(patch) => atualizar(idx, patch)}
            onRemove={() => remover(idx)}
          />
        ))}

        {/* Botões de atalho */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6, fontWeight: 600 }}>
            + Adicionar item
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <AtalhoBotao label="Visita" onClick={addItemVisita} />
            <AtalhoBotao label="IA" onClick={() => addItemProcedimento('ia')} />
            <AtalhoBotao label="CE +" onClick={() => addItemProcedimento('ce+')} />
            <AtalhoBotao label="CE −" onClick={() => addItemProcedimento('ce-')} />
            <AtalhoBotao label="CF" onClick={() => addItemProcedimento('cf')} />
            <AtalhoBotao label="TU" onClick={() => addItemProcedimento('tu')} />
            <AtalhoBotao label="Inovulação" onClick={() => addItemProcedimento('inovulacao')} />
            <AtalhoBotao label="Insumo" onClick={addItemInsumo} />
            <AtalhoBotao label="Resultado DG45+" onClick={addItemResultado} />
            <AtalhoBotao label="Personalizado" onClick={addItemPersonalizado} />
          </div>
        </div>

        {/* Resumo por tipo */}
        {totalPorTipo.length > 0 && (
          <div style={{
            marginTop: 14, padding: 12, borderRadius: 10,
            border: '1px solid var(--line)', background: 'var(--card)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 6 }}>
              Resumo
            </div>
            {totalPorTipo.map(([k, g]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                <span style={{ color: 'var(--ink-2)' }}>{g.label} ({g.itens.length})</span>
                <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{BRL(g.total)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
              <span style={{ color: 'var(--ink)' }}>Total</span>
              <span style={{ color: CORES_TAB_ATIVA }}>{BRL(totalGeral)}</span>
            </div>
          </div>
        )}
      </div>

      <FormField label="Observações">
        <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
          placeholder="Validade do orçamento, condições, ressalvas…" />
      </FormField>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--line)',
          background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>Cancelar</button>
        <button onClick={salvar} disabled={!titulo.trim()} style={{
          flex: 2, padding: '11px', borderRadius: 10, border: 'none',
          background: titulo.trim() ? CORES_TAB_ATIVA : 'var(--line)',
          color: '#fff', fontSize: 13, fontWeight: 700,
          cursor: titulo.trim() ? 'pointer' : 'default',
          opacity: titulo.trim() ? 1 : 0.5,
        }}>Salvar</button>
      </div>
    </Modal>
  );
}

function AtalhoBotao({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '7px 11px', borderRadius: 8,
      border: `1px dashed ${CORES_TAB_ATIVA}60`,
      background: 'transparent', color: CORES_TAB_ATIVA,
      fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)',
    }}>+ {label}</button>
  );
}

// Linha editável de um item do orçamento. Insumo tem seletor do catálogo
// (preenche descrição + valor); descartáveis de procedimento aparecem
// como linhas aninhadas editáveis.
function ItemRow({ item, insumos = [], onChange, onRemove }) {
  const [expand, setExpand] = useState(false);
  const temDescartaveis = Array.isArray(item.descartaveis) && item.descartaveis.length > 0;
  const total = totalItem(item);
  const tipoLabel = {
    visita: 'Visita', procedimento: 'Procedimento', insumo: 'Insumo',
    resultado: 'Resultado', personalizado: 'Outro',
  }[item.tipo] || '—';
  const tipoCor = {
    visita: '#0e7490', procedimento: '#7c2d8c', insumo: '#15803d',
    resultado: '#be123c', personalizado: '#c2410c',
  }[item.tipo] || 'var(--ink-3)';

  return (
    <div style={{
      border: '1px solid var(--line)', borderLeft: `3px solid ${tipoCor}`,
      borderRadius: 8, padding: 10, marginBottom: 8, background: 'var(--card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          background: `${tipoCor}20`, color: tipoCor,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>{tipoLabel}</span>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{BRL(total)}</div>
        <button onClick={onRemove} style={{
          width: 24, height: 24, borderRadius: 6, border: '1px solid var(--line)',
          background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer',
          display: 'grid', placeItems: 'center',
        }} title="Remover item">
          <Icon name="x" size={10} />
        </button>
      </div>

      {item.tipo === 'insumo' ? (
        <select
          value={item.insumoId || ''}
          onChange={e => {
            const ins = insumos.find(i => i.id === e.target.value);
            onChange({
              insumoId: ins?.id || null,
              descricao: ins?.nome || '',
              valorUnit: Number(ins?.valorVenda) || 0,
            });
          }}
          style={{ ...inputStyleSmall, marginBottom: 6 }}
        >
          <option value="">— Selecionar insumo —</option>
          {[...insumos].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt')).map(i => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
        </select>
      ) : (
        <input value={item.descricao || ''}
          onChange={e => onChange({ descricao: e.target.value })}
          style={{ ...inputStyleSmall, marginBottom: 6 }}
          placeholder="Descrição" />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 6 }}>
        <input type="number" min="0" step="0.5" value={item.qtd ?? ''}
          onChange={e => onChange({ qtd: Number(e.target.value) || 0 })}
          style={{ ...inputStyleSmall, textAlign: 'center' }}
          placeholder="Qtd" />
        <input type="number" min="0" step="0.01" value={item.valorUnit ?? ''}
          onChange={e => onChange({ valorUnit: Number(e.target.value) || 0 })}
          style={{ ...inputStyleSmall, textAlign: 'right' }}
          placeholder="Valor unit. (R$)" />
      </div>

      {temDescartaveis && (
        <div style={{ marginTop: 6 }}>
          <button type="button" onClick={() => setExpand(e => !e)} style={{
            background: 'none', border: 'none', fontSize: 10, color: 'var(--ink-3)',
            cursor: 'pointer', padding: 0, fontFamily: 'var(--sans)',
            textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700,
          }}>
            {expand ? '▾' : '▸'} Descartáveis ({item.descartaveis.length}) · {BRL((item.descartaveis || []).reduce((s, d) => s + d.qtd * d.valorUnit, 0))}
          </button>
          {expand && (
            <div style={{ marginTop: 6, paddingLeft: 8, borderLeft: '1px solid var(--line)' }}>
              {item.descartaveis.map((d, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr 50px 70px 24px', gap: 4, alignItems: 'center',
                  marginBottom: 4, fontSize: 11,
                }}>
                  <div style={{ color: 'var(--ink-2)' }}>{d.nome || '—'}</div>
                  <input type="number" min="0" step="0.5" value={d.qtd}
                    onChange={e => {
                      const arr = [...item.descartaveis];
                      arr[i] = { ...arr[i], qtd: Number(e.target.value) || 0 };
                      onChange({ descartaveis: arr });
                    }}
                    style={{ ...inputStyleSmall, textAlign: 'center', fontSize: 11, padding: '4px 6px' }} />
                  <input type="number" min="0" step="0.01" value={d.valorUnit}
                    onChange={e => {
                      const arr = [...item.descartaveis];
                      arr[i] = { ...arr[i], valorUnit: Number(e.target.value) || 0 };
                      onChange({ descartaveis: arr });
                    }}
                    style={{ ...inputStyleSmall, textAlign: 'right', fontSize: 11, padding: '4px 6px' }} />
                  <button type="button" onClick={() => {
                    onChange({ descartaveis: item.descartaveis.filter((_, j) => j !== i) });
                  }} style={{
                    width: 22, height: 22, borderRadius: 4, border: '1px solid var(--line)',
                    background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <Icon name="x" size={9} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
