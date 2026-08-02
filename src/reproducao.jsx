// reproducao.jsx — Módulo de Reprodução Equina
import React, { useState, useMemo } from 'react';
import { Icon } from './icons';

const pad2 = n => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
const addDays = (ds, n) => {
  if (!ds) return '';
  const d = new Date(ds + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
};
const fmtDate = ds => {
  if (!ds) return '—';
  const [y, m, d] = ds.split('-');
  return `${parseInt(d)}/${parseInt(m)}/${y}`;
};
const diffDays = (a, b = todayStr()) => {
  if (!a) return 9999;
  const da = new Date(a + 'T12:00:00'), db = new Date(b + 'T12:00:00');
  return Math.round((da - db) / 86400000);
};
const fmtMes = m => {
  if (!m) return '';
  const [a, mm] = m.split('-');
  return new Date(parseInt(a), parseInt(mm) - 1, 15).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

// ── Cores ──────────────────────────────────────────────────────────
const COR_REPROD = '#7c2d8c';

const TIPO_META = {
  controle_folicular:     { label: 'Controle Folicular',     cor: '#0e7490', bg: '#cffafe' },
  inseminacao_artificial: { label: 'Inseminação Artificial',  cor: '#1d4ed8', bg: '#dbeafe' },
  coleta_embriao:         { label: 'Coleta de Embrião',       cor: '#b45309', bg: '#fef3c7' },
  lavagem_uterina:        { label: 'Lavagem Uterina',         cor: '#15803d', bg: '#dcfce7' },
  diagnostico_gestacao:   { label: 'Diagnóstico de Gestação', cor: '#9d174d', bg: '#fce7f3' },
};

const TIPOS_ORDEM = ['controle_folicular', 'inseminacao_artificial', 'coleta_embriao', 'lavagem_uterina', 'diagnostico_gestacao'];

const inputSt = {
  width: '100%', padding: '11px 13px', borderRadius: 11,
  border: '1px solid var(--line)', background: 'var(--card)',
  fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)',
  outline: 'none', boxSizing: 'border-box',
};

// ── Insumos Section ───────────────────────────────────────────────
function InsumosSection({ insumos, value, onChange }) {
  const addRow = () => onChange([...value, { insumoId: '', qtd: '' }]);
  const upd = (i, k, v) => { const a = [...value]; a[i] = { ...a[i], [k]: v }; onChange(a); };
  const rem = (i) => { const a = [...value]; a.splice(i, 1); onChange(a); };
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-3)', marginBottom: 8 }}>Insumos Utilizados</div>
      {value.map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 36px', gap: 6, marginBottom: 8, alignItems: 'center' }}>
          <select value={row.insumoId} onChange={e => upd(i, 'insumoId', e.target.value)} style={{ ...inputSt, padding: '9px 11px', fontSize: 13 }}>
            <option value="">— Insumo —</option>
            {insumos.map(ins => <option key={ins.id} value={ins.id}>{ins.nome}</option>)}
          </select>
          <input type="number" min="0" step="0.01" value={row.qtd} onChange={e => upd(i, 'qtd', e.target.value)} placeholder="Qtd" style={{ ...inputSt, padding: '9px 8px', fontSize: 13 }} />
          <button onClick={() => rem(i)} style={{ background: '#fef2f2', border: 'none', borderRadius: 8, padding: '7px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={12} color="#dc2626" />
          </button>
        </div>
      ))}
      <button onClick={addRow} style={{ background: 'var(--accent-soft)', border: '1px dashed var(--accent)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer' }}>
        + Adicionar insumo
      </button>
    </div>
  );
}

// ── Sub-form: Controle Folicular ──────────────────────────────────
function ControleFolicularForm({ dados, onChange, insumos }) {
  const set = (k, v) => onChange({ ...dados, [k]: v });
  const campos = [
    { id: 'ovarioDireito', label: 'Ovário Direito', placeholder: 'Ex: folículo 35mm' },
    { id: 'ovarEsquerdo', label: 'Ovário Esquerdo', placeholder: 'Ex: folículo 38mm' },
    { id: 'edemaUterino', label: 'Edema Uterino', placeholder: 'Ex: Grau 2' },
    { id: 'tonusUterino', label: 'Tonus Uterino', placeholder: 'Ex: Normal' },
    { id: 'tonusCervical', label: 'Tônus Cervical', placeholder: 'Ex: Relaxado' },
    { id: 'liquidoLivre', label: 'Líquido Livre', placeholder: 'Ex: Ausente' },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {campos.map(c => (
          <div key={c.id}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>{c.label}</div>
            <input value={dados[c.id] || ''} onChange={e => set(c.id, e.target.value)} placeholder={c.placeholder} style={{ ...inputSt, padding: '9px 11px', fontSize: 13 }} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Observações</div>
        <textarea value={dados.observacoes || ''} onChange={e => set('observacoes', e.target.value)} rows={2} style={{ ...inputSt, resize: 'vertical', fontSize: 13, padding: '9px 11px' }} placeholder="Observações clínicas…" />
      </div>
      <div style={{ background: 'var(--soft)', borderRadius: 12, padding: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!dados.induzirOvulacao} onChange={e => set('induzirOvulacao', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Induzir ovulação</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Selecionar insumo e horário → gerar alerta</div>
          </div>
        </label>
        {dados.induzirOvulacao && (
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Insumo para indução</div>
              <select value={dados.insumoOvulacaoId || ''} onChange={e => set('insumoOvulacaoId', e.target.value)} style={{ ...inputSt, padding: '9px 11px', fontSize: 13 }}>
                <option value="">— Selecionar —</option>
                {insumos.map(ins => <option key={ins.id} value={ins.id}>{ins.nome}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Horário</div>
              <input type="time" value={dados.horarioOvulacao || ''} onChange={e => set('horarioOvulacao', e.target.value)} style={{ ...inputSt, padding: '9px 11px', fontSize: 13 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-form: Inseminação Artificial ─────────────────────────────
function InseminacaoArtificialForm({ dados, onChange, data }) {
  const set = (k, v) => onChange({ ...dados, [k]: v });

  const handleDestino = (d) => {
    const next = { ...dados, destino: d };
    if (d === 'gestacao') { next.dataDG = data ? addDays(data, 12) : ''; next.dataColeta = ''; }
    if (d === 'transferencia') { next.dataColeta = data ? addDays(data, 9) : ''; next.dataDG = ''; }
    onChange(next);
  };

  const destino = dados.destino || 'gestacao';

  React.useEffect(() => {
    if (!dados.destino) handleDestino('gestacao');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Garanhão / Doador</div>
          <input value={dados.garanhao || ''} onChange={e => set('garanhao', e.target.value)} placeholder="Nome do garanhão" style={{ ...inputSt, padding: '9px 11px', fontSize: 13 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Qtd Palhetas</div>
          <input type="number" min="1" step="1" value={dados.qtdPalhetas || ''} onChange={e => set('qtdPalhetas', e.target.value)} style={{ ...inputSt, padding: '9px 11px', fontSize: 13 }} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>Ovulações</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['1 ovulação', '2 ovulações', '3+ ovulações'].map(o => {
            const sel = (dados.ovulacoes || '1 ovulação') === o;
            return <button key={o} onClick={() => set('ovulacoes', o)} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1.5px solid ${sel ? '#1d4ed8' : 'var(--line)'}`, background: sel ? '#1d4ed825' : 'var(--card)', color: sel ? '#1d4ed8' : 'var(--ink-2)', fontSize: 12, fontWeight: sel ? 700 : 400, fontFamily: 'var(--sans)', cursor: 'pointer' }}>{o}</button>;
          })}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>Destino</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['gestacao', 'Gestação'], ['transferencia', 'Transferência de Embrião']].map(([val, label]) => {
            const sel = destino === val;
            return <button key={val} onClick={() => handleDestino(val)} style={{ padding: '10px', borderRadius: 10, border: `1.5px solid ${sel ? '#1d4ed8' : 'var(--line)'}`, background: sel ? '#1d4ed825' : 'var(--card)', color: sel ? '#1d4ed8' : 'var(--ink-2)', fontSize: 13, fontWeight: sel ? 700 : 400, fontFamily: 'var(--sans)', cursor: 'pointer', textAlign: 'center' }}>{label}</button>;
          })}
        </div>
      </div>
      {destino === 'gestacao' && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Data do Diagnóstico de Gestação <span style={{ color: '#6b7280' }}>(padrão: +12 dias)</span></div>
          <input type="date" value={dados.dataDG || ''} onChange={e => set('dataDG', e.target.value)} style={{ ...inputSt, padding: '9px 11px', fontSize: 13 }} />
        </div>
      )}
      {destino === 'transferencia' && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Data da Coleta de Embrião <span style={{ color: '#6b7280' }}>(padrão: +9 dias)</span></div>
          <input type="date" value={dados.dataColeta || ''} onChange={e => set('dataColeta', e.target.value)} style={{ ...inputSt, padding: '9px 11px', fontSize: 13 }} />
        </div>
      )}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Data de retorno (palpação prévia)</div>
        <input type="date" value={dados.dataRetornoPrevio || ''} onChange={e => set('dataRetornoPrevio', e.target.value)} style={{ ...inputSt, padding: '9px 11px', fontSize: 13 }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Observações</div>
        <textarea value={dados.observacoes || ''} onChange={e => set('observacoes', e.target.value)} rows={2} style={{ ...inputSt, resize: 'vertical', fontSize: 13, padding: '9px 11px' }} placeholder="Observações…" />
      </div>
    </div>
  );
}

// ── Sub-form: Coleta de Embrião ───────────────────────────────────
function ColetaEmbriaoForm({ dados, onChange, iaRef }) {
  const set = (k, v) => onChange({ ...dados, [k]: v });
  const isPos = dados.resultado === 'positivo';
  return (
    <div>
      {iaRef && (
        <div style={{ background: '#dbeafe', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: '#1d4ed8' }}>
          <strong>IA de referência:</strong> {fmtDate(iaRef.data)}{iaRef.dados?.garanhao ? ` — ${iaRef.dados.garanhao}` : ''}
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>Resultado da Coleta</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['positivo', '✓ Positivo', '#15803d'], ['negativo', '✗ Negativo', '#dc2626']].map(([val, label, cor]) => {
            const sel = dados.resultado === val;
            return <button key={val} onClick={() => set('resultado', val)} style={{ padding: '10px', borderRadius: 10, border: `1.5px solid ${sel ? cor : 'var(--line)'}`, background: sel ? cor + '20' : 'var(--card)', color: sel ? cor : 'var(--ink-2)', fontSize: 13, fontWeight: sel ? 700 : 400, fontFamily: 'var(--sans)', cursor: 'pointer' }}>{label}</button>;
          })}
        </div>
      </div>
      {isPos && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>Destino do Embrião</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[['envio', 'Envio à Central'], ['inovulacao', 'Inovulação']].map(([val, label]) => {
              const sel = dados.destinoEmbriao === val;
              return <button key={val} onClick={() => set('destinoEmbriao', val)} style={{ padding: '10px', borderRadius: 10, border: `1.5px solid ${sel ? '#b45309' : 'var(--line)'}`, background: sel ? '#b4530920' : 'var(--card)', color: sel ? '#b45309' : 'var(--ink-2)', fontSize: 13, fontWeight: sel ? 700 : 400, fontFamily: 'var(--sans)', cursor: 'pointer' }}>{label}</button>;
            })}
          </div>
          {dados.destinoEmbriao === 'envio' && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Central</div>
              <input value={dados.centralEnvio || ''} onChange={e => set('centralEnvio', e.target.value)} placeholder="Nome da central de embriões" style={{ ...inputSt, padding: '9px 11px', fontSize: 13 }} />
            </div>
          )}
          {dados.destinoEmbriao === 'inovulacao' && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Receptora</div>
              <input value={dados.receptora || ''} onChange={e => set('receptora', e.target.value)} placeholder="Nome da égua receptora" style={{ ...inputSt, padding: '9px 11px', fontSize: 13 }} />
            </div>
          )}
        </div>
      )}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Observações</div>
        <textarea value={dados.observacoes || ''} onChange={e => set('observacoes', e.target.value)} rows={2} style={{ ...inputSt, resize: 'vertical', fontSize: 13, padding: '9px 11px' }} placeholder="Observações…" />
      </div>
    </div>
  );
}

// ── Sub-form: Lavagem Uterina ─────────────────────────────────────
function LavagemUterinaForm({ dados, onChange }) {
  const set = (k, v) => onChange({ ...dados, [k]: v });
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Observações e protocolo</div>
        <textarea value={dados.observacoes || ''} onChange={e => set('observacoes', e.target.value)} rows={3} style={{ ...inputSt, resize: 'vertical', fontSize: 13, padding: '9px 11px' }} placeholder="Protocolo utilizado, solução, volume…" />
      </div>
    </div>
  );
}

// ── Sub-form: Diagnóstico de Gestação ────────────────────────────
function DiagnosticoGestacaoForm({ dados, onChange, iaRef, dataRegistro }) {
  const set = (k, v) => onChange({ ...dados, [k]: v });
  const isPos = dados.resultado === 'positivo';

  const diasGestacao = useMemo(() => {
    if (!iaRef?.data || !dataRegistro) return null;
    return diffDays(dataRegistro, iaRef.data);
  }, [iaRef, dataRegistro]);

  return (
    <div>
      {iaRef && (
        <div style={{ background: '#dbeafe', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: '#1d4ed8' }}>
          <strong>IA de referência:</strong> {fmtDate(iaRef.data)}
          {iaRef.dados?.garanhao && ` — ${iaRef.dados.garanhao}`}
          {diasGestacao !== null && ` · ${diasGestacao} dias`}
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>Resultado</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['positivo', '✓ Gestante', '#15803d'], ['negativo', '✗ Vazio', '#dc2626']].map(([val, label, cor]) => {
            const sel = dados.resultado === val;
            return <button key={val} onClick={() => set('resultado', val)} style={{ padding: '10px', borderRadius: 10, border: `1.5px solid ${sel ? cor : 'var(--line)'}`, background: sel ? cor + '20' : 'var(--card)', color: sel ? cor : 'var(--ink-2)', fontSize: 13, fontWeight: sel ? 700 : 400, fontFamily: 'var(--sans)', cursor: 'pointer' }}>{label}</button>;
          })}
        </div>
      </div>
      {isPos && (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Tamanho da Vesícula</div>
            <input value={dados.tamanhoVesicula || ''} onChange={e => set('tamanhoVesicula', e.target.value)} placeholder="Ex: 18mm" style={{ ...inputSt, padding: '9px 11px', fontSize: 13 }} />
          </div>
          {(diasGestacao === null || diasGestacao >= 22) && (
            <div style={{ background: 'var(--soft)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!dados.batimentosVisiveis} onChange={e => set('batimentosVisiveis', e.target.checked)} style={{ width: 17, height: 17, cursor: 'pointer' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Batimentos cardíacos visíveis</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Marcar quando detectado (após ~22 dias)</div>
                </div>
              </label>
            </div>
          )}
        </>
      )}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Observações</div>
        <textarea value={dados.observacoes || ''} onChange={e => set('observacoes', e.target.value)} rows={2} style={{ ...inputSt, resize: 'vertical', fontSize: 13, padding: '9px 11px' }} placeholder="Observações…" />
      </div>
    </div>
  );
}

// ── Formulário Principal ──────────────────────────────────────────
function RegistroReprodutivoForm({ cavalos, insumos, registrosReproducao, initial, onSave, onCancel }) {
  const eguasPresentes = cavalos.filter(c => c.presente).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

  const [eguaId, setEguaId] = useState(initial?.eguaId || '');
  const [data, setData] = useState(initial?.data || todayStr());
  const [tipo, setTipo] = useState(initial?.tipo || 'controle_folicular');
  const [dados, setDados] = useState(initial?.dados || {});
  const [insumosUsados, setInsumosUsados] = useState(initial?.insumosUsados || []);
  const [dataRetorno, setDataRetorno] = useState(initial?.dataRetorno || '');

  const ultimaIA = useMemo(() => {
    if (!eguaId || !['coleta_embriao', 'diagnostico_gestacao'].includes(tipo)) return null;
    const ias = (registrosReproducao || [])
      .filter(r => r.eguaId === eguaId && r.tipo === 'inseminacao_artificial')
      .sort((a, b) => b.data.localeCompare(a.data));
    return ias[0] || null;
  }, [eguaId, tipo, registrosReproducao]);

  const handleTipo = (t) => { setTipo(t); setDados({}); };
  const canSave = eguaId && data && tipo;
  const meta = TIPO_META[tipo] || TIPO_META.controle_folicular;

  return (
    <div style={{ background: 'var(--soft)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>
        {initial ? 'Editar registro' : 'Novo registro reprodutivo'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Égua *</div>
          <select value={eguaId} onChange={e => setEguaId(e.target.value)} style={{ ...inputSt, padding: '9px 11px', fontSize: 13 }}>
            <option value="">— Selecionar —</option>
            {eguasPresentes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Data *</div>
          <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ ...inputSt, padding: '9px 11px', fontSize: 13 }} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>Tipo de registro *</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TIPOS_ORDEM.map(t => {
            const m = TIPO_META[t];
            const sel = tipo === t;
            return (
              <button key={t} onClick={() => handleTipo(t)} style={{ padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${sel ? m.cor : 'var(--line)'}`, background: sel ? m.bg : 'var(--card)', color: sel ? m.cor : 'var(--ink-2)', fontSize: 13, fontWeight: sel ? 700 : 400, fontFamily: 'var(--sans)', cursor: 'pointer', textAlign: 'left' }}>
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginBottom: 14 }} />

      {tipo === 'controle_folicular' && <ControleFolicularForm dados={dados} onChange={setDados} insumos={insumos} />}
      {tipo === 'inseminacao_artificial' && <InseminacaoArtificialForm dados={dados} onChange={setDados} data={data} />}
      {tipo === 'coleta_embriao' && <ColetaEmbriaoForm dados={dados} onChange={setDados} iaRef={ultimaIA} />}
      {tipo === 'lavagem_uterina' && <LavagemUterinaForm dados={dados} onChange={setDados} />}
      {tipo === 'diagnostico_gestacao' && <DiagnosticoGestacaoForm dados={dados} onChange={setDados} iaRef={ultimaIA} dataRegistro={data} />}

      <InsumosSection insumos={insumos} value={insumosUsados} onChange={setInsumosUsados} />

      {tipo !== 'inseminacao_artificial' && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Data de retorno / próxima palpação</div>
          <input type="date" value={dataRetorno} onChange={e => setDataRetorno(e.target.value)} style={{ ...inputSt, padding: '9px 11px', fontSize: 13 }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', fontSize: 14, fontFamily: 'var(--sans)', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button disabled={!canSave} onClick={() => onSave({ eguaId, data, tipo, dados, insumosUsados, dataRetorno: dataRetorno || null })} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: canSave ? meta.cor : 'var(--soft)', color: canSave ? '#fff' : 'var(--ink-3)', fontSize: 14, fontWeight: 700, fontFamily: 'var(--sans)', cursor: canSave ? 'pointer' : 'default' }}>
          Salvar registro
        </button>
      </div>
    </div>
  );
}

// ── Card de registro ──────────────────────────────────────────────
function RegistroCard({ registro, cavalos, insumos, isAdmin, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TIPO_META[registro.tipo] || TIPO_META.controle_folicular;
  const d = registro.dados || {};

  const resumo = () => {
    if (registro.tipo === 'controle_folicular') {
      const parts = [];
      if (d.ovarioDireito) parts.push(`OD: ${d.ovarioDireito}`);
      if (d.ovarEsquerdo) parts.push(`OE: ${d.ovarEsquerdo}`);
      if (d.induzirOvulacao) parts.push('⚡ Ovulação induzida');
      return parts.join(' · ') || 'Controle folicular';
    }
    if (registro.tipo === 'inseminacao_artificial') {
      const parts = [];
      if (d.garanhao) parts.push(d.garanhao);
      if (d.qtdPalhetas) parts.push(`${d.qtdPalhetas} palheta${d.qtdPalhetas > 1 ? 's' : ''}`);
      parts.push(d.destino === 'transferencia' ? '→ TE' : '→ Gestação');
      return parts.join(' · ');
    }
    if (registro.tipo === 'coleta_embriao') {
      const r = d.resultado === 'positivo' ? '✓ Positiva' : d.resultado === 'negativo' ? '✗ Negativa' : '—';
      const dest = d.destinoEmbriao === 'inovulacao' ? (d.receptora ? ` → ${d.receptora}` : ' → receptora') : d.centralEnvio ? ` → ${d.centralEnvio}` : '';
      return `Coleta ${r}${dest}`;
    }
    if (registro.tipo === 'lavagem_uterina') return d.observacoes?.slice(0, 60) || 'Lavagem uterina';
    if (registro.tipo === 'diagnostico_gestacao') {
      const r = d.resultado === 'positivo' ? '✓ Gestante' : d.resultado === 'negativo' ? '✗ Vazio' : '—';
      return `${r}${d.tamanhoVesicula ? ` · ${d.tamanhoVesicula}` : ''}`;
    }
    return '';
  };

  const dias = registro.dataRetorno ? diffDays(registro.dataRetorno) : null;
  const egua = cavalos.find(c => c.id === registro.eguaId);
  const nomeEgua = egua?.nome || '—';

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, marginBottom: 10, overflow: 'hidden', borderLeft: `3px solid ${meta.cor}` }}>
      <button onClick={() => setExpanded(e => !e)} style={{ width: '100%', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ background: meta.bg, color: meta.cor, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{meta.label}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{fmtDate(registro.data)}</span>
          <span style={{ marginLeft: 'auto', fontSize: 16, color: 'var(--ink-3)' }}>{expanded ? '▲' : '▼'}</span>
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)', marginBottom: 3 }}>{nomeEgua}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{resumo()}</div>
        {registro.dataRetorno && (
          <div style={{ fontSize: 11, color: dias !== null && dias <= 2 ? '#dc2626' : '#b45309', marginTop: 3 }}>
            ↩ Retorno: {fmtDate(registro.dataRetorno)}{dias === 0 ? ' (hoje)' : dias === 1 ? ' (amanhã)' : dias !== null && dias < 0 ? ` (${Math.abs(dias)}d atrás)` : ''}
          </div>
        )}
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--line)' }}>
          {registro.tipo === 'controle_folicular' && (
            <div style={{ paddingTop: 10 }}>
              {[['Ovário Direito', d.ovarioDireito], ['Ovário Esquerdo', d.ovarEsquerdo], ['Edema Uterino', d.edemaUterino], ['Tonus Uterino', d.tonusUterino], ['Tônus Cervical', d.tonusCervical], ['Líquido Livre', d.liquidoLivre]].filter(([,v]) => v).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', borderBottom: '1px solid var(--soft)' }}>
                  <span style={{ color: 'var(--ink-3)' }}>{k}</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              {d.induzirOvulacao && (
                <div style={{ background: '#fef3c7', borderRadius: 8, padding: '8px 10px', marginTop: 8, fontSize: 12, color: '#b45309' }}>
                  ⚡ Ovulação induzida às {d.horarioOvulacao || '—'}
                  {d.insumoOvulacaoId && insumos.find(i => i.id === d.insumoOvulacaoId) && ` com ${insumos.find(i => i.id === d.insumoOvulacaoId).nome}`}
                </div>
              )}
              {d.observacoes && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 8 }}>{d.observacoes}</div>}
            </div>
          )}

          {registro.tipo === 'inseminacao_artificial' && (
            <div style={{ paddingTop: 10 }}>
              {[['Garanhão', d.garanhao], ['Palhetas', d.qtdPalhetas], ['Ovulações', d.ovulacoes], ['Destino', d.destino === 'transferencia' ? 'Transferência de Embrião' : 'Gestação']].filter(([,v]) => v).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', borderBottom: '1px solid var(--soft)' }}>
                  <span style={{ color: 'var(--ink-3)' }}>{k}</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{String(v)}</span>
                </div>
              ))}
              {d.dataDG && <div style={{ fontSize: 12, color: '#1d4ed8', marginTop: 8 }}>📅 DG previsto: {fmtDate(d.dataDG)}</div>}
              {d.dataColeta && <div style={{ fontSize: 12, color: '#b45309', marginTop: 6 }}>📅 Coleta prevista: {fmtDate(d.dataColeta)}</div>}
              {d.dataRetornoPrevio && <div style={{ fontSize: 12, color: '#b45309', marginTop: 6 }}>↩ Retorno prévio: {fmtDate(d.dataRetornoPrevio)}</div>}
              {d.observacoes && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 8 }}>{d.observacoes}</div>}
            </div>
          )}

          {registro.tipo === 'coleta_embriao' && (
            <div style={{ paddingTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: d.resultado === 'positivo' ? '#15803d' : '#dc2626', marginBottom: 8 }}>
                {d.resultado === 'positivo' ? '✓ Coleta Positiva' : '✗ Coleta Negativa'}
              </div>
              {d.resultado === 'positivo' && (
                <>
                  {d.destinoEmbriao === 'envio' && d.centralEnvio && <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Central: {d.centralEnvio}</div>}
                  {d.destinoEmbriao === 'inovulacao' && d.receptora && <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Receptora: {d.receptora}</div>}
                </>
              )}
              {d.observacoes && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 8 }}>{d.observacoes}</div>}
            </div>
          )}

          {registro.tipo === 'lavagem_uterina' && (
            <div style={{ paddingTop: 10 }}>
              {d.observacoes && <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{d.observacoes}</div>}
            </div>
          )}

          {registro.tipo === 'diagnostico_gestacao' && (
            <div style={{ paddingTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: d.resultado === 'positivo' ? '#15803d' : '#dc2626', marginBottom: 8 }}>
                {d.resultado === 'positivo' ? '✓ Gestação Confirmada' : '✗ Diagnóstico Negativo'}
              </div>
              {d.tamanhoVesicula && <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Vesícula: {d.tamanhoVesicula}</div>}
              {d.batimentosVisiveis !== undefined && d.batimentosVisiveis !== null && (
                <div style={{ fontSize: 13, color: d.batimentosVisiveis ? '#15803d' : 'var(--ink-3)' }}>
                  {d.batimentosVisiveis ? '♥ Batimentos cardíacos visíveis' : 'Sem batimentos visíveis'}
                </div>
              )}
              {d.observacoes && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 8 }}>{d.observacoes}</div>}
            </div>
          )}

          {(registro.insumosUsados || []).length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--soft)' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Insumos</div>
              {registro.insumosUsados.map((iu, i) => {
                const ins = insumos.find(x => x.id === iu.insumoId);
                return <div key={i} style={{ fontSize: 12, color: 'var(--ink-2)' }}>· {ins?.nome || iu.insumoId} — {iu.qtd} {ins?.unidade || ''}</div>;
              })}
            </div>
          )}

          {registro.dataRetorno && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#b45309' }}>↩ Retorno: {fmtDate(registro.dataRetorno)}</div>
          )}

          {isAdmin && (
            <button onClick={() => { if (window.confirm('Excluir registro reprodutivo?')) onDelete(registro.id); }} style={{ marginTop: 12, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#dc2626', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
              Excluir
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Planner Content ───────────────────────────────────────────────
function PlannerContent({ registrosReproducao, cavalos }) {
  const today = todayStr();

  const eventos = useMemo(() => {
    const evs = [];
    (registrosReproducao || []).forEach(r => {
      const egua = cavalos.find(c => c.id === r.eguaId);
      const nome = egua?.nome || r.eguaId;
      const meta = TIPO_META[r.tipo];

      if (r.dataRetorno && r.dataRetorno >= today) {
        evs.push({ id: r.id + '_ret', data: r.dataRetorno, cor: '#b45309', emoji: '↩', texto: `Retorno: ${nome}`, sub: `após ${meta?.label}` });
      }
      if (r.tipo === 'inseminacao_artificial') {
        const d = r.dados || {};
        if (d.dataDG && d.dataDG >= today) {
          evs.push({ id: r.id + '_dg', data: d.dataDG, cor: '#1d4ed8', emoji: '🔬', texto: `DG: ${nome}`, sub: `IA de ${fmtDate(r.data)}` });
        }
        if (d.dataColeta && d.dataColeta >= today) {
          evs.push({ id: r.id + '_col', data: d.dataColeta, cor: '#b45309', emoji: '🧫', texto: `Coleta: ${nome}`, sub: `IA de ${fmtDate(r.data)}` });
        }
        if (d.dataRetornoPrevio && d.dataRetornoPrevio >= today) {
          evs.push({ id: r.id + '_retprev', data: d.dataRetornoPrevio, cor: '#7c3aed', emoji: '↩', texto: `Retorno prévio: ${nome}`, sub: 'antes do DG/coleta' });
        }
      }
    });
    return evs.sort((a, b) => a.data.localeCompare(b.data));
  }, [registrosReproducao, cavalos, today]);

  const proximos = eventos.filter(e => diffDays(e.data) <= 30);
  const futuros = eventos.filter(e => diffDays(e.data) > 30);

  const EventoItem = ({ ev }) => {
    const d = diffDays(ev.data);
    const isToday = d === 0;
    const isUrgent = d >= 0 && d <= 2;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: isToday ? '#fef3c730' : 'var(--card)', border: `1px solid ${isUrgent ? ev.cor + '50' : 'var(--line)'}`, borderLeft: `3px solid ${ev.cor}`, borderRadius: 12, marginBottom: 8 }}>
        <div style={{ fontSize: 20, flexShrink: 0 }}>{ev.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{ev.texto}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{ev.sub}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: isUrgent ? ev.cor : 'var(--ink-2)' }}>{fmtDate(ev.data)}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {isToday ? 'hoje' : d === 1 ? 'amanhã' : d < 0 ? `${Math.abs(d)}d atrás` : `em ${d}d`}
          </div>
        </div>
      </div>
    );
  };

  if (eventos.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 14 }}>
      Nenhum evento reprodutivo programado.
    </div>
  );

  return (
    <div>
      {proximos.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b45309', marginBottom: 10 }}>Próximos 30 dias</div>
          {proximos.map(ev => <EventoItem key={ev.id} ev={ev} />)}
        </div>
      )}
      {futuros.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 10 }}>Futuros</div>
          {futuros.map(ev => <EventoItem key={ev.id} ev={ev} />)}
        </div>
      )}
    </div>
  );
}

// ── ReproducaoScreen (exportado) ──────────────────────────────────
export function ReproducaoScreen({
  cavalos, insumos, registrosReproducao,
  addRegistroReproducao, deleteRegistroReproducao,
  addRegistro, addAtividade, addAviso,
  currentUser, onBack,
}) {
  const [vista, setVista] = useState('caderno');
  const [showForm, setShowForm] = useState(false);
  const [filtroEgua, setFiltroEgua] = useState('');

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'vet';
  const eguasPresentes = cavalos.filter(c => c.presente).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

  const lista = (registrosReproducao || [])
    .filter(r => !filtroEgua || r.eguaId === filtroEgua)
    .sort((a, b) => b.data.localeCompare(a.data));
  const meses = [...new Set(lista.map(r => r.mes))].sort((a, b) => b.localeCompare(a));

  const today = todayStr();
  const proximosCount = useMemo(() => {
    let c = 0;
    (registrosReproducao || []).forEach(r => {
      if (r.dataRetorno && r.dataRetorno >= today && diffDays(r.dataRetorno) <= 7) c++;
      if (r.tipo === 'inseminacao_artificial') {
        const d = r.dados || {};
        if (d.dataDG && d.dataDG >= today && diffDays(d.dataDG) <= 7) c++;
        if (d.dataColeta && d.dataColeta >= today && diffDays(d.dataColeta) <= 7) c++;
      }
    });
    return c;
  }, [registrosReproducao, today]);

  const handleSave = (formData) => {
    const autor = currentUser?.nome || '';
    const mes = formData.data.slice(0, 7);
    const hora = new Date().toTimeString().slice(0, 5);
    const id = 'rep_' + Date.now();
    const egua = cavalos.find(c => c.id === formData.eguaId);
    const eguaNome = egua?.nome || 'Égua';

    // Registrar insumos em registros + atividades
    (formData.insumosUsados || []).filter(iu => iu.insumoId && iu.qtd).forEach(iu => {
      const rid = 'reg_rep_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
      addRegistro({ id: rid, cavaloId: formData.eguaId, insumoId: iu.insumoId, qtd: Number(iu.qtd), hora, usuario: autor, isAuto: false, data: formData.data });
      addAtividade({ id: 'at_' + rid, tipo: 'insumo', cavaloId: formData.eguaId, insumoId: iu.insumoId, qtd: Number(iu.qtd), motivo: `Reprodução: ${TIPO_META[formData.tipo]?.label}`, usuario: autor, autor, mes, data: formData.data, hora, texto: '' });
    });

    // Gerar avisos para datas futuras
    if (formData.dataRetorno) {
      addAviso({
        autor: 'Sistema', avatar: '🐴',
        tempo: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        texto: `↩ Retorno para palpação: ${eguaNome} em ${fmtDate(formData.dataRetorno)} (${TIPO_META[formData.tipo]?.label})`,
        urgente: false, resolvido: false, resolvidoPor: '',
        tipo: 'reproducao_retorno', cavaloId: formData.eguaId, data_entrada: today, respostas: [],
      });
    }

    if (formData.tipo === 'inseminacao_artificial') {
      const d = formData.dados || {};
      if (d.dataDG) {
        addAviso({
          autor: 'Sistema', avatar: '🔬',
          tempo: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          texto: `🔬 Diagnóstico de Gestação: ${eguaNome} em ${fmtDate(d.dataDG)}${d.garanhao ? ` (${d.garanhao})` : ''}`,
          urgente: false, resolvido: false, resolvidoPor: '',
          tipo: 'reproducao_dg', cavaloId: formData.eguaId, data_entrada: today, respostas: [],
        });
      }
      if (d.dataColeta) {
        addAviso({
          autor: 'Sistema', avatar: '🧫',
          tempo: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          texto: `🧫 Coleta de Embrião: ${eguaNome} em ${fmtDate(d.dataColeta)}`,
          urgente: false, resolvido: false, resolvidoPor: '',
          tipo: 'reproducao_coleta', cavaloId: formData.eguaId, data_entrada: today, respostas: [],
        });
      }
      if (d.dataRetornoPrevio) {
        addAviso({
          autor: 'Sistema', avatar: '🐴',
          tempo: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          texto: `↩ Retorno prévio: ${eguaNome} em ${fmtDate(d.dataRetornoPrevio)} (antes do DG/coleta)`,
          urgente: false, resolvido: false, resolvidoPor: '',
          tipo: 'reproducao_retorno', cavaloId: formData.eguaId, data_entrada: today, respostas: [],
        });
      }
    }

    if (formData.tipo === 'controle_folicular' && formData.dados?.induzirOvulacao) {
      const d = formData.dados;
      const ins = insumos.find(i => i.id === d.insumoOvulacaoId);
      addAviso({
        autor: 'Sistema', avatar: '⚡',
        tempo: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        texto: `⚡ INDUZIR OVULAÇÃO: ${eguaNome}${ins ? ` com ${ins.nome}` : ''} às ${d.horarioOvulacao || '—'} (${fmtDate(formData.data)})`,
        urgente: true, resolvido: false, resolvidoPor: '',
        tipo: 'reproducao_ovulacao', cavaloId: formData.eguaId, data_entrada: today, respostas: [],
      });
    }

    addRegistroReproducao({
      id, eguaId: formData.eguaId, data: formData.data, tipo: formData.tipo,
      dados: formData.dados || {},
      insumosUsados: (formData.insumosUsados || []).filter(iu => iu.insumoId && iu.qtd),
      dataRetorno: formData.dataRetorno || null,
      autor, mes,
    });
    setShowForm(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 22, padding: 0, cursor: 'pointer', lineHeight: 1 }}>‹</button>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', flex: 1 }}>Reprodução</div>
          {isAdmin && vista === 'caderno' && !showForm && (
            <button onClick={() => setShowForm(true)} style={{ background: COR_REPROD, color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer' }}>
              + Registro
            </button>
          )}
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[['caderno', 'Caderno'], ['planner', 'Planner']].map(([v, l]) => {
            const sel = vista === v;
            return (
              <button key={v} onClick={() => { setVista(v); setShowForm(false); }} style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1.5px solid ${sel ? COR_REPROD : 'var(--line)'}`, background: sel ? COR_REPROD + '18' : 'var(--card)', color: sel ? COR_REPROD : 'var(--ink-2)', fontSize: 13, fontWeight: sel ? 700 : 400, fontFamily: 'var(--sans)', cursor: 'pointer', position: 'relative' }}>
                {l}
                {v === 'planner' && proximosCount > 0 && (
                  <span style={{ position: 'absolute', top: 4, right: 6, background: '#dc2626', color: '#fff', borderRadius: 8, fontSize: 9, fontWeight: 700, padding: '1px 5px' }}>{proximosCount}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 90px' }}>
        {vista === 'caderno' && (
          <>
            {showForm ? (
              <RegistroReprodutivoForm
                cavalos={cavalos} insumos={insumos}
                registrosReproducao={registrosReproducao || []}
                onSave={handleSave}
                onCancel={() => setShowForm(false)}
              />
            ) : (
              <>
                <select value={filtroEgua} onChange={e => setFiltroEgua(e.target.value)} style={{ ...inputSt, marginBottom: 14, fontSize: 13 }}>
                  <option value="">Todas as éguas</option>
                  {eguasPresentes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>

                {lista.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 14 }}>
                    Nenhum registro reprodutivo.{isAdmin ? '\nToque em "+ Registro" para adicionar.' : ''}
                  </div>
                )}

                {meses.map(m => (
                  <div key={m} style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 10 }}>{fmtMes(m)}</div>
                    {lista.filter(r => r.mes === m).map(reg => (
                      <RegistroCard key={reg.id} registro={reg} cavalos={cavalos} insumos={insumos} isAdmin={isAdmin} onDelete={deleteRegistroReproducao} />
                    ))}
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {vista === 'planner' && (
          <PlannerContent registrosReproducao={registrosReproducao || []} cavalos={cavalos} />
        )}
      </div>
    </div>
  );
}

// ── Helper exportado para Relatório Vet ───────────────────────────
export function resumoReproducaoMes(registrosReproducao, eguaId, mes) {
  return (registrosReproducao || []).filter(r => r.eguaId === eguaId && r.mes === mes).sort((a, b) => a.data.localeCompare(b.data));
}
