import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";

const API_BASE =
  typeof window !== "undefined" ? `${window.location.origin}/api` : "/api";

export interface DeleteStartupInput {
  startupId: string;
  reason: string;
}

interface DeleteStartupError {
  error: boolean;
  message: string;
  codigo: number;
}

/**
 * Mutation para DELETE /api/admin/startups/:id (BFF proxy).
 * Reason e opcional mas o backend exige minimo 10 caracteres.
 *
 * @param startupId - ID da startup a ser excluida
 * @param reason - Motivo da exclusao (min 10 chars, enviado ao log de auditoria)
 * @throws Erro com message do backend em caso de falha
 */
export function useDeleteStartupMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteStartupInput>({
    mutationFn: async ({ startupId, reason }) => {
      const res = await fetch(`${API_BASE}/admin/startups/${startupId}/delete`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (res.status === 204) {
        return;
      }

      // Tratar erros conhecidos
      if (res.status === 403) {
        throw new Error("Permissao negada.");
      }

      if (res.status === 404) {
        throw new Error("Startup nao encontrada (pode ter sido excluida por outra sessao).");
      }

      // Tentar extrair mensagem de erro do body
      let errorMessage = "Falha ao excluir startup.";
      try {
        const data: DeleteStartupError = await res.json();
        if (data?.message) {
          errorMessage = data.message;
        }
      } catch {
        // body vazio ou nao-parseavel
      }

      throw new Error(errorMessage);
    },

    onSuccess: () => {
      toast.success("Startup excluida.");
      // Invalida listagem de startups do compliance
      queryClient.invalidateQueries({ queryKey: queryKeys.complianceStartups });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStartups });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
