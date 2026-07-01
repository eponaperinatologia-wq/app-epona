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
  // Passados adiante pra cobrança via pipeline existente:
  addRegistro, deleteRegistro, addProcedimento, deleteProcedimento, addAtividade,
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
        insumos={insumos}
        servicos={servicos}
        emergMedicacoes={emergMedicacoes.filter(m => m.emergenciaId === fichaId)}
        emergAgendas={emergAgendas.filter(a => a.emergenciaId === fichaId)}
        emergParametros={emergParametros.filter(p => p.emergenciaId === fichaId)}
        emergNotas={emergNotas.filter(n => n.emergenciaId === fichaId)}
        emergExames={emergExames.filter(e => e.emergenciaId === fichaId)}
        updateEmergencia={updateEmergencia}
        encerrarEmergencia={encerrarEmergencia}
        deleteEmergencia={deleteEmergencia}
        addEmergMedicacao={addEmergMedicacao}
        updateEmergMedicacao={updateEmergMedicacao}
        deleteEmergMedicacao={deleteEmergMedicacao}
        addRegistro={addRegistro}
        deleteRegistro={deleteRegistro}
        addProcedimento={addProcedimento}
        deleteProcedimento={deleteProcedimento}
        addAtividade={addAtividade}
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
  emergencia, cavalos, currentUser, insumos = [], servicos = [],
  emergMedicacoes, emergAgendas, emergParametros, emergNotas, emergExames,
  updateEmergencia, encerrarEmergencia, deleteEmergencia,
  addEmergMedicacao, updateEmergMedicacao, deleteEmergMedicacao,
  addRegistro, deleteRegistro, addProcedimento, deleteProcedimento, addAtividade,
  onBack,
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
        <SecaoPendente titulo="Cronograma do animal" icone="clock" cor="#0e7490" nota="Próxima fase (8): agregação das medicações e agendas em um cronograma central + individual." />

        <SecaoMedicacoes
          emergencia={emergencia}
          currentUser={currentUser}
          insumos={insumos}
          servicos={servicos}
          medicacoes={emergMedicacoes}
          addEmergMedicacao={addEmergMedicacao}
          updateEmergMedicacao={updateEmergMedicacao}
          deleteEmergMedicacao={deleteEmergMedicacao}
          addRegistro={addRegistro}
          deleteRegistro={deleteRegistro}
          addProcedimento={addProcedimento}
          deleteProcedimento={deleteProcedimento}
          addAtividade={addAtividade}
        />
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

// ─────────────────────────────────────────────────────────────
// SEÇÃO: Medicações e insumos programados
// ─────────────────────────────────────────────────────────────
// Regra de cobrança (crítica):
//   - programado -> marcar feito -> chama addRegistro/addProcedimento existentes
//   - status feito -> desmarcar -> chama deleteRegistro/deleteProcedimento
//   - cancelado / excluído antes de feito -> NÃO cobra nada
// TODO Fase 5: se insumo.formaCobranca === 'frasco_ao_abrir', usar pipeline de
// frasco. Por ora, cai no fluxo por_uso (comportamento seguro).
// ─────────────────────────────────────────────────────────────
function SecaoMedicacoes({
  emergencia, currentUser, insumos, servicos, medicacoes,
  addEmergMedicacao, updateEmergMedicacao, deleteEmergMedicacao,
  addRegistro, deleteRegistro, addProcedimento, deleteProcedimento, addAtividade,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null); // id da medicação em edição
  const emergAtiva = emergencia.status === 'ativa';

  // Agrupa por data (asc). Dentro do dia, ordena por hora asc.
  const porDia = useMemo(() => {
    const map = new Map();
    medicacoes.forEach(m => {
      if (!map.has(m.data)) map.set(m.data, []);
      map.get(m.data).push(m);
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, itens]) => ({
        data,
        itens: itens.sort((a, b) => (a.hora || '').localeCompare(b.hora || '')),
      }));
  }, [medicacoes]);

  const findItem = (m) => {
    if (m.insumoId) return { tipo: 'insumo', nome: insumos.find(i => i.id === m.insumoId)?.nome || m.insumoId, unidade: insumos.find(i => i.id === m.insumoId)?.unidade || m.unidade || '' };
    if (m.servicoId) return { tipo: 'servico', nome: servicos.find(s => s.id === m.servicoId)?.nome || m.servicoId, unidade: '' };
    return { tipo: '?', nome: '—', unidade: '' };
  };

  const handleMarcarFeito = async (m) => {
    if (m.status === 'feito') return;
    const usuario = currentUser?.nome || '';
    const hora = new Date().toTimeString().slice(0, 5);
    if (m.insumoId) {
      const insumo = insumos.find(i => i.id === m.insumoId);
      // Fase 5: se formaCobranca === 'frasco_ao_abrir', chamar helper de frasco.
      // Por ora: cria registro padrão (cobra por_uso).
      const rid = 'reg_emg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      addRegistro({
        id: rid, cavaloId: emergencia.cavaloId, insumoId: m.insumoId,
        qtd: Number(m.doseQtd) || 1, hora, data: m.data,
        usuario, isAuto: false,
      });
      addAtividade && addAtividade({
        id: 'at_' + rid, tipo: 'insumo', cavaloId: emergencia.cavaloId,
        insumoId: m.insumoId, qtd: Number(m.doseQtd) || 1,
        motivo: `Emergência: ${emergencia.titulo}`, usuario, autor: usuario,
        mes: m.data.slice(0, 7), data: m.data, hora, texto: '',
      });
      await updateEmergMedicacao(m.id, {
        status: 'feito', feitoEm: new Date().toISOString(), feitoPor: usuario, registroId: rid,
      });
    } else if (m.servicoId) {
      const sv = servicos.find(s => s.id === m.servicoId);
      const pid = 'proc_emg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      let total = sv?.valor || 0;
      (sv?.descartaveisObrigatorios || []).forEach(d => {
        const ins = insumos.find(i => i.id === d.insumoId);
        total += (ins?.valorVenda || 0) * d.qtd;
      });
      addProcedimento({
        id: pid, cavaloId: emergencia.cavaloId, servicoId: m.servicoId,
        valorServico: sv?.valor || 0, total,
        descartaveisObrigatorios: sv?.descartaveisObrigatorios || [],
        insumosAdicionais: [],
        motoboy: { ativo: false, valor: 0, nome: '' },
        laboratorio: '', tubosSelecionados: [], examesSelecionados: [],
        hora, nota: `Emergência: ${emergencia.titulo}`, data: m.data,
      });
      addAtividade && addAtividade({
        id: 'at_' + pid, tipo: 'procedimento', cavaloId: emergencia.cavaloId,
        insumoId: null, qtd: null,
        motivo: `Emergência: ${emergencia.titulo} — ${sv?.nome || ''}`,
        usuario, autor: usuario, mes: m.data.slice(0, 7),
        data: m.data, hora, texto: '',
      });
      await updateEmergMedicacao(m.id, {
        status: 'feito', feitoEm: new Date().toISOString(), feitoPor: usuario, procedimentoId: pid,
      });
    }
  };

  const handleDesmarcar = async (m) => {
    if (m.status !== 'feito') return;
    if (!window.confirm('Desfazer? Isso remove a cobrança da fatura.')) return;
    if (m.registroId) { try { deleteRegistro && deleteRegistro(m.registroId); } catch (e) { console.error(e); } }
    if (m.procedimentoId) { try { deleteProcedimento && deleteProcedimento(m.procedimentoId); } catch (e) { console.error(e); } }
    await updateEmergMedicacao(m.id, { status: 'programado', feitoEm: null, feitoPor: '', registroId: null, procedimentoId: null });
  };

  const handleCancelar = async (m) => {
    if (m.status === 'feito') return;
    if (!window.confirm('Cancelar esta dose programada?')) return;
    await updateEmergMedicacao(m.id, { status: 'cancelado' });
  };

  const handleReativar = async (m) => {
    if (m.status !== 'cancelado') return;
    await updateEmergMedicacao(m.id, { status: 'programado' });
  };

  const handleExcluir = async (m) => {
    const isAdmin = currentUser?.role === 'admin';
    if (!isAdmin) return;
    if (m.status === 'feito') {
      alert('Não é possível excluir uma dose já feita. Desmarque primeiro.');
      return;
    }
    if (!window.confirm('Excluir esta dose do histórico da emergência? Não pode ser desfeito.')) return;
    deleteEmergMedicacao(m.id);
  };

  const handleEditar = (m) => {
    if (m.status === 'feito') {
      alert('Dose já feita — desmarque antes de editar.');
      return;
    }
    setEditando(m.id);
    setShowForm(true);
  };

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Cabeçalho da seção */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: '#1d4ed822', display: 'grid', placeItems: 'center' }}>
            <Icon name="package" size={15} color="#1d4ed8" />
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Medicações e insumos</span>
          {medicacoes.length > 0 && (
            <span style={{ background: '#1d4ed818', color: '#1d4ed8', borderRadius: 10, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
              {medicacoes.length}
            </span>
          )}
        </div>
        {emergAtiva && (
          <button
            onClick={() => { setEditando(null); setShowForm(true); }}
            style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}
          >+ Nova</button>
        )}
      </div>

      {/* Form inline */}
      {showForm && (
        <MedicacaoForm
          initial={editando ? medicacoes.find(m => m.id === editando) : null}
          insumos={insumos}
          servicos={servicos}
          onCancel={() => { setShowForm(false); setEditando(null); }}
          onSave={async (dadosBase) => {
            if (editando) {
              await updateEmergMedicacao(editando, dadosBase);
            } else {
              // Expansão de recorrência: se recorrência != 'unica', gera N ocorrências.
              const ocorrencias = expandirRecorrencia(dadosBase);
              for (const oc of ocorrencias) {
                await addEmergMedicacao({ ...oc, emergenciaId: emergencia.id });
              }
            }
            setShowForm(false);
            setEditando(null);
          }}
        />
      )}

      {/* Lista agrupada por dia */}
      {!showForm && (
        <>
          {porDia.length === 0 ? (
            <div style={{ background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 10, padding: '14px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>
              Nenhuma medicação programada. {emergAtiva && 'Toque em "+ Nova" para começar.'}
            </div>
          ) : porDia.map(({ data, itens }) => (
            <div key={data} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 4 }}>
                {fmtDataDiaSemana(data)}
              </div>
              {itens.map(m => {
                const item = findItem(m);
                return (
                  <LinhaMedicacao
                    key={m.id}
                    m={m} item={item} emergAtiva={emergAtiva}
                    isAdmin={currentUser?.role === 'admin'}
                    onFeito={() => handleMarcarFeito(m)}
                    onDesmarcar={() => handleDesmarcar(m)}
                    onCancelar={() => handleCancelar(m)}
                    onReativar={() => handleReativar(m)}
                    onEditar={() => handleEditar(m)}
                    onExcluir={() => handleExcluir(m)}
                  />
                );
              })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// Uma linha de medicação — estilo compacto, ações contextuais
function LinhaMedicacao({ m, item, emergAtiva, isAdmin, onFeito, onDesmarcar, onCancelar, onReativar, onEditar, onExcluir }) {
  const CFG = {
    programado: { cor: '#1d4ed8', bg: '#1d4ed810', ico: '●', label: 'Prog.' },
    feito:      { cor: '#15803d', bg: '#15803d10', ico: '✓', label: 'Feito' },
    cancelado:  { cor: '#6b7280', bg: '#6b728010', ico: '✕', label: 'Cancel.' },
  };
  const c = CFG[m.status] || CFG.programado;

  return (
    <div style={{
      background: 'var(--card)', border: `1px solid var(--line)`, borderLeft: `3px solid ${c.cor}`,
      borderRadius: 8, padding: '8px 10px', marginBottom: 5,
      display: 'flex', alignItems: 'center', gap: 10,
      opacity: m.status === 'cancelado' ? 0.6 : 1,
    }}>
      <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12, color: 'var(--ink-2)', fontWeight: 700, minWidth: 42 }}>
        {m.hora || '—'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)', textDecoration: m.status === 'cancelado' ? 'line-through' : 'none' }}>
          <b>{m.doseQtd || ''} {item.unidade}</b> {item.nome}
        </div>
        {m.recorrencia?.tipo && m.recorrencia.tipo !== 'unica' && (
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>
            ↻ {descreveRecorrencia(m.recorrencia)}
          </div>
        )}
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', color: c.cor, background: c.bg, padding: '2px 6px', borderRadius: 5, textTransform: 'uppercase' }}>
        {c.label}
      </span>
      {emergAtiva && (
        <div style={{ display: 'flex', gap: 3 }}>
          {m.status === 'programado' && (
            <>
              <button onClick={onFeito} title="Marcar feito" style={btnIco('#15803d')}>✓</button>
              <button onClick={onEditar} title="Editar" style={btnIco('#374151')}>✎</button>
              <button onClick={onCancelar} title="Cancelar dose" style={btnIco('#b45309')}>⊘</button>
              {isAdmin && <button onClick={onExcluir} title="Excluir" style={btnIco('#dc2626')}>×</button>}
            </>
          )}
          {m.status === 'feito' && (
            <button onClick={onDesmarcar} title="Desfazer (remove da fatura)" style={btnIco('#dc2626')}>↺</button>
          )}
          {m.status === 'cancelado' && (
            <>
              <button onClick={onReativar} title="Reativar" style={btnIco('#1d4ed8')}>↻</button>
              {isAdmin && <button onClick={onExcluir} title="Excluir" style={btnIco('#dc2626')}>×</button>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const btnIco = (cor) => ({
  width: 26, height: 26, borderRadius: 6,
  background: cor + '15', border: `1px solid ${cor}45`,
  color: cor, cursor: 'pointer', fontSize: 13, fontWeight: 700,
  display: 'grid', placeItems: 'center', fontFamily: 'var(--sans)',
});

// ─────────────────────────────────────────────────────────────
// Form: nova/editar medicação
// ─────────────────────────────────────────────────────────────
function MedicacaoForm({ initial, insumos, servicos, onCancel, onSave }) {
  const isEdit = !!initial;
  const [tipo, setTipo] = useState(initial?.insumoId ? 'insumo' : initial?.servicoId ? 'servico' : 'insumo');
  const [itemId, setItemId] = useState(initial?.insumoId || initial?.servicoId || '');
  const [busca, setBusca] = useState('');
  const [doseQtd, setDoseQtd] = useState(initial?.doseQtd != null ? String(initial.doseQtd) : '');
  const [data, setData] = useState(initial?.data || new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState(initial?.hora || new Date().toTimeString().slice(0, 5));
  const [recType, setRecType] = useState(initial?.recorrencia?.tipo || 'unica');
  const [recValor, setRecValor] = useState(initial?.recorrencia?.valor != null ? String(initial.recorrencia.valor) : '8');
  const [recAte, setRecAte] = useState(initial?.recorrencia?.ate || '');
  const [saving, setSaving] = useState(false);

  const opcoes = useMemo(() => {
    const lista = tipo === 'insumo'
      ? insumos.filter(i => i.categoria !== 'descartavel').sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
      : [...servicos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
    if (!busca.trim()) return lista.slice(0, 30);
    return lista.filter(x => x.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 30);
  }, [tipo, insumos, servicos, busca]);

  const item = tipo === 'insumo'
    ? insumos.find(i => i.id === itemId)
    : servicos.find(s => s.id === itemId);
  const unidade = tipo === 'insumo' ? (item?.unidade || '') : '';

  const canSave = itemId && (tipo === 'servico' || (Number(doseQtd) > 0)) && data && hora && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        insumoId: tipo === 'insumo' ? itemId : null,
        servicoId: tipo === 'servico' ? itemId : null,
        doseQtd: Number(doseQtd) || 0,
        unidade,
        data, hora,
        recorrencia: recType === 'unica'
          ? { tipo: 'unica' }
          : { tipo: recType, valor: Number(recValor) || 0, ate: recAte || null },
      };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  const inputSt = {
    width: '100%', padding: '8px 10px', border: '1px solid var(--line)',
    borderRadius: 8, background: 'var(--card)', fontSize: 13,
    color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
        {isEdit ? 'Editar medicação' : 'Nova medicação'}
      </div>

      {/* Tipo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
        {[{ id: 'insumo', label: 'Insumo' }, { id: 'servico', label: 'Serviço/Proc.' }].map(o => {
          const sel = tipo === o.id;
          return (
            <button key={o.id} disabled={isEdit} onClick={() => { setTipo(o.id); setItemId(''); }} style={{
              background: sel ? '#1d4ed8' : 'var(--card)',
              color: sel ? '#fff' : 'var(--ink)',
              border: `1px solid ${sel ? '#1d4ed8' : 'var(--line)'}`,
              borderRadius: 8, padding: '7px 10px', fontSize: 12, fontWeight: 700,
              cursor: isEdit ? 'default' : 'pointer', fontFamily: 'var(--sans)',
              opacity: isEdit ? 0.6 : 1,
            }}>
              {o.label}
            </button>
          );
        })}
      </div>

      {/* Item */}
      {!itemId ? (
        <>
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder={`Buscar ${tipo === 'insumo' ? 'insumo' : 'serviço'}…`}
            style={{ ...inputSt, marginBottom: 5 }}
          />
          <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--card)', marginBottom: 8 }}>
            {opcoes.length === 0 ? (
              <div style={{ padding: 10, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>Nada encontrado</div>
            ) : opcoes.map(x => (
              <button
                key={x.id} onClick={() => { setItemId(x.id); setBusca(''); }}
                style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', padding: '7px 10px', textAlign: 'left', cursor: 'pointer', fontSize: 12, color: 'var(--ink)', fontFamily: 'var(--sans)' }}
              >
                {x.nome}
                {tipo === 'insumo' && <span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 6 }}>· {x.unidade}</span>}
                {tipo === 'servico' && <span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 6 }}>· R$ {(x.valor || 0).toFixed(2)}</span>}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 8, padding: '7px 10px', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, flex: 1 }}>
            {item?.nome} {tipo === 'insumo' && item?.unidade && <span style={{ fontWeight: 400 }}>· {item.unidade}</span>}
          </span>
          <button onClick={() => setItemId('')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 16, cursor: 'pointer', padding: 0 }}>×</button>
        </div>
      )}

      {/* Dose + data/hora */}
      {tipo === 'insumo' && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Dose ({unidade || 'un'})</div>
          <input
            type="number" min="0" step="0.01" value={doseQtd}
            onChange={e => setDoseQtd(e.target.value)}
            placeholder="Ex: 10"
            style={inputSt}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Data</div>
          <input type="date" value={data} onChange={e => setData(e.target.value)} style={inputSt} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Hora</div>
          <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={inputSt} />
        </div>
      </div>

      {/* Recorrência — só permite em criação (editar cada ocorrência individualmente) */}
      {!isEdit && (
        <div style={{ marginBottom: 10, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Recorrência</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 8 }}>
            {[
              { id: 'unica', label: 'Única' },
              { id: 'a_cada_h', label: 'A cada X h' },
              { id: 'a_cada_dia', label: 'A cada X d' },
            ].map(o => {
              const sel = recType === o.id;
              return (
                <button key={o.id} onClick={() => setRecType(o.id)} style={{
                  background: sel ? 'var(--accent)' : 'var(--card)',
                  color: sel ? '#fff' : 'var(--ink)',
                  border: `1px solid ${sel ? 'var(--accent)' : 'var(--line)'}`,
                  borderRadius: 7, padding: '6px 4px', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'var(--sans)',
                }}>
                  {o.label}
                </button>
              );
            })}
          </div>
          {recType !== 'unica' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 3 }}>Intervalo</div>
                <input
                  type="number" min="1" step="1" value={recValor}
                  onChange={e => setRecValor(e.target.value)}
                  style={inputSt}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 3 }}>Até (opcional, padrão 7 dias)</div>
                <input type="date" value={recAte} onChange={e => setRecAte(e.target.value)} style={inputSt} />
              </div>
            </div>
          )}
          {recType !== 'unica' && (
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.4 }}>
              Vão ser criadas ocorrências separadas a cada {recValor}{recType === 'a_cada_h' ? 'h' : ' dia(s)'} até {recAte || 'daqui 7 dias'}.
              Você pode cancelar, editar ou excluir cada uma individualmente.
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer' }}
        >Cancelar</button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            flex: 2, background: canSave ? '#1d4ed8' : 'var(--soft)',
            border: 'none', color: canSave ? '#fff' : 'var(--ink-3)',
            borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 700,
            fontFamily: 'var(--sans)', cursor: canSave ? 'pointer' : 'default',
          }}
        >{isEdit ? 'Salvar edição' : 'Programar'}</button>
      </div>
    </div>
  );
}

// Expande recorrência em ocorrências separadas (uma linha por ocorrência).
// Assim é fácil cancelar/editar cada uma sem quebrar a linha do tempo.
function expandirRecorrencia({ recorrencia, data, hora, ...resto }) {
  const rec = recorrencia || { tipo: 'unica' };
  if (rec.tipo === 'unica' || !rec.valor) {
    return [{ ...resto, data, hora, recorrencia: { tipo: 'unica' } }];
  }
  const inicio = new Date(`${data}T${hora}:00`);
  const ate = rec.ate ? new Date(`${rec.ate}T23:59:59`) : new Date(inicio.getTime() + 7 * 24 * 60 * 60 * 1000);
  const passoMs = rec.tipo === 'a_cada_h'
    ? Number(rec.valor) * 60 * 60 * 1000
    : Number(rec.valor) * 24 * 60 * 60 * 1000;
  if (passoMs <= 0) return [{ ...resto, data, hora, recorrencia: rec }];
  const out = [];
  let cursor = inicio;
  let safety = 0;
  while (cursor <= ate && safety < 500) {
    const d = cursor.toISOString().slice(0, 10);
    const h = cursor.toTimeString().slice(0, 5);
    out.push({ ...resto, data: d, hora: h, recorrencia: rec });
    cursor = new Date(cursor.getTime() + passoMs);
    safety++;
  }
  return out;
}

function descreveRecorrencia(rec) {
  if (!rec || rec.tipo === 'unica') return '';
  if (rec.tipo === 'a_cada_h') return `A cada ${rec.valor}h`;
  if (rec.tipo === 'a_cada_dia') return `A cada ${rec.valor} dia(s)`;
  return '';
}

function fmtDataDiaSemana(dataStr) {
  const d = new Date(dataStr + 'T12:00:00');
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${dias[d.getDay()]}, ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
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
