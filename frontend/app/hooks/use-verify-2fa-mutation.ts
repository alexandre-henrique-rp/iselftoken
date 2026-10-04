import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { fetchClientIp } from "~/lib/client-ip";
import { landingPathForRole } from "~/lib/post-auth-redirect";
import { authStatusQueryOptions, meQueryOptions } from "~/lib/queries";
import type { UserData } from "~/types/auth";

interface Verify2faDto {
  codigo: string;
}

/**
 * Resposta do mutation com dados auxiliares para o componente decidir o
 * redirect pós-2FA (sem precisar re-fetch manual de /users/me).
 */
export interface Verify2faSuccess {
  /** Role do usuário recém-autorizado (depois de invalidar ["me"]). */
  role: UserData["role"] | null;
}

/**
 * Mutation para POST /api/auth/verify-code (BFF).
 *
 * Confirma o código de 2FA enviado por email e, em sucesso, invalida
 * `["auth-status"]` + `["me"]` para a UI refletir a sessão autorizada.
 *
 * Após a invalidação, faz um refetch forçado de `["me"]` e devolve o role
 * do usuário para o componente decidir a landing page
 * (ADMIN/FINANCEIRO/COMPLIANCE → /admin/dashboard; USER → /home).
 */
export function useVerify2faMutation() {
  const queryClient = useQueryClient();
  const accessRecordStarted = useRef(false);

  return useMutation<Verify2faSuccess, Error, Verify2faDto>({
    mutationFn: async ({ codigo }) => {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ codigo }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body?.message || "Código inválido");
      }

      // Invalidar caches de sessão e buscar o role atualizado AINDA no
      // mutationFn. Em TanStack Query v5 o valor retornado pelo `onSuccess`
      // da definição da mutation NÃO propaga para `data` nem para os
      // callbacks de `.mutate()`; apenas o retorno do `mutationFn` chega ao
      // `onSuccess` local do componente. Fazer o refetch aqui garante que o
      // `role` correto (ex.: ADMIN) chegue ao caller que decide a landing.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: authStatusQueryOptions.queryKey,
        }),
        queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey }),
      ]);

      const me = await queryClient.fetchQuery({
        ...meQueryOptions,
        staleTime: 0,
      });
      const role = (me as UserData | null)?.role ?? null;
      return { role };
    },
    onSuccess: () => {
      if (!accessRecordStarted.current) {
        accessRecordStarted.current = true;
        void fetchClientIp()
          .then((clientData) =>
            fetch("/api/auth/access", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(
                clientData
                  ? {
                      clientIp: clientData.ip,
                      clientIpMetadata: clientData,
                    }
                  : {},
              ),
            }),
          )
          .catch(() => undefined);
      }

      toast.success("Verificação realizada com sucesso!");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Erro ao verificar código",
      );
    },
  });
}

/**
 * Helper para o componente decidir para onde navegar após o 2FA.
 * Encapsula a leitura do role do payload do mutation.
 */
export function navigateAfter2fa(
  role: UserData["role"] | null | undefined,
): string {
  return landingPathForRole(role ?? "USER");
}

/**
 * Mutation para GET /api/auth/newcode (BFF).
 *
 * Reenvia o código de 2FA para o email do usuário.
 */
export function useResend2faCodeMutation() {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      let res: Response;
      try {
        res = await fetch("/api/auth/newcode", {
          method: "GET",
          credentials: "include",
        });
      } catch {
        throw new Error("Não foi possível reenviar o código. Tente novamente.");
      }
      const body = await res.json().catch(() => null);
      const data =
        body && typeof body === "object" && !Array.isArray(body)
          ? (body as { error?: unknown; message?: unknown })
          : null;
      const message =
        typeof data?.message === "string" && data.message.trim()
          ? data.message
          : "Não foi possível reenviar o código. Tente novamente.";

      if (!res.ok || !data || data.error === true) {
        throw new Error(message);
      }
    },
    onSuccess: () => {
      toast.success("Novo código enviado!");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível reenviar o código. Tente novamente.",
      );
    },
  });
}
