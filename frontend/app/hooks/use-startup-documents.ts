import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type { StartupDocumentItem } from "~/lib/audit-types";

export interface StartupDocumentNAItem {
  id: number;
  categoria: string;
  justificativa: string;
  reviewStatus?: string;
  reviewNote?: string | null;
}

/// Banner vermelho no slot da categoria — fonte de verdade do `StartupDocumentRejection`
/// (backend hard-deletou o doc + arquivo S3 mas preserva esta row até o re-upload).
export interface StartupDocumentRejectionItem {
  id: number;
  categoria: string;
  documentName: string;
  reason: string;
  rejectedAt: string;
}

export interface StartupDocumentsResponse {
  documents: StartupDocumentItem[];
  naoSeAplica: StartupDocumentNAItem[];
  rejections: StartupDocumentRejectionItem[];
  compliance: {
    required: number;
    present: number;
    missing: string[];
  } | null;
}

async function fetchStartupDocuments(
  startupId: string | number,
): Promise<StartupDocumentsResponse> {
  const res = await fetch(`/api/startup/${startupId}/documents`);
  if (!res.ok)
    return {
      documents: [],
      naoSeAplica: [],
      rejections: [],
      compliance: null,
    };
  const json = await res.json().catch(() => null);
  const raw = json?.data;
  // Novo formato: { documents, naoSeAplica, rejections, compliance }. Fallback
  // ao array legado (data = StartupDocumentItem[]) para retrocompatibilidade.
  const docs: StartupDocumentItem[] = Array.isArray(raw)
    ? raw
    : (raw?.documents ?? []);
  const nas: StartupDocumentNAItem[] = Array.isArray(raw)
    ? []
    : (raw?.naoSeAplica ?? []);
  const rejections: StartupDocumentRejectionItem[] = Array.isArray(raw)
    ? []
    : (raw?.rejections ?? []);
  return {
    documents: docs,
    naoSeAplica: nas,
    rejections,
    compliance: Array.isArray(raw)
      ? computeCompliance(docs)
      : (raw?.compliance ?? computeCompliance(docs)),
  };
}

function computeCompliance(docs: StartupDocumentItem[]) {
  const required = [
    "MIE",
    "CONTRATO_SOCIAL",
    "CARTAO_CNPJ",
    "BALANCO",
    "DECLARACAO_VERACIDADE",
    "ATA_ELEICAO",
  ];
  const present = new Set(docs.map((d) => d.categoria));
  const missing = required.filter((k) => !present.has(k));
  return {
    required: required.length,
    present: required.length - missing.length,
    missing,
  };
}

/**
 * Hook para listar StartupDocument de uma startup específica + checklist CVM.
 * Cache via TanStack Query (staleTime 60s).
 */
export function useStartupDocumentsQuery(
  startupId: string | number | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.startupDocuments(startupId),
    queryFn: () => fetchStartupDocuments(startupId!),
    enabled: Boolean(startupId),
    staleTime: 60_000,
  });
}
