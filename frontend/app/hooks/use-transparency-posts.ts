/**
 * Hook para listar posts de transparencia de uma startup.
 *
 * GET /api/transparency/startups/:startupId/posts (BFF)
 *   -> backend /transparency/startups/:startupId/posts
 *
 * Documentacao: scripts/PRD_PAGINA_TRANSPARENCIA.md §5.3
 */
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type {
  TransparencyListFilters,
  TransparencyListResponse,
} from "~/types/transparency";

async function fetchTransparencyPosts(
  startupId: number,
  filters: TransparencyListFilters,
): Promise<TransparencyListResponse> {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.year !== undefined) params.set("year", String(filters.year));
  if (filters.month !== undefined) params.set("month", String(filters.month));
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));

  const qs = params.toString();
  const res = await fetch(
    `/api/transparency/startups/${startupId}/posts${qs ? `?${qs}` : ""}`,
    { credentials: "include" },
  );
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.message || `Falha ao carregar posts (${res.status})`;
    throw new Error(message);
  }

  // Backend retorna { data, total, page, limit } ou { success, data: { data, total, ... } }
  const result = data?.data ?? data;
  return {
    data: result?.data ?? [],
    total: result?.total ?? 0,
    page: result?.page ?? 1,
    limit: result?.limit ?? 10,
  };
}

export function transparencyPostsQueryOptions(
  startupId: number,
  filters: TransparencyListFilters,
) {
  return {
    queryKey: queryKeys.transparency.posts(startupId, filters),
    queryFn: () => fetchTransparencyPosts(startupId, filters),
    staleTime: 60 * 1000,
    retry: 1,
    enabled: startupId > 0,
  };
}

export function useTransparencyPosts(
  startupId: number,
  filters: TransparencyListFilters = {},
) {
  return useQuery(transparencyPostsQueryOptions(startupId, filters));
}
