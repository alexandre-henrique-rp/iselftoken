import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "~/lib/queries";

/** Uma opção de parcelamento calculada pelo backend (fonte de verdade). */
export interface InstallmentOption {
  installments: number;
  installmentAmount: number;
  totalWithInterest: number;
  totalInterest: number;
  interestRate: number;
  /** true quando a parcela fica abaixo do mínimo configurado (n > 1). */
  belowMinimum: boolean;
}

/** Resposta da simulação de parcelamento (`GET /payment/:id/installments`). */
export interface InstallmentSimulation {
  paymentId: number;
  principal: number;
  interestRate: number;
  maxInstallments: number;
  minInstallmentAmount: number;
  options: InstallmentOption[];
}

async function fetchInstallmentOptions(
  paymentId: number | string,
): Promise<InstallmentSimulation> {
  const res = await fetch(`/api/payment/${paymentId}/installments`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || body?.error) {
    throw new Error(body?.message ?? "Falha ao carregar o parcelamento.");
  }

  return (body?.data ?? body) as InstallmentSimulation;
}

/**
 * Carrega as opções de parcelamento calculadas pelo backend para um Payment.
 *
 * A query é keyada pelo `paymentId` E pelo `amount` atual — assim, quando um
 * cupom altera o valor do pagamento, o checkout refaz a simulação com o novo
 * principal (líquido de cupom) sem depender de invalidação manual.
 *
 * `enabled` deve ser `false` quando o pagamento não está apto a parcelar
 * (ex.: método PIX ou status != PENDING).
 */
export function useInstallmentOptions(
  paymentId: number | string,
  amount: number,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.payments.installments(paymentId, amount),
    queryFn: () => fetchInstallmentOptions(paymentId),
    enabled: enabled && !!paymentId,
    staleTime: 60_000,
  });
}
