import { Coins, TrendingUp, Users } from "lucide-react";
import type { PlanStats } from "~/lib/plan-types";

interface PlanStatsCardProps {
  stats: PlanStats | null;
  loading?: boolean;
}

const brl = (v: number | string | null | undefined) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(v ?? 0));

/**
 * Card de estatísticas do plano (MRR + assinantes ativos).
 */
export function PlanStatsCard({ stats, loading }: PlanStatsCardProps) {
  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-5 border border-white/5 animate-pulse">
        <div className="h-4 bg-white/5 rounded mb-3" />
        <div className="h-8 bg-white/5 rounded" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="glass-panel rounded-2xl p-5 border border-white/5 text-center">
        <p className="text-xs text-muted-foreground">
          Estatísticas indisponíveis.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="glass-panel rounded-2xl p-4 border border-white/5 space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <Users className="w-3 h-3" /> Assinantes Ativos
        </div>
        <p className="text-2xl font-black text-foreground tabular-nums">
          {stats.activeSubscribers}
        </p>
      </div>
      <div className="glass-panel rounded-2xl p-4 border border-white/5 space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <TrendingUp className="w-3 h-3" /> MRR
        </div>
        <p className="text-2xl font-black text-foreground tabular-nums">
          {brl(stats.mrr)}
        </p>
      </div>
      <div className="glass-panel rounded-2xl p-4 border border-white/5 space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <Coins className="w-3 h-3" /> Receita Total
        </div>
        <p className="text-2xl font-black text-foreground tabular-nums">
          {brl(stats.totalRevenue)}
        </p>
      </div>
    </div>
  );
}
