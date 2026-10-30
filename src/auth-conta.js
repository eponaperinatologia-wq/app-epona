// auth-conta.js — Login de verdade (Supabase Auth) para equipe, Repro Team
// e proprietários.
//
// Cada pessoa tem uma conta no Auth com um e-mail técnico que ninguém digita:
// a equipe usa o id do funcionário (escolhe o nome na lista) e Repro /
// proprietário usam o login. A senha é conferida no servidor e a tabela
// `acessos` diz quem é quem — as regras do banco (RLS) usam isso para
// decidir o que cada conta pode ler e gravar.
import { createClient } from '@supabase/supabase-js';
import { supabase } from './utils/supabase';

const DOMINIO = 'epona.invalid'; // domínio reservado: nunca recebe e-mail

export function emailDoLogin(tipo, login) {
  let s = String(login || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]+$/.test(s)) {
    s = 'h' + Array.from(new TextEncoder().encode(s)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return `${s}@${tipo}.${DOMINIO}`;
}

const _ehErroDeCredencial = (error) =>
  error?.code === 'invalid_credentials' || /invalid login credentials/i.test(error?.message || '');

export function traduzErroAuth(error) {
  const msg = String(error?.message || error || '');
  const code = error?.code || '';
  if (_ehErroDeCredencial(error)) return 'Login ou senha incorretos';
  if (code === 'weak_password' || /at least 6 characters|password should be/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres';
  if (code === 'same_password' || /different from the old password/i.test(msg)) return 'A nova senha precisa ser diferente da atual';
  if (/rate limit|too many|security purposes/i.test(msg) || code === 'over_request_rate_limit') return 'Muitas tentativas. Aguarde alguns minutos e tente de novo';
  if (/failed to fetch|load failed|networkerror|network request failed/i.test(msg)) return 'Sem conexão com o servidor';
  return msg || 'Erro no login';
}

// Monta o usuário do app a partir do que o SERVIDOR diz (RPC meu_acesso) —
// nunca do que está guardado no aparelho.
export function montarUsuario(a) {
  const iniciais = String(a.nome || '').split(/\s+/).map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const base = { id: a.id, nome: a.nome, role: a.role, iniciais };
  if (a.tipo === 'repro') {
    return { ...base, login: a.login, cor: a.cor || '#7c2d8c', senhaProvisoria: !!a.senhaProvisoria };
  }
  if (a.tipo === 'proprietario') {
    return {
      ...base, login: a.login,
      senhaProvisoria: !!a.senhaProvisoria,
      cadastroCompleto: !!a.cadastroCompleto,
      contratoStatus: a.contratoStatus || 'pendente',
    };
  }
  return base;
}

// Quem é a conta logada agora. null = conta sem acesso (ou removido).
export async function carregarMeuAcesso() {
  const { data, error } = await supabase.rpc('meu_acesso');
  if (error) throw new Error(error.message);
  return data ? { tipo: data.tipo, usuario: montarUsuario(data) } : null;
}

// Entra e devolve o usuário do app; null se login/senha não conferem
// (ou se a conta não é do perfil escolhido na tela).
export async function entrar(tipo, login, senha) {
  const { error } = await supabase.auth.signInWithPassword({ email: emailDoLogin(tipo, login), password: senha });
  if (error) {
    if (_ehErroDeCredencial(error)) return null;
    throw new Error(traduzErroAuth(error));
  }
  const acesso = await carregarMeuAcesso();
  if (!acesso || acesso.tipo !== tipo) {
    await supabase.auth.signOut({ scope: 'local' });
    return null;
  }
  return acesso.usuario;
}

// Nomes da equipe para a tela de login (sem senha nenhuma).
export async function listaEquipe() {
  const { data, error } = await supabase.rpc('lista_equipe_login');
  if (error) throw new Error(traduzErroAuth(error));
  return (data || []).map(f => ({
    id: f.id, nome: f.nome, role: f.funcao,
    iniciais: String(f.nome || '').split(/\s+/).map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase(),
  }));
}

// Admin cria/reseta a senha de alguém (Edge Function gerenciar-acesso).
// Proprietário e Repro ficam com senha provisória (trocam no 1º acesso).
export async function definirSenhaAcesso({ tipo, refId, login, senha }) {
  const { data, error } = await supabase.functions.invoke('gerenciar-acesso', {
    body: { acao: 'definir_senha', tipo, refId, login, senha },
  });
  if (error) {
    let msg = error.message;
    try {
      const corpo = await error.context?.json?.();
      if (corpo?.error) msg = corpo.error;
    } catch { /* corpo não era JSON */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

// Troca a senha da conta logada conferindo a atual — numa conexão à parte,
// para não mexer na sessão em uso. Retorna false se a atual não confere.
export async function trocarSenhaConferindo(tipo, login, senhaAtual, senhaNova) {
  const verificador = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: 'epona-verifica-senha' },
  });
  const { data: conferida, error: erroConferir } = await verificador.auth.signInWithPassword({
    email: emailDoLogin(tipo, login), password: senhaAtual,
  });
  if (erroConferir) {
    if (_ehErroDeCredencial(erroConferir)) return false;
    throw new Error(traduzErroAuth(erroConferir));
  }
  const { data: { user } } = await supabase.auth.getUser();
  await verificador.auth.signOut({ scope: 'local' }).catch(() => {});
  if (!user || conferida?.user?.id !== user.id) return false;
  await trocarMinhaSenha(senhaNova);
  const { error } = await supabase.rpc('marcar_senha_definitiva');
  if (error) throw new Error(error.message);
  return true;
}

// Troca a senha da conta logada (sem conferir a atual — tela "Minha conta").
export async function trocarMinhaSenha(senhaNova) {
  const { error } = await supabase.auth.updateUser({ password: senhaNova });
  if (error) throw new Error(traduzErroAuth(error));
}

// Gate "complete seu cadastro" — grava só os campos permitidos da própria linha.
export async function completarCadastroProprietario(dados) {
  const { error } = await supabase.rpc('completar_cadastro_proprietario', { dados });
  if (error) throw new Error(error.message);
}

// Base do custo fixo rateado da fatura em aberto (ver dados_rateio_proprietario).
export async function carregarDadosRateio() {
  const { data, error } = await supabase.rpc('dados_rateio_proprietario');
  if (error) throw new Error(error.message);
  return data || { custos: [], cavalos: [], movimentacoes: [] };
}

// Token da sessão atual (para chamar /api e Edge Functions com fetch).
export async function tokenAtual() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}
