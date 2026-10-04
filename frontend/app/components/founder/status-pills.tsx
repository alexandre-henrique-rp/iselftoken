import { cn } from "~/lib/utils";
import {
  type CampaignStatus,
  type PlatformStatus,
  PLATFORM_LABELS,
  CAMPAIGN_LABELS,
  mapCampaignStatus,
  mapPlatformStatus,
} from "~/lib/startup-status";

interface StatusPillsProps {
  platformStatus: PlatformStatus;
  campaignStatus: CampaignStatus;
}

const CAMPAIGN_COLOR: Record<CampaignStatus, string> = {
  editing: "bg-white/5 text-muted-foreground border-white/10",
  open: "bg-primary/10 text-primary border-primary/20",
  funded: "bg-primary/15 text-primary border-primary/30",
  closed: "bg-stone-700/30 text-stone-400 border-stone-700/40",
};

export function DashboardStatusPills({
  platformStatus,
  campaignStatus,
}: {
  platformStatus: "approved" | "analyzing";
  campaignStatus: string;
}) {
  const campaignLabels: Record<string, string> = {
    draft: "Rascunho",
    analysis: "Em análise",
    open: "Aberta",
    paused: "Pausada",
    closed: "Encerrada",
    funded: "Financiada",
    paid_out: "Paga",
  };
  const campaignColors: Record<string, string> = {
    draft: "bg-white/5 text-muted-foreground border-white/10",
    analysis: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    open: "bg-primary/10 text-primary border-primary/20",
    paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    closed: "bg-stone-700/30 text-stone-400 border-stone-700/40",
    funded: "bg-primary/15 text-primary border-primary/30",
    paid_out: "bg-primary/15 text-primary border-primary/30",
  };
  const platformLabel = platformStatus === "approved" ? "Aprovada" : "Análise";
  const campaignLabel = campaignLabels[campaignStatus] ?? "Rascunho";

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-2">
        <span className="w-[58px] text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Startup
        </span>
        <span className="pill" aria-label={`Status da startup: ${platformLabel}`}>
          {platformLabel}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-[58px] text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Captação
        </span>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]",
            campaignColors[campaignStatus] ?? campaignColors.draft,
          )}
          aria-label={`Status da captação: ${campaignLabel}`}
        >
          {campaignLabel}
        </span>
      </div>
    </div>
  );
}

export function StatusPills({ platformStatus, campaignStatus }: StatusPillsProps) {
  // O backend pode retornar enums em maiúsculas (OPEN/DRAFT/APPROVED),
  // enquanto a UI usa o estado normalizado em minúsculas.
  const normalizedPlatformStatus = mapPlatformStatus(String(platformStatus ?? ""));
  const normalizedCampaignStatus = mapCampaignStatus(String(campaignStatus ?? ""));

  return (
    <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Startup
        </span>
        <span
          className="pill"
          aria-label={`Status da startup: ${PLATFORM_LABELS[normalizedPlatformStatus]}`}
        >
          {PLATFORM_LABELS[normalizedPlatformStatus]}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Captação
        </span>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]",
            CAMPAIGN_COLOR[normalizedCampaignStatus],
          )}
          aria-label={`Status da captação: ${CAMPAIGN_LABELS[normalizedCampaignStatus]}`}
        >
          {CAMPAIGN_LABELS[normalizedCampaignStatus]}
        </span>
      </div>
    </div>
  );
}
