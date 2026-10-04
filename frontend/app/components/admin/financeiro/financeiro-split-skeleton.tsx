import { Loader2 } from "lucide-react";

/**
 * Skeleton da página /admin/financeiro/split — preserva layout sem fabricar
 * números (mesmo padrão de admin-dashboard-skeleton).
 */
export function FinanceiroSplitSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-muted-foreground py-4">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        Carregando split financeiro...
      </div>
      <div className="rounded-2xl border border-white/10 bg-card p-4 sm:p-5 h-32 animate-pulse" />
      <div className="rounded-2xl border border-white/10 bg-card h-96 animate-pulse" />
    </div>
  );
}
