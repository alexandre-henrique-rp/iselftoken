import { useRouteLoaderData } from "react-router";
import { TrendingUp, DollarSign, Coins } from "lucide-react";
import { cn } from "~/lib/utils";
import type { loader } from "./compliance-user-detail";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente", color: "text-yellow-400" },
  CONFIRMED: { label: "Confirmado", color: "text-green-400" },
  CANCELED: { label: "Cancelado", color: "text-red-400" },
  REFUNDED: { label: "Reembolsado", color: "text-gray-400" },
};

export function meta() {
  return [
    { title: "Investimentos | Compliance | iSelfToken" },
  ];
}

export default function ComplianceUserDetailInvestmentsPage() {
  const user = useRouteLoaderData<typeof loader>("routes/private/compliance-user-detail");

  if (!user) {
    return <div>Carregando...</div>;
  }

  const totalInvested = user.investments.reduce((sum: number, inv) => sum + inv.amount, 0);
  const totalTokens = user.investments.reduce((sum: number, inv) => sum + inv.tokensQty, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
              <DollarSign className="w-3 h-3" />
              Total Investido
            </div>
            <p className="text-xl font-black text-foreground">
              R$ {(totalInvested / 100).toFixed(2)}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
              <Coins className="w-3 h-3" />
              Tokens
            </div>
            <p className="text-xl font-black text-foreground">
              {totalTokens.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        <section className="rounded-3xl p-6 lg:p-8 bg-black/30 border border-white/5 space-y-6">
          <h2 className="text-xl font-black tracking-tight italic flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            Histórico de Investimentos
          </h2>

          {user.investments.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum investimento realizado.</p>
          ) : (
            <div className="space-y-3">
              {user.investments.map((inv) => {
                const statusInfo = STATUS_LABELS[inv.status] || { label: inv.status, color: "text-muted-foreground" };
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10"
                  >
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest">{inv.startupNome}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(inv.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-foreground">
                        R$ {(inv.amount / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {inv.tokensQty} tokens
                      </p>
                      <p className={cn("text-xs font-medium", statusInfo.color)}>
                        {statusInfo.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-primary/5 to-transparent border border-white/5 space-y-4">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary">
            Investimentos
          </span>
          <p className="text-xs text-muted-foreground/60">
            Histórico de investimentos do usuário em campanhas.
          </p>
        </div>
      </aside>
    </div>
  );
}