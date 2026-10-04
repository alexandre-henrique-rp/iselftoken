/**
 * PendingPaymentsCard
 *
 * Widget do `/founder/dashboard` que lista as cobranças em aberto do founder
 * (Payments com `status === PENDING`). Aparece no topo do dashboard quando
 * há pelo menos 1 cobrança pendente; some quando todas estão pagas/canceladas.
 *
 * Cada item mostra:
 *   - Label do `purpose` (TOKEN_RESERVATION, COMPLIANCE_FEE, ...) + descrição curta
 *   - Valor em BRL
 *   - Data de criação
 *   - CTA "Pagar agora" → navega para o checkout do Payment
 *
 * Estado vazio: nada renderiza (deixa o dashboard respirar). Não confundir com
 * "nenhuma cobrança no sistema" — o founder pode simplesmente estar com tudo em
 * dia, e o dashboard não precisa anunciar isso.
 */

import { ArrowRight, CreditCard, Loader2, Receipt } from "lucide-react";
import { Link } from "react-router";

import {
  getPaymentPurposeLabel,
  useFounderPendingPayments,
  type FounderPayment,
} from "~/hooks/use-founder-pending-payments";
import { cn } from "~/lib/utils";

function formatBRL(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function PaymentRow({ payment }: { payment: FounderPayment }) {
  const label = getPaymentPurposeLabel(payment.purpose);
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5",
        "p-3 md:flex-row md:items-center md:justify-between md:gap-4",
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <Receipt className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-foreground truncate">
            {label.title}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {label.description}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
            Criada em {formatDate(payment.createdAt)} · {payment.method}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 md:justify-end">
        <span className="font-mono text-base font-bold text-amber-300">
          {formatBRL(payment.amount)}
        </span>
        <Link
          to={`/checkout/payment/${payment.id}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-primary/40",
            "bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider",
            "text-primary hover:bg-primary/20 transition-colors",
          )}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Pagar agora
        </Link>
      </div>
    </li>
  );
}

export function PendingPaymentsCard() {
  const { data, isLoading, isError } = useFounderPendingPayments();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Carregando cobranças em aberto"
        className="rounded-xl border border-border bg-card/60 p-4 flex items-center gap-3 text-sm text-muted-foreground"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando cobranças em aberto…
      </div>
    );
  }

  if (isError || !data || data.length === 0) {
    // Estado limpo: founder em dia. Não renderiza nada para não poluir.
    return null;
  }

  return (
    <section
      aria-label="Cobranças em aberto"
      className={cn(
        "rounded-2xl border border-amber-500/30 bg-gradient-to-br",
        "from-amber-500/10 via-amber-500/5 to-transparent p-4 md:p-5",
      )}
      data-testid="pending-payments-card"
    >
      <header className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400">
            Cobranças em aberto
          </span>
          <p className="text-xs text-muted-foreground">
            Você tem {data.length} cobrança{data.length === 1 ? "" : "s"} pendente
            {data.length === 1 ? "" : "s"}. Quite agora para liberar a próxima etapa.
          </p>
        </div>
        <Link
          to={`/checkout/payment/${data[0].id}`}
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg",
            "border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-bold",
            "uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-500/25",
          )}
          data-testid="pending-payments-cta"
        >
          Ir para cobrança
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>
      <ul className="space-y-2">
        {data.map((p) => (
          <PaymentRow key={p.id} payment={p} />
        ))}
      </ul>
    </section>
  );
}
