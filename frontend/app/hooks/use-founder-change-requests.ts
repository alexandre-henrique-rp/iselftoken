import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type { ChangeRequest } from "~/lib/change-request-types";

interface ChangeRequestsResponse {
  data: ChangeRequest[];
}

/** Busca solicitações de alteração do fundador para uma startup. */
export function useFounderChangeRequests(startupId: string | null) {
  return useQuery({
    queryKey: queryKeys.founderChangeRequests(startupId),
    queryFn: async (): Promise<ChangeRequest[]> => {
      if (!startupId) return [];
      const res = await fetch(`/api/founder/startups/${startupId}/change-requests`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      const json: ChangeRequestsResponse = await res.json();
      return json.data ?? [];
    },
    enabled: !!startupId,
    staleTime: 30_000,
  });
}
