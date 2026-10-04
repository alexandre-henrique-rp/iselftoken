import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";

interface DecideStartupInput {
  startupId: number;
  decision: "APPROVED" | "REJECTED";
  justification?: string;
}

async function decideStartup(input: DecideStartupInput): Promise<void> {
  const res = await fetch(
    `/api/compliance/startup/${input.startupId}/decide`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        decision: input.decision,
        justification:
          input.justification ??
          (input.decision === "APPROVED"
            ? "Aprovado via dashboard"
            : "Rejeitado via dashboard"),
      }),
    },
  );

  const json = await res.json().catch(() => null);
  if (!res.ok || json?.error) {
    throw new Error(json?.message ?? "Erro ao atualizar status da startup");
  }
}

export function useComplianceStartupDecisionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: decideStartup,
    onSuccess: (_data, variables) => {
      toast.success(
        variables.decision === "APPROVED"
          ? "Startup aprovada com sucesso"
          : "Startup rejeitada",
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.compliance.dashboardSummary,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? "Erro ao processar decisão");
    },
  });
}
