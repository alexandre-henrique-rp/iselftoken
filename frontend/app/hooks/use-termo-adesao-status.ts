import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";

export interface TermoAdesaoStatus {
  exists: boolean;
  signedAt?: string;       // ISO 8601
  serialCert?: string;
  hashSha256?: string;
  presignedUrl?: string;   // download URL (TTL 7d)
  termoVersao?: string;
  documentId?: number;
}

/**
 * Hook para buscar o status do termo de adesão de uma startup.
 *
 * @param startupId - ID da startup
 * @returns query com TermoAdesaoStatus | undefined (enquanto carrega)
 *
 * @example
 * const { data, isLoading } = useTermoAdesaoStatus(123);
 * if (data?.exists) { ... }
 */
export function useTermoAdesaoStatus(startupId: number | string | undefined) {
  return useQuery<TermoAdesaoStatus>({
    queryKey: queryKeys.termoAdesao.status(startupId),
    queryFn: async () => {
      if (!startupId) throw new Error("startupId requerido");
      const res = await fetch(`/api/founder/startups/${startupId}/termo-adesao`, {
        credentials: "include",
      });
      const response = await res.json().catch(() => ({ error: true }));
      if (!res.ok || response?.error) {
        throw new Error(
          response?.message ?? `Erro ${res.status} ao buscar status do termo`,
        );
      }

      // O backend usa ResponseDto: { error, message, codigo, data }.
      // O componente precisa receber somente o status do documento.
      const rawStatus = response?.data ?? response;
      if (!rawStatus || typeof rawStatus.exists !== "boolean") {
        throw new Error("Resposta inválida ao buscar status do termo.");
      }

      // Normaliza o DTO jurídico do backend para o shape usado pela UI.
      const document = rawStatus.document;
      return {
        exists: rawStatus.exists,
        signedAt: document?.signedAt ?? undefined,
        serialCert: document?.founderCert?.serialNumber ?? undefined,
        hashSha256: document?.documentHash ?? undefined,
        presignedUrl: rawStatus.readUrl ?? rawStatus.downloadUrl ?? undefined,
        termoVersao: rawStatus.termoVersao ?? undefined,
        documentId: document?.id ?? undefined,
      } as TermoAdesaoStatus;
    },
    enabled: Boolean(startupId),
    staleTime: 30_000, // 30s — dado muda só após assinatura
    retry: 1,
  });
}
