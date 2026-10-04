/**
 * /wallet/affiliate — Carteira do Afiliado
 *
 * Substitui a pagina "Financeiro" anterior com layout editorial
 * compartilhado com /wallet (investidor):
 * 1) Bento Stats — A Receber (hero) + Ja Pago / A Pagar / Pendente (summary)
 * 2) Asset List — Startups afiliadas ativas (comissao%, investidores, recebido, pendente)
 * 3) Transaction Statement — Comissoes detalhadas com status pill
 */

import type { Route } from "./+types/affiliate-commissions";
import { Link, useRevalidator } from "react-router";
import {
  CheckCircle2,
  Clock,
  Copy,
  RefreshCw,
  Wallet,
  XCircle,
  ExternalLink,
} from "lucide-react";
import {
  EditorialWalletShell,
} from "~/components/wallet/editorial-wallet-shell";
import { WalletBentoStats } from "~/components/wallet/wallet-bento-stats";
import {
  WalletAssetListEditorial,
} from "~/components/wallet/wallet-asset-list-editorial";
import {
  EditorialAssetRow,
  EditorialAssetAvatar,
} from "~/components/wallet/editorial-asset-row";
import {
  WalletTransactionStatement,
  type StatementColumn,
} from "~/components/wallet/wallet-transaction-statement";
import { cn } from "~/lib/utils";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:7077";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type CommissionStatus = "PENDING" | "PAYABLE" | "PAID" | "CANCELED";
type AffiliationStatus =
  | "PENDING_FOUNDER"
  | "PENDING_ADMIN"
  | "ACTIVE"
  | "REJECTED"
  | "SUSPENDED";

interface Commission {
  id: number;
  investmentId: number;
  baseAmount: string | number;
  affiliatePct: string | number;
  affiliateAmount: string | number;
  status: CommissionStatus;
  attributedBy: "LINK" | "CHECKOUT_CODE";
  paidAt: string | null;
  createdAt: string;
  affiliation: { code: string; program: { startup: { id: number; nome: string } } };
}

interface TotalPorStatus {
  status: CommissionStatus;
  total: string | number;
}

interface MyAffiliation {
  id: number;
  status: AffiliationStatus;
  code: string;
  purchaseLinkUrl: string | null;
  tokensAllocated: number | null;
  startup: { id: number; nome: string };
  comissaoPct: string | number;
  investidores: number;
  comissaoRecebida: string | number;
  comissaoPendente: string | number;
  totalComissionado: string | number;
  rejectionReason: string | null;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs): Promise<{
  comissoes: Commission[];
  totais: TotalPorStatus[];
  afiliacoes: MyAffiliation[];
  erro: string | null;
  origin: string;
}> {
  const cookie = request.headers.get("cookie") || "";
  const origin = new URL(request.url).origin;
  try {
    const [commissionsRes, meRes] = await Promise.all([
      fetch(`${BACKEND_URL}/affiliate/me/commissions`, {
        headers: { accept: "application/json", cookie },
      }),
      fetch(`${BACKEND_URL}/affiliate/me`, {
        headers: { accept: "application/json", cookie },
      }),
    ]);

    const cJson = await commissionsRes.json().catch(() => null);
    const mJson = await meRes.json().catch(() => null);

    if (
      (!commissionsRes.ok || cJson?.error) &&
      (!meRes.ok || mJson?.error)
    ) {
      return {
        comissoes: [],
        totais: [],
        afiliacoes: [],
        erro: cJson?.message ?? mJson?.message ?? "Nao foi possivel carregar seu financeiro.",
        origin,
      };
    }

    return {
      comissoes: cJson?.data?.comissoes ?? [],
      totais: cJson?.data?.totaisPorStatus ?? [],
      afiliacoes: mJson?.data ?? [],
      erro: null,
      origin,
    };
  } catch {
    return {
      comissoes: [],
      totais: [],
      afiliacoes: [],
      erro: "Erro de conexao.",
      origin,
    };
  }
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Carteira do Afiliado | iSelfToken" },
    {
      name: "description",
      content:
        "Suas transacoes e pendencias financeiras como afiliado: comissoes apuradas sobre cada investimento atribuido as suas indicacoes.",
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const brl = (v: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v || 0),
  );

const dataPtBr = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const COMMISSION_STATUS_UI: Record<
  CommissionStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "Pendente",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: Clock,
  },
  PAYABLE: {
    label: "A pagar",
    className: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    icon: Wallet,
  },
  PAID: {
    label: "Paga",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
  },
  CANCELED: {
    label: "Cancelada",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: XCircle,
  },
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function AffiliateFinanceiroPage({
  loaderData,
}: Route.ComponentProps) {
  const { comissoes, totais, afiliacoes, erro, origin } = loaderData;
  const revalidator = useRevalidator();
  const isRevalidating = revalidator.state === "loading";

  const totalPorStatus = (s: CommissionStatus) =>
    Number(totais.find((t) => t.status === s)?.total ?? 0);
  const jaPago = totalPorStatus("PAID");
  const aPagar = totalPorStatus("PAYABLE");
  const pendente = totalPorStatus("PENDING");
  // Pendencia financeira = tudo que ja foi apurado a seu favor mas ainda nao caiu.
  const pendenciaTotal = aPagar + pendente;

  // Apenas afiliacoes ativas para o asset list
  const afiliacoesAtivas = afiliacoes.filter((a) => a.status === "ACTIVE");

  // ─── Header actions ─────────────────────────────────────────────────────────
  // Apenas `Atualizar` (revalida os dados do loader via React Router 7).
  // Padrao espelhado de /wallet (decisao 2026-09-06).
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
      eyebrow="Programa de Afiliados"
      title="Carteira do Afiliado"
      description="Suas transacoes e pendencias financeiras — comissoes apuradas sobre cada investimento atribuido as suas indicacoes."
      watermark="AFILIADO"
      headerActions={headerActions}
    >
      {erro ? (
        <div className="glass-panel rounded-3xl p-12 text-center">
          <p className="text-on-surface-variant font-medium">{erro}</p>
        </div>
      ) : (
        <>
          {/* ─── Bento Stats ───────────────────────────────────────────────── */}
          <WalletBentoStats
            layout="hero-left"
            hero={{
              label: "A Receber",
              value: brl(pendenciaTotal),
              hint: `${brl(aPagar)} liberado + ${brl(pendente)} aguardando confirmacao`,
              tone: "primary",
            }}
            summary={[
              {
                label: "Ja Pago",
                value: brl(jaPago),
                tone: "emerald",
                hint: "Comissoes ja liquidadas",
              },
              {
                label: "A Pagar",
                value: brl(aPagar),
                tone: "sky",
                hint: "Liberado pelo financeiro",
              },
              {
                label: "Pendente",
                value: brl(pendente),
                tone: "amber",
                hint: "Aguardando confirmacao",
              },
            ]}
          />

          {/* ─── Asset List + Statement side-by-side em xl+ ───────────────────
              Padrao espelhado de /wallet (decisao 2026-09-06):
              - < xl: 1-col stack (Startups Filiadas em cima, Extrato embaixo).
              - xl+: grid-cols-2 lado a lado; cada componente recebe `compact`
                para reduzir padding interno (densidade compensa largura). */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8 md:mb-10">
            {/* ─── Asset List: startups afiliadas ativas ────────────────────── */}
            <WalletAssetListEditorial<MyAffiliation>
              title="Startups Filiadas"
              columns={[
                { label: "Startup" },
                { label: "Comissao", className: "text-right" },
                { label: "Investidores", className: "text-right" },
                { label: "Recebido / Pendente", className: "text-right" },
              ]}
              items={afiliacoesAtivas}
              keyOf={(a) => a.id}
              emptyMessage="Voce ainda nao possui afiliacoes ativas. Candidate-se no Programa de Afiliados."
              compact
              renderItem={(a) => (
                <EditorialAssetRow
                  avatar={
                    <EditorialAssetAvatar
                      src={null}
                      alt={a.startup.nome}
                    />
                  }
                  columns={[
                    {
                      content: (
                        <>
                          <span className="block text-lg font-bold text-on-surface">
                            {a.startup.nome}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">
                            {a.code}
                          </span>
                        </>
                      ),
                    },
                    {
                      content: (
                        <span className="text-2xl font-black text-primary tracking-tighter">
                          {Number(a.comissaoPct)}%
                        </span>
                      ),
                      className: "font-bold text-on-surface",
                    },
                    {
                      content: (
                        <span className="text-xl font-bold tracking-tighter text-on-surface">
                          {a.investidores}
                        </span>
                      ),
                    },
                    {
                      content: (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-sm font-bold text-emerald-400">
                            {brl(a.comissaoRecebida)}
                          </span>
                          <span className="text-[10px] text-amber-400">
                            + {brl(a.comissaoPendente)} pendente
                          </span>
                        </div>
                      ),
                    },
                  ]}
                  actions={
                    <>
                      {a.purchaseLinkUrl ? (
                        <Link
                          to={`${origin}/r/${a.code}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir link de divulgacao"
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-on-primary-fixed transition-all duration-300"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(`${origin}/r/${a.code}`);
                          } catch {
                            /* noop */
                          }
                        }}
                        title="Copiar link de divulgacao"
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-on-primary-fixed transition-all duration-300"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </>
                  }
                />
              )}
            />

            {/* ─── Transaction Statement: comissoes detalhadas ──────────────── */}
            <WalletTransactionStatement<Commission>
              title="Extrato de Comissoes"
              items={comissoes}
              keyOf={(c) => c.id}
              emptyMessage="Nenhuma comissao ainda. Assim que um indicado investir, a comissao aparecera aqui."
              compact
              columns={[
                {
                  label: "Startup",
                  align: "left",
                  render: (c) => (
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">
                        {c.affiliation.program.startup.nome}
                      </p>
                      <p className="text-[10px] font-mono text-primary truncate">
                        {c.affiliation.code} · inv #{c.investmentId}
                      </p>
                    </div>
                  ),
                },
                {
                  label: "Aporte",
                  align: "left",
                  render: (c) => (
                    <span className="text-xs text-on-surface-variant">
                      {brl(c.baseAmount)}
                    </span>
                  ),
                },
                {
                  label: "Comissao",
                  align: "left",
                  render: (c) => (
                    <div>
                      <p className="text-sm font-black text-emerald-400">
                        {brl(c.affiliateAmount)}
                      </p>
                      <p className="text-[9px] text-on-surface-variant">
                        {Number(c.affiliatePct)}%
                      </p>
                    </div>
                  ),
                },
                {
                  label: "Origem",
                  align: "left",
                  render: (c) => (
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      {c.attributedBy === "LINK" ? "Link" : "Codigo"}
                    </span>
                  ),
                },
                {
                  label: "Data",
                  align: "left",
                  render: (c) => (
                    <span className="text-xs text-on-surface-variant">
                      {dataPtBr(c.createdAt)}
                    </span>
                  ),
                },
                {
                  label: "Status",
                  align: "right",
                  render: (c) => {
                    const ui = COMMISSION_STATUS_UI[c.status];
                    const Icon = ui.icon;
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                          ui.className,
                        )}
                      >
                        <Icon className="w-3 h-3" /> {ui.label}
                      </span>
                    );
                  },
                },
              ] as StatementColumn<Commission>[]}
            />
          </div>
        </>
      )}
    </EditorialWalletShell>
  );
}
