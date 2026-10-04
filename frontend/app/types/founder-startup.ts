export type RoundStatus =
  | "sem_rodada"
  | "criada_aguardando_reserva"
  | "reserva_paga"
  | "ativa"
  | "pausada"
  | "cancelada"
  | "encerrada";

export interface FounderStartup {
  id: string;
  slug: string;
  logo: string | null;
  nome: string;
  segmento: string | null;
  categoria?: string | null;
  status: "aprovada" | "em_analise" | "rejeitada";
  /** Fase 3 rejeitada pelo admin/compliance; libera a correção da captação. */
  phase3Rejected?: boolean;
  estagio: string | null;
  totalTokens: number;
  tokensVendidos: number;
  percentualVendido: number;
  /** R$ captado (investimentos CONFIRMED da campanha ativa) — em centavos. */
  valorCaptado?: number;
  /** R$ meta da campanha ativa (tokenPrice × totalTokens) — em centavos. `null` se não há campanha ativa. */
  valorMeta?: number | null;
  /** Progresso 0-100 da campanha ativa (derivado). */
  progresso?: number;
  /** Badges visuais calculados pelo backend. */
  badges?: Array<{ type: string; label: string; color: string }>;
  statusCampanha:
    | "edicao"
    | "em_analise"
    | "aberto"
    | "financiado"
    | "reprovado"
    | "pago";
  /** Emoji da bandeira do país (🇧🇷 etc.) — segundo sinal visual no avatar. */
  bandeira: string | null;
  createdAt: string;
  /** Status atual da rodada de captação. Indefinido se nenhuma rodada existir. */
  roundStatus?: RoundStatus;
  /**
   * True quando o Admin finalizou definitivamente o payout (repasse
   * configurado, mín. 12 parcelas). Libera "Solicitar Parcela" no card
   * (admin-payout-management §6.2).
   */
  repasseConfigurado?: boolean;
  /**
   * Campanhas da startup (mais recente primeiro). S18.6 — exposto pelo
   * backend em `enrichment.service.ts` para que o dashboard do fundador
   * possa linkar direto em `/founder/campaigns/:campaignId/financeiro`
   * sem passar pelo redirect legacy de startup.
   */
  campaigns?: Array<{ id: number; status: string }>;
}

export interface FounderStartupResponse {
  error: boolean;
  message: string;
  codigo: number;
  data: FounderStartup[];
}
