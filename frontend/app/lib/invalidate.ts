/**
 * Helpers centralizados de invalidação/refetch de queries TanStack Query.
 *
 * Sprint fix cache-stale pós-compra de plano: evita divergência entre
 * consumers (usePricingSubscriptionMutation, checkout-payment,
 * usePaymentConfirmedSocket, profile-plans) que cada um implementava
 * sua própria lista de invalidações. Centralizar garante que uma nova
 * chave relacionada a "user state" (ex.: novo recurso de subscription)
 * só precise ser adicionada em UM lugar.
 */
import type { QueryClient } from "@tanstack/react-query";
import { meQueryOptions } from "~/lib/queries";

/**
 * Refetch IMEDIATO de `["me"]` (estado do usuário, incluindo
 * subscriptions[] e wallet). Usado após mutations que alteram o estado
 * do usuário (compra de plano, edição de identidade, etc).
 *
 * Preferir `refetchQueries` em vez de `invalidateQueries` quando o
 * caller depende do dado fresco AGORA (ex.: navegação imediata após
 * mutation). `invalidateQueries` é lazy e só refetcha no próximo
 * mount de `useQuery`.
 */
export async function refetchMeQuery(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.refetchQueries({ queryKey: meQueryOptions.queryKey });
}

/**
 * Refetch de todas as queries que dependem do estado do usuário.
 *
 * Comportamento:
 * - `["me"]` → refetch IMEDIATO (await) — user precisa ver o plano novo
 *   agora (Sidebar, TopNavbar, /home).
 * - Demais chaves (`["notifications-unread-count"]`, `["wallet"]`,
 *   `["transactions"]`) → invalidate (lazy) — não bloqueiam o caller.
 *
 * Use esta função sempre que uma mutation alterar estado do usuário
 * pós-pagamento, pós-edição de identidade ou pós-decisão KYC.
 */
export async function refreshUserRelatedQueries(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.refetchQueries({ queryKey: meQueryOptions.queryKey });

  queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
  queryClient.invalidateQueries({ queryKey: ["wallet"] });
  queryClient.invalidateQueries({ queryKey: ["transactions"] });
}