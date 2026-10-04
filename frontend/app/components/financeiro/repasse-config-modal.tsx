import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Settings, X } from "lucide-react";
import { toast } from "sonner";
import {
  financeiroConfigureRepasseSchema,
  type FinanceiroConfigureRepasseFormValues,
} from "~/lib/repasse-schemas";
import { useFinanceiroConfigureRepasse } from "~/hooks/use-financeiro-configure-repasse";
import { cn } from "~/lib/utils";

export interface RepasseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  repasseId: number | string;
  complianceApproved: boolean;
  defaultValues?: Partial<FinanceiroConfigureRepasseFormValues>;
}

/**
 * @description Modal do Financeiro para configurar valor da parcela,
 * valor da ultima parcela (opcional) e intervalo (15-60 dias).
 * So funciona se `complianceApproved=true`.
 */
export function RepasseConfigModal({
  isOpen,
  onClose,
  onSuccess,
  repasseId,
  complianceApproved,
  defaultValues,
}: RepasseConfigModalProps) {
  const mutation = useFinanceiroConfigureRepasse(repasseId);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [submittingLocal, setSubmittingLocal] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FinanceiroConfigureRepasseFormValues>({
    resolver: zodResolver(financeiroConfigureRepasseSchema),
    defaultValues: {
      valorParcela: defaultValues?.valorParcela ?? "",
      valorUltimaParcela: defaultValues?.valorUltimaParcela ?? "",
      intervaloDias: defaultValues?.intervaloDias ?? 30,
      primeiraParcelaDias: defaultValues?.primeiraParcelaDias ?? undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        valorParcela: defaultValues?.valorParcela ?? "",
        valorUltimaParcela: defaultValues?.valorUltimaParcela ?? "",
        intervaloDias: defaultValues?.intervaloDias ?? 30,
        primeiraParcelaDias: defaultValues?.primeiraParcelaDias ?? undefined,
      });
    }
  }, [isOpen, defaultValues, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmittingLocal(true);
    try {
      await mutation.mutateAsync({
        valorParcela: values.valorParcela,
        valorUltimaParcela: values.valorUltimaParcela || undefined,
        intervaloDias: values.intervaloDias,
        // FIN-11 §8.4 / Sprint S36 — primeiraParcelaDias opcional.
        // Quando nao informado, o backend usa intervaloDias (regra antiga).
        primeiraParcelaDias: values.primeiraParcelaDias || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao configurar");
    } finally {
      setSubmittingLocal(false);
    }
  });

  const intervalo = watch("intervaloDias");
  const primeiraParcelaDias = watch("primeiraParcelaDias");
  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="config-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border/40 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <header className="flex justify-between items-start gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">
              financeiro · configuracao
            </p>
            <h2 id="config-title" className="text-xl font-black tracking-tight flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Configurar Repasse
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-accent/40"
            aria-label="Fechar"
            disabled={isSubmitting || submittingLocal}
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {!complianceApproved && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
            Aguardando deliberacao do Compliance. A configuracao so podera ser salva
            apos a deliberacao ser aprovada.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Valor da Parcela (R$)
              </span>
              <input
                type="text"
                inputMode="decimal"
                {...register("valorParcela")}
                disabled={!complianceApproved}
                className="w-full bg-transparent border border-border/40 rounded-xl px-3 py-2 text-sm font-bold tabular-nums"
                placeholder="33333.33"
                data-testid="config-valor-parcela"
              />
              {errors.valorParcela && (
                <p className="text-xs text-red-400">{errors.valorParcela.message}</p>
              )}
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Valor Ultima Parcela (opcional)
              </span>
              <input
                type="text"
                inputMode="decimal"
                {...register("valorUltimaParcela")}
                disabled={!complianceApproved}
                className="w-full bg-transparent border border-border/40 rounded-xl px-3 py-2 text-sm font-bold tabular-nums"
                placeholder="33335.33 (absorve centavos)"
                data-testid="config-valor-ultima"
              />
              {errors.valorUltimaParcela && (
                <p className="text-xs text-red-400">{errors.valorUltimaParcela.message}</p>
              )}
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex justify-between">
              <span>Intervalo entre parcelas (dias)</span>
              <span className="tabular-nums">{intervalo || 0}d</span>
            </span>
            <input
              type="range"
              min={15}
              max={60}
              step={1}
              {...register("intervaloDias", { valueAsNumber: true })}
              disabled={!complianceApproved}
              className="w-full h-2 accent-primary"
              data-testid="config-intervalo"
            />
            {errors.intervaloDias && (
              <p className="text-xs text-red-400">{errors.intervaloDias.message}</p>
            )}
          </label>

          {/* FIN-11 §8.4 / Sprint S36 — primeira parcela configuravel
              separadamente do intervalo entre as demais (ramp-up). */}
          <label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex justify-between">
              <span>Dias ate a 1ª parcela</span>
              <span className="tabular-nums">
                {primeiraParcelaDias || intervalo || 0}d
                {!primeiraParcelaDias && (
                  <span className="text-amber-400/80 ml-1">· padrao</span>
                )}
              </span>
            </span>
            <input
              type="number"
              min={1}
              max={120}
              step={1}
              {...register("primeiraParcelaDias", { valueAsNumber: true })}
              disabled={!complianceApproved}
              placeholder="Deixe vazio para usar o mesmo intervalo"
              className="w-full bg-transparent border border-border/40 rounded-xl px-3 py-2 text-sm font-bold tabular-nums"
              data-testid="config-primeira-parcela"
            />
            {errors.primeiraParcelaDias && (
              <p className="text-xs text-red-400">
                {errors.primeiraParcelaDias.message}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground/70">
              Quando vazio, a 1ª parcela fica em (hoje + {intervalo || 30}d).
              Quando preenchido, e.g. 7 dias = ramp-up curto + demais a cada{" "}
              {intervalo || 30}d.
            </p>
          </label>

          <footer className="flex justify-end gap-3 pt-2 border-t border-border/30">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || submittingLocal}
              className="px-4 py-2 rounded-full border border-border/40 text-xs font-black uppercase tracking-widest hover:bg-accent/20"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!complianceApproved || isSubmitting || submittingLocal || mutation.isPending}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest",
                "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(213,0,249,0.25)]",
                "hover:opacity-90 active:scale-95 transition",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
              data-testid="config-submit"
            >
              {mutation.isPending || submittingLocal ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Configurar
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
