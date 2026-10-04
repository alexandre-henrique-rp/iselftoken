/**
 * Hook para o dashboard do investidor (investor-dashboard.tsx).
 *
 * GET /api/investments → lista de aportes + métricas calculadas.
 * staleTime 30s.
 */
import { useQuery } from "@tanstack/react-query";
import { investorDashboardQueryOptions } from "~/lib/queries";

export function useInvestorDashboardQuery() {
  return useQuery(investorDashboardQueryOptions);
}
