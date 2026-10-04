import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type { TermoAdesaoStatus } from "./use-termo-adesao-status";

interface TermoAdesaoMutationResult {
  exists: boolean;
  signedAt: string;
  serialCert: string;
  hashSha256: string;
  presignedUrl: string;
  termoVersao: string;
  documentId: number;
}

/**
 * Hook de mutation para aceitar e assinar o termo de adesão.
 *
 * @returns mutation com mutate({ startupId, verificationUrl? })
 *
 * A mutation:
 * 1. Faz PATCH /api/founder/startups/:id/termo-adesao { aceite: true, verificationUrl? }
 * 2. Em caso de sucesso (200/201), invalida a query de status,
 *    forçando refetch e revelando o selo visual.
 *
 * @example
 * const mutation = useTermoAdesaoMutation();
 * mutation.mutate({ startupId: 123 });
 * mutation.mutate({ startupId: 123, verificationUrl: "https://iselftoken.com/verificar/abc123" });
 */
export function useTermoAdesaoMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    TermoAdesaoMutationResult,
    Error,
    { startupId: number | string; verificationUrl?: string }
  >({
    mutationFn: async ({ startupId, verificationUrl }) => {
      const res = await fetch(`/api/founder/startups/${startupId}/termo-adesao`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aceite: true,
          ...(verificationUrl && { verificationUrl }),
        }),
      });
      const response = await res.json().catch(() => ({ error: true }));
      if (!res.ok || response?.error) {
        throw new Error(
          response?.message ?? `Erro ${res.status} ao assinar termo`,
        );
      }
      return (response?.data ?? response) as TermoAdesaoMutationResult;
    },

    onSuccess: (_data, variables) => {
      // Invalida query de status para forçar refetch e mostrar o selo
      queryClient.invalidateQueries({
        queryKey: queryKeys.termoAdesao.status(variables.startupId),
      });
    },
  });
}
