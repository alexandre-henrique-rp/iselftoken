export interface EarlyAccessRankingItem {
  position: number;
  startupId: string;
  startupName: string;
  category: string;
  reservations: number;
  logoUrl: string | null;
}

export interface EarlyAccessRankingData {
  ranking: EarlyAccessRankingItem[];
  totalReservations: number;
  lastUpdated: string;
}
