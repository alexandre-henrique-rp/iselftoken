import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  LogOut, 
  User, 
  ChevronRight, 
  ChevronLeft,
  TrendingUp, 
  ShieldCheck, 
  Rocket, 
  Clock,
  MapPin,
  ArrowUpRight,
  Globe,
  Linkedin,
  Youtube,
  ExternalLink,
  Briefcase,
  Shield,
  GraduationCap,
  Cpu,
  Database,
  MoreHorizontal,
  Users,
  CheckCircle,
  Filter
} from 'lucide-react';

// ============================================
// MOCK DATA (Cards & Carousels)
// ============================================

const mockBanners = [
  {
    id: 1,
    title: "Demo Day iSelfToken 2026",
    description: "Conheça as startups mais promissoras do ano em um evento exclusivo para investidores.",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop",
    category: "Evento"
  },
  {
    id: 2,
    title: "Nova Regulamentação CVM",
    description: "Entenda o que muda para o investidor de equity crowdfunding com a nova resolução.",
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=2070&auto=format&fit=crop",
    category: "Aviso"
  },
  {
    id: 3,
    title: "Webinar: Análise de Startups",
    description: "Aprenda a analisar métricas de SaaS com nossos especialistas de mercado.",
    image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=2070&auto=format&fit=crop",
    category: "Educação"
  }
];

const mockStartupsRodada = [
  { 
    id: 1, 
    name: 'FinFlow', 
    description: 'Plataforma de gestão financeira para PMEs com IA integrada que automatiza conciliação.', 
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop', 
    valuation: '15%', 
    currentValue: 'R$ 4.2M', 
    totalTokens: 10000, 
    soldTokens: 7500, 
    badges: ['Verificada', 'Top Pick'],
    minInvestment: 'R$ 100',
    deadline: '12 dias',
    investors: 234,
    category: 'FinTech'
  },
  { 
    id: 2, 
    name: 'HealthSync', 
    description: 'Telemedicina com diagnóstico assistido por machine learning.', 
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=250&fit=crop', 
    valuation: '12%', 
    currentValue: 'R$ 6.8M', 
    totalTokens: 15000, 
    soldTokens: 9200, 
    badges: ['Verificada'],
    minInvestment: 'R$ 250',
    deadline: '8 dias',
    investors: 412,
    category: 'HealthTech'
  },
  { 
    id: 3, 
    name: 'EduNext', 
    description: 'Plataforma adaptativa de ensino personalizado K-12 que usa IA.', 
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=250&fit=crop', 
    valuation: '18%', 
    currentValue: 'R$ 3.1M', 
    totalTokens: 8000, 
    soldTokens: 4800, 
    badges: ['Acelerada', 'ESG'],
    minInvestment: 'R$ 50',
    deadline: '21 dias',
    investors: 156,
    category: 'EdTech'
  },
  { 
    id: 4, 
    name: 'AgriTech Pro', 
    description: 'IoT para agricultura de precisão e sustentabilidade.', 
    image: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=250&fit=crop', 
    valuation: '20%', 
    currentValue: 'R$ 2.5M', 
    totalTokens: 12000, 
    soldTokens: 6000, 
    badges: ['Verificada', 'ESG'],
    minInvestment: 'R$ 150',
    deadline: '15 dias',
    investors: 189,
    category: 'AgTech'
  }
];

const mockStartupsVerificadas = [
  { id: 6, name: 'PaySmart', description: 'Soluções de pagamento para economia digital', category: 'FinTech', badges: ['Verificada', 'Compliance'] },
  { id: 7, name: 'MedTrack', description: 'Rastreamento de medicamentos na cadeia farmacêutica', category: 'HealthTech', badges: ['Verificada'] },
  { id: 8, name: 'LearnHub', description: 'Microlearning para treinamento corporativo', category: 'EdTech', badges: ['Verificada', 'B2B'] },
  { id: 9, name: 'DataVault', description: 'Segurança de dados com criptografia quântica', category: 'Tech / IA', badges: ['Verificada'] },
];

const mockStartupsAceleradas = [
  { id: 10, name: 'CloudSync', description: 'Sincronização multi-cloud para enterprises', category: 'SaaS', badges: ['Acelerada'] },
  { id: 11, name: 'BioSense', description: 'Wearables para monitoramento de saúde', category: 'HealthTech', badges: ['Acelerada', 'Hardware'] },
  { id: 12, name: 'TutorAI', description: 'Tutoria virtual com IA generativa', category: 'EdTech', badges: ['Acelerada'] },
  { id: 13, name: 'GreenChain', description: 'Blockchain para créditos de carbono', category: 'Tech / IA', badges: ['Acelerada', 'ESG'] },
];

const mockStartupsAprovacao = [
  { id: 14, name: 'FoodTech Lab', description: 'Proteínas alternativas e food science', category: 'Outros', badges: ['Em Aprovação'] },
  { id: 15, name: 'PropTech Now', description: 'Tokenização de ativos imobiliários', category: 'FinTech', badges: ['Em Aprovação'] },
  { id: 16, name: 'SkillPath', description: 'Plataforma de upskilling baseada em dados', category: 'EdTech', badges: ['Em Aprovação'] },
];

const mockOportunidades = [
  { id: 17, name: 'CryptoSafe', type: 'FinTech', icon: Briefcase },
  { id: 18, name: 'HealthAI', type: 'HealthTech', icon: Shield },
  { id: 19, name: 'EduFlow', type: 'EdTech', icon: GraduationCap },
  { id: 20, name: 'AICore', type: 'Tech / IA', icon: Cpu },
  { id: 21, name: 'CloudOps', type: 'SaaS', icon: Database },
  { id: 22, name: 'BioGen', type: 'HealthTech', icon: Shield },
  { id: 23, name: 'PayFlow', type: 'FinTech', icon: Briefcase },
  { id: 24, name: 'LearnX', type: 'EdTech', icon: GraduationCap },
  { id: 25, name: 'DataMesh', type: 'Tech / IA', icon: Cpu },
  { id: 26, name: 'AutoSync', type: 'SaaS', icon: Database },
  { id: 27, name: 'GreenTech', type: 'Outros', icon: MoreHorizontal },
  { id: 28, name: 'SmartPay', type: 'FinTech', icon: Briefcase },
];

const filterOptions = [
  { key: 'all', label: 'Todas' },
  { key: 'fintech', label: 'FinTech' },
  { key: 'healthtech', label: 'HealthTech' },
  { key: 'edtech', label: 'EdTech' },
  { key: 'tech-ia', label: 'Tech / IA' },
  { key: 'saas', label: 'SaaS' },
  { key: 'outros', label: 'Outros' },
];

// ============================================
// COMPONENTES UI
// ============================================

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-stone-800 text-stone-300 border-stone-700',
    primary: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    success: 'bg-green-600/20 text-green-400 border-green-500/30',
    warning: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
    brand: 'bg-fuchsia-600/20 text-fuchsia-400 border-fuchsia-500/30',
  };

  const variantMap = {
    'Verificada': 'success',
    'Top Pick': 'brand',
    'Acelerada': 'primary',
    'ESG': 'success',
    'Em Aprovação': 'warning',
    'Compliance': 'success',
    'B2B': 'default',
    'Hardware': 'default',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-md border ${variants[variantMap[children] || variant]}`}>
      {children}
    </span>
  );
};

// ============================================
// COMPONENTE: BANNER ROTATIVO
// ============================================

const BannerSlider = ({ banners }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const duration = 5000;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, duration);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <div className="relative w-[95%] mx-auto h-70 md:h-80 rounded-2xl overflow-hidden shadow-2xl border border-stone-800 group">
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <div className="absolute inset-0">
            <img 
              src={banner.image} 
              alt={banner.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-r from-stone-950 via-stone-900/60 to-transparent" />
          </div>

          <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-16 max-w-3xl">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs font-semibold mb-4 w-fit border border-blue-500/20 backdrop-blur-sm">
              {banner.category}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              {banner.title}
            </h2>
            <p className="text-stone-300 text-lg md:text-xl line-clamp-2">
              {banner.description}
            </p>
          </div>
        </div>
      ))}

      <div className="absolute bottom-6 left-8 md:left-16 z-20 flex gap-3">
        {banners.map((_, index) => (
          <div 
            key={index} 
            className="h-1.5 w-12 bg-stone-700/50 rounded-full overflow-hidden backdrop-blur-sm"
          >
            <div
              className={`h-full bg-white rounded-full ${
                index === currentIndex ? 'animate-progress' : index < currentIndex ? 'w-full' : 'w-0'
              }`}
              style={{
                animationDuration: index === currentIndex ? `${duration}ms` : '0s',
                animationTimingFunction: 'linear',
                animationFillMode: 'forwards'
              }}
            />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes progress { from { width: 0%; } to { width: 100%; } }
        .animate-progress { animation-name: progress; }
      `}</style>
    </div>
  );
};

// ============================================
// CAROUSEL 3D
// ============================================

const Carousel3D = ({ children, title, cardHeight = 600, cardSpacing = 320 }) => {
  const items = React.Children.toArray(children);
  const [activeIndex, setActiveIndex] = useState(0);
  const totalItems = items.length;

  const goNext = () => setActiveIndex((prev) => (prev + 1) % totalItems);
  const goPrev = () => setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);

  const getCardStyle = (index) => {
    let diff = index - activeIndex;
    if (diff > totalItems / 2) diff = diff - totalItems;
    if (diff < -totalItems / 2) diff = diff + totalItems;
    
    const absDiff = Math.abs(diff);
    const direction = diff > 0 ? 1 : -1;
    const offset = direction * (absDiff * cardSpacing + 60);
    const scale = Math.max(0.75, 1 - absDiff * 0.12);
    const opacity = Math.max(0, 1 - absDiff * 0.35);
    const zIndex = 40 - absDiff * 10;
    const brightness = Math.max(0.4, 1 - absDiff * 0.25);
    const rotateY = direction * -8 * Math.min(absDiff, 2);
    
    if (diff === 0) {
      return {
        transform: 'translateX(-50%) scale(1) rotateY(0deg)',
        left: '50%',
        zIndex: 50,
        opacity: 1,
        filter: 'brightness(1)',
        pointerEvents: 'auto',
      };
    }
    
    return {
      transform: `translateX(calc(-50% + ${offset}px)) scale(${scale}) rotateY(${rotateY}deg)`,
      left: '50%',
      zIndex: Math.max(0, zIndex),
      opacity: absDiff > 2 ? 0 : opacity,
      filter: `brightness(${brightness})`,
      pointerEvents: absDiff > 1 ? 'none' : 'auto',
    };
  };

  return (
    <div className="relative mb-8">
      {title && (
        <div className="flex items-center justify-between mb-8 px-4 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-stone-50">{title}</h2>
          <div className="flex gap-2">
            <button onClick={goPrev} className="p-3 rounded-lg bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={goNext} className="p-3 rounded-lg bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      
      <div className="relative overflow-hidden" style={{ height: `${cardHeight}px`, perspective: '1200px' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          {items.map((child, index) => (
            <div
              key={index}
              className="absolute transition-all duration-500 ease-out cursor-pointer"
              style={{ ...getCardStyle(index), transformStyle: 'preserve-3d' }}
              onClick={() => setActiveIndex(index)}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-center gap-2 mt-4">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === activeIndex ? 'bg-blue-500 w-8' : 'bg-stone-700 hover:bg-stone-600 w-2'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================
// CARDS
// ============================================

const RodadaCard = ({ startup }) => {
  const progress = (startup.soldTokens / startup.totalTokens) * 100;
  
  return (
    <div className="min-w-90 max-w-90 bg-stone-900 rounded-xl border border-stone-800 overflow-hidden hover:border-stone-600 transition-all duration-300 group shadow-2xl">
      <div className="relative h-44 overflow-hidden">
        <img 
          src={startup.image} 
          alt={startup.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-linear-to-t from-stone-900 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          {startup.badges.map((badge, i) => <Badge key={i}>{badge}</Badge>)}
        </div>
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 text-xs font-medium rounded-md bg-stone-950/80 text-stone-300 backdrop-blur-sm">
            {startup.category}
          </span>
        </div>
        <div className="absolute bottom-3 right-3">
          <span className={`px-2 py-1 text-xs font-semibold rounded-md flex items-center gap-1 ${parseInt(startup.deadline) <= 5 ? 'bg-red-500/90 text-white' : 'bg-stone-950/80 text-stone-300 backdrop-blur-sm'}`}>
            <Clock className="w-3 h-3" />
            {startup.deadline}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-xl font-bold text-stone-50 mb-2">{startup.name}</h3>
        <p className="text-stone-400 text-sm mb-4 line-clamp-2 leading-relaxed">{startup.description}</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-stone-800/50 rounded-lg p-3">
            <p className="text-stone-500 text-xs mb-1">Equity Ofertado</p>
            <p className="text-stone-50 text-lg font-bold">{startup.valuation}</p>
          </div>
          <div className="bg-stone-800/50 rounded-lg p-3">
            <p className="text-stone-500 text-xs mb-1">Valuation</p>
            <p className="text-stone-50 text-lg font-bold">{startup.currentValue}</p>
          </div>
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-stone-400">Progresso</span>
            <span className="text-blue-400 font-semibold">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2.5 bg-stone-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-linear-to-r from-blue-600 via-blue-500 to-blue-400 rounded-full transition-all duration-500 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between py-3 border-t border-stone-800 mb-4">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-stone-500" />
            <span className="text-stone-400 text-sm">{startup.investors} investidores</span>
          </div>
          <div className="text-right">
            <span className="text-stone-500 text-xs">Mín. </span>
            <span className="text-green-400 text-sm font-semibold">{startup.minInvestment}</span>
          </div>
        </div>
        <button className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group/btn">
          <span>Investir Agora</span>
          <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

const MediumCard = ({ startup }) => (
  <div className="min-w-70 max-w-70 bg-stone-900 rounded-lg border border-stone-800 p-5 hover:border-stone-700 transition-all duration-300">
    <div className="w-12 h-12 rounded-lg bg-linear-to-br from-stone-700 to-stone-800 flex items-center justify-center mb-4">
      <span className="text-xl font-bold text-stone-300">{startup.name.charAt(0)}</span>
    </div>
    <h3 className="text-lg font-semibold text-stone-50 mb-2">{startup.name}</h3>
    <p className="text-stone-400 text-sm mb-3 line-clamp-2">{startup.description}</p>
    <div className="flex flex-wrap gap-2 mb-4">
      {startup.badges.map((badge, i) => <Badge key={i}>{badge}</Badge>)}
    </div>
    <div className="flex items-center justify-between">
      <span className="text-xs text-stone-500">{startup.category}</span>
      <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">Ver mais →</button>
    </div>
  </div>
);

const OportunidadeCard = ({ startup }) => {
  const Icon = startup.icon;
  return (
    <div className="bg-stone-900 rounded-lg border border-stone-800 p-5 hover:border-stone-700 hover:bg-stone-900/80 transition-all duration-300 group cursor-pointer h-full flex flex-col">
      <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center mb-4 group-hover:bg-blue-600/30 transition-colors">
        <Icon className="w-5 h-5 text-blue-400" />
      </div>
      <h3 className="text-base font-semibold text-stone-50 mb-1">{startup.name}</h3>
      <p className="text-stone-500 text-sm mb-3 flex-1">{startup.type}</p>
      <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors flex items-center gap-1 mt-auto">
        Ver mais <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
};

// ============================================
// PÁGINA HOME PRIVADA
// ============================================

export default function HomePage() {
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredOportunidades = activeFilter === 'all'
    ? mockOportunidades
    : mockOportunidades.filter(s => s.type.toLowerCase().replace(' / ', '-').replace(' ', '-') === activeFilter);

  return (
    <div className="min-h-screen bg-stone-950 pb-20 pt-6">
      
      {/* 2. Banner Rotativo (Hero) */}
      <section className="mb-12">
        <BannerSlider banners={mockBanners} />
      </section>

      {/* 3. Seções de Startups com Carousel 3D */}
      
      {/* a. Rodadas de Captação */}
      <section className="mb-12">
        <div className="container mx-auto">
          <Carousel3D title="Rodadas de Captação" cardHeight={600} cardSpacing={320}>
            {mockStartupsRodada.map(startup => (
              <RodadaCard key={startup.id} startup={startup} />
            ))}
          </Carousel3D>
          
          {/* Link Ver Mais */}
          <div className="flex justify-center mt-2">
            <button className="text-sm font-medium text-stone-400 hover:text-blue-400 transition-colors flex items-center gap-1 group">
              Ver todas as rodadas <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* b. Startups Verificadas */}
      <section className="mb-12">
        <div className="container mx-auto">
          <Carousel3D title="Startups Verificadas" cardHeight={320} cardSpacing={260}>
            {mockStartupsVerificadas.map(startup => (
              <MediumCard key={startup.id} startup={startup} />
            ))}
          </Carousel3D>
          
          {/* Link Ver Mais */}
          <div className="flex justify-center mt-2">
            <button className="text-sm font-medium text-stone-400 hover:text-blue-400 transition-colors flex items-center gap-1 group">
              Ver todas verificadas <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* c. Startups Aceleradas */}
      <section className="mb-12 bg-stone-900/20 py-8">
        <div className="container mx-auto">
          <Carousel3D title="Startups Aceleradas" cardHeight={320} cardSpacing={260}>
            {mockStartupsAceleradas.map(startup => (
              <MediumCard key={startup.id} startup={startup} />
            ))}
          </Carousel3D>
          
          {/* Link Ver Mais */}
          <div className="flex justify-center mt-2">
            <button className="text-sm font-medium text-stone-400 hover:text-blue-400 transition-colors flex items-center gap-1 group">
              Ver todas aceleradas <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* d. Em Fase de Aprovação */}
      <section className="mb-12">
        <div className="container mx-auto">
          <Carousel3D title="Em Fase de Aprovação" cardHeight={320} cardSpacing={260}>
            {mockStartupsAprovacao.map(startup => (
              <MediumCard key={startup.id} startup={startup} />
            ))}
          </Carousel3D>
          
          {/* Link Ver Mais */}
          <div className="flex justify-center mt-2">
            <button className="text-sm font-medium text-stone-400 hover:text-blue-400 transition-colors flex items-center gap-1 group">
              Ver todas em aprovação <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* e. Oportunidades de Investimento (Grid) */}
      <section className="px-4 lg:px-8 mb-12">
         <div className="container mx-auto">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
             <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-stone-900 border border-stone-800 text-stone-100">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-stone-50">Todas as Oportunidades</h2>
             </div>

             {/* Filter Buttons */}
             <div className="flex flex-wrap gap-2">
                {filterOptions.map(option => (
                  <button
                    key={option.key}
                    onClick={() => setActiveFilter(option.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
                      activeFilter === option.key
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20'
                        : 'bg-stone-900 text-stone-400 border-stone-800 hover:border-stone-700 hover:text-stone-200 hover:bg-stone-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
             </div>
           </div>
           
           {filteredOportunidades.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in zoom-in duration-300">
                {filteredOportunidades.map((startup) => (
                  <OportunidadeCard key={startup.id} startup={startup} />
                ))}
             </div>
           ) : (
             <div className="text-center py-12 border border-dashed border-stone-800 rounded-xl bg-stone-900/50">
               <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center mx-auto mb-3">
                 <Filter className="w-6 h-6 text-stone-500" />
               </div>
               <p className="text-stone-400 font-medium">Nenhuma oportunidade encontrada nesta categoria.</p>
               <button 
                 onClick={() => setActiveFilter('all')}
                 className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium hover:underline"
               >
                 Limpar filtros
               </button>
             </div>
           )}
           
           {/* Botão Carregar Mais removido conforme solicitado */}
         </div>
      </section>

    </div>
  );
}
