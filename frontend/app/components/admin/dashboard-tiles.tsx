import {
  AlertOctagon,
  Check,
  Clock,
  CreditCard,
  Loader2,
  Minus,
  Receipt,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { Form, Link, useNavigation } from "react-router";
import { Sparkline } from "~/components/admin/sparkline";
import { formatBRLCompact } from "~/lib/currency-format";
import type { AdminPendingRedemption } from "~/lib/queries";
import { cn } from "~/lib/utils";

interface HeroTileProps {
  label: string;
  /** Valor principal (já formatado). */
  value: string;
  /** Delta vs período anterior. Null = sem baseline. */
  deltaPct: number | null;
  /** Subcopy curta abaixo do valor (1 linha). Ex.: "Volume de investimentos". */
  detail?: string;
  /** Descrição longa explicando o que o KPI representa (1-2 linhas). */
  description?: string;
  /** Sparkline (pontos mensais). */
  sparkline?: number[];
  /** Período exibido abaixo do gráfico. */
  sparklinePeriod?: string;
}

/**
 * Hero tile (60% width). 1 número hero + delta + sparkline.
 * Componente principal do Tile Mosaic — primeira coisa que o olho vê.
 */
export function HeroTile({
  label,
  value,
  deltaPct,
  detail,
  description,
  sparkline,
  sparklinePeriod = "Últimos 12 meses",
}: HeroTileProps) {
  const hasDelta = deltaPct !== null && deltaPct !== 0;
  const isPositive = (deltaPct ?? 0) > 0;
  const isNegative = (deltaPct ?? 0) < 0;

  return (
    <div className="relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/85 to-card/60 p-4 shadow-lg sm:p-5 lg:min-h-[280px] lg:p-6">
      <div className="space-y-3">
        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">
          {label}
        </span>
        <div className="flex items-baseline gap-4 flex-wrap">
          <span className="text-4xl font-black leading-none tracking-tighter text-foreground sm:text-5xl">
            {value}
          </span>
          {hasDelta && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border",
                isPositive && "text-primary bg-primary/10 border-primary/20",
                isNegative &&
                  "text-destructive bg-destructive/10 border-destructive/20",
              )}
              aria-label={
                isPositive
                  ? `Aumento de ${deltaPct}%`
                  : `Queda de ${Math.abs(deltaPct ?? 0)}%`
              }
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3" aria-hidden />
              ) : (
                <TrendingDown className="w-3 h-3" aria-hidden />
              )}
              {deltaPct! > 0 ? "+" : ""}
              {deltaPct}%
            </span>
          )}
          {deltaPct === 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border text-muted-foreground bg-accent/30 border-white/5">
              <Minus className="w-3 h-3" aria-hidden />
              0%
            </span>
          )}
        </div>
        {detail && (
          <p className="text-sm font-semibold text-foreground/90 mt-1">
            {detail}
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground/80 leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {sparkline && sparkline.length >= 2 && (
        <div className="mt-3">
          <Sparkline
            data={sparkline}
            ariaLabel={`Tendência de ${label.toLowerCase()} nos últimos 12 meses`}
            height={40}
          />
          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest mt-2">
            {sparklinePeriod}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Secondary tile (4 tiles em grid 2x2 ou 1x4). KPI compacto + sparkline + delta inline.
 */
interface SecondaryTileProps {
  label: string;
  value: string;
  /** Linha curta abaixo do valor (ex.: "32% captação média"). */
  delta?: string;
  /** Descrição longa explicando o que o KPI significa (1-2 linhas). */
  description?: string;
  sparkline?: number[];
  /** Ícone opcional para o canto superior direito. */
  icon?: React.ReactNode;
}

export function SecondaryTile({
  label,
  value,
  delta,
  description,
  sparkline,
  icon,
}: SecondaryTileProps) {
  return (
    <div className="group flex min-h-[156px] flex-col justify-between rounded-3xl border border-white/10 bg-card/80 p-4 shadow-lg transition-all hover:border-primary/20 hover:bg-card">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-tight min-w-0 break-words">
          {label}
        </span>
        {icon && (
          <span className="shrink-0 text-primary/60 group-hover:text-primary transition-colors">
            {icon}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="text-2xl font-black tracking-tighter text-foreground break-words [overflow-wrap:anywhere]">
          {value}
        </div>
        {delta && (
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-tight break-words [overflow-wrap:anywhere]">
            {delta}
          </p>
        )}
        {description && (
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {sparkline && sparkline.length >= 2 && (
        <div className="mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
          <Sparkline
            data={sparkline}
            height={18}
            ariaLabel={`Tendência de ${label.toLowerCase()}`}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Action tile (rodapé do mosaic). Card compacto de fila operacional
 * com número + CTA explícito.
 */
interface ActionTileProps {
  label: string;
  count: number;
  detail: string;
  cta: string;
  href: string;
  /** Cor do accent — magenta para padrão, warning/error para urgências. */
  variant?: "default" | "warning" | "destructive";
}

export function ActionTile({
  label,
  count,
  detail,
  cta,
  href,
  variant = "default",
}: ActionTileProps) {
  const accent =
    variant === "warning"
      ? "border-warning/30"
      : variant === "destructive"
        ? "border-destructive/30"
        : "border-primary/20";

  return (
    <Link
      to={href}
      className={cn(
        "group relative flex h-full min-h-[108px] flex-col justify-between rounded-xl border border-white/10 bg-card/80 p-3 shadow-lg transition-all hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        accent,
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
            {label}
          </span>
          <span
            className={cn(
              "text-3xl font-black tracking-tighter",
              variant === "default" && "text-primary",
              variant === "warning" && "text-warning",
              variant === "destructive" && "text-destructive",
            )}
            aria-label={`${count} ${label.toLowerCase()}`}
          >
            {count}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] mt-auto pt-2",
          variant === "default" && "text-primary",
          variant === "warning" && "text-warning",
          variant === "destructive" && "text-destructive",
        )}
      >
        {cta} <span aria-hidden>→</span>
      </span>
    </Link>
  );
}

interface PendingRedemptionsTileProps {
  items: AdminPendingRedemption[];
  count: number;
  amount: number;
  variant?: "default" | "warning" | "destructive";
}

/**
 * Fila compacta para decisões rápidas. A lista é limitada pelo backend para
 * preservar o custo do resumo; a contagem exibida continua sendo total.
 */
export function PendingRedemptionsTile({
  items,
  count,
  amount,
  variant = "default",
}: PendingRedemptionsTileProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const activeId = navigation.formData?.get("redemptionId");
  const accent =
    variant === "warning"
      ? "border-warning/30"
      : variant === "destructive"
        ? "border-destructive/30"
        : "border-primary/20";

  return (
    <section
      className={cn(
        "relative flex h-full min-h-[108px] flex-col rounded-xl border border-white/10 bg-card/80 p-3 shadow-lg",
        accent,
      )}
      aria-labelledby="pending-redemptions-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="pending-redemptions-title"
            className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]"
          >
            Saques pendentes
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            {count === 0
              ? "Nenhum resgate aguardando"
              : `${formatBRLCompact(amount)} aguardando aprovação`}
          </p>
        </div>
        <span
          className={cn(
            "text-3xl font-black tracking-tighter",
            variant === "default" && "text-primary",
            variant === "warning" && "text-warning",
            variant === "destructive" && "text-destructive",
          )}
          aria-label={`${count} saques pendentes`}
        >
          {count}
        </span>
      </div>

      {items.length > 0 && (
        <ul className="mt-2 space-y-1" aria-label="Saques aguardando decisão">
          {items.slice(0, 2).map((item) => {
            const canDecide = item.status === "REQUESTED";
            const itemSubmitting =
              isSubmitting && String(activeId) === String(item.id);

            return (
              <li
                key={item.id}
                className="flex flex-col gap-1 rounded-xl border border-white/5 bg-accent/20 p-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">
                    {item.startupNome}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatBRLCompact(item.amount)} ·{" "}
                    {item.status === "PROCESSING"
                      ? "Em processamento"
                      : "Aguardando decisão"}
                  </p>
                </div>
                {canDecide ? (
                  <div className="flex shrink-0 gap-2">
                    <Form method="post">
                      <input
                        type="hidden"
                        name="intent"
                        value="approve-redemption"
                      />
                      <input
                        type="hidden"
                        name="redemptionId"
                        value={item.id}
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        title="Aprovar saque"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 text-primary transition hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {itemSubmitting &&
                        navigation.formData?.get("intent") ===
                          "approve-redemption" ? (
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        )}
                        <span className="sr-only">
                          Aprovar saque de {item.startupNome}
                        </span>
                      </button>
                    </Form>
                    <Form method="post">
                      <input
                        type="hidden"
                        name="intent"
                        value="reject-redemption"
                      />
                      <input
                        type="hidden"
                        name="redemptionId"
                        value={item.id}
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        title="Rejeitar saque"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-destructive/30 text-destructive transition hover:bg-destructive hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                      >
                        {itemSubmitting &&
                        navigation.formData?.get("intent") ===
                          "reject-redemption" ? (
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <X className="h-3.5 w-3.5" aria-hidden />
                        )}
                        <span className="sr-only">
                          Rejeitar saque de {item.startupNome}
                        </span>
                      </button>
                    </Form>
                  </div>
                ) : (
                  <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Em processamento
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Link
        to="/financeiro/withdraws"
        className="mt-auto inline-flex items-center pt-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Ver fila completa <span aria-hidden>→</span>
      </Link>
    </section>
  );
}

interface PaymentsOverviewTileProps {
  paidToday: number;
  paidTodayAmount: number;
  pendingCount: number;
  pendingAmount: number;
  expiredCount: number;
}

/**
 * Montador de Ordens e Pagamentos — KPI executivo do fluxo financeiro.
 *
 * 4 celulas: pagos hoje (verde), pendentes (amber), expirados (rose).
 * Clicar leva para /admin/payments com filtros pre-aplicados via query string.
 */
export function PaymentsOverviewTile({
  paidToday,
  paidTodayAmount,
  pendingCount,
  pendingAmount,
  expiredCount,
}: PaymentsOverviewTileProps) {
  const hasUrgent = expiredCount > 0 || pendingCount > 0;

  return (
    <section
      className="relative flex h-full flex-col rounded-xl border border-white/10 bg-card/80 p-4 shadow-lg"
      aria-labelledby="payments-overview-title"
    >
      <header className="flex items-start justify-between gap-2 pb-3 border-b border-white/5">
        <div>
          <span
            id="payments-overview-title"
            className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1.5"
          >
            <CreditCard className="w-3 h-3" aria-hidden />
            Ordens e Pagamentos
          </span>
          <p className="text-[11px] text-muted-foreground mt-1">
            Fluxo financeiro de hoje
          </p>
        </div>
        <Link
          to="/admin/payments"
          className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline"
        >
          Ver tudo <span aria-hidden>→</span>
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 pt-3">
        <PaymentKpi
          to="/admin/payments?status=PAID"
          label="Pagos hoje"
          value={paidToday}
          amount={paidTodayAmount}
          tone="success"
          icon={<Check className="w-3.5 h-3.5" aria-hidden />}
        />
        <PaymentKpi
          to={
            pendingCount > 0
              ? "/admin/payments?status=PENDING"
              : "/admin/payments"
          }
          label="Pendentes"
          value={pendingCount}
          amount={pendingAmount}
          tone={pendingCount > 0 ? "warning" : "muted"}
          icon={<Clock className="w-3.5 h-3.5" aria-hidden />}
        />
        <PaymentKpi
          to={
            expiredCount > 0
              ? "/admin/payments?status=EXPIRED"
              : "/admin/payments"
          }
          label="QRs expirados"
          value={expiredCount}
          amount={null}
          tone={expiredCount > 0 ? "destructive" : "muted"}
          icon={
            expiredCount > 0 ? (
              <AlertOctagon className="w-3.5 h-3.5" aria-hidden />
            ) : (
              <Receipt className="w-3.5 h-3.5" aria-hidden />
            )
          }
          colSpan={2}
        />
      </div>

      {hasUrgent && (
        <p className="mt-3 text-[10px] text-muted-foreground leading-snug">
          {pendingCount > 0 && expiredCount > 0
            ? `${pendingCount} pendente(s) e ${expiredCount} expirado(s) aguardam atenção.`
            : pendingCount > 0
              ? `${pendingCount} pagamento(s) aguardam liquidação (QR Pix emitido).`
              : `${expiredCount} QR code(s) expirado(s) — ação manual necessária.`}
        </p>
      )}
    </section>
  );
}

interface PaymentKpiProps {
  to: string;
  label: string;
  value: number;
  amount: number | null;
  tone: "success" | "warning" | "destructive" | "muted";
  icon: React.ReactNode;
  colSpan?: 1 | 2;
}

function PaymentKpi({
  to,
  label,
  value,
  amount,
  tone,
  icon,
  colSpan = 1,
}: PaymentKpiProps) {
  const valueColor =
    tone === "success"
      ? "text-emerald-400"
      : tone === "warning"
        ? "text-amber-300"
        : tone === "destructive"
          ? "text-rose-400"
          : "text-muted-foreground";

  const labelColor =
    tone === "destructive" ? "text-rose-300" : "text-muted-foreground";

  return (
    <Link
      to={to}
      className={cn(
        "group flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        colSpan === 2 && "col-span-2",
      )}
      aria-label={`${value} ${label}${amount ? ` — ${formatBRLCompact(amount)}` : ""}`}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em]",
          labelColor,
        )}
      >
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "text-2xl font-black tracking-tighter leading-none",
          valueColor,
        )}
      >
        {value}
      </span>
      {amount != null && (
        <span className="text-[10px] text-muted-foreground">
          {formatBRLCompact(amount)}
        </span>
      )}
    </Link>
  );
}
