import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";

export interface UpdateAffiliateInput {
  intent: "program" | "affiliation";
  id: number | string;
  decision: "APPROVED" | "REJECTED";
  reason?: string;
  affiliateCommissionPct?: number;
  platformCommissionPct?: number;
}

/**
 * Hook: useUpdateAffiliateMutation
 *
 * POST /api/admin/affiliate/{programs|affiliations}/:id/decide
 * Em sucesso: invalida ["admin-affiliate"].
 */
export function useUpdateAffiliateMutation() {
  const qc = useQueryClient();

  return useMutation<unknown, Error, UpdateAffiliateInput>({
    mutationFn: async (input) => {
      const path =
        input.intent === "program"
          ? `/api/admin/affiliate/programs/${input.id}/decide`
          : `/api/admin/affiliate/affiliations/${input.id}/decide`;

      const body: Record<string, unknown> = { decision: input.decision };
      if (input.decision === "REJECTED") {
        if (!input.reason) throw new Error("Motivo da rejeição obrigatório.");
        body.reason = input.reason;
      }
      if (input.intent === "program" && input.decision === "APPROVED") {
        if (input.affiliateCommissionPct !== undefined) {
          body.affiliateCommissionPct = input.affiliateCommissionPct;
        }
        if (input.platformCommissionPct !== undefined) {
          body.platformCommissionPct = input.platformCommissionPct;
        }
      }

      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) {
        throw new Error(json?.message ?? "Não foi possível concluir.");
      }
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminAffiliate });
      toast.success("Decisão registrada!");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro");
    },
  });
}
