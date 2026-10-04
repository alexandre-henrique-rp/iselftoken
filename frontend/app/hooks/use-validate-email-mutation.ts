import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface ValidateEmailDto {
  token: string;
}

/**
 * Mutation para POST /api/auth/validate-email (BFF).
 *
 * Valida o token de confirmação de email enviado ao usuário após o cadastro.
 * É usada tipicamente pelo componente `ValidateEmailForm` com auto-fire
 * no mount (via `useEffect`).
 */
export function useValidateEmailMutation() {
  return useMutation<unknown, Error, ValidateEmailDto>({
    mutationFn: async ({ token }) => {
      const res = await fetch("/api/auth/validate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          body?.message ||
            body?.detalhe?.message ||
            "Token inválido ou expirado.",
        );
      }

      return body;
    },
    onSuccess: () => {
      toast.success("Email validado com sucesso!");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Token inválido ou expirado.",
      );
    },
  });
}