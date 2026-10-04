export type PlatformStatus = "draft" | "analysis" | "approved" | "rejected";

export type CampaignStatus = "editing" | "open" | "funded" | "closed";

export function mapPlatformStatus(raw?: string): PlatformStatus {
  const n = (raw ?? "").toLowerCase();
  if (n === "approved" || n === "aprovada") return "approved";
  if (n === "analysis" || n === "em_analise" || n === "em análise") return "analysis";
  if (n === "rejected" || n === "rejeitada") return "rejected";
  return "draft";
}

export function mapCampaignStatus(raw?: string): CampaignStatus {
  const n = (raw ?? "").toLowerCase();
  if (n === "open" || n === "aberto" || n === "aberta") return "open";
  if (n === "funded" || n === "financiada") return "funded";
  if (n === "closed" || n === "encerrada") return "closed";
  return "editing";
}

export const PLATFORM_LABELS: Record<PlatformStatus, string> = {
  draft: "Rascunho",
  analysis: "Em análise",
  approved: "Aprovada",
  rejected: "Rejeitada",
};

export const CAMPAIGN_LABELS: Record<CampaignStatus, string> = {
  editing: "Rascunho",
  open: "Aberta",
  funded: "Financiada",
  closed: "Encerrada",
};
