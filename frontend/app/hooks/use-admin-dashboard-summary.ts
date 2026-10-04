import { useQuery } from "@tanstack/react-query";
import { adminDashboardSummaryQueryOptions } from "~/lib/queries";

/**
 * Hook: useAdminDashboardSummaryQuery
 *
 * Carrega KPIs + séries + filas do dashboard executivo /admin/dashboard.
 * staleTime 60s (mudanças raramente justificam refetch agressivo).
 */
export function useAdminDashboardSummaryQuery() {
  return useQuery(adminDashboardSummaryQueryOptions);
}
