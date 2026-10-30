// auth-vet-externo.js — Acesso do vet do Epona Repro Team.
// Espelho do auth-proprietario.js — senha conferida no Supabase Auth.
import { entrar, definirSenhaAcesso, trocarSenhaConferindo } from './auth-conta';

// Admin cria/reseta credencial. Senha provisória → força troca no 1º login.
export async function criarCredencialVetExterno(vetId, login, senha) {
  await definirSenhaAcesso({ tipo: 'repro', refId: vetId, login, senha });
}

// Retorna o usuário do app (id, nome, login, cor, senhaProvisoria) se a
// senha bater; null se não.
export async function loginVetExterno(login, senha) {
  return entrar('repro', login, senha);
}

// Vet troca a própria senha. Exige a antiga.
export async function trocarSenhaVetExterno(login, senhaAntiga, senhaNova) {
  return trocarSenhaConferindo('repro', login, senhaAntiga, senhaNova);
}
