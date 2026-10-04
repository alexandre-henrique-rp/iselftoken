import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";

import {
  getPaymentPurposeLabel,
  type FounderPayment,
} from "~/hooks/use-founder-pending-payments";

/**
 * Hook: lista TODOS os pagamentos do founder logado (qualquer status).
 *
 * Endpoint: GET /api/founder/payments?includeAll=true (BFF proxia para
 * `BACKEND_URL/payment?limit=50`; backend já filtra por userId — LGPD-safe).
 *
 * Usado pela pagina `/founder/financeiro` (visao consolidada por startup).
 *
 * Cache 30s. Refetch a cada 60s para refletir novos pagamentos/repasses.
 */
export function useFounderAllPayments() {
  return useQuery<FounderPayment[]>({
    queryKey: queryKeys.founder.paymentsAll,
    queryFn: async () => {
      const res = await fetch("/api/founder/payments?includeAll=true", {
        credentials: "include",
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        const message = (data as { message?: string })?.message ?? "Erro";
        throw new Error(message);
      }
      if (Array.isArray(data)) return data as FounderPayment[];
      if (Array.isArray((data as { data?: unknown }).data)) {
        return (data as { data: FounderPayment[] }).data;
      }
      return [];
    },
    staleTime: 30 * 1_000,
    refetchInterval: 60 * 1_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Agrupa uma lista de pagamentos por `purpose` agrupador (categoria macro
 * usada na pagina Financeiro do fundador):
 *   - `cobrancas`     → PENDING + EXPIRED (acoes do founder: pagar)
 *   - `concluidos`    → PAID
 *   - `cancelados`    → CANCELED + REFUNDED
 *
 * O frontend usa esse agrupamento para renderizar 3 colunas/secoes por startup.
 */
export function summarizePayments(
  payments: FounderPayment[],
): {
  cobrancas: FounderPayment[];
  concluidos: FounderPayment[];
  cancelados: FounderPayment[];
} {
  const cobrancas: FounderPayment[] = [];
  const concluidos: FounderPayment[] = [];
  const cancelados: FounderPayment[] = [];
  for (const p of payments) {
    if (p.status === "PENDING" || p.status === "EXPIRED") cobrancas.push(p);
    else if (p.status === "PAID") concluidos.push(p);
    else if (p.status === "CANCELED" || p.status === "REFUNDED") cancelados.push(p);
    else cobrancas.push(p);
  }
  return { cobrancas, concluidos, cancelados };
}

export { getPaymentPurposeLabel };