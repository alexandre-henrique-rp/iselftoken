import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";
import type { ReviewChangeRequestPayload } from "~/lib/change-request-types";

/**
 * Mutation para aprovar/rejeitar uma solicitação de alteração (compliance).
 * PATCH /api/compliance/change-requests/:id
 *
 * Após sucesso, invalida a query de listagem do compliance.
 */
export function useReviewChangeRequestMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ReviewChangeRequestPayload }) => {
      const res = await fetch(`/api/compliance/change-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? "Erro ao processar revisão");
      }

      return res.json();
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.complianceChangeRequests });
      const label = variables.payload.status === "APPROVED" ? "aprovada" : "rejeitada";
      toast.success(`Solicitação ${label} com sucesso.`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
