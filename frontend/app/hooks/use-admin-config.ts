import { useQuery } from "@tanstack/react-query";
import { adminConfigQueryOptions } from "~/lib/queries";

/**
 * Hook: useAdminConfigQuery
 *
 * Lista parâmetros de configuração vigentes + histórico + agendamentos
 * para /admin/config. staleTime 60s (alterações são raras).
 */
export function useAdminConfigQuery() {
  return useQuery(adminConfigQueryOptions);
}
