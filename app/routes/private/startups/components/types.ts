export type PlatformStatus = "approved" | "analysis" | "rejected" | "draft";

export type CampaignStatus = "open" | "editing" | "funded" | "closed";

export interface StartupCampaign {
  status: CampaignStatus;
  raised: number;
  goal: number;
  percentage: number;
  investors: number;
  daysLeft: number | null;
}

export interface StartupItem {
  id: string;
  name: string;
  segment: string;
  logo: string;
  status: PlatformStatus;
  stage: string;
  totalTokens: number;
  soldTokens: number;
  createdAt: string;
  campaign: StartupCampaign | null;
}

export interface StartupFiltersState {
  status: "all" | PlatformStatus;
  campaign: "all" | CampaignStatus;
  search: string;
}
