import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type { DocumentoVerificacao } from "~/lib/documento-verificacao-types";

/**
 * Hook para buscar dados publicos de verificacao de documento assinado.
 *
 * Endpoint: GET /api/verificar/:documentId (sem autenticacao).
 * Cache: 5 minutos. Retry automatico em erro 429 com backoff.
 *
 * @param documentId - ID do documento a verificar
 * @returns query com DocumentoVerificacao | undefined (enquanto carrega)
 *
 * @example
 * const { data, isLoading, isError } = useDocumentoVerificacao("abc123");
 */
export function useDocumentoVerificacao(
  documentId: string | number | undefined,
) {
  return useQuery<DocumentoVerificacao>({
    queryKey: queryKeys.verificacaoDocumento(documentId),
    queryFn: async () => {
      if (documentId === undefined) {
        throw new Error("documentId requerido");
      }
      const res = await fetch(`/api/verificar/${documentId}`, {
        credentials: "omit",
      });
      const data = await res.json().catch(() => ({ error: true }));
      if (!res.ok || data?.error) {
        const message =
          data?.message ?? `Documento nao encontrado (${res.status})`;
        const error = new Error(message);
        (error as Error & { status: number }).status = res.status;
        throw error;
      }
      return data as DocumentoVerificacao;
    },
    enabled: Boolean(documentId),
    staleTime: 5 * 60 * 1_000, // 5 minutos
    retry: (failureCount, err) => {
      const status = (err as Error & { status?: number })?.status;
      // Retry em 429 (rate limit) ou 5xx
      if (status === 429 || (status !== 404 && status !== 400 && status !== 401)) {
        return failureCount < 3;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 9000),
  });
}
