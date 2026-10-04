import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";

interface CancelPaymentDto {
  endpoint: string;
  justification: string;
}

/**
 * Mutation genérica de cancelamento usada pelo `CancelModal`.
 *
 * Reutilizável para cancelamento de Payment e Subscription — o caller
 * passa o `endpoint` BFF que recebe `{justification}` por POST.
 * Em sucesso, invalida queries relacionadas a payments e emite toast.
 */
export function useCancelPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, CancelPaymentDto>({
    mutationFn: async ({ endpoint, justification }) => {
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ justification }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok || body?.error) {
        throw new Error(body?.message ?? "Não foi possível cancelar.");
      }

      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.startup.overview });
      toast.success("Cancelamento concluído.");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Erro inesperado",
      );
    },
  });
}