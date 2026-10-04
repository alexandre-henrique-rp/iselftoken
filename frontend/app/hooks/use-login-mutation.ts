import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authStatusQueryOptions, meQueryOptions } from "~/lib/queries";
import type { AuthResponse } from "~/types/auth";

interface LoginVars {
  email: string;
  senha: string;
}

const API_BASE =
  typeof window !== "undefined" ? `${window.location.origin}/api` : "/api";

/**
 * Mutation para POST /api/auth (BFF). Em sucesso, invalida `["auth-status"]`
 * e `["me"]` para forçar refetch do estado de auth com os cookies recém-setados.
 */
export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, Error, LoginVars>({
    mutationFn: async ({ email, senha }) => {
      const body: Record<string, unknown> = { email, senha };

      const res = await fetch(`${API_BASE}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          data?.message ||
          data?.detalhe?.message ||
          data?.data?.message ||
          "Erro ao fazer login";
        throw new Error(message);
      }

      return data.data as AuthResponse;
    },
    onSuccess: async () => {
      // Login é uma fronteira de identidade. O QueryClient é singleton no
      // navegador e as queries privadas não são particionadas por userId.
      // Limpar antes de invalidar impede que a conta anterior seja exibida
      // durante a transição para a nova sessão.
      queryClient.clear();
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: authStatusQueryOptions.queryKey,
        }),
        queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey }),
      ]);
    },
  });
}
