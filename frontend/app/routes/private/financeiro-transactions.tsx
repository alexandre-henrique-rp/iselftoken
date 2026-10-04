import type { Route } from "./+types/financeiro-transactions";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  CheckCircle2,
  Filter,
  Loader2,
  MoreVertical,
  Search,
  XCircle,
} from "lucide-react";
import { ApprovePaymentModal } from "~/components/financeiro/ApprovePaymentModal";
import { CancelModal } from "~/components/financeiro/CancelModal";
import {
  useAdminFinanceiroTransactionsQuery,
  type TransactionRow,
} from "~/hooks/use-admin-financeiro-transactions";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Financeiro Transactions | iSelfToken" },
    {
      name: "description",
      content:
        "Lista de transações da plataforma para aprovação manual e fechamento de caixa.",
    },
  ];
}

const PAGE_SIZE = 25;

function formatBRL(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(num) ? num : 0);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CANCELED: "bg-red-500/10 text-red-400 border-red-500/20",
  REFUNDED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function FinanceiroTransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openActionId, setOpenActionId] = useState<number | null>(null);
  const [approveTarget, setApproveTarget] = useState<TransactionRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<
    | { kind: "payment"; row: TransactionRow }
    | { kind: "subscription"; row: TransactionRow }
    | null
  >(null);

  const page = Number(searchParams.get("page") ?? "1");
  const status = searchParams.get("status") ?? "";
  const method = searchParams.get("method") ?? "";
  const purpose = searchParams.get("purpose") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const search = searchParams.get("search") ?? "";

  const { data, isLoading, error, refetch } = useAdminFinanceiroTransactionsQuery({
    page,
    status,
    method,
    purpose,
    dateFrom,
    dateTo,
    search,
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next);
  };

  const goToPage = (target: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(target));
    setSearchParams(next);
  };

  const handleAction = (
    row: TransactionRow,
    action: "approve" | "cancel-payment" | "cancel-sub",
  ) => {
    setOpenActionId(null);
    if (action === "approve") {
      setApproveTarget(row);
      return;
    }
    if (action === "cancel-payment") {
      setCancelTarget({ kind: "payment", row });
      return;
    }
    if (action === "cancel-sub") {
      if (!row.subscription) {
        toast.error("Sem assinatura associada a este pagamento.");
        return;
      }
      setCancelTarget({ kind: "subscription", row });
    }
  };

  return (
    <div className="relative max-w-[1600px] mx-auto space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-baseline gap-6">
        <div>
          <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">
            Financeiro
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-none">
            Transações
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {total > 0
              ? `${total} transação${total === 1 ? "" : "ões"} no filtro atual`
              : "Sem transações no filtro atual"}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-3 items-center p-4 rounded-xl bg-accent/20 border border-border/20">
        <Filter className="w-4 h-4 text-muted-foreground" />

        <select
          value={status}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="bg-accent border-0 rounded-lg px-3 py-2 text-sm text-foreground"
        >
          <option value="">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="PAID">Pago</option>
          <option value="CANCELED">Cancelado</option>
          <option value="REFUNDED">Reembolsado</option>
        </select>

        <select
          value={method}
          onChange={(e) => updateFilter("method", e.target.value)}
          className="bg-accent border-0 rounded-lg px-3 py-2 text-sm text-foreground"
        >
          <option value="">Todos os métodos</option>
          <option value="PIX">PIX</option>
          <option value="CREDIT_CARD">Cartão</option>
        </select>

        <select
          value={purpose}
          onChange={(e) => updateFilter("purpose", e.target.value)}
          className="bg-accent border-0 rounded-lg px-3 py-2 text-sm text-foreground"
        >
          <option value="">Todos os propósitos</option>
          <option value="SUBSCRIPTION">Assinatura</option>
          <option value="INVESTMENT">Investimento</option>
          <option value="TOKEN_RESERVATION">Reserva de Tokens</option>
          <option value="EARLY_ACCESS">Acesso antecipado</option>
          <option value="P2P_BUY">Compra P2P</option>
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => updateFilter("dateFrom", e.target.value)}
          className="bg-accent border-0 rounded-lg px-3 py-2 text-sm text-foreground"
          aria-label="Data inicial"
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => updateFilter("dateTo", e.target.value)}
          className="bg-accent border-0 rounded-lg px-3 py-2 text-sm text-foreground"
          aria-label="Data final"
        />

        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => updateFilter("search", e.target.value)}
            placeholder="Buscar por email, nome ou txid…"
            className="w-full bg-accent border-0 rounded-lg pl-10 pr-3 py-2 text-sm text-foreground"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-10 text-center space-y-3">
          <XCircle className="w-10 h-10 mx-auto text-destructive" />
          <p className="font-bold">{error.message}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-accent/10 border border-border/20">
          <h3 className="text-xl font-bold text-foreground mb-2">Nenhuma transação</h3>
          <p className="text-muted-foreground text-sm">
            Ajuste os filtros ou aguarde compras serem feitas na plataforma.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-accent/40 text-left">
                <th className="p-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">
                  ID
                </th>
                <th className="p-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">
                  Data
                </th>
                <th className="p-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">
                  Usuário
                </th>
                <th className="p-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">
                  Plano
                </th>
                <th className="p-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">
                  Propósito
                </th>
                <th className="p-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">
                  Método
                </th>
                <th className="p-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">
                  Status
                </th>
                <th className="p-4 font-bold text-muted-foreground uppercase text-xs tracking-wider text-right">
                  Valor
                </th>
                <th className="p-4 font-bold text-muted-foreground uppercase text-xs tracking-wider text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const statusClass = STATUS_STYLES[row.status] ?? STATUS_STYLES.PENDING;
                const isOpen = openActionId === row.id;
                return (
                  <tr
                    key={row.id}
                    className="border-t border-border/10 hover:bg-accent/20 transition-colors"
                  >
                    <td className="p-4 font-mono text-xs text-muted-foreground">
                      #{row.id}
                    </td>
                    <td className="p-4">{formatDate(row.createdAt)}</td>
                    <td className="p-4">
                      <div className="font-bold">{row.user.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.user.email}
                      </div>
                    </td>
                    <td className="p-4">{row.subscription?.plan.nome ?? "—"}</td>
                    <td className="p-4 text-xs">{row.purpose}</td>
                    <td className="p-4">{row.method}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusClass}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold">
                      {formatBRL(row.amount)}
                    </td>
                    <td className="p-4 text-right relative">
                      <button
                        type="button"
                        onClick={() => setOpenActionId(isOpen ? null : row.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent/40"
                        aria-label="Ações"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {isOpen && (
                        <div className="absolute right-4 top-12 z-10 w-52 rounded-xl border border-border/30 bg-card shadow-2xl py-1 text-left">
                          {row.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => handleAction(row, "approve")}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-accent/40 flex items-center gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              Aprovar manualmente
                            </button>
                          )}
                          {row.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => handleAction(row, "cancel-payment")}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-accent/40 flex items-center gap-2"
                            >
                              <XCircle className="w-4 h-4 text-red-500" />
                              Cancelar pagamento
                            </button>
                          )}
                          {row.subscription && (
                            <button
                              type="button"
                              onClick={() => handleAction(row, "cancel-sub")}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-accent/40 flex items-center gap-2"
                            >
                              <XCircle className="w-4 h-4 text-red-500" />
                              Cancelar assinatura
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => goToPage(p)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                p === page
                  ? "bg-primary text-black"
                  : "bg-accent/40 text-muted-foreground hover:bg-accent/60"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {approveTarget && (
        <ApprovePaymentModal
          paymentId={approveTarget.id}
          paymentSummary={{
            user: `${approveTarget.user.nome} (${approveTarget.user.email})`,
            amount: formatBRL(approveTarget.amount),
            purpose: approveTarget.purpose,
          }}
          onClose={() => setApproveTarget(null)}
          onApproved={() => {
            setApproveTarget(null);
            refetch();
          }}
        />
      )}

      {cancelTarget && cancelTarget.kind === "payment" && (
        <CancelModal
          title={`Cancelar Payment #${cancelTarget.row.id}`}
          description={`${cancelTarget.row.user.nome} · ${cancelTarget.row.purpose} · ${formatBRL(cancelTarget.row.amount)} · Atual: ${cancelTarget.row.status}`}
          endpoint={`/api/admin/financeiro/payments/${cancelTarget.row.id}/cancel`}
          onClose={() => setCancelTarget(null)}
          onCanceled={() => {
            setCancelTarget(null);
            refetch();
          }}
        />
      )}

      {cancelTarget && cancelTarget.kind === "subscription" && cancelTarget.row.subscription && (
        <CancelModal
          title={`Cancelar Assinatura #${cancelTarget.row.subscription.id}`}
          description={`${cancelTarget.row.user.nome} · Plano ${cancelTarget.row.subscription.plan.nome} · Acesso revogado imediatamente`}
          endpoint={`/api/admin/financeiro/subscriptions/${cancelTarget.row.subscription.id}/cancel`}
          onClose={() => setCancelTarget(null)}
          onCanceled={() => {
            setCancelTarget(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
