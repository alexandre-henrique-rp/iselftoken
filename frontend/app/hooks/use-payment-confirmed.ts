import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { refreshUserRelatedQueries } from "~/lib/invalidate";
import { meQueryOptions, queryKeys } from "~/lib/queries";
import { useRealtimeConnection } from "./use-realtime-connection";

interface PaymentConfirmedPayload {
  paymentId: number;
  purpose: string;
  subscriptionId: number | null;
  investmentId: number | null;
}

/**
 * Conector de pagamento realtime.
 *
 * Consome o socket ÚNICO (`useRealtimeConnection`) e se inscreve em
 * `payment.confirmed` / `payment.cancelled`. Não cria conexão própria —
 * reusa o singleton por userId compartilhado com notificações/KYC.
 *
 * Comportamento:
 *  - `payment.confirmed` → refetch imediato de `[me]` (plano recém-ativado)
 *    + invalida transações/wallet (extrato reflete o pagamento sem reload);
 *  - `payment.cancelled` → invalida `[me]` (reverte estado otimista).
 *
 * Perfil (`[me]`) é coberto aqui e em `kyc.decided` — não precisa de hook
 * dedicated.
 *
 * Sprint fix cache-stale pós-compra: usa `refreshUserRelatedQueries`
 * (helper centralizado em `~/lib/invalidate`) para evitar divergência
 * entre consumers (mutation, checkout-payment, WS).
 *
 * Reconexão/foco: reconciliação central no `useRealtimeConnection`
 * (defesa em profundidade).
 */
export function usePaymentConfirmedSocket(): void {
  const { connected, subscribe } = useRealtimeConnection();
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidateTransactions = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-financeiro-transactions"],
      });
    };

    const offConfirmed = subscribe(
      "payment.confirmed",
      (_payload: unknown) => {
        const _p = _payload as PaymentConfirmedPayload;
        void _p;
        // Helper centralizado: refetch [me] + invalida wallet/transactions.
        void refreshUserRelatedQueries(queryClient).then(invalidateTransactions);
      },
    );

    const offCancelled = subscribe("payment.cancelled", () => {
      queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey });
    });

    return () => {
      offConfirmed();
      offCancelled();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, queryClient]);
}
