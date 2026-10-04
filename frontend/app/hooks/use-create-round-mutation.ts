/**
 * Mutation para abrir nova rodada (founder-new-round.tsx).
 *
 * POST /api/campaigns/:id/new-round → cria rodada (R$).
 * Invalida [founder-dashboard] + [startup-dashboard-metrics] em onSuccess.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";

export interface CreateRoundInput {
  startupId: string;
  title: string;
  targetAmount: number;
  minInvestment: number;
  valuation: number;
  tokenPrice: number;
  totalTokens: number;
  deadline: string; // ISO string
  affiliateCommissionPct: 5 | 10;
  description?: string;
}

export function useCreateRoundMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRoundInput) => {
      const res = await fetch(
        `/api/campaigns/${input.startupId}/new-round`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: input.title,
            targetAmount: input.targetAmount,
            minInvestment: input.minInvestment,
            valuation: input.valuation,
            tokenPrice: input.tokenPrice,
            totalTokens: input.totalTokens,
            deadline: input.deadline,
            affiliateCommissionPct: input.affiliateCommissionPct,
            description: input.description,
          }),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        const msg = Array.isArray(json?.message)
          ? json.message.join("; ")
          : json?.message;
        throw new Error(msg ?? "Não foi possível abrir a rodada.");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.founderDashboard });
      queryClient.invalidateQueries({
        queryKey: queryKeys.startupDashboardMetrics,
      });
      toast.success("Rodada aberta com sucesso!");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Erro ao abrir rodada.",
      );
    },
  });
}
