import { useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE =
  typeof window !== "undefined" ? `${window.location.origin}/api` : "/api";

/**
 * Mutation para POST /api/auth/logout. Em sucesso (e em erro defensivo),
 * remove `["auth-status"]` e `["me"]` do cache para garantir que a UI
 * imediatamente reflita estado deslogado sem refetch automático.
 */
export function useLogoutMutation() {
  const queryClient = useQueryClient();

  const cleanCache = () => {
    // A identidade mudou: nenhuma query privada pode sobreviver ao logout.
    // As chaves de domínio não carregam userId, portanto remover apenas
    // [me]/[auth-status] deixaria dados da conta anterior visíveis para a
    // próxima conta no mesmo navegador.
    queryClient.clear();
  };

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Não foi possível concluir o logout.");
      }
    },
    onSuccess: cleanCache,
    onError: cleanCache,
  });
}
