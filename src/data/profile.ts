import { StartupTypes } from "@/types/ProfileTypes";

export const ProfileCards: StartupTypes.getAllStartups[] = [
  {
    id: 1,
    name: 'EcoTech Solutions',
    logo: 'https://elements-resized.envatousercontent.com/elements-cover-images/1b61fe0b-8639-4748-aaf1-e0e45f50c8c1?w=2038&cf_fit=scale-down&q=85&format=auto&s=5b368b136e2ed7984c318b0399c1da86d4afd5954fd13ad7ae276d9dec8a6fd6',
    category: 'Sustentabilidade',
    selos: [
      {
        id: 'eco-tech',
        label: 'Sustentabilidade',
        image: '/selos/startup.svg',
      },
    ],
    description:
      'Soluções inovadoras para energia renovável e sustentabilidade urbana.',
    image:
      'https://images.unsplash.com/photo-1522199755839-a2bacb67c546?q=80&w=1600&auto=format&fit=crop',
    equityPercentage: '30%',
    totalTokens: '1000',
    tokensRemaining: '100',
  },
  {
    id: 2,
    name: 'HealthTech AI',
    logo: 'https://elements-resized.envatousercontent.com/elements-cover-images/721c8410-463a-48fe-9e4d-5e1956941a21?w=2038&cf_fit=scale-down&q=85&format=auto&s=a4b279e82ae5fcb4ab7bdbb4676aa973f4fc56a90e00b1790fedc6931e2f2330',
    category: 'Saúde',
    selos: [
      {
        id: 'health-ai',
        label: 'Saúde',
        image: '/selos/Vector (3).svg',
      },
    ],
    description: 'Plataforma de IA para triagem e acompanhamento de pacientes.',
    image:
      'https://images.unsplash.com/photo-1581092921461-eab62e97a780?q=80&w=1600&auto=format&fit=crop',
    equityPercentage: '15%',
    totalTokens: '2000',
    tokensRemaining: '1120',
  },
  {
    id: 3,
    name: 'EduTech Pro',
    logo: 'https://elements-resized.envatousercontent.com/elements-cover-images/b6b1240d-f5fe-43de-a7eb-0794f7781bcc?w=2038&cf_fit=scale-down&q=85&format=auto&s=89522a0e5202f06b779a92601e4b68f5ba83bb7bf61c63f0234733254cbd2f70',
    category: 'Educação',
    selos: [
      {
        id: 'edtech-pro',
        label: 'Educação',
        image: '/selos/Vector.svg',
      },
    ],
    description:
      'Ferramentas de aprendizagem adaptativa para escolas públicas.',
    image:
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1600&auto=format&fit=crop',
    equityPercentage: '15%',
    totalTokens: '5000',
    tokensRemaining: '1500',
  },
  {
    id: 4,
    name: 'FinTech Plus',
    logo: '/logos/fintech.svg',
    category: 'Fintech',
    selos: [
      {
        id: 'fintech-plus',
        label: 'Fintech',
        image: '/selos/Vector (2).svg',
      },
    ],
    description: 'Plataforma de pagamentos digitais para pequenas empresas.',
    image:
      'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1600&auto=format&fit=crop',
    equityPercentage: '15%',
    totalTokens: '3000',
    tokensRemaining: '1200',
  },
  {
    id: 5,
    name: 'BioTech Innovations',
    logo: '/logos/biotech.svg',
    category: 'Biotecnologia',
    selos: [
      {
        id: 'biotech-innovations',
        label: 'Biotech',
        image: '/selos/Vector (1).svg',
      },
    ],
    description: 'Desenvolvimento de terapias genéticas para doenças raras.',
    image:
      'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=1600&auto=format&fit=crop',
    equityPercentage: '15%',
    totalTokens: '2500',
    tokensRemaining: '1175',
  },
  {
    id: 6,
    name: 'MobilityTech',
    logo: 'https://elements-resized.envatousercontent.com/elements-cover-images/mobility-tech-logo.svg',
    category: 'Mobilidade',
    selos: [
      {
        id: 'mobility-tech',
        label: 'Mobilidade',
        image: '/selos/Vector (4).svg',
      },
    ],
    description: 'Soluções de mobilidade urbana sustentável e inteligente.',
    image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=200&fit=crop',
    equityPercentage: '20%',
    totalTokens: '4000',
    tokensRemaining: '1200',
  },
];