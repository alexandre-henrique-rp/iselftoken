import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";
import type { Installment, RejectInstallmentDTO } from "~/types/repasse";

/**
 * Mutation do Financeiro para rejeitar uma solicitacao.
 *
 * POST /api/financeiro/installments/:installmentId/reject
 */
export function useRejectInstallment(repasseId?: string | number) {
  const qc = useQueryClient();
  return useMutation<
    Installment,
    Error,
    { installmentId: number | string; payload: RejectInstallmentDTO }
  >({
    mutationFn: async ({ installmentId, payload }) => {
      const res = await fetch(
        `/api/financeiro/installments/${installmentId}/reject`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json().catch(() => ({ error: true }));
      if (!res.ok || body?.error) {
        throw new Error(body?.message ?? `Erro ${res.status} ao rejeitar`);
      }
      return (body?.data ?? body) as Installment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.repasse.dashboard });
      if (repasseId) {
        qc.invalidateQueries({ queryKey: queryKeys.repasse.detail(repasseId) });
      }
      toast.success("Solicitacao rejeitada.");
    },
    onError: (err) => toast.error(err.message || "Erro ao rejeitar"),
  });
}
