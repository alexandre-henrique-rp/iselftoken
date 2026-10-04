/**
 * User Payments — Histórico de pagamentos (investidor)
 * Rota: /user/payments
 *
 * Consome GET /api/payment (BFF → backend GET /payment), que retorna apenas
 * os pagamentos do usuário logado (filtro por userId aplicado no backend).
 */

import { NoPaymentsEmpty } from "~/components/ui/empty-states";
import { RegeneratePaymentButton } from "~/components/founder/regenerate-payment-button";
import { BACKEND_URL } from "~/lib/api-config";
import type { Route } from "./+types/user.payments";

export function meta() {
  return [
    { title: "Meus Pagamentos | iSelfToken" },
    { name: "description", content: "Histórico de pagamentos e aquisições." },
  ];
}

// ─── Tipos ──────────────────────────────────────────────────────────────────

type PaymentStatus = "PENDING" | "PAID" | "CANCELED" | "FAILED" | "REFUNDED";

interface Payment {
  id: number;
  amount: number;
  method: string;
  purpose: string;
  status: PaymentStatus | string;
  createdAt: string;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const cookie = request.headers.get("cookie") || "";

  let payments: Payment[] = [];
  try {
    const res = await fetch(`${BACKEND_URL}/payment`, {
      headers: { accept: "application/json", cookie },
    });
    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (json && !json.error && Array.isArray(json.data)) {
        payments = json.data;
      }
    }
  } catch {
    // Degradação graciosa: em falha de rede, mostra estado vazio.
    payments = [];
  }

  return { payments };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

const PURPOSE_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Assinatura de Plano",
  INVESTMENT: "Investimento",
  TOKEN_RESERVATION: "Reserva de Tokens",
  EARLY_ACCESS: "Early Access",
  P2P_BUY: "Compra P2P",
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  PAID: { label: "Pago", className: "text-success" },
  PENDING: { label: "Pendente", className: "text-warning" },
  CANCELED: { label: "Cancelado", className: "text-danger" },
  FAILED: { label: "Falhou", className: "text-danger" },
  EXPIRED: { label: "Expirado", className: "text-danger" },
  REFUNDED: { label: "Estornado", className: "text-on-surface-variant" },
};

function isPix(method: string): boolean {
  return method?.toUpperCase() === "PIX";
}

// ─── Componente ─────────────────────────────────────────────────────────────

export default function UserPaymentsPage({ loaderData }: Route.ComponentProps) {
  const { payments } = loaderData;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <nav
            className="flex items-center gap-2 text-sm text-on-surface-variant mb-2"
            aria-label="Breadcrumb"
          >
            <span>Meu Painel</span>
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="text-on-surface font-medium">Pagamentos</span>
          </nav>
          <h1 className="text-display-sm font-black text-on-surface">
            Meus Pagamentos
          </h1>
        </header>

        {payments.length === 0 ? (
          <NoPaymentsEmpty
            title="Nenhum pagamento ainda"
            description="Suas aquisições aparecerão aqui."
            cta={{
              label: "Explorar Startups",
              onClick: () => (window.location.href = "/home"),
            }}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {payments.map((payment) => {
              const statusMeta = STATUS_META[
                String(payment.status).toUpperCase()
              ] ?? {
                label: payment.status,
                className: "text-on-surface-variant",
              };
              const purposeLabel =
                PURPOSE_LABELS[payment.purpose] ?? payment.purpose;
              const canRegenerate =
                String(payment.status).toUpperCase() === "EXPIRED" &&
                payment.purpose === "TOKEN_RESERVATION";
              return (
                <li
                  key={payment.id}
                  className="glass-card rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-low flex items-center justify-center">
                      {isPix(payment.method) ? (
                        <svg
                          className="w-5 h-5 text-primary"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <rect x="7" y="7" width="3" height="3" />
                          <rect x="14" y="7" width="3" height="3" />
                          <rect x="7" y="14" width="3" height="3" />
                          <rect x="14" y="14" width="3" height="3" />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 text-primary"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <rect x="1" y="4" width="22" height="16" rx="2" />
                          <line x1="1" y1="10" x2="23" y2="10" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-on-surface">
                        {purposeLabel}
                      </p>
                      <p className="text-xs text-on-surface-dim">
                        {new Date(payment.createdAt).toLocaleDateString(
                          "pt-BR",
                        )}
                        {" · "}
                        {isPix(payment.method) ? "PIX" : "Cartão"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <span
                      className={`text-sm font-semibold ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                    <span className="text-sm font-bold text-on-surface">
                      {formatBRL(Number(payment.amount))}
                    </span>
                    {canRegenerate && (
                      <RegeneratePaymentButton paymentId={payment.id} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
