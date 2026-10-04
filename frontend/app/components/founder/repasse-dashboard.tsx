import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Coins,
  Hourglass,
  Lock,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RepasseSlaCountdown } from "~/components/foundation/repasse-sla-countdown";
import { useRepasseDashboard } from "~/hooks/use-repasse-dashboard";
import { formatCurrencyBRL } from "~/lib/currency-format";
import { formatDateOnlyBR } from "~/lib/date-utils";
import {
  getInstallmentEligibility,
  type InstallmentEligibility,
} from "~/lib/repasse-eligibility";
import { cn } from "~/lib/utils";
import {
  REPASSE_STATUS_LABELS,
  type Installment,
  type Repasse,
  type RepasseDashboardData,
  type RepasseStatus,
} from "~/types/repasse";
import { RepasseHistory } from "./repasse-history";
import { RepasseInstallmentForm } from "./repasse-installment-form";
import { RepasseStepper } from "./repasse-stepper";

const REPASSE_STATUS_TONE: Record<RepasseStatus, string> = {
  CONFIGURED: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  IN_PROGRESS: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  COMPLETED: "bg-primary/10 text-primary border-primary/30",
  CANCELLED: "bg-red-500/10 text-red-300 border-red-500/30",
};

const PROGRESS_TONE = (i: number): string => {
  if (i >= 80) return "bg-emerald-500";
  if (i >= 40) return "bg-amber-400";
  return "bg-red-500";
};

export interface RepasseDashboardProps {
  startupId: number | string;
  data: RepasseDashboardData | null;
}

/**
 * @description Dashboard consolidado do Repasse do Fundador.
 * Header com nome+status, 4 KPI cards, stepper vertical e detalhe
 * da parcela selecionada. Historico das ultimas 5 solicitacoes.
 *
 * YAGNI: nao encapsula fetch — o pai passa `data` (loader ou hook).
 * Client-side: useRepasseDashboard (polling 60s) atualiza automaticamente
 * quando ha solicitacao ativa.
 */
export function RepasseDashboard({ startupId, data }: RepasseDashboardProps) {
  // Client-side polling: atualiza automaticamente a cada 60s quando ha solicitacao ativa
  const { data: liveData } = useRepasseDashboard(startupId);
  const dashData = liveData ?? data;

  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null);

  useEffect(() => {
    if (dashData?.currentInstallment && !selectedInstallment) {
      const matched = dashData.installments?.find(
        (i: Installment) => i.id === dashData.currentInstallment!.installmentId,
      );
      if (matched) setSelectedInstallment(matched);
    }
  }, [
    dashData?.currentInstallment,
    dashData?.installments,
    selectedInstallment,
  ]);

  if (!dashData) {
    return (
      <div
        className="rounded-2xl border border-dashed border-border/40 p-10 text-center"
        data-testid="repasse-dashboard-empty"
      >
        <p className="text-sm text-muted-foreground">
          Nenhum repasse disponivel para esta startup ainda.
        </p>
      </div>
    );
  }

  const {
    repasse,
    startup,
    installments,
    currentInstallment,
    kpis,
    ultimasSolicitacoes,
  } = dashData;
  const installmentsSafe = installments ?? [];
  const paidCount = installmentsSafe.filter(
    (i: Installment) => i.status === "COMPLETED",
  ).length;
  const progress =
    installmentsSafe.length === 0
      ? 0
      : Math.round((paidCount / installmentsSafe.length) * 100);

  return (
    <div className="space-y-6" data-testid="repasse-dashboard">
      {/* Header */}
      <header
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        data-testid="repasse-dashboard-header"
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-1">
            repasse de fundos
          </p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter">
            {startup?.nome ?? `Startup #${startupId}`}
          </h1>
        </div>
        {repasse && (
          <span
            className={cn(
              "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-widest",
              REPASSE_STATUS_TONE[repasse.status as RepasseStatus],
            )}
            data-testid="repasse-status-badge"
            data-status={repasse.status}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            {REPASSE_STATUS_LABELS[repasse.status as RepasseStatus]}
          </span>
        )}
      </header>

      {/* KPI Cards */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
        data-testid="repasse-kpis"
      >
        <KpiCard
          icon={CircleDollarSign}
          label="Valor Total a Receber"
          value={formatCurrencyBRL(Number(kpis.valorTotal))}
          testId="kpi-valor-total"
        />

        <KpiCard
          icon={CheckCircle2}
          label="Parcelas"
          value={`${paidCount}/${installmentsSafe.length || 0} concluidas`}
          footer={
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-accent/30">
              <div
                className={cn("h-full transition-all", PROGRESS_TONE(progress))}
                style={{ width: `${progress}%` }}
                data-testid="kpi-progress"
                data-progress={progress}
              />
            </div>
          }
          testId="kpi-parcelas"
        />

        <KpiCard
          icon={Coins}
          label="Valor Recebido ate Agora"
          value={formatCurrencyBRL(Number(kpis.valorPago))}
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
          footer={
            currentInstallment?.status === "REQUESTED" ? (
              <div className="mt-2">
                <RepasseSlaCountdown
                  submittedAt={currentInstallment.submittedAt ?? ""}
                  inline
                />
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-2">
                {kpis.proximaParcela?.scheduledDate
                  ? `Previsao: ${formatDateOnlyBR(kpis.proximaParcela.scheduledDate)}`
                  : "Sem previsao"}
              </p>
            )
          }
          testId="kpi-proxima-parcela"
        />
      </div>

      {/* Stepper + Detalhe */}
      <section
        className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4"
        data-testid="repasse-stepper-section"
      >
        <div className="rounded-2xl border border-border/40 bg-card/40 p-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
            Parcelas
          </h2>
          <RepasseStepper
            installments={installmentsSafe}
            selectedId={selectedInstallment?.id ?? null}
            onSelect={setSelectedInstallment}
          />
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/40 p-4 min-h-[320px]">
          {selectedInstallment ? (
            <InstallmentDetail
              startupId={startupId}
              installment={selectedInstallment}
              allInstallments={installmentsSafe}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Selecione uma parcela ao lado para ver o detalhe.
            </div>
          )}
        </div>
      </section>

      <RepasseHistory solicitacoes={ultimasSolicitacoes ?? []} />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  footer,
  testId,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  footer?: React.ReactNode;
  testId?: string;
}) {
  return (
    <div
      className="rounded-2xl border border-border/40 bg-card/60 p-4"
      data-testid={testId}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="text-lg font-black tabular-nums truncate" title={value}>
        {value}
      </div>
      {footer}
    </div>
  );
}

function InstallmentDetail({
  startupId,
  installment,
  allInstallments,
}: {
  startupId: number | string;
  installment: Installment;
  allInstallments: Installment[];
}) {
  const request = installment.request;
  const detailId = `installment-detail-${installment.id}`;
  const valorBRL = formatCurrencyBRL(Number(installment.valor));
  const [showResubmitForm, setShowResubmitForm] = useState(false);

  // Sprint S34-g — recalcula elegibilidade para mostrar card explicativo
  // quando a parcela estiver bloqueada (regra sequencial ou janela).
  const eligibility = useMemo(
    () =>
      getInstallmentEligibility({
        installment,
        allInstallments,
      }),
    [installment, allInstallments],
  );

  return (
    <div className="space-y-3" data-testid={detailId}>
      <header className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-black">
            Parcela #{installment.numero} · {valorBRL}
          </h3>
          <p className="text-xs text-muted-foreground">
            {installment.scheduledDate
              ? `Previsao: ${formatDateOnlyBR(installment.scheduledDate)}`
              : "Sem data prevista"}
          </p>
        </div>
      </header>

      {/* Sprint S34-g — card explicativo de bloqueio. Aparece quando a
          parcela NAO pode ser solicitada HOJE (regra sequencial, janela
          ou ja tem solicitacao). Exibe o motivo + dados relevantes. */}
      {installment.status === "AWAITING_REQUEST" &&
        (eligibility.kind === "awaiting-prev" ||
          eligibility.kind === "awaiting-window" ||
          eligibility.kind === "no-date") && (
          <BlockedNotice
            installment={installment}
            eligibility={eligibility}
          />
        )}

      {installment.status === "AWAITING_REQUEST" &&
        eligibility.kind === "ready" && (
          <RepasseInstallmentForm
            startupId={startupId}
            installment={installment}
            bankInfoSnapshot={
              request?.bankInfoSnapshot ?? {
                banco: "",
                agencia: "",
                conta: "",
                tipoConta: "CORRENTE",
              }
            }
          />
        )}

      {installment.status === "REQUESTED" && (
        <div className="space-y-3">
          <RepasseSlaCountdown submittedAt={request?.submittedAt ?? ""} />
          {request && (
            <div className="rounded-2xl border border-border/40 bg-accent/20 p-4 space-y-2">
              <p className="text-sm">
                Solicitacao enviada em{" "}
                <strong>
                  {new Date(request.submittedAt).toLocaleString("pt-BR")}
                </strong>
                .
              </p>
              {request.observacao && (
                <blockquote className="text-sm border-l-2 border-primary/40 pl-3 italic text-muted-foreground">
                  {request.observacao}
                </blockquote>
              )}
              <p className="text-xs text-muted-foreground">
                Aguardando analise do Financeiro. Receba em ate 5 dias uteis.
              </p>
            </div>
          )}
        </div>
      )}

      {installment.status === "REJECTED" && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-300 font-black">
              <Hourglass className="h-4 w-4" /> Solicitacao rejeitada
            </div>
            {request?.rejectionReason && (
              <p className="text-sm text-red-200">{request.rejectionReason}</p>
            )}
            {!showResubmitForm && (
              <button
                type="button"
                onClick={() => setShowResubmitForm(true)}
                className="text-xs font-black uppercase tracking-widest text-primary hover:underline"
                data-testid="resubmit-installment"
              >
                Reenviar solicitacao
              </button>
            )}
          </div>

          {showResubmitForm && (
            <RepasseInstallmentForm
              startupId={startupId}
              installment={installment}
              bankInfoSnapshot={
                request?.bankInfoSnapshot ?? {
                  banco: "",
                  agencia: "",
                  conta: "",
                  tipoConta: "CORRENTE",
                }
              }
              onResubmit
              defaultAllocation={request?.allocationPercents ?? undefined}
              defaultObservacao={request?.observacao ?? undefined}
              onSuccess={() => setShowResubmitForm(false)}
            />
          )}
        </div>
      )}

      {(installment.status === "PROCESSING" ||
        installment.status === "COMPLETED") && (
        <div className="rounded-2xl border border-border/40 bg-accent/20 p-4 space-y-2">
          <div className="flex items-center gap-2 font-black text-sm">
            {installment.status === "COMPLETED" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <Clock className="h-4 w-4 text-amber-400" />
            )}
            {installment.status === "COMPLETED"
              ? "Pagamento concluido"
              : "Em processamento"}
          </div>
          {request && (
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>
                Valor enviado: R$ {Number(request.valorSolicitado).toFixed(2)}
              </li>
              <li>
                Alocacao:{" "}
                {Object.entries(request.allocationPercents)
                  .filter(([, v]) => (v as number) > 0)
                  .map(([k, v]) => `${k} ${v}%`)
                  .join(" · ")}
              </li>
            </ul>
          )}
        </div>
      )}

      <BankIconFooter installment={installment} />
    </div>
  );
}

/**
 * Sprint S34-g — card visual explicando por que a parcela esta
 * bloqueada. Aparece quando o status AWAITING_REQUEST mas a regra
 * sequencial (N-1 nao COMPLETED) ou a janela de 10 dias bloqueiam.
 */
function BlockedNotice({
  installment,
  eligibility,
}: {
  installment: Installment;
  eligibility: InstallmentEligibility;
}) {
  if (eligibility.kind === "awaiting-window") {
    return (
      <div
        className="flex items-start gap-3 rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 py-4 text-sky-200"
        data-testid="installment-blocked-window"
        role="status"
      >
        <Lock className="h-5 w-5 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-black">Janela de solicitação ainda nao abriu</p>
          <p className="text-xs mt-1 opacity-90">
            {eligibility.label} (faltam {eligibility.daysRemaining} dia
            {eligibility.daysRemaining === 1 ? "" : "s"}). Solicite apenas
            a partir de {new Date(eligibility.earliestDate).toLocaleDateString("pt-BR")}.
          </p>
        </div>
      </div>
    );
  }

  if (eligibility.kind === "awaiting-prev") {
    return (
      <div
        className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-amber-200"
        data-testid="installment-blocked-prev"
        role="status"
      >
        <Lock className="h-5 w-5 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-black">Aguarde a parcela anterior ser paga</p>
          <p className="text-xs mt-1 opacity-90">
            A parcela #{eligibility.prevNumero} precisa ser concluida (status
            COMPLETED) antes que a #{installment.numero} possa ser solicitada.
            O cron diario valida esse gate automaticamente.
          </p>
        </div>
      </div>
    );
  }

  // no-date
  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-border/40 bg-accent/20 px-4 py-4 text-muted-foreground"
      data-testid="installment-no-date"
      role="status"
    >
      <Lock className="h-5 w-5 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-black">Sem data prevista</p>
        <p className="text-xs mt-1 opacity-90">
          Esta parcela ainda nao possui scheduledDate. Aguarde o financeiro
          configurar o repasse.
        </p>
      </div>
    </div>
  );
}

function BankIconFooter({ installment }: { installment: Installment }) {
  if (!installment.request?.bankInfoSnapshot) return null;
  return (
    <p className="text-[10px] text-muted-foreground border-t border-border/40 pt-2">
      <Banknote className="inline h-3 w-3 mr-1" />
      Destino: {installment.request.bankInfoSnapshot.banco} · ag.{" "}
      {installment.request.bankInfoSnapshot.agencia} · cc.{" "}
      {installment.request.bankInfoSnapshot.conta}
    </p>
  );
}
