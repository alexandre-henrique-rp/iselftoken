/**
 * S3-T01 — Tipos do card de posicao de marketplace do founder.
 *
 * Espelha o payload de GET /api/startups/:id/marketplace-info (S2-T05):
 * score 0..100, breakdown de 9 chaves, pin info e timestamp.
 */

export type ScoreBreakdownKey = {
  earned: number;
  max: number;
  count?: number;
};

export type ScoreBreakdown = {
  kyc: ScoreBreakdownKey;
  documents: ScoreBreakdownKey;
  seals: ScoreBreakdownKey;
  traction: ScoreBreakdownKey;
  raised: ScoreBreakdownKey;
  deadline: ScoreBreakdownKey;
  category: ScoreBreakdownKey;
  partnerships: ScoreBreakdownKey;
  activity: ScoreBreakdownKey;
};

export type MarketplacePinInfo = {
  manuallyPinned: boolean;
  manuallyPinnedBy?: number | null;
  manuallyPinnedAt?: string | null;
  manuallyPinnedReason?: string | null;
};

export type MarketplacePositionData = {
  startupId: number;
  slug: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  scoreLastCalculatedAt?: string | null;
  pin: MarketplacePinInfo;
};