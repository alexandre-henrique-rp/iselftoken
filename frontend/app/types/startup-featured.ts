export type StartupCategoryCode =
  | "FINTECH"
  | "AI"
  | "SAAS"
  | "HEALTHTECH"
  | "EDTECH"
  | "BIOTECH"
  | "OTHER";

export interface StartupCardSeal {
  slug: string;
  name: string;
  imagePath: string;
  category: string;
}

export interface StartupFeatured {
  id: number;
  slug: string;
  name: string;
  description: string;
  image: string;
  cover?: string | null;
  tags: string[];
  category?: StartupCategoryCode;
  equity: string;
  valuation: string;
  raised: string;
  goal: string;
  progress: number;
  score?: number;
  seals?: StartupCardSeal[];
  /** ISO 8601 da deadline da campanha. null se não há campanha ativa. */
  deadline: string | null;
  /** 7 valores normalizados [0,1] de captação por dia (pos 0 = 6d atrás, pos 6 = hoje). */
  sparkline7d: number[];
}
