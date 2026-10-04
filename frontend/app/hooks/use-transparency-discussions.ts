/**
 * Hook: useTransparencyDiscussions(startupId, filters)
 * Hook: useTransparencyDiscussion(discussionId)
 *
 * GET /api/transparency/discussions/:startupId?q=&category=&sort=&page=&limit=
 * GET /api/transparency/discussions/:id
 *
 * Documentacao: scripts/PRD_PAGINA_TRANSPARENCIA.md (TRANSP-03/04)
 */
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type {
  DiscussionDetailResponse,
  DiscussionListFilters,
  DiscussionListResponse,
} from "~/types/transparency";

async function fetchDiscussions(
  startupId: number,
  filters: DiscussionListFilters,
): Promise<DiscussionListResponse> {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));

  const qs = params.toString();
  const res = await fetch(
    `/api/transparency/discussions/${startupId}${qs ? `?${qs}` : ""}`,
    { credentials: "include" },
  );
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data?.message || `Falha ao carregar discussions (${res.status})`,
    );
  }

  const result = data?.data ?? data;
  return {
    items: result?.items ?? [],
    total: result?.total ?? 0,
    page: result?.page ?? 1,
    limit: result?.limit ?? 20,
  };
}

export function discussionsQueryOptions(
  startupId: number,
  filters: DiscussionListFilters,
) {
  return {
    queryKey: queryKeys.transparency.discussions(startupId, filters),
    queryFn: () => fetchDiscussions(startupId, filters),
    staleTime: 60 * 1000,
    retry: 1,
    enabled: startupId > 0,
    placeholderData: (prev: DiscussionListResponse | undefined) => prev,
  };
}

export function useTransparencyDiscussions(
  startupId: number,
  filters: DiscussionListFilters = {},
) {
  return useQuery(discussionsQueryOptions(startupId, filters));
}

/* -------------------------------------------------------------------------- */

async function fetchDiscussionDetail(
  discussionId: string,
): Promise<DiscussionDetailResponse> {
  const res = await fetch(
    `/api/transparency/discussions/${discussionId}`,
    { credentials: "include" },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data?.message || `Falha ao carregar thread (${res.status})`,
    );
  }
  const result = data?.data ?? data;
  return {
    discussion: result?.discussion,
    replies: result?.replies ?? [],
  };
}

export function discussionDetailQueryOptions(discussionId: string) {
  return {
    queryKey: queryKeys.transparency.discussion(discussionId),
    queryFn: () => fetchDiscussionDetail(discussionId),
    staleTime: 60 * 1000,
    retry: 1,
    enabled: !!discussionId,
  };
}

export function useTransparencyDiscussion(discussionId: string) {
  return useQuery(discussionDetailQueryOptions(discussionId));
}