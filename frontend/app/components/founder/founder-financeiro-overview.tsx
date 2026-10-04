/**
 * FounderFinanceiroOverview
 *
 * Visao consolidada da area financeira do fundador.
 *
 * Apresenta, em uma unica tela:
 *   1. Banner de alerta com total de cobranças em aberto
 *   2. Secao **"Comprar servico"** — botoes para gerar novas cobrancas
 *      (Taxa de Compliance, Prorrogacao) por startup
 *   3. Lista de **payments agrupados por startup** — cada startup tem sua
 *      propria section com:
 *        - Header (nome + badge de fase da captacao: "Em captacao" /
 *          "Captacao concluida") + totalizadores (Em aberto / Pago)
 *        - Sub-secoes por status (Em aberto / Concluidos / Cancelados)
 *        - Cada pagamento exibe **valor original / valor pago / desconto**
 *          quando ha cupom aplicado
 *        - CTA "Pagar agora" se status PENDING/EXPIRED
 *        - Link secundario para a pagina de REPASSE se a campanha esta
 *          FUNDED (mostra parcelas pagas/recebidas)
 *
 * Esta pagina e distinta da pagina de REPASSE de fundos
 * (`/founder/campaigns/:id/financeiro`):
 *   - **Financeiro** = lista todos os PAGAMENTOS (cobranças, concluídos,
 *     cancelados) e oferece criar novas cobranças de serviços.
 *   - **Repasse**    = solicitacao de PARCELAS dos fundos captados (NF + 3
 *     installments) — fluxo Compliance/Financeiro time, nao e owner-self.
 *
 * Carregamento: usa 2 queries (pagamentos + lista de startups) — o payment
 * ja vem com `campaign.startupId` no payload desde o backend, entao o
 * mapeamento e direto (sem heuristica).
 */

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  CreditCard,
  Loader2,
  Plus,
  Receipt,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";

import {
  getBestCoupon,
  getPaymentPurposeLabel,
  getStartupIdFromPayment,
  type FounderPayment,
} from "~/hooks/use-founder-pending-payments";
import {
  summarizePayments,
  useFounderAllPayments,
} from "~/hooks/use-founder-payments-all";
import {
  useFounderServices,
  type FounderService,
} from "~/hooks/use-founder-services";
import { useToast } from "~/context/ToastContext";
import { Drawer, DrawerBody, DrawerFooter } from "~/components/ui/drawer";
import { startupsQueryOptions } from "~/lib/queries";

type StartupLite = {
  id: number;
  nome: string;
  campaigns?: Array<{ id: number; status: string; title?: string }>;
};

/** Status de campanha que indicam captacao ABERTA (ainda recebendo). */
const OPEN_CAMPAIGN_STATUSES = new Set(["OPEN", "PAUSED", "DRAFT"]);

/** Status de campanha que indicam captacao CONCLUIDA (ja captou o valor). */
const CLOSED_CAMPAIGN_STATUSES = new Set(["FUNDED", "CLOSED", "PAID_OUT"]);

/** Helper: descobre a fase da startup a partir das campanhas. */
function derivePhase(
  startup: StartupLite | null,
): "open" | "closed" | "none" {
  if (!startup?.campaigns || startup.campaigns.length === 0) return "none";
  // Prioridade: campanhas abertas (ativa) primeiro; se nao houver, "closed".
  if (startup.campaigns.some((c) => OPEN_CAMPAIGN_STATUSES.has(c.status))) {
    return "open";
  }
  if (startup.campaigns.some((c) => CLOSED_CAMPAIGN_STATUSES.has(c.status))) {
    return "closed";
  }
  return "none";
}

/**
 * Identifica a CAMPAHNHA ATUAL da startup — aquela cujos payments devem
 * aparecer no /founder/financeiro. Logica:
 *   1. OPEN/PAUSED/DRAFT  → campanha ativa (cadastro, captacao em andamento)
 *   2. FUNDED/PAID_OUT    → mais recente (captacao concluida, recebe parcelas)
 *
 * Quando a startup abre uma NOVA campanha após receber todas as parcelas da
 * anterior, a nova vira "atual" e a antiga sai do financeiro principal
 * (fica acessível via "Histórico de campanhas").
 */
function getCurrentCampaign(
  startup: StartupLite | null,
): { id: number; status: string; title?: string } | null {
  if (!startup?.campaigns || startup.campaigns.length === 0) return null;
  // Prioridade: campanha aberta > pausada > rascunho > funded mais recente.
  for (const status of ["OPEN", "PAUSED", "DRAFT"]) {
    const found = startup.campaigns.find((c) => c.status === status);
    if (found) return found;
  }
  // Sem campanha ativa — pega a FUNDED/PAID_OUT mais recente (maior id).
  const concluded = startup.campaigns
    .filter((c) => CLOSED_CAMPAIGN_STATUSES.has(c.status))
    .sort((a, b) => b.id - a.id);
  return concluded[0] ?? null;
}

/**
 * Lista de campanhas ANTIGAS (concluídas) que NÃO são a atual.
 * Exibidas na area de "Histórico" da startup — cada item linka para o
 * detalhe do repasse daquela campanha (parcelas já recebidas).
 */
function getArchivedCampaigns(
  startup: StartupLite | null,
  currentId: number | null,
): Array<{ id: number; status: string; title?: string }> {
  if (!startup?.campaigns) return [];
  return startup.campaigns
    .filter((c) => c.id !== currentId)
    .filter((c) => CLOSED_CAMPAIGN_STATUSES.has(c.status))
    .sort((a, b) => b.id - a.id);
}

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

const STATUS_TONE: Record<
  string,
  { label: string; tone: string; icon: typeof CheckCircle2 }
> = {
  PAID: {
    label: "Pago",
    tone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    icon: CheckCircle2,
  },
  PENDING: {
    label: "Em aberto",
    tone: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    icon: CircleDollarSign,
  },
  EXPIRED: {
    label: "Expirado",
    tone: "text-orange-300 bg-orange-500/10 border-orange-500/20",
    icon: AlertCircle,
  },
  CANCELED: {
    label: "Cancelado",
    tone: "text-muted-foreground bg-white/5 border-white/10",
    icon: XCircle,
  },
  REFUNDED: {
    label: "Estornado",
    tone: "text-muted-foreground bg-white/5 border-white/10",
    icon: RotateCcw,
  },
};

/**
 * Row de pagamento com exibicao de valor original + pago + desconto.
 * - Se houver cupom aplicado, mostra uma "linha de preco" estilo recibo:
 *     De R$ 1.000,00  por R$ 750,00  -25% (CODIGO)
 * - Sem cupom: mostra apenas o valor pago.
 */
function PaymentRow({ payment }: { payment: FounderPayment }) {
  const label = getPaymentPurposeLabel(payment.purpose);
  const tone = STATUS_TONE[payment.status] ?? STATUS_TONE.PENDING;
  const Icon = tone.icon;
  const isOpen = payment.status === "PENDING" || payment.status === "EXPIRED";
  const coupon = getBestCoupon(payment);

  return (
    <li
      className="flex flex-col gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 md:flex-row md:items-center md:justify-between md:gap-4"
      data-testid={`financeiro-payment-row-${payment.id}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tone.tone}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">
              {label.title}
            </p>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${tone.tone}`}
            >
              {tone.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {label.description}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
            Criada em {formatDate(payment.createdAt)} · {payment.method}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-stretch gap-2 md:items-end">
        {coupon ? (
          <div className="space-y-0.5 text-right">
            <p className="text-[10px] text-muted-foreground line-through">
              De {formatBRL(coupon.originalAmount)}
            </p>
            <p className="font-mono text-base font-bold text-foreground tabular-nums">
              {formatBRL(payment.amount)}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              -{coupon.coupon.percent}% ({coupon.coupon.code})
            </p>
          </div>
        ) : (
          <span className="font-mono text-base font-bold text-foreground tabular-nums">
            {formatBRL(payment.amount)}
          </span>
        )}
        {isOpen && (
          <Link
            to={`/checkout/payment/${payment.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/20 transition-colors"
            data-testid={`financeiro-pay-${payment.id}`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Pagar agora
          </Link>
        )}
      </div>
    </li>
  );
}

/**
 * Secao completa por startup:
 *   - Header com nome + badge de fase da campanha ATUAL + totalizadores
 *   - Sub-secoes por status (Em aberto / Concluidos / Cancelados) — apenas
 *     payments da campanha ATUAL (nao mostra payments de campanhas antigas)
 *   - CTA "Ver parcelas recebidas" quando a campanha atual e FUNDED
 *   - Lista de "Historico de campanhas" com link para o detalhe de cada
 *     campanha concluida (mostra parcelas ja recebidas)
 */
function StartupSection({
  startup,
  payments,
}: {
  startup: StartupLite;
  payments: FounderPayment[];
}) {
  const { cobrancas, concluidos, cancelados } = summarizePayments(payments);
  const totalOpen = cobrancas.reduce(
    (s, p) => s + (typeof p.amount === "string" ? Number(p.amount) : p.amount),
    0,
  );
  const totalPago = concluidos.reduce(
    (s, p) => s + (typeof p.amount === "string" ? Number(p.amount) : p.amount),
    0,
  );

  const currentCampaign = getCurrentCampaign(startup);
  const archivedCampaigns = getArchivedCampaigns(
    startup,
    currentCampaign?.id ?? null,
  );
  const isCurrentFunded =
    currentCampaign != null &&
    CLOSED_CAMPAIGN_STATUSES.has(currentCampaign.status);
  const repasseHref =
    isCurrentFunded && currentCampaign
      ? `/founder/campaigns/${currentCampaign.id}/financeiro`
      : null;

  // Badge de fase baseado na campanha ATUAL (nao na startup inteira).
  const phase = currentCampaign
    ? OPEN_CAMPAIGN_STATUSES.has(currentCampaign.status)
      ? "open"
      : "closed"
    : "none";

  const phaseBadge = (() => {
    if (phase === "open") {
      return {
        label: "Em captação",
        tone: "text-amber-300 bg-amber-500/10 border-amber-500/20",
        icon: CircleDollarSign,
      };
    }
    if (phase === "closed") {
      return {
        label: "Captação concluída",
        tone: "text-primary bg-primary/10 border-primary/20",
        icon: CheckCircle2,
      };
    }
    return {
      label: "Sem campanha",
      tone: "text-muted-foreground bg-white/5 border-white/10",
      icon: CircleDollarSign,
    };
  })();
  const PhaseIcon = phaseBadge.icon;

  return (
    <section
      className="rounded-2xl border border-white/10 bg-card p-4 md:p-6 space-y-5"
      data-testid={`financeiro-startup-section-${startup.id}`}
    >
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              Startup
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${phaseBadge.tone}`}
              data-testid={`financeiro-phase-${startup.id}`}
            >
              <PhaseIcon className="h-3 w-3" />
              {phaseBadge.label}
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-foreground truncate">
            {startup.nome}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {cobrancas.length > 0 && (
              <span>
                {cobrancas.length} em aberto · {formatBRL(totalOpen)}
              </span>
            )}
            {totalPago > 0 && (
              <span className="text-emerald-300">
                {concluidos.length} pago(s) · {formatBRL(totalPago)}
              </span>
            )}
          </div>
        </div>
        {repasseHref && (
          <Link
            to={repasseHref}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
            data-testid={`financeiro-repasse-link-${startup.id}`}
          >
            <Wallet className="h-3.5 w-3.5" />
            Ver parcelas recebidas
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </header>

      {cobrancas.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-300">
            <CircleDollarSign className="h-3.5 w-3.5" />
            Em aberto ({cobrancas.length})
          </h3>
          <ul className="space-y-2">
            {cobrancas.map((p) => (
              <PaymentRow key={p.id} payment={p} />
            ))}
          </ul>
        </div>
      )}

      {concluidos.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Concluídos ({concluidos.length})
          </h3>
          <ul className="space-y-2">
            {concluidos.map((p) => (
              <PaymentRow key={p.id} payment={p} />
            ))}
          </ul>
        </div>
      )}

      {cancelados.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground">
            <XCircle className="h-3.5 w-3.5" />
            Cancelados / estornados ({cancelados.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {cancelados.map((p) => (
              <PaymentRow key={p.id} payment={p} />
            ))}
          </ul>
        </details>
      )}

      {/* Empty state para startups sem payments (ainda sem cobranca) */}
      {payments.length === 0 && (
        <div
          className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-4 text-center"
          data-testid={`financeiro-startup-empty-${startup.id}`}
        >
          <p className="text-xs text-muted-foreground">
            Nenhum pagamento registrado para a campanha atual.
            {phase === "open"
              ? " A cobrança da reserva de token aparecerá aqui assim que for gerada."
              : phase === "closed"
                ? " Aguardando a próxima etapa do ciclo financeiro."
                : " Cadastre uma campanha para começar."}
          </p>
        </div>
      )}

      {/* Historico de campanhas concluidas (anteriores a atual) — link para
          cada uma mostra as parcelas ja recebidas pelo founder. So aparece
          se a startup ja tem mais de 1 campanha concluida alem da atual. */}
      {archivedCampaigns.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground">
            <Receipt className="h-3.5 w-3.5" />
            Histórico de campanhas ({archivedCampaigns.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {archivedCampaigns.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/founder/campaigns/${c.id}/financeiro`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                  data-testid={`financeiro-archive-link-${c.id}`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    <span className="font-mono text-muted-foreground">
                      #{c.id}
                    </span>
                    <span className="text-foreground">
                      {c.title ?? `Rodada #${c.id}`}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Ver parcelas
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

/**
 * Card "Comprar servico" — CTA para gerar novas cobrancas.
 * Exibido 1x no topo da pagina para a startup primaria (caso comum) e
 * tambem dentro de cada secao de startup para atalho rapido.
 */
/**
 * Card "Comprar servico" — exibe o catalogo completo de servicos disponiveis
 * para a startup primária. O fundador seleciona o servico + confirma
 * contratação via dialog (que pede a startup alvo caso haja mais de uma).
 */
function BuyServiceCard({
  startups,
}: {
  startups: StartupLite[];
}) {
  const { data: services, isLoading } = useFounderServices();
  const [dialogService, setDialogService] = useState<FounderService | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const toast = useToast();

  // Hooks de mutation mantidos por compat — Prorrogacao foi removida do
  // catalogo de servicos (opera via fluxo dedicado /startups/:id/prorrogacao)
  // e Taxa de Compliance continua sendo gerada automaticamente no save da
  // captacao. So mantemos o handleConfirm generico para servicos com endpoint
  // dedicado no backend (a implementar por categoria).

  const orderedServices = useMemo(() => {
    if (!services) return [];
    return [...services].sort((a, b) => {
      if (a.highlight && !b.highlight) return -1;
      if (!a.highlight && b.highlight) return 1;
      return 0;
    });
  }, [services]);

  const handleConfirm = async (
    svc: FounderService,
    _args: { campaignId: number; startupId: number },
  ) => {
    setPending(true);
    try {
      // Cada servico tera endpoint dedicado — placeholder por enquanto.
      toast.showToast(
        `Servico "${svc.name}" sera contratado via ${svc.endpoint ?? "fluxo dedicado"}.`,
        "info",
      );
    } catch {
      /* toast ja mostrado pela mutation */
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 md:p-5 space-y-4"
      data-testid="financeiro-buy-service"
    >
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/20 text-primary">
          <ShoppingCart className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h2 className="text-base font-black text-foreground">
            Comprar um serviço
          </h2>
          <p className="text-xs text-muted-foreground">
            Selecione um serviço, escolha a startup alvo e confirme. Após
            confirmar, você é redirecionado ao checkout para pagar.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="rounded-xl border border-white/10 bg-card/60 p-4 flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando catálogo…
        </div>
      ) : orderedServices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-muted-foreground">
          Nenhum serviço disponível no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {orderedServices.map((svc) => (
            <ServiceTile
              key={svc.id}
              service={svc}
              disabled={pending}
              onClick={() => setDialogService(svc)}
            />
          ))}
        </div>
      )}

      <SolicitarDialog
        service={dialogService}
        startups={startups}
        onClose={() => !pending && setDialogService(null)}
        onConfirm={handleConfirm}
        pending={pending}
      />
    </section>
  );
}

/** Tile de servico individual (linka para abrir o dialog). */
function ServiceTile({
  service,
  disabled,
  onClick,
}: {
  service: FounderService;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon =
    service.category === "FAST_TRACK"
      ? Sparkles
      : service.category === "COMPLIANCE"
        ? ShieldCheck
        : service.category === "EXTENSION"
          ? Clock
          : Receipt;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!service.available || disabled}
      data-testid={`financeiro-service-${service.slug}`}
      className={
        service.highlight
          ? "flex h-full items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 text-left transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          : "flex h-full items-start gap-3 rounded-xl border border-white/10 bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      <div
        className={
          service.highlight
            ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/20 text-primary"
            : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground"
        }
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-bold text-foreground">{service.name}</p>
          {service.highlight && (
            <span className="inline-flex items-center rounded-full bg-primary/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-primary">
              Padrão
            </span>
          )}
          {!service.available && (
            <span className="inline-flex items-center rounded-full bg-white/5 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground">
              Em breve
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {service.shortDesc ?? service.description}
        </p>
        {service.price != null && (
          <p className="font-mono text-base font-bold text-foreground tabular-nums">
            {formatBRL(service.price)}
          </p>
        )}
      </div>
    </button>
  );
}

/** Dialog de contratação — confirma startup + servico antes de disparar. */
function SolicitarDialog({
  service,
  startups,
  onClose,
  onConfirm,
  pending,
}: {
  service: FounderService | null;
  startups: StartupLite[];
  onClose: () => void;
  onConfirm: (
    svc: FounderService,
    args: { campaignId: number; startupId: number },
  ) => void;
  pending: boolean;
}) {
  const [selectedStartupId, setSelectedStartupId] = useState<number | null>(
    startups[0]?.id ?? null,
  );

  const eligibleStatuses = parseStatusList(
    service?.requiresCampaignStatus ?? null,
  );

  const selectedStartup =
    selectedStartupId != null
      ? startups.find((s) => s.id === selectedStartupId) ?? null
      : null;
  const selectedEligible =
    selectedStartup != null &&
    (eligibleStatuses === null ||
      (selectedStartup.campaigns?.some((c) =>
        eligibleStatuses.includes(c.status),
      ) ??
        false));

  return (
    <Drawer
      open={service != null}
      onClose={onClose}
      dismissible={!pending}
      eyebrow="Contratar serviço"
      title={service?.name}
    >
      {service && (
        <>
          <DrawerBody className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {service.description}
            </p>

            {service.price != null && (
              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Valor
                </p>
                <p className="font-mono text-2xl font-black tabular-nums text-foreground">
                  {formatBRL(service.price)}
                </p>
              </div>
            )}

            {startups.length === 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                Você ainda não tem nenhuma startup cadastrada.
              </div>
            ) : (
              <fieldset className="space-y-2">
                <legend className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Aplicar à startup
                </legend>
                <div
                  className="space-y-2"
                  role="radiogroup"
                  aria-label="Selecionar startup"
                >
                  {startups.map((s) => {
                    const eligible =
                      eligibleStatuses === null ||
                      (s.campaigns?.some((c) =>
                        eligibleStatuses.includes(c.status),
                      ) ??
                        false);
                    const active = selectedStartupId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={!eligible || pending}
                        onClick={() => setSelectedStartupId(s.id)}
                        data-testid={`financeiro-service-startup-${s.id}`}
                        className={
                          active
                            ? "flex w-full items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            : "flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                        }
                      >
                        <span className="min-w-0 truncate text-sm font-bold text-foreground">
                          {s.nome}
                        </span>
                        {eligible ? (
                          <span
                            className={
                              active
                                ? "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-primary"
                                : "h-4 w-4 shrink-0 rounded-full border-2 border-white/20"
                            }
                          >
                            {active && (
                              <span className="h-2 w-2 rounded-full bg-primary" />
                            )}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            Sem campanha
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedStartupId != null && !selectedEligible && (
                  <p className="text-[10px] text-rose-300">
                    Nenhuma campanha elegível para este serviço.
                  </p>
                )}
              </fieldset>
            )}
          </DrawerBody>

          <DrawerFooter>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (!service || selectedStartupId == null || !selectedStartup) {
                  return;
                }
                const campaign = selectedStartup.campaigns?.find((c) =>
                  eligibleStatuses === null
                    ? true
                    : eligibleStatuses.includes(c.status),
                );
                if (!campaign) return;
                onConfirm(service, {
                  startupId: selectedStartupId,
                  campaignId: campaign.id,
                });
              }}
              disabled={
                selectedStartupId == null ||
                pending ||
                startups.length === 0 ||
                !selectedEligible
              }
              data-testid="financeiro-service-confirm"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-[0_0_18px_rgba(213,0,249,0.25)] transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShoppingCart className="h-3.5 w-3.5" />
              )}
              Contratar agora
            </button>
          </DrawerFooter>
        </>
      )}
    </Drawer>
  );
}

/** Parse do JSON `requiresCampaignStatus` — vem como string JSON do Prisma. */
function parseStatusList(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((s) => typeof s === "string");
  } catch {
    /* ignore */
  }
  return null;
}

export function FounderFinanceiroOverview() {
  const { data: payments, isLoading, isError } = useFounderAllPayments();

// Carrega a lista de startups do founder — usada para fazer o group-by
  // startupId e exibir nome + fase ("Em captação" vs "Captação concluída").
  // Usa `startupsQueryOptions` (queryKey ["startups"]) para COMPARTILHAR
  // cache com /founder/dashboard — ao navegar de uma para outra, o cache já
  // vem hidratado via SSR loader, sem refetch no cliente.
  const { data: startupsData } = useQuery({
    ...startupsQueryOptions,
    select: (raw: unknown): StartupLite[] => {
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { data?: unknown })?.data)
          ? ((raw as { data: StartupLite[] }).data)
          : [];
      return list;
    },
  });
  const startups = startupsData;

  const primaryStartup = startups?.[0] ?? null;
  const allPayments = payments ?? [];
  const totalOpen = allPayments.filter(
    (p) => p.status === "PENDING" || p.status === "EXPIRED",
  ).length;

  // Agrupa payments por startupId **E** filtra só pela campanha atual.
  //
  // Fluxo do founder:
  //   1. Cadastra startup (cria Campaign DRAFT) → paga TOKEN_RESERVATION
//   2. Pagamento da taxa de compliance → campanha vira OPEN
//   3. Pode contratar servicos extras (selo de verificacao, prorrogacao,
//      acesso antecipado) — todos ficam vinculados a `campaignId` da campanha
//      ATUAL
//   4. Quando captacao concluida (FUNDED), recebe parcelas via /campaigns/:id/financeiro
//   5. Quando abre NOVA campanha, a antiga vira "historico" — sai do
//      financeiro principal
//
  // Por isso: cada startup tem APENAS os payments da sua CAMPAHNHA ATUAL
  // (a que está sendo trabalhada). Campanhas concluidas anteriores ficam
  // acessiveis via "Historico de campanhas" da secao da startup.
  //
  // ATENCAO: o backend serializa `startup.id` como STRING (enrichStartup faz
  // `id: startup.id.toString()`) e `campaign.startupId` como NUMBER. Normalizar
  // para number aqui para que `Map.has(s.id)` funcione.
  const startupIdAsNumber = (raw: unknown): number | null => {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };
  const currentCampaignByStartup = new Map<number, number>();
  for (const s of startups ?? []) {
    const sid = startupIdAsNumber(s.id);
    if (sid == null) continue;
    const current = getCurrentCampaign(s);
    if (current) currentCampaignByStartup.set(sid, current.id);
  }

  const paymentsByStartup = new Map<number, FounderPayment[]>();
  for (const p of allPayments) {
    const sid = getStartupIdFromPayment(p);
    if (sid == null) continue;
    // Filtra: so payments da campanha ATUAL da startup. Payments de campanhas
    // antigas sao filtrados aqui (ficam acessiveis via /campaigns/:id/financeiro).
    const currentId = currentCampaignByStartup.get(sid);
    if (currentId == null || p.campaignId !== currentId) continue;
    const list = paymentsByStartup.get(sid) ?? [];
    list.push(p);
    paymentsByStartup.set(sid, list);
  }

  // Ordena startups: as que tem payments (da campanha atual) primeiro, depois
  // as demais. Dentro de cada grupo, mantém a ordem do backend.
  const orderedStartups = (startups ?? []).slice().sort((a, b) => {
    const aId = startupIdAsNumber(a.id);
    const bId = startupIdAsNumber(b.id);
    const aHas = aId != null && paymentsByStartup.has(aId) ? 0 : 1;
    const bHas = bId != null && paymentsByStartup.has(bId) ? 0 : 1;
    return aHas - bHas;
  });

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Carregando financeiro"
        className="rounded-xl border border-border bg-card/60 p-6 flex items-center gap-3 text-sm text-muted-foreground"
      >
        <CircleDollarSign className="h-4 w-4 animate-pulse" />
        Carregando financeiro consolidado…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
        Não foi possível carregar seus pagamentos agora. Tente recarregar a página.
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="financeiro-overview">
      {totalOpen > 0 && (
        <div
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-3 text-sm text-amber-300"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Você tem <strong>{totalOpen}</strong> cobrança{totalOpen === 1 ? "" : "s"}{" "}
            em aberto. Quite para liberar a próxima etapa da sua captação.
          </span>
        </div>
      )}

      {/* === Comprar servico (CTA principal) — catalogo completo === */}
      <BuyServiceCard startups={startups ?? []} />

      {allPayments.length === 0 ? (
        <div
          className="rounded-2xl border border-white/10 bg-card p-8 text-center space-y-3"
          data-testid="financeiro-empty"
        >
          <Receipt className="h-10 w-10 text-primary/40 mx-auto" />
          <h2 className="text-lg font-black text-foreground">
            Nenhum pagamento registrado
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Quando você criar uma captação ou comprar um serviço, todas as
            cobranças e pagamentos aparecerão aqui, agrupados por startup.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mostra TODAS as startups (mesmo sem payments) — o founder precisa ver
              que QUALISOFT e GreenEnergy existem, mesmo sem cobranca ainda.
              A order continua priorizando as com payments (para reduzir espaco
              em branco no topo). */}
          {orderedStartups.map((startup) => {
            const n = startupIdAsNumber(startup.id);
            return (
              <StartupSection
                key={startup.id}
                startup={startup}
                payments={n != null ? paymentsByStartup.get(n) ?? [] : []}
              />
            );
          })}

          {/* Payments sem vinculo direto a uma startup (edge case) */}
          {(() => {
            const orphans = allPayments.filter(
              (p) => getStartupIdFromPayment(p) == null,
            );
            if (orphans.length === 0) return null;
            return (
              <section
                className="rounded-2xl border border-white/10 bg-card p-4 md:p-6 space-y-3"
                data-testid="financeiro-orphan-section"
              >
                <header>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Outros pagamentos
                  </span>
                  <h2 className="text-lg font-black text-foreground">
                    Pagamentos sem vinculo direto de startup
                  </h2>
                </header>
                <ul className="space-y-2">
                  {orphans.map((p) => (
                    <PaymentRow key={p.id} payment={p} />
                  ))}
                </ul>
              </section>
            );
          })()}
        </div>
      )}
    </div>
  );
}