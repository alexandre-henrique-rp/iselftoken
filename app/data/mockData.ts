import {
  Briefcase,
  Cpu,
  Database,
  GraduationCap,
  MoreHorizontal,
  Shield,
} from "lucide-react";

import type {
  Banner,
  OpportunityItem,
  StartupCard,
  Testimonial,
} from "~/types/homepage";

export const mockBanners: Banner[] = [
  {
    id: 1,
    title: "Demo Day iSelfToken 2026",
    description:
      "Conheça as startups mais promissoras do ano em um evento exclusivo para investidores.",
    image:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop",
    category: "Evento",
  },
  {
    id: 2,
    title: "Nova Regulamentação CVM",
    description:
      "Entenda o que muda para o investidor de equity crowdfunding com a nova resolução.",
    image:
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=2070&auto=format&fit=crop",
    category: "Aviso",
  },
  {
    id: 3,
    title: "Webinar: Análise de Startups",
    description:
      "Aprenda a analisar métricas de SaaS com nossos especialistas de mercado.",
    image:
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=2070&auto=format&fit=crop",
    category: "Educação",
  },
];

export const mockFundraisingRounds: StartupCard[] = [
  {
    id: 1,
    name: "FinFlow",
    description:
      "Plataforma de gestão financeira para PMEs com IA para conciliação e previsão de caixa.",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop",
    category: "FinTech",
    badges: ["Verificada", "Top Pick"],
    valuation: "15%",
    currentValue: "R$ 4.2M",
    totalTokens: 10000,
    soldTokens: 7500,
    minInvestment: "R$ 100",
    deadline: "12 dias",
    investors: 234,
  },
  {
    id: 2,
    name: "HealthSync",
    description:
      "Telemedicina com triagem inteligente e conexão direta com especialistas em saúde.",
    image:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=450&fit=crop",
    category: "HealthTech",
    badges: ["Verificada"],
    valuation: "12%",
    currentValue: "R$ 6.8M",
    totalTokens: 15000,
    soldTokens: 9200,
    minInvestment: "R$ 250",
    deadline: "8 dias",
    investors: 412,
  },
  {
    id: 3,
    name: "EduNext",
    description:
      "Plataforma adaptativa de ensino personalizado com trilhas geradas por IA.",
    image:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&h=450&fit=crop",
    category: "EdTech",
    badges: ["Acelerada", "ESG"],
    valuation: "18%",
    currentValue: "R$ 3.1M",
    totalTokens: 8000,
    soldTokens: 4800,
    minInvestment: "R$ 50",
    deadline: "21 dias",
    investors: 156,
  },
  {
    id: 4,
    name: "AgriTech Pro",
    description:
      "IoT e drones para agricultura de precisão com monitoramento de lavouras.",
    image:
      "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&h=450&fit=crop",
    category: "AgTech",
    badges: ["Verificada", "ESG"],
    valuation: "20%",
    currentValue: "R$ 2.5M",
    totalTokens: 12000,
    soldTokens: 6000,
    minInvestment: "R$ 150",
    deadline: "15 dias",
    investors: 189,
  },
  {
    id: 5,
    name: "LogiStream",
    description:
      "Otimização logística com IA para last-mile delivery e redução de custos.",
    image:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=450&fit=crop",
    category: "LogTech",
    badges: ["Top Pick"],
    valuation: "14%",
    currentValue: "R$ 5.3M",
    totalTokens: 20000,
    soldTokens: 15000,
    minInvestment: "R$ 200",
    deadline: "5 dias",
    investors: 567,
  },
  {
    id: 6,
    name: "CyberShield",
    description:
      "Cibersegurança para PMEs com firewall inteligente e backups automáticos.",
    image:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=450&fit=crop",
    category: "CyberSec",
    badges: ["Verificada", "B2B"],
    valuation: "16%",
    currentValue: "R$ 4.8M",
    totalTokens: 14000,
    soldTokens: 8400,
    minInvestment: "R$ 300",
    deadline: "18 dias",
    investors: 298,
  },
  {
    id: 7,
    name: "GreenEnergy",
    description:
      "Marketplace de energia renovável P2P com foco em geração solar e eólica.",
    image:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=450&fit=crop",
    category: "CleanTech",
    badges: ["Verificada", "ESG", "Top Pick"],
    valuation: "22%",
    currentValue: "R$ 7.2M",
    totalTokens: 25000,
    soldTokens: 18750,
    minInvestment: "R$ 100",
    deadline: "3 dias",
    investors: 823,
  },
  {
    id: 8,
    name: "RetailAI",
    description:
      "IA para varejo com precificação dinâmica e personalização de ofertas.",
    image:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=450&fit=crop",
    category: "RetailTech",
    badges: ["Acelerada"],
    valuation: "13%",
    currentValue: "R$ 3.9M",
    totalTokens: 11000,
    soldTokens: 5500,
    minInvestment: "R$ 75",
    deadline: "25 dias",
    investors: 145,
  },
];

export const mockVerifiedStartups: StartupCard[] = [
  {
    id: 9,
    name: "PaySmart",
    description: "Soluções de pagamento para economia digital.",
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=400&fit=crop",
    category: "FinTech",
    badges: ["Verificada", "Compliance"],
  },
  {
    id: 10,
    name: "MedTrack",
    description: "Rastreamento de medicamentos em cadeia farmacêutica.",
    image:
      "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?w=400&h=400&fit=crop",
    category: "HealthTech",
    badges: ["Verificada"],
  },
  {
    id: 11,
    name: "LearnHub",
    description: "Microlearning para treinamento corporativo.",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=400&fit=crop",
    category: "EdTech",
    badges: ["Verificada", "B2B"],
  },
  {
    id: 12,
    name: "DataVault",
    description: "Segurança de dados com criptografia quântica.",
    image:
      "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=400&fit=crop",
    category: "Tech / IA",
    badges: ["Verificada"],
  },
];

export const mockAcceleratedStartups: StartupCard[] = [
  {
    id: 13,
    name: "CloudSync",
    description: "Sincronização multi-cloud para equipes enterprise.",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop",
    category: "SaaS",
    badges: ["Acelerada"],
  },
  {
    id: 14,
    name: "BioSense",
    description: "Wearables inteligentes para monitoramento de saúde.",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=400&fit=crop",
    category: "HealthTech",
    badges: ["Acelerada", "Hardware"],
  },
  {
    id: 15,
    name: "TutorAI",
    description: "Tutoria virtual com IA generativa.",
    image:
      "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=400&fit=crop",
    category: "EdTech",
    badges: ["Acelerada"],
  },
  {
    id: 16,
    name: "GreenChain",
    description: "Blockchain para créditos de carbono e rastreabilidade.",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&h=400&fit=crop",
    category: "Tech / IA",
    badges: ["Acelerada", "ESG"],
  },
];

export const mockApprovalStartups: StartupCard[] = [
  {
    id: 17,
    name: "FoodTech Lab",
    description: "Proteínas alternativas e food science sustentável.",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop",
    category: "Outros",
    badges: ["Em Aprovação"],
  },
  {
    id: 18,
    name: "PropTech Now",
    description: "Tokenização de ativos imobiliários para investidores.",
    image:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=400&h=400&fit=crop",
    category: "FinTech",
    badges: ["Em Aprovação"],
  },
  {
    id: 19,
    name: "SkillPath",
    description: "Upskilling baseado em dados e trilhas inteligentes.",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop",
    category: "EdTech",
    badges: ["Em Aprovação"],
  },
];

export const mockOpportunities: OpportunityItem[] = [
  {
    id: 20,
    name: "CryptoSafe",
    type: "FinTech",
    icon: Briefcase,
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=400&fit=crop",
    badges: ["Verificada", "Compliance"],
  },
  {
    id: 21,
    name: "HealthAI",
    type: "HealthTech",
    icon: Shield,
    image:
      "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?w=400&h=400&fit=crop",
    badges: ["Verificada"],
  },
  {
    id: 22,
    name: "EduFlow",
    type: "EdTech",
    icon: GraduationCap,
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=400&fit=crop",
    badges: ["B2B"],
  },
  {
    id: 23,
    name: "AICore",
    type: "Tech / IA",
    icon: Cpu,
    image:
      "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=400&fit=crop",
    badges: ["Top Pick"],
  },
  {
    id: 24,
    name: "CloudOps",
    type: "SaaS",
    icon: Database,
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop",
    badges: ["Acelerada"],
  },
  {
    id: 25,
    name: "BioGen",
    type: "HealthTech",
    icon: Shield,
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=400&fit=crop",
    badges: ["Hardware"],
  },
  {
    id: 26,
    name: "PayFlow",
    type: "FinTech",
    icon: Briefcase,
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=400&fit=crop",
    badges: ["Verificada"],
  },
  {
    id: 27,
    name: "LearnX",
    type: "EdTech",
    icon: GraduationCap,
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=400&fit=crop",
    badges: ["Acelerada"],
  },
  {
    id: 28,
    name: "DataMesh",
    type: "Tech / IA",
    icon: Cpu,
    image:
      "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=400&fit=crop",
    badges: ["Compliance"],
  },
  {
    id: 29,
    name: "AutoSync",
    type: "SaaS",
    icon: Database,
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop",
    badges: ["B2B"],
  },
  {
    id: 30,
    name: "GreenTech",
    type: "Outros",
    icon: MoreHorizontal,
    image:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=400&fit=crop",
    badges: ["ESG"],
  },
  {
    id: 31,
    name: "SmartPay",
    type: "FinTech",
    icon: Briefcase,
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=400&fit=crop",
    badges: ["Top Pick"],
  },
  {
    id: 32,
    name: "MedSync",
    type: "HealthTech",
    icon: Shield,
    image:
      "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?w=400&h=400&fit=crop",
    badges: ["Verificada"],
  },
  {
    id: 33,
    name: "SkillUp",
    type: "EdTech",
    icon: GraduationCap,
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop",
    badges: ["Acelerada", "B2B"],
  },
  {
    id: 34,
    name: "AIVision",
    type: "Tech / IA",
    icon: Cpu,
    image:
      "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=400&fit=crop",
    badges: ["Verificada"],
  },
  {
    id: 35,
    name: "CloudBase",
    type: "SaaS",
    icon: Database,
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop",
    badges: ["Compliance"],
  },
];

export const mockInvestorTestimonials: Testimonial[] = [
  {
    id: 1,
    text: "Investir através da iSelfToken foi simples e trouxe liquidez que eu não tinha antes.",
    name: "Ricardo Mendes",
    role: "Investidor",
    initials: "RM",
  },
  {
    id: 2,
    text: "A plataforma me deu confiança para diversificar meu portfólio com startups inovadoras.",
    name: "Ana Carolina Silva",
    role: "Investidora",
    initials: "AS",
  },
  {
    id: 3,
    text: "Uma forma acessível de investir em inovação, com processo 100% digital.",
    name: "Pedro Oliveira",
    role: "Investidor",
    initials: "PO",
  },
  {
    id: 4,
    text: "Curadoria excelente e transparência em todas as etapas do investimento.",
    name: "Marina Costa",
    role: "Investidora",
    initials: "MC",
  },
  {
    id: 5,
    text: "O dashboard de acompanhamento é completo e consigo ver tudo em tempo real.",
    name: "Lucas Ferreira",
    role: "Investidor",
    initials: "LF",
  },
  {
    id: 6,
    text: "Diversifiquei meus investimentos em várias startups com valores acessíveis.",
    name: "Beatriz Santos",
    role: "Investidora",
    initials: "BS",
  },
];

export const mockFounderTestimonials: Testimonial[] = [
  {
    id: 1,
    text: "Conseguimos levantar o round com investidores qualificados em tempo recorde.",
    name: "Carlos Eduardo",
    role: "CEO, TechFlow",
    initials: "CE",
    linkedin: "https://linkedin.com",
    youtube: "https://youtube.com",
    website: "https://iselftoken.com",
  },
  {
    id: 2,
    text: "O processo de tokenização foi muito mais simples do que eu esperava.",
    name: "Juliana Pires",
    role: "Founder, HealthSync",
    initials: "JP",
    linkedin: "https://linkedin.com",
    youtube: "https://youtube.com",
    website: "https://iselftoken.com",
  },
  {
    id: 3,
    text: "Além do capital, ganhamos visibilidade para uma base de investidores engajados.",
    name: "Fernando Costa",
    role: "CTO, DataVault",
    initials: "FC",
    linkedin: "https://linkedin.com",
    youtube: "https://youtube.com",
    website: "https://iselftoken.com",
  },
  {
    id: 4,
    text: "O selo de verificação trouxe credibilidade extra para nossa startup.",
    name: "Camila Rodrigues",
    role: "CEO, EduNext",
    initials: "CR",
    linkedin: "https://linkedin.com",
    youtube: "https://youtube.com",
    website: "https://iselftoken.com",
  },
  {
    id: 5,
    text: "Captamos de investidores de vários países com a tokenização global.",
    name: "Roberto Almeida",
    role: "Founder, AgriTech Pro",
    initials: "RA",
    linkedin: "https://linkedin.com",
    youtube: "https://youtube.com",
    website: "https://iselftoken.com",
  },
  {
    id: 6,
    text: "O suporte jurídico e regulatório nos poupou meses de trabalho e consultoria.",
    name: "Patricia Lima",
    role: "COO, CloudSync",
    initials: "PL",
    linkedin: "https://linkedin.com",
    youtube: "https://youtube.com",
    website: "https://iselftoken.com",
  },
];

export const opportunityFilters = [
  { key: "all", label: "Todas" },
  { key: "fintech", label: "FinTech" },
  { key: "healthtech", label: "HealthTech" },
  { key: "edtech", label: "EdTech" },
  { key: "tech-ia", label: "Tech / IA" },
  { key: "saas", label: "SaaS" },
  { key: "outros", label: "Outros" },
];
