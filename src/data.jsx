// data.jsx — Dados reais do Haras Epona

const CATEGORIAS_CAVALO = ['Potro ao pé', 'Potro', 'Jovem', 'Adulto', 'Castrado', 'Garanhão', 'Matriz', 'Doadora', 'Receptora', 'Gestante'];

const PROPRIETARIOS = [
  { id: 'p1',  nome: 'Adriana Striolli',                   telefone: '+55 (13) 99711-2340', email: '', cavalos: ['c1','c2','c3'] },
  { id: 'p2',  nome: 'Alessandro Alvarez',                  telefone: '+55 (13) 99205-5109', email: '', cavalos: ['c4'] },
  { id: 'p3',  nome: 'Andre Lolo',                          telefone: '+55 (11) 97311-4543', email: '', cavalos: ['c5'] },
  { id: 'p4',  nome: 'Ariane Oda',                          telefone: '+55 (11) 99177-3564', email: '', cavalos: ['c6','c7','c8','c9'] },
  { id: 'p5',  nome: 'Barbara Souza',                       telefone: '+1 (646) 787-5425',   email: '', cavalos: ['c10','c11'] },
  { id: 'p6',  nome: 'Carlos Asmuz',                        telefone: '+55 (11) 99336-6363', email: '', cavalos: ['c12','c13','c14'] },
  { id: 'p7',  nome: 'Claudio Luis de Melo Pereira',        telefone: '+55 (11) 98149-0886', email: '', cavalos: ['c15','c16'] },
  { id: 'p8',  nome: 'Cristina Herszkovicz',                telefone: '+55 (11) 99142-8018', email: '', cavalos: ['c17'] },
  { id: 'p9',  nome: 'Daniela Ogawa',                       telefone: '+55 (11) 98962-9764', email: '', cavalos: ['c18'] },
  { id: 'p10', nome: 'Epona Stud',                          telefone: '+55 (11) 94164-2151', email: '', cavalos: ['c19','c20','c21','c22','c23','c24','c25','c26','c27','c28','c29','c30','c31','c32','c33','c34','c35','c36','c37','c38','c39','c40','c41','c42'] },
  { id: 'p11', nome: 'Esdra Ramos',                         telefone: '',                    email: '', cavalos: ['c35','c36'] },
  { id: 'p12', nome: 'Gabriel Vilella',                     telefone: '',                    email: '', cavalos: ['c37','c38','c39','c40'] },
  { id: 'p13', nome: 'Haras Sant\'Anna',                    telefone: '',                    email: '', cavalos: ['c41'] },
  { id: 'p14', nome: 'Leonardo Falseti',                    telefone: '+55 (11) 99993-3662', email: '', cavalos: ['c42','c63'] },
  { id: 'p15', nome: 'Fernando Costa',                      telefone: '+55 (11) 94970-0767', email: '', cavalos: ['c43','c44','c45'] },
  { id: 'p16', nome: 'Geraldo Lamounier',                   telefone: '+55 (11) 97611-3617', email: '', cavalos: ['c46','c47'] },
  { id: 'p17', nome: 'Giovanna Zamith',                     telefone: '+55 (11) 97541-6154', email: '', cavalos: ['c48'] },
  { id: 'p18', nome: 'Guilherme',                           telefone: '',                    email: '', cavalos: ['c49','c50','c51'] },
  { id: 'p19', nome: 'Alexandre',                           telefone: '',                    email: '', cavalos: ['c49','c50','c51'] },
  { id: 'p20', nome: 'Felipe',                              telefone: '',                    email: '', cavalos: ['c49','c50','c51'] },
  { id: 'p21', nome: 'Americo',                             telefone: '',                    email: '', cavalos: ['c49','c50','c51'] },
  { id: 'p22', nome: 'Helena Galli',                        telefone: '+55 (11) 97129-9055', email: '', cavalos: ['c52','c53'] },
  { id: 'p23', nome: 'Isabela Piovesan',                    telefone: '+55 (11) 97271-1337', email: '', cavalos: ['c54'] },
  { id: 'p24', nome: 'João Markun',                         telefone: '+55 (11) 97456-9556', email: '', cavalos: ['c55'] },
  { id: 'p25', nome: 'Julia Aguiar',                        telefone: '+55 (11) 96072-1183', email: '', cavalos: ['c56'] },
  { id: 'p26', nome: 'Júlia Freire',                        telefone: '+55 (85) 98874-8043', email: '', cavalos: ['c57'] },
  { id: 'p27', nome: 'Kalvin Sevilha',                      telefone: '+55 (11) 97121-6061', email: '', cavalos: ['c58','c59'] },
  { id: 'p28', nome: 'Laila Borin',                         telefone: '+55 (11) 93806-5972', email: '', cavalos: ['c60'] },
  { id: 'p29', nome: 'Leandro Dávila',                      telefone: '+55 (11) 98714-0014', email: '', cavalos: ['c61','c62'] },
  { id: 'p30', nome: 'Leonardo Vani',                       telefone: '+55 (11) 99169-4770', email: '', cavalos: ['c64'] },
  { id: 'p31', nome: 'Leticia Barrio',                      telefone: '+55 (13) 99128-1566', email: '', cavalos: ['c65'] },
  { id: 'p32', nome: 'Luiza Tranchesi',                     telefone: '+55 (11) 97233-2627', email: '', cavalos: ['c66','c67','c68'] },
  { id: 'p33', nome: 'Mario Cia',                           telefone: '+55 (11) 99801-9791', email: '', cavalos: ['c69','c70','c71','c72','c73','c74','c75','c76','c77','c78','c79','c80','c81','c82','c83','c84','c85','c86','c87','c88','c89','c90','c91','c92','c93','c94','c95','c96','c97','c98','c99'] },
  { id: 'p34', nome: 'Michelle Fauvel',                     telefone: '+55 (16) 99328-2000', email: '', cavalos: ['c100','c101','c102'] },
  { id: 'p35', nome: 'Mirene',                              telefone: '+55 (13) 99715-3020', email: '', cavalos: ['c103','c104'] },
  { id: 'p36', nome: 'Moises',                              telefone: '+55 (16) 99112-5401', email: '', cavalos: ['c105'] },
  { id: 'p37', nome: 'Paulo Miranda',                       telefone: '+55 (81) 98116-0317', email: '', cavalos: ['c106'] },
  { id: 'p38', nome: 'Selina Ceu',                          telefone: '+55 (11) 91639-2818', email: '', cavalos: ['c107'] },
  { id: 'p39', nome: 'Thiago Duarte',                       telefone: '+55 (11) 99400-6175', email: '', cavalos: ['c108','c109'] },
  { id: 'p40', nome: 'Victoria Mendes',                     telefone: '+55 (11) 99593-4996', email: '', cavalos: ['c110'] },
  { id: 'p41', nome: 'Victoria Pizzonia',                   telefone: '+55 (11) 99545-2401', email: '', cavalos: ['c111'] },
  { id: 'p42', nome: 'Vitor Dantas',                        telefone: '+55 (11) 98753-3204', email: '', cavalos: ['c112'] },
  { id: 'p43', nome: 'Wilson Lopes',                        telefone: '+55 (51) 99830-8555', email: '', cavalos: ['c113','c114'] },
  { id: 'p44', nome: 'Yasmin Omais',                        telefone: '+55 (67) 99262-5682', email: '', cavalos: ['c115'] },
];

const NUTRICAO_VAZIO = { racaoId: '', racaoKgManha: 0, racaoKgTarde: 0, racaoKgDia: 0, comeAlmoco: false, racaoKgAlmoco: 0, oleoMlDia: 0, oleoMlManha: 0, oleoMlTarde: 0, salKromiumGManha: 0, salKromiumGTarde: 0, fenoKgDia: 0, suplementos: [], racaoBlock: { manha: false, tarde: false } };

const CAVALOS = [
  { id: 'c1',   nome: 'Wheeny Jhenny',            pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p1'],  baia: '', piquete: '', mensalidade: 1950, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c2',   nome: 'Dientara PS',               pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p1'],  baia: '', piquete: '', mensalidade: 1950, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c3',   nome: 'WB 007 Joana Bond',         pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p1'],  baia: '', piquete: '', mensalidade: 1950, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c4',   nome: 'CER Olinda',                pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p2'],  baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c5',   nome: 'ASL My Bet',                pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p3'],  baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c6',   nome: '1149 Olímpica',             pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p4'],  baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c7',   nome: 'NN Olímpica',               pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p4'],  baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c8',   nome: 'Cornélio',                  pelagem: '', sexo: 'M', categoria: '', nascimento: '', proprietarioIds: ['p4'],  baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c9',   nome: 'Grandorina',                pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p4'],  baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c10',  nome: 'Diamond Dash',              pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p5'],  baia: '', piquete: '', mensalidade: 1650, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c11',  nome: 'BMS Cashback',              pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p5'],  baia: '', piquete: '', mensalidade: 1650, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c12',  nome: '1186 Raiz',                 pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p6'],  baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c13',  nome: 'NN Raiz',                   pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p6'],  baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c14',  nome: '1501 Juma',                 pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p6'],  baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c15',  nome: 'Hassina Climber',           pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p7'],  baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c16',  nome: 'NN Hassina',                pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p7'],  baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c17',  nome: '554 Dagoberta',             pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p8'],  baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c18',  nome: 'Caliandra JMEN',            pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p9'],  baia: '', piquete: '', mensalidade: 1650, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c19',  nome: 'Carina',                    pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c20',  nome: 'Mafe HCruz',               pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c21',  nome: 'Tilly Pepper',              pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c22',  nome: '1390 Maravilha',            pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c23',  nome: 'Epona Altamira KS',         pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c24',  nome: "Komme L'Only",              pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c25',  nome: 'Contagious Bless',          pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c26',  nome: 'Epona Dalí HOS',            pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c27',  nome: 'Curly Girl JMEN',           pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c28',  nome: 'Balduino',                  pelagem: '', sexo: 'M', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c29',  nome: 'Embaixador',                pelagem: '', sexo: 'M', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c30',  nome: 'Maximus',                   pelagem: '', sexo: 'M', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c31',  nome: 'Khan',                      pelagem: '', sexo: 'M', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c32',  nome: 'Lady Angus',                pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c33',  nome: 'Cádia JMEN',               pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c34',  nome: '1276 Rainha',               pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c35',  nome: '936 Stanley',               pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 1650, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c36',  nome: 'NN Stanley',                pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c37',  nome: '1389 Nala',                 pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c38',  nome: 'NN Nala',                   pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c39',  nome: '845 Goiânia',               pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c40',  nome: 'NN Goiânia',                pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c41',  nome: 'Gloria C17',                pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c42',  nome: 'LF7 Epona Emenem',          pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p10'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c43',  nome: '1225 Jaspe',                pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p15'], baia: '', piquete: '', mensalidade: 1650, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c44',  nome: 'NN Jaspe',                  pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p15'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c45',  nome: 'WB 017 Caroline',           pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p15'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c46',  nome: 'Chaparral',                 pelagem: '', sexo: 'M', categoria: '', nascimento: '', proprietarioIds: ['p16'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c47',  nome: 'Coreolan',                  pelagem: '', sexo: 'M', categoria: '', nascimento: '', proprietarioIds: ['p16'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c48',  nome: '1107 Francine',             pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p17'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c49',  nome: 'Epona Zillion',             pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p18'], baia: '', piquete: '', mensalidade: 1650, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c50',  nome: 'Prima Cru VD Vikf Eiken',   pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p18','p19','p20','p21'], baia: '', piquete: '', mensalidade: 1650, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c51',  nome: 'Djalu',                     pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p18'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c52',  nome: '1356 Marte',                pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p22'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c53',  nome: '1474 Laranja',              pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p22'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c54',  nome: 'GTI 3',                     pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p23'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c55',  nome: '912 Kharla',                pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p24'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c56',  nome: 'Diamantita',                pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p25'], baia: '', piquete: '', mensalidade: 1650, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c57',  nome: '1327 Liberdade',            pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p26'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c58',  nome: 'Miss Heart Breaker',        pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p27'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c59',  nome: 'WB 018 Alexandra',          pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p27'], baia: '', piquete: '', mensalidade: 1250, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c60',  nome: 'Xinta 3K',                  pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p28'], baia: '', piquete: '', mensalidade: 1650, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c61',  nome: '67 Murphy',                 pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p29'], baia: '', piquete: '', mensalidade: 1250, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c62',  nome: 'NN Murphy',                 pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p29'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c63',  nome: 'LF7 Condino',              pelagem: '', sexo: 'M', categoria: '', nascimento: '', proprietarioIds: ['p14'], baia: '', piquete: '', mensalidade: 800,  obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c64',  nome: 'Baixinha',                  pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p30'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c65',  nome: 'Salvatore',                 pelagem: '', sexo: 'M', categoria: '', nascimento: '', proprietarioIds: ['p31'], baia: '', piquete: '', mensalidade: 1650, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c66',  nome: '1188 Cocada',               pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p32'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c67',  nome: '938 Jacobina',              pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p32'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c68',  nome: 'Moon River',                pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p32'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c69',  nome: '1429 Brilhante',            pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c70',  nome: 'Dolce Speranza MCIA',       pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c71',  nome: '1393 Framboesa',            pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c72',  nome: 'High Energy MCIA',          pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c73',  nome: '1028 Glória',               pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c74',  nome: 'Celine MCIA',               pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c75',  nome: '1067 Cruela',               pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c76',  nome: 'Camaro',                    pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c77',  nome: 'Aysha das Araucarias',      pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c78',  nome: 'Willy Wonka',               pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c79',  nome: 'Britinei',                  pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c80',  nome: 'NN Britinei',               pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c81',  nome: '690 Araçoiaba',             pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c82',  nome: 'NN Araçoiaba',              pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c83',  nome: '1373 Samambaia',            pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c84',  nome: 'Calli MCIA',                pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c85',  nome: '978 Cebola',                pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c86',  nome: 'NN Cebola',                 pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c87',  nome: 'Capuccino 01',              pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c88',  nome: 'Majestic 04',               pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c89',  nome: 'Dinamite MCIA',             pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c90',  nome: 'Cartina Van Het Oosthof',   pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c91',  nome: 'Purple Haze MCIA',          pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c92',  nome: 'Excalibur MCIA',            pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c93',  nome: 'Eleanor MCIA',              pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c94',  nome: 'Emeri Lady MCIA',           pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c95',  nome: 'Big Power MCIA',            pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c96',  nome: 'Eminem MCIA',               pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c97',  nome: 'Emirates MCIA',             pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c98',  nome: 'Ettore MCIA',               pelagem: '', sexo: 'M', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1000, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c99',  nome: '972 Katy Perry',            pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p33'], baia: '', piquete: '', mensalidade: 1650, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c100', nome: 'Farra GP',                  pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p34'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c101', nome: 'HLF Conrad',                pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p34'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c102', nome: "D'Extra",                   pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p34'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c103', nome: '811 Vizinha',               pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p35'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c104', nome: 'NN Vizinha',                pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p35'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c105', nome: 'Odin Van Homer',            pelagem: '', sexo: 'M', categoria: '', nascimento: '', proprietarioIds: ['p36'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c106', nome: 'Marieta',                   pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p37'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c107', nome: 'Ioio',                      pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p38'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c108', nome: 'Esperanza RCLI',            pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p39'], baia: '', piquete: '', mensalidade: 1500, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c109', nome: 'After Stark',               pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p39'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c110', nome: 'Dinken VBM',                pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p40'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c111', nome: 'Aurum',                     pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p41'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c112', nome: 'AG Bocker',                 pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p42'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c113', nome: '686 Cabeçote',              pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p43'], baia: '', piquete: '', mensalidade: 1650, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c114', nome: 'NN Cabeçote',               pelagem: '', sexo: '',  categoria: '', nascimento: '', proprietarioIds: ['p43'], baia: '', piquete: '', mensalidade: 0,    obs: '', nutricao: { ...NUTRICAO_VAZIO } },
  { id: 'c115', nome: 'Lady Dior',                 pelagem: '', sexo: 'F', categoria: '', nascimento: '', proprietarioIds: ['p44'], baia: '', piquete: '', mensalidade: 1800, obs: '', nutricao: { ...NUTRICAO_VAZIO } },
];

const TAXA_INJETAVEL = 3.50;

const CATEGORIAS_INSUMOS = [
  { id: 'nutricao_base', nome: 'Nutrição Base', cor: '#92400e', incluidoMensalidade: true },
  { id: 'racao',         nome: 'Ração',         cor: '#a16207', incluidoMensalidade: true },
  { id: 'suplemento',    nome: 'Suplemento',    cor: '#7c2d12' },
  { id: 'oleo',          nome: 'Óleo',          cor: '#b45309' },
  { id: 'medicamento',   nome: 'Medicamento',   cor: '#991b1b' },
  { id: 'vacina',        nome: 'Vacina',        cor: '#0f766e' },
  { id: 'vermifugo',     nome: 'Vermífugo',     cor: '#15803d' },
  { id: 'descartavel',   nome: 'Descartável',   cor: '#4b5563' },
];

const CATEGORIAS_SERVICOS = [
  { id: 'veterinario', nome: 'Veterinário', cor: '#0f766e' },
  { id: 'transporte',  nome: 'Transporte',  cor: '#1e40af' },
  { id: 'exames',      nome: 'Exames Laboratoriais', cor: '#7c3aed' },
];

const SERVICOS = [
  { id: 'sv1',  nome: 'Assistência ao Parto',   valor: 780.00,  categoria: 'veterinario', descartaveisObrigatorios: [] },
  { id: 'sv2',  nome: 'Coleta de Embrião +',    valor: 200.00,  categoria: 'veterinario', descartaveisObrigatorios: [] },
  { id: 'sv3',  nome: 'Coleta de Embrião -',    valor: 145.00,  categoria: 'veterinario', descartaveisObrigatorios: [] },
  { id: 'sv4',  nome: 'Coleta de Sangue',       valor: 4.50,    categoria: 'veterinario', descartaveisObrigatorios: [] },
  { id: 'sv5',  nome: 'GTA',                    valor: 80.00,   categoria: 'veterinario', descartaveisObrigatorios: [] },
  { id: 'sv6',  nome: 'Inseminação Artificial', valor: 150.00,  categoria: 'veterinario', descartaveisObrigatorios: [] },
  { id: 'sv7',  nome: 'Inspeção ABCCH',         valor: 350.00,  categoria: 'veterinario', descartaveisObrigatorios: [] },
  { id: 'sv8',  nome: 'Ozonioterapia',          valor: 180.00,  categoria: 'veterinario', descartaveisObrigatorios: [] },
  { id: 'sv9',  nome: 'Coleta para Exames Laboratoriais', valor: 15.00,  categoria: 'exames', descartaveisObrigatorios: [{ insumoId: 'i_seringa', qtd: 1 }, { insumoId: 'i_agulha', qtd: 1 }, { insumoId: 'i_algodao', qtd: 1 }] },
];

const DESCARTAVEIS_INJETAVEL = [
  { insumoId: 'i_seringa', qtd: 1 },
  { insumoId: 'i_agulha',  qtd: 1 },
  { insumoId: 'i_algodao', qtd: 1 },
];

const INSUMOS = [
  // Rações
  { id: 'i1',          nome: 'ProHorse 15',               categoria: 'racao',       unidade: 'kg',        fornecedor: '', valorCompra: 2.80,  markup: 0, valorVenda: 2.80,  injetavel: false, descartaveis: [] },
  { id: 'i2',          nome: 'Potros Prime 19',           categoria: 'racao',       unidade: 'kg',        fornecedor: '', valorCompra: 4.40,  markup: 0, valorVenda: 4.40,  injetavel: false, descartaveis: [] },
  { id: 'i3',          nome: 'Potromilk Crescimento',     categoria: 'racao',       unidade: 'g',         fornecedor: '', valorCompra: 0.07,  markup: 0, valorVenda: 0.07,  injetavel: false, descartaveis: [] },
  // Óleos (i_oleo MUST keep this ID — hardcoded in helpers)
  { id: 'i_oleo',      nome: 'Óleo de Soja',              categoria: 'oleo',        unidade: 'ml',        fornecedor: '', valorCompra: 0.012, markup: 0, valorVenda: 0.012, injetavel: false, descartaveis: [] },
  { id: 'i_linhaca',   nome: 'Óleo de Linhaça',           categoria: 'oleo',        unidade: 'ml',        fornecedor: '', valorCompra: 0.04,  markup: 0, valorVenda: 0.04,  injetavel: false, descartaveis: [] },
  // Suplementos diários
  { id: 'i_agrosil',   nome: 'Agrosil',                   categoria: 'suplemento',  unidade: 'frasco',    fornecedor: '', valorCompra: 26.80, markup: 0, valorVenda: 26.80, injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'i_aminomix',  nome: 'Aminomix Potros',           categoria: 'suplemento',  unidade: 'g',         fornecedor: '', valorCompra: 0.19,  markup: 0, valorVenda: 0.19,  injetavel: false, descartaveis: [] },
  { id: 'i_botumix',   nome: 'Botumix Revitalize',        categoria: 'suplemento',  unidade: 'ml',        fornecedor: '', valorCompra: 0.20,  markup: 0, valorVenda: 0.20,  injetavel: false, descartaveis: [] },
  { id: 'i_ese',       nome: 'E-S-E',                     categoria: 'suplemento',  unidade: 'g',         fornecedor: '', valorCompra: 0.79,  markup: 0, valorVenda: 0.79,  injetavel: false, descartaveis: [] },
  { id: 'i_equiup',    nome: 'Equi Up M.O.',              categoria: 'suplemento',  unidade: 'un',        fornecedor: '', valorCompra: 25.00, markup: 0, valorVenda: 25.00, injetavel: false, descartaveis: [] },
  { id: 'i_glicopan',  nome: 'Glicopan',                  categoria: 'suplemento',  unidade: 'ml',        fornecedor: '', valorCompra: 0.175, markup: 0, valorVenda: 0.175, injetavel: false, descartaveis: [] },
  { id: 'i_hertavita', nome: 'Hertavita',                  categoria: 'suplemento',  unidade: 'ml',        fornecedor: '', valorCompra: 0.09,  markup: 0, valorVenda: 0.09,  injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'i_hydro',     nome: 'Hydro Collagen',            categoria: 'suplemento',  unidade: 'g',         fornecedor: '', valorCompra: 0.33,  markup: 0, valorVenda: 0.33,  injetavel: false, descartaveis: [] },
  { id: 'i_megabase',  nome: 'Megabase Junior',           categoria: 'suplemento',  unidade: 'ml',        fornecedor: '', valorCompra: 0.29,  markup: 0, valorVenda: 0.29,  injetavel: false, descartaveis: [] },
  { id: 'i_new_algas', nome: 'New Algas',                 categoria: 'suplemento',  unidade: 'g',         fornecedor: '', valorCompra: 0.05,  markup: 0, valorVenda: 0.05,  injetavel: false, descartaveis: [] },
  { id: 'i_organew',   nome: 'Organew',                   categoria: 'suplemento',  unidade: 'g',         fornecedor: '', valorCompra: 0.07,  markup: 0, valorVenda: 0.07,  injetavel: false, descartaveis: [] },
  { id: 'i_promun',    nome: 'Promun Equi',               categoria: 'suplemento',  unidade: 'g',         fornecedor: '', valorCompra: 0.30,  markup: 0, valorVenda: 0.30,  injetavel: false, descartaveis: [] },
  { id: 'i_redcell',   nome: 'RedCell',                   categoria: 'suplemento',  unidade: 'ml',        fornecedor: '', valorCompra: 0.20,  markup: 0, valorVenda: 0.20,  injetavel: false, descartaveis: [] },
  { id: 'i_sal',       nome: 'SAL KROMIUM PROTEICO',      categoria: 'suplemento',  unidade: 'g',         fornecedor: '', valorCompra: 0.0044,  markup: 0, valorVenda: 0.0044,  injetavel: false, descartaveis: [] },
  { id: 'i_simequi',   nome: 'Sim Equi',                  categoria: 'suplemento',  unidade: 'ml',        fornecedor: '', valorCompra: 1.00,  markup: 0, valorVenda: 1.00,  injetavel: false, descartaveis: [] },
  // Medicamentos
  { id: 'im1',  nome: 'Ácido Acetilsalicílico (Sachê)', categoria: 'medicamento', unidade: 'sachê',     fornecedor: '', valorCompra: 4.00,   markup: 0, valorVenda: 4.00,   injetavel: false, descartaveis: [] },
  { id: 'im2',  nome: 'Adapt Holding HA',               categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 78.00,  markup: 0, valorVenda: 78.00,  injetavel: false, descartaveis: [] },
  { id: 'im3',  nome: 'Álcool 70',                      categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 0.02,   markup: 0, valorVenda: 0.02,   injetavel: false, descartaveis: [] },
  { id: 'im4',  nome: 'Aliv V',                         categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 1.00,   markup: 0, valorVenda: 1.00,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im5',  nome: 'Amicacina 500mg',                categoria: 'medicamento', unidade: 'ampola',    fornecedor: '', valorCompra: 12.00,  markup: 0, valorVenda: 12.00,  injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im6',  nome: 'Anequim Plus',                   categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 21.00,  markup: 0, valorVenda: 21.00,  injetavel: false, descartaveis: [] },
  { id: 'im7',  nome: 'Antitetânica Vencosat',          categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 21.00,  markup: 0, valorVenda: 21.00,  injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im8',  nome: 'Assistência ao Parto',           categoria: 'veterinario', unidade: 'un',        fornecedor: '', valorCompra: 780.00, markup: 0, valorVenda: 780.00, injetavel: false, descartaveis: [] },
  { id: 'im9',  nome: 'Azium',                          categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 2.50,   markup: 0, valorVenda: 2.50,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im10', nome: 'Botumix Neonato 43gr',           categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 42.50,  markup: 0, valorVenda: 42.50,  injetavel: false, descartaveis: [] },
  { id: 'im11', nome: 'Botukiller',                     categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 52.00,  markup: 0, valorVenda: 52.00,  injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im12', nome: 'Buscofin Composto',              categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 2.80,   markup: 0, valorVenda: 2.80,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im13', nome: 'Calfoz',                         categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 0.08,   markup: 0, valorVenda: 0.08,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im14', nome: 'Catofos B12',                    categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 1.00,   markup: 0, valorVenda: 1.00,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im15', nome: 'Chorulon',                       categoria: 'medicamento', unidade: 'dose',      fornecedor: '', valorCompra: 82.00,  markup: 0, valorVenda: 82.00,  injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im16', nome: 'Ciosin',                         categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 6.50,   markup: 0, valorVenda: 6.50,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im17', nome: 'Coleta de Embrião +',            categoria: 'veterinario', unidade: 'un',        fornecedor: '', valorCompra: 200.00, markup: 0, valorVenda: 200.00, injetavel: false, descartaveis: [] },
  { id: 'im18', nome: 'Coleta de Embrião -',            categoria: 'veterinario', unidade: 'un',        fornecedor: '', valorCompra: 145.00, markup: 0, valorVenda: 145.00, injetavel: false, descartaveis: [] },
  { id: 'im19', nome: 'Coleta de Sangue',               categoria: 'veterinario', unidade: 'un',        fornecedor: '', valorCompra: 4.50,   markup: 0, valorVenda: 4.50,   injetavel: false, descartaveis: [] },
  { id: 'im20', nome: 'Colostro',                       categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 180.00, markup: 0, valorVenda: 180.00, injetavel: false, descartaveis: [] },
  { id: 'im21', nome: 'Cortvet',                        categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 0.75,   markup: 0, valorVenda: 0.75,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im22', nome: 'Detomidina',                     categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 22.00,  markup: 0, valorVenda: 22.00,  injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im23', nome: 'Diuzon',                         categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 2.25,   markup: 0, valorVenda: 2.25,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im24', nome: 'DM Gel',                         categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 11.50,  markup: 0, valorVenda: 11.50,  injetavel: false, descartaveis: [] },
  { id: 'im25', nome: 'E.G.H',                          categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 2.50,   markup: 0, valorVenda: 2.50,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im26', nome: 'Equest',                         categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 49.00,  markup: 0, valorVenda: 49.00,  injetavel: false, descartaveis: [] },
  { id: 'im27', nome: 'Equest Pramox',                  categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 56.00,  markup: 0, valorVenda: 56.00,  injetavel: false, descartaveis: [] },
  { id: 'im28', nome: 'Eqvalan Gold',                   categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 39.00,  markup: 0, valorVenda: 39.00,  injetavel: false, descartaveis: [] },
  { id: 'im29', nome: 'Fenzol',                         categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 23.00,  markup: 0, valorVenda: 23.00,  injetavel: false, descartaveis: [] },
  { id: 'im30', nome: 'Firovet Pasta Oral',             categoria: 'medicamento', unidade: 'dose',      fornecedor: '', valorCompra: 9.00,   markup: 0, valorVenda: 9.00,   injetavel: false, descartaveis: [] },
  { id: 'im31', nome: 'Flumax',                         categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 1.50,   markup: 0, valorVenda: 1.50,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im32', nome: 'Fluvac EHV4/1',                  categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 51.00,  markup: 0, valorVenda: 51.00,  injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im33', nome: 'Fluvac EWT',                     categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 56.00,  markup: 0, valorVenda: 56.00,  injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im34', nome: 'Garrotilho',                     categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 3.20,   markup: 0, valorVenda: 3.20,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im35', nome: 'GTA',                            categoria: 'veterinario', unidade: 'un',        fornecedor: '', valorCompra: 80.00,  markup: 0, valorVenda: 80.00,  injetavel: false, descartaveis: [] },
  { id: 'im36', nome: 'Herpes Horse',                   categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 42.00,  markup: 0, valorVenda: 42.00,  injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im37', nome: 'Implante de progesterona',       categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 25.00,  markup: 0, valorVenda: 25.00,  injetavel: false, descartaveis: [] },
  { id: 'im38', nome: 'Inseminação Artificial',         categoria: 'veterinario', unidade: 'un',        fornecedor: '', valorCompra: 150.00, markup: 0, valorVenda: 150.00, injetavel: false, descartaveis: [] },
  { id: 'im39', nome: 'Inspeção ABCCH',                 categoria: 'veterinario', unidade: 'un',        fornecedor: '', valorCompra: 350.00, markup: 0, valorVenda: 350.00, injetavel: false, descartaveis: [] },
  { id: 'im40', nome: 'Lactobac Bisnaga',               categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 18.00,  markup: 0, valorVenda: 18.00,  injetavel: false, descartaveis: [] },
  { id: 'im41', nome: 'Lepto Equus',                    categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 21.00,  markup: 0, valorVenda: 21.00,  injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im42', nome: 'Lexington Gold',                 categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 65.00,  markup: 0, valorVenda: 65.00,  injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im43', nome: 'Lidocaína Humana',               categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 0,      markup: 0, valorVenda: 0,      injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im44', nome: 'Maxicam Injetável 2%',           categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 2.46,   markup: 0, valorVenda: 2.46,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im45', nome: 'Melagrião',                      categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 0.30,   markup: 0, valorVenda: 0.30,   injetavel: false, descartaveis: [] },
  { id: 'im46', nome: 'Mercepton',                      categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 0.50,   markup: 0, valorVenda: 0.50,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im47', nome: 'Minoxel 8g',                     categoria: 'medicamento', unidade: 'frasco',    fornecedor: '', valorCompra: 160.00, markup: 0, valorVenda: 160.00, injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im48', nome: 'Motoboy',                        categoria: 'transporte',  unidade: 'un',        fornecedor: '', valorCompra: 1.00,   markup: 0, valorVenda: 1.00,   injetavel: false, descartaveis: [] },
  { id: 'im49', nome: 'Neocidine',                      categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 0.06,   markup: 0, valorVenda: 0.06,   injetavel: false, descartaveis: [] },
  { id: 'im50', nome: 'Ocitocina',                      categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 0.25,   markup: 0, valorVenda: 0.25,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im51', nome: 'Ozonioterapia',                  categoria: 'veterinario', unidade: 'un',        fornecedor: '', valorCompra: 180.00, markup: 0, valorVenda: 180.00, injetavel: false, descartaveis: [] },
  { id: 'im52', nome: 'P4-300 (Progesterona)',          categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 3.25,   markup: 0, valorVenda: 3.25,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im53', nome: 'Phosfo Enema',                   categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 25.00,  markup: 0, valorVenda: 25.00,  injetavel: false, descartaveis: [] },
  { id: 'im54', nome: 'Piraverme',                      categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 26.00,  markup: 0, valorVenda: 26.00,  injetavel: false, descartaveis: [] },
  { id: 'im55', nome: 'Plasma Hiperimune Gamma Immunogenics', categoria: 'medicamento', unidade: 'un', fornecedor: '', valorCompra: 420.00, markup: 0, valorVenda: 420.00, injetavel: true, descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im56', nome: 'Plasil',                         categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 4.50,   markup: 0, valorVenda: 4.50,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im57', nome: 'Pneumoabort K®',                 categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 95.00,  markup: 0, valorVenda: 95.00,  injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im58', nome: 'Prevcox',                        categoria: 'medicamento', unidade: 'comprimido', fornecedor: '', valorCompra: 20.00, markup: 0, valorVenda: 20.00,  injetavel: false, descartaveis: [] },
  { id: 'im59', nome: 'Pro-Sacc Bisnaga',               categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 40.00,  markup: 0, valorVenda: 40.00,  injetavel: false, descartaveis: [] },
  { id: 'im60', nome: 'Proverme',                       categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 11.50,  markup: 0, valorVenda: 11.50,  injetavel: false, descartaveis: [] },
  { id: 'im61', nome: 'Pulmonil',                       categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 0.50,   markup: 0, valorVenda: 0.50,   injetavel: false, descartaveis: [] },
  { id: 'im62', nome: 'Rabmune',                        categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 0.80,   markup: 0, valorVenda: 0.80,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im63', nome: 'Raiva',                          categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 10.00,  markup: 0, valorVenda: 10.00,  injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im64', nome: 'Rhodovac-G',                     categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 10.00,  markup: 0, valorVenda: 10.00,  injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im65', nome: 'Rifotrat',                       categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 25.00,  markup: 0, valorVenda: 25.00,  injetavel: false, descartaveis: [] },
  { id: 'im66', nome: 'Ringer Lactato',                 categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 14.00,  markup: 0, valorVenda: 14.00,  injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im67', nome: 'Riodeine Degermante',            categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 0.06,   markup: 0, valorVenda: 0.06,   injetavel: false, descartaveis: [] },
  { id: 'im68', nome: 'Ripercol',                       categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 0,      markup: 0, valorVenda: 0,      injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im69', nome: 'Sedacol',                        categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 0.25,   markup: 0, valorVenda: 0.25,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im70', nome: 'Sincrorrelin',                   categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 150.00, markup: 0, valorVenda: 150.00, injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im71', nome: 'Strelin',                        categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 18.00,  markup: 0, valorVenda: 18.00,  injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im72', nome: 'Sucralfato',                     categoria: 'medicamento', unidade: 'flaconete', fornecedor: '', valorCompra: 0.45,   markup: 0, valorVenda: 0.45,   injetavel: false, descartaveis: [] },
  { id: 'im73', nome: 'Tintura de Iodo 10%',            categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 7.00,   markup: 0, valorVenda: 7.00,   injetavel: false, descartaveis: [] },
  { id: 'im74', nome: 'Triancinolona',                  categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 0,      markup: 0, valorVenda: 0,      injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im75', nome: 'Tridiazin Bisnaga',              categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 35.00,  markup: 0, valorVenda: 35.00,  injetavel: false, descartaveis: [] },
  { id: 'im76', nome: 'Zoovit C',                       categoria: 'medicamento', unidade: 'ml',        fornecedor: '', valorCompra: 0.40,   markup: 0, valorVenda: 0.40,   injetavel: true,  descartaveis: DESCARTAVEIS_INJETAVEL },
  { id: 'im77', nome: 'Cura do umbigo',                 categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 1.50,   markup: 0, valorVenda: 1.50,   injetavel: false, descartaveis: [] },
  { id: 'im78', nome: 'Limpeza de ferida',              categoria: 'medicamento', unidade: 'un',        fornecedor: '', valorCompra: 8.00,   markup: 0, valorVenda: 8.00,   injetavel: false, descartaveis: [] },
  // Descartáveis (IDs fixos — referenciados em DESCARTAVEIS_INJETAVEL)
  { id: 'i_seringa', nome: 'Seringa',          categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 0.35, markup: 0, valorVenda: 0.35, injetavel: false, descartaveis: [] },
  { id: 'i_agulha',  nome: 'Agulha',           categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 0.25, markup: 0, valorVenda: 0.25, injetavel: false, descartaveis: [] },
  { id: 'i_algodao', nome: 'Algodão c/ álcool',categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 0.50, markup: 0, valorVenda: 0.50, injetavel: false, descartaveis: [] },
  // Outros descartáveis clínicos
  { id: 'im_cat',    nome: 'Cateter comum',    categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 3.50,  markup: 0, valorVenda: 3.50,  injetavel: false, descartaveis: [] },
  { id: 'im_crio',   nome: 'Criotubo',         categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 9.50,  markup: 0, valorVenda: 9.50,  injetavel: false, descartaveis: [] },
  { id: 'im_eqtf',   nome: 'Equipo p/ Transfusão', categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 12.00, markup: 0, valorVenda: 12.00, injetavel: false, descartaveis: [] },
  { id: 'im_eqmg',   nome: 'Equipo macro gotas',   categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 2.28,  markup: 0, valorVenda: 2.28,  injetavel: false, descartaveis: [] },
  { id: 'im_espa',   nome: 'Esparadrapo',      categoria: 'descartavel', unidade: 'cm', fornecedor: '', valorCompra: 0.05,  markup: 0, valorVenda: 0.05,  injetavel: false, descartaveis: [] },
  { id: 'im_filt',   nome: 'Filtro de Embrião',categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 28.00, markup: 0, valorVenda: 28.00, injetavel: false, descartaveis: [] },
  { id: 'im_inov',   nome: 'Inovulador 0,25/0,5', categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 25.00, markup: 0, valorVenda: 25.00, injetavel: false, descartaveis: [] },
  { id: 'im_lupal',  nome: 'Luva de Palpação', categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 1.00,  markup: 0, valorVenda: 1.00,  injetavel: false, descartaveis: [] },
  { id: 'im_luproc', nome: 'Luva de procedimento', categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 0.25, markup: 0, valorVenda: 0.25, injetavel: false, descartaveis: [] },
  { id: 'im_palh',   nome: 'Palhetas 0,25/0,5',   categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 18.00, markup: 0, valorVenda: 18.00, injetavel: false, descartaveis: [] },
  { id: 'im_petri',  nome: 'Placa de Petri',   categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 6.00,  markup: 0, valorVenda: 6.00,  injetavel: false, descartaveis: [] },
  { id: 'im_pipeta', nome: 'Pipeta Flexível',  categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 20.00, markup: 0, valorVenda: 20.00, injetavel: false, descartaveis: [] },
  { id: 'im_atad',   nome: 'Atadura',          categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 0.54,  markup: 0, valorVenda: 0.54,  injetavel: false, descartaveis: [] },
  { id: 'im_snd4',   nome: 'Sonda Uretral Nº04', categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 1.50, markup: 0, valorVenda: 1.50, injetavel: false, descartaveis: [] },
  { id: 'im_snd6',   nome: 'Sonda Uretral Nº06', categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 1.50, markup: 0, valorVenda: 1.50, injetavel: false, descartaveis: [] },
  { id: 'im_snd8',   nome: 'Sonda Uretral Nº08', categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 1.60, markup: 0, valorVenda: 1.60, injetavel: false, descartaveis: [] },
  { id: 'im_snd12',  nome: 'Sonda Uretral Nº12', categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 1.60, markup: 0, valorVenda: 1.60, injetavel: false, descartaveis: [] },
  // Tubos e swabs para exames laboratoriais
  { id: 'i_tubo_roxo',     nome: 'Tubo Roxo',        categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 3.50, markup: 0, valorVenda: 5.00, injetavel: false, descartaveis: [] },
  { id: 'i_tubo_vermelho', nome: 'Tubo Vermelho',    categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 3.50, markup: 0, valorVenda: 5.00, injetavel: false, descartaveis: [] },
  { id: 'i_tubo_verde',    nome: 'Tubo Verde',       categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 3.50, markup: 0, valorVenda: 5.00, injetavel: false, descartaveis: [] },
  { id: 'i_tubo_cinza',    nome: 'Tubo Cinza',       categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 3.50, markup: 0, valorVenda: 5.00, injetavel: false, descartaveis: [] },
  { id: 'i_tubo_amarelo',  nome: 'Tubo Amarelo',     categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 3.50, markup: 0, valorVenda: 5.00, injetavel: false, descartaveis: [] },
  { id: 'i_swab_stuart',   nome: 'Swab + Stuart',    categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 8.00, markup: 0, valorVenda: 12.00, injetavel: false, descartaveis: [] },
  { id: 'i_swab_seco',     nome: 'Swab Seco',        categoria: 'descartavel', unidade: 'un', fornecedor: '', valorCompra: 5.00, markup: 0, valorVenda: 8.00, injetavel: false, descartaveis: [] },
];

const EXAMES_LABORATORIAIS = [
  { id: 'ex_lab_hemograma',    nome: 'Hemograma Completo',               valor: 45.00 },
  { id: 'ex_lab_bioquimico',   nome: 'Bioquímico (AST, GGT, FA, CK)',    valor: 85.00 },
  { id: 'ex_lab_proteinas',    nome: 'Proteína Total e Fibrinogênio',     valor: 30.00 },
  { id: 'ex_lab_eletrolitos',  nome: 'Eletrólitos (Na, K, Cl, Ca, P)',    valor: 55.00 },
  { id: 'ex_lab_endocrino',    nome: 'Endócrinos (Cortisol, T4, etc.)',   valor: 90.00 },
  { id: 'ex_lab_sorologia',    nome: 'Sorologia (Anemia Infecciosa)',     valor: 60.00 },
];

const REGISTROS_HOJE = [];
const SETORES = [];
const MOVIMENTACOES = [];
const ATIVIDADES = [];
const AVISOS = [];

const ESCALA_VAZIA = { trabalha: false, entrada: '', saida: '' };
const TURNO_PADRAO = { trabalha: true, entrada: '07:00', saida: '17:00' };

const FUNCIONARIOS = [
  {
    id: 'fn1', nome: 'Carolina', funcao: 'admin', aniversario: '1990-03-15',
    login: 'carolina', senha: '1234',
    escala: { seg: { ...TURNO_PADRAO }, ter: { ...TURNO_PADRAO }, qua: { ...TURNO_PADRAO }, qui: { ...TURNO_PADRAO }, sex: { ...TURNO_PADRAO }, sab: { ...ESCALA_VAZIA }, dom: { ...ESCALA_VAZIA } },
  },
  {
    id: 'fn2', nome: 'Dr. Marcos', funcao: 'vet', aniversario: '1985-07-22',
    login: 'marcos', senha: '1234',
    escala: { seg: { ...TURNO_PADRAO }, ter: { ...ESCALA_VAZIA }, qua: { ...TURNO_PADRAO }, qui: { ...ESCALA_VAZIA }, sex: { trabalha: true, entrada: '08:00', saida: '14:00' }, sab: { trabalha: true, entrada: '08:00', saida: '12:00' }, dom: { ...ESCALA_VAZIA } },
  },
  {
    id: 'fn3', nome: 'José', funcao: 'operacional', aniversario: '1995-11-03',
    login: 'jose', senha: '1234',
    escala: { seg: { ...TURNO_PADRAO }, ter: { ...TURNO_PADRAO }, qua: { ...TURNO_PADRAO }, qui: { ...TURNO_PADRAO }, sex: { ...TURNO_PADRAO }, sab: { ...ESCALA_VAZIA }, dom: { ...ESCALA_VAZIA } },
  },
  {
    id: 'fn4', nome: 'Ana', funcao: 'operacional', aniversario: '2000-05-18',
    login: 'ana', senha: '1234',
    escala: { seg: { ...ESCALA_VAZIA }, ter: { ...TURNO_PADRAO }, qua: { ...TURNO_PADRAO }, qui: { ...TURNO_PADRAO }, sex: { ...TURNO_PADRAO }, sab: { trabalha: true, entrada: '07:00', saida: '13:00' }, dom: { ...ESCALA_VAZIA } },
  },
];

const EVENTOS = [];

// ── Helpers ─────────────────────────────────────────────────────
const getCavalo = (id) => CAVALOS.find(c => c.id === id);
const getProprietario = (id) => PROPRIETARIOS.find(p => p.id === id);
const getInsumo = (id) => INSUMOS.find(i => i.id === id);
const getCategoria = (id) => CATEGORIAS_INSUMOS.find(c => c.id === id);

const idade = (nasc) => {
  if (!nasc) return '';
  const d = new Date(nasc + 'T12:00:00');
  const hoje = new Date();
  let anos = hoje.getFullYear() - d.getFullYear();
  if (hoje.getMonth() < d.getMonth() || (hoje.getMonth() === d.getMonth() && hoje.getDate() < d.getDate())) anos--;
  if (anos < 1) {
    let meses = (hoje.getFullYear() - d.getFullYear()) * 12 + (hoje.getMonth() - d.getMonth());
    if (hoje.getDate() < d.getDate()) meses--;
    if (meses <= 0) return 'Recém-nascido';
    return meses + (meses === 1 ? ' mês' : ' meses');
  }
  return anos + (anos === 1 ? ' ano' : ' anos');
};

const formatBRL = (v) => 'R$ ' + (v || 0).toFixed(2).replace('.', ',');

const diasNoMes = (cavaloId, ref, movs = MOVIMENTACOES) => {
  const inicioMes = new Date(ref.ano, ref.mes - 1, 1);
  const fimMes = new Date(ref.ano, ref.mes, 0);
  const diasTotais = fimMes.getDate();
  const cavMovs = movs
    .filter(m => m.cavaloId === cavaloId)
    .map(m => ({ ...m, d: new Date(m.data) }))
    .sort((a, b) => a.d - b.d);
  const dentroMes = cavMovs.filter(m => m.d >= inicioMes && m.d <= fimMes);
  if (dentroMes.length === 0) return { dias: diasTotais, total: diasTotais, parcial: false };
  let dias = 0;
  let presente = true;
  let cursor = new Date(inicioMes);
  const antes = cavMovs.filter(m => m.d < inicioMes);
  if (antes.length > 0) presente = antes[antes.length - 1].tipo === 'entrada';
  for (const m of dentroMes) {
    if (presente) {
      const diasContados = Math.max(0, Math.floor((m.d - cursor) / (1000 * 60 * 60 * 24)) + (m.tipo === 'saida' ? 1 : 0));
      dias += diasContados;
    }
    presente = m.tipo === 'entrada';
    cursor = new Date(m.d);
  }
  if (presente) {
    const diasContados = Math.max(0, Math.floor((fimMes - cursor) / (1000 * 60 * 60 * 24)) + 1);
    dias += diasContados;
  }
  return { dias: Math.min(dias, diasTotais), total: diasTotais, parcial: true };
};

const proporcaoMensalidade = (cavaloId, ref, movs) => {
  const { dias, total, parcial } = diasNoMes(cavaloId, ref, movs);
  const cav = getCavalo(cavaloId);
  const valorBase = cav.mensalidade;
  return { dias, total, parcial, valor: valorBase * (dias / total), valorBase };
};

const findInsumo = (id, insumos) => {
  if (insumos) {
    const found = insumos.find(i => i.id === id);
    if (found) return found;
  }
  return getInsumo(id);
};

const consumoDiarioCavalo = (cavaloId, insumos, cavalosLive) => {
  const cav = cavalosLive ? cavalosLive.find(c => c.id === cavaloId) : getCavalo(cavaloId);
  if (!cav || !cav.nutricao) return [];
  const linhas = [];
  if (cav.nutricao.oleoMlDia > 0) {
    const oleo = findInsumo('i_oleo', insumos);
    if (oleo) linhas.push({
      insumoId: oleo.id, nome: oleo.nome,
      qtdDia: cav.nutricao.oleoMlDia, unidade: oleo.unidade,
      valorUnit: oleo.valorVenda,
      valorDia: oleo.valorVenda * cav.nutricao.oleoMlDia,
    });
  }
  const _salKDia = (Number(cav.nutricao.salKromiumGManha) || 0) + (Number(cav.nutricao.salKromiumGTarde) || 0);
  if (_salKDia > 0) {
    const sal = (insumos || []).find(i => /sal/i.test(i.nome || '') && /kromium/i.test(i.nome || ''));
    if (sal) linhas.push({
      insumoId: sal.id, nome: sal.nome,
      qtdDia: _salKDia, unidade: sal.unidade || 'g',
      valorUnit: sal.valorVenda,
      valorDia: (sal.valorVenda || 0) * _salKDia,
    });
  }
  for (const s of (cav.nutricao.suplementos || [])) {
    const ins = findInsumo(s.insumoId, insumos);
    if (!ins) continue;
    linhas.push({
      insumoId: ins.id, nome: ins.nome,
      qtdDia: s.qtdDia, unidade: ins.unidade,
      valorUnit: ins.valorVenda,
      valorDia: ins.valorVenda * s.qtdDia,
    });
  }
  for (const p of (cav.nutricao.periodicos || [])) {
    const ins = findInsumo(p.insumoId, insumos);
    if (!ins) continue;
    const freqDias = p.frequencia === 'quinzenal' ? 14 : p.frequencia === 'semanal' ? 7 : p.frequencia === 'diario' ? 1 : p.frequencia?.startsWith('cada') ? parseInt(p.frequencia.replace('cada', '')) || 7 : 7;
    const qtdDia = p.qtd / freqDias;
    linhas.push({
      insumoId: ins.id, nome: ins.nome + ' (periódico)',
      qtdDia, unidade: ins.unidade,
      valorUnit: ins.valorVenda,
      valorDia: ins.valorVenda * qtdDia,
    });
  }
  return linhas;
};

const cobrancaPerfilMes = (cavaloId, ref, movs, insumos) => {
  const { dias } = diasNoMes(cavaloId, ref, movs);
  const linhas = consumoDiarioCavalo(cavaloId, insumos).map(l => ({
    ...l, dias, valorMes: l.valorDia * dias,
  }));
  return { linhas, total: linhas.reduce((s, l) => s + l.valorMes, 0), dias };
};

const PARTOS = [];

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Dedup por nome — retorna 1 item por nome normalizado, preferindo
// o com melhor score (mais campos preenchidos). Usado nos cadastros
// pra evitar duplicatas visuais quando o banco tem entradas repetidas.
function _scoreItem(it) {
  let s = 0;
  if ((it.workspaceId || 'haras') === 'haras') s += 2; // Preferir workspace haras
  if (Array.isArray(it.descartaveisObrigatorios) && it.descartaveisObrigatorios.length > 0) s += 3;
  if (Array.isArray(it.descartaveis) && it.descartaveis.length > 0) s += 2;
  if (Number(it.valorVenda ?? it.valor) > 0) s += 1;
  if (Number(it.valorCompra) > 0) s += 1;
  if (it.fornecedor) s += 1;
  if (it.injetavel) s += 1;
  if (it.indutorOvulacao) s += 1;
  return s;
}
function dedupPorNome(items) {
  const norm2 = (s) => norm(String(s || '').trim());
  const byNome = new Map();
  for (const it of (items || [])) {
    const k = norm2(it.nome);
    if (!k) continue;
    const existente = byNome.get(k);
    if (!existente || _scoreItem(it) > _scoreItem(existente)) {
      byNome.set(k, it);
    }
  }
  return [...byNome.values()];
}

// Cria registros para descartáveis automaticamente. A quantidade de descartável
// NÃO escala com o volume do insumo: 1 aplicação = 1 agulha/seringa/algodão,
// independente de aplicar 1ml ou 10ml. qtdBase é mantido na assinatura por
// compatibilidade mas ignorado. Retorna os registros criados para rastreio.
function addDescartaveis(addRegistro, insumoBase, cavaloId, qtdBase, insumos, hora, usuario, data) {
  const ins = (insumos || []).find(i => i.id === insumoBase) || getInsumo(insumoBase);
  if (!ins?.descartaveis?.length) return [];
  const created = [];
  ins.descartaveis.forEach(d => {
    const id = 'r_desc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) + '_' + d.insumoId;
    const qtd = d.qtd;
    addRegistro({ id, cavaloId, insumoId: d.insumoId, qtd, hora, usuario, data, isAuto: true });
    created.push({ registroId: id, insumoId: d.insumoId, qtd, isAuto: true });
  });
  return created;
}

export {
  PROPRIETARIOS, CAVALOS, CATEGORIAS_CAVALO, CATEGORIAS_INSUMOS, INSUMOS, DESCARTAVEIS_INJETAVEL,
  CATEGORIAS_SERVICOS, SERVICOS, EXAMES_LABORATORIAIS,
  REGISTROS_HOJE, SETORES, MOVIMENTACOES, AVISOS, ATIVIDADES, TAXA_INJETAVEL,
  FUNCIONARIOS, ESCALA_VAZIA, EVENTOS, PARTOS,
  getCavalo, getProprietario, getInsumo, getCategoria, idade, formatBRL,
  diasNoMes, proporcaoMensalidade, findInsumo, consumoDiarioCavalo, cobrancaPerfilMes,
  norm, addDescartaveis, dedupPorNome,
};
