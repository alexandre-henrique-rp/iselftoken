/**
 * Hook para tela de investidores do founder (founder-investors.tsx).
 *
 * GET /api/startup/dashboard/investors?startupId=... → lista agregada.
 * staleTime 30s.
 */
import { useQuery } from "@tanstack/react-query";
import { founderInvestorsQueryOptions } from "~/lib/queries";

export function useFounderInvestorsQuery(startupId: string | null) {
  return useQuery(founderInvestorsQueryOptions(startupId));
}
