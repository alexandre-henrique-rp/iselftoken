import type { CampaignStatus, PlatformStatus } from "./startup-status";

export interface RoundTermsValues {
  metaCaptacao: number; // R$ em número
  equityOferecido: number; // % (0-100)
  prazoCaptacao: number; // 60 | 90 | 120 dias
}

export interface UseOfFundsCategory {
  id: string; // uuid local / id do backend
  nome: string; // nome da categoria (ex.: "Marketing")
  percentual: number; // 0-100
}

export interface UseOfFundsValues {
  descricao: string; // texto livre (até 1000 chars)
  categorias: UseOfFundsCategory[];
}

export interface RoundScheduleValues {
  dataAbertura: string | null; // YYYY-MM-DD
  dataEncerramento: string | null; // YYYY-MM-DD
  dataLiquidacao: string | null; // YYYY-MM-DD — settlement / liquidação financeira
}

/**
 * Subset de StartupDetail usado pela página de edição.
 * Será estendido em fases seguintes conforme cada aba migra pra usar loader data.
 */
export interface StartupDetail {
  id: string;
  slug: string;
  name: string;
  platformStatus: PlatformStatus;
  campaignStatus: CampaignStatus;
  tokenPrice: number | null; // null = "aguardando precificação"
  campaignId: number | null; // id da campaign p/ checkout
  tokenReservationPaid: boolean; // se reserva 2% já foi paga
  roundTerms: RoundTermsValues | null; // defaults p/ form da oferta (null = ainda sem dados)
  useOfFunds: UseOfFundsValues | null; // null = ainda sem dados
  schedule: RoundScheduleValues | null; // null = datas ainda não definidas
  socios?: Array<Record<string, unknown>> | null;
  teams?: Array<Record<string, unknown>> | null;
  titular?: string | null;
  documento_titular?: string | null;
  banco?: string | null;
  tipo_conta?: string | null;
  agencia?: string | null;
  conta?: string | null;
  digito?: string | null;
  pix_key?: string | null;
  areaAtuacaoIds?: number[] | null;
  areasAtuacao?: Array<{ id: number; slug: string; nome: string }> | null;
}
