export interface Country {
  id: number
  name: string
  iso3: string
  iso2: string
  emoji: string
  native: string
  currency: string
  currency_symbol: string
  region?: string
}

export interface Startup {
  id: number
  nome: string
  cnpj: string
  pais: {
    iso3: string
    nome: string
    emoji: string
  }
  area_atuacao: string
  estagio: string
  status: 'Em Análise' | 'Aprovada' | 'Ativa' | 'Pausada' | 'Rejeitada'
  data_fundacao: string
  campanha: CampanhaStartup[]
  created_at: string
  updated_at: string
}

export type CampanhaStartup = {
  id: number,
  status: 'Em Análise' | 'Aprovada' | 'Ativa' | 'Pausada' | 'Pausado' | 'Rejeitada' | 'Inativo' | 'Concluído', // ex: Ativa
  dt_inicio: string, // ex: 2023-06-15
  dt_fim: string, // 6 messes depois do inicio ex: 2023-12-15
  meta_captacao: number, // ex: 500000
  equity_oferecido: number, // ex: 15
}

export interface StartupStats {
  investimento_total: {
    valor: number
    moeda: string
    formatado: string
    variacao_mes_anterior: number
    tipo_variacao: 'aumento' | 'diminuicao'
  }
  total_investidores: {
    quantidade: number
    unicos: boolean
    variacao_mes_anterior: number
    tipo_variacao: 'aumento' | 'diminuicao'
  }
  startups_ativas: {
    quantidade: number
    status_incluidos: string[]
    variacao_mes_anterior: number
    tipo_variacao: 'aumento' | 'diminuicao'
  }
  startups_pendentes: {
    quantidade: number
    status_incluidos: string[]
    variacao_mes_anterior: number
    tipo_variacao: 'aumento' | 'diminuicao'
  }
  performance_geral: {
    score: number
    classificacao: string
    tendencia: string
  }
}

export interface RedeSocial {
  id: number
  nome: string
  url: string
}

export interface BancoInfo {
  nome: string
  agencia: string
  conta: string
  tipo: string
  nome_titular: string
}

export interface StartupFormData {
  nome: string
  razao_social: string
  cnpj: string
  pais: {
    iso3: string
    nome: string
    emoji: string
  }
  area_atuacao: string
  estagio: string
  campanha: CampanhaStartup[]
  valuation_calculado: number
  redes: RedeSocial[]
  status: string
  data_fundacao: string
  site: string
  logo_url: string
  descritivo_basico: string
  total_captado: number
  pdf_url: string
  youtube_url: string
  banco: BancoInfo
  // Pitch Detalhado
  problema?: string
  solucao?: string
  diferencial?: string
  modelo_receita?: string
  mercado_alvo?: string
  compradores?: string
  // Localização e Mercado
  estado?: string
  idiomas?: string
  tamanho_mercado?: number
  concorrentes?: string
  // Campos adicionais para Edição Avançada
  recursos?: {
    fundados: number
    desenvolvimento: number
    comercial: number
    marketing: number
    nuvem: number
    juridico: number
    reserva: number
  }
  socios?: Array<{ id: number; nome: string; porcentagem: number; percentual_time: string }>
  teams?: Array<{ id: number; nome: string; cargo: string; foto_url: string }>
  part_lucro?: boolean
  part_lucro_regras?: string
  beneficios?: boolean
  beneficios_regras?: string
  termos?: boolean
  repasse?: boolean
  premio?: boolean
  premio_dt?: string
  premio_pg?: string
  ativo?: string
  ativo_adm?: string
  selos?: Array<{ id: number; nome: string; url: string }>
}

export interface StartupFilters {
  page?: number
  limit?: number
  search?: string
  status?: string
  area_atuacao?: string
  estagio?: string
  meta_min?: number
  meta_max?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface StartupsPaginatedResponse {
  startups: Startup[]
  pagination: {
    current_page: number
    total_pages: number
    per_page: number
    total_items: number
    has_next: boolean
    has_previous: boolean
  }
  filters_applied: {
    search?: string
    status?: string
    area_atuacao?: string
  }
}

export interface StartupHistory {
  id: number
  nome: string
  valor_objetivo: number
  valor_captado: number
  percentual_atingido: number
  status: 'Concluída' | 'Ativa' | 'Pausada' | 'Cancelada'
  data_inicio: string
  data_fim: string | null
  numero_investidores: number
  equity_oferecido: number
  tipo: 'Equity' | 'Debt'
}

export interface StartupInvestor {
  id: number
  nome: string
  email: string
  email_completo?: string | null
  total_investido: number
  total_tokens: number
  data_primeiro_investimento: string
  data_ultimo_investimento: string
  numero_investimentos: number
  perfil_publico: boolean
  foto_url?: string | null
  localizacao?: {
    cidade: string
    uf: string
    pais: string
  } | null
}

export const AREA_ATUACAO_OPTIONS = [
  'Fintech',
  'Healthtech',
  'Edtech',
  'Agrotech',
  'Retailtech',
  'Lawtech',
  'Construtech',
  'Foodtech',
  'SaaS',
  'Marketplace'
] as const

export const ESTAGIO_OPTIONS = [
  'Ideação',
  'MVP',
  'Operação',
  'Tração',
  'ScaleUp',
  'Incubadora',
  'Aceleradora'
] as const

export const STATUS_OPTIONS = [
  'Em Análise',
  'Aprovada',
  'Ativa',
  'Pausada',
  'Rejeitada'
] as const

export type AreaAtuacao = typeof AREA_ATUACAO_OPTIONS[number]
export type Estagio = typeof ESTAGIO_OPTIONS[number]
export type StartupStatus = typeof STATUS_OPTIONS[number]