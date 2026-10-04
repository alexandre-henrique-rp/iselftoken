import { useQuery } from "@tanstack/react-query";
import { complianceDashboardSummaryQueryOptions } from "~/lib/queries";

export function useComplianceDashboardSummaryQuery() {
  return useQuery(complianceDashboardSummaryQueryOptions);
}
