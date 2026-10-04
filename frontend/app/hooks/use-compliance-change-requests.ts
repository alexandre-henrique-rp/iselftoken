import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type { ChangeRequest } from "~/lib/change-request-types";

interface ChangeRequestsResponse {
  data: ChangeRequest[];
}

/** Busca solicitações PENDING para o painel de compliance. */
export function useComplianceChangeRequests() {
  return useQuery({
    queryKey: queryKeys.complianceChangeRequests,
    queryFn: async (): Promise<ChangeRequest[]> => {
      const res = await fetch("/api/compliance/change-requests", {
        credentials: "include",
      });
      if (!res.ok) return [];
      const json: ChangeRequestsResponse = await res.json();
      return json.data ?? [];
    },
    staleTime: 30_000,
  });
}
