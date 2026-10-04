import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authStatusQueryOptions, meQueryOptions } from "~/lib/queries";
import type { AuthResponse } from "~/types/auth";

export interface RegisterVars {
  email: string;
  nome: string;
  senha: string;
  senhaConfirmacao: string;
  telefone: string;
  termosAceitos: boolean;
  politicaAceita: boolean;
  urlRedirect?: string;
  role?: "USER" | "INVESTOR" | "FOUNDER";
  /** Código do afiliado que indicou o cadastro (via link /r/:code ou ?ref=). */
  affiliateCode?: string;
}

const API_BASE =
  typeof window !== "undefined" ? `${window.location.origin}/api` : "/api";

/**
 * Mutation para POST /api/auth/register. Em sucesso, invalida `["auth-status"]`
 * e `["me"]` (mesma semântica do login).
 */
export function useRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, Error, RegisterVars>({
    mutationFn: async (vars) => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...vars,
          urlRedirect:
            vars.urlRedirect ||
            (typeof window !== "undefined" ? window.location.origin : ""),
        }),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          data?.message || data?.detalhe?.message || "Erro ao criar conta";
        throw new Error(message);
      }

      return data.data as AuthResponse;
    },
    onSuccess: async () => {
      // Registro também pode ocorrer após outra conta ter sido usada no
      // mesmo navegador; nenhuma query privada deve cruzar essa identidade.
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
