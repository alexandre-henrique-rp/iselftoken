/**
 * /profile/plans — Gerenciamento de Planos
 *
 * Pagina dedicada aos planos do usuario:
 * 1) Bento Stats — Proximo Vencimento (hero) + Planos Ativos / Total Investido / Maior Periodo
 * 2) Cards de Planos Ativos — para cada subscription ACTIVE: nome, periodo,
 *    data de aquisicao (startedAt), data de vencimento (expiresAt),
 *    dias restantes, beneficios e CTA Cancelar.
 * 3) Historico de Compras — todas as subscriptions (incluindo canceladas/expiradas)
 *    com lista de pagamentos: data, plano, metodo, valor, status.
 * 4) CTA final "Ver Planos Disponiveis" -> /pricing.
 *
 * Padrao editorial compartilhado com /wallet, /wallet/affiliate, /transparencia
 * e /affiliate (decisao 2026-09-06).
 *
 * Backend: GET /subscriptions/me/history (autenticado) retorna todas as
 * subscriptions do usuario com plan + payments ordenados por createdAt desc.
 */

import type { Route } from "./+types/profile-plans";
import { Link, useRevalidator } from "react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { BACKEND_URL } from "~/lib/api-config";
import { meQueryOptions } from "~/lib/queries";
import {
  EditorialWalletShell,
} from "~/components/wallet/editorial-wallet-shell";
import {
  WalletTransactionStatement,
  type StatementColumn,
} from "~/components/wallet/wallet-transaction-statement";
import { CancelPlanModal } from "~/components/profile/cancel-plan-modal";
import { cn } from "~/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type SubStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELED";
type PaymentStatus = "PENDING" | "PAID" | "CANCELED" | "REFUNDED" | "REJECTED";
type PaymentMethod = "PIX" | "CARD";

interface PlanLite {
  id: number;
  nome: string;
  slug: string;
  preco: string;
  periodoMeses: number;
  periodo: string;
  beneficios: string[] | null;
}

interface PlanPayment {
  id: number;
  amount: string;
  method: PaymentMethod | string;
  status: PaymentStatus | string;
  paidAt: string | null;
  createdAt: string;
}

interface UserSubscription {
  id: number;
  planId: number;
  status: SubStatus;
  startedAt: string;
  expiresAt: string;
  createdAt: string;
  plan: PlanLite;
  payments: PlanPayment[];
}

interface LoaderData {
  subscriptions: UserSubscription[];
  erro: string | null;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData> {
  const cookie = request.headers.get("cookie") || "";
  try {
    const res = await fetch(`${BACKEND_URL}/subscriptions/me/history`, {
      headers: { accept: "application/json", cookie },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.error) {
      return {
        subscriptions: [],
        erro: json?.message ?? "Nao foi possivel carregar seus planos.",
      };
    }
    const data = Array.isArray(json?.data) ? json.data : [];
    return { subscriptions: data, erro: null };
  } catch {
    return { subscriptions: [], erro: "Erro de conexao." };
  }
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Meus Planos | iSelfToken" },
    {
      name: "description",
      content:
        "Planos ativos, datas de aquisicao e vencimento, e historico de compras.",
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const brl = (v: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v || 0),
  );

const dataPtBr = (iso: string | null) => {
  if (!iso) return "—";
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

function diasRestantes(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0;
}

const SUB_STATUS_UI: Record<
  SubStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Ativo",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  PENDING: {
    label: "Pendente",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  EXPIRED: {
    label: "Expirado",
    className: "bg-white/5 text-on-surface-variant border-white/10",
  },
  CANCELED: {
    label: "Cancelado",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

const PAY_STATUS_UI: Record<string, { label: string; Icon: typeof CheckCircle2 }> = {
  PAID: { label: "Pago", Icon: CheckCircle2 },
  PENDING: { label: "Pendente", Icon: Clock },
  CANCELED: { label: "Cancelado", Icon: XCircle },
  REFUNDED: { label: "Reembolsado", Icon: XCircle },
  REJECTED: { label: "Rejeitado", Icon: XCircle },
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function ProfilePlansPage({
  loaderData,
}: Route.ComponentProps) {
  const { subscriptions, erro } = loaderData;
  const revalidator = useRevalidator();
  const isRevalidating = revalidator.state === "loading";
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const wasLoading = useRef(false);

  useEffect(() => {
    if (isRevalidating) {
      wasLoading.current = true;
      return;
    }
    if (wasLoading.current) {
      wasLoading.current = false;
      const now = new Date();
      setLastUpdated(now);
      toast.success("Planos atualizados", {
        description: `Dados refrescados as ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`,
      });
    }
  }, [isRevalidating]);

  // Planos ativos.
  const ativas = subscriptions.filter((s) => s.status === "ACTIVE");

  // Estado de cancelamento (loading por subscription id).
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  // Modal de confirmacao: guarda a subscription que sera cancelada apos
  // o usuario confirmar no CancelPlanModal.
  const [pendingCancel, setPendingCancel] = useState<UserSubscription | null>(
    null,
  );
  const queryClient = useQueryClient();

  // Abre o modal de confirmacao. Nenhum fetch eh disparado aqui.
  const requestCancel = (subscription: UserSubscription): void => {
    setPendingCancel(subscription);
  };

  // Confirmacao do modal: chama POST /api/subscriptions/:id/cancel
  // (BFF -> backend cancelOwn). Em sucesso, invalida 2 caches:
  //  - revalidator (loader da rota atual /profile/plans)
  //  - queryClient ["me"] (dados do user consumidos por usePlan no /profile
  //    + sidebar + demais componentes que dependem da subscription ativa)
  const confirmCancel = async (): Promise<void> => {
    if (!pendingCancel) return;
    const target = pendingCancel;
    setPendingCancel(null);
    setCancellingId(target.id);

    try {
      const res = await fetch(
        `/api/subscriptions/${target.id}/cancel`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        throw new Error(
          data?.message ?? `Falha ao cancelar (HTTP ${res.status})`,
        );
      }
      toast.success(`Plano "${target.plan.nome}" cancelado`, {
        description:
          "Acesso revogado imediatamente. Sem reembolso do periodo pago.",
      });
      // Invalida as 2 caches dependentes da subscription ativa:
      // 1) loader da rota atual (atualiza lista + Bento de planos)
      // 2) query ["me"] (atualiza usePlan no /profile banner, sidebar, etc.)
      revalidator.revalidate();
      queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao cancelar o plano.",
      );
    } finally {
      setCancellingId(null);
    }
  };

  // Historico achatado: cada pagamento vira uma linha (plano + status).
  const historico = subscriptions.flatMap((s) =>
    s.payments.map((p) => ({
      ...p,
      planoNome: s.plan.nome,
      planoSlug: s.plan.slug,
      subStatus: s.status,
    })),
  );

  const headerActions = (
    <div className="flex items-center gap-3">
      {lastUpdated && !isRevalidating && (
        <span className="hidden md:inline text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
          Atualizado{" "}
          {lastUpdated.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      )}
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
        aria-label="Atualizar lista de planos"
      >
        <RefreshCw
          className={cn("w-3.5 h-3.5", isRevalidating && "animate-spin")}
        />
        {isRevalidating ? "Atualizando..." : "Atualizar"}
      </button>
    </div>
  );

  return (
    <EditorialWalletShell
      eyebrow="Minha Conta"
      title="Meus Planos"
      description="Planos ativos, datas de aquisicao e vencimento, e historico de compras."
      watermark="PLANOS"
      headerActions={headerActions}
    >
      {erro ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-white/5">
          <p className="text-on-surface-variant font-medium">{erro}</p>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="glass-panel rounded-2xl p-16 text-center border border-white/5 space-y-3">
          <Sparkles className="w-10 h-10 text-primary mx-auto" />
          <p className="text-lg font-black text-on-surface">
            Voce ainda nao possui planos.
          </p>
          <p className="text-sm text-on-surface-variant">
            Escolha um plano para liberar todos os recursos da plataforma.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary-fixed hover:opacity-90 transition-all text-[11px] font-black uppercase tracking-widest"
          >
            Ver Planos Disponiveis <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <>
          {/* ─── Cards de Planos Ativos (3-cols em xl+) ────────────────────── */}
          {ativas.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8 md:mb-10">
              {ativas.map((s) => (
                <PlanCard
                  key={s.id}
                  subscription={s}
                  onCancel={() => requestCancel(s)}
                  isCancelling={cancellingId === s.id}
                />
              ))}
            </div>
          )}

          {/* ─── Historico de Compras ────────────────────────────────────────── */}
          {historico.length > 0 && (
            <WalletTransactionStatement<typeof historico[number]>
              title="Historico de Compras"
              items={historico}
              keyOf={(p) => `${p.id}`}
              emptyMessage="Nenhuma compra registrada."
              columns={[
                {
                  label: "Data",
                  align: "left",
                  render: (p) => (
                    <span className="text-xs text-on-surface-variant">
                      {dataPtBr(p.paidAt ?? p.createdAt)}
                    </span>
                  ),
                },
                {
                  label: "Plano",
                  align: "left",
                  render: (p) => (
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">
                        {p.planoNome}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                        {p.method}
                      </p>
                    </div>
                  ),
                },
                {
                  label: "Valor",
                  align: "right",
                  render: (p) => (
                    <span className="text-sm font-bold text-on-surface">
                      {brl(p.amount)}
                    </span>
                  ),
                },
                {
                  label: "Status",
                  align: "center",
                  render: (p) => {
                    const ui = PAY_STATUS_UI[p.status] ?? PAY_STATUS_UI.PENDING;
                    const Icon = ui.Icon;
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                          p.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : p.status === "PENDING"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20",
                        )}
                      >
                        <Icon className="w-3 h-3" /> {ui.label}
                      </span>
                    );
                  },
                },
              ] as StatementColumn<typeof historico[number]>[]}
            />
          )}

          {/* CTA final: ver planos disponiveis */}
          <div className="text-center pt-2">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary-fixed hover:opacity-90 transition-all text-[11px] font-black uppercase tracking-widest"
            >
              Ver Planos Disponiveis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </>
      )}

      {/* Modal de confirmacao de cancelamento — abre quando o usuario clica
          "Cancelar Plano" em algum card. So renderiza quando pendingCancel
          esta setado. */}
      {pendingCancel && (
        <CancelPlanModal
          planName={pendingCancel.plan.nome}
          planPrice={brl(pendingCancel.plan.preco)}
          expiresAt={dataPtBr(pendingCancel.expiresAt)}
          submitting={cancellingId === pendingCancel.id}
          onConfirm={confirmCancel}
          onClose={() => setPendingCancel(null)}
        />
      )}
    </EditorialWalletShell>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function PlanCard({
  subscription,
  onCancel,
  isCancelling,
}: {
  subscription: UserSubscription;
  onCancel: () => void;
  isCancelling: boolean;
}) {
  const statusUi = SUB_STATUS_UI[subscription.status];
  const dias = diasRestantes(subscription.expiresAt);
  const expiraEmBreve = subscription.status === "ACTIVE" && dias <= 30;

  // Valor pago: soma dos payments com status PAID. Fallback para o preco do
  // plano caso ainda nao haja pagamento confirmado (subscription pendente).
  const pagamentosPagos = subscription.payments.filter(
    (p) => p.status === "PAID",
  );
  const valorPago =
    pagamentosPagos.length > 0
      ? pagamentosPagos.reduce(
          (sum, p) => sum + Number(p.amount || 0),
          0,
        )
      : Number(subscription.plan.preco || 0);

  // Data do pagamento: paidAt do pagamento PAID mais recente. Fallback para
  // startedAt da subscription caso nao haja pagamento confirmado.
  const dataPagamento =
    pagamentosPagos.length > 0
      ? [...pagamentosPagos].sort(
          (a, b) =>
            new Date(b.paidAt ?? b.createdAt).getTime() -
            new Date(a.paidAt ?? a.createdAt).getTime(),
        )[0]
      : null;

  return (
    <div className="glass-panel rounded-xl p-3 border border-white/5 flex flex-col gap-2.5">
      {/* Header: nome do plano + status badge */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-black text-on-surface truncate min-w-0">
          {subscription.plan.nome}
        </h3>
        <span
          className={cn(
            "shrink-0 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
            statusUi.className,
          )}
        >
          {statusUi.label}
        </span>
      </div>

      {/* Valor Pago (destaque principal) */}
      <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-0.5">
          Valor Pago
        </p>
        <p className="text-xl font-black text-on-surface tracking-tighter">
          {brl(valorPago)}
        </p>
      </div>

      {/* Quando foi pago + Quando vence */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-0.5">
            Pago em
          </p>
          <p className="text-xs font-bold text-on-surface">
            {dataPagamento
              ? dataPtBr(dataPagamento.paidAt ?? dataPagamento.createdAt)
              : dataPtBr(subscription.startedAt)}
          </p>
        </div>
        <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-0.5">
            Expira em
          </p>
          <p
            className={cn(
              "text-xs font-bold",
              expiraEmBreve ? "text-amber-400" : "text-on-surface",
            )}
          >
            {dataPtBr(subscription.expiresAt)}
          </p>
        </div>
      </div>

      {/* Dias restantes — destaque (so para ativos) */}
      {subscription.status === "ACTIVE" && (
        <div className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3 py-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
            <CalendarClock className="w-3 h-3" />
            Tempo restante
          </span>
          <span
            className={cn(
              "text-xs font-black",
              dias <= 30 ? "text-amber-400" : "text-on-surface",
            )}
          >
            {dias} dia{dias !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* CTA: cancelar plano (so para ativos).
          Acao destrutiva: revoga acesso imediato + sem reembolso (CASE.md
          §Planos + decisao F3). Click abre o CancelPlanModal na pagina
          para confirmacao explicita antes de chamar a API. */}
      {subscription.status === "ACTIVE" && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isCancelling}
          className={cn(
            "w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors",
            isCancelling
              ? "bg-white/5 text-on-surface-variant/40 cursor-wait"
              : "bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300",
          )}
        >
          <XCircle className="w-3 h-3" />
          {isCancelling ? "Cancelando..." : "Cancelar Plano"}
        </button>
      )}
    </div>
  );
}
