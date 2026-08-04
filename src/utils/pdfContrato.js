// pdfContrato.js — Gera o CONTRATO DE PRESTAÇÃO DE SERVIÇOS
// preenchido com os dados do proprietário. Retorna base64 pronto pra
// subir na Edge Function assinafy-criar-assinatura.
//
// O texto do contrato é fixo (definido junto com o Haras Epona). Só variam
// os dados do CONTRATANTE (nome, CPF, RG, endereço, etc). Se o texto do
// contrato mudar, edite as strings abaixo — quem escreve o texto é humano,
// então evito engenharia excessiva de template.

import { jsPDF } from 'jspdf';

// Formata data: 4 de agosto de 2026
function fmtDataExtenso(d = new Date()) {
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

// Monta o endereço completo em uma linha
function enderecoCompleto(p) {
  const parte1 = [p.rua, p.numero].filter(Boolean).join(', ');
  const parte2 = [p.complemento, p.bairro, p.cidade, p.estado].filter(Boolean).join(', ');
  return [parte1, parte2].filter(Boolean).join(' — ');
}

export function gerarPdfContrato(proprietario) {
  const p = proprietario || {};
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 20;           // margem lateral
  const CW = W - 2 * M;   // largura útil
  const BOTTOM = 285;     // limite inferior
  let y = M;

  // Cor / fontes base
  doc.setTextColor(0, 0, 0);

  // Quebra automática de página quando y ultrapassa o limite.
  const ensureRoom = (need = 8) => {
    if (y + need > BOTTOM) { doc.addPage(); y = M; }
  };

  // Escreve um bloco de texto justificado com quebra automática.
  // parts: array de {text, bold?} pra permitir palavras em negrito no meio.
  const writeParagraph = (parts, opts = {}) => {
    const { fontSize = 10, lineHeight = 4.5, spaceAfter = 3, indent = 0 } = opts;
    doc.setFontSize(fontSize);
    const maxW = CW - indent;

    // Achata em tokens {text, bold} + spaces
    const tokens = [];
    parts.forEach(part => {
      const words = part.text.split(/(\s+)/);
      words.forEach(w => {
        if (!w) return;
        tokens.push({ text: w, bold: !!part.bold });
      });
    });

    // Quebra em linhas manualmente pra respeitar negrito por palavra
    let line = [];
    let lineWidth = 0;
    const flushLine = () => {
      ensureRoom(lineHeight);
      let x = M + indent;
      line.forEach(t => {
        doc.setFont('helvetica', t.bold ? 'bold' : 'normal');
        doc.text(t.text, x, y);
        x += doc.getTextWidth(t.text);
      });
      y += lineHeight;
      line = []; lineWidth = 0;
    };

    tokens.forEach(t => {
      doc.setFont('helvetica', t.bold ? 'bold' : 'normal');
      const w = doc.getTextWidth(t.text);
      if (lineWidth + w > maxW && line.length > 0 && !/^\s+$/.test(t.text)) {
        // remove espaços em branco no fim da linha antes de quebrar
        while (line.length > 0 && /^\s+$/.test(line[line.length - 1].text)) {
          const removed = line.pop();
          lineWidth -= doc.getTextWidth(removed.text);
        }
        flushLine();
        // se o token é só espaço não começa nova linha com ele
        if (/^\s+$/.test(t.text)) return;
      }
      line.push(t);
      lineWidth += w;
    });
    if (line.length > 0) flushLine();
    y += spaceAfter;
  };

  // Título da cláusula (bold, tamanho maior)
  const writeHeading = (text, opts = {}) => {
    const { fontSize = 12, spaceBefore = 4, spaceAfter = 2 } = opts;
    y += spaceBefore;
    ensureRoom(fontSize / 2 + 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    doc.text(text, M, y);
    y += fontSize / 2 + spaceAfter;
  };

  // ── Título do documento ────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const titulo = doc.splitTextToSize('CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ALOJAMENTO, MANEJO E ACOMPANHAMENTO DE EQUINOS', CW);
  titulo.forEach(l => { doc.text(l, M, y); y += 6; });
  y += 4;

  // ── 1. Das Partes ──────────────────────────────────────
  writeHeading('1. DAS PARTES');

  writeParagraph([
    { text: 'Pelo presente instrumento particular, de um lado, como ' },
    { text: 'CONTRATADA', bold: true }, { text: ': ' },
    { text: 'HARAS DA VILA ALOJAMENTO PARA ANIMAIS LTDA.', bold: true },
    { text: ', pessoa jurídica de direito privado, inscrita no ' },
    { text: 'CNPJ', bold: true }, { text: ' sob o n.º ' },
    { text: '46.156.547/0001-81', bold: true },
    { text: ', com sede na Estrada Bairro Água Branca, n.º 5340 — Água Branca, Boituva/SP, CEP 18558-200, neste ato representada por seus sócios administradores: (a) ' },
    { text: 'ALEXANDRE MONTEIRO BARBOSA', bold: true },
    { text: ', brasileiro, médico veterinário, solteiro, portador do ' },
    { text: 'RG', bold: true }, { text: ' n.º ' },
    { text: '34.799.455-6', bold: true },
    { text: ' e inscrito no ' }, { text: 'CPF', bold: true }, { text: ' sob o n.º ' },
    { text: '350.730.488-06', bold: true }, { text: '; e (b) ' },
    { text: 'CAROLINA TIEKO SHIOZUKA BRANCO', bold: true },
    { text: ', brasileira, médica veterinária, solteira, portadora do ' },
    { text: 'RG', bold: true }, { text: ' n.º ' },
    { text: '53.458.605-3', bold: true },
    { text: ' e inscrita no ' }, { text: 'CPF', bold: true }, { text: ' sob o n.º ' },
    { text: '537.622.918-10', bold: true }, { text: '.' },
  ]);

  writeParagraph([
    { text: 'E, de outro lado, como ' }, { text: 'CONTRATANTE', bold: true }, { text: ': ' },
    { text: p.nomeCompleto || '—', bold: true }, { text: ', ' },
    { text: p.nacionalidade || '—' }, { text: ', ' },
    { text: p.estadoCivil || '—' }, { text: ', ' },
    { text: p.profissao || '—' },
    { text: ', portador(a) do ' }, { text: 'RG', bold: true }, { text: ' n.º ' },
    { text: p.rg || '—', bold: true },
    { text: ' e inscrito(a) no ' }, { text: 'CPF', bold: true }, { text: ' sob o n.º ' },
    { text: p.cpf || '—', bold: true },
    { text: ', residente e domiciliado(a) na ' },
    { text: enderecoCompleto(p) || '—' },
    { text: ', CEP ' }, { text: p.cep || '—' },
    { text: ', telefone ' }, { text: p.telefone || '—' },
    { text: ' e e-mail ' }, { text: p.email || '—' }, { text: '.' },
  ]);

  // ── 2. Cláusula Primeira ──────────────────────────────
  writeHeading('2. CLÁUSULA PRIMEIRA – DO OBJETO');
  writeParagraph([
    { text: '2.1. O presente contrato tem por objeto a prestação, pela Contratada, de serviços de alojamento, acompanhamento gestacional, assistência ao parto e desenvolvimento de potros nas instalações do ' },
    { text: 'Epona Stud', bold: true },
    { text: ', aplicáveis aos equinos de propriedade do Contratante que sejam entregues à Contratada para tal fim.' },
  ]);

  // ── 3. Cláusula Segunda ───────────────────────────────
  writeHeading('3. CLÁUSULA SEGUNDA – DO DETALHAMENTO DOS SERVIÇOS PRESTADOS');
  writeParagraph([
    { text: '3.1. A mensalidade contratada contempla: (a) Estadia do Animal em instalações do ' },
    { text: 'Epona Stud', bold: true },
    { text: ' (baia ou piquete); (b) Feno; (c) Ração; (d) Sal mineral; (e) Água potável; (f) Manejo sanitário e limpeza; (g) Acompanhamento clínico veterinário de rotina; (h) Exames gestacionais e pré-natais de éguas gestantes.' },
  ]);
  writeParagraph([
    { text: '3.2. ' }, { text: 'NÃO', bold: true },
    { text: ' estão inclusos na mensalidade, sendo cobrados à parte do Contratante: (a) Suplementos; (b) Medicamentos; (c) Produtos descartáveis; (d) Serragem; (e) Procedimentos veterinários extraordinários, incluindo cirurgias, exames laboratoriais, ultrassonografias diagnósticas adicionais, endoscopias, radiografias e demais procedimentos complementares; (f) ' },
    { text: 'Parto assistido', bold: true },
    { text: '; (g) Ferrageamento e casqueamento; (h) Serviços de inseminação artificial, transferência de embriões e demais biotécnicas reprodutivas; (i) Transporte externo; (j) Doma avançada e treinamento desportivo; (k) Diárias de internação hospitalar externa.' },
  ]);

  // ── 4. Cláusula Terceira ──────────────────────────────
  writeHeading('4. CLÁUSULA TERCEIRA – DA QUALIFICAÇÃO E VALOR DOS ANIMAIS');
  writeParagraph([
    { text: '4.1. ', bold: false },
    { text: 'O Contratante declara que o(s) Animal(is) são de sua exclusiva propriedade, encontrando-se em condições de serem manejados pela Contratada, exigindo manejo técnico especializado.', bold: true },
  ]);
  writeParagraph([
    { text: '4.2. ' },
    { text: 'As partes reconhecem que o(s) Animal(is) possui(em) valor próprio, não transferindo à Contratada qualquer responsabilidade objetiva por perdas, danos ou morte, conforme regramento de responsabilidade civil contratual.', bold: true },
  ]);

  // ── 5. Cláusula Quarta ────────────────────────────────
  writeHeading('5. CLÁUSULA QUARTA – DAS OBRIGAÇÕES DAS PARTES');
  writeParagraph([
    { text: '5.1. A ' }, { text: 'CONTRATADA', bold: true },
    { text: ' obriga-se a prestar os serviços com zelo técnico, manter instalações adequadas, comunicar alterações de saúde em até 24 horas e permitir visitas agendadas.' },
  ]);
  writeParagraph([
    { text: '5.2. O ' }, { text: 'CONTRATANTE', bold: true },
    { text: ' obriga-se a fornecer documentação sanitária, efetuar pagamentos pontuais, manter dados atualizados e decidir prontamente sobre intervenções emergenciais solicitadas.' },
  ]);

  // ── 6. Cláusula Quinta ────────────────────────────────
  writeHeading('6. CLÁUSULA QUINTA – DA EXCLUSÃO DE RESPONSABILIDADE');
  writeParagraph([
    { text: '6.1. A Contratada ' }, { text: 'NÃO', bold: true },
    { text: ' assume responsabilidade por: (a) Morte do(s) Animal(is) por qualquer causa, incluindo caso fortuito ou força maior; (b) Perdas gestacionais, abortos ou natimortalidade; (c) Incapacitação desportiva por fraturas, lesões ou doenças ortopédicas; (d) Lesões decorrentes de comportamento próprio do animal ou interação em piquetes.' },
  ]);
  writeParagraph([
    { text: '6.2. A responsabilidade da Contratada limita-se à diligência na execução dos serviços, não respondendo objetivamente pela vida do animal, nos termos do ' },
    { text: 'art. 393 do Código Civil', bold: false },
    { text: '.' },
  ]);

  // ── 7. Cláusula Sexta ─────────────────────────────────
  writeHeading('7. CLÁUSULA SEXTA – DO CONSENTIMENTO INFORMADO SOBRE RISCOS');
  writeParagraph([
    { text: '7.1. O Contratante declara ciência expressa de que equinos estão sujeitos a riscos fatais ou incapacitantes, tais como: cólicas agudas, fraturas em repouso, laminite, doenças infecciosas e complicações de parto (distocia), aceitando tais riscos como inerentes à atividade.' },
  ]);

  // ── 8. Cláusula Sétima ────────────────────────────────
  writeHeading('8. CLÁUSULA SÉTIMA – DO PREÇO E CONDIÇÕES DE PAGAMENTO');
  writeParagraph([
    { text: '8.1. Pela prestação dos serviços objeto deste contrato, o Contratante pagará à Contratada mensalidade mensal por Animal alojado, cujo valor é individual e livremente pactuado entre as partes no ato da contratação, podendo ser reajustado nos termos das cláusulas seguintes.' },
  ]);
  writeParagraph([
    { text: '8.2. A cobrança mensal é proporcional aos dias efetivos de permanência do Animal nas instalações da Contratada no mês corrido.' },
  ]);
  writeParagraph([
    { text: '8.3. As partes reconhecem expressamente que os custos de manutenção de equinos estão sujeitos à variação dos preços de insumos e serviços — tais como feno, ração, sal mineral, suplementos, medicamentos, serviços veterinários, mão de obra, energia e demais custos operacionais —, motivo pelo qual o valor da mensalidade poderá ser ' },
    { text: 'reajustado durante o ano', bold: true },
    { text: ', independentemente do reajuste anual previsto na cláusula seguinte, mediante ' },
    { text: 'comunicação prévia por escrito', bold: true },
    { text: ' ao Contratante com antecedência mínima de ' },
    { text: '15 (quinze) dias', bold: true },
    { text: ', sendo que o novo valor passa a vigorar a partir do vencimento imediatamente posterior à comunicação.' },
  ]);
  writeParagraph([
    { text: '8.4. Os pagamentos serão efetuados mensalmente, com ' },
    { text: 'vencimento no dia 05 (cinco)', bold: true },
    { text: ' de cada mês, mediante transferência bancária, ' },
    { text: 'PIX', bold: true },
    { text: ' ou boleto bancário emitido pela Contratada.' },
  ]);
  writeParagraph([
    { text: '8.5. O valor da ' }, { text: 'diária extra', bold: true },
    { text: ' de alojamento (permanência além do prazo de retirada, hospedagem temporária, etc.) será de ' },
    { text: 'R$ 65,00 (sessenta e cinco reais)', bold: true },
    { text: ' por animal/dia, podendo igualmente ser reajustado nos termos da Cláusula 8.3.' },
  ]);
  writeParagraph([
    { text: '8.6. ' }, { text: 'Da gestação e do potro:', bold: true },
    { text: ' Enquanto a égua se encontrar gestante, a mensalidade devida refere-se a ' },
    { text: '1 (um)', bold: true },
    { text: ' animal (a égua). Quando do nascimento do potro, ' },
    { text: 'não haverá cobrança de mensalidade adicional', bold: true },
    { text: ' pelo potro, sendo cobrado à parte, durante o período em que o potro permanecer junto à mãe nas instalações, apenas o consumo direto do potro de: (a) Feno; (b) Ração; (c) Sal mineral; (d) Suplementos.' },
  ]);
  writeParagraph([
    { text: '8.7. Adicionalmente ao reajuste previsto na Cláusula 8.3, os valores serão reajustados ' },
    { text: 'anualmente', bold: true },
    { text: ', com base no índice ' }, { text: 'IPCA/IBGE', bold: true },
    { text: ' acumulado nos últimos ' }, { text: '12 (doze) meses', bold: true },
    { text: ', ou, na ausência desse, por índice que melhor reflita a variação do poder aquisitivo, conforme permitido pela legislação vigente.' },
  ]);

  // ── 9. Cláusula Oitava ────────────────────────────────
  writeHeading('9. CLÁUSULA OITAVA – DOS ENCARGOS MORATÓRIOS E INADIMPLÊNCIA');
  writeParagraph([
    { text: '9.1. O atraso no pagamento de qualquer obrigação pecuniária prevista neste contrato sujeitará o Contratante a: (a) ' },
    { text: 'Multa moratória de 2% (dois por cento)', bold: true },
    { text: ', nos termos do ' }, { text: 'art. 412 do Código Civil', bold: false },
    { text: '; (b) ' }, { text: 'Juros de mora de 1% (um por cento) ao mês', bold: true },
    { text: ', ou percentual que venha a ser fixado por lei como limite máximo permitido, calculados pro rata die; (c) ' },
    { text: 'Correção monetária', bold: true },
    { text: ' pelo índice ' }, { text: 'IPCA/IBGE', bold: true },
    { text: ' acumulado no período de inadimplência, preservado o valor real da dívida.' },
  ]);

  // ── 10. Cláusula Nona ─────────────────────────────────
  writeHeading('10. CLÁUSULA NONA – DA RETENÇÃO E MEDIDAS DE RECUPERAÇÃO DE CRÉDITO');
  writeParagraph([
    { text: '10.1. Decorridos ' }, { text: '3 (três) meses', bold: true },
    { text: ' de inadimplência, a Contratada poderá: (a) Exercer o ' },
    { text: 'direito de retenção', bold: true }, { text: ' do(s) Animal(is) (' },
    { text: 'art. 1.431, CC', bold: false }, { text: '); (b) Suspender serviços não essenciais; (c) Promover a cobrança judicial ou extrajudicial do débito.' },
  ]);
  writeParagraph([
    { text: '10.2. Os custos de cobrança, incluindo honorários advocatícios extrajudiciais de 10% e custas processuais, serão suportados integralmente pelo devedor.' },
  ]);

  // ── 11. Cláusula Décima ───────────────────────────────
  writeHeading('11. CLÁUSULA DÉCIMA – DO SEGURO (RECOMENDAÇÃO)');
  writeParagraph([
    { text: '11.1. A Contratada não mantém seguro de vida para os animais. A contratação de seguro é ' },
    { text: 'mera recomendação opcional', bold: true },
    { text: ' ao Contratante, não sendo obrigatória para a vigência deste contrato.' },
  ]);

  // ── 12. Cláusula Décima Primeira ──────────────────────
  writeHeading('12. CLÁUSULA DÉCIMA PRIMEIRA – DA PROCURAÇÃO');
  writeParagraph([
    { text: '12.1. O Contratante outorga à Contratada poderes específicos para: (a) Receber citações e notificações relativas a este contrato; (b) Representá-lo perante associações de raça para fins de regularização ou transferência em caso de execução de dívida após 3 meses de inadimplência.' },
  ]);

  // ── 13. Cláusula Décima Segunda ───────────────────────
  writeHeading('13. CLÁUSULA DÉCIMA SEGUNDA – DA RESCISÃO E FORO');
  writeParagraph([
    { text: '13.1. O contrato tem prazo indeterminado, podendo ser rescindido por qualquer parte mediante aviso prévio de 30 dias.' },
  ]);
  writeParagraph([
    { text: '13.2. Fica eleito o Foro da Comarca de ' },
    { text: 'Boituva/SP', bold: true },
    { text: ' para dirimir controvérsias deste instrumento.' },
  ]);

  // ── Linha de separação + área de assinatura ───────────
  y += 10;
  ensureRoom(90);
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  y += 15;

  // Data
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Boituva, ${fmtDataExtenso()}.`, M, y);
  y += 20;

  // Assinatura do CONTRATANTE — deixamos espaço em branco pra o Assinafy
  // colocar o campo de assinatura por cima. Colocamos apenas a linha e o rótulo.
  doc.setDrawColor(50);
  doc.setLineWidth(0.4);
  doc.line(M, y, M + 80, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATANTE', M, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(p.nomeCompleto || '', M, y + 10);
  y += 25;

  // Assinatura da CONTRATADA (fixa — já é sabido)
  doc.line(M, y, M + 80, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATADA', M, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Haras da Vila Alojamento para Animais Ltda.', M, y + 10);

  // Devolve como base64 sem o prefixo data:...
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1];
}

// Nome sugerido do arquivo (para debug/download)
export function nomeArquivoContrato(proprietario) {
  const nome = (proprietario?.nomeCompleto || 'proprietario').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `contrato-${nome}.pdf`;
}
