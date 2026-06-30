const KEY = 'epona_empresa';

const DEFAULT = {
  nome: 'Epona Stud',
  cnpj: '',
  endereco: '',
  cidade: '',
  email: '',
  telefone: '',
  pix: '',
  banco: '',
};

export const getEmpresa = () => {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULT };
  }
};

export const saveEmpresa = (data) => {
  localStorage.setItem(KEY, JSON.stringify({ ...DEFAULT, ...data }));
};

// Identifica o proprietário "próprio" (= o haras) pelo nome casando com
// o nome cadastrado em Dados da Empresa. Comparação tolerante (trim + lower).
const _norm = (s) => (s || '').trim().toLowerCase();
export const isProprietarioProprio = (prop, empresa) => {
  const e = empresa || getEmpresa();
  if (!prop?.nome || !e?.nome) return false;
  return _norm(prop.nome) === _norm(e.nome);
};
export const getProprietarioProprioId = (proprietarios = [], empresa) => {
  const e = empresa || getEmpresa();
  const found = proprietarios.find(p => isProprietarioProprio(p, e));
  return found?.id || null;
};
