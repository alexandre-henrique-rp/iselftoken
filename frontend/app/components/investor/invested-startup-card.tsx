import React from "react";
import { Link } from "react-router";
import { ExternalLink } from "lucide-react";
import { InitialsImage } from "~/components/ui/initials-image";
import { cn } from "~/lib/utils";

interface InvestedStartupCardProps {
  startup: {
    startupId: number;
    nome: string;
    logo: string | null;
    segmento: string | null;
    campaignStatus: string;
    aportes: number;
    totalInvestido: number;
    totalTokens: number;
    currentValue: number | null;
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
};

const campaignStatusConfig: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  OPEN: {
    label: "Aberta",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  FUNDED: {
    label: "Financiada",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  FAILED: {
    label: "Falhada",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  PAUSED: {
    label: "Pausada",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
};

export function InvestedStartupCard({ startup }: InvestedStartupCardProps) {
  const statusCfg =
    campaignStatusConfig[startup.campaignStatus] ??
    campaignStatusConfig["PAUSED"];

  const hasValue = startup.currentValue != null;

  return (
    <div className="group bg-accent/20 hover:bg-accent/30 transition-all duration-500 rounded-2xl p-5 border border-white/5 shadow-lg flex flex-col gap-4">
      {/* Header: logo + nome + segmento */}
      <div className="flex items-start gap-4">
        <InitialsImage
          name={startup.nome}
          src={startup.logo}
          alt={startup.nome}
          className="h-14 w-14 rounded-2xl border border-white/10"
          fallbackClassName="bg-gradient-to-br from-primary to-primary-container"
          fallbackTextClassName="text-sm font-black text-primary-foreground"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors italic truncate leading-tight">
            {startup.nome}
          </h3>
          {startup.segmento && (
            <span className="text-xs text-muted-foreground font-medium">
              {startup.segmento}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest",
            statusCfg.bg,
            statusCfg.color,
            statusCfg.border,
          )}
        >
          <span>{statusCfg.label}</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
          {startup.aportes} aporte{startup.aportes !== 1 ? "s" : ""}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-0.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
            Investido
          </span>
          <p className="text-sm font-black text-foreground tracking-tight leading-tight">
            {formatCurrency(startup.totalInvestido)}
          </p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
            Tokens
          </span>
          <p className="text-sm font-black text-foreground tracking-tight leading-tight">
            {startup.totalTokens.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
            Valor Atual
          </span>
          <p
            className={cn(
              "text-sm font-black tracking-tight leading-tight",
              hasValue ? "text-emerald-400" : "text-muted-foreground",
            )}
          >
            {hasValue ? formatCurrency(startup.currentValue!) : "—"}
          </p>
        </div>
      </div>

      {/* Links */}
      <div className="flex items-center gap-3 pt-1 border-t border-white/5">
        <Link
          to={`/startups/${startup.startupId}`}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
        >
          Ver startup
          <ExternalLink className="w-3 h-3" />
        </Link>
        <Link
          to={`/startups/${startup.startupId}/transparencia`}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
        >
          Ver transparência
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
