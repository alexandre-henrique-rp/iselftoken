/**
 * Hook para startups relacionadas (startup-detail page).
 *
 * GET /api/startup/related → startups com sobreposição de categoria/setor.
 * staleTime 60s — lista auxiliar.
 */
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";

export type RelatedStartup = {
  id: number;
  name: string;
  logo: string;
  category: string;
  stage: string;
};

async function fetchRelatedStartups(): Promise<RelatedStartup[]> {
  const res = await fetch("/api/startup/related", { credentials: "include" });
  if (!res.ok) {
    return [];
  }
  const json = await res.json().catch(() => null);
  return (json?.data ?? json ?? []) as RelatedStartup[];
}

export const relatedStartupsQueryOptions = {
  queryKey: queryKeys.relatedStartups,
  queryFn: () => fetchRelatedStartups(),
  staleTime: 60_000,
};

export function useRelatedStartupsQuery() {
  return useQuery(relatedStartupsQueryOptions);
}
