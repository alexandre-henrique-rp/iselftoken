/**
 * User Statement — Extrato financeiro (investidor)
 * Rota: /user/statement
 *
 * Consome GET /wallet/transactions (paginado + filtro por tipo), mesma fonte
 * real usada pelo extrato de /wallet. Sem dados mockados.
 */

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useSearchParams } from "react-router";
import { EditorialWalletShell } from "~/components/wallet/editorial-wallet-shell";
import {
  WalletTransactionStatement,
  type StatementColumn,
} from "~/components/wallet/wallet-transaction-statement";
import { BACKEND_URL } from "~/lib/api-config";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/user.statement";

export function meta() {
  return [
    { title: "Extrato | iSelfToken" },
    { name: "description", content: "Extrato financeiro completo." },
  ];
}

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface TransactionsPage {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const cookie = request.headers.get("cookie") || "";
  const url = new URL(request.url);
  const txType = url.searchParams.get("type") || "ALL";
  const txPage = url.searchParams.get("txPage") || "1";

  let transactions: TransactionsPage = {
    data: [],
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false,
  };

  try {
    const res = await fetch(
      `${BACKEND_URL}/wallet/transactions?type=${txType}&page=${txPage}&limit=20`,
      { headers: { accept: "application/json", cookie } },
    );
    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (json && !json.error && json.data) transactions = json.data;
    }
  } catch {
    // Degradação graciosa: mantém página vazia em falha de rede.
  }

  return { transactions };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

const TYPE_LABELS: Record<string, { label: string; direction: "in" | "out" }> =
  {
    DEPOSIT: { label: "Depósito PIX", direction: "in" },
    WITHDRAWAL: { label: "Saque", direction: "out" },
    INVESTMENT: { label: "Investimento", direction: "out" },
    SUBSCRIPTION: { label: "Pagamento de Plano", direction: "out" },
    CAMPAIGN_SETTLEMENT: { label: "Recebimento de Captação", direction: "in" },
    DIVIDEND_EXIT: { label: "EXIT / Dividendo", direction: "in" },
    P2P_SALES: { label: "Venda P2P", direction: "in" },
    P2P_PURCHASE: { label: "Compra P2P", direction: "out" },
    AFFILIATE_COMMISSION: { label: "Comissão de Afiliado", direction: "in" },
  };

const FILTERS = [
  { value: "ALL", label: "Todos" },
  { value: "DEPOSIT", label: "Depósitos" },
  { value: "WITHDRAWAL", label: "Saques" },
  { value: "INVESTMENT", label: "Investimentos" },
  { value: "AFFILIATE_COMMISSION", label: "Comissões" },
  { value: "DIVIDEND_EXIT", label: "EXIT" },
];

// ─── Componente ─────────────────────────────────────────────────────────────

export default function UserStatementPage({
  loaderData,
}: Route.ComponentProps) {
  const { transactions } = loaderData;
  const [sp, setSp] = useSearchParams();
  const currentType = sp.get("type") || "ALL";
  const currentTxPage = parseInt(sp.get("txPage") || "1", 10);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(sp);
    next.set(key, value);
    if (key === "type") next.delete("txPage");
    setSp(next);
  };

  return (
    <EditorialWalletShell
      eyebrow="Extrato"
      title="Extrato Financeiro"
      description="Histórico completo de movimentações da sua conta."
      watermark="EXTRATO"
    >
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter("type", f.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors",
              currentType === f.value
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-white/[0.02] text-on-surface-variant border-white/5 hover:border-white/20",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <WalletTransactionStatement<Transaction>
        title=""
        items={transactions.data}
        keyOf={(tx) => tx.id}
        emptyMessage="Nenhuma transação encontrada."
        columns={
          [
            {
              label: "Data e Hora",
              align: "left",
              render: (tx: Transaction) => {
                const d = new Date(tx.createdAt);
                return (
                  <div>
                    <span className="block text-on-surface font-medium">
                      {d.toLocaleDateString("pt-BR")}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {d.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              },
            },
            {
              label: "Descrição",
              align: "left",
              render: (tx: Transaction) => {
                const meta = TYPE_LABELS[tx.type] ?? {
                  label: tx.type,
                  direction: "out" as const,
                };
                return (
                  <div>
                    <p className="text-xs font-bold text-on-surface">
                      {meta.label}
                    </p>
                    <p className="text-[10px] text-on-surface-variant truncate max-w-xs">
                      {tx.description}
                    </p>
                  </div>
                );
              },
            },
            {
              label: "Valor",
              align: "right",
              render: (tx: Transaction) => {
                const meta = TYPE_LABELS[tx.type] ?? {
                  direction: "out" as const,
                };
                const isIn = meta.direction === "in";
                return (
                  <span
                    className={cn(
                      "font-bold",
                      isIn ? "text-emerald-400" : "text-on-surface",
                    )}
                  >
                    {isIn ? "+" : "−"}
                    {formatBRL(Math.abs(tx.amount))}
                  </span>
                );
              },
            },
            {
              label: "Direção",
              align: "center",
              render: (tx: Transaction) => {
                const meta = TYPE_LABELS[tx.type] ?? {
                  direction: "out" as const,
                };
                const isIn = meta.direction === "in";
                return (
                  <div
                    className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-lg",
                      isIn ? "bg-emerald-500/10" : "bg-amber-500/10",
                    )}
                  >
                    {isIn ? (
                      <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                );
              },
            },
          ] as StatementColumn<Transaction>[]
        }
        pagination={{
          page: currentTxPage,
          totalPages: transactions.hasMore ? currentTxPage + 1 : currentTxPage,
          total: transactions.total,
          limit: transactions.limit,
          onPageChange: (p) => setFilter("txPage", String(p)),
        }}
      />
    </EditorialWalletShell>
  );
}
