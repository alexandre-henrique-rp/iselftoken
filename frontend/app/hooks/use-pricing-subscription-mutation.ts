/**
 * Mutation composta para adicionar uma assinatura em /pricing.
 *
 * Consolida 3 fetches sequenciais:
 *   1. POST /api/subscriptions              (cria PENDING)
 *   2. POST /api/payment                    (cria payment SUBSCRIPTION)
 *   3. onSuccess → navegar para /checkout/payment/:id
 *
 * Planos ACTIVE diferentes coexistem. Nenhuma assinatura existente é
 * cancelada durante a compra de um novo plano.
 * Em qualquer falha, dispara rollback da subscription PENDING (best-effort).
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { refreshUserRelatedQueries } from "~/lib/invalidate";

export interface PricingSubscriptionInput {
  /** Plano de destino (id + preco). */
  plan: { id: number; preco: number; nome: string };
  /**
   * Mantido para defesa contra duplicata quando chamado por consumidores
   * legados. Uma assinatura existente nunca é cancelada nesta mutation.
   */
  currentSubscription: { id: number; planId?: number } | null;
  /** User id (vem de useUser). */
  userId: number;
  /** Callback para navegar ao checkout — chamado em onSuccess com o paymentId. */
  navigateToCheckout: (paymentId: number) => void;
}

/** Mensagem canônica da regra CASE.md §Planos (anti-duplicata).
 *  Backend (409) e frontend (verificador) DEVEM usar o mesmo texto PT-BR. */
export const DUPLICATE_PLAN_MESSAGE =
  "Você já possui este plano ativo. Para trocar, cancele o plano atual em /pricing.";

export type PricingSubscriptionResult = {
  paymentId: number;
};

async function postJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.error) {
    throw new Error(body?.message ?? `Falha em ${path} (${res.status})`);
  }
  return body as T;
}

async function deleteBestEffort(path: string): Promise<void> {
  try {
    await fetch(path, { method: "DELETE", credentials: "include" });
  } catch {
    // ignora: cleanup best-effort
  }
}

export function usePricingSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: PricingSubscriptionInput,
    ): Promise<PricingSubscriptionResult> => {
      // CASE.md §Planos — verificador pré-checkout (defesa em camadas).
      // Se o caller passou uma currentSubscription cujo planId é o mesmo do
      // plano de destino, falhamos ANTES de qualquer chamada de rede.
      // O backend também rejeita com 409 (SubscriptionsService.create), mas
      // isso evita 1 round-trip HTTP e dá feedback imediato ao usuário.
      if (
        input.currentSubscription?.planId != null &&
        input.currentSubscription.planId === input.plan.id
      ) {
        throw new Error(DUPLICATE_PLAN_MESSAGE);
      }

      // Cria subscription PENDING para o plano escolhido.
      // Nunca cancela assinaturas existentes: planos diferentes coexistem.
      const subPayload = await postJson<{ data?: { id: number }; id?: number }>(
        "/api/subscriptions",
        {
          method: "POST",
          body: JSON.stringify({
            userId: input.userId,
            planId: input.plan.id,
            status: "PENDING",
          }),
        },
      );
      const subscriptionId = subPayload?.data?.id ?? subPayload?.id ?? null;
      if (!subscriptionId) {
        throw new Error("Resposta inesperada — ID da assinatura ausente.");
      }

      // 3. Cria payment SUBSCRIPTION
      let paymentId: number | null = null;
      try {
        const payPayload = await postJson<
          { data?: { id: number }; id: number } | { id: number }
        >("/api/payment", {
          method: "POST",
          body: JSON.stringify({
            amount: Number(input.plan.preco),
            method: "PIX",
            purpose: "SUBSCRIPTION",
            subscriptionId,
          }),
        });
        const payBody = (payPayload as { data?: { id?: number } }).data;
        paymentId = payBody?.id ?? (payPayload as { id?: number }).id ?? null;
      } catch (err) {
        // rollback da subscription
        await deleteBestEffort(`/api/subscriptions/${subscriptionId}`);
        throw err;
      }

      if (!paymentId) {
        await deleteBestEffort(`/api/subscriptions/${subscriptionId}`);
        throw new Error("Resposta inesperada — ID do pagamento ausente.");
      }

      // 4. Navega para checkout
      input.navigateToCheckout(paymentId);

      return { paymentId };
    },
    onSuccess: () => {
      // Refetch IMEDIATO de ["me"] + invalidação das queries correlatas
      // (wallet/transactions/notifications). Garante que o user veja o
      // novo plano no Sidebar/TopNavbar ANTES de chegar no checkout de
      // pagamento — sem precisar de reload manual (Sprint fix cache-stale).
      void refreshUserRelatedQueries(queryClient);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Erro ao iniciar checkout.",
      );
    },
  });
}
