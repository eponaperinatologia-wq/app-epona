// auth-proprietario.js — Chamadas às RPCs de auth do proprietário.
// A senha nunca sai daqui em texto puro depois de gravada: o servidor faz
// bcrypt e devolve apenas dados públicos.
import { supabase } from './utils/supabase';

// Admin cria/reseta credencial de um proprietário. Marca senha como
// provisória — obriga troca no 1º acesso.
export async function criarCredencialProprietario(proprietarioId, login, senha) {
  const { error } = await supabase.rpc('criar_credencial_proprietario', {
    p_id: proprietarioId,
    p_login: login,
    p_senha: senha,
  });
  if (error) throw new Error(error.message);
}

// Retorna { id, login, nome, senhaProvisoria, cadastroCompleto, contratoStatus }
// se a senha bater; null se não bater.
export async function loginProprietario(login, senha) {
  const { data, error } = await supabase.rpc('verify_senha_proprietario', {
    p_login: login,
    p_senha: senha,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    id: row.id,
    login: row.login,
    nome: row.nome,
    senhaProvisoria: !!row.senha_provisoria,
    cadastroCompleto: !!row.cadastro_completo,
    contratoStatus: row.contrato_status || 'pendente',
  };
}

// Proprietário troca a própria senha. Exige a antiga. Retorna true/false.
export async function trocarSenhaProprietario(login, senhaAntiga, senhaNova) {
  const { data, error } = await supabase.rpc('trocar_senha_proprietario', {
    p_login: login,
    p_senha_antiga: senhaAntiga,
    p_senha_nova: senhaNova,
  });
  if (error) throw new Error(error.message);
  return !!data;
}
