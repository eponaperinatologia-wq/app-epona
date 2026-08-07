// funcionarios.jsx — Cadastro de funcionários, planner semanal e calendário mensal
import React, { useState, useMemo } from 'react';
import { Icon } from './icons';
import { TopBar } from './screens';
import { ESCALA_VAZIA } from './data';
import { ROLE_COLORS, ROLE_LABELS } from './auth';

const DIAS = [
  { key: 'seg', label: 'Seg', full: 'Segunda-feira' },
  { key: 'ter', label: 'Ter', full: 'Terça-feira' },
  { key: 'qua', label: 'Qua', full: 'Quarta-feira' },
  { key: 'qui', label: 'Qui', full: 'Quinta-feira' },
  { key: 'sex', label: 'Sex', full: 'Sexta-feira' },
  { key: 'sab', label: 'Sáb', full: 'Sábado' },
  { key: 'dom', label: 'Dom', full: 'Domingo' },
];

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const FUNCAO_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'vet', label: 'Veterinário' },
  { value: 'operacional', label: 'Operacional' },
];

// ── Helpers ──────────────────────────────────────────────────

const pad2 = (n) => String(n).padStart(2, '0');
const toDateStr = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

// Converte uma data string 'YYYY-MM-DD' para a chave de dia da semana (seg/ter/...)
const diaKeyFromStr = (dateStr) => {
  const keys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  return keys[new Date(dateStr + 'T12:00:00').getDay()];
};

// Adiciona N dias a uma string de data
const addDaysToStr = (dateStr, n) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};

// Status real de um funcionário num dia específico (eventos têm prioridade sobre escala)
// Retorna: 'trabalha' | 'folga_evento' | 'folga_escala'
const getStatusDia = (fn, dateStr, eventos) => {
  const temFolga = eventos.some(ev =>
    ev.tipo === 'folga' &&
    ev.funcionarioId === fn.id &&
    dateStr >= ev.data &&
    dateStr <= (ev.dataFim || ev.data)
  );
  if (temFolga) return 'folga_evento';
  return fn.escala?.[diaKeyFromStr(dateStr)]?.trabalha ? 'trabalha' : 'folga_escala';
};

// Retorna o evento de folga de um funcionário para uma data específica (se existir)
const getFolgaEvento = (fn, dateStr, eventos) =>
  eventos.find(ev =>
    ev.tipo === 'folga' && ev.funcionarioId === fn.id &&
    dateStr >= ev.data && dateStr <= (ev.dataFim || ev.data)
  );

// Retorna todos os eventos que cobrem um dia específico
const getEventosDoDia = (dateStr, eventos) =>
  eventos.filter(ev => dateStr >= ev.data && dateStr <= (ev.dataFim || ev.data));

// Formata período de uma data a outra (ex: "10 a 13/05")
const fmtPeriodo = (ev) => {
  if (!ev.dataFim || ev.dataFim === ev.data) return null;
  const [, m2, d2] = ev.dataFim.split('-');
  const [, m1, d1] = ev.data.split('-');
  if (m1 === m2) return `${parseInt(d1)} a ${parseInt(d2)}/${parseInt(m2)}`;
  return `${parseInt(d1)}/${parseInt(m1)} a ${parseInt(d2)}/${parseInt(m2)}`;
};

const getWeekDates = (offset = 0) => {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  return DIAS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

const getMonthDays = (year, month) => {
  const first = new Date(year, month, 1).getDay();
  const fill = first === 0 ? 6 : first - 1;
  const last = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < fill; i++) cells.push(null);
  for (let d = 1; d <= last; d++) cells.push(d);
  return cells;
};

const getDiaAtual = () => {
  const idx = new Date().getDay();
  return [6, 0, 1, 2, 3, 4, 5][idx];
};

const fmtAniv = (iso) => {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  const ms = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${parseInt(d)} de ${ms[parseInt(m) - 1]}`;
};

const getProximoAniv = (iso) => {
  if (!iso) return null;
  const hoje = new Date();
  const [, m, d] = iso.split('-');
  let aniv = new Date(hoje.getFullYear(), parseInt(m) - 1, parseInt(d));
  if (aniv < hoje) aniv.setFullYear(aniv.getFullYear() + 1);
  const diff = Math.ceil((aniv - hoje) / 86400000);
  if (diff === 0) return 'Hoje! 🎂';
  if (diff <= 7) return `Em ${diff} dia${diff > 1 ? 's' : ''} 🎂`;
  return null;
};

// ── Shared components ─────────────────────────────────────────

const FuncaoBadge = ({ funcao, size = 11 }) => (
  <span style={{
    display: 'inline-block',
    background: (ROLE_COLORS[funcao] || '#888') + '18',
    border: `1px solid ${(ROLE_COLORS[funcao] || '#888')}35`,
    borderRadius: 6, padding: '2px 7px',
    fontSize: size, fontWeight: 700, color: ROLE_COLORS[funcao] || '#888',
  }}>
    {ROLE_LABELS[funcao] || funcao}
  </span>
);

const Avatar = ({ fn, size = 44 }) => (
  <div style={{
    width: size, height: size, borderRadius: size / 2, flexShrink: 0,
    background: ROLE_COLORS[fn.funcao] || '#888', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--serif)', fontSize: Math.max(9, size * 0.38), fontWeight: 700,
  }}>
    {fn.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
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
      }}>
        {t.label}
      </button>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────
// LISTA (Cadastros → admin)
// ─────────────────────────────────────────────────────────────
export function FuncionariosScreen({ setScreen, setSelected, funcionarios }) {
  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar
        title="Funcionários"
        subtitle={`${funcionarios.length} cadastrados`}
        onBack={() => setScreen('cadastros')}
        action={
          <button onClick={() => { setSelected(null); setScreen('funcionarioDetalhe'); }} style={{
            width: 36, height: 36, borderRadius: 12, background: 'var(--accent)',
            display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer',
          }}>
            <Icon name="plus" size={18} color="#fff" />
          </button>
        }
      />
      <div style={{ padding: '14px 16px 0' }}>
        {/* Atalho pro cadastro de vets externos (Epona Repro Team) */}
        <button onClick={() => setScreen('cadVetsExternos')} style={{
          width: '100%', background: 'linear-gradient(135deg, #7c2d8c, #591e6a)', color: '#fff',
          border: 'none', borderRadius: 14, padding: '14px 16px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
          boxShadow: '0 6px 16px rgba(124,45,140,0.2)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.18)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <Icon name="stethoscope" size={20} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 15 }}>Epona Repro Team</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>Vets externos (login separado)</div>
          </div>
          <span style={{ fontSize: 18, opacity: 0.85 }}>›</span>
        </button>
        {funcionarios.map(fn => {
          const anivMsg = getProximoAniv(fn.aniversario);
          const diasTrabalhados = DIAS.filter(d => fn.escala?.[d.key]?.trabalha);
          return (
            <div key={fn.id} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar fn={fn} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)' }}>{fn.nome}</span>
                    <FuncaoBadge funcao={fn.funcao} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                    {fn.login ? `@${fn.login}` : 'Sem login'}
                    {fn.aniversario ? ` · 🎂 ${fmtAniv(fn.aniversario)}` : ''}
                    {anivMsg && <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: 4 }}>{anivMsg}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                    {diasTrabalhados.length > 0 ? diasTrabalhados.map(d => d.label).join(' · ') : 'Sem escala definida'}
                  </div>
                </div>
                <button onClick={() => { setSelected(fn.id); setScreen('funcionarioDetalhe'); }} style={{
                  width: 32, height: 32, borderRadius: 10, border: '1px solid var(--line)',
                  background: 'transparent', display: 'grid', placeItems: 'center', color: 'var(--ink-3)', cursor: 'pointer',
                }}>
                  <Icon name="edit" size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {funcionarios.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)', fontSize: 14 }}>Nenhum funcionário cadastrado</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DETALHE / EDIÇÃO
// ─────────────────────────────────────────────────────────────
const LabelField = ({ t }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t}</div>
);
export function FuncionarioDetalheScreen({ id, setScreen, backTo, funcionarios, addFuncionario, updateFuncionario, deleteFuncionario }) {
  const existing = id ? funcionarios.find(f => f.id === id) : null;
  const volta = backTo || 'funcionarios';
  const escalaInicial = existing?.escala || Object.fromEntries(DIAS.map(d => [d.key, { ...ESCALA_VAZIA }]));

  const [nome, setNome] = useState(existing?.nome || '');
  const [funcao, setFuncao] = useState(existing?.funcao || 'operacional');
  const [aniversario, setAniversario] = useState(existing?.aniversario || '');
  const [login, setLogin] = useState(existing?.login || '');
  const [senha, setSenha] = useState(existing?.senha || '');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [escala, setEscala] = useState(JSON.parse(JSON.stringify(escalaInicial)));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [salarioBase, setSalarioBase] = useState(existing?.salarioBase != null ? String(existing.salarioBase) : '');
  const [regimePagamento, setRegimePagamento] = useState(existing?.regimePagamento || 'mensal_dia_05');
  const [encargosPct, setEncargosPct] = useState(existing?.encargosPct != null ? String(existing.encargosPct) : '47.44');

  const setDiaTurno = (dia, field, value) =>
    setEscala(prev => ({ ...prev, [dia]: { ...prev[dia], [field]: value } }));

  const toggleDia = (dia) =>
    setEscala(prev => ({
      ...prev,
      [dia]: prev[dia].trabalha
        ? { ...ESCALA_VAZIA }
        : { trabalha: true, entrada: '07:00', saida: '17:00' },
    }));

  const handleSave = () => {
    if (!nome.trim()) return;
    const data = {
      nome: nome.trim(), funcao, aniversario,
      login: login.trim().toLowerCase(), senha, escala,
      salarioBase: parseFloat(String(salarioBase).replace(',', '.')) || 0,
      regimePagamento,
      encargosPct: parseFloat(String(encargosPct).replace(',', '.')) || 0,
    };
    if (existing) updateFuncionario(existing.id, data);
    else addFuncionario(data);
    setScreen(volta);
  };

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    deleteFuncionario(existing.id);
    setScreen(volta);
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12,
    border: '1px solid var(--line)', background: 'var(--card)',
    fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title={existing ? 'Editar funcionário' : 'Novo funcionário'} onBack={() => setScreen(volta)} />
      <div style={{ padding: '16px 16px 0' }}>

        <div style={{ marginBottom: 14 }}>
          <LabelField t="Nome" />
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <LabelField t="Função" />
          <div style={{ display: 'flex', gap: 8 }}>
            {FUNCAO_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setFuncao(opt.value)} style={{
                flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${funcao === opt.value ? ROLE_COLORS[opt.value] : 'var(--line)'}`,
                background: funcao === opt.value ? (ROLE_COLORS[opt.value] + '18') : 'var(--card)',
                color: funcao === opt.value ? ROLE_COLORS[opt.value] : 'var(--ink-3)',
                fontSize: 11, fontWeight: 700, fontFamily: 'var(--sans)',
              }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <LabelField t="Data de aniversário" />
          <input type="date" value={aniversario} onChange={e => setAniversario(e.target.value)} style={inputStyle} />
        </div>

        {/* Salário */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Salário e regime
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4, fontWeight: 600 }}>Salário base (R$ por mês)</div>
              <input type="number" min="0" step="0.01" value={salarioBase} onChange={e => setSalarioBase(e.target.value)} placeholder="0,00" style={{ ...inputStyle, padding: '10px 12px', fontSize: 14 }} />
              <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>Total mensal a pagar. As parcelas serão geradas conforme o regime escolhido.</div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4, fontWeight: 600 }}>Regime de pagamento</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { v: 'mensal_dia_05', l: 'Mensal · dia 5' },
                  { v: 'mensal_dia_20', l: 'Mensal · dia 20' },
                  { v: 'split_60_40', l: '60% dia 5 + 40% dia 20' },
                  { v: 'semanal', l: 'Semanal (toda sexta)' },
                ].map(opt => {
                  const sel = regimePagamento === opt.v;
                  return (
                    <button key={opt.v} onClick={() => setRegimePagamento(opt.v)} style={{
                      padding: '10px 8px', borderRadius: 9, border: `1px solid ${sel ? 'var(--accent)' : 'var(--line)'}`,
                      background: sel ? 'var(--accent)' : 'var(--card)',
                      color: sel ? '#fff' : 'var(--ink)',
                      fontSize: 12, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer',
                    }}>{opt.l}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4, fontWeight: 600 }}>Encargos (%) sobre o salário base</div>
              <input type="number" min="0" step="0.01" value={encargosPct} onChange={e => setEncargosPct(e.target.value)} placeholder="47.44" style={{ ...inputStyle, padding: '10px 12px', fontSize: 14 }} />
              <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>Padrão CLT: 47,44% (FGTS 8 + Férias 11,11 + 13º 8,33 + INSS 20). Simples Nacional: ~27,44% (sem INSS).</div>
            </div>
          </div>
        </div>

        {/* Acesso */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Acesso ao aplicativo
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4, fontWeight: 600 }}>Login</div>
                <input
                  value={login}
                  onChange={e => setLogin(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  placeholder="ex: carolina"
                  style={{ ...inputStyle, padding: '10px 12px', fontSize: 14 }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4, fontWeight: 600 }}>Senha</div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="Senha"
                    style={{ ...inputStyle, padding: '10px 36px 10px 12px', fontSize: 14 }}
                  />
                  <button onClick={() => setMostrarSenha(v => !v)} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--ink-3)', padding: 0,
                  }}>
                    {mostrarSenha ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              Acesso como <strong>{ROLE_LABELS[funcao]}</strong>. Folgas agendadas no Mensal substituem a escala nesses dias.
            </div>
          </div>
        </div>

        {/* Escala */}
        <div style={{ marginBottom: 20 }}>
          <LabelField t="Escala base semanal" />
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>
            Define os dias e horários padrão de trabalho. Folgas avulsas são agendadas no Mensal.
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {DIAS.map((d, idx) => {
              const turno = escala[d.key] || { ...ESCALA_VAZIA };
              return (
                <div key={d.key} style={{ borderBottom: idx < DIAS.length - 1 ? '1px solid var(--line)' : 'none', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => toggleDia(d.key)} style={{
                      width: 22, height: 22, borderRadius: 6, cursor: 'pointer',
                      border: `2px solid ${turno.trabalha ? 'var(--accent)' : 'var(--line)'}`,
                      background: turno.trabalha ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {turno.trabalha && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </button>
                    <span style={{ fontSize: 14, fontWeight: 600, color: turno.trabalha ? 'var(--ink)' : 'var(--ink-3)', flex: 1 }}>
                      {d.full}
                    </span>
                    {!turno.trabalha && <span style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>Folga</span>}
                  </div>
                  {turno.trabalha && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 10, paddingLeft: 32 }}>
                      {['entrada', 'saida'].map(campo => (
                        <div key={campo} style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {campo === 'entrada' ? 'Entrada' : 'Saída'}
                          </div>
                          <input
                            type="time" value={turno[campo]}
                            onChange={e => setDiaTurno(d.key, campo, e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={handleSave} disabled={!nome.trim()} style={{
          width: '100%', padding: '15px', borderRadius: 14, border: 'none',
          background: nome.trim() ? 'var(--accent)' : 'var(--soft)',
          color: nome.trim() ? '#fff' : 'var(--ink-3)',
          fontSize: 16, fontWeight: 700, fontFamily: 'var(--sans)', cursor: nome.trim() ? 'pointer' : 'default',
          marginBottom: 12,
        }}>
          {existing ? 'Salvar alterações' : 'Cadastrar funcionário'}
        </button>

        {existing && (
          <button onClick={handleDelete} style={{
            width: '100%', padding: '13px', borderRadius: 14,
            border: `1px solid ${confirmDelete ? '#dc2626' : 'var(--line)'}`,
            background: confirmDelete ? '#fef2f2' : 'transparent',
            color: confirmDelete ? '#dc2626' : 'var(--ink-3)',
            fontSize: 14, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer', marginBottom: 20,
          }}>
            {confirmDelete ? '⚠️ Confirmar exclusão' : 'Excluir funcionário'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ESCALA — planner por dia da semana (escala base + overlay eventos semana atual)
// ─────────────────────────────────────────────────────────────
function EscalaView({ funcionarios, eventos, podeEditar, goEditar, goNovo }) {
  const [diaFoco, setDiaFoco] = useState(getDiaAtual());

  // Datas da semana atual para calcular status real
  const currentWeekDates = useMemo(() => getWeekDates(0), []);
  const currentWeekDateStrs = currentWeekDates.map(toDateStr);

  const diaKey = DIAS[diaFoco].key;
  const diaFull = DIAS[diaFoco].full;
  const todayDateStr = currentWeekDateStrs[diaFoco];

  // Status real usando data específica da semana atual
  const trabalhando = funcionarios.filter(fn => getStatusDia(fn, todayDateStr, eventos) === 'trabalha');
  const folgaEvento = funcionarios.filter(fn => getStatusDia(fn, todayDateStr, eventos) === 'folga_evento');
  const folgaEscala = funcionarios.filter(fn => getStatusDia(fn, todayDateStr, eventos) === 'folga_escala');
  const hoje = getDiaAtual();

  return (
    <div style={{ paddingBottom: 10 }}>
      {/* Seletor de dia */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid var(--line)' }}>
        {DIAS.map((d, idx) => {
          const dateStr = currentWeekDateStrs[idx];
          const ativos = funcionarios.filter(fn => getStatusDia(fn, dateStr, eventos) === 'trabalha').length;
          const selected = idx === diaFoco;
          const isToday = idx === hoje;
          return (
            <button key={d.key} onClick={() => setDiaFoco(idx)} style={{
              flexShrink: 0, minWidth: 50, padding: '8px 6px', borderRadius: 12,
              border: `1px solid ${selected ? 'var(--accent)' : 'var(--line)'}`,
              background: selected ? 'var(--accent)' : 'var(--card)',
              color: selected ? '#fff' : 'var(--ink)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              cursor: 'pointer', fontFamily: 'var(--sans)',
              boxShadow: isToday && !selected ? '0 0 0 2px var(--accent)' : 'none',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{d.label}</span>
              <span style={{ fontSize: 10, opacity: selected ? 0.85 : 0.6 }}>{ativos}p</span>
            </button>
          );
        })}
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
          {diaFull} — {trabalhando.length} trabalhando
          {folgaEvento.length > 0 && <span style={{ color: '#d97706', marginLeft: 8 }}>· {folgaEvento.length} folga agendada</span>}
        </div>

        {trabalhando.length > 0 ? (
          <div style={{ marginBottom: 12 }}>
            {trabalhando.map(fn => {
              const turno = fn.escala?.[diaKey];
              return (
                <div key={fn.id} style={{
                  background: 'var(--card)', border: '1px solid var(--line)',
                  borderRadius: 14, padding: '14px', marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <Avatar fn={fn} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{fn.nome}</span>
                      <FuncaoBadge funcao={fn.funcao} />
                    </div>
                    <div style={{ marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-soft)', borderRadius: 8, padding: '4px 10px' }}>
                      <Icon name="clock" size={12} color="var(--accent)" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
                        {turno?.entrada} – {turno?.saida}
                      </span>
                    </div>
                  </div>
                  {podeEditar && (
                    <button onClick={() => goEditar(fn.id)} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', display: 'grid', placeItems: 'center', color: 'var(--ink-3)', cursor: 'pointer', flexShrink: 0 }}>
                      <Icon name="edit" size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px', marginBottom: 12, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
            Nenhum funcionário trabalha neste dia
          </div>
        )}

        {/* Folgas agendadas (eventos) */}
        {folgaEvento.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              🟡 Folga agendada
            </div>
            {folgaEvento.map(fn => {
              const ev = getFolgaEvento(fn, todayDateStr, eventos);
              const periodo = ev ? fmtPeriodo(ev) : null;
              return (
                <div key={fn.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 14px', marginBottom: 6 }}>
                  <Avatar fn={fn} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{fn.nome}</div>
                    <div style={{ fontSize: 12, color: '#92400e' }}>
                      {periodo ? `Período: ${periodo}` : 'Folga avulsa'}
                      {ev?.descricao ? ` · ${ev.descricao}` : ''}
                    </div>
                  </div>
                  {podeEditar && (
                    <button onClick={() => goEditar(fn.id)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #fde68a', background: 'transparent', display: 'grid', placeItems: 'center', color: '#92400e', cursor: 'pointer', flexShrink: 0 }}>
                      <Icon name="edit" size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Folgas de escala */}
        {folgaEscala.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>De folga (escala)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {folgaEscala.map(fn => (
                <div key={fn.id} onClick={podeEditar ? () => goEditar(fn.id) : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '7px 12px', opacity: 0.6, cursor: podeEditar ? 'pointer' : 'default' }}>
                  <Avatar fn={fn} size={24} />
                  <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{fn.nome.split(' ')[0]}</span>
                  {podeEditar && <Icon name="edit" size={11} color="var(--ink-3)" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grade resumida — mostra semana atual com status real */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Escala desta semana
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderBottom: '1px solid var(--line)', background: 'var(--soft)' }}>
              <div style={{ padding: '8px 10px' }} />
              {DIAS.map((d, idx) => {
                const date = currentWeekDates[idx];
                return (
                  <div key={d.key} style={{ padding: '6px 4px', textAlign: 'center', borderLeft: '1px solid var(--line)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: idx === diaFoco ? 'var(--accent)' : 'var(--ink-3)' }}>{d.label}</div>
                    <div style={{ fontSize: 9, color: 'var(--ink-3)', opacity: 0.7 }}>{pad2(date.getDate())}/{pad2(date.getMonth() + 1)}</div>
                  </div>
                );
              })}
            </div>
            {funcionarios.map((fn, fnIdx) => (
              <div key={fn.id} style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderBottom: fnIdx < funcionarios.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Avatar fn={fn} size={18} />
                  <span style={{ fontSize: 10, color: 'var(--ink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fn.nome.split(' ')[0]}
                  </span>
                </div>
                {DIAS.map((d, idx) => {
                  const dateStr = currentWeekDateStrs[idx];
                  const status = getStatusDia(fn, dateStr, eventos);
                  const turno = fn.escala?.[d.key];
                  return (
                    <div key={d.key} style={{
                      borderLeft: '1px solid var(--line)',
                      background: idx === diaFoco ? 'var(--accent-soft)' : status === 'folga_evento' ? '#fffbeb' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px 2px',
                    }}>
                      {status === 'trabalha' ? (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700, lineHeight: 1.3 }}>{turno?.entrada}</div>
                          <div style={{ fontSize: 9, color: 'var(--ink-3)', lineHeight: 1.3 }}>{turno?.saida}</div>
                        </div>
                      ) : status === 'folga_evento' ? (
                        <span style={{ fontSize: 9, color: '#d97706', fontWeight: 700 }}>🟡</span>
                      ) : (
                        <span style={{ fontSize: 13, opacity: 0.2 }}>–</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SEMANAL — carga de trabalho por semana (status real = escala + eventos)
// ─────────────────────────────────────────────────────────────
function SemanalView({ funcionarios, eventos, notas, setNotas, podeEditar }) {
  const [semOffset, setSemOffset] = useState(0);
  const weekDates = useMemo(() => getWeekDates(semOffset), [semOffset]);
  const hoje = toDateStr(new Date());

  const updateNota = (dateStr, value) =>
    setNotas(prev => ({ ...prev, [dateStr]: value }));

  const fmtDia = (date) => `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;

  const fmtSemana = () => {
    const ini = weekDates[0];
    const fim = weekDates[6];
    if (ini.getMonth() === fim.getMonth())
      return `${pad2(ini.getDate())}–${pad2(fim.getDate())} de ${MESES[ini.getMonth()]}`;
    return `${pad2(ini.getDate())} ${MESES[ini.getMonth()].slice(0,3)} – ${pad2(fim.getDate())} ${MESES[fim.getMonth()].slice(0,3)}`;
  };

  return (
    <div style={{ paddingBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
        <button onClick={() => setSemOffset(o => o - 1)} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--ink-2)', cursor: 'pointer', padding: '4px 8px' }}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{fmtSemana()}</div>
          {semOffset === 0
            ? <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Semana atual</div>
            : <button onClick={() => setSemOffset(0)} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--sans)', fontWeight: 600, padding: 0 }}>Voltar para hoje</button>
          }
        </div>
        <button onClick={() => setSemOffset(o => o + 1)} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--ink-2)', cursor: 'pointer', padding: '4px 8px' }}>›</button>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        {weekDates.map((date, idx) => {
          const dateStr = toDateStr(date);
          const nota = notas[dateStr] || '';
          const isHoje = dateStr === hoje;

          const trabalhando = funcionarios.filter(fn => getStatusDia(fn, dateStr, eventos) === 'trabalha');
          const folgaEv = funcionarios.filter(fn => getStatusDia(fn, dateStr, eventos) === 'folga_evento');
          const folgaEsc = funcionarios.filter(fn => getStatusDia(fn, dateStr, eventos) === 'folga_escala');

          return (
            <div key={dateStr} style={{
              background: 'var(--card)',
              border: `1px solid ${isHoje ? 'var(--accent)' : 'var(--line)'}`,
              borderRadius: 14, marginBottom: 10, overflow: 'hidden',
            }}>
              {/* Cabeçalho */}
              <div style={{ padding: '10px 14px', background: isHoje ? 'var(--accent-soft)' : 'var(--soft)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isHoje ? 'var(--accent)' : 'var(--ink)' }}>
                    {DIAS[idx].label} {fmtDia(date)}
                  </span>
                  {isHoje && <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginLeft: 8 }}>hoje</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {/* Avatares de quem trabalha */}
                  {trabalhando.slice(0, 3).map(fn => <Avatar key={fn.id} fn={fn} size={22} />)}
                  {folgaEv.length > 0 && <span style={{ fontSize: 11, color: '#d97706', fontWeight: 700 }}>🟡{folgaEv.length}</span>}
                  {trabalhando.length === 0 && folgaEv.length === 0 && (
                    <span style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic' }}>Todos de folga</span>
                  )}
                </div>
              </div>

              {/* Corpo */}
              <div style={{ padding: '10px 14px' }}>
                {/* Trabalhando */}
                {trabalhando.length > 0 && (
                  <div style={{ marginBottom: folgaEv.length > 0 || folgaEsc.length > 0 ? 8 : 0 }}>
                    {trabalhando.map(fn => {
                      const turno = fn.escala?.[DIAS[idx].key];
                      return (
                        <div key={fn.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Avatar fn={fn} size={28} />
                          <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, flex: 1 }}>{fn.nome.split(' ')[0]}</span>
                          <FuncaoBadge funcao={fn.funcao} size={10} />
                          {turno && (
                            <span style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                              {turno.entrada}–{turno.saida}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Folgas agendadas */}
                {folgaEv.length > 0 && (
                  <div style={{ borderTop: trabalhando.length > 0 ? '1px solid var(--line)' : 'none', paddingTop: trabalhando.length > 0 ? 8 : 0, marginBottom: folgaEsc.length > 0 ? 8 : 0 }}>
                    {folgaEv.map(fn => {
                      const ev = getFolgaEvento(fn, dateStr, eventos);
                      const periodo = ev ? fmtPeriodo(ev) : null;
                      return (
                        <div key={fn.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: '#fffbeb', borderRadius: 8, marginBottom: 4 }}>
                          <Avatar fn={fn} size={24} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>{fn.nome.split(' ')[0]}</span>
                            <span style={{ fontSize: 11, color: '#b45309', marginLeft: 6 }}>
                              {periodo ? `folga ${periodo}` : 'folga avulsa'}
                              {ev?.descricao ? ` · ${ev.descricao}` : ''}
                            </span>
                          </div>
                          <span style={{ fontSize: 14 }}>🟡</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Folgas de escala */}
                {folgaEsc.length > 0 && (
                  <div style={{ borderTop: (trabalhando.length > 0 || folgaEv.length > 0) ? '1px solid var(--line)' : 'none', paddingTop: (trabalhando.length > 0 || folgaEv.length > 0) ? 8 : 0, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {folgaEsc.map(fn => (
                      <div key={fn.id} style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: 0.5 }}>
                        <Avatar fn={fn} size={18} />
                        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{fn.nome.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notas */}
                <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                  {podeEditar ? (
                    <textarea
                      value={nota}
                      onChange={e => updateNota(dateStr, e.target.value)}
                      placeholder="Tarefas e observações do dia…"
                      style={{
                        width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none',
                        background: 'transparent', resize: 'vertical', minHeight: 44,
                        fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)', lineHeight: 1.5,
                      }}
                    />
                  ) : (
                    nota
                      ? <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{nota}</p>
                      : <span style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>Sem anotações</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MENSAL — calendário com folgas agendadas e feriados
// ─────────────────────────────────────────────────────────────
function MensalView({ funcionarios, eventos, addEvento, removeEvento, podeEditar }) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [diaSel, setDiaSel] = useState(null);
  const [novoTipo, setNovoTipo] = useState('feriado');
  const [novaDesc, setNovaDesc] = useState('');
  const [novoFnId, setNovoFnId] = useState('');
  const [numDias, setNumDias] = useState(1);

  const diasDoMes = useMemo(() => getMonthDays(ano, mes), [ano, mes]);
  const hojeStr = toDateStr(hoje);

  const dateStrDia = (dia) => `${ano}-${pad2(mes + 1)}-${pad2(dia)}`;

  const navMes = (delta) => {
    setMes(m => {
      const nm = m + delta;
      if (nm < 0) { setAno(a => a - 1); return 11; }
      if (nm > 11) { setAno(a => a + 1); return 0; }
      return nm;
    });
    setDiaSel(null);
  };

  // Eventos que cobrem um dia específico
  const evDosDia = (dia) => {
    const d = dateStrDia(dia);
    return getEventosDoDia(d, eventos);
  };

  const handleAdd = () => {
    if (novoTipo === 'feriado' && !novaDesc.trim()) return;
    if (novoTipo === 'folga' && !novoFnId) return;
    const dataInicio = dateStrDia(diaSel);
    const dataFim = numDias > 1 ? addDaysToStr(dataInicio, numDias - 1) : dataInicio;
    addEvento({
      tipo: novoTipo,
      data: dataInicio,
      dataFim,
      descricao: novoTipo === 'feriado' ? novaDesc.trim() : novaDesc.trim(),
      funcionarioId: novoTipo === 'folga' ? novoFnId : null,
    });
    setNovaDesc('');
    setNovoFnId('');
    setNumDias(1);
  };

  const selDateStr = diaSel ? dateStrDia(diaSel) : null;
  const selEventos = selDateStr ? getEventosDoDia(selDateStr, eventos) : [];

  const fmtDataFimDesc = () => {
    if (numDias <= 1) return null;
    const fim = addDaysToStr(dateStrDia(diaSel), numDias - 1);
    const [, m, d] = fim.split('-');
    return `até ${parseInt(d)}/${parseInt(m)}`;
  };

  const semanaHeader = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

  return (
    <div style={{ paddingBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
        <button onClick={() => navMes(-1)} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--ink-2)', cursor: 'pointer', padding: '4px 10px' }}>‹</button>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{MESES[mes]} {ano}</span>
        <button onClick={() => navMes(1)} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--ink-2)', cursor: 'pointer', padding: '4px 10px' }}>›</button>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        {/* Calendário */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--soft)', borderBottom: '1px solid var(--line)' }}>
            {semanaHeader.map(d => (
              <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {diasDoMes.map((dia, idx) => {
              if (!dia) return (
                <div key={`e${idx}`} style={{ borderTop: idx >= 7 ? '1px solid var(--line)' : 'none', borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--line)' : 'none', minHeight: 52 }} />
              );
              const ds = dateStrDia(dia);
              const ev = evDosDia(dia);
              const feriados = ev.filter(e => e.tipo === 'feriado');
              const folgasEv = ev.filter(e => e.tipo === 'folga');
              const isHoje = ds === hojeStr;
              const isSel = dia === diaSel;
              const isFim = idx % 7 >= 5;

              return (
                <div key={dia} onClick={() => setDiaSel(isSel ? null : dia)} style={{
                  padding: '6px 4px', minHeight: 52,
                  borderTop: idx >= 7 ? '1px solid var(--line)' : 'none',
                  borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--line)' : 'none',
                  background: isSel ? 'var(--accent-soft)' : isHoje ? '#f0fdf4' : 'transparent',
                  cursor: 'pointer',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 12, margin: '0 auto 3px',
                    background: isHoje ? 'var(--accent)' : isSel ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: isHoje || isSel ? 700 : isFim ? 600 : 400,
                    color: isHoje || isSel ? '#fff' : isFim ? '#64748b' : 'var(--ink)',
                  }}>
                    {dia}
                  </div>
                  {/* Indicadores */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    {feriados.length > 0 && <div style={{ width: 6, height: 6, borderRadius: 3, background: '#dc2626' }} />}
                    {folgasEv.length > 0 && (
                      folgasEv.length <= 2
                        ? folgasEv.map(fe => {
                            const fn = funcionarios.find(f => f.id === fe.funcionarioId);
                            return <div key={fe.id} style={{ width: 6, height: 6, borderRadius: 3, background: ROLE_COLORS[fn?.funcao] || '#f59e0b' }} />;
                          })
                        : <div style={{ fontSize: 9, fontWeight: 700, color: '#d97706' }}>{folgasEv.length}f</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legenda */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: '#dc2626' }} />
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Feriado</span>
          </div>
          {funcionarios.map(fn => (
            <div key={fn.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: ROLE_COLORS[fn.funcao] || '#888' }} />
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{fn.nome.split(' ')[0]}</span>
            </div>
          ))}
        </div>

        {/* Painel do dia selecionado */}
        {diaSel && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--accent)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '12px 14px', background: 'var(--accent-soft)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                {diaSel} de {MESES[mes]}
              </span>
              <button onClick={() => setDiaSel(null)} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--ink-3)', cursor: 'pointer', padding: 0 }}>×</button>
            </div>

            <div style={{ padding: '10px 14px' }}>
              {selEventos.length === 0 && !podeEditar && (
                <div style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>Sem eventos marcados</div>
              )}

              {/* Eventos existentes */}
              {selEventos.map(ev => {
                const fn = ev.funcionarioId ? funcionarios.find(f => f.id === ev.funcionarioId) : null;
                const periodo = fmtPeriodo(ev);
                return (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: ev.tipo === 'feriado' ? '#dc2626' : ROLE_COLORS[fn?.funcao] || '#f59e0b', marginTop: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        {ev.tipo === 'feriado'
                          ? ev.descricao || 'Feriado'
                          : `Folga: ${fn?.nome || 'Funcionário'}`}
                      </div>
                      {(periodo || ev.descricao) && (
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                          {periodo && <span>Período: {periodo}</span>}
                          {periodo && ev.descricao && ' · '}
                          {ev.tipo === 'folga' && ev.descricao && ev.descricao}
                        </div>
                      )}
                    </div>
                    {podeEditar && (
                      <button onClick={() => removeEvento(ev.id)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#dc2626', cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}>×</button>
                    )}
                  </div>
                );
              })}

              {/* Adicionar evento */}
              {podeEditar && (
                <div style={{ marginTop: selEventos.length > 0 ? 12 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Adicionar</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    {[{ v: 'feriado', l: '🔴 Feriado' }, { v: 'folga', l: '🟡 Folga' }].map(t => (
                      <button key={t.v} onClick={() => setNovoTipo(t.v)} style={{
                        flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${novoTipo === t.v ? 'var(--accent)' : 'var(--line)'}`,
                        background: novoTipo === t.v ? 'var(--accent-soft)' : 'var(--bg)',
                        color: novoTipo === t.v ? 'var(--accent)' : 'var(--ink-3)',
                        fontSize: 12, fontWeight: 600, fontFamily: 'var(--sans)',
                      }}>{t.l}</button>
                    ))}
                  </div>

                  {/* Funcionário (apenas para folga) */}
                  {novoTipo === 'folga' && (
                    <select
                      value={novoFnId}
                      onChange={e => setNovoFnId(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg)', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', marginBottom: 8 }}
                    >
                      <option value="">Selecionar funcionário…</option>
                      {funcionarios.map(fn => <option key={fn.id} value={fn.id}>{fn.nome} ({ROLE_LABELS[fn.funcao]})</option>)}
                    </select>
                  )}

                  {/* Descrição */}
                  <input
                    value={novaDesc}
                    onChange={e => setNovaDesc(e.target.value)}
                    placeholder={novoTipo === 'feriado' ? 'Nome do feriado (ex: Dia do Trabalho)' : 'Motivo (opcional)'}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg)', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', marginBottom: 8 }}
                  />

                  {/* Dias consecutivos */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, background: 'var(--soft)', borderRadius: 10, padding: '10px 12px' }}>
                    <Icon name="calendar" size={16} color="var(--ink-3)" />
                    <span style={{ fontSize: 13, color: 'var(--ink-2)', flex: 1 }}>Dias consecutivos</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => setNumDias(n => Math.max(1, n - 1))} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>−</button>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', minWidth: 24, textAlign: 'center' }}>{numDias}</span>
                      <button onClick={() => setNumDias(n => Math.min(31, n + 1))} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>+</button>
                    </div>
                  </div>
                  {numDias > 1 && (
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8, paddingLeft: 2 }}>
                      {diaSel} a {fmtDataFimDesc()} de {MESES[mes]}
                    </div>
                  )}

                  <button
                    onClick={handleAdd}
                    disabled={novoTipo === 'feriado' ? !novaDesc.trim() : !novoFnId}
                    style={{
                      width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                      background: (novoTipo === 'feriado' ? novaDesc.trim() : novoFnId) ? 'var(--accent)' : 'var(--soft)',
                      color: (novoTipo === 'feriado' ? novaDesc.trim() : novoFnId) ? '#fff' : 'var(--ink-3)',
                      fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)', cursor: 'pointer',
                    }}
                  >
                    Adicionar {numDias > 1 ? `(${numDias} dias)` : ''}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MINHA CONTA — configurações pessoais do usuário logado
// ─────────────────────────────────────────────────────────────
const ContaLabel = ({ t }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t}</div>
);

export function MinhaContaScreen({ currentUser, funcionarios, onSave, onLogout, setScreen }) {
  const fn = funcionarios.find(f => f.id === currentUser.id);

  const [nome, setNome] = useState(fn?.nome || currentUser.nome || '');
  const [login, setLogin] = useState(fn?.login || '');
  const [senha, setSenha] = useState(fn?.senha || '');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aniversario, setAniversario] = useState(fn?.aniversario || '');
  const [saved, setSaved] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const backScreen = currentUser.role === 'operacional' ? 'avisos' : 'home';

  const handleSave = () => {
    if (!nome.trim()) return;
    onSave({ nome: nome.trim(), login: login.trim().toLowerCase(), senha, aniversario });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12,
    border: '1px solid var(--line)', background: 'var(--card)',
    fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title="Minha conta" onBack={() => setScreen(backScreen)} />
      <div style={{ padding: '20px 16px 0' }}>

        {/* Avatar */}
        {fn && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 36,
              background: ROLE_COLORS[fn.funcao] || '#888', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700,
            }}>
              {nome.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('')}
            </div>
            <div style={{ marginTop: 10 }}>
              <FuncaoBadge funcao={fn.funcao} />
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <ContaLabel t="Nome" />
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <ContaLabel t="Data de aniversário" />
          <input type="date" value={aniversario} onChange={e => setAniversario(e.target.value)} style={inputStyle} />
        </div>

        {/* Acesso */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Acesso ao aplicativo
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4, fontWeight: 600 }}>Login</div>
              <input
                value={login}
                onChange={e => setLogin(e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="ex: carolina"
                style={{ ...inputStyle, padding: '10px 12px', fontSize: 14 }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4, fontWeight: 600 }}>Senha</div>
              <div style={{ position: 'relative' }}>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="Senha"
                  style={{ ...inputStyle, padding: '10px 36px 10px 12px', fontSize: 14 }}
                />
                <button onClick={() => setMostrarSenha(v => !v)} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--ink-3)', padding: 0,
                }}>
                  {mostrarSenha ? '🙈' : '👁'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!nome.trim()}
          style={{
            width: '100%', padding: '15px', borderRadius: 14, border: 'none',
            background: saved ? '#16a34a' : nome.trim() ? 'var(--accent)' : 'var(--soft)',
            color: nome.trim() ? '#fff' : 'var(--ink-3)',
            fontSize: 16, fontWeight: 700, fontFamily: 'var(--sans)',
            cursor: nome.trim() ? 'pointer' : 'default', marginBottom: 12,
            transition: 'background 0.2s',
          }}
        >
          {saved ? '✓ Salvo!' : 'Salvar alterações'}
        </button>

        <button
          onClick={() => { if (!confirmLogout) { setConfirmLogout(true); return; } onLogout(); }}
          onBlur={() => setTimeout(() => setConfirmLogout(false), 200)}
          style={{
            width: '100%', padding: '13px', borderRadius: 14,
            border: `1px solid ${confirmLogout ? '#dc2626' : 'var(--line)'}`,
            background: confirmLogout ? '#fef2f2' : 'transparent',
            color: confirmLogout ? '#dc2626' : 'var(--ink-3)',
            fontSize: 14, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer',
          }}
        >
          {confirmLogout ? '⚠️ Confirmar saída' : 'Sair da conta'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PLANNER principal com sub-tabs
// ─────────────────────────────────────────────────────────────
export function PlannerScreen({ setScreen, setSelected, funcionarios, currentUser, notas, setNotas, eventos, addEvento, removeEvento }) {
  const podeEditar = currentUser?.role === 'admin' || currentUser?.role === 'vet';
  const isOperacional = currentUser?.role === 'operacional';
  const [subTab, setSubTab] = useState('escala');

  // Admin não aparece na escala — apenas vets e operacional
  const fnEscala = funcionarios.filter(fn => fn.funcao !== 'admin');

  const goEditar = (id) => { setSelected(id); setScreen('funcionarioDetalhe'); };
  const goNovo = () => { setSelected(null); setScreen('funcionarioDetalhe'); };

  return (
    <div style={{ paddingBottom: 90 }}>
      <TopBar
        title="Equipe"
        subtitle={`${fnEscala.length} na escala`}
        onBack={isOperacional ? undefined : () => setScreen('home')}
        action={podeEditar && subTab === 'escala' ? (
          <button onClick={goNovo} style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--accent)', display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer' }}>
            <Icon name="plus" size={18} color="#fff" />
          </button>
        ) : null}
      />

      <SubTabBar
        tabs={[{ id: 'escala', label: 'Escala' }, { id: 'semanal', label: 'Semanal' }, { id: 'mensal', label: 'Mensal' }]}
        active={subTab}
        onChange={setSubTab}
      />

      {subTab === 'escala' && (
        <EscalaView funcionarios={fnEscala} eventos={eventos} podeEditar={podeEditar} goEditar={goEditar} goNovo={goNovo} />
      )}
      {subTab === 'semanal' && (
        <SemanalView funcionarios={fnEscala} eventos={eventos} notas={notas} setNotas={setNotas} podeEditar={podeEditar} />
      )}
      {subTab === 'mensal' && (
        <MensalView funcionarios={fnEscala} eventos={eventos} addEvento={addEvento} removeEvento={removeEvento} podeEditar={podeEditar} />
      )}
    </div>
  );
}
