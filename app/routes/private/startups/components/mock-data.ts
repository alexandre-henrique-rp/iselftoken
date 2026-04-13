import type { CampaignStatus, PlatformStatus, StartupItem } from "./types";

export const STARTUP_MOCK_DATA: StartupItem[] = [
  {
    id: "1",
    name: "FinFlow",
    segment: "FinTech",
    logo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop",
    status: "approved",
    stage: "Seed",
    totalTokens: 100000,
    soldTokens: 75000,
    createdAt: "2025-12-01",
    campaign: {
      status: "open",
      raised: 630000,
      goal: 840000,
      percentage: 75,
      investors: 234,
      daysLeft: 12,
    },
  },
  {
    id: "2",
    name: "AgriTech Pro",
    segment: "AgTech",
    logo: "https://images.unsplash.com/photo-1595856763437-14732d0f3933?w=100&h=100&fit=crop",
    status: "approved",
    stage: "Pre-seed",
    totalTokens: 120000,
    soldTokens: 0,
    createdAt: "2026-01-15",
    campaign: {
      status: "editing",
      raised: 0,
      goal: 1200000,
      percentage: 0,
      investors: 0,
      daysLeft: null,
    },
  },
  {
    id: "3",
    name: "HealthSync",
    segment: "HealthTech",
    logo: "https://images.unsplash.com/photo-1555421689-d68471e18963?w=100&h=100&fit=crop",
    status: "analysis",
    stage: "MVP",
    totalTokens: 50000,
    soldTokens: 0,
    createdAt: "2026-01-20",
    campaign: null,
  },
  {
    id: "4",
    name: "UrbanGrid",
    segment: "Smart Cities",
    logo: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=100&h=100&fit=crop",
    status: "rejected",
    stage: "Traction",
    totalTokens: 90000,
    soldTokens: 18000,
    createdAt: "2026-01-08",
    campaign: {
      status: "closed",
      raised: 180000,
      goal: 900000,
      percentage: 20,
      investors: 89,
      daysLeft: null,
    },
  },
];

export const platformStatusConfig: Record<
  PlatformStatus,
  { label: string; className: string }
> = {
  approved: {
    label: "Aprovada",
    className: "bg-green-500/10 text-green-400 border-green-500/30",
  },
  analysis: {
    label: "Em análise",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  rejected: {
    label: "Rejeitada",
    className: "bg-red-500/10 text-red-400 border-red-500/30",
  },
  draft: {
    label: "Rascunho",
    className: "bg-stone-800 text-stone-300 border-stone-700",
  },
};

export const campaignStatusConfig: Record<
  CampaignStatus,
  { label: string; className: string }
> = {
  open: {
    label: "Captação aberta",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
  editing: {
    label: "Em edição",
    className: "bg-stone-800 text-stone-300 border-stone-700",
  },
  funded: {
    label: "Financiada",
    className: "bg-green-500/10 text-green-400 border-green-500/30",
  },
  closed: {
    label: "Encerrada",
    className: "bg-stone-800 text-stone-400 border-stone-700",
  },
};
