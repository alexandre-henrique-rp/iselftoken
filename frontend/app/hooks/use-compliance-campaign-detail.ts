import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";

export interface ComplianceCampaignStartup {
  id: number;
  nome: string;
  slug: string;
  cnpj?: string | null;
  razao_social?: string | null;
  email?: string | null;
  telefone?: string | null;
  site?: string | null;
  area_atuacao?: string | null;
  category?: string | null;
  estagio?: string | null;
  descricao?: string | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  digito?: string | null;
  tipo_conta?: string | null;
  pix_key?: string | null;
  titular?: string | null;
  documento_titular?: string | null;
  status: string;
  logo?: { url: string } | null;
  founder?: { id: number; nome: string; email: string } | null;
}

export interface ComplianceCampaignResource {
  categoria: string;
  percentual: number;
  descricaoCustomizada?: string | null;
}

export interface ComplianceCampaignDetail {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  closedAt: string | null;
  deadline: string;
  targetAmount: number;
  minInvestment: number;
  valuation: number;
  tokenPrice: number;
  totalTokens: number;
  tokensSold: number;
  raised: number;
  percentage: number;
  investorsCount: number;
  problema?: string | null;
  solucao?: string | null;
  diferencial?: string | null;
  modeloReceita?: string | null;
  mercadoAlvo?: string | null;
  sociosCount?: number | null;
  dedicacao?: string | null;
  compradores?: string | null;
  investimentoPrevio?: string | null;
  concorrencia?: string | null;
  participacaoLucros: boolean;
  faturamentoMinimoLucros?: number | null;
  beneficiosAdicionais: boolean;
  beneficiosDescricao?: string | null;
  aceiteTermoRepasse: boolean;
  declaracaoVeracidade: boolean;
  resources: ComplianceCampaignResource[];
  startup: ComplianceCampaignStartup;
}

/** Busca detalhes completos de uma campanha para o painel de compliance. */
export function useComplianceCampaignDetailQuery(campaignId: number | string | undefined) {
  const id = typeof campaignId === "string" ? Number(campaignId) : campaignId;
  return useQuery<ComplianceCampaignDetail | null>({
    queryKey: queryKeys.compliance.campaignDetail(id as number),
    queryFn: async () => {
      const res = await fetch(`/api/compliance/campaigns/${id}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        throw new Error(json?.message ?? `Detalhe campanha falhou: ${res.status}`);
      }
      return (json?.data ?? null) as ComplianceCampaignDetail | null;
    },
    enabled: typeof id === "number" && Number.isFinite(id) && id > 0,
    staleTime: 30_000,
  });
}