/**
 * /wallet — Minha Carteira (investidor)
 *
 * Layout editorial compartilhado com /wallet/affiliate (carteira do afiliado):
 * 1) Bento Stats — saldo (hero) + tokens + comissões (afiliado)
 * 2) Asset List expandível — cada startup vira uma linha; clique revela os
 *    Token IDs individuais emitidos para o aporte (F1-F4 — wallet-assets).
 * 3) Transaction Statement — extrato completo com filtros
 */

import type { Route } from "./+types/wallet";
import { Link, useRevalidator, useSearchParams } from "react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Handshake,
  RefreshCw,
} from "lucide-react";
import {
  EditorialWalletShell,
} from "~/components/wallet/editorial-wallet-shell";
import { WalletBentoStats } from "~/components/wallet/wallet-bento-stats";
import {
  WalletAssetListEditorial,
} from "~/components/wallet/wallet-asset-list-editorial";
import {
  ExpandableAssetRow,
  type ExpandableAssetRowAsset,
} from "~/components/wallet/expandable-asset-row";
import {
  WalletTransactionStatement,
  type StatementColumn,
} from "~/components/wallet/wallet-transaction-statement";
import { useUser } from "~/hooks/use-user";
import { BACKEND_URL } from "~/lib/api-config";
import { cn } from "~/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface WalletAssetApiToken {
  id: string;
  shortCode: string;
  quantity: number;
  purchaseVal: number;
  currentVal: number;
  acquiredAt: string;
  investmentId: number | null;
}

interface WalletAssetApi {
  investmentId: number;
  startupId: number;
  startupName: string;
  startupSlug: string;
  startupLogoUrl: string | null;
  startupCategory: string | null;
  campaignTitle: string;
  campaignStatus: string;
  tokensCount: number;
  tokens: WalletAssetApiToken[];
  investedAmount: number;
  platformFeeAmount: number | null;
  totalCharged: number;
  currentValue: number;
  investmentStatus: string;
  acquiredAt: string;
}

interface WalletAssetsApiResponse {
  error?: boolean;
  assets: WalletAssetApi[];
  startupsCount: number;
  tokensCount: number;
  averageRoi: number;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface WalletData {
  id: number;
  balance: number;
  blocked: number;
  currency: string;
  transactions?: Transaction[];
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

  const [walletRes, assetsRes] = await Promise.all([
    fetch(`${BACKEND_URL}/wallet`, { headers: { cookie } }),
    fetch(`${BACKEND_URL}/wallet/assets`, { headers: { cookie } }),
  ]);

  let wallet: WalletData | null = null;
  let transactions: TransactionsPage = {
    data: [],
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false,
  };
  let assets: WalletAssetApi[] = [];
  let totalTokens = 0;
  let startupsCount = 0;
  let averageRoi = 0;

  if (walletRes.ok) {
    const wJson = await walletRes.json().catch(() => null);
    if (wJson && !wJson.error) {
      wallet = wJson.data;
      const allTx: Transaction[] = wJson.data?.transactions ?? [];
      const filtered =
        txType === "ALL" ? allTx : allTx.filter((t) => t.type === txType);
      const start = (parseInt(txPage, 10) - 1) * 20;
      const end = start + 20;
      const slice = filtered.slice(start, end);
      transactions = {
        data: slice,
        total: filtered.length,
        page: parseInt(txPage, 10),
        limit: 20,
        hasMore: end < filtered.length,
      };
    }
  }

  if (assetsRes.ok) {
    const aJson = (await assetsRes
      .json()
      .catch(() => null)) as WalletAssetsApiResponse | null;
    if (aJson && !aJson.error && Array.isArray(aJson.assets)) {
      assets = aJson.assets;
      totalTokens = aJson.tokensCount ?? 0;
      startupsCount = aJson.startupsCount ?? 0;
      averageRoi = aJson.averageRoi ?? 0;
    }
  }

  const totalInvested = assets.reduce(
    (sum, a) => sum + Number(a.investedAmount ?? 0),
    0,
  );

  return {
    wallet,
    transactions,
    assets,
    tokenStats: {
      total: totalTokens,
      totalValue: totalInvested,
      averageRoi,
      startupsCount,
    },
  };
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Minha Carteira | iSelfToken" },
    {
      name: "description",
      content:
        "Visao geral do seu portfolio de tokens e creditos disponiveis.",
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

function formatTokenAmount(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(n);
}

function formatTokensWithUnit(n: number): React.ReactNode {
  return (
    <>
      {formatTokenAmount(n)}{" "}
      <span className="text-[10px] text-on-surface-variant font-normal uppercase tracking-widest">
        TKN
      </span>
    </>
  );
}

const TYPE_LABELS: Record<string, { label: string; direction: "in" | "out" }> =
  {
    DEPOSIT: { label: "Deposito PIX", direction: "in" },
    WITHDRAWAL: { label: "Saque", direction: "out" },
    INVESTMENT: { label: "Investimento", direction: "out" },
    SUBSCRIPTION: { label: "Pagamento de Plano", direction: "out" },
    CAMPAIGN_SETTLEMENT: { label: "Recebimento de Captacao", direction: "in" },
    DIVIDEND_EXIT: { label: "EXIT / Dividendo", direction: "in" },
    P2P_SALES: { label: "Venda P2P", direction: "in" },
    P2P_PURCHASE: { label: "Compra P2P", direction: "out" },
    AFFILIATE_COMMISSION: { label: "Comissao de Afiliado", direction: "in" },
  };

const FILTERS = [
  { value: "ALL", label: "Todos" },
  { value: "DEPOSIT", label: "Depositos" },
  { value: "WITHDRAWAL", label: "Saques" },
  { value: "INVESTMENT", label: "Investimentos" },
  { value: "AFFILIATE_COMMISSION", label: "Comissoes" },
  { value: "DIVIDEND_EXIT", label: "EXIT" },
];

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function WalletPage({ loaderData }: Route.ComponentProps) {
  const { wallet, transactions, assets, tokenStats } = loaderData;
  const [sp, setSp] = useSearchParams();
  const currentType = sp.get("type") || "ALL";
  const currentTxPage = parseInt(sp.get("txPage") || "1", 10);
  const { user } = useUser();
  const revalidator = useRevalidator();
  const isRevalidating = revalidator.state === "loading";

  // Detectar se usuario tem plano afiliado ativo
  const hasAffiliatePlan = (user?.subscriptions ?? []).some(
    (sub) => sub.status === "ACTIVE" && sub.plan?.slug === "plano-afiliado",
  );

  // Comissao total de afiliado: soma das transacoes AFFILIATE_COMMISSION
  // carregadas pelo loader. Cobertura limitada a 1 pagina (limit=20) — para
  // valor historico exato, ver /wallet/affiliate.
  const affiliateCommission = transactions.data
    .filter((tx) => tx.type === "AFFILIATE_COMMISSION")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  if (!wallet) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="max-w-5xl mx-auto py-20 text-center">
          <p className="text-on-surface-variant">
            Carteira nao encontrada.
          </p>
          <Link
            to="/home"
            className="text-primary mt-4 inline-block text-sm font-bold"
          >
            Voltar ao marketplace
          </Link>
        </div>
      </main>
    );
  }

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(sp);
    next.set(key, value);
    if (key === "type") next.delete("txPage");
    setSp(next);
  };

  // ─── Bento Stats ───────────────────────────────────────────────────────────
  const canWithdraw = wallet.balance > 0;
  const heroActions = (
    <Link
      to={canWithdraw ? "/wallet/withdraw" : "#"}
      className={cn(
        "w-full py-3 bg-primary text-on-primary-fixed font-black rounded-full uppercase text-[10px] tracking-widest transition-all duration-300 text-center",
        canWithdraw
          ? "hover:scale-105 hover:shadow-[0_0_30px_rgba(213,0,249,0.45)]"
          : "opacity-40 cursor-not-allowed",
      )}
      onClick={(e) => {
        if (!canWithdraw) e.preventDefault();
      }}
    >
      Sacar
    </Link>
  );

  // ─── Header actions (lado direito do titulo em md+) ─────────────────────────
  const headerActions = (
    <button
      type="button"
      onClick={() => revalidator.revalidate()}
      disabled={isRevalidating}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-on-surface-variant text-[10px] font-black uppercase tracking-widest transition-all",
        isRevalidating
          ? "opacity-50 cursor-wait"
          : "hover:border-primary/40 hover:text-primary",
      )}
      aria-label="Atualizar dados da carteira"
    >
      <RefreshCw
        className={cn(
          "w-3.5 h-3.5",
          isRevalidating && "animate-spin",
        )}
      />
      {isRevalidating ? "Atualizando..." : "Atualizar"}
    </button>
  );

  return (
    <EditorialWalletShell
      eyebrow="Carteira"
      title="Minha Carteira"
      description="Visao geral do seu portfolio de tokens, saldo disponivel e extrato de movimentacoes."
      watermark="WALLET"
      headerActions={headerActions}
    >
      <WalletBentoStats
        layout="hero-left"
        hero={{
          label: "Saldo Disponivel",
          value: (
            <>
              {formatBRL(wallet.balance)}{" "}
              <span className="text-primary text-2xl tracking-widest uppercase">
                BRL
              </span>
            </>
          ),
          hint:
            wallet.blocked > 0
              ? `${formatBRL(wallet.blocked)} bloqueado · inclui valores restaurados de campanhas com erro`
              : "Inclui valores restaurados de campanhas com erro. Pronto para saque ou novo investimento.",
          actions: heroActions,
        }}
        summary={[
          {
            label: "Tokens",
            value: formatTokenAmount(tokenStats.total),
            tone: "primary",
            hint: `${tokenStats.startupsCount} startup${tokenStats.startupsCount !== 1 ? "s" : ""} custodiando`,
          },
          ...(hasAffiliatePlan
            ? [
                {
                  label: "Comissoes",
                  value: formatBRL(affiliateCommission),
                  tone: "amber" as const,
                  hint: "Comissoes de afiliado recebidas",
                  actions: (
                    <Link
                      to="/wallet/affiliate"
                      className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 transition-all text-[10px] font-black uppercase tracking-widest"
                      aria-label="Abrir carteira de afiliado"
                    >
                      <Handshake className="w-3 h-3" />
                      Carteira de Afiliado
                    </Link>
                  ),
                },
              ]
            : []),
        ]}
      />

      {/* ─── Asset List (lista editorial com expansao de tokens) ──────────────
          Matriz de breakpoints (decisao 2026-09-06):
          - < xl: 1-col stack (Ativos em cima, Extrato embaixo).
          - xl+: grid-cols-2 lado a lado. */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8 md:mb-10">
        <div className="xl:col-span-2">
          <WalletAssetListEditorial<ExpandableAssetRowAsset>
            title="Ativos em Carteira"
            columns={[
              { label: "Nome do Ativo" },
              { label: "Quantidade", className: "text-right" },
              { label: "Valor (BRL)", className: "text-right" },
            ]}
            items={assets as unknown as ExpandableAssetRowAsset[]}
            keyOf={(item) => item.investmentId}
            emptyMessage="Voce ainda nao possui tokens. Explore o marketplace para comecar."
            renderItem={(asset, idx) => (
              <ExpandableAssetRow
                asset={asset}
                indexLabel={`#${String(idx + 1).padStart(3, "0")}`}
                actions={
                  <Link
                    to={`/founder/startups/${asset.startupId}/transparencia`}
                    title="Pagina de Transparencia desta startup"
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-on-primary-fixed transition-all duration-300"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </Link>
                }
              />
            )}
          />
        </div>

        {/* ─── Transaction Statement ─────────────────────────────────────────── */}
        <section className="mb-0 xl:col-span-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">
              Extrato de Transacoes
            </h2>
          </div>

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
            emptyMessage="Nenhuma transacao encontrada."
            compact
            columns={[
              {
                label: "Data e Hora",
                align: "left",
                render: (tx) => {
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
                label: "Descricao",
                align: "left",
                render: (tx) => {
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
                render: (tx) => {
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
                label: "Direcao",
                align: "center",
                render: (tx) => {
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
            ] as StatementColumn<Transaction>[]}
            pagination={{
              page: currentTxPage,
              totalPages: transactions.hasMore ? currentTxPage + 1 : currentTxPage,
              total: transactions.total,
              limit: transactions.limit,
              onPageChange: (p) => setFilter("txPage", String(p)),
            }}
          />
        </section>
      </div>
    </EditorialWalletShell>
  );
}