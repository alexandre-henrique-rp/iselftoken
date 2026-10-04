import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";

interface ApprovePaymentDto {
  paymentId: number;
  justification: string;
  file: File;
}

/**
 * Mutation composta para aprovar um Payment (admin financeiro).
 *
 * Sequência atômica:
 *  1. Upload do comprovante via POST /api/admin/financeiro/comprovantes
 *     (retorna `{ data: { key: string } }` — diferente do `useUploadMutation`
 *     compartilhado de KYC).
 *  2. POST /api/admin/financeiro/payments/:paymentId/approve com o `key`.
 *
 * Em sucesso, invalida queries de payments e emite toast.
 */
export function useApprovePaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, ApprovePaymentDto>({
    mutationFn: async ({ paymentId, justification, file }) => {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/admin/financeiro/comprovantes", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const uploadBody = await uploadRes.json().catch(() => null);
      if (!uploadRes.ok || uploadBody?.error) {
        throw new Error(
          uploadBody?.message ?? "Falha ao enviar comprovante",
        );
      }
      const comprovanteKey: string | undefined = uploadBody?.data?.key;
      if (!comprovanteKey) {
        throw new Error(
          "Resposta inesperada do servidor — key do comprovante ausente.",
        );
      }

      const approveRes = await fetch(
        `/api/admin/financeiro/payments/${paymentId}/approve`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            justification: justification.trim(),
            comprovanteKey,
          }),
        },
      );
      const approveBody = await approveRes.json().catch(() => null);

      if (!approveRes.ok || approveBody?.error) {
        throw new Error(approveBody?.message ?? "Falha ao aprovar pagamento");
      }

      return approveBody;
    },
    onSuccess: (_data, { paymentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.adminList });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.status(paymentId) });
      toast.success("Pagamento aprovado com sucesso!");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Erro ao aprovar pagamento",
      );
    },
  });
}