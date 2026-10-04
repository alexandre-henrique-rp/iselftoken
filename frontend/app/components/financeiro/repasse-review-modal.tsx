import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Search, X } from "lucide-react";
import {
  approveInstallmentSchema,
  type ApproveInstallmentFormValues,
} from "~/lib/repasse-schemas";
import { useApproveInstallment } from "~/hooks/use-approve-installment";
import { RepasseSlaCountdown } from "~/components/foundation/repasse-sla-countdown";
import { cn } from "~/lib/utils";
import { formatCurrencyBRL } from "~/lib/currency-format";
import type { Installment, InstallmentRequest, AllocationPercents } from "~/types/repasse";

const ALLOCATION_KEYS: Array<keyof AllocationPercents> = [
  "marketing",
  "desenvolvimento",
  "infraestrutura",
  "pessoal",
  "juridico",
  "operacional",
  "reservaCaixa",
];
const ALLOCATION_LABELS: Record<keyof AllocationPercents, string> = {
  marketing: "Marketing",
  desenvolvimento: "Desenvolvimento",
  infraestrutura: "Infraestrutura",
  pessoal: "Pessoal",
  juridico: "Juridico",
  operacional: "Operacional",
  reservaCaixa: "Reserva de caixa",
};

export interface RepasseReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  installment: Installment | null;
  request: InstallmentRequest | null;
  repasseId?: number | string;
}

/**
 * @description Modal do Financeiro para revisar (aprovar) uma solicitacao.
 * Exibe SLA countdown grande, alocacao visualizada e campo `valorOverride`
 * opcional. Submit chama POST /api/financeiro/installments/:id/approve.
 */
export function RepasseReviewModal({
  isOpen,
  onClose,
  onSuccess,
  installment,
  request,
  repasseId,
}: RepasseReviewModalProps) {
  const mutation = useApproveInstallment(repasseId);
  const dialogRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApproveInstallmentFormValues>({
    resolver: zodResolver(approveInstallmentSchema),
    defaultValues: { valorOverride: "", observacaoFinanceiro: "" },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ valorOverride: "", observacaoFinanceiro: "" });
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const onSubmit = handleSubmit(async (values) => {
    if (!installment) return;
    try {
      await mutation.mutateAsync({
        installmentId: installment.id,
        payload: {
          valorOverride: values.valorOverride || undefined,
          observacaoFinanceiro: values.observacaoFinanceiro || undefined,
        },
      });
      onSuccess();
      onClose();
    } catch {
      // toast ja tratado no hook
    }
  });

  if (!isOpen || !installment || !request) return null;

  const valorOriginal = Number(request.valorSolicitado);

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-title"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-card border border-border/40 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <header className="flex justify-between items-start gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">
              financeiro · revisao
            </p>
            <h2 id="review-title" className="text-xl font-black tracking-tight flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Revisar Solicitacao — Parcela #{installment.numero}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-accent/40"
            aria-label="Fechar"
            disabled={isSubmitting}
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* SLA countdown grande */}
        <div className="rounded-2xl border border-border/40 bg-accent/10 p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              SLA
            </p>
            <p className="text-sm text-muted-foreground">
              Enviada em {new Date(request.submittedAt).toLocaleString("pt-BR")}
            </p>
          </div>
          <RepasseSlaCountdown submittedAt={request.submittedAt} />
        </div>

        {/* Alocacao */}
        <section className="rounded-2xl border border-border/40 p-4 space-y-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Alocacao solicitada
          </h3>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {ALLOCATION_KEYS.filter((k) => (request.allocationPercents[k] ?? 0) > 0).map((k) => {
              const pct = request.allocationPercents[k] ?? 0;
              const reais = Number(((valorOriginal * pct) / 100).toFixed(2));
              return (
                <li
                  key={k}
                  className="rounded-xl border border-border/30 bg-accent/10 p-3"
                  data-testid={`review-allocation-${k}`}
                >
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {ALLOCATION_LABELS[k]}
                  </p>
                  <p className="text-sm font-black tabular-nums">
                    {pct}% · {formatCurrencyBRL(reais)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Valor Override (opcional)
            </span>
            <input
              type="text"
              inputMode="decimal"
              {...register("valorOverride")}
              className="w-full bg-transparent border border-border/40 rounded-xl px-3 py-2 text-sm font-bold tabular-nums"
              placeholder={`Original: ${valorOriginal.toFixed(2)}`}
              data-testid="review-valor-override"
            />
            {errors.valorOverride && (
              <p className="text-xs text-red-400">{errors.valorOverride.message}</p>
            )}
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Observacao do Financeiro (opcional)
            </span>
            <textarea
              rows={3}
              maxLength={1000}
              {...register("observacaoFinanceiro")}
              className="w-full bg-transparent border border-border/40 rounded-xl px-3 py-2 text-sm resize-none"
              placeholder="Justifique qualquer decisao (max 1000 chars)"
              data-testid="review-observacao"
            />
          </label>

          <footer className="flex justify-end gap-3 pt-2 border-t border-border/30">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-full border border-border/40 text-xs font-black uppercase tracking-widest hover:bg-accent/20"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest",
                "bg-emerald-500 text-emerald-950 shadow-[0_0_15px_rgba(16,185,129,0.25)]",
                "hover:opacity-90 active:scale-95 transition",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
              data-testid="review-submit"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Aprovar e iniciar processamento
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
