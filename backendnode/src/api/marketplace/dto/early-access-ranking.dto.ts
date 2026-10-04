/**
 * DTO de resposta para um item do ranking de Early Access.
 */
export interface EarlyAccessRankingItem {
  position: number;
  startupId: string;
  startupName: string;
  category: string;
  reservations: number;
  logoUrl: string | null;
}

/**
 * DTO de resposta para o endpoint de ranking de Early Access.
 */
export interface EarlyAccessRankingResponse {
  ranking: EarlyAccessRankingItem[];
  totalReservations: number;
  lastUpdated: string;
}
