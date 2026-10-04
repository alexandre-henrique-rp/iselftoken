import { CheckCircle2, Clock, Lock, XCircle } from "lucide-react";
import { formatBRLCompactWithCents } from "~/lib/currency-format";
import type { PhaseGate, PhasePayment } from "~/lib/queries";
import { cn } from "~/lib/utils";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const GATE_LABEL: Record<string, string> = {
  TOKEN_RESERVATION: "Reserva do token",
  COMPLIANCE_FEE: "Taxa de Compliance",
  FAST_DEPLOY: "Publicação Rápida (Fast Deploy)",
  ALL_PAID: "Todos os pagamentos",
};

const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  PAID: { label: "Pago", className: "bg-primary/10 text-primary border-primary/20" },
  PENDING: {
    label: "Pendente",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  EXPIRED: {
    label: "Expirado",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  CANCELED: {
    label: "Cancelado",
    className: "bg-white/5 text-muted-foreground border-white/10",
  },
  REFUNDED: {
    label: "Estornado",
    className: "bg-white/5 text-muted-foreground border-white/10",
  },
};

interface PaymentReceiptProps {
  gate?: PhaseGate;
}

/**
 * Bloco individual de comprovante (1 Payment). S18.6 — um checkout
 * consolidado (ex.: COMPLIANCE_FEE + FAST_DEPLOY) gera 2 Payments irmãos;
 * o PhaseGate.payments[] lista todos para renderização lado a lado.
 */
function PaymentItem({ item }: { item: PhasePayment }) {
  const badge = STATUS_BADGE[item.status];
  const label = GATE_LABEL[item.purpose] ?? item.purpose;

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {item.createdAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Criada em {dateFmt.format(new Date(item.createdAt))}
            </p>
          )}
          {item.paidAt && (
            <p className="mt-0.5 text-xs text-primary">
              Paga em {dateFmt.format(new Date(item.paidAt))}
            </p>
          )}
          {!item.paidAt && item.status === "PENDING" && (
            <p className="mt-0.5 text-xs text-warning">
              Aguardando pagamento
            </p>
          )}
        </div>
        {badge && (
          <span
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        )}
      </div>

      {/* Breakdown financeiro: valor original, desconto (se houver) e valor
          pago. Só renderiza quando há algum valor disponível. */}
      {item.originalAmount != null && (
        <dl className="mt-4 space-y-2 border-t border-white/10 pt-3">
          <div className="flex items-center justify-between text-xs">
            <dt className="text-muted-foreground">Valor original</dt>
            <dd className="font-mono font-semibold text-foreground">
              {formatBRLCompactWithCents(item.originalAmount)}
            </dd>
          </div>
          {item.discountAmount != null && item.discountAmount > 0 && (
            <div className="flex items-center justify-between text-xs">
              <dt className="text-muted-foreground">Desconto</dt>
              <dd className="font-mono font-semibold text-primary">
                − {formatBRLCompactWithCents(item.discountAmount)}
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <dt className="font-semibold text-foreground">Valor pago</dt>
            <dd className="font-mono font-bold text-foreground">
              {formatBRLCompactWithCents(item.paidAmount)}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}

/**
 * PaymentReceipt — comprovante/gate de pagamento da fase (design §2.1).
 * Renderiza TODOS os Payments do checkout consolidado (ex.: COMPLIANCE_FEE
 * + FAST_DEPLOY) como blocos independentes + banner de gate baseado no
 * primary (COMPLIANCE_FEE).
 */
export function PaymentReceipt({ gate }: PaymentReceiptProps) {
  if (!gate) {
    return (
      <section className="rounded-3xl border border-white/10 bg-card p-4 sm:p-5">
        <div className="h-4 w-40 animate-pulse rounded bg-white/5" />
        <div className="mt-4 h-16 animate-pulse rounded-xl bg-white/5" />
      </section>
    );
  }

  // S18.6 — array `payments` (novo contrato) tem prioridade sobre os campos
  // legados espelhados do primary. Fallback para consumers legados.
  const items: PhasePayment[] =
    gate.payments && gate.payments.length > 0
      ? gate.payments
      : gate.originalAmount != null ||
          gate.discountAmount != null ||
          gate.paidAmount != null ||
          gate.status
        ? [
            {
              purpose: gate.gate,
              status: gate.status ?? "PENDING",
              paidAt: gate.paidAt,
              createdAt: gate.createdAt ?? new Date().toISOString(),
              originalAmount: gate.originalAmount ?? null,
              discountAmount: gate.discountAmount ?? null,
              paidAmount: gate.paidAmount ?? null,
            },
          ]
        : [];

  const gateLabel = GATE_LABEL[gate.gate] ?? gate.gate;

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-foreground">
          Comprovante de pagamento
        </h2>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground">
          Não há cobrança de{" "}
          <span className="font-semibold text-foreground">{gateLabel}</span>{" "}
          para esta fase — gate considerado atendido.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <PaymentItem key={`${item.purpose}-${item.createdAt}`} item={item} />
          ))}
        </div>
      )}

      {/* Gate visual (design §2.2) */}
      {gate.unlocked ? (
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Pagamento confirmado — a próxima etapa é liberada automaticamente.
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs text-warning">
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          {gate.reason ?? "Aguardando confirmação do pagamento."}
        </div>
      )}
    </section>
  );
}

export { CheckCircle2, Clock, XCircle };
