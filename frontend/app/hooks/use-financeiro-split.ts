import { useQuery } from "@tanstack/react-query";
import {
  financeiroSplitQueryOptions,
  financeiroSplitDetailQueryOptions,
  type FinanceiroSplitFilters,
} from "~/lib/queries";

/**
 * Hook: useFinanceiroSplitQuery
 *
 * Carrega a lista paginada de campanhas com breakdown do split financeiro
 * (repasse × lucro plataforma). staleTime 60s.
 */
export function useFinanceiroSplitQuery(filters: FinanceiroSplitFilters) {
  return useQuery(financeiroSplitQueryOptions(filters));
}

/**
 * Hook: useFinanceiroSplitDetailQuery
 *
 * Carrega o detalhe de uma campanha + lista de investments individuais
 * do split. Habilitado apenas quando `campaignId` é truthy.
 */
export function useFinanceiroSplitDetailQuery(campaignId: number | null) {
  return useQuery(financeiroSplitDetailQueryOptions(campaignId ?? 0));
}
