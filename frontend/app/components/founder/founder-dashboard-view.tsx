/**
 * Sub-árvore da dashboard do fundador — aba "Como Fundador".
 *
 * Renderiza Header + Métricas + Filtros + Lista/Grid/Kanban + Paginação,
 * tratando todos os 4 estados (Loading skeleton, Error retry, Empty,
 * Filtros sem match, Data).
 */
import { FounderFilters } from "~/components/founder/founder-filters";
import { FounderHeader } from "~/components/founder/founder-header";
import { FounderMetrics } from "~/components/founder/founder-metrics";
import { FounderPagination } from "~/components/founder/founder-pagination";
import { StartupGridView } from "~/components/founder/startup-grid-view";
import { StartupKanbanBoard } from "~/components/founder/startup-kanban-board";
import { StartupListView } from "~/components/founder/startup-list-view";
import {
  DashboardError,
  DashboardStartupGridSkeleton,
  EmptyNoMatch,
  EmptyNoStartups,
} from "./dashboard-empty-states";
import type { DashboardCounts, DashboardSearchState } from "./dashboard-state";
import type { Startup } from "./startup-card";

interface FounderViewProps {
  metrics: import("~/lib/queries").DashboardMetrics;
  counts: DashboardCounts;
  isInitialLoading: boolean;
  hasError: boolean;
  hasAny: boolean;
  hasMatch: boolean;
  state: DashboardSearchState;
  visible: Startup[];
  page: number;
  totalPages: number;
  onRetry: () => void;
  onClearFilters: () => void;
}

export function FounderDashboardView({
  metrics,
  counts,
  isInitialLoading,
  hasError,
  hasAny,
  hasMatch,
  state,
  visible,
  page,
  totalPages,
  onRetry,
  onClearFilters,
}: FounderViewProps) {
  return (
    <>
      <FounderHeader />
      <FounderMetrics metrics={metrics} />
      <FounderFilters
        totalCount={counts.total}
        approvedCount={counts.approved}
        analyzingCount={counts.analyzing}
        campaignCounts={counts.campaigns}
      />

      {isInitialLoading ? (
        <DashboardStartupGridSkeleton />
      ) : hasError ? (
        <DashboardError onRetry={onRetry} />
      ) : !hasAny ? (
        <EmptyNoStartups />
      ) : !hasMatch ? (
        <EmptyNoMatch onClear={onClearFilters} />
      ) : state.view === "grid" ? (
        <StartupGridView startups={visible} />
      ) : state.view === "kanban" ? (
        <StartupKanbanBoard startups={visible} />
      ) : (
        <StartupListView startups={visible} />
      )}

      {state.view !== "kanban" && hasMatch && totalPages > 1 && (
        <FounderPagination
          page={page}
          totalPages={totalPages}
          shown={visible.length}
          total={hasMatch ? filteredTotal(state, hasMatch, totalPages, visible.length) : 0}
        />
      )}
    </>
  );
}

function filteredTotal(
  state: DashboardSearchState,
  hasMatch: boolean,
  totalPages: number,
  visibleLen: number,
): number {
  if (!hasMatch) return 0;
  return state.view === "kanban" ? visibleLen : totalPages * visibleLen;
}
