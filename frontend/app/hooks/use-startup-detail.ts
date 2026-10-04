/**
 * Hook para detalhe de startup (startup-detail.tsx).
 *
 * GET /api/startup/:id → startup data
 * staleTime 30s — dado de marketing muda raramente.
 */
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";

export type StartupDetail = {
  id: number;
  name: string;
  logo: string;
  description: string;
  category: string;
  stage: string;
  metrics: {
    valuation: string;
    tokenPrice: string;
    tokensAvailable: string;
    investors: string;
  };
  campaign: {
    raised: string;
    goal: string;
    percentage: number;
    equity: string;
    minInvestment: string;
    remainingDays: number;
  };
  investment: {
    campaignId: number;
    tokenPrice: number;
    minInvestment: number;
    tokensAvailable: number;
  } | null;
};

async function fetchStartupDetail(id: string | number): Promise<StartupDetail> {
  const res = await fetch(`/api/startup/${id}`, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`Startup não encontrada (${res.status})`);
  }
  return (await res.json()) as StartupDetail;
}

export function startupDetailQueryOptions(id: string | number) {
  return {
    queryKey: queryKeys.startupDetail(id),
    queryFn: () => fetchStartupDetail(id),
    staleTime: 30_000,
    enabled: Boolean(id),
  };
}

export function useStartupDetailQuery(id: string | number) {
  return useQuery(startupDetailQueryOptions(id));
}
