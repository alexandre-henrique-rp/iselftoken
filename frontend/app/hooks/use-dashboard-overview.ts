/**
 * Hook TanStack Query para o Founder Dashboard Overview (M5-S12 T053).
 *
 * Consome GET /api/startup que retorna payload expandido:
 * { error, message, codigo, data: { startups, summary, tabsCount } }
 *
 * Reutiliza a queryKey ["startups"] para compartilhar cache com startupsQueryOptions
 * e evitar requests duplicadas ao mesmo endpoint.
 */
import { useQuery } from "@tanstack/react-query";
import type {
  DashboardOverview,
  DashboardOverviewResponse,
} from "~/types/dashboard";
import { startupsQueryOptions } from "~/lib/queries";

export const DASHBOARD_OVERVIEW_QUERY_KEY = startupsQueryOptions.queryKey;

function selectDashboardOverview(json: any): DashboardOverview {
  const response = json as DashboardOverviewResponse;
  if (response.error || !response.data) {
    throw new Error(response.message || "Invalid dashboard overview response");
  }
  return response.data;
}

export function dashboardOverviewQueryOptions() {
  return {
    ...startupsQueryOptions,
    select: selectDashboardOverview,
  };
}

export function useDashboardOverview() {
  return useQuery(dashboardOverviewQueryOptions());
}
