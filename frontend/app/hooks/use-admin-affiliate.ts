import { useQuery } from "@tanstack/react-query";
import { adminAffiliateQueryOptions } from "~/lib/queries";

/**
 * Hook: useAdminAffiliateQuery
 *
 * Carrega programas + afiliações pendentes/histórico para /admin/affiliate.
 * staleTime 30s (decisões mudam fila visivelmente).
 */
export function useAdminAffiliateQuery() {
  return useQuery(adminAffiliateQueryOptions);
}
