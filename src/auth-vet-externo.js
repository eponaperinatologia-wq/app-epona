// auth-vet-externo.js — RPCs de auth do vet do Epona Repro Team.
// Espelho fiel do auth-proprietario.js — senha em bcrypt via pgcrypto.
import { supabase } from './utils/supabase';

// Admin cria/reseta credencial. Marca senha_provisoria=true → força troca no 1º login.
export async function criarCredencialVetExterno(vetId, login, senha) {
  const { error } = await supabase.rpc('criar_credencial_vet_externo', {
    p_id: vetId,
    p_login: login,
    p_senha: senha,
  });
  if (error) throw new Error(error.message);
}

// Retorna { id, login, nome, cor, senhaProvisoria } se senha bater; null se não.
export async function loginVetExterno(login, senha) {
  const { data, error } = await supabase.rpc('verify_senha_vet_externo', {
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
    cor: row.cor || '#7c2d8c',
    senhaProvisoria: !!row.senha_provisoria,
  };
}

// Vet troca a própria senha. Exige a antiga.
export async function trocarSenhaVetExterno(login, senhaAntiga, senhaNova) {
  const { data, error } = await supabase.rpc('trocar_senha_vet_externo', {
    p_login: login,
    p_senha_antiga: senhaAntiga,
    p_senha_nova: senhaNova,
  });
  if (error) throw new Error(error.message);
  return !!data;
}
