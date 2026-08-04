// proprietario-onboarding.jsx — Gates de 1º acesso do proprietário.
//
// Design anti-loop:
//   - Cada gate é um componente auto-contido; nenhum useEffect faz redirect.
//   - O App renderiza um único gate por vez baseado em if/else lineares.
//   - Ao concluir cada etapa, o gate chama onComplete(patch) — o App atualiza
//     currentUser e o próximo render escolhe o próximo gate.
//   - Não há setScreen dentro dos gates: eles são mutuamente exclusivos.
import React, { useState, useEffect, useRef } from 'react';
import { trocarSenhaProprietario } from './auth-proprietario';
import { supabase } from './utils/supabase';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';

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
      // Também atualiza a senha em memória (usada pelas Edge Functions).
      onComplete({ senhaProvisoria: false, _sessionPassword: nova });
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
    nacionalidade: p.nacionalidade || 'Brasileira',
    estadoCivil: p.estadoCivil || '',
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
    const obrigatorios = { nomeCompleto: 'nome completo', cpf: 'CPF', rg: 'RG', profissao: 'profissão', nacionalidade: 'nacionalidade', estadoCivil: 'estado civil', cep: 'CEP', rua: 'rua', numero: 'número', bairro: 'bairro', cidade: 'cidade', estado: 'estado', email: 'email', telefone: 'telefone' };
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Nacionalidade"><input value={form.nacionalidade} onChange={e => set('nacionalidade', e.target.value)} style={inputStyle} placeholder="Brasileira" /></Field>
        <Field label="Estado civil">
          <select value={form.estadoCivil} onChange={e => set('estadoCivil', e.target.value)} style={{ ...inputStyle, appearance: 'auto' }}>
            <option value="">Selecionar…</option>
            <option value="Solteiro(a)">Solteiro(a)</option>
            <option value="Casado(a)">Casado(a)</option>
            <option value="Divorciado(a)">Divorciado(a)</option>
            <option value="Viúvo(a)">Viúvo(a)</option>
            <option value="União estável">União estável</option>
          </select>
        </Field>
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
// GATE 3 — Assinatura do contrato (Assinafy embed)
// ─────────────────────────────────────────────────────────────
// Fluxo:
//   1. Ao montar, chama Edge Function assinafy-criar-assinatura que gera
//      (ou reaproveita) o documento e devolve signing_url.
//   2. Renderiza o signing_url num iframe.
//   3. Enquanto o iframe está aberto, poll a cada 4s no proprietario_status:
//      quando o webhook chegar e mudar pra 'assinado', o gate avança.
//
// Segurança:
//   - Autenticação é feita pela senha em memória (_sessionPassword). Nunca
//     enviamos senha por localStorage nem em query string.
//   - Toda comunicação com Assinafy passa pela Edge Function; a API key
//     nunca chega ao cliente.

export function AssinaturaContratoScreen({ currentUser, proprietarioAtual, onComplete, onLogout }) {
  const p = proprietarioAtual || {};
  const [signingUrl, setSigningUrl] = useState(p.contratoUrl || null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const pollRef = useRef(null);

  // Cria/recupera o signing_url quando a tela abre.
  useEffect(() => {
    let cancelado = false;
    async function preparar() {
      setCarregando(true);
      setErro('');
      try {
        const senha = currentUser?._sessionPassword;
        if (!senha) {
          setErro('Sessão expirada. Faça login novamente para assinar o contrato.');
          return;
        }
        const res = await fetch(`${SUPABASE_URL}/functions/v1/assinafy-criar-assinatura`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY || ''}`,
          },
          body: JSON.stringify({ proprietarioId: currentUser.id, senha }),
        });
        const data = await res.json();
        if (cancelado) return;
        if (data.status === 'assinado') {
          onComplete({ contratoStatus: 'assinado', contratoAssinadoEm: new Date().toISOString() });
          return;
        }
        if (!res.ok || !data.signing_url) {
          setErro(data.error || 'Não foi possível gerar o contrato. Fale com o administrador.');
          return;
        }
        setSigningUrl(data.signing_url);
      } catch (e) {
        if (!cancelado) setErro('Erro de conexão. Tente novamente em instantes.');
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    preparar();
    return () => { cancelado = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll: verifica no banco se o webhook do Assinafy já chegou e marcou como
  // assinado. Roda a cada 4s enquanto o iframe está aberto. Interrompe
  // sozinho quando detecta assinatura.
  useEffect(() => {
    if (!signingUrl) return;
    const checar = async () => {
      const { data } = await supabase
        .from('proprietarios')
        .select('contrato_status, contrato_assinado_em')
        .eq('id', currentUser.id)
        .maybeSingle();
      if (data?.contrato_status === 'assinado') {
        clearInterval(pollRef.current);
        onComplete({ contratoStatus: 'assinado', contratoAssinadoEm: data.contrato_assinado_em || new Date().toISOString() });
      }
    };
    pollRef.current = setInterval(checar, 4000);
    return () => clearInterval(pollRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signingUrl]);

  // Botão "Já assinei" força uma checagem imediata (caso o webhook demore).
  const checarAgora = async () => {
    const { data } = await supabase
      .from('proprietarios')
      .select('contrato_status, contrato_assinado_em')
      .eq('id', currentUser.id)
      .maybeSingle();
    if (data?.contrato_status === 'assinado') {
      onComplete({ contratoStatus: 'assinado', contratoAssinadoEm: data.contrato_assinado_em || new Date().toISOString() });
    } else {
      setErro('Ainda não recebemos a confirmação. Aguarde alguns segundos.');
      setTimeout(() => setErro(''), 4000);
    }
  };

  return (
    <Frame
      title="Assinatura do contrato"
      subtitle="Última etapa: assine o contrato de prestação de serviços."
      onLogout={onLogout}
    >
      <div style={{
        background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
        padding: 16, marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, fontWeight: 700 }}>Contratante</div>
        <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 600 }}>{p.nomeCompleto || p.nome}</div>
        {p.cpf && <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>CPF {p.cpf}</div>}
        {p.email && <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{p.email}</div>}
      </div>

      {carregando && (
        <div style={{
          background: 'var(--soft)', border: '1px dashed var(--line)', borderRadius: 14,
          padding: '30px 20px', textAlign: 'center', marginBottom: 14, fontSize: 13, color: 'var(--ink-3)',
        }}>Preparando seu contrato…</div>
      )}

      {!carregando && erro && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12,
          padding: '12px 14px', marginBottom: 14, fontSize: 13, color: '#b91c1c',
        }}>{erro}</div>
      )}

      {!carregando && signingUrl && (
        <>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14,
            overflow: 'hidden', marginBottom: 12,
          }}>
            <iframe
              src={signingUrl}
              title="Assinatura do contrato"
              style={{ width: '100%', height: 620, border: 'none', display: 'block' }}
              allow="camera; microphone; geolocation"
            />
          </div>
          <button onClick={checarAgora} style={{
            width: '100%', background: '#7c2d8c', color: '#fff',
            border: 'none', borderRadius: 14, padding: '13px',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)',
          }}>Já assinei — verificar agora</button>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', marginTop: 10 }}>
            Quando você concluir a assinatura, o app libera automaticamente.
          </div>
        </>
      )}
    </Frame>
  );
}
