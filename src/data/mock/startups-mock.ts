import { Startup, StartupStats, StartupHistory, StartupInvestor } from '@/types/startup'

export const mockStartups: Startup[] = [
  {
    id: 1,
    nome: 'FinTech Innovar',
    cnpj: '12.345.678/0001-95',
    pais: {
      iso3: 'BRA',
      nome: 'Brasil',
      emoji: '🇧🇷'
    },
    area_atuacao: 'Fintech',
    estagio: 'MVP',
    meta_captacao: 500000,
    equity_oferecido: 15,
    valuation_calculado: 3333333.33,
    status: 'Aprovada',
    data_fundacao: '2023-06-15',
    site: 'https://fintechinnovar.com.br',
    logo_url: 'https://via.placeholder.com/200x200/3b82f6/ffffff?text=FI',
    descritivo_basico: 'Solução financeira inovadora para PMEs brasileiras',
    total_captado: 150000,
    total_investidores: 25,
    tokens: 15000,
    current_tokens: 5000,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-20T14:45:00Z'
  },
  {
    id: 2,
    nome: 'HealthTech Solutions',
    cnpj: '98.765.432/0001-10',
    pais: {
      iso3: 'BRA',
      nome: 'Brasil', 
      emoji: '🇧🇷'
    },
    area_atuacao: 'Healthtech',
    estagio: 'Operação',
    meta_captacao: 1200000,
    equity_oferecido: 20,
    valuation_calculado: 6000000,
    status: 'Ativa',
    data_fundacao: '2022-03-20',
    site: 'https://healthtechsolutions.com.br',
    logo_url: 'https://via.placeholder.com/200x200/ef4444/ffffff?text=HS',
    descritivo_basico: 'Telemedicina e gestão hospitalar inteligente',
    total_captado: 850000,
    total_investidores: 42,
    tokens: 15000,
    current_tokens: 5000,
    created_at: '2023-11-10T08:15:00Z',
    updated_at: '2024-01-18T16:20:00Z'
  },
  {
    id: 3,
    nome: 'EduTech Learn',
    cnpj: '45.678.901/0001-23',
    pais: {
      iso3: 'BRA',
      nome: 'Brasil',
      emoji: '🇧🇷'
    },
    area_atuacao: 'Edtech',
    estagio: 'Ideação',
    meta_captacao: 300000,
    equity_oferecido: 25,
    valuation_calculado: 1200000,
    status: 'Em Análise',
    data_fundacao: '2024-01-10',
    site: 'https://edutechlearn.com.br',
    logo_url: 'https://via.placeholder.com/200x200/10b981/ffffff?text=EL',
    descritivo_basico: 'Plataforma de ensino adaptativo com IA',
    total_captado: 0,
    total_investidores: 0,
    tokens: 15000,
    current_tokens: 5000,
    created_at: '2024-01-10T12:00:00Z',
    updated_at: '2024-01-10T12:00:00Z'
  },
  {
    id: 4,
    nome: 'AgriTech Pro',
    cnpj: '78.901.234/0001-56',
    pais: {
      iso3: 'BRA',
      nome: 'Brasil',
      emoji: '🇧🇷'
    },
    area_atuacao: 'Agrotech',
    estagio: 'Tração',
    meta_captacao: 2000000,
    equity_oferecido: 18,
    valuation_calculado: 11111111.11,
    status: 'Ativa',
    data_fundacao: '2021-09-05',
    site: 'https://agritechpro.com.br',
    logo_url: 'https://via.placeholder.com/200x200/f59e0b/ffffff?text=AP',
    descritivo_basico: 'Agricultura de precisão com IoT e IA',
    total_captado: 1750000,
    total_investidores: 67,
    tokens: 15000,
    current_tokens: 5000,
    created_at: '2023-05-20T14:30:00Z',
    updated_at: '2024-01-22T09:15:00Z'
  },
  {
    id: 5,
    nome: 'RetailTech Smart',
    cnpj: '23.456.789/0001-34',
    pais: {
      iso3: 'BRA',
      nome: 'Brasil',
      emoji: '🇧🇷'
    },
    area_atuacao: 'Retailtech',
    estagio: 'MVP',
    meta_captacao: 800000,
    equity_oferecido: 22,
    valuation_calculado: 3636363.64,
    status: 'Pausada',
    data_fundacao: '2023-11-12',
    site: 'https://retailtechsmart.com.br',
    logo_url: 'https://via.placeholder.com/200x200/8b5cf6/ffffff?text=RS',
    descritivo_basico: 'Automação inteligente para varejo',
    total_captado: 200000,
    total_investidores: 15,
    tokens: 15000,
    current_tokens: 5000,
    created_at: '2023-12-01T11:45:00Z',
    updated_at: '2024-01-05T13:30:00Z'
  },
  {
    id: 6,
    nome: 'LawTech Digital',
    cnpj: '56.789.012/0001-67',
    pais: {
      iso3: 'BRA',
      nome: 'Brasil',
      emoji: '🇧🇷'
    },
    area_atuacao: 'Lawtech',
    estagio: 'ScaleUp',
    meta_captacao: 5000000,
    equity_oferecido: 12,
    valuation_calculado: 41666666.67,
    status: 'Ativa',
    data_fundacao: '2020-04-18',
    site: 'https://lawtechdigital.com.br',
    logo_url: 'https://via.placeholder.com/200x200/06b6d4/ffffff?text=LD',
    descritivo_basico: 'Automação jurídica e gestão de escritórios',
    total_captado: 4200000,
    total_investidores: 89,
    tokens: 15000,
    current_tokens: 5000,
    created_at: '2023-02-14T09:20:00Z',
    updated_at: '2024-01-19T17:40:00Z'
  }
]

export const mockStartupStats: StartupStats = {
  investimento_total: {
    valor: 6950000,
    moeda: 'BRL',
    formatado: 'R$ 6.950.000,00',
    variacao_mes_anterior: 15.5,
    tipo_variacao: 'aumento'
  },
  total_investidores: {
    quantidade: 238,
    unicos: true,
    variacao_mes_anterior: 8,
    tipo_variacao: 'aumento'
  },
  startups_ativas: {
    quantidade: 3,
    status_incluidos: ['Aprovada', 'Ativa'],
    variacao_mes_anterior: 1,
    tipo_variacao: 'aumento'
  },
  startups_pendentes: {
    quantidade: 1,
    status_incluidos: ['Em Análise'],
    variacao_mes_anterior: 0,
    tipo_variacao: 'aumento'
  },
  performance_geral: {
    score: 87,
    classificacao: 'Excelente',
    tendencia: 'crescimento'
  }
}

export const mockStartupHistory: StartupHistory[] = [
  {
    id: 1,
    nome: 'Série Seed',
    valor_objetivo: 500000,
    valor_captado: 375000,
    percentual_atingido: 75,
    status: 'Concluída',
    data_inicio: '2023-06-01',
    data_fim: '2023-08-31',
    numero_investidores: 42,
    equity_oferecido: 15,
    tipo: 'Equity'
  },
  {
    id: 2,
    nome: 'Pré-Série A',
    valor_objetivo: 1200000,
    valor_captado: 650000,
    percentual_atingido: 54.2,
    status: 'Ativa',
    data_inicio: '2024-01-15',
    data_fim: null,
    numero_investidores: 28,
    equity_oferecido: 12,
    tipo: 'Equity'
  },
  {
    id: 3,
    nome: 'Financiamento Ponte',
    valor_objetivo: 200000,
    valor_captado: 200000,
    percentual_atingido: 100,
    status: 'Concluída',
    data_inicio: '2023-12-01',
    data_fim: '2023-12-15',
    numero_investidores: 5,
    equity_oferecido: 0,
    tipo: 'Debt'
  }
]

export const mockStartupInvestors: StartupInvestor[] = [
  {
    id: 1,
    nome: 'João Silva Investimentos',
    email: 'j***@email.com',
    email_completo: null,
    total_investido: 25000,
    total_tokens: 250,
    data_primeiro_investimento: '2023-07-15',
    data_ultimo_investimento: '2023-12-20',
    numero_investimentos: 3,
    perfil_publico: true,
    foto_url: 'https://via.placeholder.com/100x100/3b82f6/ffffff?text=JS',
    localizacao: {
      cidade: 'São Paulo',
      uf: 'SP',
      pais: 'Brasil'
    }
  },
  {
    id: 2,
    nome: 'Maria Santos',
    email: 'm***@gmail.com',
    email_completo: null,
    total_investido: 15000,
    total_tokens: 150,
    data_primeiro_investimento: '2023-08-01',
    data_ultimo_investimento: '2023-11-15',
    numero_investimentos: 2,
    perfil_publico: true,
    foto_url: 'https://via.placeholder.com/100x100/ef4444/ffffff?text=MS',
    localizacao: {
      cidade: 'Rio de Janeiro',
      uf: 'RJ',
      pais: 'Brasil'
    }
  },
  {
    id: 3,
    nome: 'Investidor Anônimo',
    email: '****@****.***',
    email_completo: null,
    total_investido: 50000,
    total_tokens: 500,
    data_primeiro_investimento: '2023-06-20',
    data_ultimo_investimento: '2024-01-10',
    numero_investimentos: 5,
    perfil_publico: false,
    foto_url: null,
    localizacao: null
  }
]

export const mockCountries = [
  {
    id: 32,
    name: 'Brazil',
    iso3: 'BRA',
    iso2: 'BR',
    emoji: '🇧🇷',
    native: 'Brasil',
    currency: 'BRL',
    currency_symbol: 'R$'
  },
  {
    id: 231,
    name: 'United States',
    iso3: 'USA',
    iso2: 'US',
    emoji: '🇺🇸',
    native: 'United States',
    currency: 'USD',
    currency_symbol: '$'
  },
  {
    id: 76,
    name: 'Germany',
    iso3: 'DEU',
    iso2: 'DE',
    emoji: '🇩🇪',
    native: 'Deutschland',
    currency: 'EUR',
    currency_symbol: '€'
  }
]