import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";
import type { FinanceiroConfigureRepasseDTO, Repasse } from "~/types/repasse";

/**
 * Mutation do Financeiro para configurar valores de um Repasse (so apos
 * deliberacao do Compliance).
 *
 * POST /api/financeiro/repasses/:repasseId/configure
 */
export function useFinanceiroConfigureRepasse(repasseId: string | number) {
  const qc = useQueryClient();
  const key = String(repasseId);

  return useMutation<Repasse, Error, FinanceiroConfigureRepasseDTO>({
    mutationFn: async (payload) => {
      const res = await fetch(`/api/financeiro/repasses/${repasseId}/configure`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({ error: true }));
      if (!res.ok || body?.error) {
        throw new Error(body?.message ?? `Erro ${res.status} ao configurar`);
      }
      return (body?.data ?? body) as Repasse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.financeiroRepasse(key) });
      qc.invalidateQueries({ queryKey: queryKeys.repasse.dashboard });
      qc.invalidateQueries({ queryKey: queryKeys.complianceRepasses });
      toast.success("Repasse configurado com sucesso.");
    },
    onError: (err) => toast.error(err.message || "Erro ao configurar repasse"),
  });
}
