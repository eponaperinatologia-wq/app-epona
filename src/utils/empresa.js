const KEY = 'epona_empresa';

const DEFAULT = {
  nome: 'Haras Epona',
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
