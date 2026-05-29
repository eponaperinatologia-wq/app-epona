// partos.jsx — Registro e acompanhamento de partos
import React, { useState, useMemo } from 'react';
import { Icon } from './icons';
import { TopBar } from './screens';

const NUTRICAO_VAZIO = { racaoId: '', racaoKgManha: 0, racaoKgTarde: 0, racaoKgDia: 0, comeAlmoco: false, racaoKgAlmoco: 0, oleoMlDia: 0, suplementos: [] };

const MAMOU_OPTIONS = [
  { value: 'mae',                label: 'Mamou na mãe' },
  { value: 'mamadeira_materno',  label: 'Mamadeira — leite materno' },
  { value: 'mamadeira_colostro', label: 'Mamadeira — banco de colostro' },
];

// ── Helpers ───────────────────────────────────────────────────
const pad2 = (n) => String(n).padStart(2, '0');
const toDateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const toTimeStr = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const fmtDate = (ds) => { if (!ds) return '—'; const [y,m,d] = ds.split('-'); return `${d}/${m}/${y}`; };
const fmtCurrency = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const boolLabel = (v) => v === true ? '✓ Sim' : v === false ? '✗ Não' : '—';
const mamouLabel = (mamou) => {
  if (!mamou) return 'Não mamou';
  return MAMOU_OPTIONS.find(o => o.value === mamou)?.label || mamou;
};

// ── Shared UI ─────────────────────────────────────────────────
const Label = ({ t, style }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, ...style }}>{t}</div>
);
const DadosField = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <Label t={label} />
    {children}
  </div>
);
const RelatorioRow = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
    <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 600, color: color || 'var(--ink)' }}>{value}</span>
  </div>
);

const SectionCard = ({ children, style }) => (
  <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px', marginBottom: 14, ...style }}>
    {children}
  </div>
);

const SubTabBar = ({ tabs, active, onChange }) => (
  <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--bg)', flexShrink: 0 }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{
        flex: 1, padding: '11px 8px', border: 'none', background: 'none',
        borderBottom: `2px solid ${active === t.id ? 'var(--accent)' : 'transparent'}`,
        color: active === t.id ? 'var(--accent)' : 'var(--ink-3)',
        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)',
      }}>{t.label}</button>
    ))}
  </div>
);

// Tri-state toggle: null → true/false toggle
const TriToggle = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: 6 }}>
    <button onClick={() => onChange(value === true ? null : true)} style={{
      flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--sans)',
      border: `1px solid ${value === true ? '#16a34a' : 'var(--line)'}`,
      background: value === true ? '#dcfce7' : 'var(--bg)',
      color: value === true ? '#16a34a' : 'var(--ink-3)',
      fontSize: 13, fontWeight: 700,
    }}>✓ Sim</button>
    <button onClick={() => onChange(value === false ? null : false)} style={{
      flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--sans)',
      border: `1px solid ${value === false ? '#dc2626' : 'var(--line)'}`,
      background: value === false ? '#fef2f2' : 'var(--bg)',
      color: value === false ? '#dc2626' : 'var(--ink-3)',
      fontSize: 13, fontWeight: 700,
    }}>✗ Não</button>
  </div>
);

// ─────────────────────────────────────────────────────────────
// LISTA DE PARTOS
// ─────────────────────────────────────────────────────────────
export function PartosScreen({ setScreen, setSelected, partos, cavalos, proprietarios }) {
  const sorted = [...partos].sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar
        title="Partos"
        subtitle={`${partos.length} registrado${partos.length !== 1 ? 's' : ''}`}
        onBack={() => setScreen('home')}
      />

      {/* Botão principal */}
      <div style={{ padding: '16px 16px 0' }}>
        <button onClick={() => setScreen('registrarParto')} style={{
          width: '100%', padding: '18px', borderRadius: 16, border: 'none',
          background: 'linear-gradient(135deg, #3d6043, #2a4330)',
          color: '#fff', cursor: 'pointer', fontFamily: 'var(--sans)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          boxShadow: '0 6px 20px rgba(61,96,67,0.3)',
          marginBottom: 20,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="heart" size={20} color="#fff" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Registrar Parto</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 1 }}>Iniciar acompanhamento neonatal</div>
          </div>
        </button>

        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)', fontSize: 14 }}>
            Nenhum parto registrado
          </div>
        ) : (
          sorted.map(pt => {
            const egua = cavalos.find(c => c.id === pt.eguaId);
            const potro = cavalos.find(c => c.id === pt.potroId);
            const prop = proprietarios.find(p => p.id === pt.proprietarioId);
            const emAndamento = pt.status === 'em_andamento';
            return (
              <div key={pt.id} onClick={() => { setSelected(pt.id); setScreen('partoDetalhe'); }}
                style={{ background: 'var(--card)', border: `1px solid ${emAndamento ? '#fde68a' : 'var(--line)'}`, borderRadius: 14, padding: '14px', marginBottom: 10, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: emAndamento ? '#fffbeb' : 'var(--soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="heart" size={20} color={emAndamento ? '#d97706' : 'var(--accent)'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>
                        {potro?.nome || 'Potro'}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                        background: emAndamento ? '#fef9c3' : '#dcfce7',
                        color: emAndamento ? '#92400e' : '#16a34a',
                        border: `1px solid ${emAndamento ? '#fde68a' : '#bbf7d0'}`,
                      }}>
                        {emAndamento ? 'Em andamento' : 'Concluído'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                      Mãe: <strong>{egua?.nome || '—'}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                      {fmtDate(pt.data)}{pt.hora ? ` às ${pt.hora}` : ''} · {prop?.nome || '—'}
                    </div>
                  </div>
                  <Icon name="chevron-right" size={16} color="var(--ink-3)" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REGISTRAR PARTO
// ─────────────────────────────────────────────────────────────
export function RegistrarPartoScreen({ setScreen, setSelected, cavalos, proprietarios, insumos, addCavalo, addParto, updateCavalo }) {
  const now = new Date();
  const [eguaId, setEguaId] = useState('');
  const [potroNome, setPotroNome] = useState('');
  const [proprietarioId, setProprietarioId] = useState('');
  const [data, setData] = useState(toDateStr(now));
  const [hora, setHora] = useState(toTimeStr(now));

  const eguas = useMemo(() => cavalos.filter(c => c.sexo === 'F' || c.sexo === ''), [cavalos]);

  const handleEguaChange = (id) => {
    setEguaId(id);
    const egua = cavalos.find(c => c.id === id);
    if (egua) {
      const primeiroNome = egua.nome.split(' ')[0];
      setPotroNome(`NN ${primeiroNome}`);
      setProprietarioId(egua.proprietarioId || '');
    }
  };

  const handleRegistrar = () => {
    if (!eguaId || !potroNome.trim()) return;
    const egua = cavalos.find(c => c.id === eguaId);
    const assistencia = insumos.find(i => i.nome === 'Assistência ao Parto') || insumos.find(i => i.id === 'im8');

    // Cria o potro
    const potroId = addCavalo({
      nome: potroNome.trim(),
      sexo: '',
      categoria: 'Potro ao pé',
      nascimento: data,
      proprietarioId,
      pelagem: '',
      baia: egua?.baia || '',
      piquete: egua?.piquete || '',
      mensalidade: 0,
      obs: `Potro de ${egua?.nome || ''}`,
      nutricao: { ...NUTRICAO_VAZIO },
    });

    // Cria o parto com Assistência ao Parto já lançada
    const partoId = addParto({
      data,
      hora,
      eguaId,
      potroId,
      proprietarioId,
      status: 'em_andamento',
      posicaoEsternal: null, horaPosicaoEsternal: '',
      reflexoSucao: null,    horaReflexoSucao: '',
      levantou: null,        horaLevantou: '',
      mamou: null,           horaMamou: '',
      liberouMeconio: null,  horaLiberouMeconio: '',
      transicaoFezes: null,  horaTransicaoFezes: '',
      urinou: null,          horaUrinou: '',
      altura: '',
      peso: '',
      obsAprumo: '',
      obsGerais: '',
      insumosUsados: assistencia ? [{
        id: 'iu_base',
        insumoId: assistencia.id,
        qtd: 1,
        valorUnit: assistencia.valorVenda,
        fixo: true,
      }] : [],
    });

    // Archive gestação and mark mare as Matriz
    if (updateCavalo && egua?.gestacao) {
      const g = egua.gestacao;
      let dataPrevisao = null;
      if (g.dataCobricao) {
        const d = new Date(g.dataCobricao + 'T12:00:00');
        d.setDate(d.getDate() + 330);
        dataPrevisao = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
      }
      updateCavalo(eguaId, {
        categoria: 'Matriz',
        gestacao: null,
        historicoGestacional: [
          ...(egua.historicoGestacional || []),
          {
            dataCobricao: g.dataCobricao || null, dataPrevisao,
            pai: g.pai || '', sexagem: g.sexagem || null,
            dataParto: data, potroId,
            gestacaoCompleta: egua.gestacao || {},
          },
        ],
      });
    }

    setSelected(partoId);
    setScreen('partoDetalhe');
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12,
    border: '1px solid var(--line)', background: 'var(--card)',
    fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
  };
  const selectStyle = { ...inputStyle, appearance: 'none' };

  const pronto = eguaId && potroNome.trim() && proprietarioId;

  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title="Registrar Parto" onBack={() => setScreen('partos')} />
      <div style={{ padding: '16px 16px 0' }}>

        <SectionCard>
          <Label t="Égua" />
          <select value={eguaId} onChange={e => handleEguaChange(e.target.value)} style={selectStyle}>
            <option value="">Selecionar égua…</option>
            {eguas.sort((a,b) => a.nome.localeCompare(b.nome)).map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </SectionCard>

        <SectionCard>
          <Label t="Potro — nome inicial" />
          <input
            value={potroNome}
            onChange={e => setPotroNome(e.target.value)}
            placeholder="NN [nome da mãe]"
            style={inputStyle}
          />
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
            Pode ser editado após o registro. O potro será adicionado ao plantel automaticamente.
          </div>
        </SectionCard>

        <SectionCard>
          <Label t="Proprietário do potro" />
          <select value={proprietarioId} onChange={e => setProprietarioId(e.target.value)} style={selectStyle}>
            <option value="">Selecionar proprietário…</option>
            {proprietarios.sort((a,b) => a.nome.localeCompare(b.nome)).map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
            Preenchido automaticamente com o proprietário da égua.
          </div>
        </SectionCard>

        <SectionCard>
          <Label t="Data e hora do nascimento" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4, fontWeight: 600 }}>Data</div>
              <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ ...inputStyle, padding: '10px 12px', fontSize: 14 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4, fontWeight: 600 }}>Hora</div>
              <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={{ ...inputStyle, padding: '10px 12px', fontSize: 14 }} />
            </div>
          </div>
        </SectionCard>

        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: 12, color: '#92400e' }}>
          <strong>Cobrança automática:</strong> "Assistência ao Parto" será lançada na fatura do proprietário.
        </div>

        <button onClick={handleRegistrar} disabled={!pronto} style={{
          width: '100%', padding: '16px', borderRadius: 14, border: 'none',
          background: pronto ? 'var(--accent)' : 'var(--soft)',
          color: pronto ? '#fff' : 'var(--ink-3)',
          fontSize: 16, fontWeight: 700, fontFamily: 'var(--sans)', cursor: pronto ? 'pointer' : 'default',
          boxShadow: pronto ? '0 6px 16px rgba(61,96,67,0.25)' : 'none',
        }}>
          Iniciar registro de parto
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DETALHE DO PARTO — 3 abas
// ─────────────────────────────────────────────────────────────
export function PartoDetalheScreen({ id, setScreen, partos, updateParto, deleteParto, cavalos, updateCavalo, deleteCavalo, proprietarios, insumos }) {
  const pt = partos.find(p => p.id === id);
  const [subTab, setSubTab] = useState('dados');
  const [confirmando, setConfirmando] = useState(false);

  if (!pt) return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar title="Parto" onBack={() => setScreen('partos')} />
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}>Registro não encontrado.</div>
    </div>
  );

  const egua = cavalos.find(c => c.id === pt.eguaId);
  const potro = cavalos.find(c => c.id === pt.potroId);
  const prop = proprietarios.find(p => p.id === pt.proprietarioId);

  const update = (field, value) => updateParto(pt.id, { [field]: value });

  const handleDesfazer = () => {
    if (egua) {
      const histAll = egua.historicoGestacional || [];
      // Tenta encontrar pelo potroId, depois pelo dataParto, depois pega o último
      const hist = histAll.find(h => h.potroId === pt.potroId)
        || histAll.find(h => h.dataParto === pt.data)
        || histAll[histAll.length - 1];
      const novoHist = hist ? histAll.filter(h => h !== hist) : histAll;

      // Restaura gestacao completa (com acompanhamento) se disponível, senão reconstrói do básico
      const gestacaoRestaurada = hist?.gestacaoCompleta
        || (hist ? { dataCobricao: hist.dataCobricao || '', pai: hist.pai || '', sexagem: hist.sexagem || null } : {});

      const categoriasAtuais = (egua.categorias || []).filter(c => c !== 'Matriz' && c !== 'Gestante');
      updateCavalo(egua.id, {
        categoria: 'Gestante',
        categorias: [...categoriasAtuais, 'Gestante'],
        gestacao: gestacaoRestaurada,
        historicoGestacional: novoHist,
      });
    }
    if (pt.potroId) deleteCavalo(pt.potroId);
    deleteParto(pt.id);
    setScreen('partos');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar
        title={potro?.nome || 'Parto'}
        subtitle={`${egua?.nome || '—'} · ${fmtDate(pt.data)}${pt.hora ? ` às ${pt.hora}` : ''}`}
        onBack={() => setScreen('partos')}
        action={
          <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
            background: pt.status === 'em_andamento' ? '#fef9c3' : '#dcfce7',
            color: pt.status === 'em_andamento' ? '#92400e' : '#16a34a',
            border: `1px solid ${pt.status === 'em_andamento' ? '#fde68a' : '#bbf7d0'}`,
          }}>
            {pt.status === 'em_andamento' ? 'Em andamento' : 'Concluído'}
          </span>
        }
      />
      <SubTabBar
        tabs={[{ id: 'dados', label: 'Dados Clínicos' }, { id: 'insumos', label: 'Insumos' }, { id: 'relatorio', label: 'Relatório' }]}
        active={subTab}
        onChange={setSubTab}
      />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>
        {subTab === 'dados' && <DadosTab pt={pt} update={update} />}
        {subTab === 'insumos' && <InsumosTab pt={pt} updateParto={updateParto} insumos={insumos} />}
        {subTab === 'relatorio' && (
          <>
            <RelatorioTab pt={pt} egua={egua} potro={potro} prop={prop} insumos={insumos} updateParto={updateParto} />
            <div style={{ padding: '0 16px 24px' }}>
              {!confirmando ? (
                <button onClick={() => setConfirmando(true)} style={{
                  width: '100%', padding: '12px', borderRadius: 12,
                  border: '1px solid #fca5a5', background: '#fff1f2',
                  color: '#dc2626', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'var(--sans)',
                }}>
                  🗑 Desfazer registro de parto
                </button>
              ) : (
                <div style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>Tem certeza?</div>
                  <div style={{ fontSize: 13, color: '#7f1d1d', marginBottom: 14, lineHeight: 1.5 }}>
                    Isso irá excluir o registro do parto, excluir o potro <strong>{potro?.nome || ''}</strong> do sistema
                    e reverter <strong>{egua?.nome || 'a égua'}</strong> para a lista de gestantes.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setConfirmando(false)} style={{
                      flex: 1, padding: '10px', borderRadius: 10,
                      border: '1px solid var(--line)', background: 'var(--card)',
                      color: 'var(--ink-3)', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--sans)',
                    }}>Cancelar</button>
                    <button onClick={handleDesfazer} style={{
                      flex: 2, padding: '10px', borderRadius: 10,
                      border: 'none', background: '#dc2626',
                      color: '#fff', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'var(--sans)',
                    }}>Sim, desfazer parto</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Aba Dados Clínicos ────────────────────────────────────────
function DadosTab({ pt, update }) {
  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--line)', background: 'var(--card)',
    fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
  };


  return (
    <div style={{ padding: '14px 16px 0' }}>
      <DadosField label="Hora do nascimento">
        <input type="time" value={pt.hora || ''} onChange={e => update('hora', e.target.value)} style={inputStyle} />
      </DadosField>

      <SectionCard>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          Avaliação Neonatal
        </div>

        {[
          { key: 'posicaoEsternal', horaKey: 'horaPosicaoEsternal', label: 'Posição esternal' },
          { key: 'reflexoSucao',    horaKey: 'horaReflexoSucao',    label: 'Reflexo de sucção' },
          { key: 'liberouMeconio',  horaKey: 'horaLiberouMeconio',  label: 'Liberou mecônio' },
          { key: 'transicaoFezes',  horaKey: 'horaTransicaoFezes',  label: 'Iniciou transição para fezes de leite' },
          { key: 'urinou',          horaKey: 'horaUrinou',          label: 'Urinou' },
        ].map(({ key, horaKey, label }) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{label}</div>
            <TriToggle value={pt[key]} onChange={v => update(key, v)} />
            {pt[key] === true && (
              <input type="time" value={pt[horaKey] || ''} onChange={e => update(horaKey, e.target.value)}
                style={{ ...inputStyle, marginTop: 8 }}
              />
            )}
          </div>
        ))}

        {/* Levantou + hora */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Levantou</div>
          <TriToggle value={pt.levantou} onChange={v => update('levantou', v)} />
          {pt.levantou === true && (
            <input type="time" value={pt.horaLevantou || ''} onChange={e => update('horaLevantou', e.target.value)}
              placeholder="Hora que levantou"
              style={{ ...inputStyle, marginTop: 8 }}
            />
          )}
        </div>

        {/* Mamou */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Mamou</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={() => update('mamou', null)} style={{
              padding: '9px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--sans)',
              border: `1px solid ${pt.mamou === null ? '#64748b' : 'var(--line)'}`,
              background: pt.mamou === null ? '#f1f5f9' : 'var(--bg)',
              color: pt.mamou === null ? '#334155' : 'var(--ink-3)',
              fontSize: 13, fontWeight: pt.mamou === null ? 700 : 400,
            }}>✗ Não mamou</button>
            {MAMOU_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => update('mamou', opt.value)} style={{
                padding: '9px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--sans)',
                border: `1px solid ${pt.mamou === opt.value ? 'var(--accent)' : 'var(--line)'}`,
                background: pt.mamou === opt.value ? 'var(--accent-soft)' : 'var(--bg)',
                color: pt.mamou === opt.value ? 'var(--accent)' : 'var(--ink-3)',
                fontSize: 13, fontWeight: pt.mamou === opt.value ? 700 : 400,
              }}>✓ {opt.label}</button>
            ))}
          </div>
          {pt.mamou && (
            <input type="time" value={pt.horaMamou || ''} onChange={e => update('horaMamou', e.target.value)}
              placeholder="Hora que mamou"
              style={{ ...inputStyle, marginTop: 8 }}
            />
          )}
        </div>
      </SectionCard>

      <SectionCard>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          Biometria
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <Label t="Altura (cm)" />
            <input type="number" value={pt.altura || ''} onChange={e => update('altura', e.target.value)}
              placeholder="ex: 98" style={inputStyle} />
          </div>
          <div>
            <Label t="Peso (kg)" />
            <input type="number" value={pt.peso || ''} onChange={e => update('peso', e.target.value)}
              placeholder="ex: 52" style={inputStyle} />
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          Observações
        </div>
        <div style={{ marginBottom: 12 }}>
          <Label t="Aprumos" />
          <textarea value={pt.obsAprumo || ''} onChange={e => update('obsAprumo', e.target.value)}
            placeholder="Observações sobre os aprumos…"
            style={{ ...inputStyle, minHeight: 70, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>
        <div>
          <Label t="Observações gerais" />
          <textarea value={pt.obsGerais || ''} onChange={e => update('obsGerais', e.target.value)}
            placeholder="Outras observações…"
            style={{ ...inputStyle, minHeight: 70, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>
      </SectionCard>
    </div>
  );
}

// ── Aba Insumos ───────────────────────────────────────────────
function InsumosTab({ pt, updateParto, insumos }) {
  const [insumoSel, setInsumoSel] = useState('');
  const [qtd, setQtd] = useState('1');
  const [mostrarAdd, setMostrarAdd] = useState(false);

  const insumoObj = insumos.find(i => i.id === insumoSel);
  const subtotal = (parseFloat(qtd) || 0) * (insumoObj?.valorVenda || 0);

  const total = pt.insumosUsados.reduce((sum, u) => sum + (u.qtd * u.valorUnit), 0);

  const handleAdd = () => {
    if (!insumoSel || !qtd || parseFloat(qtd) <= 0) return;
    const newItem = {
      id: 'iu_' + Date.now(),
      insumoId: insumoSel,
      qtd: parseFloat(qtd),
      valorUnit: insumoObj.valorVenda,
      fixo: false,
    };
    updateParto(pt.id, { insumosUsados: [...pt.insumosUsados, newItem] });
    setInsumoSel('');
    setQtd('1');
    setMostrarAdd(false);
  };

  const handleRemove = (uid) => {
    updateParto(pt.id, { insumosUsados: pt.insumosUsados.filter(u => u.id !== uid) });
  };

  const selectStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--line)', background: 'var(--bg)',
    fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
  };

  // Group insumos by category for the select
  const insumosPorCat = useMemo(() => {
    const groups = {};
    insumos.forEach(i => {
      if (!groups[i.categoria]) groups[i.categoria] = [];
      groups[i.categoria].push(i);
    });
    return groups;
  }, [insumos]);

  const CAT_LABELS = { racao:'Ração', oleo:'Óleo', suplemento:'Suplemento', medicamento:'Medicamento', veterinario:'Veterinário', transporte:'Transporte', descartavel:'Descartável' };

  return (
    <div style={{ padding: '14px 16px 0' }}>

      {/* Lista de insumos usados */}
      <SectionCard style={{ padding: 0 }}>
        {pt.insumosUsados.map((u, idx) => {
          const ins = insumos.find(i => i.id === u.insumoId);
          const valor = u.qtd * u.valorUnit;
          return (
            <div key={u.id} style={{
              padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
              borderBottom: idx < pt.insumosUsados.length - 1 ? '1px solid var(--line)' : 'none',
            }}>
              {u.fixo && (
                <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--accent)', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                  {ins?.nome || u.insumoId}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                  {u.qtd} {ins?.unidade} × {fmtCurrency(u.valorUnit)} = <strong style={{ color: 'var(--ink-2)' }}>{fmtCurrency(valor)}</strong>
                </div>
              </div>
              {!u.fixo && (
                <button onClick={() => handleRemove(u.id)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#dc2626', cursor: 'pointer', padding: 0, flexShrink: 0 }}>×</button>
              )}
              {u.fixo && (
                <span style={{ fontSize: 10, color: 'var(--ink-3)', fontStyle: 'italic' }}>automático</span>
              )}
            </div>
          );
        })}
        {pt.insumosUsados.length === 0 && (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, fontStyle: 'italic' }}>
            Nenhum insumo registrado
          </div>
        )}
      </SectionCard>

      {/* Total */}
      <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 12, padding: '12px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>Total</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{fmtCurrency(total)}</span>
      </div>

      {/* Adicionar insumo */}
      {!mostrarAdd ? (
        <button onClick={() => setMostrarAdd(true)} style={{
          width: '100%', padding: '13px', borderRadius: 12,
          border: '1px dashed var(--accent)', background: 'var(--accent-soft)',
          color: 'var(--accent)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Icon name="plus" size={16} color="var(--accent)" /> Adicionar insumo utilizado
        </button>
      ) : (
        <SectionCard>
          <Label t="Insumo" />
          <select value={insumoSel} onChange={e => setInsumoSel(e.target.value)} style={{ ...selectStyle, marginBottom: 10 }}>
            <option value="">Selecionar insumo…</option>
            {Object.entries(insumosPorCat).map(([cat, items]) => (
              <optgroup key={cat} label={CAT_LABELS[cat] || cat}>
                {items.map(i => <option key={i.id} value={i.id}>{i.nome} — {fmtCurrency(i.valorVenda)}/{i.unidade}</option>)}
              </optgroup>
            ))}
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <Label t="Quantidade" />
              <input type="number" min="0.01" step="0.01" value={qtd} onChange={e => setQtd(e.target.value)} style={selectStyle} />
            </div>
            <div>
              <Label t="Subtotal" />
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--soft)', fontSize: 14, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
                {fmtCurrency(subtotal)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMostrarAdd(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
              Cancelar
            </button>
            <button onClick={handleAdd} disabled={!insumoSel} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: insumoSel ? 'var(--accent)' : 'var(--soft)', color: insumoSel ? '#fff' : 'var(--ink-3)', fontSize: 13, fontWeight: 700, cursor: insumoSel ? 'pointer' : 'default', fontFamily: 'var(--sans)' }}>
              Adicionar
            </button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ── Aba Relatório ─────────────────────────────────────────────
function RelatorioTab({ pt, egua, potro, prop, insumos, updateParto }) {
  const [copied, setCopied] = useState(false);

  const total = pt.insumosUsados.reduce((sum, u) => sum + (u.qtd * u.valorUnit), 0);

  const relatorioTexto = `RELATÓRIO DE PARTO — HARAS EPONA
${'─'.repeat(40)}
Data: ${fmtDate(pt.data)}
Hora do nascimento: ${pt.hora || '—'}

ANIMAIS
Égua: ${egua?.nome || '—'}
Potro: ${potro?.nome || '—'}
Proprietário: ${prop?.nome || '—'}
${prop?.telefone ? `Telefone: ${prop.telefone}` : ''}

AVALIAÇÃO NEONATAL
Posição esternal:         ${boolLabel(pt.posicaoEsternal)}${pt.posicaoEsternal && pt.horaPosicaoEsternal ? ` às ${pt.horaPosicaoEsternal}` : ''}
Reflexo de sucção:        ${boolLabel(pt.reflexoSucao)}${pt.reflexoSucao && pt.horaReflexoSucao ? ` às ${pt.horaReflexoSucao}` : ''}
Levantou:                 ${boolLabel(pt.levantou)}${pt.levantou && pt.horaLevantou ? ` às ${pt.horaLevantou}` : ''}
Mamou:                    ${mamouLabel(pt.mamou)}${pt.mamou && pt.horaMamou ? ` às ${pt.horaMamou}` : ''}
Liberou mecônio:          ${boolLabel(pt.liberouMeconio)}${pt.liberouMeconio && pt.horaLiberouMeconio ? ` às ${pt.horaLiberouMeconio}` : ''}
Transição fezes de leite: ${boolLabel(pt.transicaoFezes)}${pt.transicaoFezes && pt.horaTransicaoFezes ? ` às ${pt.horaTransicaoFezes}` : ''}
Urinou:                   ${boolLabel(pt.urinou)}${pt.urinou && pt.horaUrinou ? ` às ${pt.horaUrinou}` : ''}

BIOMETRIA
Altura: ${pt.altura ? `${pt.altura} cm` : '—'}
Peso:   ${pt.peso ? `${pt.peso} kg` : '—'}

APRUMOS
${pt.obsAprumo || '—'}

OBSERVAÇÕES GERAIS
${pt.obsGerais || '—'}

${'─'.repeat(40)}
INSUMOS E PROCEDIMENTOS
${pt.insumosUsados.map(u => {
  const ins = insumos.find(i => i.id === u.insumoId);
  return `• ${ins?.nome || u.insumoId}: ${u.qtd} ${ins?.unidade || 'un'} × R$ ${u.valorUnit.toFixed(2)} = R$ ${(u.qtd * u.valorUnit).toFixed(2)}`;
}).join('\n')}

TOTAL: R$ ${total.toFixed(2).replace('.', ',')}
${'─'.repeat(40)}
Haras Epona — Relatório gerado em ${new Date().toLocaleString('pt-BR')}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(relatorioTexto).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };


  return (
    <div style={{ padding: '14px 16px 0' }}>

      {/* Cabeçalho */}
      <SectionCard>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Identificação</div>
        <RelatorioRow label="Égua" value={egua?.nome || '—'} />
        <RelatorioRow label="Potro" value={potro?.nome || '—'} />
        <RelatorioRow label="Proprietário" value={prop?.nome || '—'} />
        <RelatorioRow label="Data" value={fmtDate(pt.data)} />
        <RelatorioRow label="Hora nascimento" value={pt.hora || '—'} />
      </SectionCard>

      {/* Avaliação */}
      <SectionCard>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Avaliação Neonatal</div>
        {[
          { label: 'Posição esternal',         key: 'posicaoEsternal', horaKey: 'horaPosicaoEsternal' },
          { label: 'Reflexo de sucção',         key: 'reflexoSucao',    horaKey: 'horaReflexoSucao' },
          { label: 'Levantou',                  key: 'levantou',        horaKey: 'horaLevantou' },
          { label: 'Liberou mecônio',           key: 'liberouMeconio',  horaKey: 'horaLiberouMeconio' },
          { label: 'Transição fezes de leite',  key: 'transicaoFezes',  horaKey: 'horaTransicaoFezes' },
          { label: 'Urinou',                    key: 'urinou',          horaKey: 'horaUrinou' },
        ].map(({ label, key, horaKey }) => {
          const v = pt[key];
          const hora = pt[horaKey];
          const val = v === true ? `✓ Sim${hora ? ` às ${hora}` : ''}` : boolLabel(v);
          return <RelatorioRow key={key} label={label} value={val} color={v === true ? '#16a34a' : v === false ? '#dc2626' : undefined} />;
        })}
        <RelatorioRow label="Mamou" value={pt.mamou ? mamouLabel(pt.mamou) + (pt.horaMamou ? ` às ${pt.horaMamou}` : '') : '—'} color={pt.mamou ? '#16a34a' : undefined} />
        <RelatorioRow label="Altura" value={pt.altura ? `${pt.altura} cm` : '—'} />
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Peso</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{pt.peso ? `${pt.peso} kg` : '—'}</span>
        </div>
      </SectionCard>

      {/* Obs */}
      {(pt.obsAprumo || pt.obsGerais) && (
        <SectionCard>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Observações</div>
          {pt.obsAprumo && <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 4 }}>APRUMOS</div>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{pt.obsAprumo}</p>
          </>}
          {pt.obsGerais && <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 4 }}>GERAIS</div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{pt.obsGerais}</p>
          </>}
        </SectionCard>
      )}

      {/* Cobrança */}
      <SectionCard>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Cobrança</div>
        {pt.insumosUsados.map(u => {
          const ins = insumos.find(i => i.id === u.insumoId);
          return (
            <RelatorioRow key={u.id} label={`${ins?.nome || '—'} (${u.qtd} ${ins?.unidade || 'un'})`} value={fmtCurrency(u.qtd * u.valorUnit)} />
          );
        })}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 0', marginTop: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>Total</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{fmtCurrency(total)}</span>
        </div>
      </SectionCard>

      {/* Ações */}
      <button onClick={handleCopy} style={{
        width: '100%', padding: '14px', borderRadius: 12, border: '1px solid var(--accent)',
        background: copied ? 'var(--accent)' : 'var(--accent-soft)',
        color: copied ? '#fff' : 'var(--accent)',
        fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10,
        transition: 'background 0.2s',
      }}>
        <Icon name={copied ? 'check' : 'copy'} size={16} color={copied ? '#fff' : 'var(--accent)'} />
        {copied ? 'Copiado!' : 'Copiar relatório de parto'}
      </button>

      <button
        onClick={() => updateParto(pt.id, { status: pt.status === 'em_andamento' ? 'concluido' : 'em_andamento' })}
        style={{
          width: '100%', padding: '13px', borderRadius: 12,
          border: `1px solid ${pt.status === 'em_andamento' ? '#16a34a' : 'var(--line)'}`,
          background: pt.status === 'em_andamento' ? '#dcfce7' : 'transparent',
          color: pt.status === 'em_andamento' ? '#16a34a' : 'var(--ink-3)',
          fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)', marginBottom: 20,
        }}
      >
        {pt.status === 'em_andamento' ? '✓ Marcar como concluído' : '↩ Reabrir parto'}
      </button>
    </div>
  );
}

