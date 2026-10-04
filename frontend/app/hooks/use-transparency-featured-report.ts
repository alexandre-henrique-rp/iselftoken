/**
 * Hook: useTransparencyFeaturedReport(startupId)
 *
 * GET /api/transparency/featured/:startupId
 *   -> backend /transparency/startups/:startupId/featured-report
 *
 * Retorna o post vigente do mes atual (FINANCIAL_REPORT). 204 / null => null.
 *
 * Documentacao: scripts/PRD_PAGINA_TRANSPARENCIA.md (TRANSP-03)
 */
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type { TransparencyPost } from "~/types/transparency";

async function fetchFeaturedReport(
  startupId: number,
): Promise<TransparencyPost | null> {
  const res = await fetch(
    `/api/transparency/featured/${startupId}`,
    { credentials: "include" },
  );
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data?.message || `Falha ao carregar post vigente (${res.status})`,
    );
  }

  // BFF traduz 204 -> { data: null }
  if (data?.data === null || data?.data === undefined) return null;
  return data?.data ?? null;
}

export function featuredReportQueryOptions(startupId: number) {
  return {
    queryKey: queryKeys.transparency.featured(startupId),
    queryFn: () => fetchFeaturedReport(startupId),
    staleTime: 5 * 60 * 1000, // 5min (espelha TTL Redis backend)
    retry: 1,
    enabled: startupId > 0,
  };
}

export function useTransparencyFeaturedReport(startupId: number) {
  return useQuery(featuredReportQueryOptions(startupId));
}