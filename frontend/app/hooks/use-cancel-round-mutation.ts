import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";

/**
 * Hook para cancelar uma rodada.
 *
 * PATCH /api/startup/:id/rodada/:rodadaId/cancelar
 *
 * @param startupId - ID da startup
 * @param rodadaId  - ID da rodada
 * @param options   - callbacks de onSuccess / onError
 */
export function useCancelRoundMutation({
  startupId,
  rodadaId,
  onSuccess,
  onError,
}: {
  startupId: string;
  rodadaId: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<unknown> => {
      const res = await fetch(
        `/api/startup/${startupId}/rodada/${rodadaId}/cancelar`,
        {
          method: "PATCH",
          credentials: "include",
        },
      );

      if (!res.ok) {
        let message = "Nao foi possível cancelar a rodada. Tente novamente.";
        if (res.status === 409) {
          const body = await res.json().catch(() => ({}));
          message =
            body?.message ||
            "Acao nao permitida para o estado atual da rodada.";
        }
        throw new Error(message);
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("Rodada cancelada com sucesso.");
      queryClient.invalidateQueries({ queryKey: queryKeys.startup.all });
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast.error(err.message);
      onError?.(err.message);
    },
  });
}
