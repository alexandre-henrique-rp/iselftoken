namespace StartupTypes {
  /**
   * Interface para os dados de todas as startups
   * @interface getAllStartups
   * @property {number} id - ID da startup
   * @property {string} name - Nome da startup
   * @property {string} logo - Logo da startup em link ex: https://example.com/logo.png
   * @property {string} category - categoria da startup
   * @property {StartupSelo[]} selos - selos atribuídos a startup pela plataforma
   * @property {string} description - Descrição da startup básica
   * @property {string} image - Imagem de fundo da startup
   * @property {string} equityPercentage - Porcentagem de equity oferecida
   * @property {string} totalTokens - Total de tokens
   * @property {string} tokensRemaining - Tokens restantes
   */
  type getAllStartups = {
    id: number;
    name: string;
    logo: string;
    category: string;
    selos: StartupSelo[];
    description: string;
    image: string;
    equityPercentage: string;
    totalTokens: string;
    tokensRemaining: string;
  };


  type marketingData = {
    oportunidades: OpportunityData[];
    categorias: Categorias[];
    testemunhosInvestidor: TestemunhoData[];
    testemunhosStartup: TestemunhoData[];
    campeao: getAllStartups[];
    verificado: getAllStartups[];
    acelerado: getAllStartups[];
    aprovadas: getAllStartups[];
  };

  /**
   * Interface para os dados de uma startup específica
   * @interface getStartupById
   * @property {number} id - ID da startup
   * @property {string} name - Nome da startup
   * @property {string} logo - Logo da startup em link ex: https://example.com/logo.png
   * @property {string} category - categoria da startup
   * @property {StartupSelo[]} selos - selos atribuídos a startup pela plataforma
   * @property {string} description - Descrição da startup básica
   * @property {string} image - Imagem de fundo da startup
   * @property {string} equityPercentage - Porcentagem de equity oferecida
   * @property {string} totalTokens - Total de tokens
   * @property {string} tokensRemaining - Tokens restantes
   * @property {string} fundingGoal - Meta de arrecadação
   * @property {string} raised - Arrecadação atual
   * @property {number} percentage - Porcentagem arrecadada
   * @property {string} valuation - Valuation da startup
   * @property {number} investors - Número de investidores
   * @property {string} timeLeft - Tempo restante
   * @property {boolean} trending - Se a startup está em tendência
   * @property {string} markdownContent - Conteúdo do pitch da startup
   */
  type getStartupById = {
    id: number;
    name: string;
    logo: string;
    category: string;
    selos: StartupSelo[];
    description: string;
    image: string;
    equityPercentage: string;
    totalTokens: string;
    tokensRemaining: string;
    fundingGoal: string;
    raised: string;
    percentage: number;
    valuation: string;
    investors: number;
    timeLeft: string;
    trending: boolean;
    markdownContent: string;
  };
}

/**
 * Interface para os selos das startups
 * @interface StartupSelo
 * @property {string} id - ID do selo
 * @property {string} label - Label do selo
 * @property {string} image - URL da imagem do selo
 */
export type StartupSelo = {
  id: string;
  label: string;
  image: string;
};

/**
 * Interface para os dados de uma oportunidade
 * @interface OpportunityData
 * @property {string} name - Nome da oportunidade
 * @property {string} subName - Sub nome da oportunidade
 * @property {Categorias} category - Categoria da oportunidade
 * @property {string} icon - Ícone da oportunidade
 */
export type OpportunityData = {
  name: string;
  subName: string;
  category: Categorias;
  icon: 'fintech' | 'ai' | 'education' | 'saas' | 'health' | 'biotech';
};

/**
 * Tipos de categorias
 * @type Categorias
 * @property {string} All - Todas as categorias
 * @property {string} Fintech - Categorias de fintech
 * @property {string} AI - Categorias de IA
 * @property {string} SaaS - Categorias de SaaS
 * @property {string} Healthtech - Categorias de Healthtech
 * @property {string} EdTech - Categorias de EdTech
 * @property {string} Biotech - Categorias de Biotech
 */
type Categorias =
  | 'All'
  | 'Fintech'
  | 'AI'
  | 'SaaS'
  | 'Healthtech'
  | 'EdTech'
  | 'Biotech';



/**
 * Interface para os dados de um depoimento
 * @interface TestemunhoData
 * @property {string} name - Nome do depoimento
 * @property {string} testimonial - Depoimento
 * @property {string} role - Cargo
 * @property {string} nameKey - Chave do nome (i18n)
 * @property {string} testimonialKey - Chave do depoimento (i18n)
 * @property {string} roleKey - Chave do cargo (i18n)
 */
export type TestemunhoData = {
  // Valores literais (fallback)
  name?: string;
  testimonial?: string;
  role?: string;
  // Chaves i18n (preferenciais)
  nameKey?: string;
  testimonialKey?: string;
  roleKey?: string;
};