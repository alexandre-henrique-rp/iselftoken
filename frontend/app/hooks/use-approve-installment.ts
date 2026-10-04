import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";
import type { ApproveInstallmentDTO, Installment } from "~/types/repasse";

/**
 * Mutation do Financeiro para aprovar uma solicitacao de parcela.
 *
 * POST /api/financeiro/installments/:installmentId/approve
 *
 * Em sucesso: invalida queries `["repasse-dashboard"]` (founder view)
 * e `["financeiro-repasse", repasseId]` (finance view).
 */
export function useApproveInstallment(repasseId?: string | number) {
  const qc = useQueryClient();
  return useMutation<
    Installment,
    Error,
    { installmentId: number | string; payload: ApproveInstallmentDTO }
  >({
    mutationFn: async ({ installmentId, payload }) => {
      const res = await fetch(
        `/api/financeiro/installments/${installmentId}/approve`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json().catch(() => ({ error: true }));
      if (!res.ok || body?.error) {
        throw new Error(body?.message ?? `Erro ${res.status} ao aprovar`);
      }
      return (body?.data ?? body) as Installment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.repasse.dashboard });
      if (repasseId) {
        qc.invalidateQueries({ queryKey: queryKeys.repasse.detail(repasseId) });
      }
      toast.success("Solicitacao aprovada.");
    },
    onError: (err) => toast.error(err.message || "Erro ao aprovar"),
  });
}
