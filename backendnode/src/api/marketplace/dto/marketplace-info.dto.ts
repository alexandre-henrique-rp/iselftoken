/**
 * S2-T05 — MarketplaceInfoDto
 *
 * Payload retornado por GET /startups/:id/marketplace-info.
 * Inclui score, breakdown 9 chaves, pin info e timestamp do ultimo calculo.
 */

export class ScoreBreakdownKeyDto {
  earned!: number;
  max!: number;
  count?: number;
}

export class MarketplaceScoreBreakdownDto {
  kyc!: ScoreBreakdownKeyDto;
  documents!: ScoreBreakdownKeyDto;
  seals!: ScoreBreakdownKeyDto;
  traction!: ScoreBreakdownKeyDto;
  raised!: ScoreBreakdownKeyDto;
  deadline!: ScoreBreakdownKeyDto;
  category!: ScoreBreakdownKeyDto;
  partnerships!: ScoreBreakdownKeyDto;
  activity!: ScoreBreakdownKeyDto;
}

export class MarketplacePinInfoDto {
  manuallyPinned!: boolean;
  manuallyPinnedBy?: number | null;
  manuallyPinnedAt?: Date | string | null;
  manuallyPinnedReason?: string | null;
}

export class MarketplaceInfoDto {
  startupId!: number;
  slug!: string;
  score!: number;
  scoreBreakdown!: MarketplaceScoreBreakdownDto;
  scoreLastCalculatedAt?: Date | string | null;
  pin!: MarketplacePinInfoDto;
}
