import React from "react";
import { Wallet, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { cn } from "~/lib/utils";

interface InvestmentMetricsProps {
  totalInvested: number;
  /** null quando não há cotação conhecida — a UI mostra "—". */
  currentValue: number | null;
  roi: number | null;
  pendingCount: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
};

export function InvestmentMetrics({ totalInvested, currentValue, roi, pendingCount }: InvestmentMetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Invested */}
      <div className="bg-accent/20 rounded-2xl p-5 border border-white/5 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Total Investido
          </span>
        </div>
        <p className="text-3xl font-black text-foreground tracking-tighter">
          {formatCurrency(totalInvested)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Valor total aplicado
        </p>
      </div>

      {/* Current Value */}
      <div className="bg-accent/20 rounded-2xl p-5 border border-white/5 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Valor Atual
          </span>
        </div>
        <p className="text-3xl font-black text-foreground tracking-tighter">
          {currentValue !== null ? formatCurrency(currentValue) : "—"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {currentValue !== null ? "Valor atualizado da carteira" : "Sem cotação disponível"}
        </p>
      </div>

      {/* ROI */}
      <div className="bg-accent/20 rounded-2xl p-5 border border-white/5 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", roi === null ? "bg-white/5" : roi >= 0 ? "bg-emerald-500/10" : "bg-red-500/10")}>
            {roi === null || roi >= 0 ? <TrendingUp className={cn("w-5 h-5", roi === null ? "text-muted-foreground" : "text-emerald-400")} /> : <TrendingDown className="w-5 h-5 text-red-400" />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            ROI
          </span>
        </div>
        <p className={cn("text-3xl font-black tracking-tighter", roi === null ? "text-muted-foreground" : roi >= 0 ? "text-emerald-400" : "text-red-400")}>
          {roi === null ? "—" : `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {roi === null ? "Sem cotação disponível" : "Retorno sobre investimento"}
        </p>
      </div>

      {/* Pending */}
      <div className="bg-accent/20 rounded-2xl p-5 border border-white/5 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Pendentes
          </span>
        </div>
        <p className="text-3xl font-black text-foreground tracking-tighter">
          {pendingCount}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Aguardando confirmação
        </p>
      </div>
    </div>
  );
}
