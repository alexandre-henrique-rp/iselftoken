import { 
  Startup, 
  StartupStats, 
  StartupFilters, 
  StartupsPaginatedResponse,
  StartupFormData,
  StartupHistory,
  StartupInvestor,
  Country
} from '@/types/startup'
import { 
  mockStartups, 
  mockStartupStats, 
  mockStartupHistory, 
  mockStartupInvestors,
  mockCountries 
} from '@/data/mock/startups-mock'

// Simulate network delay
const delay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms))

export async function getStartupsStats(): Promise<StartupStats> {
  console.log('API Call: GET /api/startups/stats')
  
  await delay(300)
  
  return mockStartupStats
}

export async function getStartupsData(filters: StartupFilters): Promise<{
  startups: Startup[]
  totalCount: number
  pagination: any
}> {
  console.log('API Call: GET /api/startups', {
    filters,
    timestamp: new Date().toISOString()
  })
  
  await delay(500)
  
  let filteredStartups = [...mockStartups]
  
  // Apply search filter
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase()
    filteredStartups = filteredStartups.filter(startup =>
      startup.nome.toLowerCase().includes(searchTerm) ||
      startup.cnpj.includes(searchTerm.replace(/[^\d]/g, ''))
    )
  }
  
  // Apply status filter
  if (filters.status && filters.status !== 'all') {
    filteredStartups = filteredStartups.filter(startup =>
      startup.status === filters.status
    )
  }
  
  // Apply area filter
  if (filters.area_atuacao && filters.area_atuacao !== 'all') {
    filteredStartups = filteredStartups.filter(startup =>
      startup.area_atuacao === filters.area_atuacao
    )
  }
  
  // Apply estagio filter
  if (filters.estagio && filters.estagio !== 'all') {
    filteredStartups = filteredStartups.filter(startup =>
      startup.estagio === filters.estagio
    )
  }
  
  // Apply meta captacao filters
  if (filters.meta_min) {
    filteredStartups = filteredStartups.filter(startup =>
      startup.meta_captacao >= filters.meta_min!
    )
  }
  
  if (filters.meta_max) {
    filteredStartups = filteredStartups.filter(startup =>
      startup.meta_captacao <= filters.meta_max!
    )
  }
  
  // Apply sorting
  if (filters.sort_by) {
    filteredStartups.sort((a, b) => {
      let aValue: any = a[filters.sort_by as keyof Startup]
      let bValue: any = b[filters.sort_by as keyof Startup]
      
      // Handle specific fields
      if (filters.sort_by === 'nome') {
        aValue = a.nome.toLowerCase()
        bValue = b.nome.toLowerCase()
      } else if (filters.sort_by === 'meta_captacao') {
        aValue = a.meta_captacao
        bValue = b.meta_captacao
      } else if (filters.sort_by === 'data_fundacao') {
        aValue = new Date(a.data_fundacao)
        bValue = new Date(b.data_fundacao)
      }
      
      if (filters.sort_order === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      }
    })
  }
  
  // Apply pagination
  const page = filters.page || 1
  const limit = filters.limit || 10
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  
  const paginatedStartups = filteredStartups.slice(startIndex, endIndex)
  const totalCount = filteredStartups.length
  
  const pagination = {
    current_page: page,
    total_pages: Math.ceil(totalCount / limit),
    per_page: limit,
    total_items: totalCount,
    has_next: endIndex < totalCount,
    has_previous: page > 1
  }
  
  return {
    startups: paginatedStartups,
    totalCount,
    pagination
  }
}

export async function createStartup(data: StartupFormData): Promise<Startup> {
  console.log('API Call: POST /api/startups', {
    data,
    timestamp: new Date().toISOString()
  })
  
  // Simulate validation delay
  await delay(2000)
  
  // Simulate validation errors (10% chance)
  if (Math.random() < 0.1) {
    throw new Error('Erro de validação: CNPJ já está em uso')
  }
  
  // Create new startup
  const newStartup: Startup = {
    id: Math.max(...mockStartups.map(s => s.id)) + 1,
    nome: data.nome,
    cnpj: data.cnpj,
    pais: {
      iso3: data.pais,
      nome: mockCountries.find(c => c.iso3 === data.pais)?.native || 'Unknown',
      emoji: mockCountries.find(c => c.iso3 === data.pais)?.emoji || '🏳️'
    },
    area_atuacao: data.area_atuacao,
    estagio: data.estagio,
    meta_captacao: data.meta_captacao,
    equity_oferecido: data.equity_oferecido,
    valuation_calculado: (data.meta_captacao / data.equity_oferecido) * 100,
    status: 'Em Análise',
    data_fundacao: data.data_fundacao.toISOString().split('T')[0],
    site: data.site,
    logo_url: data.logo,
    descritivo_basico: data.descritivo_basico,
    total_captado: 0,
    total_investidores: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  // Add to mock data (in real app, this would be saved to database)
  mockStartups.push(newStartup)
  
  return newStartup
}

export async function updateStartup(id: number, data: Partial<StartupFormData>): Promise<Startup> {
  console.log('API Call: PUT /api/startups/' + id, {
    data,
    timestamp: new Date().toISOString()
  })
  
  await delay(1500)
  
  const startupIndex = mockStartups.findIndex(s => s.id === id)
  if (startupIndex === -1) {
    throw new Error('Startup não encontrada')
  }
  
  // Update startup
  const updatedStartup = {
    ...mockStartups[startupIndex],
    ...data,
    updated_at: new Date().toISOString()
  }
  
  mockStartups[startupIndex] = updatedStartup as Startup
  
  return updatedStartup as Startup
}

export async function deleteStartup(id: number): Promise<void> {
  console.log('API Call: DELETE /api/startups/' + id, {
    timestamp: new Date().toISOString()
  })
  
  await delay(1000)
  
  const startupIndex = mockStartups.findIndex(s => s.id === id)
  if (startupIndex === -1) {
    throw new Error('Startup não encontrada')
  }
  
  // Check if startup has active investments (simulate business rule)
  const startup = mockStartups[startupIndex]
  if (startup.total_captado > 0) {
    throw new Error('Não é possível excluir startup com investimentos ativos')
  }
  
  // Remove from mock data
  mockStartups.splice(startupIndex, 1)
}

export async function getStartupHistory(startupId: number): Promise<StartupHistory[]> {
  console.log('API Call: GET /api/startups/' + startupId + '/history', {
    timestamp: new Date().toISOString()
  })
  
  await delay(800)
  
  // Return mock history (in real app, filter by startup ID)
  return mockStartupHistory
}

export async function getStartupInvestors(startupId: number, page: number = 1, limit: number = 20): Promise<{
  investidores: StartupInvestor[]
  estatisticas: any
  pagination: any
}> {
  console.log('API Call: GET /api/startups/' + startupId + '/investors', {
    page,
    limit,
    timestamp: new Date().toISOString()
  })
  
  await delay(1000)
  
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedInvestors = mockStartupInvestors.slice(startIndex, endIndex)
  
  return {
    investidores: paginatedInvestors,
    estatisticas: {
      total_investidores: mockStartupInvestors.length,
      total_publicos: mockStartupInvestors.filter(i => i.perfil_publico).length,
      total_anonimos: mockStartupInvestors.filter(i => !i.perfil_publico).length,
      ticket_medio: 30000,
      investimento_total: 1250000,
      distribuicao_geografica: {
        'SP': 15,
        'RJ': 8,
        'MG': 3,
        'Outros': 4
      }
    },
    pagination: {
      current_page: page,
      total_pages: Math.ceil(mockStartupInvestors.length / limit),
      per_page: limit,
      total_items: mockStartupInvestors.length
    }
  }
}

export async function getCountries(): Promise<Country[]> {
  console.log('API Call: GET /api/countries (External API)', {
    url: 'http://3.23.98.16/apiV0/countries',
    timestamp: new Date().toISOString()
  })
  
  await delay(1200)
  
  // In real implementation, this would call the external API
  // For now, return mock data
  return mockCountries
}

export async function uploadFile(file: File, type: 'logo' | 'document' | 'image'): Promise<{
  file_id: string
  url: string
  original_name: string
  size: number
}> {
  console.log('API Call: POST /api/uploads', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    type,
    timestamp: new Date().toISOString()
  })
  
  await delay(2000)
  
  // Simulate upload
  return {
    file_id: `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    url: `https://cdn.exemplo.com/uploads/${file.name}`,
    original_name: file.name,
    size: file.size
  }
}