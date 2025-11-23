/**
 * Exemplos de como usar o sistema de produtos e observações no checkout
 * Este arquivo serve como documentação para implementação futura
 */

// TODO: Implementar LocalStorageService quando disponível
console.log('Exemplos de produtos que seriam salvos:');

/**
 * Exemplo 1: Plano padrão (sem produto personalizado)
 */
export const exemploPlanoPadrao = () => {
  // TODO: Salvar plano padrão R$ 50,00 no LocalStorageService quando disponível

  // Resultado no checkout:
  // Nome: ISELF INVESTIDOR (usa plano)
  // Validade: 12 meses
  // Obs: (não exibe)
};

/**
 * Exemplo 2: Produto personalizado
 */
export const exemploProdutoPersonalizado = () => {
  // TODO: Salvar produto personalizado no LocalStorageService quando disponível

  // Resultado no checkout:
  // Nome: PACOTE STARTUP ESPECIAL (usa produto)
  // Validade: 12 meses
  // Obs: 📝 Pacote exclusivo para startups com mentoria personalizada e acesso prioritário a investidores
};

/**
 * Exemplo 3: Curso online
 */
export const exemploCursoOnline = () => {
  // TODO: Salvar curso online no LocalStorageService quando disponível

  // Resultado no checkout:
  // Nome: CURSO TRADING AVANÇADO
  // Validade: 24 meses
  // Obs: 📝 Acesso vitalício ao curso + 3 meses de suporte individual + certificado de conclusão
};

/**
 * Exemplo 4: Consultoria pontual
 */
export const exemploConsultoria = () => {
  // TODO: Salvar consultoria no LocalStorageService quando disponível

  // Resultado no checkout:
  // Nome: CONSULTORIA FINANCEIRA 1H
  // Validade: 1 mês
  // Obs: 📝 Sessão de 1 hora com especialista em investimentos + análise de portfólio + plano de ação personalizado
};

/**
 * Exemplo 5: Assinatura mensal
 */
export const exemploAssinaturaMensal = () => {
  // TODO: Salvar assinatura mensal no LocalStorageService quando disponível

  // Resultado no checkout:
  // Nome: ASSINATURA PREMIUM MENSAL
  // Validade: 1 mês
  // Obs: 📝 Renovação automática a cada mês. Cancele quando quiser. Inclui todos os benefícios da plataforma.
};

/**
 * Exemplo 6: Evento/Palestra
 */
export const exemploEvento = () => {
  // TODO: Salvar evento no LocalStorageService quando disponível

  // Resultado no checkout:
  // Nome: INGRESSO CONFERÊNCIA ISELF 2024
  // Validade: 6 meses
  // Obs: 📝 Acesso ao evento presencial + materiais digitais + gravações disponíveis por 6 meses + networking exclusivo
};

/**
 * Função utilitária para criar produtos dinamicamente
 */
export const criarProduto = (
  plano: 'Investidor' | 'Fundador' | 'Afiliado',
  produto: string,
  valor: string,
  validade: number,
  obs?: string
) => {
  console.log(`✅ Produto "${produto}" criado!`);
  console.log(`💰 Valor: ${valor}`);
  console.log(`🌐 Navegue para /checkout para ver o resultado`);
  console.log(`plano selecionado: ${plano}`);
  console.log(`produto selecionado: ${produto}`);
  console.log(`valor selecionado: ${valor}`);
  console.log(`validade selecionada: ${validade}`);
  console.log(`obs selecionado: ${obs}`);
 
};

/**
 * Exemplo de uso da função utilitária
 */
export const exemploDinamico = () => {
  // Criando um produto personalizado
  criarProduto(
    'Investidor',
    'MASTERCLASS CRIPTOMOEDAS',
    'R$ 497,00',
    12,
    '8 horas de conteúdo ao vivo + material de apoio + acesso à comunidade exclusiva'
  );
};
