import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  TrendingUp, 
  Users, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText,
  Rocket,
  ChevronRight,
  Edit3,
  Eye,
  BarChart3,
  XCircle
} from 'lucide-react';

// ============================================
// MOCK DATA
// ============================================

const mockStartups = [
  {
    id: '1',
    name: 'FinFlow',
    segment: 'FinTech',
    logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
    status: 'approved', // approved, analysis, rejected, draft
    campaign: {
      status: 'open', // open, editing, funded, closed
      raised: 630000,
      goal: 840000,
      percentage: 75,
      investors: 234,
      daysLeft: 12
    },
    createdAt: '01 Dez 2025'
  },
  {
    id: '2',
    name: 'AgriTech Pro',
    segment: 'AgTech',
    logo: 'https://images.unsplash.com/photo-1595856763437-14732d0f3933?w=100&h=100&fit=crop',
    status: 'approved',
    campaign: {
      status: 'editing',
      raised: 0,
      goal: 1200000,
      percentage: 0,
      investors: 0,
      daysLeft: null
    },
    createdAt: '15 Jan 2026'
  },
  {
    id: '3',
    name: 'HealthSync',
    segment: 'HealthTech',
    logo: 'https://images.unsplash.com/photo-1555421689-d68471e18963?w=100&h=100&fit=crop',
    status: 'analysis',
    campaign: null,
    createdAt: '20 Jan 2026'
  }
];

// ============================================
// COMPONENTS UI
// ============================================

const Badge = ({ status, type = 'platform' }) => {
  const styles = {
    platform: {
      approved: { label: 'Aprovada', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
      analysis: { label: 'Em Análise', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      rejected: { label: 'Rejeitada', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
      draft: { label: 'Rascunho', className: 'bg-stone-800 text-stone-400 border-stone-700' }
    },
    campaign: {
      open: { label: 'Captação Aberta', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      editing: { label: 'Configurando Oferta', className: 'bg-stone-800 text-stone-300 border-stone-700' },
      funded: { label: 'Financiada', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
      closed: { label: 'Encerrada', className: 'bg-stone-800 text-stone-500 border-stone-700' }
    }
  };

  const config = styles[type][status] || { label: status, className: 'bg-stone-800 text-stone-400' };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider ${config.className}`}>
      {config.label}
    </span>
  );
};

const ProgressBar = ({ percentage }) => (
  <div className="h-2 w-full bg-stone-800 rounded-full overflow-hidden">
    <div 
      className="h-full bg-blue-600 rounded-full transition-all duration-500"
      style={{ width: `${percentage}%` }}
    />
  </div>
);

// ============================================
// COMPONENT: STARTUP ROW CARD
// ============================================

const StartupRow = ({ startup }) => {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 hover:border-stone-700 transition-all duration-200 group">
      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
        
        {/* 1. Identity */}
        <div className="flex items-center gap-4 min-w-60">
          <div className="w-14 h-14 rounded-xl bg-stone-800 border border-stone-700 overflow-hidden shrink-0">
            {startup.logo ? (
              <img src={startup.logo} alt={startup.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-500">
                <Rocket className="w-6 h-6" />
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-50 group-hover:text-blue-400 transition-colors">
              {startup.name}
            </h3>
            <p className="text-sm text-stone-500">{startup.segment}</p>
          </div>
        </div>

        {/* 2. Platform Status */}
        <div className="min-w-35">
          <p className="text-xs text-stone-500 mb-1.5 uppercase font-semibold">Status Plataforma</p>
          <Badge status={startup.status} type="platform" />
        </div>

        {/* 3. Campaign Data (Conditional) */}
        <div className="flex-1 w-full lg:w-auto">
          <p className="text-xs text-stone-500 mb-1.5 uppercase font-semibold">Campanha</p>
          {startup.campaign ? (
            <div className="bg-stone-950/50 rounded-lg p-3 border border-stone-800/50">
              <div className="flex justify-between items-center mb-2">
                <Badge status={startup.campaign.status} type="campaign" />
                {startup.campaign.status === 'open' && (
                  <span className="text-xs text-stone-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {startup.campaign.daysLeft} dias
                  </span>
                )}
              </div>
              
              {startup.campaign.status === 'open' || startup.campaign.status === 'funded' ? (
                <>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-stone-300">
                      <strong className="text-stone-50">R$ {(startup.campaign.raised / 1000).toFixed(0)}k</strong> captados
                    </span>
                    <span className="text-blue-400 font-bold">{startup.campaign.percentage}%</span>
                  </div>
                  <ProgressBar percentage={startup.campaign.percentage} />
                </>
              ) : (
                <p className="text-xs text-stone-500">
                  {startup.campaign.status === 'editing' ? 'Defina os termos da oferta para iniciar.' : 'Campanha não ativa.'}
                </p>
              )}
            </div>
          ) : (
            <div className="text-xs text-stone-500 italic flex items-center gap-2 h-16.5">
              <AlertCircle className="w-4 h-4" />
              Nenhuma campanha criada
            </div>
          )}
        </div>

        {/* 4. Actions */}
        <div className="flex items-center gap-2 w-full lg:w-auto lg:justify-end border-t lg:border-t-0 border-stone-800 pt-4 lg:pt-0 mt-2 lg:mt-0">
          <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-medium rounded-lg transition-colors">
            <Edit3 className="w-4 h-4" />
            <span>Editar</span>
          </button>
          <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-medium rounded-lg transition-colors">
            <Eye className="w-4 h-4" />
            <span>Ver</span>
          </button>
          <button className="p-2 text-stone-500 hover:text-stone-300 hover:bg-stone-800 rounded-lg transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function StartupDashboardPage() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Lógica de filtro simples (Frontend)
  const filteredStartups = mockStartups.filter(startup => {
    const matchesSearch = startup.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          startup.segment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || startup.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-stone-950 text-stone-50 p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* 1. Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-stone-50 tracking-tight">Minhas Startups</h1>
            <p className="text-stone-400 mt-1">Gerencie seus projetos e acompanhe o progresso das rodadas.</p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95">
            <Plus className="w-5 h-5" />
            Criar Nova Startup
          </button>
        </div>

        {/* 2. Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou segmento..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 text-stone-200 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all placeholder:text-stone-600"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {['all', 'approved', 'analysis', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap border transition-colors ${
                  filterStatus === status 
                    ? 'bg-stone-800 text-stone-50 border-stone-700' 
                    : 'bg-stone-900 text-stone-400 border-stone-800 hover:border-stone-700 hover:text-stone-300'
                }`}
              >
                {status === 'all' ? 'Todas' : 
                 status === 'approved' ? 'Aprovadas' : 
                 status === 'analysis' ? 'Em Análise' : 'Rejeitadas'}
              </button>
            ))}
          </div>
        </div>

        {/* 3. List Content */}
        <div className="space-y-4">
          {filteredStartups.length > 0 ? (
            filteredStartups.map((startup) => (
              <StartupRow key={startup.id} startup={startup} />
            ))
          ) : (
            // Empty State
            <div className="flex flex-col items-center justify-center py-20 bg-stone-900/50 border border-dashed border-stone-800 rounded-2xl text-center">
              <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mb-4">
                {searchTerm ? <Search className="w-8 h-8 text-stone-500" /> : <Rocket className="w-8 h-8 text-stone-500" />}
              </div>
              <h3 className="text-xl font-semibold text-stone-200 mb-2">
                {searchTerm ? 'Nenhum resultado encontrado' : 'Comece sua jornada'}
              </h3>
              <p className="text-stone-400 max-w-sm mb-6">
                {searchTerm 
                  ? `Não encontramos nenhuma startup com o termo "${searchTerm}".` 
                  : 'Você ainda não cadastrou nenhuma startup. Crie seu primeiro projeto para começar a captar investimento.'}
              </p>
              {!searchTerm && (
                <button className="flex items-center gap-2 px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-xl transition-colors border border-stone-700">
                  <Plus className="w-4 h-4" />
                  Criar minha primeira startup
                </button>
              )}
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium hover:underline"
                >
                  Limpar busca
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
