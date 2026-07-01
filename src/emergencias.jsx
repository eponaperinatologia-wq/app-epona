// emergencias.jsx — Área de Emergências veterinárias
// Fase 3: lista, criar/encerrar/reabrir, observação urgente sempre visível.
// Medicações, parâmetros, notas e exames virão nas próximas fases.

import React, { useState, useMemo } from 'react';
import { Icon } from './icons';
import { TopBar } from './screens';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const fmtDataHora = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};
const fmtData = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const diasDesde = (iso) => {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
};

// ─────────────────────────────────────────────────────────────
// TELA PRINCIPAL — lista com ativas / encerradas
// ─────────────────────────────────────────────────────────────
export function EmergenciasScreen({
  cavalos = [], currentUser, onBack,
  emergencias = [], emergMedicacoes = [], emergAgendas = [], emergParametros = [], emergNotas = [], emergExames = [],
  addEmergencia, updateEmergencia, encerrarEmergencia, deleteEmergencia,
  addEmergMedicacao, updateEmergMedicacao, deleteEmergMedicacao,
  addEmergAgenda, updateEmergAgenda, deleteEmergAgenda,
  addEmergParametro, updateEmergParametro, deleteEmergParametro,
  addEmergNota, updateEmergNota, deleteEmergNota,
  uploadEmergExame, deleteEmergExame,
  insumos = [], servicos = [],
}) {
  const [showForm, setShowForm] = useState(false);
  const [fichaId, setFichaId] = useState(null);
  const [mostraEncerradas, setMostraEncerradas] = useState(false);

  const ativas = useMemo(
    () => emergencias.filter(e => e.status === 'ativa').sort((a, b) => (b.abertaEm || '').localeCompare(a.abertaEm || '')),
    [emergencias]
  );
  const encerradas = useMemo(
    () => emergencias.filter(e => e.status === 'encerrada').sort((a, b) => (b.encerradaEm || '').localeCompare(a.encerradaEm || '')),
    [emergencias]
  );

  // Se estamos na ficha, renderiza a ficha
  if (fichaId) {
    const emerg = emergencias.find(e => e.id === fichaId);
    if (!emerg) { setFichaId(null); return null; }
    return (
      <EmergenciaFicha
        key={`ef_${fichaId}`}
        emergencia={emerg}
        cavalos={cavalos}
        currentUser={currentUser}
        emergMedicacoes={emergMedicacoes.filter(m => m.emergenciaId === fichaId)}
        emergAgendas={emergAgendas.filter(a => a.emergenciaId === fichaId)}
        emergParametros={emergParametros.filter(p => p.emergenciaId === fichaId)}
        emergNotas={emergNotas.filter(n => n.emergenciaId === fichaId)}
        emergExames={emergExames.filter(e => e.emergenciaId === fichaId)}
        updateEmergencia={updateEmergencia}
        encerrarEmergencia={encerrarEmergencia}
        deleteEmergencia={deleteEmergencia}
        onBack={() => setFichaId(null)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 22, padding: 0, cursor: 'pointer', lineHeight: 1 }}>‹</button>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', flex: 1 }}>Emergências</div>
          <button onClick={() => setShowForm(true)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)', cursor: 'pointer' }}>+ Nova</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 90px' }}>
        {showForm && (
          <NovaEmergenciaForm
            cavalos={cavalos.filter(c => c.presente)}
            onCancel={() => setShowForm(false)}
            onSave={async (data) => {
              const id = await addEmergencia(data);
              setShowForm(false);
              if (id) setFichaId(id);
            }}
          />
        )}

        {/* Bloco Ativas */}
        {!showForm && (
          <>
            <SectionHeader
              titulo="Ativas"
              cor="#dc2626"
              badge={ativas.length}
            />
            {ativas.length === 0 ? (
              <div style={{ background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 12, padding: '18px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, marginBottom: 20 }}>
                Nenhuma emergência ativa.
              </div>
            ) : (
              <div style={{ marginBottom: 22 }}>
                {ativas.map(e => (
                  <EmergenciaCard
                    key={e.id}
                    emergencia={e}
                    cavalo={cavalos.find(c => c.id === e.cavaloId)}
                    onOpen={() => setFichaId(e.id)}
                  />
                ))}
              </div>
            )}

            {/* Bloco Encerradas — colapsado */}
            {encerradas.length > 0 && (
              <>
                <button
                  onClick={() => setMostraEncerradas(v => !v)}
                  style={{
                    width: '100%', background: 'none', border: 'none', padding: '4px 0 10px',
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    fontFamily: 'var(--sans)', color: 'var(--ink-2)',
                  }}
                >
                  <span style={{ fontSize: 12, transform: mostraEncerradas ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▸</span>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)' }}>
                    Encerradas
                  </span>
                  <span style={{ background: 'var(--soft)', color: 'var(--ink-3)', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
                    {encerradas.length}
                  </span>
                </button>
                {mostraEncerradas && encerradas.map(e => (
                  <EmergenciaCard
                    key={e.id}
                    emergencia={e}
                    cavalo={cavalos.find(c => c.id === e.cavaloId)}
                    onOpen={() => setFichaId(e.id)}
                    dim
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Card de emergência na lista
// ─────────────────────────────────────────────────────────────
function EmergenciaCard({ emergencia: e, cavalo, onOpen, dim }) {
  const cor = e.status === 'ativa' ? '#dc2626' : '#6b7280';
  const dias = diasDesde(e.abertaEm);
  return (
    <button
      onClick={onOpen}
      style={{
        width: '100%', textAlign: 'left',
        background: 'var(--card)', border: `1px solid ${dim ? 'var(--line)' : cor + '55'}`,
        borderLeft: `4px solid ${cor}`, borderRadius: 12, padding: '12px 14px',
        marginBottom: 8, cursor: 'pointer', color: 'var(--ink)', opacity: dim ? 0.7 : 1,
        fontFamily: 'var(--sans)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>
          {cavalo?.nome || '—'}
          {cavalo?.baia && (
            <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--sans)', fontWeight: 500, background: 'var(--soft)', borderRadius: 4, padding: '1px 6px', marginLeft: 6, letterSpacing: '0.04em' }}>
              {cavalo.baia}
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: cor, background: cor + '18', borderRadius: 6, padding: '2px 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {e.status === 'ativa' ? 'Ativa' : 'Encerrada'}
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600, marginBottom: 3 }}>{e.titulo}</div>
      {e.motivo && (
        <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 4, lineHeight: 1.4 }}>{e.motivo}</div>
      )}
      {e.observacaoUrgente && (
        <div style={{ fontSize: 11, color: '#991b1b', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 8px', marginTop: 6, lineHeight: 1.4 }}>
          ⚠️ {e.observacaoUrgente}
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 5 }}>
        Aberta em {fmtData(e.abertaEm)}
        {e.status === 'ativa' && dias >= 0 && ` · ${dias === 0 ? 'hoje' : `${dias} dia${dias > 1 ? 's' : ''} em cuidado`}`}
        {e.status === 'encerrada' && e.encerradaEm && ` · encerrada em ${fmtData(e.encerradaEm)}`}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Cabeçalho de seção
// ─────────────────────────────────────────────────────────────
function SectionHeader({ titulo, cor, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: cor }}>
        {titulo}
      </span>
      {badge != null && (
        <span style={{ background: cor + '18', color: cor, borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Form: nova emergência
// ─────────────────────────────────────────────────────────────
function NovaEmergenciaForm({ cavalos, onCancel, onSave }) {
  const [cavaloId, setCavaloId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacaoUrgente, setObservacaoUrgente] = useState('');
  const [busca, setBusca] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = cavaloId && titulo.trim() && !saving;
  const cavalosOrd = [...cavalos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  const cavalosFiltrados = busca.trim()
    ? cavalosOrd.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()))
    : cavalosOrd;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ cavaloId, titulo: titulo.trim(), motivo: motivo.trim(), observacaoUrgente: observacaoUrgente.trim() });
    } finally {
      setSaving(false);
    }
  };

  const inputSt = {
    width: '100%', padding: '10px 12px', border: '1px solid var(--line)',
    borderRadius: 10, background: 'var(--card)', fontSize: 14,
    color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px', marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 17, marginBottom: 12, color: 'var(--ink)' }}>Nova emergência</div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Animal</div>
        {cavaloId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 12px' }}>
            <span style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600, flex: 1 }}>
              {cavalos.find(c => c.id === cavaloId)?.nome}
            </span>
            <button onClick={() => setCavaloId('')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 18, cursor: 'pointer', padding: 0 }}>×</button>
          </div>
        ) : (
          <>
            <input
              value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome…"
              style={{ ...inputSt, marginBottom: 6 }}
            />
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--card)' }}>
              {cavalosFiltrados.length === 0 ? (
                <div style={{ padding: 10, fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>Nenhum animal encontrado</div>
              ) : cavalosFiltrados.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCavaloId(c.id); setBusca(''); }}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', padding: '9px 12px', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)' }}
                >
                  {c.nome}
                  {c.baia && <span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 8 }}>· {c.baia}</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Título *</div>
        <input
          value={titulo} onChange={e => setTitulo(e.target.value)}
          placeholder="Ex: Cólica com refluxo · Laminite aguda"
          style={inputSt}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Motivo / história inicial</div>
        <textarea
          value={motivo} onChange={e => setMotivo(e.target.value)}
          placeholder="Contexto, sintomas iniciais, decisão de manejo…"
          rows={3}
          style={{ ...inputSt, resize: 'vertical', minHeight: 60, fontFamily: 'var(--sans)' }}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, fontWeight: 700 }}>⚠ Observação urgente (opcional)</div>
        <textarea
          value={observacaoUrgente} onChange={e => setObservacaoUrgente(e.target.value)}
          placeholder="Ex: Não pode fazer sombra ao insulinar · Aguarda retorno do exame ABC"
          rows={2}
          style={{ ...inputSt, resize: 'vertical', minHeight: 50, background: '#fee2e2', borderColor: '#fecaca', fontFamily: 'var(--sans)' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer' }}
        >Cancelar</button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            flex: 2, background: canSave ? '#dc2626' : 'var(--soft)',
            border: 'none', color: canSave ? '#fff' : 'var(--ink-3)',
            borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700,
            fontFamily: 'var(--sans)', cursor: canSave ? 'pointer' : 'default',
          }}
        >Abrir emergência</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FICHA — detalhe de uma emergência
// ─────────────────────────────────────────────────────────────
function EmergenciaFicha({
  emergencia, cavalos, currentUser,
  emergMedicacoes, emergAgendas, emergParametros, emergNotas, emergExames,
  updateEmergencia, encerrarEmergencia, deleteEmergencia, onBack,
}) {
  const cavalo = cavalos.find(c => c.id === emergencia.cavaloId);
  const ativa = emergencia.status === 'ativa';
  const [obsLocal, setObsLocal] = useState(emergencia.observacaoUrgente || '');
  const [obsSalvo, setObsSalvo] = useState(false);

  // Sincroniza com props se realtime trouxer edição de outro usuário
  React.useEffect(() => {
    setObsLocal(emergencia.observacaoUrgente || '');
  }, [emergencia.observacaoUrgente]);

  const salvarObs = async () => {
    if (obsLocal === emergencia.observacaoUrgente) return;
    const ok = await updateEmergencia(emergencia.id, { observacaoUrgente: obsLocal });
    if (ok) {
      setObsSalvo(true);
      setTimeout(() => setObsSalvo(false), 1200);
    }
  };

  const handleEncerrar = async () => {
    if (!window.confirm('Encerrar emergência? Medicações programadas viram "canceladas" e as agendas de parâmetros são desativadas.')) return;
    await encerrarEmergencia(emergencia.id);
  };
  const handleReabrir = async () => {
    if (!window.confirm('Reabrir emergência? Voltará ao status ativa (medicações canceladas continuam canceladas).')) return;
    await updateEmergencia(emergencia.id, { status: 'ativa', encerradaEm: null });
  };
  const handleDelete = async () => {
    if (!window.confirm('EXCLUIR emergência? Isso não pode ser desfeito. Todas as medicações, parâmetros, notas e exames vinculados serão removidos.')) return;
    await deleteEmergencia(emergencia.id);
    onBack();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Cabeçalho fixo */}
      <div style={{ padding: '12px 20px 6px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 22, padding: 0, cursor: 'pointer', lineHeight: 1 }}>‹</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', lineHeight: 1.15 }}>
              {cavalo?.nome || '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
              {emergencia.titulo}
            </div>
          </div>
          <span style={{ fontSize: 11, color: ativa ? '#dc2626' : '#6b7280', background: (ativa ? '#dc2626' : '#6b7280') + '18', borderRadius: 6, padding: '3px 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {ativa ? 'Ativa' : 'Encerrada'}
          </span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>
          Aberta em {fmtDataHora(emergencia.abertaEm)}{emergencia.autorAbertura ? ` por ${emergencia.autorAbertura}` : ''}
          {emergencia.encerradaEm && ` · encerrada em ${fmtDataHora(emergencia.encerradaEm)}`}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 100px' }}>
        {/* Observação urgente — SEMPRE visível, editável em 1 toque */}
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 12px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#991b1b' }}>
              ⚠ Observação urgente
            </span>
            {obsSalvo && (
              <span style={{ fontSize: 10, color: '#15803d', fontWeight: 600 }}>✓ salvo</span>
            )}
          </div>
          <textarea
            value={obsLocal}
            onChange={e => setObsLocal(e.target.value)}
            onBlur={salvarObs}
            placeholder="Toque para escrever. Aparece em destaque na lista de emergências e no topo desta ficha."
            rows={2}
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              resize: 'vertical', minHeight: 42, padding: 0,
              fontSize: 14, color: '#450a0a', fontFamily: 'var(--sans)', lineHeight: 1.45,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Motivo / história inicial */}
        {emergencia.motivo && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '11px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 4 }}>Motivo / história</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{emergencia.motivo}</div>
          </div>
        )}

        {/* Placeholders das seções que virão */}
        <SecaoPendente titulo="Cronograma do animal" icone="clock" cor="#0e7490" nota="Próxima fase: fase 4 — medicações programadas alimentam esta agenda por dia/hora." />
        <SecaoPendente titulo="Medicações e insumos" icone="package" cor="#1d4ed8" nota="Próxima fase: fase 4 — programar dose única ou recorrente; marcar 'feito' registra e cobra na fatura do animal." />
        <SecaoPendente titulo="Parâmetros solicitados" icone="bell" cor="#b45309" nota="Fase 6 — cria lembretes a cada X horas para as vets aferirem." />
        <SecaoPendente titulo="Parâmetros aferidos" icone="bar-chart" cor="#15803d" nota="Fase 6 — TPR, mucosas, fezes, urina, atitude, obs. Timeline por data-hora." />
        <SecaoPendente titulo="Observações clínicas" icone="edit" cor="#7c3aed" nota="Fase 7 — timeline de anotações do caso com autor." />
        <SecaoPendente titulo="Exames laboratoriais" icone="doc" cor="#0e7490" nota="Fase 7 — upload de PDF/imagem, preview rápido." />

        {/* Ações de status — sempre no rodapé */}
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ativa ? (
            <button
              onClick={handleEncerrar}
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}
            >Encerrar emergência</button>
          ) : (
            <button
              onClick={handleReabrir}
              style={{ background: 'var(--card)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}
            >Reabrir emergência</button>
          )}
          <button
            onClick={handleDelete}
            style={{ background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 12, padding: '11px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}
          >Excluir emergência</button>
        </div>
      </div>
    </div>
  );
}

function SecaoPendente({ titulo, icone, cor, nota }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 12, padding: '12px 14px', marginBottom: 8, opacity: 0.85 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: cor + '18', display: 'grid', placeItems: 'center' }}>
          <Icon name={icone} size={15} color={cor} />
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{titulo}</span>
        <span style={{ fontSize: 9, color: 'var(--ink-3)', background: 'var(--soft)', borderRadius: 6, padding: '2px 7px', letterSpacing: '0.05em', fontWeight: 700, textTransform: 'uppercase' }}>em breve</span>
      </div>
      {nota && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 36, lineHeight: 1.5 }}>{nota}</div>
      )}
    </div>
  );
}
