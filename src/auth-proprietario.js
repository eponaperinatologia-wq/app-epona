// auth-proprietario.js — Acesso do proprietário. A senha é conferida no
// servidor (Supabase Auth, ver auth-conta.js); nada de senha fica no app.
import { entrar, definirSenhaAcesso, trocarSenhaConferindo } from './auth-conta';

// Admin cria/reseta credencial de um proprietário. Marca senha como
// provisória — obriga troca no 1º acesso.
export async function criarCredencialProprietario(proprietarioId, login, senha) {
  await definirSenhaAcesso({ tipo: 'proprietario', refId: proprietarioId, login, senha });
}

// Retorna o usuário do app (id, nome, login, flags dos gates) se a senha
// bater; null se não bater.
export async function loginProprietario(login, senha) {
  return entrar('proprietario', login, senha);
}

// Proprietário troca a própria senha. Exige a antiga. Retorna true/false.
export async function trocarSenhaProprietario(login, senhaAntiga, senhaNova) {
  return trocarSenhaConferindo('proprietario', login, senhaAntiga, senhaNova);
}
