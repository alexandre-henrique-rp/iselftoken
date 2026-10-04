import type { StartupCardSeal } from "./startup-featured";

export interface EarlyAccessOpportunity {
  id: number;
  name: string;
  category: string;
  image?: string | null;
  progress: number;
  raised: string;
  goal: string;
  seals?: StartupCardSeal[];
  deadline?: string | null;
}
