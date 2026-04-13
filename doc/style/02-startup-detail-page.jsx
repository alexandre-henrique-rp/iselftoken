import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, 
  Globe, 
  Share2, 
  Download, 
  FileText, 
  Play,
  Users,
  TrendingUp,
  Target,
  Award,
  AlertTriangle,
  MessageSquare,
  Image,
  HelpCircle,
  Calendar,
  Quote,
  Folder,
  ExternalLink,
  Lock,
  X,
  Linkedin,
  Twitter,
  Facebook,
  Link2,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  BarChart3,
  Zap,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  Send,
  Heart
} from 'lucide-react';

// ============================================
// MOCK DATA
// ============================================

const startupData = {
  id: 1,
  name: 'FinFlow',
  slogan: 'Revolucionando a gestão financeira para PMEs',
  description: 'Plataforma de gestão financeira com IA integrada que automatiza conciliação bancária, fluxo de caixa e previsões financeiras para pequenas e médias empresas.',
  heroImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=600&fit=crop',
  logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop',
  category: 'FinTech',
  location: 'São Paulo, SP',
  founded: '2022',
  website: 'https://finflow.com.br',
  
  // Métricas da oferta
  offer: {
    equity: '15%',
    valuation: 'R$ 4.2M',
    minInvestment: 'R$ 100',
    maxInvestment: 'R$ 50.000',
    totalTokens: 10000,
    soldTokens: 7500,
    investors: 234,
    deadline: '12 dias',
    raised: 'R$ 630.000',
    goal: 'R$ 840.000'
  },
  
  // Métricas do negócio
  metrics: {
    mrr: 'R$ 85.000',
    growth: '32%',
    clients: '450+',
    nps: '72',
    ltv: 'R$ 4.200',
    cac: 'R$ 380',
    churn: '2.1%',
    runway: '18 meses'
  },
  
  // Conteúdo das seções
  businessSummary: `A FinFlow nasceu da frustração de empreendedores que perdiam horas com planilhas e conciliações manuais. Nossa plataforma usa inteligência artificial para automatizar 90% das tarefas financeiras rotineiras, permitindo que donos de negócios foquem no que realmente importa: crescer.

Integramos com mais de 50 bancos e ERPs, oferecendo uma visão unificada das finanças em tempo real. Nossa IA aprende com os padrões de cada empresa e faz previsões de fluxo de caixa com 94% de precisão.`,
  
  market: {
    tam: 'R$ 12 bilhões',
    sam: 'R$ 3.2 bilhões',
    som: 'R$ 480 milhões',
    growth: '28% ao ano',
    description: 'O mercado de software de gestão financeira para PMEs cresce aceleradamente com a digitalização. São mais de 6 milhões de PMEs no Brasil, das quais apenas 15% utilizam algum software de gestão financeira.'
  },
  
  goals: [
    'Alcançar 2.000 clientes ativos',
    'Expandir para México e Colômbia',
    'Lançar módulo de crédito integrado',
    'Atingir MRR de R$ 300.000',
    'Certificação SOC 2 Type II',
    'Contratar 15 novos colaboradores'
  ],
  
  team: [
    {
      name: 'Ricardo Mendes',
      role: 'CEO & Co-founder',
      bio: 'Ex-diretor financeiro do Nubank. 15 anos de experiência em finanças e tecnologia. MBA pela Stanford.',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
      linkedin: '#'
    },
    {
      name: 'Ana Paula Silva',
      role: 'CTO & Co-founder',
      bio: 'Ex-tech lead do iFood. Especialista em IA e machine learning. Mestre em Ciência da Computação pela USP.',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
      linkedin: '#'
    },
    {
      name: 'Carlos Eduardo',
      role: 'COO',
      bio: 'Ex-gerente de operações da Stone. Experiência em escalar operações de startups B2B.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
      linkedin: '#'
    },
    {
      name: 'Marina Costa',
      role: 'Head of Product',
      bio: 'Ex-product manager do Conta Azul. Especialista em produtos financeiros para PMEs.',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
      linkedin: '#'
    }
  ],
  
  risks: [
    {
      category: 'Risco de Investimento',
      items: [
        'Investimento em startups envolve alto risco de perda total do capital',
        'Baixa liquidez - dificuldade de vender tokens antes do prazo',
        'Diluição em rodadas futuras de investimento'
      ]
    },
    {
      category: 'Risco de Negócio',
      items: [
        'Dependência de integrações bancárias e regulação',
        'Competição com players estabelecidos (Conta Azul, Omie)',
        'Risco de execução na expansão internacional'
      ]
    },
    {
      category: 'Risco de Conversibilidade',
      items: [
        'Tokens podem não ser convertidos em equity em caso de insucesso',
        'Prazo de conversão sujeito a eventos de liquidez'
      ]
    }
  ],
  
  documents: [
    { name: 'Apresentação para Investidores', type: 'PDF', size: '4.2 MB', url: '#' },
    { name: 'Termos da Oferta', type: 'PDF', size: '1.8 MB', url: '#' },
    { name: 'Análise de Mercado', type: 'PDF', size: '2.5 MB', url: '#' },
    { name: 'Documentação Jurídica', type: 'PDF', size: '3.1 MB', url: '#' },
    { name: 'Demonstrações Financeiras', type: 'PDF', size: '1.2 MB', url: '#' },
    { name: 'Contrato Social', type: 'PDF', size: '890 KB', url: '#' }
  ],
  
  gallery: [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=400&fit=crop'
  ],
  
  faq: [
    {
      question: 'Qual o valor mínimo para investir?',
      answer: 'O investimento mínimo é de R$ 100, permitindo que qualquer pessoa possa participar da rodada de captação.'
    },
    {
      question: 'Quando receberei retorno do investimento?',
      answer: 'O retorno depende de eventos de liquidez como venda da empresa, IPO ou dividendos. Não há prazo garantido.'
    },
    {
      question: 'Como funciona a tokenização do equity?',
      answer: 'Cada token representa uma fração do equity da empresa. Os tokens ficam registrados em blockchain e podem ser transferidos conforme as regras da oferta.'
    },
    {
      question: 'Posso perder todo o dinheiro investido?',
      answer: 'Sim. Investimento em startups é de alto risco. Invista apenas o que você pode perder completamente.'
    },
    {
      question: 'A startup já tem receita?',
      answer: 'Sim, a FinFlow já possui MRR de R$ 85.000 com mais de 450 clientes ativos pagantes.'
    }
  ],
  
  updates: [
    {
      date: '15 Jan 2026',
      title: 'Marco de 450 clientes atingido',
      description: 'Celebramos a marca de 450 clientes ativos na plataforma, um crescimento de 40% no trimestre.'
    },
    {
      date: '02 Jan 2026',
      title: 'Parceria com Banco Inter',
      description: 'Fechamos integração exclusiva com Banco Inter para oferecer crédito aos nossos clientes.'
    },
    {
      date: '18 Dez 2025',
      title: 'Lançamento do módulo de IA',
      description: 'Nossa IA de previsão de fluxo de caixa agora está disponível para todos os planos.'
    },
    {
      date: '01 Dez 2025',
      title: 'Rodada de captação aberta',
      description: 'Iniciamos nossa rodada de captação via iSelfToken com meta de R$ 840.000.'
    }
  ],
  
  testimonials: [
    {
      text: 'A FinFlow economizou 20 horas por mês do meu time financeiro. A automação é incrível.',
      name: 'João Pedro',
      role: 'CFO',
      company: 'TechStore Brasil',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop'
    },
    {
      text: 'Finalmente consigo ver meu fluxo de caixa em tempo real. Mudou completamente minha gestão.',
      name: 'Carla Souza',
      role: 'Fundadora',
      company: 'Boutique Digital',
      image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop'
    },
    {
      text: 'A previsão de caixa da IA acertou 95% das vezes. Impressionante tecnologia.',
      name: 'Roberto Lima',
      role: 'Diretor Financeiro',
      company: 'Grupo Inovação',
      image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop'
    }
  ],
  
  comments: [
    {
      user: 'Investidor123',
      date: '2 dias atrás',
      text: 'Muito interessante o modelo de negócio. Qual a previsão de break-even?',
      likes: 12
    },
    {
      user: 'MariaInvest',
      date: '3 dias atrás',
      text: 'Já sou cliente da FinFlow e posso confirmar: o produto é excelente!',
      likes: 24
    },
    {
      user: 'TechAnalyst',
      date: '5 dias atrás',
      text: 'O time é muito forte. Ricardo tem track record impressionante no Nubank.',
      likes: 18
    }
  ],
  
  investors: [
    { initials: 'RM', color: 'blue' },
    { initials: 'AS', color: 'green' },
    { initials: 'PO', color: 'purple' },
    { initials: 'MC', color: 'pink' },
    { initials: 'LF', color: 'orange' },
    { initials: 'BS', color: 'cyan' },
    { initials: 'JC', color: 'red' },
    { initials: 'TM', color: 'yellow' }
  ]
};

// ============================================
// COMPONENTS
// ============================================

// Modal de Login/Cadastro Interno à Seção
const InnerAuthBanner = () => {
  return (
    <div className="bg-stone-900 border border-stone-700 rounded-2xl p-8 shadow-2xl">
      <div className="flex flex-col items-center text-center gap-6">
        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center">
          <Lock className="w-8 h-8 text-blue-400" />
        </div>
        
        <div>
          <h3 className="text-2xl font-bold text-stone-50 mb-3">Conteúdo Exclusivo</h3>
          <p className="text-stone-400 text-base max-w-md mx-auto leading-relaxed">
            Faça login ou cadastre-se gratuitamente para ver todos os detalhes desta oferta de investimento
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button className="py-3 px-8 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors min-w-40">
            Entrar
          </button>
          <button className="py-3 px-8 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl transition-colors border border-stone-600 min-w-40">
            Criar Conta Grátis
          </button>
        </div>
        
        <p className="text-stone-500 text-sm">
          Cadastro rápido em menos de 2 minutos
        </p>
      </div>
    </div>
  );
};

// Seção com blur (conteúdo protegido)
const ProtectedSection = ({ children, isLocked }) => {
  const sectionRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  
  useEffect(() => {
    if (!isLocked) {
      setShowModal(false);
      return;
    }
    
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const headerOffset = 100;
      
      // O topo da seção protegida
      const sectionTop = rect.top;
      // O bottom da seção protegida
      const sectionBottom = rect.bottom;
      
      // Modal aparece quando:
      // - O topo da seção já passou pelo meio da tela (usuário entrou na seção)
      // - O bottom da seção ainda está abaixo do header (ainda está na seção)
      const hasEnteredSection = sectionTop < windowHeight / 2;
      const hasNotLeftSection = sectionBottom > headerOffset;
      
      setShowModal(hasEnteredSection && hasNotLeftSection);
    };
    
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isLocked]);
  
  return (
    <div ref={sectionRef} className="relative">
      {/* Conteúdo com blur */}
      <div className={isLocked ? 'select-none' : ''}>
        <div className={isLocked ? 'blur-sm opacity-50' : ''}>
          {children}
        </div>
      </div>
      
      {/* Modal fixo centralizado - só aparece quando dentro da seção */}
      {isLocked && showModal && (
        <div 
          className="fixed z-50 flex items-center justify-center pointer-events-none px-4"
          style={{ 
            top: '80px',
            left: 0,
            right: 0,
            bottom: 0
          }}
        >
          <div className="pointer-events-auto w-full max-w-3xl">
            <InnerAuthBanner />
          </div>
        </div>
      )}
    </div>
  );
};

// Card de métrica
const MetricCard = ({ icon: Icon, label, value, subvalue, color = 'blue' }) => {
  const colors = {
    blue: 'from-blue-600 to-blue-500',
    green: 'from-green-600 to-green-500',
    purple: 'from-purple-600 to-purple-500',
    orange: 'from-orange-600 to-orange-500'
  };
  
  return (
    <div className="bg-stone-900 rounded-xl border border-stone-800 p-5 hover:border-stone-700 transition-colors">
      <div className={`w-10 h-10 rounded-lg bg-linear-to-br ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-stone-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-stone-50">{value}</p>
      {subvalue && <p className="text-stone-500 text-xs mt-1">{subvalue}</p>}
    </div>
  );
};

// Card de membro da equipe
const TeamCard = ({ member }) => (
  <div className="bg-stone-900 rounded-xl border border-stone-800 p-6 hover:border-stone-700 transition-colors">
    <div className="flex items-start gap-4">
      <img 
        src={member.image} 
        alt={member.name}
        className="w-16 h-16 rounded-xl object-cover"
      />
      <div className="flex-1">
        <h4 className="text-lg font-semibold text-stone-50">{member.name}</h4>
        <p className="text-blue-400 text-sm mb-2">{member.role}</p>
        <p className="text-stone-400 text-sm leading-relaxed">{member.bio}</p>
        <a href={member.linkedin} className="inline-flex items-center gap-1 text-stone-500 hover:text-blue-400 text-sm mt-3 transition-colors">
          <Linkedin className="w-4 h-4" />
          LinkedIn
        </a>
      </div>
    </div>
  </div>
);

// Card de risco
const RiskCard = ({ category, items }) => (
  <div className="bg-stone-900 rounded-xl border border-stone-800 p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
      </div>
      <h4 className="text-lg font-semibold text-stone-50">{category}</h4>
    </div>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-stone-400 text-sm">
          <span className="text-amber-400 mt-1">•</span>
          {item}
        </li>
      ))}
    </ul>
  </div>
);

// Card de documento
const DocumentCard = ({ doc }) => (
  <a 
    href={doc.url}
    className="flex items-center gap-4 bg-stone-900 rounded-xl border border-stone-800 p-4 hover:border-stone-700 hover:bg-stone-800/50 transition-all group"
  >
    <div className="w-12 h-12 rounded-lg bg-red-600/20 flex items-center justify-center">
      <FileText className="w-6 h-6 text-red-400" />
    </div>
    <div className="flex-1">
      <p className="text-stone-50 font-medium group-hover:text-blue-400 transition-colors">{doc.name}</p>
      <p className="text-stone-500 text-sm">{doc.type} • {doc.size}</p>
    </div>
    <Download className="w-5 h-5 text-stone-500 group-hover:text-blue-400 transition-colors" />
  </a>
);

// FAQ Accordion Item
const FaqItem = ({ question, answer, isOpen, onClick }) => (
  <div className="border-b border-stone-800 last:border-0">
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between py-5 text-left"
    >
      <span className="text-stone-50 font-medium pr-4">{question}</span>
      {isOpen ? (
        <ChevronUp className="w-5 h-5 text-stone-400 shrink-0" />
      ) : (
        <ChevronDown className="w-5 h-5 text-stone-400 shrink-0" />
      )}
    </button>
    {isOpen && (
      <div className="pb-5">
        <p className="text-stone-400 leading-relaxed">{answer}</p>
      </div>
    )}
  </div>
);

// Card de atualização/timeline
const UpdateCard = ({ update }) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div className="w-3 h-3 rounded-full bg-blue-500" />
      <div className="w-0.5 h-full bg-stone-800" />
    </div>
    <div className="pb-8">
      <p className="text-stone-500 text-sm mb-1">{update.date}</p>
      <h4 className="text-stone-50 font-semibold mb-2">{update.title}</h4>
      <p className="text-stone-400 text-sm">{update.description}</p>
    </div>
  </div>
);

// Card de depoimento
const TestimonialCard = ({ testimonial }) => (
  <div className="bg-stone-900 rounded-xl border border-stone-800 p-6">
    <Quote className="w-8 h-8 text-blue-500/30 mb-4" />
    <p className="text-stone-300 leading-relaxed mb-4">"{testimonial.text}"</p>
    <div className="flex items-center gap-3">
      <img 
        src={testimonial.image}
        alt={testimonial.name}
        className="w-10 h-10 rounded-full object-cover"
      />
      <div>
        <p className="text-stone-50 font-medium">{testimonial.name}</p>
        <p className="text-stone-500 text-sm">{testimonial.role}, {testimonial.company}</p>
      </div>
    </div>
  </div>
);

// Card de comentário
const CommentCard = ({ comment }) => (
  <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center">
          <span className="text-xs font-semibold text-white">{comment.user.charAt(0)}</span>
        </div>
        <span className="text-stone-50 font-medium">{comment.user}</span>
      </div>
      <span className="text-stone-500 text-sm">{comment.date}</span>
    </div>
    <p className="text-stone-300 mb-3">{comment.text}</p>
    <button className="flex items-center gap-1 text-stone-500 hover:text-red-400 transition-colors text-sm">
      <Heart className="w-4 h-4" />
      {comment.likes}
    </button>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export default function StartupDetailPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const startup = startupData;
  const progress = (startup.offer.soldTokens / startup.offer.totalTokens) * 100;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-50">
      
      {/* ==================== HEADER ==================== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-stone-950/80 backdrop-blur-lg border-b border-stone-800/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center">
              <span className="text-xl font-bold" style={{ color: '#d500f9' }}>iSelfToken</span>
            </a>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-stone-400 hover:text-stone-200 transition-colors">
                <Globe className="w-4 h-4" />
                <span>BR</span>
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
                Cadastre-se
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ==================== HERO DA OFERTA ==================== */}
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-[1fr,400px] gap-8">
            
            {/* Coluna Esquerda - Info */}
            <div>
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-stone-500 mb-6">
                <a href="/" className="hover:text-stone-300 transition-colors">Home</a>
                <ChevronRight className="w-4 h-4" />
                <a href="/investimento/all" className="hover:text-stone-300 transition-colors">Investir</a>
                <ChevronRight className="w-4 h-4" />
                <span className="text-stone-300">{startup.name}</span>
              </div>
              
              {/* Logo e Nome */}
              <div className="flex items-center gap-4 mb-6">
                <img 
                  src={startup.logo}
                  alt={startup.name}
                  className="w-16 h-16 rounded-xl object-cover border border-stone-800"
                />
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-3xl md:text-4xl font-bold text-stone-50">{startup.name}</h1>
                    <span className="px-2 py-1 text-xs font-medium rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30">
                      {startup.category}
                    </span>
                  </div>
                  <p className="text-stone-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {startup.location} • Fundada em {startup.founded}
                  </p>
                </div>
              </div>
              
              {/* Slogan */}
              <h2 className="text-xl md:text-2xl text-stone-200 mb-6">{startup.slogan}</h2>
              
              {/* Descrição */}
              <p className="text-stone-400 leading-relaxed mb-8">{startup.description}</p>
              
              {/* Botões de Ação */}
              <div className="flex flex-wrap gap-4 mb-8">
                <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-600/25">
                  <DollarSign className="w-5 h-5" />
                  Investir Agora
                </button>
                <button className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors">
                  <Phone className="w-5 h-5" />
                  Falar com a Plataforma
                </button>
              </div>
              
              {/* Links e Compartilhamento */}
              <div className="flex flex-wrap items-center gap-6">
                <a href="#" className="flex items-center gap-2 text-stone-400 hover:text-blue-400 transition-colors">
                  <FileText className="w-5 h-5" />
                  <span className="text-sm">Documento da Oferta (PDF)</span>
                </a>
                <a href={startup.website} className="flex items-center gap-2 text-stone-400 hover:text-blue-400 transition-colors">
                  <ExternalLink className="w-5 h-5" />
                  <span className="text-sm">Site Oficial</span>
                </a>
                <div className="flex items-center gap-3">
                  <span className="text-stone-500 text-sm">Compartilhar:</span>
                  <button className="p-2 text-stone-400 hover:text-blue-400 hover:bg-stone-800 rounded-lg transition-colors">
                    <Linkedin className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-stone-400 hover:text-blue-400 hover:bg-stone-800 rounded-lg transition-colors">
                    <Twitter className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-stone-400 hover:text-blue-400 hover:bg-stone-800 rounded-lg transition-colors">
                    <Facebook className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-stone-400 hover:text-blue-400 hover:bg-stone-800 rounded-lg transition-colors">
                    <Link2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Coluna Direita - Card da Oferta */}
            <div className="lg:sticky lg:top-24 h-fit">
              <div className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden">
                {/* Header do Card */}
                <div className="p-6 border-b border-stone-800">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-stone-400 text-sm">Captação em andamento</span>
                    <span className="flex items-center gap-1 text-amber-400 text-sm font-medium">
                      <Clock className="w-4 h-4" />
                      {startup.offer.deadline} restantes
                    </span>
                  </div>
                  
                  {/* Valores */}
                  <div className="mb-4">
                    <p className="text-3xl font-bold text-stone-50">{startup.offer.raised}</p>
                    <p className="text-stone-400 text-sm">de {startup.offer.goal} (meta)</p>
                  </div>
                  
                  {/* Barra de Progresso */}
                  <div className="mb-2">
                    <div className="h-3 bg-stone-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-linear-to-r from-blue-600 to-blue-400 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-right text-blue-400 font-semibold">{progress.toFixed(0)}% captado</p>
                </div>
                
                {/* Métricas da Oferta */}
                <div className="p-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-stone-400">Equity ofertado</span>
                    <span className="text-stone-50 font-semibold">{startup.offer.equity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Valuation</span>
                    <span className="text-stone-50 font-semibold">{startup.offer.valuation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Investimento mínimo</span>
                    <span className="text-green-400 font-semibold">{startup.offer.minInvestment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Investimento máximo</span>
                    <span className="text-stone-50 font-semibold">{startup.offer.maxInvestment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Investidores</span>
                    <span className="text-stone-50 font-semibold">{startup.offer.investors}</span>
                  </div>
                  
                  <div className="pt-4 border-t border-stone-800">
                    <button className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Investir Agora
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== APRESENTAÇÃO AOS INVESTIDORES ==================== */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          {/* Banner */}
          <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-8">
            <img 
              src={startup.heroImage}
              alt={startup.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-stone-950 via-stone-950/50 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-lg transition-colors">
                <Play className="w-5 h-5" />
                Assistir Pitch
              </button>
            </div>
          </div>
          
          {/* Métricas Rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <MetricCard icon={DollarSign} label="MRR" value={startup.metrics.mrr} color="green" />
            <MetricCard icon={TrendingUp} label="Crescimento" value={startup.metrics.growth} subvalue="mês a mês" color="blue" />
            <MetricCard icon={Users} label="Clientes" value={startup.metrics.clients} color="purple" />
            <MetricCard icon={Zap} label="NPS" value={startup.metrics.nps} color="orange" />
          </div>
          
          {/* Botão Download */}
          <button className="flex items-center gap-2 px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-xl transition-colors border border-stone-700">
            <Download className="w-5 h-5" />
            Baixar Apresentação Completa
          </button>
        </div>
      </section>

      {/* ==================== CONTEÚDO PROTEGIDO ==================== */}
      <ProtectedSection isLocked={!isLoggedIn}>
        
        {/* ==================== RESUMO / ANÁLISE ==================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-stone-900/30">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-50 mb-6 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-400" />
              Resumo da Oferta
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-stone-300 text-lg leading-relaxed whitespace-pre-line">
                {startup.businessSummary}
              </p>
            </div>
          </div>
        </section>

        {/* ==================== O NEGÓCIO ==================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-50 mb-6 flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-400" />
              O Negócio
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-stone-50 mb-4">Proposta de Valor</h3>
                <p className="text-stone-400 leading-relaxed">
                  A FinFlow oferece uma plataforma completa de gestão financeira que combina automação inteligente com insights acionáveis. Nossa tecnologia proprietária de IA analisa padrões financeiros e oferece recomendações personalizadas para cada negócio.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-stone-50 mb-4">Diferenciais</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-stone-400">
                    <Shield className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                    Integração com 50+ bancos brasileiros
                  </li>
                  <li className="flex items-start gap-3 text-stone-400">
                    <Shield className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                    IA com 94% de precisão em previsões
                  </li>
                  <li className="flex items-start gap-3 text-stone-400">
                    <Shield className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                    Conciliação automática em tempo real
                  </li>
                  <li className="flex items-start gap-3 text-stone-400">
                    <Shield className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                    Relatórios personalizáveis e dashboards
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== REALIZAÇÕES (MÉTRICAS) ==================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-stone-900/30">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-50 mb-8 flex items-center gap-3">
              <Award className="w-8 h-8 text-blue-400" />
              Realizações & Métricas
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard icon={DollarSign} label="MRR Atual" value={startup.metrics.mrr} color="green" />
              <MetricCard icon={TrendingUp} label="Crescimento Mensal" value={startup.metrics.growth} color="blue" />
              <MetricCard icon={Users} label="Clientes Ativos" value={startup.metrics.clients} color="purple" />
              <MetricCard icon={Zap} label="NPS Score" value={startup.metrics.nps} color="orange" />
              <MetricCard icon={DollarSign} label="LTV Médio" value={startup.metrics.ltv} color="green" />
              <MetricCard icon={Target} label="CAC" value={startup.metrics.cac} color="blue" />
              <MetricCard icon={TrendingUp} label="Churn Rate" value={startup.metrics.churn} color="purple" />
              <MetricCard icon={Clock} label="Runway" value={startup.metrics.runway} color="orange" />
            </div>
          </div>
        </section>

        {/* ==================== MERCADO POTENCIAL ==================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-50 mb-6 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-400" />
              Mercado Potencial
            </h2>
            <p className="text-stone-400 leading-relaxed mb-8">{startup.market.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-stone-900 rounded-xl border border-stone-800 p-5 text-center">
                <p className="text-stone-400 text-sm mb-2">TAM</p>
                <p className="text-2xl font-bold text-stone-50">{startup.market.tam}</p>
              </div>
              <div className="bg-stone-900 rounded-xl border border-stone-800 p-5 text-center">
                <p className="text-stone-400 text-sm mb-2">SAM</p>
                <p className="text-2xl font-bold text-stone-50">{startup.market.sam}</p>
              </div>
              <div className="bg-stone-900 rounded-xl border border-stone-800 p-5 text-center">
                <p className="text-stone-400 text-sm mb-2">SOM</p>
                <p className="text-2xl font-bold text-stone-50">{startup.market.som}</p>
              </div>
              <div className="bg-stone-900 rounded-xl border border-stone-800 p-5 text-center">
                <p className="text-stone-400 text-sm mb-2">Crescimento</p>
                <p className="text-2xl font-bold text-green-400">{startup.market.growth}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== METAS COM INVESTIMENTO ==================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-stone-900/30">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-50 mb-6 flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-400" />
              Metas com Investimento (12 meses)
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {startup.goals.map((goal, i) => (
                <div key={i} className="flex items-center gap-3 bg-stone-900 rounded-xl border border-stone-800 p-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                    {i + 1}
                  </div>
                  <span className="text-stone-300">{goal}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== EQUIPE EXECUTIVA ==================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-50 mb-8 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              Equipe Executiva
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {startup.team.map((member, i) => (
                <TeamCard key={i} member={member} />
              ))}
            </div>
          </div>
        </section>

        {/* ==================== FATORES DE RISCO ==================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-stone-900/30">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-50 mb-8 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              Fatores de Risco
            </h2>
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {startup.risks.map((risk, i) => (
                <RiskCard key={i} category={risk.category} items={risk.items} />
              ))}
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
              <FileText className="w-5 h-5" />
              Ver documento completo de riscos
            </a>
          </div>
        </section>

        {/* ==================== INFORMAÇÕES ESSENCIAIS ==================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-50 mb-8 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-400" />
              Informações Essenciais da Oferta
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Site Oficial', icon: ExternalLink },
                { label: 'Termos da Oferta', icon: FileText },
                { label: 'Análise de Mercado', icon: BarChart3 },
                { label: 'Docs. Jurídicos', icon: Folder },
                { label: 'Financeiro', icon: DollarSign }
              ].map((item, i) => (
                <a 
                  key={i}
                  href="#"
                  className="flex flex-col items-center gap-3 bg-stone-900 rounded-xl border border-stone-800 p-5 hover:border-blue-500/50 hover:bg-stone-800/50 transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                    <item.icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <span className="text-stone-300 text-sm font-medium">{item.label}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== GALERIA ==================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-stone-900/30">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-50 mb-8 flex items-center gap-3">
              <Image className="w-8 h-8 text-blue-400" />
              Galeria
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {startup.gallery.map((img, i) => (
                <button 
                  key={i}
                  onClick={() => setSelectedImage(img)}
                  className="relative aspect-video rounded-xl overflow-hidden group"
                >
                  <img src={img} alt={`Galeria ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/30 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== FAQ ==================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-50 mb-8 flex items-center gap-3">
              <HelpCircle className="w-8 h-8 text-blue-400" />
              Perguntas Frequentes
            </h2>
            <div className="bg-stone-900 rounded-2xl border border-stone-800 divide-y divide-stone-800">
              {startup.faq.map((item, i) => (
                <FaqItem 
                  key={i}
                  question={item.question}
                  answer={item.answer}
                  isOpen={openFaq === i}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ==================== ATUALIZAÇÕES ==================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-stone-900/30">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-50 mb-8 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-400" />
              Atualizações & Novidades
            </h2>
            <div className="max-w-2xl">
              {startup.updates.map((update, i) => (
                <UpdateCard key={i} update={update} />
              ))}
            </div>
          </div>
        </section>

        {/* ==================== DEPOIMENTOS ==================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-50 mb-8 flex items-center gap-3">
              <Quote className="w-8 h-8 text-blue-400" />
              Depoimentos
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {startup.testimonials.map((testimonial, i) => (
                <TestimonialCard key={i} testimonial={testimonial} />
              ))}
            </div>
          </div>
        </section>

        {/* ==================== DOCUMENTOS ==================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-stone-900/30">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-50 mb-8 flex items-center gap-3">
              <Folder className="w-8 h-8 text-blue-400" />
              Documentos
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {startup.documents.map((doc, i) => (
                <DocumentCard key={i} doc={doc} />
              ))}
            </div>
          </div>
        </section>

        {/* ==================== COMENTÁRIOS / FÓRUM ==================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-50 mb-4 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-blue-400" />
              Comentários
            </h2>
            <p className="text-stone-400 mb-8">
              Mantenha o respeito e foque em discussões construtivas sobre o investimento. Spam e ofensas serão removidos.
            </p>
            
            {/* Input de comentário */}
            <div className="flex gap-4 mb-8">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-white">?</span>
              </div>
              <div className="flex-1 bg-stone-900 rounded-xl border border-stone-800 p-4">
                <textarea 
                  placeholder="Faça login para comentar..."
                  className="w-full bg-transparent text-stone-300 placeholder-stone-500 resize-none outline-none"
                  rows={3}
                  disabled={!isLoggedIn}
                />
                <div className="flex justify-end mt-3">
                  <button 
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isLoggedIn}
                  >
                    <Send className="w-4 h-4" />
                    Enviar
                  </button>
                </div>
              </div>
            </div>
            
            {/* Lista de comentários */}
            <div className="space-y-4 mb-6">
              {startup.comments.map((comment, i) => (
                <CommentCard key={i} comment={comment} />
              ))}
            </div>
            
            <button className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
              Ver mais comentários →
            </button>
          </div>
        </section>

        {/* ==================== INVESTIDORES ==================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-stone-900/30">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-stone-50 flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-400" />
                Investidores ({startup.offer.investors})
              </h2>
              <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                Ver todos →
              </a>
            </div>
            <div className="flex flex-wrap gap-3">
              {startup.investors.map((investor, i) => {
                const colors = {
                  blue: 'from-blue-600 to-blue-400',
                  green: 'from-green-600 to-green-400',
                  purple: 'from-purple-600 to-purple-400',
                  pink: 'from-pink-600 to-pink-400',
                  orange: 'from-orange-600 to-orange-400',
                  cyan: 'from-cyan-600 to-cyan-400',
                  red: 'from-red-600 to-red-400',
                  yellow: 'from-yellow-600 to-yellow-400'
                };
                return (
                  <div 
                    key={i}
                    className={`w-12 h-12 rounded-full bg-linear-to-br ${colors[investor.color]} flex items-center justify-center`}
                  >
                    <span className="text-sm font-semibold text-white">{investor.initials}</span>
                  </div>
                );
              })}
              <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center border border-stone-700">
                <span className="text-xs font-medium text-stone-400">+{startup.offer.investors - 8}</span>
              </div>
            </div>
          </div>
        </section>

      </ProtectedSection>

      {/* ==================== FOOTER ==================== */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-stone-800">
        <div className="container mx-auto max-w-6xl">
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
                <li><a href="mailto:contato@iselftoken.com" className="text-stone-400 hover:text-stone-200 text-sm transition-colors flex items-center gap-2"><Mail className="w-4 h-4" /> contato@iselftoken.com</a></li>
                <li><a href="tel:+551199999999" className="text-stone-400 hover:text-stone-200 text-sm transition-colors flex items-center gap-2"><Phone className="w-4 h-4" /> +55 11 9999-9999</a></li>
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

      {/* ==================== MODALS ==================== */}
      
      {/* Modal de Imagem */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-stone-950/90"
          onClick={() => setSelectedImage(null)}
        >
          <img 
            src={selectedImage} 
            alt="Galeria"
            className="max-w-full max-h-full rounded-xl"
          />
          <button 
            className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-200 transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      )}
      
    </div>
  );
}
