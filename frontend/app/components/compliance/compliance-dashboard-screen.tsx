import { AlertCircle, Building2, CheckCircle2, Shield, Users, XCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { ComplianceDashboardNavigation } from "~/components/compliance/compliance-dashboard-navigation";
import { ComplianceDashboardSkeleton } from "~/components/compliance/compliance-dashboard-skeleton";
import { useComplianceDashboardSummaryQuery } from "~/hooks/use-compliance-dashboard-summary";
import { useComplianceStartupDecisionMutation } from "~/hooks/use-compliance-startup-decision";
import { cn } from "~/lib/utils";

const KPI_CARDS = [
  { key: "kyc_pending", label: "KYC pendente", description: "Usuários aguardando verificação", icon: Users, iconClass: "text-warning", iconBg: "bg-warning/10" },
  { key: "startups_pending", label: "Startups pendentes", description: "Aguardando curadoria", icon: Building2, iconClass: "text-primary", iconBg: "bg-primary/10" },
  { key: "approved_today", label: "Aprovados hoje", description: "Aprovações registradas hoje", icon: Shield, iconClass: "text-primary", iconBg: "bg-primary/10" },
] as const;

function statusBadge(status: string) {
  const styles: Record<string, { label: string; className: string }> = {
    APPROVED: { label: "Aprovado", className: "border-primary/20 bg-primary/10 text-primary" },
    REJECTED: { label: "Rejeitado", className: "border-destructive/20 bg-destructive/10 text-destructive" },
    PENDING: { label: "Pendente", className: "border-warning/20 bg-warning/10 text-warning" },
    UNDER_REVIEW: { label: "Em análise", className: "border-warning/20 bg-warning/10 text-warning" },
  };
  const badge = styles[status] ?? { label: "Sem status", className: "border-white/10 bg-white/5 text-muted-foreground" };
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", badge.className)}>{badge.label}</span>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

export function ComplianceDashboardScreen() {
  const { data, isError, isLoading, refetch } = useComplianceDashboardSummaryQuery();
  const decisionMutation = useComplianceStartupDecisionMutation();
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  if (isLoading && !data) {
    return <ComplianceDashboardSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-white/10 bg-card/70 p-10 text-center shadow-lg" role="alert">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden />
        <p className="mt-3 text-sm font-bold text-destructive">Não foi possível carregar o dashboard.</p>
        <p className="mt-1 text-xs text-muted-foreground">Verifique a conexão com o backend e tente novamente.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-5 inline-flex rounded-full bg-primary px-6 py-2 text-[10px] font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const kpis = data?.kpis ?? { kyc_pending: 0, startups_pending: 0, approved_today: 0 };
  const pendingApprovals = data?.pendingApprovals ?? [];
  const recentKycDecisions = data?.recentKycDecisions ?? [];

  const decideStartup = (startupId: number, decision: "APPROVED" | "REJECTED") => {
    setActionLoading(startupId);
    decisionMutation.mutate({ startupId, decision }, { onSettled: () => setActionLoading(null) });
  };

  return (
    <div className="relative mx-auto w-full max-w-7xl space-y-8 xl:max-w-[1400px]">
      <header className="space-y-3">
        <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-primary">Compliance</span>
        <h1 className="text-4xl font-black leading-none tracking-tighter text-foreground sm:text-5xl lg:text-6xl">Dashboard operacional</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Acompanhe as filas de análise e acesse rapidamente todas as operações de Compliance.</p>
      </header>

      <ComplianceDashboardNavigation />

      <section aria-labelledby="compliance-kpis-title">
        <h2 id="compliance-kpis-title" className="sr-only">Indicadores de Compliance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {KPI_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.key} className="rounded-2xl border border-white/10 bg-card/70 p-5 shadow-lg">
                <div className="flex items-center gap-3">
                  <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", card.iconBg)}><Icon className={cn("h-5 w-5", card.iconClass)} aria-hidden /></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{card.label}</span>
                </div>
                <p className="mt-4 text-3xl font-black tracking-tighter text-foreground">{kpis[card.key]}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="pending-startups-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 id="pending-startups-title" className="text-xl font-black tracking-tight text-foreground">Startups pendentes</h2><p className="text-sm text-muted-foreground">Revise e decida as solicitações de curadoria.</p></div>
          <Link to="/compliance/startups" className="text-xs font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Ver todas</Link>
        </div>
        {pendingApprovals.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card/70 p-8 text-center" role="status"><Building2 className="mx-auto h-9 w-9 text-muted-foreground/40" aria-hidden /><p className="mt-3 text-sm text-muted-foreground">Nenhuma startup pendente de aprovação.</p></div>
        ) : (
          <div className="space-y-3">
            {pendingApprovals.map((startup) => {
              const busy = actionLoading === startup.id;
              return (
                <div key={startup.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-card/70 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between lg:p-5">
                  <div className="min-w-0"><h3 className="truncate text-base font-bold text-foreground">{startup.nome}</h3><p className="mt-1 truncate text-xs text-muted-foreground">Fundador: {startup.founderName} ({startup.founderEmail})</p><p className="mt-1 text-[10px] text-muted-foreground/70">Enviada em {formatDate(startup.createdAt)}</p></div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => decideStartup(startup.id, "APPROVED")} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />{busy ? "Processando..." : "Aprovar"}</button>
                    <button type="button" disabled={busy} onClick={() => decideStartup(startup.id, "REJECTED")} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-destructive transition hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:cursor-not-allowed disabled:opacity-50"><XCircle className="h-3.5 w-3.5" aria-hidden />{busy ? "Processando..." : "Rejeitar"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="recent-kyc-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="recent-kyc-title" className="text-xl font-black tracking-tight text-foreground">Decisões recentes de KYC</h2><p className="text-sm text-muted-foreground">Últimas movimentações registradas na fila de verificação.</p></div><Link to="/compliance/users" className="text-xs font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Abrir usuários</Link></div>
        {recentKycDecisions.length === 0 ? <div className="rounded-2xl border border-white/10 bg-card/70 p-8 text-center" role="status"><Shield className="mx-auto h-9 w-9 text-muted-foreground/40" aria-hidden /><p className="mt-3 text-sm text-muted-foreground">Nenhuma decisão recente de KYC.</p></div> : <div className="space-y-3">{recentKycDecisions.map((decision) => <div key={decision.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between lg:p-5"><div className="min-w-0"><h3 className="truncate text-base font-bold text-foreground">{decision.userName}</h3><p className="truncate text-xs text-muted-foreground">{decision.userEmail}</p>{decision.rejectionReason && <p className="mt-1 text-xs text-destructive">Motivo: {decision.rejectionReason}</p>}</div><div className="flex shrink-0 items-center gap-3">{statusBadge(decision.status)}<span className="text-[10px] text-muted-foreground">{formatDate(decision.updatedAt)}</span></div></div>)}</div>}
      </section>
    </div>
  );
}
