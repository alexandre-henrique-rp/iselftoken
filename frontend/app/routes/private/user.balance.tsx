/**
 * User Balance — Saldo e wallet (investidor)
 * Rota: /user/balance
 *
 * Consome GET /wallet (saldo/bloqueado) e GET /investments (tokens agregados),
 * mesmas fontes reais usadas por /wallet. Sem dados mockados.
 */

import { Link } from "react-router";
import { NoItemsEmpty } from "~/components/ui/empty-states";
import { EditorialWalletShell } from "~/components/wallet/editorial-wallet-shell";
import { WalletBentoStats } from "~/components/wallet/wallet-bento-stats";
import { BACKEND_URL } from "~/lib/api-config";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/user.balance";

export function meta() {
  return [
    { title: "Saldo | iSelfToken" },
    { name: "description", content: "Saldo e wallet." },
  ];
}

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface WalletData {
  id: number;
  balance: number;
  blocked: number;
  currency: string;
}

interface InvestmentItem {
  id: number;
  startupId: number;
  tokensQty: number;
  amount: number;
  status: string;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const cookie = request.headers.get("cookie") || "";

  const [walletRes, investmentsRes] = await Promise.all([
    fetch(`${BACKEND_URL}/wallet`, { headers: { cookie } }),
    fetch(`${BACKEND_URL}/investments`, { headers: { cookie } }),
  ]);

  let wallet: WalletData | null = null;
  let investments: InvestmentItem[] = [];

  if (walletRes.ok) {
    const wJson = await walletRes.json().catch(() => null);
    if (wJson && !wJson.error) wallet = wJson.data;
  }

  if (investmentsRes.ok) {
    const iJson = await investmentsRes.json().catch(() => null);
    if (iJson && !iJson.error && Array.isArray(iJson.data)) {
      investments = iJson.data;
    }
  }

  // O backend não retorna tokenStats agregado — derivamos dos investimentos
  // confirmados (mesma regra aplicada em /wallet).
  const confirmed = investments.filter(
    (inv) => inv.status !== "CANCELED" && inv.status !== "PENDING",
  );
  const totalTokens = confirmed.reduce(
    (sum, inv) => sum + (inv.tokensQty ?? 0),
    0,
  );
  const totalValue = confirmed.reduce(
    (sum, inv) => sum + Number(inv.amount ?? 0),
    0,
  );
  const startupsCount = new Set(confirmed.map((inv) => inv.startupId)).size;

  return {
    wallet,
    tokenStats: { total: totalTokens, totalValue, startupsCount },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

function formatTokenAmount(n: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);
}

// ─── Componente ─────────────────────────────────────────────────────────────

export default function UserBalancePage({ loaderData }: Route.ComponentProps) {
  const { wallet, tokenStats } = loaderData;

  if (!wallet) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-display-sm font-black text-on-surface">
              Minha Carteira
            </h1>
          </header>
          <NoItemsEmpty
            title="Carteira vazia"
            description="Seu saldo e transações aparecerão aqui."
            cta={{
              label: "Ver Startups",
              onClick: () => (window.location.href = "/home"),
            }}
          />
        </div>
      </div>
    );
  }

  const canWithdraw = wallet.balance > 0;

  return (
    <EditorialWalletShell
      eyebrow="Saldo"
      title="Minha Carteira"
      description="Saldo disponível, valor bloqueado e visão geral dos seus tokens."
      watermark="SALDO"
    >
      <WalletBentoStats
        layout="hero-left"
        hero={{
          label: "Saldo Disponível",
          value: (
            <>
              {formatBRL(wallet.balance)}{" "}
              <span className="text-primary text-2xl tracking-widest uppercase">
                {wallet.currency || "BRL"}
              </span>
            </>
          ),
          hint:
            wallet.blocked > 0
              ? `${formatBRL(wallet.blocked)} bloqueado em saque`
              : "Pronto para resgate",
          actions: (
            <Link
              to={canWithdraw ? "/wallet/withdraw" : "#"}
              className={cn(
                "w-full py-4 bg-primary text-on-primary-fixed font-black rounded-full uppercase text-xs tracking-widest transition-all duration-300 text-center",
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
          ),
        }}
        summary={[
          {
            label: "Tokens",
            value: formatTokenAmount(tokenStats.total),
            tone: "primary",
            hint: "Quantidade total custodiada",
          },
          {
            label: "Valor Investido",
            value: formatBRL(tokenStats.totalValue),
            tone: "sky",
            hint: `${tokenStats.startupsCount} startup${
              tokenStats.startupsCount !== 1 ? "s" : ""
            }`,
          },
          {
            label: "Bloqueado",
            value: formatBRL(wallet.blocked),
            tone: wallet.blocked > 0 ? "amber" : "neutral",
            hint: "Reservado em saques pendentes",
          },
        ]}
      />

      <div className="text-center pt-4">
        <Link
          to="/wallet"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:text-primary-light transition-colors"
        >
          Ver carteira completa
        </Link>
      </div>
    </EditorialWalletShell>
  );
}
