import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface ResetPasswordDto {
  token: string;
  senha: string;
  confirmarSenha: string;
}

/**
 * Mutation para POST /api/auth/reset-password?token=... (BFF).
 *
 * O token é o JWT single-use enviado no link de recuperação por email. Ele
 * nunca é persistido no storage do navegador e é validado novamente pelo
 * backend antes da senha ser alterada.
 */
export function useResetPasswordMutation() {
  return useMutation<unknown, Error, ResetPasswordDto>({
    mutationFn: async ({ token, senha, confirmarSenha }) => {
      const res = await fetch(
        `/api/auth/reset-password?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ senha, confirmarSenha }),
        },
      );

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          body?.data?.message || body?.message || "Erro ao alterar senha",
        );
      }

      return body;
    },
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar senha");
    },
  });
}
