import React from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "~/lib/utils";

interface InvestmentCardProps {
  investment: {
    id: number;
    campaignTitle: string;
    amount: number;
    tokensQty: number;
    status: "PENDING" | "CONFIRMED" | "CANCELLED";
    paymentStatus: string;
    createdAt: string;
    /** Valor atual real (Token.currentVal). null = sem cotação. */
    currentValue?: number | null;
    /** Total pago (subtotal + taxa). Fallback: igual a amount. */
    totalCharged?: number;
    /** Taxa da plataforma cobrada. Null em investimentos legados. */
    platformFeeAmount?: number | null;
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
};

const statusConfig = {
  PENDING: { label: "Pendente", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  CONFIRMED: { label: "Confirmado", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  CANCELLED: { label: "Cancelado", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
};

export function InvestmentCard({ investment }: InvestmentCardProps) {
  const config = statusConfig[investment.status] || statusConfig.PENDING;
  const StatusIcon = config.icon;

  // Valor atual REAL vindo da API (soma de Token.currentVal). Antes era
  // `amount * 1.15` — valorização de +15% inventada no frontend.
  const currentVal =
    investment.status === "CONFIRMED" && investment.currentValue != null
      ? investment.currentValue
      : null;

  return (
    <div className="group bg-accent/20 hover:bg-accent/30 transition-all duration-500 rounded-2xl p-4 lg:p-5 border border-white/5 shadow-lg">
      <div className="flex flex-col xl:flex-row items-center gap-6">
        {/* Startup Info */}
        <div className="flex items-center gap-4 w-full xl:w-1/4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-container p-0.5 shrink-0">
            <div className="h-full w-full rounded-[0.95rem] overflow-hidden bg-black flex items-center justify-center">
              <span className="text-2xl font-black text-primary">{investment.campaignTitle.charAt(0)}</span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors italic truncate">
              {investment.campaignTitle}
            </h3>
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              {investment.tokensQty} tokens
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="w-full xl:w-1/6 flex justify-start xl:justify-center">
          <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full border", config.bg, config.color, config.border)}>
            <StatusIcon className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-widest">{config.label}</span>
          </div>
        </div>

        {/* Values */}
        <div className="w-full xl:flex-1 flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Valor de Compra</span>
            <p className="text-base font-black text-foreground tracking-tight">{formatCurrency(investment.amount)}</p>
            {investment.platformFeeAmount != null && investment.platformFeeAmount > 0 && (
              <p className="text-[9px] font-medium text-muted-foreground/60">
                +{formatCurrency(investment.platformFeeAmount)} taxa
              </p>
            )}
          </div>
          <div className="space-y-1 text-right">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Valor Atual</span>
            <p className={cn("text-base font-black tracking-tight", currentVal !== null ? "text-emerald-400" : "text-muted-foreground")}>
              {currentVal !== null ? formatCurrency(currentVal) : "—"}
            </p>
          </div>
        </div>

        {/* Date */}
        <div className="w-full xl:w-auto text-right">
          <span className="text-[10px] text-muted-foreground">
            {new Date(investment.createdAt).toLocaleDateString("pt-BR")}
          </span>
        </div>
      </div>
    </div>
  );
}
