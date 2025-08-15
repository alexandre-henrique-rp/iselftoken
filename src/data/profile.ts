// Dados extraídos do exemplo doc/exemplo/profile.tsx
// Mantidos aqui como fonte única de verdade para uso na UI

export type RecentInvestment = {
  startup: string;
  amount: string;
  date: string;
  status: string;
  roi: string;
};

export type InvestmentStats = {
  totalInvestments: number;
  totalAmount: string;
  activeInvestments: number;
  successfulExits: number;
  averageROI: string;
  portfolioValue: string;
};

export const investmentStats: InvestmentStats = {
  totalInvestments: 12,
  totalAmount: "R$ 850.000",
  activeInvestments: 8,
  successfulExits: 2,
  averageROI: "23.5%",
  portfolioValue: "R$ 1.2M",
};

export const recentInvestments: RecentInvestment[] = [
  {
    startup: "EcoTech Solutions",
    amount: "R$ 50.000",
    date: "15 Jan 2025",
    status: "Ativo",
    roi: "+15%",
  },
  {
    startup: "HealthAI",
    amount: "R$ 75.000",
    date: "8 Jan 2025",
    status: "Ativo",
    roi: "+8%",
  },
  {
    startup: "EdTech Pro",
    amount: "R$ 100.000",
    date: "22 Dez 2024",
    status: "Ativo",
    roi: "+22%",
  },
];

export type ProfileUser = {
  name: string;
  email: string;
  company: string;
  avatar?: string;
};

export const demoUser: ProfileUser = {
  name: "João Silva",
  email: "joao@exemplo.com",
  company: "Tech Ventures",
};
