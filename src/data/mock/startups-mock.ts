import { Startup, StartupStats } from '@/types/startup';

// Mock data para histórico
export const mockStartupHistory = [
  {
    id: 1,
    startup_id: 1,
    tipo_evento: 'status_change',
    descricao: 'Status alterado de Em Análise para Aprovada',
    data_evento: '2024-01-15T10:30:00Z',
    usuario_responsavel: 'admin@iselftoken.com',
    dados_anteriores: { status: 'Em Análise' },
    dados_novos: { status: 'Aprovada' }
  },
  {
    id: 2,
    startup_id: 1,
    tipo_evento: 'campanha_created',
    descricao: 'Campanha criada',
    data_evento: '2024-01-16T14:20:00Z',
    usuario_responsavel: 'admin@iselftoken.com',
    dados_anteriores: null,
    dados_novos: { campanha_id: 1, meta_captacao: 500000 }
  }
];

// Mock data para investidores
export const mockStartupInvestors = [
  {
    id: 1,
    startup_id: 1,
    nome_investidor: 'Investidor Anjo Silva',
    email: 'silva@investor.com',
    telefone: '(11) 98765-4321',
    valor_investido: 50000,
    data_investimento: '2024-01-20T10:00:00Z',
    percentual_equity: 2.5,
    status: 'Ativo'
  },
  {
    id: 2,
    startup_id: 1,
    nome_investidor: 'VC Partners',
    email: 'contact@vcp.com',
    telefone: '(11) 12345-6789',
    valor_investido: 100000,
    data_investimento: '2024-01-25T15:30:00Z',
    percentual_equity: 5.0,
    status: 'Ativo'
  }
];

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
    status: 'Aprovada',
    data_fundacao: '2023-06-15',
    campanha: [
      {
        id: 1,
        status: 'Ativa',
        dt_inicio: '2023-06-15',
        dt_fim: '2023-12-15',
        meta_captacao: 500000,
        equity_oferecido: 15
      }
    ],
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
    status: 'Ativa',
    data_fundacao: '2022-03-20',
    campanha: [
      {
        id: 1,
        status: 'Concluído',
        dt_inicio: '2023-06-15',
        dt_fim: '2023-12-15',
        meta_captacao: 500000,
        equity_oferecido: 15
      },
      {
        id: 2,
        status: 'Ativa',
        dt_inicio: '2023-06-15',
        dt_fim: '2023-12-15',
        meta_captacao: 500000,
        equity_oferecido: 15
      }
    ],
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
    status: 'Em Análise',
    campanha: [],
    data_fundacao: '2024-01-10',
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
    status: 'Ativa',
    campanha: [],
    data_fundacao: '2021-09-05',
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
    status: 'Pausada',
    campanha: [],
    data_fundacao: '2023-11-12',
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
    status: 'Ativa',
    campanha: [],
    data_fundacao: '2020-04-18',
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
