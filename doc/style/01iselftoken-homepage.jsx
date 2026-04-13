import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Globe, Linkedin, Youtube, ExternalLink, Zap, Shield, TrendingUp, Users, CheckCircle, Clock, Rocket, Briefcase, GraduationCap, Cpu, Database, MoreHorizontal } from 'lucide-react';

// Mock Data
const mockStartupsRodada = [
  { 
    id: 1, 
    name: 'FinFlow', 
    description: 'Plataforma de gestão financeira para PMEs com IA integrada que automatiza conciliação bancária, fluxo de caixa e previsões financeiras.', 
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
    description: 'Telemedicina com diagnóstico assistido por machine learning. Conecta pacientes a especialistas e usa IA para triagem inicial.', 
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
    description: 'Plataforma adaptativa de ensino personalizado K-12 que usa IA para criar trilhas de aprendizado únicas para cada aluno.', 
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
    description: 'IoT para agricultura de precisão e sustentabilidade. Sensores inteligentes e drones para monitoramento de lavouras em tempo real.', 
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
  },
  { 
    id: 5, 
    name: 'LogiStream', 
    description: 'Otimização logística com IA para last-mile delivery. Reduz custos em até 40% e tempo de entrega em 25%.', 
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=250&fit=crop', 
    valuation: '14%', 
    currentValue: 'R$ 5.3M', 
    totalTokens: 20000, 
    soldTokens: 15000, 
    badges: ['Top Pick'],
    minInvestment: 'R$ 200',
    deadline: '5 dias',
    investors: 567,
    category: 'LogTech'
  },
  { 
    id: 6, 
    name: 'CyberShield', 
    description: 'Cibersegurança para PMEs com proteção enterprise. Firewall inteligente, detecção de ameaças e backup automatizado na nuvem.', 
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=250&fit=crop', 
    valuation: '16%', 
    currentValue: 'R$ 4.8M', 
    totalTokens: 14000, 
    soldTokens: 8400, 
    badges: ['Verificada', 'B2B'],
    minInvestment: 'R$ 300',
    deadline: '18 dias',
    investors: 298,
    category: 'CyberSec'
  },
  { 
    id: 7, 
    name: 'GreenEnergy', 
    description: 'Marketplace de energia renovável P2P. Conecta geradores de energia solar e eólica diretamente a consumidores.', 
    image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=250&fit=crop', 
    valuation: '22%', 
    currentValue: 'R$ 7.2M', 
    totalTokens: 25000, 
    soldTokens: 18750, 
    badges: ['Verificada', 'ESG', 'Top Pick'],
    minInvestment: 'R$ 100',
    deadline: '3 dias',
    investors: 823,
    category: 'CleanTech'
  },
  { 
    id: 8, 
    name: 'RetailAI', 
    description: 'Inteligência artificial para varejo. Previsão de demanda, precificação dinâmica e personalização de ofertas em tempo real.', 
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=250&fit=crop', 
    valuation: '13%', 
    currentValue: 'R$ 3.9M', 
    totalTokens: 11000, 
    soldTokens: 5500, 
    badges: ['Acelerada'],
    minInvestment: 'R$ 75',
    deadline: '25 dias',
    investors: 145,
    category: 'RetailTech'
  },
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
  { id: 29, name: 'MedSync', type: 'HealthTech', icon: Shield },
  { id: 30, name: 'SkillUp', type: 'EdTech', icon: GraduationCap },
  { id: 31, name: 'AIVision', type: 'Tech / IA', icon: Cpu },
  { id: 32, name: 'CloudBase', type: 'SaaS', icon: Database },
];

const mockDepoimentosInvestidores = [
  { id: 1, text: 'Investir através da iSelfToken foi incrivelmente simples. A tokenização trouxe liquidez que eu nunca imaginei ter em startups early-stage.', name: 'Ricardo Mendes', role: 'Investidor', initials: 'RM' },
  { id: 2, text: 'A transparência e segurança da plataforma me deram confiança para diversificar meu portfólio em startups inovadoras.', name: 'Ana Carolina Silva', role: 'Investidora', initials: 'AS' },
  { id: 3, text: 'Finalmente uma forma acessível de investir em inovação. O processo é 100% digital e muito bem estruturado.', name: 'Pedro Oliveira', role: 'Investidor', initials: 'PO' },
  { id: 4, text: 'A curadoria de startups é excelente. Cada oportunidade passa por um processo rigoroso de verificação.', name: 'Marina Costa', role: 'Investidora', initials: 'MC' },
  { id: 5, text: 'O dashboard de acompanhamento dos investimentos é muito completo. Consigo ver tudo em tempo real.', name: 'Lucas Ferreira', role: 'Investidor', initials: 'LF' },
  { id: 6, text: 'Diversifiquei meus investimentos em 5 startups diferentes com valores acessíveis. Isso era impensável antes.', name: 'Beatriz Santos', role: 'Investidora', initials: 'BS' },
];

const mockDepoimentosFundadores = [
  { id: 1, text: 'A iSelfToken revolucionou nossa captação. Conseguimos levantar o round em tempo recorde com investidores qualificados.', name: 'Carlos Eduardo', role: 'CEO, TechFlow', initials: 'CE', linkedin: '#', youtube: '#', website: '#' },
  { id: 2, text: 'O processo de tokenização foi muito mais simples do que eu esperava. A equipe nos guiou em cada etapa.', name: 'Juliana Pires', role: 'Founder, HealthSync', initials: 'JP', linkedin: '#', youtube: '#', website: '#' },
  { id: 3, text: 'Além do capital, ganhamos visibilidade para uma base de investidores engajados que realmente acreditam no projeto.', name: 'Fernando Costa', role: 'CTO, DataVault', initials: 'FC', linkedin: '#', youtube: '#', website: '#' },
  { id: 4, text: 'A plataforma trouxe credibilidade extra para nossa startup. O selo de verificação fez toda diferença.', name: 'Camila Rodrigues', role: 'CEO, EduNext', initials: 'CR', linkedin: '#', youtube: '#', website: '#' },
  { id: 5, text: 'Captamos de investidores de 3 países diferentes. A tokenização realmente globaliza o acesso ao capital.', name: 'Roberto Almeida', role: 'Founder, AgriTech Pro', initials: 'RA', linkedin: '#', youtube: '#', website: '#' },
  { id: 6, text: 'O suporte jurídico e regulatório da iSelfToken nos poupou meses de trabalho e milhares em consultoria.', name: 'Patricia Lima', role: 'COO, CloudSync', initials: 'PL', linkedin: '#', youtube: '#', website: '#' },
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

// Components

// Carousel 3D para todas as seções com cards
const Carousel3D = ({ children, title, cardHeight = 600, cardSpacing = 320 }) => {
  const items = React.Children.toArray(children);
  const [activeIndex, setActiveIndex] = useState(0);
  const totalItems = items.length;

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % totalItems);
  };

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
  };

  const getCardStyle = (index) => {
    let diff = index - activeIndex;
    
    // Normaliza para loop infinito visual
    if (diff > totalItems / 2) diff = diff - totalItems;
    if (diff < -totalItems / 2) diff = diff + totalItems;
    
    const absDiff = Math.abs(diff);
    
    // Card ativo (centro)
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
    
    // Cards laterais
    const direction = diff > 0 ? 1 : -1;
    const offset = direction * (absDiff * cardSpacing + 60);
    const scale = Math.max(0.75, 1 - absDiff * 0.12);
    const opacity = Math.max(0, 1 - absDiff * 0.35);
    const zIndex = 40 - absDiff * 10;
    const brightness = Math.max(0.4, 1 - absDiff * 0.25);
    const rotateY = direction * -8 * Math.min(absDiff, 2);
    
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
    <div className="relative">
      {title && (
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-stone-50">{title}</h2>
          <div className="flex gap-2">
            <button
              onClick={goPrev}
              className="p-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-50 transition-all duration-200 border border-stone-700 hover:border-stone-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goNext}
              className="p-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-50 transition-all duration-200 border border-stone-700 hover:border-stone-600"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      
      {!title && (
        <div className="flex justify-end gap-2 mb-8">
          <button
            onClick={goPrev}
            className="p-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-50 transition-all duration-200 border border-stone-700 hover:border-stone-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goNext}
            className="p-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-50 transition-all duration-200 border border-stone-700 hover:border-stone-600"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Container do Carousel 3D */}
      <div className="relative overflow-hidden" style={{ height: `${cardHeight}px`, perspective: '1200px' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          {items.map((child, index) => (
            <div
              key={index}
              className="absolute transition-all duration-500 ease-out cursor-pointer"
              style={{
                ...getCardStyle(index),
                transformStyle: 'preserve-3d',
              }}
              onClick={() => setActiveIndex(index)}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
      
      {/* Indicadores */}
      <div className="flex justify-center gap-2 mt-6">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === activeIndex 
                ? 'bg-blue-500 w-8' 
                : 'bg-stone-700 hover:bg-stone-600 w-2'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

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

const RodadaCard = ({ startup }) => {
  const progress = (startup.soldTokens / startup.totalTokens) * 100;
  
  return (
    <div className="min-w-90 max-w-90 bg-stone-900 rounded-xl border border-stone-800 overflow-hidden hover:border-stone-600 transition-all duration-300 group shadow-2xl">
      {/* Imagem com overlay */}
      <div className="relative h-44 overflow-hidden">
        <img 
          src={startup.image} 
          alt={startup.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-linear-to-t from-stone-900 via-transparent to-transparent" />
        
        {/* Badges no topo */}
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          {startup.badges.map((badge, i) => (
            <Badge key={i}>{badge}</Badge>
          ))}
        </div>
        
        {/* Categoria */}
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 text-xs font-medium rounded-md bg-stone-950/80 text-stone-300 backdrop-blur-sm">
            {startup.category}
          </span>
        </div>
        
        {/* Deadline urgente */}
        <div className="absolute bottom-3 right-3">
          <span className={`px-2 py-1 text-xs font-semibold rounded-md flex items-center gap-1 ${
            parseInt(startup.deadline) <= 5 
              ? 'bg-red-500/90 text-white' 
              : 'bg-stone-950/80 text-stone-300 backdrop-blur-sm'
          }`}>
            <Clock className="w-3 h-3" />
            {startup.deadline}
          </span>
        </div>
      </div>
      
      {/* Conteúdo */}
      <div className="p-5">
        {/* Nome e descrição */}
        <h3 className="text-xl font-bold text-stone-50 mb-2">{startup.name}</h3>
        <p className="text-stone-400 text-sm mb-4 line-clamp-2 leading-relaxed">{startup.description}</p>
        
        {/* Métricas principais */}
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
        
        {/* Barra de progresso */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-stone-400">Progresso da Rodada</span>
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
          <div className="flex justify-between text-xs text-stone-500 mt-1.5">
            <span>{startup.soldTokens.toLocaleString()} tokens vendidos</span>
            <span>Meta: {startup.totalTokens.toLocaleString()}</span>
          </div>
        </div>
        
        {/* Info adicional */}
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
        
        {/* Botão CTA */}
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
      {startup.badges.map((badge, i) => (
        <Badge key={i}>{badge}</Badge>
      ))}
    </div>
    <div className="flex items-center justify-between">
      <span className="text-xs text-stone-500">{startup.category}</span>
      <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
        Ver mais →
      </button>
    </div>
  </div>
);

const OportunidadeCard = ({ startup }) => {
  const Icon = startup.icon;
  return (
    <div className="bg-stone-900 rounded-lg border border-stone-800 p-5 hover:border-stone-700 hover:bg-stone-900/80 transition-all duration-300 group cursor-pointer">
      <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center mb-4 group-hover:bg-blue-600/30 transition-colors">
        <Icon className="w-5 h-5 text-blue-400" />
      </div>
      <h3 className="text-base font-semibold text-stone-50 mb-1">{startup.name}</h3>
      <p className="text-stone-500 text-sm mb-3">{startup.type}</p>
      <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
        Ver mais →
      </button>
    </div>
  );
};

const DepoimentoInvestidorCard = ({ depoimento }) => (
  <div className="min-w-[320px] max-w-[320px] bg-stone-900 rounded-lg border border-stone-800 p-6 hover:border-stone-700 transition-all duration-300">
    <p className="text-stone-300 text-sm leading-relaxed mb-6 italic">"{depoimento.text}"</p>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-600 to-blue-400 flex items-center justify-center">
        <span className="text-sm font-semibold text-white">{depoimento.initials}</span>
      </div>
      <div>
        <p className="text-stone-50 font-medium">{depoimento.name}</p>
        <p className="text-stone-500 text-sm">{depoimento.role}</p>
      </div>
    </div>
  </div>
);

const DepoimentoFundadorCard = ({ depoimento }) => (
  <div className="min-w-[320px] max-w-[320px] bg-stone-900 rounded-lg border border-stone-800 p-6 hover:border-stone-700 transition-all duration-300">
    <p className="text-stone-300 text-sm leading-relaxed mb-6 italic">"{depoimento.text}"</p>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-linear-to-br from-fuchsia-600 to-fuchsia-400 flex items-center justify-center">
          <span className="text-sm font-semibold text-white">{depoimento.initials}</span>
        </div>
        <div>
          <p className="text-stone-50 font-medium">{depoimento.name}</p>
          <p className="text-stone-500 text-sm">{depoimento.role}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <a href={depoimento.linkedin} className="p-1.5 rounded-md hover:bg-stone-800 text-stone-500 hover:text-stone-300 transition-colors">
          <Linkedin className="w-4 h-4" />
        </a>
        <a href={depoimento.youtube} className="p-1.5 rounded-md hover:bg-stone-800 text-stone-500 hover:text-stone-300 transition-colors">
          <Youtube className="w-4 h-4" />
        </a>
        <a href={depoimento.website} className="p-1.5 rounded-md hover:bg-stone-800 text-stone-500 hover:text-stone-300 transition-colors">
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  </div>
);

// Main Homepage Component
export default function ISelfTokenHomepage() {
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredOportunidades = activeFilter === 'all' 
    ? mockOportunidades 
    : mockOportunidades.filter(s => s.type.toLowerCase().replace(' / ', '-').replace(' ', '-') === activeFilter);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-stone-950/80 backdrop-blur-lg border-b border-stone-800/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold" style={{ color: '#d500f9' }}>iSelfToken</span>
            </div>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-stone-400 hover:text-stone-200 transition-colors">
                <Globe className="w-4 h-4" />
                <span>BR</span>
              </button>
              <button className="px-4 py-2 text-sm font-medium text-stone-50 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors border border-stone-700">
                Entrar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-blue-600/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-72 h-72 bg-fuchsia-600/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto max-w-6xl text-center relative z-10">
          <h1 className="text-9xl md:text-[16rem] font-bold mb-6 leading-none">
            <span style={{ color: '#d500f9' }}>iSelfToken</span>
          </h1>
          <p className="text-6xl md:text-9xl text-stone-400 font-bold mb-12">Crowdfunding</p>
          <p className="text-xl md:text-2xl text-stone-200 font-medium mb-4">
            Invista em startups promissoras via tokenização de equity
          </p>
          <p className="text-stone-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Conectamos investidores visionários a fundadores inovadores em uma plataforma segura, 
            transparente e 100% digital. Democratizando o acesso ao venture capital.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3.5 bg-linear-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-fuchsia-600/25 hover:shadow-fuchsia-500/40">
              <span className="flex items-center justify-center gap-2">
                <Rocket className="w-5 h-5" />
                Captar Investimento
              </span>
            </button>
            <button className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40">
              <span className="flex items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Comece a Investir
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Rodadas de Captação */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <Carousel3D title="Rodadas de Captação">
            {mockStartupsRodada.map(startup => (
              <RodadaCard key={startup.id} startup={startup} />
            ))}
          </Carousel3D>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decorativo */}
        <div className="absolute inset-0 bg-linear-to-b from-stone-900/80 via-stone-950 to-stone-950" />
        <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-stone-700 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-stone-700 to-transparent" />
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-fuchsia-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto relative z-10">
          {/* Título centralizado */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold text-stone-50 mb-4">Como Funciona?</h2>
            <p className="text-stone-400 text-lg max-w-2xl mx-auto">
              Uma plataforma completa para conectar quem quer captar com quem quer investir
            </p>
          </div>
          
          {/* Cards lado a lado */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
            
            {/* Card Fundadores */}
            <div className="group relative bg-linear-to-br from-stone-900 to-stone-900/50 rounded-2xl border border-stone-800 hover:border-fuchsia-500/50 transition-all duration-500 overflow-hidden">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-linear-to-br from-fuchsia-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative p-8">
                {/* Ícone */}
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-fuchsia-600 to-fuchsia-500 flex items-center justify-center mb-6 shadow-lg shadow-fuchsia-600/25">
                  <Rocket className="w-8 h-8 text-white" />
                </div>
                
                {/* Conteúdo */}
                <h3 className="text-2xl md:text-3xl font-bold text-stone-50 mb-4">Para Fundadores</h3>
                <p className="text-stone-400 leading-relaxed mb-6 text-lg">
                  Capte investimento de forma segura, rápida e 100% digital. 
                  Tokenize seu equity e alcance investidores qualificados em todo o mundo.
                </p>
                
                {/* Benefícios */}
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3 text-stone-300">
                    <CheckCircle className="w-5 h-5 text-fuchsia-400 shrink-0" />
                    <span>Processo 100% digital e simplificado</span>
                  </li>
                  <li className="flex items-center gap-3 text-stone-300">
                    <CheckCircle className="w-5 h-5 text-fuchsia-400 shrink-0" />
                    <span>Acesso a investidores globais</span>
                  </li>
                  <li className="flex items-center gap-3 text-stone-300">
                    <CheckCircle className="w-5 h-5 text-fuchsia-400 shrink-0" />
                    <span>Suporte jurídico e regulatório</span>
                  </li>
                </ul>
                
                {/* Botão */}
                <button className="w-full py-4 px-6 bg-linear-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-fuchsia-600/25 hover:shadow-fuchsia-500/40 flex items-center justify-center gap-2 text-lg">
                  <Rocket className="w-5 h-5" />
                  Comece a Captar Agora
                </button>
              </div>
            </div>
            
            {/* Card Investidores */}
            <div className="group relative bg-linear-to-br from-stone-900 to-stone-900/50 rounded-2xl border border-stone-800 hover:border-blue-500/50 transition-all duration-500 overflow-hidden">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-linear-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative p-8">
                {/* Ícone */}
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-600 to-blue-500 flex items-center justify-center mb-6 shadow-lg shadow-blue-600/25">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                
                {/* Conteúdo */}
                <h3 className="text-2xl md:text-3xl font-bold text-stone-50 mb-4">Para Investidores</h3>
                <p className="text-stone-400 leading-relaxed mb-6 text-lg">
                  Invista em startups promissoras com liquidez via tokenização de equity. 
                  Diversifique seu portfólio com valores acessíveis.
                </p>
                
                {/* Benefícios */}
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3 text-stone-300">
                    <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                    <span>Startups verificadas e curadas</span>
                  </li>
                  <li className="flex items-center gap-3 text-stone-300">
                    <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                    <span>Investimento mínimo acessível</span>
                  </li>
                  <li className="flex items-center gap-3 text-stone-300">
                    <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                    <span>Liquidez através de tokens</span>
                  </li>
                </ul>
                
                {/* Botão */}
                <button className="w-full py-4 px-6 bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40 flex items-center justify-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5" />
                  Comece a Investir Agora
                </button>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* Startups Verificadas */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <Carousel3D title="Startups Verificadas" cardHeight={320} cardSpacing={300}>
            {mockStartupsVerificadas.map(startup => (
              <MediumCard key={startup.id} startup={startup} />
            ))}
          </Carousel3D>
        </div>
      </section>

      {/* Startups Aceleradas */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-stone-900/30">
        <div className="container mx-auto">
          <Carousel3D title="Startups Aceleradas" cardHeight={320} cardSpacing={300}>
            {mockStartupsAceleradas.map(startup => (
              <MediumCard key={startup.id} startup={startup} />
            ))}
          </Carousel3D>
        </div>
      </section>

      {/* Startups em Fase de Aprovação */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <Carousel3D title="Startups em Fase de Aprovação" cardHeight={320} cardSpacing={300}>
            {mockStartupsAprovacao.map(startup => (
              <MediumCard key={startup.id} startup={startup} />
            ))}
          </Carousel3D>
        </div>
      </section>

      {/* Oportunidades de Investimento */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-stone-900/50">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold text-stone-50 mb-6">Oportunidades de Investimento</h2>
          
          <div className="flex flex-wrap gap-2 mb-8">
            {filterOptions.map(option => (
              <button
                key={option.key}
                onClick={() => setActiveFilter(option.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeFilter === option.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200 border border-stone-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOportunidades.slice(0, 16).map(startup => (
              <OportunidadeCard key={startup.id} startup={startup} />
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos Investidores */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold text-stone-50 mb-8 text-center">
            Depoimentos de quem já investe
          </h2>
          <Carousel3D title="" cardHeight={280} cardSpacing={340}>
            {mockDepoimentosInvestidores.map(depoimento => (
              <DepoimentoInvestidorCard key={depoimento.id} depoimento={depoimento} />
            ))}
          </Carousel3D>
        </div>
      </section>

      {/* Depoimentos Fundadores */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-stone-900/30">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold text-stone-50 mb-8 text-center">
            O que os fundadores de startups falam sobre nós
          </h2>
          <Carousel3D title="" cardHeight={320} cardSpacing={340}>
            {mockDepoimentosFundadores.map(depoimento => (
              <DepoimentoFundadorCard key={depoimento.id} depoimento={depoimento} />
            ))}
          </Carousel3D>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-stone-800">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Marca */}
            <div>
              <h3 className="text-xl font-bold mb-4" style={{ color: '#d500f9' }}>iSelfToken</h3>
              <p className="text-stone-400 text-sm leading-relaxed">
                Conectamos investidores e fundadores em uma plataforma segura e acessível, 
                democratizando o acesso ao venture capital através da tokenização de equity.
              </p>
            </div>
            
            {/* Plataforma */}
            <div>
              <h4 className="text-stone-50 font-semibold mb-4">Plataforma</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-stone-400 hover:text-stone-200 text-sm transition-colors">Para Investidores</a></li>
                <li><a href="#" className="text-stone-400 hover:text-stone-200 text-sm transition-colors">Para Projetos</a></li>
                <li><a href="#" className="text-stone-400 hover:text-stone-200 text-sm transition-colors">iSelfToken Education</a></li>
              </ul>
            </div>
            
            {/* Legal */}
            <div>
              <h4 className="text-stone-50 font-semibold mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-stone-400 hover:text-stone-200 text-sm transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="text-stone-400 hover:text-stone-200 text-sm transition-colors">Privacidade</a></li>
              </ul>
            </div>
            
            {/* Contato */}
            <div>
              <h4 className="text-stone-50 font-semibold mb-4">Contato</h4>
              <ul className="space-y-3">
                <li><a href="mailto:contato@iselftoken.com" className="text-stone-400 hover:text-stone-200 text-sm transition-colors">contato@iselftoken.com</a></li>
                <li><a href="tel:+551199999999" className="text-stone-400 hover:text-stone-200 text-sm transition-colors">+55 11 9999-9999</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-stone-800">
            <p className="text-stone-500 text-sm text-center">
              © 2026 iSelfToken. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
