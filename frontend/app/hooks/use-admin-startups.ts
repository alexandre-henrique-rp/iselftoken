import { useQuery } from "@tanstack/react-query";
import {
  adminStartupsQueryOptions,
  type AdminStartupsPage,
} from "~/lib/queries";

export interface UseAdminStartupsParams {
  page?: number;
  search?: string;
  status?: string;
  segmento?: string;
}

/**
 * Hook: useAdminStartupsQuery
 *
 * Lista paginada de startups para a tela admin /admin/startups.
 * staleTime 30s; desabilita busca com <3 chars (evita爆炸 de requests).
 */
export function useAdminStartupsQuery(params: UseAdminStartupsParams = {}) {
  return useQuery(adminStartupsQueryOptions(params)) as ReturnType<
    typeof useQuery<AdminStartupsPage>
  >;
}
