import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface ForgotPasswordDto {
  email: string;
}

interface ForgotPasswordResult {
  message: string;
}

const API_BASE =
  typeof window !== "undefined" ? `${window.location.origin}/api` : "/api";

/**
 * Mutation para POST /api/auth/forgot-password (BFF).
 *
 * Em sucesso, emite toast informativo.
 */
export function useForgotPasswordMutation() {
  return useMutation<ForgotPasswordResult, Error, ForgotPasswordDto>({
    mutationFn: async ({ email }) => {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          body?.data?.message || body?.message || "Erro ao enviar link",
        );
      }

      return {
        message:
          body?.data?.message || body?.message || "Link de redefinição enviado",
      };
    },
    onSuccess: () => {
      toast.success("Email enviado. Verifique sua caixa de entrada.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar link");
    },
  });
}
