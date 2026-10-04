/**
 * Hook para buscar startups agrupadas onde o investidor possui tokens.
 *
 * Re-exporta `investedStartupsQueryOptions` e o tipo `InvestedStartupsResponse`
 * definidos em `~/lib/queries.ts` (single source of truth). Componentes podem
 * usar `useInvestedStartupsQuery` para client-side ou consumir as queryOptions
 * diretamente em loaders SSR (`setQueryData` + `dehydrate`).
 *
 * @example
 *   // Client-side
 *   const { data, isLoading } = useInvestedStartupsQuery();
 *
 *   // SSR loader (BFF de /founder/dashboard)
 *   await queryClient.setQueryData(
 *     investedStartupsQueryOptions.queryKey,
 *     payload,
 *   );
 */
import { useQuery } from "@tanstack/react-query";
import {
  investedStartupsQueryOptions,
  type InvestedStartupsResponse,
} from "~/lib/queries";

export type { InvestedStartupsResponse };

export function useInvestedStartupsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...investedStartupsQueryOptions,
    enabled: options?.enabled ?? true,
  });
}
