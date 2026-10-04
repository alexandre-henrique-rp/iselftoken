import type { StartupFeatured } from "./startup-featured";

export interface CuratedPick {
  startupId: number;
  quote: string;
  curatorName: string;
  curatorRole: string;
  curatorAvatar: string;
  startup: StartupFeatured;
}
