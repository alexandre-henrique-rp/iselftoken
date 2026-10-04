/**
 * Hook agregador da dashboard do fundador.
 *
 * Centraliza:
 *  - 2 queries (startups, metrics) hidratadas via SSR
 *  - parse + memo do search state (filtros + paginação)
 *  - derivação dos slices visíveis por view (list/grid/kanban)
 *  - detecção de estados (hasAny / hasMatch / isInitialLoading)
 *
 * Retorna o estado pronto para renderização + handler de refetch.
 */
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  applyFilters,
  deriveCounts,
  mapApiToStartup,
  PAGE_SIZE,
  parseSearchState,
  type DashboardCounts,
  type DashboardSearchState,
} from "~/components/founder/dashboard-state";
import type { Startup } from "~/components/founder/startup-card";
import {
  startupDashboardMetricsQueryOptions,
  startupsQueryOptions,
  type DashboardMetrics,
} from "~/lib/queries";
import type { FounderStartup } from "~/types/founder-startup";

function emptyMetrics(): DashboardMetrics {
  return {
    investor_count: 0,
    amount_raised: 0,
    days_remaining: null,
    total_campaigns: 0,
    open_campaigns: 0,
    average_progress: 0,
  };
}

export interface FounderDashboardState {
  metrics: DashboardMetrics;
  counts: DashboardCounts;
  filtered: Startup[];
  visible: Startup[];
  hasAny: boolean;
  hasMatch: boolean;
  isInitialLoading: boolean;
  hasError: boolean;
  state: DashboardSearchState;
  page: number;
  totalPages: number;
  refetch: () => void;
}

export function useFounderDashboardState(): FounderDashboardState {
  const [searchParams] = useSearchParams();
  const state = useMemo(() => parseSearchState(searchParams), [searchParams]);

  const startupsQuery = useQuery(startupsQueryOptions);
  const metricsQuery = useQuery(startupDashboardMetricsQueryOptions);

  const metrics = metricsQuery.data?.data ?? emptyMetrics();

  const startupsAll: Startup[] = useMemo(
    () =>
      ((startupsQuery.data?.data ?? []) as FounderStartup[]).map(
        mapApiToStartup,
      ),
    [startupsQuery.data],
  );
  const counts: DashboardCounts = useMemo(
    () => deriveCounts(startupsAll),
    [startupsAll],
  );
  const filtered: Startup[] = useMemo(
    () => applyFilters(startupsAll, state),
    [startupsAll, state],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(state.page, totalPages);
  const visible: Startup[] =
    state.view === "kanban"
      ? filtered
      : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasAny = startupsAll.length > 0;
  const hasMatch = filtered.length > 0;
  const isInitialLoading =
    startupsQuery.isPending && startupsQuery.isFetching && !startupsQuery.data;
  const hasError = startupsQuery.isError;

  return {
    metrics,
    counts,
    filtered,
    visible,
    hasAny,
    hasMatch,
    isInitialLoading,
    hasError,
    state,
    page,
    totalPages,
    refetch: () => startupsQuery.refetch(),
  };
}
