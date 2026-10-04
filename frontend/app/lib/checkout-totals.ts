import type { InstallmentOption } from "~/hooks/use-installment-options";

/**
 * Calcula os juros de cartão e o total exibido no resumo do pedido.
 *
 * Fonte de verdade: o backend. Esta função apenas ESPELHA o valor retornado
 * pela simulação (`InstallmentOption`) — não recalcula juros localmente
 * (CASE.md §Pagamento: "o checkout apenas apresenta o cálculo retornado pelo
 * backend").
 *
 * - PIX ou cartão à vista (1x): juros = 0, total = baseTotal.
 * - Cartão parcelado (N>1): juros = option.totalInterest; total = baseTotal + juros.
 */
export function computeCheckoutTotals(params: {
  method: "PIX" | "CREDIT_CARD";
  baseTotal: number;
  selectedInstallment: InstallmentOption | null;
}): { cardInterest: number; displayTotal: number } {
  const { method, baseTotal, selectedInstallment } = params;
  const cardInterest =
    method === "CREDIT_CARD" &&
    selectedInstallment &&
    selectedInstallment.installments > 1
      ? selectedInstallment.totalInterest
      : 0;
  return { cardInterest, displayTotal: baseTotal + cardInterest };
}
