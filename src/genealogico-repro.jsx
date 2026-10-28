// Processos de Registro Genealógico (ABCCH) — Epona Repro Team.
//
// Lista de potros em formação, do DG45+ até o registro final.
// Cada processo = 1 potro. Pode ser:
//  - Criado automaticamente quando DG45+ marcado em CE/Inovulação/IA prenhez
//  - Criado manualmente (ex: inspetor registrando potro de terceiros)
//
// Checklist por processo:
//  1. Comunicado de cobrição (checkbox + data)
//  2. Data e sexo do potro ao nascer
//  3. Comunicado de nascimento
//  4. Pré-registro (upload de PDF no Supabase Storage)
//  5. Inspeção (checkbox + data)
//  6. Pendências (texto livre)

import React, { useState, useMemo, useRef } from 'react';
import { Icon } from './icons';
import { supabase } from './utils/supabase';

const CORES_TAB_ATIVA = '#7c2d8c';
const fmtDataBr = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
  border: '1px solid var(--line)', background: 'var(--bg)', fontSize: 14, color: 'var(--ink)',
  fontFamily: 'var(--sans)', outline: 'none',
};
const inputStyleSmall = { ...inputStyle, padding: '7px 10px', fontSize: 13 };

function Modal({ children, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
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

// Progresso: quantos itens do checklist estão feitos (0 a 6).
// 1. cobrição, 2. nascimento data+sexo, 3. comunicado nascimento,
// 4. pré-registro, 5. inspeção. Nascimento conta como 1 só quando
// tem data E sexo.
function calcularProgresso(g) {
  let feitos = 0;
  const total = 5;
  if (g.comunicadoCobricaoFeito) feitos += 1;
  if (g.nascimentoData && g.nascimentoSexo) feitos += 1;
  if (g.comunicadoNascimentoFeito) feitos += 1;
  if (g.preRegistroUrl) feitos += 1;
  if (g.inspecaoFeita) feitos += 1;
  return { feitos, total, pct: Math.round((feitos / total) * 100) };
}

export function ReproGenealogico({
  genealogicosRepro = [], propRepro = [], currentUser,
  addGenealogicoRepro, updateGenealogicoRepro, deleteGenealogicoRepro,
}) {
  const [filtro, setFiltro] = useState('ativos'); // 'ativos' | 'concluidos' | 'todos'
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const lista = useMemo(() => {
    const base = [...genealogicosRepro].sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
    const porStatus = filtro === 'todos' ? base
      : filtro === 'concluidos' ? base.filter(g => g.status === 'concluido')
      : base.filter(g => g.status !== 'concluido');
    if (!busca.trim()) return porStatus;
    const t = busca.toLowerCase();
    return porStatus.filter(g =>
      (g.garanhaoNome || '').toLowerCase().includes(t)
      || (g.eguaDoadoraNome || '').toLowerCase().includes(t)
      || (g.proprietarioNome || '').toLowerCase().includes(t)
      || (g.receptoraNome || '').toLowerCase().includes(t)
    );
  }, [genealogicosRepro, filtro, busca]);

  const contadores = useMemo(() => ({
    ativos: genealogicosRepro.filter(g => g.status !== 'concluido').length,
    concluidos: genealogicosRepro.filter(g => g.status === 'concluido').length,
  }), [genealogicosRepro]);

  const abrirNovo = () => { setEditId(null); setShowForm(true); };
  const abrirEditar = (id) => { setEditId(id); setShowForm(true); };
  const editReg = editId ? genealogicosRepro.find(g => g.id === editId) : null;

  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--bg)',
      }}>
        {[
          ['ativos', `Em andamento (${contadores.ativos})`],
          ['concluidos', `Concluídos (${contadores.concluidos})`],
          ['todos', 'Todos'],
        ].map(([id, lbl]) => (
          <button key={id} onClick={() => setFiltro(id)} style={{
            flex: 1, padding: '10px 4px', border: 'none', background: 'none',
            borderBottom: `2px solid ${filtro === id ? CORES_TAB_ATIVA : 'transparent'}`,
            color: filtro === id ? CORES_TAB_ATIVA : 'var(--ink-3)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>{lbl}</button>
        ))}
      </div>

      <div style={{ padding: '12px 20px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por garanhão, égua, proprietário…" style={{ ...inputStyle, flex: 1 }} />
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
            {busca ? 'Nenhum processo encontrado.' :
              filtro === 'concluidos' ? 'Nenhum processo concluído ainda.' :
              'Nenhum processo em andamento. Processos são criados automaticamente quando um embrião é confirmado no DG45+.'}
          </div>
        )}
        {lista.map(g => <CardGenealogico key={g.id} g={g} onAbrir={() => abrirEditar(g.id)} />)}
      </div>

      {showForm && (
        <GenealogicoForm
          registro={editReg}
          propRepro={propRepro}
          currentUser={currentUser}
          onSave={(payload) => {
            if (editId) updateGenealogicoRepro(editId, payload);
            else addGenealogicoRepro(payload);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
          onDelete={editId && deleteGenealogicoRepro ? () => {
            if (window.confirm(`Excluir processo "${editReg?.garanhaoNome || ''} × ${editReg?.eguaDoadoraNome || ''}"?`)) {
              deleteGenealogicoRepro(editId);
              setShowForm(false);
            }
          } : null}
        />
      )}
    </div>
  );
}

function CardGenealogico({ g, onAbrir }) {
  const prog = calcularProgresso(g);
  const concluido = g.status === 'concluido' || prog.pct === 100;
  return (
    <button onClick={onAbrir} style={{
      width: '100%', textAlign: 'left',
      background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
      padding: '14px 16px', marginBottom: 10, cursor: 'pointer', color: 'var(--ink)',
      fontFamily: 'var(--sans)',
      opacity: concluido ? 0.75 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>
            {g.garanhaoNome || '—'} × {g.eguaDoadoraNome || '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
            {g.proprietarioNome || '—'}
            {g.receptoraNome ? ` · Rec.: ${g.receptoraNome}` : ''}
            {g.dataIa ? ` · IA ${fmtDataBr(g.dataIa)}` : ''}
          </div>
        </div>
        {g.origemTipo === 'manual' && (
          <span style={{
            fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700,
            background: '#fef3c7', color: '#78350f', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>Manual</span>
        )}
        {concluido && (
          <span style={{
            fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700,
            background: '#dcfce7', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>Concluído</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
        <ChipItem label="Cobrição" done={g.comunicadoCobricaoFeito} />
        <ChipItem label="Nascimento" done={g.nascimentoData && g.nascimentoSexo} />
        <ChipItem label="Com. nasc." done={g.comunicadoNascimentoFeito} />
        <ChipItem label="Pré-reg." done={!!g.preRegistroUrl} />
        <ChipItem label="Inspeção" done={g.inspecaoFeita} />
      </div>
      {g.pendencias && (
        <div style={{
          marginTop: 8, padding: '6px 8px', borderRadius: 6,
          background: '#fef3c7', fontSize: 11, color: '#78350f',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="bell" size={11} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {g.pendencias}
          </span>
        </div>
      )}
    </button>
  );
}
function ChipItem({ label, done }) {
  return (
    <span style={{
      fontSize: 10, padding: '3px 7px', borderRadius: 4, fontWeight: 700,
      background: done ? '#dcfce7' : 'var(--soft)',
      color: done ? '#15803d' : 'var(--ink-3)',
      letterSpacing: '0.03em',
    }}>{done ? '✓ ' : '· '}{label}</span>
  );
}

function GenealogicoForm({ registro, propRepro = [], currentUser, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(() => ({
    origemTipo: registro?.origemTipo || 'manual',
    origemId: registro?.origemId || null,
    garanhaoNome: registro?.garanhaoNome || '',
    eguaDoadoraNome: registro?.eguaDoadoraNome || '',
    proprietarioId: registro?.proprietarioId || '',
    proprietarioNome: registro?.proprietarioNome || '',
    receptoraNome: registro?.receptoraNome || '',
    dataIa: registro?.dataIa || '',
    dataTe: registro?.dataTe || '',
    comunicadoCobricaoFeito: !!registro?.comunicadoCobricaoFeito,
    comunicadoCobricaoData: registro?.comunicadoCobricaoData || '',
    nascimentoData: registro?.nascimentoData || '',
    nascimentoSexo: registro?.nascimentoSexo || '',
    comunicadoNascimentoFeito: !!registro?.comunicadoNascimentoFeito,
    comunicadoNascimentoData: registro?.comunicadoNascimentoData || '',
    preRegistroUrl: registro?.preRegistroUrl || '',
    preRegistroNomeArquivo: registro?.preRegistroNomeArquivo || '',
    inspecaoFeita: !!registro?.inspecaoFeita,
    inspecaoData: registro?.inspecaoData || '',
    pendencias: registro?.pendencias || '',
    observacoes: registro?.observacoes || '',
    status: registro?.status || 'em_andamento',
  }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState('');
  const fileInputRef = useRef(null);

  const hoje = new Date().toLocaleDateString('sv-SE');

  const toggleChecklist = (campo, dataCampo) => {
    const novo = !form[campo];
    set(campo, novo);
    if (novo && !form[dataCampo]) set(dataCampo, hoje);
    if (!novo) set(dataCampo, '');
  };

  const uploadArquivo = async (file) => {
    if (!file) return;
    setErro(''); setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${registro?.id || 'novo_' + Date.now()}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from('genealogicos').upload(path, file, {
        cacheControl: '3600', upsert: true, contentType: file.type || 'application/pdf',
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('genealogicos').getPublicUrl(path);
      set('preRegistroUrl', data.publicUrl);
      set('preRegistroNomeArquivo', safeName);
    } catch (e) {
      setErro(`Erro no upload: ${e.message || 'desconhecido'}`);
    } finally {
      setUploading(false);
    }
  };
  const removerArquivo = () => {
    set('preRegistroUrl', ''); set('preRegistroNomeArquivo', '');
  };

  const salvar = () => {
    if (!form.garanhaoNome.trim() && !form.eguaDoadoraNome.trim()) {
      window.alert('Preencha ao menos o nome do garanhão OU da égua doadora.');
      return;
    }
    const prop = propRepro.find(p => p.id === form.proprietarioId);
    onSave({
      ...form,
      proprietarioNome: prop?.nome || form.proprietarioNome || '',
      criadoPor: currentUser?.nome || '',
    });
  };

  return (
    <Modal onClose={onCancel}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 20, marginBottom: 14 }}>
        {registro ? 'Editar processo' : 'Novo processo'}
      </div>

      {/* Cruzamento */}
      <div style={{
        padding: 10, borderRadius: 10, background: 'var(--card)',
        border: '1px solid var(--line)', marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, fontWeight: 700 }}>
          Cruzamento
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <FormField label="Garanhão">
            <input value={form.garanhaoNome} onChange={e => set('garanhaoNome', e.target.value)} style={inputStyleSmall} />
          </FormField>
          <FormField label="Égua / Doadora">
            <input value={form.eguaDoadoraNome} onChange={e => set('eguaDoadoraNome', e.target.value)} style={inputStyleSmall} />
          </FormField>
        </div>
        <FormField label="Proprietário">
          <select value={form.proprietarioId} onChange={e => set('proprietarioId', e.target.value)} style={inputStyleSmall}>
            <option value="">— Não cadastrado / terceiros —</option>
            {[...propRepro].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt')).map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </FormField>
        {!form.proprietarioId && (
          <FormField label="Nome do proprietário (livre)">
            <input value={form.proprietarioNome} onChange={e => set('proprietarioNome', e.target.value)} style={inputStyleSmall} />
          </FormField>
        )}
        <FormField label="Nome da receptora (quando houver TE)">
          <input value={form.receptoraNome} onChange={e => set('receptoraNome', e.target.value)} style={inputStyleSmall} placeholder="Opcional" />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <FormField label="Data da IA">
            <input type="date" value={form.dataIa || ''} onChange={e => set('dataIa', e.target.value)} style={inputStyleSmall} />
          </FormField>
          <FormField label="Data da TE (se houve)">
            <input type="date" value={form.dataTe || ''} onChange={e => set('dataTe', e.target.value)} style={inputStyleSmall} />
          </FormField>
        </div>
      </div>

      {/* Checklist */}
      <div style={{
        padding: 10, borderRadius: 10, background: 'var(--card)',
        border: '1px solid var(--line)', marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, fontWeight: 700 }}>
          Checklist
        </div>

        <ChecklistItem
          label="Comunicado de cobrição"
          feito={form.comunicadoCobricaoFeito}
          data={form.comunicadoCobricaoData}
          onToggle={() => toggleChecklist('comunicadoCobricaoFeito', 'comunicadoCobricaoData')}
          onDataChange={(v) => set('comunicadoCobricaoData', v)}
        />

        {/* Nascimento: data + sexo */}
        <div style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontSize: 12, color: 'var(--ink), fontWeight: 600, marginBottom: 6' }}>Nascimento do potro</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <input type="date" value={form.nascimentoData} onChange={e => set('nascimentoData', e.target.value)} style={inputStyleSmall} />
            <select value={form.nascimentoSexo} onChange={e => set('nascimentoSexo', e.target.value)} style={inputStyleSmall}>
              <option value="">— Sexo —</option>
              <option value="macho">♂ Macho</option>
              <option value="femea">♀ Fêmea</option>
            </select>
          </div>
        </div>

        <ChecklistItem
          label="Comunicado de nascimento"
          feito={form.comunicadoNascimentoFeito}
          data={form.comunicadoNascimentoData}
          onToggle={() => toggleChecklist('comunicadoNascimentoFeito', 'comunicadoNascimentoData')}
          onDataChange={(v) => set('comunicadoNascimentoData', v)}
        />

        {/* Pré-registro: upload */}
        <div style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>Pré-registro (PDF)</span>
            {form.preRegistroUrl && (
              <span style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                background: '#dcfce7', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>✓ Anexado</span>
            )}
          </div>
          {form.preRegistroUrl ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <a href={form.preRegistroUrl} target="_blank" rel="noopener noreferrer" style={{
                flex: 1, padding: '7px 10px', borderRadius: 6,
                background: 'var(--bg)', color: CORES_TAB_ATIVA, fontSize: 12,
                textDecoration: 'none', border: '1px solid var(--line)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                📄 {form.preRegistroNomeArquivo || 'Abrir PDF'}
              </a>
              <button onClick={removerArquivo} style={{
                padding: '7px 10px', borderRadius: 6, border: '1px solid #dc262640',
                background: '#fee2e2', color: '#dc2626', fontSize: 11, cursor: 'pointer',
              }}>Remover</button>
            </div>
          ) : (
            <>
              <input ref={fileInputRef} type="file" accept="application/pdf,image/*"
                onChange={e => { if (e.target.files?.[0]) uploadArquivo(e.target.files[0]); }}
                style={{ display: 'none' }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{
                width: '100%', padding: '10px', borderRadius: 8,
                border: '1px dashed var(--line)', background: 'transparent',
                color: 'var(--ink-2)', fontSize: 12, fontWeight: 600,
                cursor: uploading ? 'default' : 'pointer', fontFamily: 'var(--sans)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {uploading ? 'Enviando…' : '📎 Anexar PDF do pré-registro'}
              </button>
            </>
          )}
          {erro && (
            <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>{erro}</div>
          )}
        </div>

        <ChecklistItem
          label="Inspeção"
          feito={form.inspecaoFeita}
          data={form.inspecaoData}
          onToggle={() => toggleChecklist('inspecaoFeita', 'inspecaoData')}
          onDataChange={(v) => set('inspecaoData', v)}
          semBorder
        />
      </div>

      {/* Pendências */}
      <FormField label="⚠ Pendências (o que está empacando?)">
        <textarea value={form.pendencias} onChange={e => set('pendencias', e.target.value)}
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
          placeholder="Ex: falta certidão da égua; aguardando pedido do proprietário…" />
      </FormField>

      <FormField label="Observações gerais">
        <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
      </FormField>

      {/* Status */}
      <FormField label="Status do processo">
        <div style={{ display: 'flex', gap: 6 }}>
          {[['em_andamento', 'Em andamento'], ['concluido', '✓ Concluído']].map(([v, lbl]) => (
            <button key={v} type="button" onClick={() => set('status', v)} style={{
              flex: 1, padding: '9px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              border: `1.5px solid ${form.status === v ? (v === 'concluido' ? '#15803d' : CORES_TAB_ATIVA) : 'var(--line)'}`,
              background: form.status === v ? (v === 'concluido' ? '#dcfce7' : '#f5e8ff') : 'var(--card)',
              color: form.status === v ? (v === 'concluido' ? '#15803d' : CORES_TAB_ATIVA) : 'var(--ink-2)',
              cursor: 'pointer', fontFamily: 'var(--sans)',
            }}>{lbl}</button>
          ))}
        </div>
      </FormField>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {onDelete && (
          <button onClick={onDelete} style={{
            padding: '11px 14px', borderRadius: 10, border: '1px solid #dc262640',
            background: '#fee2e2', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>Excluir</button>
        )}
        <button onClick={onCancel} style={{
          flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--line)',
          background: 'var(--card)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>Cancelar</button>
        <button onClick={salvar} style={{
          flex: 2, padding: '11px', borderRadius: 10, border: 'none',
          background: CORES_TAB_ATIVA, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>Salvar</button>
      </div>
    </Modal>
  );
}

function ChecklistItem({ label, feito, data, onToggle, onDataChange, semBorder = false }) {
  return (
    <div style={{
      padding: '8px 0',
      borderBottom: semBorder ? 'none' : '1px solid var(--line)',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
        <input type="checkbox" checked={!!feito} onChange={onToggle} style={{ width: 16, height: 16, cursor: 'pointer' }} />
        <span style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>{label}</span>
      </label>
      {feito && (
        <input type="date" value={data || ''} onChange={e => onDataChange(e.target.value)}
          style={{ ...inputStyleSmall, width: 140, padding: '5px 8px' }} />
      )}
    </div>
  );
}
