import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Coins,
  Hourglass,
  Loader2,
  RotateCcw,
  Send,
  Wallet,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import {
  Link,
  redirect,
  useParams,
  useRevalidator,
  type LoaderFunctionArgs,
} from "react-router";
import { toast } from "sonner";
import {
  RepasseMonthlyReportFields,
  type MonthlyReportValues,
} from "~/components/founder/repasse-monthly-report-fields";
import { RepasseEducacionalTips } from "~/components/founder/repasse-educacional-tips";
import { BACKEND_URL } from "~/lib/api-config";
import { formatCurrencyBRL } from "~/lib/currency-format";
import { formatDateOnlyBR } from "~/lib/date-utils";
import { getInstallmentEligibility } from "~/lib/repasse-eligibility";
import { installmentRequestSchema, isAllocationValid } from "~/lib/repasse-schemas";
import { cn } from "~/lib/utils";
import type {
  AllocationPercents,
  Installment,
  InstallmentRequest,
  Repasse,
  RepasseDashboardData,
} from "~/types/repasse";
import { REPASSE_STATUS_LABELS } from "~/types/repasse";

/**
 * Janela de antecedencia para solicitacao de parcela (espelha
 * `REPASSE_JANELA_ANTECEDENCIA_DIAS` no backend `installment-requests.service.ts`
 * e em `lib/repasse-eligibility.ts`). Parcela fica disponivel para solicitacao
 * a partir de (scheduledDate - 10 dias).
 */
const REPASSE_JANELA_ANTECEDENCIA_DIAS = 10;

/**
 * Pagina do Financeiro do Fundador — ancorada na CAMPANHA (rodada) e nao na startup.
 *
 * - CAMPANHA e a entidade do dominio que possui 1 Repasse (1:1 com campaignId UNIQUE).
 * - Cada campanha tem sua propria captacao, repasse, parcelas e recebimentos.
 * - Antes a URL era /founder/startups/:id/financeiro e batia em "repasse mais recente"
 *   da startup (gerando dados cruzados entre campanhas diferentes).
 *
 * Loader: GET /api/founder/campaigns/:campaignId/repasse/dashboard (BFF → backend).
 * Request/Resubmit: POST /api/founder/startups/:startupId/repasse/installments/:installmentId/...
 * (mantido na chave startupId porque e o que o backend espera no createOrResubmit,
 *  mas o startupId vem do response do dashboard — `data.startup.id`).
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const cookieHeader = request.headers.get("cookie") || "";
  const campaignId = params.campaignId;

  const res = await fetch(
    `${BACKEND_URL}/api/founder/campaigns/${campaignId}/repasse/dashboard`,
    {
      headers: { accept: "application/json", cookie: cookieHeader },
    },
  );

  if (res.status === 401 || res.status === 403) {
    return redirect("/founder/dashboard");
  }
  if (res.status === 404) {
    throw new Response("Campanha nao encontrada ou sem permissao", { status: 404 });
  }

  const json = await res.json().catch(() => null);
  return (json?.data ?? json) as RepasseDashboardData;
}

export function meta() {
  return [{ title: "Repasse da Campanha | iSelfToken" }];
}

// ─── Tone helpers ───────────────────────────────────────────────────────────

const REPASSE_STATUS_TONE: Record<Repasse["status"], string> = {
  CONFIGURED: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  IN_PROGRESS: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  COMPLETED: "bg-primary/10 text-primary border-primary/30",
  CANCELLED: "bg-red-500/10 text-red-300 border-red-500/30",
};

const INSTALLMENT_STATUS_TONE: Record<
  Installment["status"],
  { label: string; tone: string }
> = {
  AWAITING_REQUEST: {
    label: "Disponivel",
    tone: "text-primary bg-primary/10",
  },
  REQUESTED: {
    label: "Solicitada",
    tone: "text-amber-400 bg-amber-400/10",
  },
  PROCESSING: {
    label: "Em processamento",
    tone: "text-blue-400 bg-blue-400/10",
  },
  COMPLETED: {
    label: "Paga",
    tone: "text-emerald-400 bg-emerald-400/10",
  },
  REJECTED: {
    label: "Rejeitada",
    tone: "text-red-400 bg-red-400/10",
  },
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function FounderCampaignFinanceiroPage({
  loaderData,
}: {
  loaderData: RepasseDashboardData;
}) {
  const params = useParams<{ campaignId: string }>();
  const revalidator = useRevalidator();
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null);
  const [isResubmit, setIsResubmit] = useState(false);

  if (!loaderData || !loaderData.repasse) {
    return <EmptyRepasseState campaignId={params.campaignId} />;
  }

  const {
    repasse,
    startup,
    installments = [],
    currentInstallment,
    kpis,
  } = loaderData;

  // Bloqueia parcela N se N-1 nao estiver COMPLETED
  const canRequest = (inst: Installment, idx: number): boolean => {
    if (inst.status !== "AWAITING_REQUEST" && inst.status !== "REJECTED")
      return false;
    if (inst.numero === 1) return true;
    const prev = installments.find((i) => i.numero === inst.numero - 1);
    return prev?.status === "COMPLETED";
  };

  const handleOpenForm = (inst: Installment, resubmit: boolean) => {
    setSelectedInstallment(inst);
    setIsResubmit(resubmit);
    setShowForm(true);
  };

  const handleSubmit = async (
    allocationPercents: AllocationPercents,
    observacao: string,
    report?: {
      mensagemInvestidores?: string;
      usoRecurso?: string;
      teveLucro?: boolean | null;
      marcoAlcancado?: boolean | null;
      marcoDescricao?: string;
    },
  ) => {
    if (!selectedInstallment || !startup) return;
    setRequestingId(selectedInstallment.id);
    try {
      const res = await fetch(
        `/api/founder/startups/${startup.id}/repasse/installments/${selectedInstallment.id}/${isResubmit ? "resubmit" : "request"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            allocationPercents,
            observacao: observacao || undefined,
            // FIN-11 §8.2 — Relatorio do Mes.
            mensagemInvestidores: report?.mensagemInvestidores || undefined,
            usoRecurso: report?.usoRecurso || undefined,
            teveLucro: report?.teveLucro ?? undefined,
            marcoAlcancado: report?.marcoAlcancado ?? undefined,
            marcoDescricao: report?.marcoDescricao || undefined,
          }),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        toast.error(data?.message ?? "Erro ao solicitar parcela.");
        return;
      }
      toast.success(
        isResubmit
          ? "Parcela re-submetida!"
          : "Parcela solicitada com sucesso! Relatorio sera publicado na Transparencia apos aprovacao.",
      );
      setShowForm(false);
      setSelectedInstallment(null);
      revalidator.revalidate();
    } catch {
      toast.error("Erro inesperado.");
    } finally {
      setRequestingId(null);
    }
  };

  const installmentsSafe = installments;
  const paidCount = installmentsSafe.filter(
    (i) => i.status === "COMPLETED",
  ).length;
  const proximaParcelaAvailable = installments.find(
    (i) =>
      i.status === "AWAITING_REQUEST" &&
      canRequest(i, installments.indexOf(i)),
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8" data-testid="repasse-financeiro-page">
      {/* Header */}
      <header>
        <Link
          to="/founder/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-[11px] font-black uppercase tracking-widest mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">
              Financeiro da campanha
            </span>
            <h1 className="text-4xl font-black tracking-tighter text-foreground leading-none">
              Repasse de Fundos
            </h1>
            {startup?.nome && (
              <p className="text-sm text-muted-foreground mt-2">
                {startup.nome}
              </p>
            )}
          </div>
          <span
            className={cn(
              "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-widest",
              REPASSE_STATUS_TONE[repasse.status],
            )}
            data-testid="repasse-status-badge"
            data-status={repasse.status}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            {REPASSE_STATUS_LABELS[repasse.status]}
          </span>
        </div>
      </header>

      {/* CTA Solicitar Repasse — aparece quando ha proxima parcela AWAITING_REQUEST elegivel */}
      {proximaParcelaAvailable && (
        <button
          type="button"
          onClick={() => handleOpenForm(proximaParcelaAvailable, false)}
          className="w-full md:w-auto inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity shadow-[0_0_24px_rgba(213,0,249,0.35)]"
          data-testid="cta-solicitar-repasse"
        >
          <Wallet className="w-4 h-4" />
          Solicitar Repasse — Parcela #{proximaParcelaAvailable.numero}
          {formatCurrencyBRL(Number(proximaParcelaAvailable.valor))}
        </button>
      )}

      {/* 4 KPI Cards */}
      <section
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
        data-testid="repasse-financeiro-kpis"
      >
        <KpiCard
          icon={CircleDollarSign}
          label="Total a Receber"
          value={formatCurrencyBRL(Number(kpis.valorTotal ?? 0))}
          testId="kpi-valor-total"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Parcelas"
          value={`${paidCount}/${installmentsSafe.length || 0} concluidas`}
          testId="kpi-parcelas"
        />
        <KpiCard
          icon={Coins}
          label="Recebido ate Agora"
          value={formatCurrencyBRL(Number(kpis.valorPago ?? 0))}
          testId="kpi-valor-pago"
        />
        <KpiCard
          icon={CalendarClock}
          label="Proxima Parcela"
          value={
            kpis.proximaParcela
              ? `#${kpis.proximaParcela.numero} · ${formatCurrencyBRL(
                  Number(kpis.proximaParcela.valor),
                )}`
              : "—"
          }
          testId="kpi-proxima-parcela"
        />
      </section>

      {/* Lista de Parcelas */}
      <section className="space-y-3" data-testid="repasse-financeiro-list">
        <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
          Parcelas
        </h2>
        <div className="space-y-2">
          {installmentsSafe.map((inst, idx) => {
            const tone = INSTALLMENT_STATUS_TONE[inst.status] ??
              INSTALLMENT_STATUS_TONE.AWAITING_REQUEST;
            const isAllowed = canRequest(inst, idx);
            const isBlockedByPrev =
              !isAllowed && inst.status === "AWAITING_REQUEST";
            const eligibility = getInstallmentEligibility({
              installment: inst,
              allInstallments: installmentsSafe,
            });
            // Proxima janela em que a parcela N+1 podera ser solicitada.
            // Regra do backend: parcela fica disponivel (scheduledDate - 10d).
            const nextInst = installmentsSafe.find(
              (i) => i.numero === inst.numero + 1,
            );
            const nextWindowDate = nextInst?.scheduledDate
              ? new Date(
                  new Date(nextInst.scheduledDate).getTime() -
                    REPASSE_JANELA_ANTECEDENCIA_DIAS * 86_400_000,
                )
              : null;

            return (
              <div
                key={inst.id}
                className={cn(
                  "flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4",
                  isBlockedByPrev && "opacity-50",
                )}
                data-testid={`installment-row-${inst.id}`}
              >
                <div className={cn("p-2 rounded-lg", tone.tone)}>
                  <StatusIcon status={inst.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">
                      Parcela #{inst.numero}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                        tone.tone,
                      )}
                    >
                      {tone.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatCurrencyBRL(Number(inst.valor))}
                    {inst.paidAt &&
                      ` · Pago em ${new Date(inst.paidAt).toLocaleDateString("pt-BR")}`}
                    {inst.status === "REJECTED" &&
                      " · Rejeitada — re-submeta para continuar"}
                  </p>
                  {inst.status === "AWAITING_REQUEST" && (
                    <p
                      className="text-[11px] text-primary/80 mt-1 font-bold"
                      data-testid={`installment-window-${inst.id}`}
                    >
                      {eligibility.kind === "ready" &&
                        `Disponivel para solicitacao · Pagamento previsto em ${formatDateOnlyBR(inst.scheduledDate)}`}
                      {eligibility.kind === "awaiting-window" &&
                        `Disponivel em ${formatDateOnlyBR(eligibility.earliestDate.toISOString())} (faltam ${eligibility.daysRemaining} dia${eligibility.daysRemaining === 1 ? "" : "s"})`}
                      {eligibility.kind === "awaiting-prev" &&
                        `Disponivel apos pagamento da parcela #${eligibility.prevNumero}`}
                      {eligibility.kind === "no-date" &&
                        "Sem data prevista — aguarde o financeiro configurar"}
                    </p>
                  )}
                  {inst.status === "COMPLETED" && nextInst && nextWindowDate && (
                    <p
                      className="text-[11px] text-emerald-400/80 mt-1 font-bold"
                      data-testid={`installment-next-window-${inst.id}`}
                    >
                      Proxima solicitacao disponivel em{" "}
                      {formatDateOnlyBR(nextWindowDate.toISOString())}
                      {" "}(parcela #{nextInst.numero})
                    </p>
                  )}
                </div>
                {isAllowed && inst.status === "AWAITING_REQUEST" && (
                  <button
                    onClick={() => handleOpenForm(inst, false)}
                    className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider hover:bg-primary/20 transition-colors"
                    data-testid={`btn-solicitar-parcela-${inst.id}`}
                  >
                    Solicitar
                  </button>
                )}
                {isAllowed && inst.status === "REJECTED" && (
                  <button
                    onClick={() => handleOpenForm(inst, true)}
                    className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
                    data-testid={`btn-resubmit-parcela-${inst.id}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Re-submeter
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Formulario de Solicitacao */}
      {showForm && selectedInstallment && startup && (
        <AllocationForm
          installment={selectedInstallment}
          isResubmit={isResubmit}
          isSubmitting={requestingId === selectedInstallment.id}
          previousReport={
            isResubmit
              ? installments
                  .find((i) => i.id === selectedInstallment.id)
                  ?.request ?? null
              : null
          }
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setSelectedInstallment(null);
          }}
        />
      )}

      {/* Card de detalhe da solicitacao atual (se houver) */}
      {currentInstallment && currentInstallment.status === "REQUESTED" && (
        <section
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-2"
          data-testid="current-request-card"
        >
          <div className="flex items-center gap-2 font-black text-sm text-amber-200">
            <Hourglass className="w-4 h-4" />
            Solicitacao da parcela #{currentInstallment.installmentId} em
            analise
          </div>
          <p className="text-xs text-amber-200/80">
            Enviada em{" "}
            <strong>
              {new Date(currentInstallment.submittedAt).toLocaleString("pt-BR")}
            </strong>
            . Aguarde ate{" "}
            {new Date(currentInstallment.tsLimitePagamento).toLocaleDateString(
              "pt-BR",
            )}{" "}
            (5 dias uteis).
          </p>
        </section>
      )}
    </div>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  testId,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div
      className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
      data-testid={testId}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-lg font-black text-foreground tabular-nums truncate" title={value}>
        {value}
      </p>
    </div>
  );
}

function StatusIcon({ status }: { status: Installment["status"] }) {
  switch (status) {
    case "AWAITING_REQUEST":
      return <Banknote className="w-4 h-4" />;
    case "REQUESTED":
      return <Send className="w-4 h-4" />;
    case "PROCESSING":
      return <Clock className="w-4 h-4" />;
    case "COMPLETED":
      return <CheckCircle2 className="w-4 h-4" />;
    case "REJECTED":
      return <XCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

function EmptyRepasseState({ campaignId }: { campaignId?: string }) {
  return (
    <div
      className="max-w-4xl mx-auto space-y-6"
      data-testid="repasse-empty-state"
    >
      <Link
        to="/founder/dashboard"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-[11px] font-black uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
      </Link>
      <div className="text-center py-20 space-y-4">
        <Banknote className="w-12 h-12 text-primary/40 mx-auto" />
        <h2 className="text-xl font-black text-foreground">
          Repasse ainda nao configurado
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Esta campanha ainda nao tem um repasse configurado. Ele sera criado
          apos o Compliance deliberar o numero de parcelas e o Financeiro
          configurar o valor por parcela. Voce sera notificado quando estiver
          disponivel para solicitacao.
        </p>
        <p className="text-[10px] text-muted-foreground/60 max-w-sm mx-auto">
          Campanha #{campaignId} · aguarde a liberacao do financeiro.
        </p>
      </div>
    </div>
  );
}

function AllocationForm({
  installment,
  isResubmit,
  isSubmitting,
  previousReport,
  onSubmit,
  onCancel,
}: {
  installment: Installment;
  isResubmit: boolean;
  isSubmitting: boolean;
  /** Solicitacao anterior (rejeitada) para pre-preencher o Relatorio do Mes. */
  previousReport?: InstallmentRequest | null;
  onSubmit: (
    alloc: AllocationPercents,
    obs: string,
    report?: MonthlyReportValues,
  ) => void;
  onCancel: () => void;
}) {
  const [alloc, setAlloc] = useState<AllocationPercents>({
    marketing: 0,
    desenvolvimento: 0,
    infraestrutura: 0,
    pessoal: 0,
    juridico: 0,
    operacional: 0,
    reservaCaixa: 0,
  });
  const [observacao, setObservacao] = useState("");
  const [report, setReport] = useState<MonthlyReportValues>({
    mensagemInvestidores: previousReport?.mensagemInvestidores ?? "",
    usoRecurso: previousReport?.usoRecurso ?? "",
    teveLucro: previousReport?.teveLucro ?? null,
    marcoAlcancado: previousReport?.marcoAlcancado ?? null,
    marcoDescricao: previousReport?.marcoDescricao ?? "",
  });

  const total = Object.values(alloc).reduce((s, v) => s + v, 0);
  const isValid = isAllocationValid(alloc);
  // Quando a soma >= 100, cada campo trava em seu valor atual
  // (so permite diminuir para redistribuir).
  const locked = total >= 100 - 0.01;

  /**
   * Limita o valor digitado para que a soma total nao passe de 100%.
   * - Se o user esta DIMINUINDO: aceita o valor (desde que >= 0).
   * - Se o user esta AUMENTANDO: clampa ao headroom disponivel
   *   (100 - soma dos outros campos).
   */
  function clampAdjustment(
    key: keyof AllocationPercents,
    requested: number,
  ): number {
    const current = alloc[key] ?? 0;
    const othersSum = total - current;
    let desired = Number.isFinite(requested) ? requested : current;
    desired = Math.max(0, Math.min(100, desired));
    if (desired <= current) return desired;
    const headroom = 100 - othersSum;
    return Math.min(desired, Math.max(0, headroom));
  }

  function handleChange(
    key: keyof AllocationPercents,
    raw: string,
  ) {
    if (raw === "") {
      setAlloc((prev) => ({ ...prev, [key]: 0 }));
      return;
    }
    const parsed = Number(raw.replace(",", "."));
    if (Number.isNaN(parsed)) return;
    const clamped = clampAdjustment(key, parsed);
    setAlloc((prev) => ({ ...prev, [key]: clamped }));
  }

  /**
   * Defesa em profundidade no submit: alem do `disabled` no botao, valida
   * o payload com o schema Zod (mesmo do `RepasseInstallmentForm`) ANTES
   * de chamar `onSubmit`. Garante que o backend nunca receba uma solicitacao
   * com soma != 100% mesmo se o botao for acionado por outro caminho.
   */
  function handleSubmit() {
    if (isSubmitting) return;
    const parsed = installmentRequestSchema.safeParse({
      allocationPercents: alloc,
      observacao: observacao.trim() || undefined,
      mensagemInvestidores: report.mensagemInvestidores.trim() || undefined,
      usoRecurso: report.usoRecurso.trim() || undefined,
      teveLucro: report.teveLucro ?? undefined,
      marcoAlcancado: report.marcoAlcancado ?? undefined,
      marcoDescricao: report.marcoDescricao.trim() || undefined,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Dados invalidos";
      toast.error(first);
      return;
    }
    onSubmit(
      parsed.data.allocationPercents,
      parsed.data.observacao ?? "",
      report,
    );
  }

  const labels: Record<keyof AllocationPercents, string> = {
    marketing: "Marketing",
    desenvolvimento: "Desenvolvimento",
    infraestrutura: "Infraestrutura",
    pessoal: "Pessoal",
    juridico: "Juridico",
    operacional: "Operacional",
    reservaCaixa: "Reserva de Caixa",
  };

  return (
    <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 space-y-5">
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
          {isResubmit ? "Re-submeter" : "Solicitar"} Parcela #
          {installment.numero}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Valor: {formatCurrencyBRL(Number(installment.valor))} · Distribua os
          recursos (soma = 100%)
        </p>
      </div>

      <RepasseEducacionalTips defaultOpen={["marketing"]} />

      {/* FIN-11 §8.2 — Relatorio do Mes. Aparece ANTES da alocacao por %
          para incentivar o fundador a pensar na destinacao antes de
          distribuir os percentuais. */}
      <RepasseMonthlyReportFields
        defaultValues={{
          mensagemInvestidores: previousReport?.mensagemInvestidores ?? "",
          usoRecurso: previousReport?.usoRecurso ?? "",
          teveLucro: previousReport?.teveLucro ?? null,
          marcoAlcancado: previousReport?.marcoAlcancado ?? null,
          marcoDescricao: previousReport?.marcoDescricao ?? "",
        }}
        onChange={setReport}
        isSubmitting={isSubmitting}
      />

      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        data-testid="allocation-grid"
      >
        {(Object.keys(alloc) as Array<keyof AllocationPercents>).map((key) => {
          const current = alloc[key] ?? 0;
          // Quando soma >= 100, o max do campo = valor atual
          // (so permite diminuir). Senao, max = 100 individual.
          const fieldMax = locked ? current : 100;
          return (
            <div key={key}>
              <label
                htmlFor={`alloc-${key}`}
                className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 block mb-1"
              >
                {labels[key]}
              </label>
              <div className="relative">
                <input
                  id={`alloc-${key}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={fieldMax}
                  step={0.5}
                  value={current || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  data-testid={`alloc-input-${key}`}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground font-bold focus:outline-none focus:border-primary/40 pr-8 tabular-nums"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "text-xs font-bold",
            isValid ? "text-emerald-400" : "text-red-400",
          )}
          data-testid="allocation-total"
        >
          Total: {total}%
        </span>
        {!isValid && (
          <span className="text-[10px] text-red-400">
            A soma deve ser exatamente 100%
          </span>
        )}
        {locked && (
          <span className="text-[10px] text-emerald-400/80">
            · alocacao completa — diminua um campo para redistribuir
          </span>
        )}
      </div>

      <div>
        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 block mb-1">
          Observacao (opcional)
        </label>
        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Justificativa ou detalhes sobre o uso dos recursos..."
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30 resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          title={
            !isValid
              ? "Ajuste os percentuais para que a soma fique exatamente 100%"
              : undefined
          }
          data-testid="submit-alloc-button"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {isResubmit ? "Re-submeter" : "Solicitar Parcela"}
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground font-bold uppercase tracking-wider"
        >
          Cancelar
        </button>
      </div>
    </section>
  );
}
