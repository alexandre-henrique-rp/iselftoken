import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";
import type { ComplianceDeliberateDTO, Repasse } from "~/types/repasse";

/**
 * Mutation do Compliance para deliberar o numero de parcelas de um Repasse.
 *
 * POST /api/compliance/campaigns/:campaignId/repasse/deliberate
 */
export function useComplianceDeliberate() {
  const qc = useQueryClient();
  return useMutation<
    Repasse,
    Error,
    { campaignId: number | string; payload: ComplianceDeliberateDTO }
  >({
    mutationFn: async ({ campaignId, payload }) => {
      const res = await fetch(
        `/api/compliance/campaigns/${campaignId}/repasse/deliberate`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json().catch(() => ({ error: true }));
      if (!res.ok || body?.error) {
        throw new Error(body?.message ?? `Erro ${res.status} ao deliberar`);
      }
      return (body?.data ?? body) as Repasse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.complianceRepasses });
      qc.invalidateQueries({ queryKey: queryKeys.repasse.dashboard });
      toast.success("Deliberacao registrada com sucesso.");
    },
    onError: (err) => toast.error(err.message || "Erro ao deliberar repasse"),
  });
}
