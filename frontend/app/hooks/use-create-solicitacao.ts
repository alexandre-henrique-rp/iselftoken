import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";
import type { CreateInstallmentRequestDTO, InstallmentRequest } from "~/types/repasse";

/**
 * Mutation para o fundador criar uma solicitacao de parcela.
 *
 * POST /api/founder/startups/:startupId/repasse/installments/:installmentId/request
 *
 * Em sucesso: invalida `["repasse-dashboard", startupId]`.
 */
export function useCreateSolicitacao(startupId: string | number) {
  const qc = useQueryClient();
  const startupKey = String(startupId);

  return useMutation<
    InstallmentRequest,
    Error,
    { installmentId: number | string; payload: CreateInstallmentRequestDTO }
  >({
    mutationFn: async ({ installmentId, payload }) => {
      const res = await fetch(
        `/api/founder/startups/${startupId}/repasse/installments/${installmentId}/request`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json().catch(() => ({ error: true }));
      if (!res.ok || body?.error) {
        throw new Error(body?.message ?? `Erro ${res.status} ao enviar solicitacao`);
      }
      return (body?.data ?? body) as InstallmentRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.repasse.byStartup(startupKey) });
      toast.success("Solicitacao enviada!");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao enviar solicitacao");
    },
  });
}
