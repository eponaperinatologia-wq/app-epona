// proprietario-onboarding.jsx — Gates de 1º acesso do proprietário.
//
// Design anti-loop:
//   - Cada gate é um componente auto-contido; nenhum useEffect faz redirect.
//   - O App renderiza um único gate por vez baseado em if/else lineares.
//   - Ao concluir cada etapa, o gate chama onComplete(patch) — o App atualiza
//     currentUser e o próximo render escolhe o próximo gate.
//   - Não há setScreen dentro dos gates: eles são mutuamente exclusivos.
import React, { useState } from 'react';
import { trocarSenhaProprietario } from './auth-proprietario';

// ─────────────────────────────────────────────────────────────
// Layout compartilhado
// ─────────────────────────────────────────────────────────────
const Frame = ({ title, subtitle, children, onLogout }) => (
  <div style={{
    minHeight: '100%', background: 'var(--bg)',
    padding: '32px 20px 40px', display: 'flex', flexDirection: 'column',
  }}>
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{subtitle}</div>}
    </div>
    <div style={{ flex: 1 }}>{children}</div>
    {onLogout && (
      <button onClick={onLogout} style={{
        marginTop: 20, background: 'none', border: 'none', color: 'var(--ink-3)',
        fontSize: 12, cursor: 'pointer', fontFamily: 'var(--sans)',
      }}>Sair</button>
    )}
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, fontWeight: 700 }}>{label}</div>
    {children}
  </div>
);

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 12,
  border: '1px solid var(--line)', background: 'var(--card)',
  fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
};

// ─────────────────────────────────────────────────────────────
// GATE 1 — Troca de senha obrigatória
// ─────────────────────────────────────────────────────────────
export function TrocarSenhaScreen({ currentUser, onComplete, onLogout }) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [conf, setConf] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setErro('');
    if (nova.length < 6) { setErro('Nova senha deve ter no mínimo 6 caracteres'); return; }
    if (nova !== conf) { setErro('Nova senha e confirmação não conferem'); return; }
    if (nova === atual) { setErro('A nova senha precisa ser diferente da atual'); return; }
    setLoading(true);
    try {
      const ok = await trocarSenhaProprietario(currentUser.login, atual, nova);
      if (!ok) { setErro('Senha atual incorreta'); return; }
      // Avança o gate: senhaProvisoria vira false. Nenhum redirect —
      // o App re-renderiza e o próximo if do gate assume.
      onComplete({ senhaProvisoria: false });
    } catch (e) {
      setErro(e.message || 'Erro ao trocar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Frame
      title="Criar sua senha"
      subtitle={`Bem-vindo(a), ${currentUser.nome}. Por segurança, defina uma senha nova antes de continuar.`}
      onLogout={onLogout}
    >
      <Field label="Senha atual (a que você recebeu)">
        <input type="password" value={atual} onChange={e => { setAtual(e.target.value); setErro(''); }} style={inputStyle} autoFocus />
      </Field>
      <Field label="Nova senha (mín. 6 caracteres)">
        <input type="password" value={nova} onChange={e => { setNova(e.target.value); setErro(''); }} style={inputStyle} />
      </Field>
      <Field label="Confirmar nova senha">
        <input type="password" value={conf} onChange={e => { setConf(e.target.value); setErro(''); }} style={inputStyle} onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()} />
      </Field>
      {erro && <div style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{erro}</div>}
      <button onClick={handleSubmit} disabled={loading} style={{
        width: '100%', background: '#7c2d8c', color: '#fff',
        border: 'none', borderRadius: 14, padding: '15px',
        fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
        fontFamily: 'var(--sans)', opacity: loading ? 0.6 : 1,
      }}>{loading ? 'Salvando…' : 'Definir nova senha'}</button>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────
// GATE 2 — Cadastro completo (dados pessoais + endereço)
// ─────────────────────────────────────────────────────────────

// Máscaras simples
const maskCpf = (v) => (v || '').replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
const maskCep = (v) => (v || '').replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
const maskTel = (v) => {
  const d = (v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d)/, '($1) $2-$3');
  return d.replace(/(\d{2})(\d{5})(\d)/, '($1) $2-$3');
};

// Consulta ViaCEP — auto-preenche rua/bairro/cidade/estado. Silencioso em erro.
async function buscarCep(cep) {
  const digits = (cep || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!r.ok) return null;
    const d = await r.json();
    if (d.erro) return null;
    return { rua: d.logradouro || '', bairro: d.bairro || '', cidade: d.localidade || '', estado: d.uf || '' };
  } catch { return null; }
}

export function CadastroCompletoScreen({ currentUser, proprietarioAtual, onComplete, onLogout }) {
  const p = proprietarioAtual || {};
  const [form, setForm] = useState({
    nomeCompleto: p.nomeCompleto || p.nome || '',
    rg: p.rg || '',
    cpf: p.cpf || '',
    profissao: p.profissao || '',
    email: p.email || '',
    telefone: p.telefone || '',
    cep: p.cep || '', rua: p.rua || '', numero: p.numero || '',
    complemento: p.complemento || '', bairro: p.bairro || '',
    cidade: p.cidade || '', estado: p.estado || '',
  });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onCepBlur = async () => {
    const info = await buscarCep(form.cep);
    if (info) setForm(f => ({ ...f, ...info }));
  };

  const handleSubmit = async () => {
    setErro('');
    const obrigatorios = { nomeCompleto: 'nome completo', cpf: 'CPF', rg: 'RG', profissao: 'profissão', cep: 'CEP', rua: 'rua', numero: 'número', bairro: 'bairro', cidade: 'cidade', estado: 'estado', email: 'email', telefone: 'telefone' };
    for (const [k, label] of Object.entries(obrigatorios)) {
      if (!String(form[k] || '').trim()) { setErro(`Preencha ${label}`); return; }
    }
    setLoading(true);
    try {
      await onComplete({ ...form, cadastroCompleto: true });
    } catch (e) {
      setErro(e.message || 'Erro ao salvar cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Frame
      title="Complete seu cadastro"
      subtitle="Precisamos desses dados para gerar o contrato."
      onLogout={onLogout}
    >
      <Field label="Nome completo">
        <input value={form.nomeCompleto} onChange={e => set('nomeCompleto', e.target.value)} style={inputStyle} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="CPF"><input value={form.cpf} onChange={e => set('cpf', maskCpf(e.target.value))} style={inputStyle} placeholder="000.000.000-00" /></Field>
        <Field label="RG"><input value={form.rg} onChange={e => set('rg', e.target.value)} style={inputStyle} /></Field>
      </div>
      <Field label="Profissão">
        <input value={form.profissao} onChange={e => set('profissao', e.target.value)} style={inputStyle} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Email"><input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} /></Field>
        <Field label="Telefone"><input value={form.telefone} onChange={e => set('telefone', maskTel(e.target.value))} style={inputStyle} placeholder="(11) 99999-9999" /></Field>
      </div>

      <div style={{ marginTop: 18, marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Endereço</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
        <Field label="CEP"><input value={form.cep} onChange={e => set('cep', maskCep(e.target.value))} onBlur={onCepBlur} style={inputStyle} placeholder="00000-000" /></Field>
        <Field label="Rua"><input value={form.rua} onChange={e => set('rua', e.target.value)} style={inputStyle} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
        <Field label="Número"><input value={form.numero} onChange={e => set('numero', e.target.value)} style={inputStyle} /></Field>
        <Field label="Complemento"><input value={form.complemento} onChange={e => set('complemento', e.target.value)} style={inputStyle} placeholder="(opcional)" /></Field>
      </div>
      <Field label="Bairro"><input value={form.bairro} onChange={e => set('bairro', e.target.value)} style={inputStyle} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
        <Field label="Cidade"><input value={form.cidade} onChange={e => set('cidade', e.target.value)} style={inputStyle} /></Field>
        <Field label="Estado"><input value={form.estado} onChange={e => set('estado', e.target.value.toUpperCase().slice(0, 2))} style={inputStyle} placeholder="UF" /></Field>
      </div>

      {erro && <div style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{erro}</div>}
      <button onClick={handleSubmit} disabled={loading} style={{
        width: '100%', background: '#7c2d8c', color: '#fff',
        border: 'none', borderRadius: 14, padding: '15px', marginTop: 10,
        fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
        fontFamily: 'var(--sans)', opacity: loading ? 0.6 : 1,
      }}>{loading ? 'Salvando…' : 'Salvar e ir para o contrato'}</button>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────
// GATE 3 — Assinatura do contrato (Assinafy)
// ─────────────────────────────────────────────────────────────
// Placeholder até a integração real com o Assinafy chegar.
// Estrutura pronta pra plugar:
//   1. Um efeito/handler cria o documento na Assinafy com os dados do
//      proprietário e recebe url + document_id.
//   2. Iframe renderiza a url de assinatura embed.
//   3. Webhook do Assinafy avisa que assinou → marca contratoStatus='assinado'.
// Por enquanto: mostra info do contrato e um botão dev "Marcar como assinado".
export function AssinaturaContratoScreen({ currentUser, proprietarioAtual, onComplete, onLogout }) {
  const p = proprietarioAtual || {};
  const [loading, setLoading] = useState(false);

  const marcarComoAssinado = async () => {
    setLoading(true);
    try {
      await onComplete({
        contratoStatus: 'assinado',
        contratoAssinadoEm: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Frame
      title="Assinatura do contrato"
      subtitle="Última etapa: assinar o contrato de prestação de serviços."
      onLogout={onLogout}
    >
      <div style={{
        background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
        padding: 20, marginBottom: 18,
      }}>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, fontWeight: 700 }}>Contratante</div>
        <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 600 }}>{p.nomeCompleto || p.nome}</div>
        {p.cpf && <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>CPF {p.cpf}</div>}
        {p.email && <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{p.email}</div>}
      </div>

      {/* Placeholder do embed Assinafy — trocar por iframe da URL de assinatura */}
      <div style={{
        background: 'var(--soft)', border: '2px dashed var(--line)', borderRadius: 14,
        padding: '40px 20px', textAlign: 'center', marginBottom: 18,
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>
          Contrato em preparação
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          A integração com o Assinafy será habilitada aqui.<br />
          Quando ativada, o contrato aparecerá abaixo para assinatura direta no app.
        </div>
      </div>

      <div style={{
        background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 12,
        padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#92400e',
      }}>
        <strong>Modo desenvolvimento:</strong> botão abaixo simula assinatura para testar o fluxo. Remover quando Assinafy estiver ativo.
      </div>

      <button onClick={marcarComoAssinado} disabled={loading} style={{
        width: '100%', background: '#7c2d8c', color: '#fff',
        border: 'none', borderRadius: 14, padding: '15px',
        fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
        fontFamily: 'var(--sans)', opacity: loading ? 0.6 : 1,
      }}>{loading ? 'Registrando…' : 'Marcar contrato como assinado (dev)'}</button>
    </Frame>
  );
}
