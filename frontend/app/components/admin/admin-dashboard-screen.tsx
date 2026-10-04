import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Coins,
  Inbox,
  Loader2,
  Rocket,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "react-router";
import { AdminDashboardSkeleton } from "~/components/admin/admin-dashboard-skeleton";
import { AdminHeader } from "~/components/admin/admin-header";
import {
  ActionTile,
  HeroTile,
  PaymentsOverviewTile,
  PendingRedemptionsTile,
  SecondaryTile,
} from "~/components/admin/dashboard-tiles";
import { formatBRLCompact, formatBRLCompactWithCents, formatInt } from "~/lib/currency-format";
import type { AdminDashboardSummary } from "~/lib/queries";

interface AdminDashboardScreenProps {
  data: AdminDashboardSummary | null;
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  onRetry?: () => void;
}

/**
 * AdminDashboardScreen — Tile Mosaic (Wireframe 5).
 *
 * Estrutura:
 *  - Header editorial (título da seção)
 *  - Hero tile (60%): GMV + delta vs ontem + sparkline
 *  - 4 secondary tiles (2x2): Usuários, Startups, Campanhas, Tokens
 *  - 3 action tiles (rodapé): Saques, Campanhas ativas, KYC em fila
 *
 * Indicadores de saúde do sistema (Live Analytics + System Status) foram
 * removidos do header — informação de "sistema ok" é inferida pelo próprio
 * `data` (se falhou, isError mostra alerta; se carregou, está ok).
 *
 * Regra do produto: dados SEMPRE do banco. Zero zeros fabricados.
 */
export function AdminDashboardScreen({
  data,
  isLoading,
  isError,
  isFetching = false,
  onRetry,
}: AdminDashboardScreenProps) {
  if (isLoading && !data) {
    return (
      <main className="min-h-0 pt-2 pb-4 px-1.5 md:pt-3 md:pb-5 md:px-0">
        <div className="w-full max-w-7xl xl:max-w-[1400px] mx-auto">
          <AdminDashboardSkeleton />
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-0 pt-2 pb-4 px-1.5 md:pt-3 md:pb-5 md:px-0">
        <div className="w-full max-w-7xl xl:max-w-[1400px] mx-auto">
          <AdminHeader />
          <div
            className="glass-panel rounded-2xl p-10 text-center space-y-4"
            role="alert"
          >
            <AlertCircle
              className="w-10 h-10 text-destructive mx-auto"
              aria-hidden
            />
            <p className="text-destructive text-sm font-bold">
              Não foi possível carregar a dashboard do banco de dados.
            </p>
            <p className="text-muted-foreground text-xs">
              Verifique a conexão com o backend e tente novamente.
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={isFetching}
                className="mt-4 inline-flex items-center justify-center gap-2 px-6 py-2 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {isFetching && (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                )}
                {isFetching ? "Tentando..." : "Tentar novamente"}
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-0 pt-2 pb-4 px-1.5 md:pt-3 md:pb-5 md:px-0">
        <div className="w-full max-w-7xl xl:max-w-[1400px] mx-auto">
          <AdminHeader />
          <div
            className="glass-panel rounded-2xl p-10 text-center space-y-3"
            role="status"
          >
            <Inbox
              className="w-10 h-10 text-muted-foreground/30 mx-auto"
              aria-hidden
            />
            <p className="text-muted-foreground/50 text-xs font-black uppercase tracking-widest">
              Nenhum dado retornado pelo backend.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const k = data.kpis;

  // Variantes dos action tiles baseadas em urgência (sem mock — derivado do dado real)
  const kycVariant: "default" | "warning" | "destructive" =
    k.kycPendingCount === 0
      ? "default"
      : k.kycOldestAgeHours >= 24
        ? "destructive"
        : "warning";
  const redemptionsVariant: "default" | "warning" | "destructive" =
    k.pendingRedemptionsCount === 0 ? "default" : "warning";
  const campaignsVariant: "default" | "warning" | "destructive" =
    k.activeCampaigns === 0
      ? "default"
      : k.activeCampaignsAvgProgress >= 70
        ? "default"
        : "warning";

  return (
    <main className="min-h-0 pt-2 pb-4 px-1.5 md:pt-3 md:pb-5 md:px-0">
      <div className="relative w-full max-w-7xl xl:max-w-[1400px] mx-auto">
        <AdminHeader />

        {/* Mosaic: Hero GMV full-width no topo + 4 secondary tiles 2x2 abaixo */}
        <section className="grid grid-cols-1 gap-3 lg:gap-4 mb-4 md:mb-5">
          {/* Hero tile — ocupa toda a largura */}
          <HeroTile
            label="GMV"
            value={formatBRLCompact(k.gmvToday)}
            deltaPct={k.gmvDeltaPct}
            detail="Volume de investimentos confirmados hoje"
            description="Soma do repasse devido às startups + receita da plataforma (spread + taxa) em todos os investimentos CONFIRMED. Exclui reservas, taxas de compliance e fast track."
            sparkline={data.gmvMonthly.data}
            sparklinePeriod="Últimos 12 meses"
          />

          {/* 4 secondary tiles em 2x2 (mobile: 1 col, sm: 2 cols, xl: 4 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
            <SecondaryTile
              label="Usuários"
              value={formatInt(k.totalUsers)}
              delta={`${formatInt(k.activeInvestors)} ativos`}
              description="Total de pessoas cadastradas (fundadores, investidores e admins). 'Ativos' = com pelo menos 1 investimento CONFIRMED."
              sparkline={data.userGrowth.data}
              icon={<Users className="w-4 h-4" aria-hidden />}
            />
            <SecondaryTile
              label="Startups"
              value={formatInt(k.totalStartups)}
              delta={`+${data.startupsMonthly.data.at(-1) ?? 0} no último mês`}
              description="Startups registradas e/ou em captação na plataforma, em qualquer status (pendente, em análise, aprovada, rejeitada)."
              sparkline={data.startupsMonthly.data}
              icon={<Rocket className="w-4 h-4" aria-hidden />}
            />
            <SecondaryTile
              label="Campanhas abertas"
              value={formatInt(k.activeCampaigns)}
              delta={`${k.activeCampaignsAvgProgress}% captação média`}
              description="Rodadas com status OPEN recebendo investimentos no momento. O percentual médio considera tokens vendidos / total tokens por campanha."
              sparkline={data.startupsMonthly.data}
              icon={<BarChart3 className="w-4 h-4" aria-hidden />}
            />
            <SecondaryTile
              label="Tokens vendidos"
              value={formatInt(k.tokensSold)}
              delta={`${formatBRLCompact(k.totalRedeemed)} repassados`}
              description="Quantidade total de tokens já vendidos em todas as campanhas finalizadas. 'Repassados' = soma dos withdrawals COMPLETED (saques para fundadores)."
              icon={<Coins className="w-4 h-4" aria-hidden />}
            />
          </div>
        </section>

        {k.totalUsers === 0 &&
          k.totalStartups === 0 &&
          k.activeCampaigns === 0 && (
            <div
              className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-3 text-sm"
              role="status"
            >
              <Inbox
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                aria-hidden
              />
              <div>
                <p className="font-semibold text-foreground">
                  Ainda não há registros operacionais.
                </p>
                <p className="mt-1 text-muted-foreground">
                  Cadastre uma startup ou aguarde os primeiros investimentos
                  para preencher os indicadores.
                </p>
              </div>
            </div>
          )}

        {/* Fila operacional e atalhos para os módulos administrativos */}
        <section className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-3 lg:gap-4">
          <PendingRedemptionsTile
            items={data.pendingRedemptions}
            count={k.pendingRedemptionsCount}
            amount={k.pendingRedemptionsAmount}
            variant={redemptionsVariant}
          />
          <ActionTile
            label="Campanhas ativas"
            count={k.activeCampaigns}
            detail={
              k.activeCampaigns === 0
                ? "Nenhuma campanha em captação"
                : `${k.activeCampaignsAvgProgress}% captação média`
            }
            cta="Ver startups"
            href="/admin/startups"
            variant={campaignsVariant}
          />
          <ActionTile
            label="KYC em fila"
            count={k.kycPendingCount}
            detail={
              k.kycPendingCount === 0
                ? "Nenhum KYC aguardando"
                : k.kycOldestAgeHours > 0
                  ? `Mais antigo: ${k.kycOldestAgeHours}h`
                  : "Aguardando revisão"
            }
            cta="Revisar KYC"
            href="/admin/kyc"
            variant={kycVariant}
          />
        </section>

        {/* Split Financeiro — repasse × lucro plataforma (admin-only) */}
        <section className="mt-4 md:mt-5 rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.04] via-card/70 to-card/40 p-4 sm:p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                Split Financeiro
              </h2>
            </div>
            <Link
              to="/admin/financeiro/split"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-black/50 transition-colors"
            >
              Auditoria por campanha
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
            <SecondaryTile
              label="Repasse às startups"
              value={formatBRLCompactWithCents(k.startupRepasseTotal)}
              delta={`${k.startupRepasseTotal > 0 ? Math.round((k.startupRepasseTotal / Math.max(k.gmv, 1)) * 100) : 0}% do GMV`}
              description="Valor devido aos fundadores: Σ (tokens vendidos × preço base). É o que vai para a startup via repasse — não inclui taxa de reserva, compliance ou fast track."
              sparkline={data.splitMonthly.repasse}
              icon={<TrendingUp className="w-4 h-4" aria-hidden />}
            />
            <SecondaryTile
              label="Lucro plataforma"
              value={formatBRLCompactWithCents(k.platformRevenueTotal)}
              delta={`Spread + taxa (${k.platformRevenueTotal > 0 ? Math.round((k.platformRevenueTotal / Math.max(k.gmv, 1)) * 100) : 0}% do GMV)`}
              description="Receita total da plataforma: spread (markup venda − base) + taxa cobrada do investidor no checkout. Visível apenas para ADMIN."
              sparkline={data.splitMonthly.lucro}
              icon={<BarChart3 className="w-4 h-4" aria-hidden />}
            />
            <SecondaryTile
              label="Spread (markup)"
              value={formatBRLCompactWithCents(k.platformSpreadTotal)}
              delta="Diferença venda × base"
              description="Σ (preço de venda − preço base) por token vendido. Representa o ganho da plataforma por token acima do valor de face."
              sparkline={data.splitMonthly.lucro}
              icon={<Coins className="w-4 h-4" aria-hidden />}
            />
            <SecondaryTile
              label="Taxa do checkout"
              value={formatBRLCompactWithCents(k.platformFeeTotal)}
              delta="Alíquota cobrada no checkout"
              description="Σ (subtotal de tokens × alíquota). Alíquota atual: fundraising.platformFee (default 5%). Cobrada do investidor por cima do valor dos tokens."
              sparkline={data.splitMonthly.lucro}
              icon={<TrendingUp className="w-4 h-4" aria-hidden />}
            />
          </div>
        </section>

        {/* Montador de Ordens e Pagamentos (KPI executivo) */}
        <PaymentsOverviewTile
          paidToday={k.paymentsPaidToday}
          paidTodayAmount={k.paymentsPaidTodayAmount}
          pendingCount={k.paymentsPendingCount}
          pendingAmount={k.paymentsPendingAmount}
          expiredCount={k.paymentsExpiredCount}
        />
      </div>
    </main>
  );
}
