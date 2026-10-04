import { CheckCircle2, Clock, Loader2, RotateCcw, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateSolicitacao } from "~/hooks/use-create-solicitacao";
import { useResubmitSolicitacao } from "~/hooks/use-resubmit-solicitacao";
import { formatCurrencyBRL } from "~/lib/currency-format";
import { formatDateOnlyBR } from "~/lib/date-utils";
import { installmentRequestSchema } from "~/lib/repasse-schemas";
import { cn } from "~/lib/utils";
import type {
  AllocationPercents,
  BankInfoSnapshot,
  Installment,
  InstallmentRequest,
} from "~/types/repasse";
import {
  RepasseMonthlyReportFields,
  type MonthlyReportValues,
} from "./repasse-monthly-report-fields";
import { RepasseAllocationInput } from "./repasse-allocation-input";
import { RepasseEducacionalTips } from "./repasse-educacional-tips";

const ALLOCATION_ZERO: AllocationPercents = {
  marketing: 0,
  desenvolvimento: 0,
  infraestrutura: 0,
  pessoal: 0,
  juridico: 0,
  operacional: 0,
  reservaCaixa: 0,
};

const OBSERVACAO_PLACEHOLDER =
  "Ex: Vou contratar 1 senior backend por 2 meses para acelerar o refactor do motor de busca. A reserva cobre o runway ate a proxima milestone.";
const OBSERVACAO_MAX = 1000;

/**
 * Valores iniciais do Relatorio do Mes (FIN-11 §8.2) usados para
 * pre-preencher o form em re-submits. Se a solicitacao anterior ja
 * tinha `mensagemInvestidores`, mantemos como defaultValue.
 */
function getReportDefaults(req?: InstallmentRequest | null): Partial<MonthlyReportValues> {
  if (!req) return {};
  return {
    mensagemInvestidores: req.mensagemInvestidores ?? "",
    usoRecurso: req.usoRecurso ?? "",
    teveLucro: req.teveLucro ?? null,
    marcoAlcancado: req.marcoAlcancado ?? null,
    marcoDescricao: req.marcoDescricao ?? "",
  };
}

/**
 * Sprint S34-f — janela de antecedência para o fundador poder solicitar
 * uma parcela. Deve casar com REPASSE_JANELA_ANTECEDENCIA_DIAS no backend.
 * Parcela fica disponível para solicitação a partir de (scheduledDate - 10d).
 */
const REPASSE_JANELA_ANTECEDENCIA_DIAS = 10;

type AvailabilityStatus =
  | { kind: "ready"; label: string }
  | { kind: "blocked"; label: string; daysRemaining: number; earliestDate: Date }
  | { kind: "no-date"; label: string };

function getAvailabilityStatus(
  scheduledDate: string | null,
  now: Date = new Date(),
): AvailabilityStatus {
  if (!scheduledDate) {
    return { kind: "no-date", label: "Sem data prevista" };
  }
  const scheduled = new Date(scheduledDate);
  const earliest = new Date(scheduled);
  earliest.setUTCDate(
    earliest.getUTCDate() - REPASSE_JANELA_ANTECEDENCIA_DIAS,
  );
  if (now < earliest) {
    const daysRemaining = Math.ceil(
      (earliest.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      kind: "blocked",
      label: `Disponível para solicitação em ${formatDateOnlyBR(earliest.toISOString())}`,
      daysRemaining,
      earliestDate: earliest,
    };
  }
  return {
    kind: "ready",
    label: `Previsao de pagamento: ${formatDateOnlyBR(scheduled.toISOString())}`,
  };
}

function dateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export interface RepasseInstallmentFormProps {
  startupId: number | string;
  installment: Installment;
  bankInfoSnapshot: BankInfoSnapshot;
  onResubmit?: boolean;
  /** Dados da última solicitação rejeitada para pré-preencher o form */
  defaultAllocation?: AllocationPercents;
  defaultObservacao?: string;
  /**
   * Solicitacao anterior (rejeitada ou completa) para pre-preencher
   * o Relatorio do Mes. Usado em re-submits para nao perder o trabalho
   * do fundador.
   */
  defaultReport?: InstallmentRequest | null;
  onSuccess?: (req: InstallmentRequest) => void;
}

/**
 * @description Formulario completo de solicitacao de uma parcela.
 * Inclui dicas educacionais, valor readonly, banco readonly,
 * alocacao por % (7 campos), observacao e submit.
 *
 * Fluxo:
 * 1. Founder preenche alocacao (slider + number, soma deve = 100)
 * 2. Adiciona observacao opcional (max 1000 chars)
 * 3. Click em "Solicitar Parcela" -> mutation -> toast verde com SLA
 */
export function RepasseInstallmentForm({
  startupId,
  installment,
  bankInfoSnapshot,
  onResubmit = false,
  defaultAllocation,
  defaultObservacao,
  defaultReport,
  onSuccess,
}: RepasseInstallmentFormProps) {
  const [allocation, setAllocation] = useState<AllocationPercents>(
    defaultAllocation ?? ALLOCATION_ZERO,
  );
  const [observacao, setObservacao] = useState(defaultObservacao ?? "");
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReportValues>(
    getReportDefaults(defaultReport) as MonthlyReportValues,
  );
  const [submitted, setSubmitted] = useState<{
    submittedAt: string;
    tsLimitePagamento: string;
  } | null>(null);

  // Sprint S34-f — verifica janela de solicitação da parcela.
  // Bloqueia o form se ainda não estiver dentro da janela de 10 dias
  // antes do scheduledDate.
  const availability = getAvailabilityStatus(installment.scheduledDate);
  const isBlocked = availability.kind === "blocked";

  const createMutation = useCreateSolicitacao(startupId);
  const resubmitMutation = useResubmitSolicitacao(startupId);
  const mutation = onResubmit ? resubmitMutation : createMutation;

  const obsRestante = OBSERVACAO_MAX - observacao.length;

  function payload() {
    return {
      allocationPercents: allocation,
      observacao: observacao.trim() || undefined,
      // FIN-11 §8.2 — Relatorio do Mes. So envia quando o fundador
      // preencheu alguma coisa; nunca envia `false`/`null` "vazios"
      // explicitamente (backend trata trimOpt).
      mensagemInvestidores: monthlyReport.mensagemInvestidores.trim() || undefined,
      usoRecurso: monthlyReport.usoRecurso.trim() || undefined,
      teveLucro: monthlyReport.teveLucro ?? undefined,
      marcoAlcancado: monthlyReport.marcoAlcancado ?? undefined,
      marcoDescricao: monthlyReport.marcoDescricao.trim() || undefined,
    };
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mutation.isPending) return;

    // Defense-in-depth: cross-field validation do Relatorio do Mes
    // (FIN-11 §8.2). Backend tambem valida — redundancia intencional
    // para evitar 400 quando o fundador envia dados quebrados.
    if (monthlyReport.marcoDescricao.trim() && monthlyReport.marcoAlcancado !== true) {
      toast.error("Descricao do marco exige 'Atingiu algum marco? = Sim'");
      return;
    }
    if (
      monthlyReport.marcoAlcancado === true &&
      !monthlyReport.marcoDescricao.trim()
    ) {
      toast.error("Se voce atingiu um marco, descreva-o");
      return;
    }

    const parsed = installmentRequestSchema.safeParse(payload());
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Dados invalidos";
      toast.error(first);
      return;
    }

    try {
      const req = await mutation.mutateAsync({
        installmentId: installment.id,
        payload: parsed.data,
      });
      setSubmitted({
        submittedAt: req.submittedAt,
        tsLimitePagamento: req.tsLimitePagamento,
      });
      if (!onResubmit) {
        toast.success(
          `Solicitacao enviada! Prazo: ate ${dateBR(req.tsLimitePagamento)} (5 dias uteis). Relatorio sera publicado na Transparencia apos aprovacao.`,
        );
      }
      onSuccess?.(req);
    } catch {
      // toast ja tratado pelo hook
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit}
      data-testid="repasse-installment-form"
      data-installment-id={installment.id}
    >
      <RepasseEducacionalTips defaultOpen={["marketing"]} />

      {/* Dados do Repasse (readonly) */}
      <section className="space-y-3 rounded-2xl border border-border/40 bg-card/60 p-5">
        <header className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Dados do Repasse
          </h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">
            Parcela #{installment.numero}
          </span>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-accent/20 p-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
              Valor da Parcela
            </span>
            <span
              className="text-xl font-black tabular-nums text-foreground"
              data-testid="installment-valor"
            >
              {formatCurrencyBRL(Number(installment.valor))}
            </span>
            <span className="block text-[10px] text-muted-foreground mt-1">
              {installment.scheduledDate
                ? `Previsao: ${formatDateOnlyBR(installment.scheduledDate)}`
                : "Sem data prevista"}
            </span>
          </div>

          <div className="rounded-xl bg-accent/20 p-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
              Banco / Agencia / Conta
            </span>
            <span className="block font-bold tabular-nums">
              {bankInfoSnapshot.banco || "—"} · ag.{" "}
              {bankInfoSnapshot.agencia || "—"} · cc.{" "}
              {bankInfoSnapshot.conta || "—"} ({bankInfoSnapshot.tipoConta})
            </span>
            <span className="block text-[10px] text-muted-foreground mt-1">
              Da startup, editaveis em /founder/startups/{startupId}
              /edit/bancario
            </span>
          </div>
        </div>
      </section>

      {/* FIN-11 §8.2 — Relatorio do Mes. Aparece ANTES da alocacao para
          incentivar o fundador a pensar na destinacao antes de distribuir
          os percentuais. Estado interno gerenciado pelo componente. */}
      <RepasseMonthlyReportFields
        defaultValues={getReportDefaults(defaultReport)}
        onChange={setMonthlyReport}
        isSubmitting={mutation.isPending}
        disabled={isBlocked}
      />

      {/* Alocacao */}
      <section className="space-y-3 rounded-2xl border border-border/40 bg-card/60 p-5">
        <header>
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Alocacao dos Recursos (%)
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Distribuicao obrigatoria somando 100%. Use o slider ou digite
            diretamente.
          </p>
        </header>

        <RepasseAllocationInput
          value={allocation}
          onChange={setAllocation}
          valorParcela={installment.valor}
        />
      </section>

      {/* Observacao */}
      <section className="space-y-3 rounded-2xl border border-border/40 bg-card/60 p-5">
        <label
          htmlFor="observacao"
          className="text-xs font-black uppercase tracking-widest text-muted-foreground block"
        >
          Observacao (opcional)
        </label>
        <textarea
          id="observacao"
          value={observacao}
          onChange={(e) =>
            setObservacao(e.target.value.slice(0, OBSERVACAO_MAX))
          }
          placeholder={OBSERVACAO_PLACEHOLDER}
          maxLength={OBSERVACAO_MAX}
          rows={4}
          className="w-full bg-transparent border border-border/40 rounded-xl px-3 py-2 text-sm resize-none"
          data-testid="installment-observacao"
        />
        <p
          className={cn(
            "text-[10px] text-right tabular-nums",
            obsRestante < 50 ? "text-amber-400" : "text-muted-foreground",
          )}
        >
          {obsRestante} caracteres restantes
        </p>
      </section>

      {/* Submit */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="submit"
          disabled={mutation.isPending || isBlocked}
          title={
            isBlocked
              ? `Disponível em ${(availability as { daysRemaining: number }).daysRemaining} dia(s)`
              : undefined
          }
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black uppercase tracking-widest",
            "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(213,0,249,0.25)]",
            "hover:opacity-90 active:scale-95 transition",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          data-testid="submit-installment"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : onResubmit ? (
            <RotateCcw className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {onResubmit ? "Reenviar Solicitacao" : "Solicitar Parcela"}
        </button>
      </div>

      {/* Sprint S34-f — banner de janela bloqueada. Aparece quando o
          scheduledDate - 10 dias > now. Exibe countdown + data exata. */}
      {isBlocked && (
        <div
          className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-amber-300"
          data-testid="installment-blocked-banner"
          role="status"
        >
          <Clock className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-black">Aguardando janela de solicitação</p>
            <p className="text-xs mt-1 opacity-90">
              {availability.label}
              {" "}
              (faltam {(availability as { daysRemaining: number }).daysRemaining}{" "}
              dia{(availability as { daysRemaining: number }).daysRemaining === 1 ? "" : "s"}).
            </p>
          </div>
        </div>
      )}

      {submitted && (
        <div
          className="flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-4 text-emerald-300"
          data-testid="installment-success"
          role="status"
        >
          <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-black">
              Solicitacao enviada! Prazo: ate{" "}
              {dateBR(submitted.tsLimitePagamento)} (5 dias uteis).
            </p>
            <p className="text-xs mt-1 opacity-80">
              Enviada em {dateBR(submitted.submittedAt)}. Acompanhe no painel.
            </p>
          </div>
        </div>
      )}
    </form>
  );
}
