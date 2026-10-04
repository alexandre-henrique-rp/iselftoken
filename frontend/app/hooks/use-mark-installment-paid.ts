import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";
import type { Installment, MarkInstallmentPaidDTO } from "~/types/repasse";

/**
 * Mutation do Financeiro para marcar uma parcela PROCESSING como paga.
 *
 * POST /api/financeiro/installments/:installmentId/mark-paid
 *
 * Requer `txidC6` e `endToEndId` (confirmacao PIX).
 */
export function useMarkInstallmentPaid(repasseId?: string | number) {
  const qc = useQueryClient();
  return useMutation<
    Installment,
    Error,
    { installmentId: number | string; payload: MarkInstallmentPaidDTO }
  >({
    mutationFn: async ({ installmentId, payload }) => {
      const res = await fetch(
        `/api/financeiro/installments/${installmentId}/mark-paid`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json().catch(() => ({ error: true }));
      if (!res.ok || body?.error) {
        throw new Error(body?.message ?? `Erro ${res.status} ao marcar como pago`);
      }
      return (body?.data ?? body) as Installment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.repasse.dashboard });
      if (repasseId) {
        qc.invalidateQueries({ queryKey: queryKeys.repasse.detail(repasseId) });
      }
      toast.success("Parcela marcada como paga.");
    },
    onError: (err) => toast.error(err.message || "Erro ao marcar como pago"),
  });
}
