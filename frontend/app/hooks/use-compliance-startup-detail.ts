import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";

export interface ComplianceStartupFounder {
  id: number;
  nome: string;
  email: string;
  reg_documento?: string | null;
  tipo_documento?: string | null;
}

export interface ComplianceStartupCampaign {
  id: number;
  title: string;
  status: string;
  totalTokens: number;
  tokensSold: number;
  targetAmount: number;
  investments?: Array<{ status: string; amount: number | string }>;
}

export interface ComplianceStartupDetail {
  id: number;
  nome: string;
  status: string;
  razao_social?: string | null;
  cnpj?: string | null;
  site?: string | null;
  email?: string | null;
  telefone?: string | null;
  data_fundacao?: string | null;
  descricao?: string | null;
  problema?: string | null;
  solucao?: string | null;
  modelo_receita?: string | null;
  area_atuacao?: string | null;
  estagio?: string | null;
  verificationStatus?: string;
  score?: number | null;
  needs_manual_review?: boolean;
  logo?: { url: string } | null;
  founder?: ComplianceStartupFounder | null;
  campaigns?: ComplianceStartupCampaign[];
}

/** Busca detalhes de uma startup para o painel de compliance. */
export function useComplianceStartupDetailQuery(startupId: number | string | undefined) {
  const id = typeof startupId === "string" ? Number(startupId) : startupId;
  return useQuery<ComplianceStartupDetail | null>({
    queryKey: queryKeys.complianceStartupDetail(id as number),
    queryFn: async () => {
      const res = await fetch(`/api/admin/compliance/startup/${id}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        throw new Error(json?.message ?? `Detalhe startup falhou: ${res.status}`);
      }
      return (json?.data ?? null) as ComplianceStartupDetail | null;
    },
    enabled: typeof id === "number" && Number.isFinite(id) && id > 0,
    staleTime: 30_000,
  });
}