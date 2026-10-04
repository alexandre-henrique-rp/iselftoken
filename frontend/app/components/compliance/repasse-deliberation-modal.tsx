import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Scale, X } from "lucide-react";
import { toast } from "sonner";
import {
  complianceDeliberateSchema,
  type ComplianceDeliberateFormValues,
} from "~/lib/repasse-schemas";
import { useComplianceDeliberate } from "~/hooks/use-compliance-deliberate";
import { cn } from "~/lib/utils";
import type { Repasse } from "~/types/repasse";

const PARCELAS_OPCOES = [12, 15, 18, 24, 36, 48, 60];

export interface RepasseDeliberationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campaign: {
    id: number;
    startup: { id: number; nome: string } | null;
    repasse: Repasse | null;
  };
}

const MIN_LEN = 0;

/**
 * @description Modal do Compliance para deliberar o numero de parcelas
 * de um Repasse. Opcoes validas: 12, 15, 18, 24, 36, 48, 60. Observacao opcional.
 */
export function RepasseDeliberationModal({
  isOpen,
  onClose,
  onSuccess,
  campaign,
}: RepasseDeliberationModalProps) {
  const mutation = useComplianceDeliberate();
  const [selected, setSelected] = useState<number>(12);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
    watch,
  } = useForm<ComplianceDeliberateFormValues>({
    resolver: zodResolver(complianceDeliberateSchema),
    defaultValues: { numeroParcelas: 12, observacao: "" },
  });

  useEffect(() => {
    if (isOpen) {
      const initial = campaign.repasse?.numeroParcelas && PARCELAS_OPCOES.includes(campaign.repasse.numeroParcelas)
        ? campaign.repasse.numeroParcelas
        : 12;
      setSelected(initial);
      reset({ numeroParcelas: initial, observacao: campaign.repasse?.complianceObservacao ?? "" });
    }
  }, [isOpen, campaign.repasse, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const dialogRef = useRef<HTMLDivElement>(null);
  const obs = watch("observacao") ?? "";
  const obsRestante = 1000 - obs.length;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync({
        campaignId: campaign.id,
        payload: {
          numeroParcelas: values.numeroParcelas,
          observacao: values.observacao || undefined,
        },
      });
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao deliberar");
    }
  });

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deliberation-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border/40 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <header className="flex justify-between items-start gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">
              compliance · deliberacao
            </p>
            <h2 id="deliberation-title" className="text-xl font-black tracking-tight flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Deliberar Parcelas
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {campaign.startup?.nome ?? `Campanha #${campaign.id}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-accent/40"
            aria-label="Fechar"
            disabled={mutation.isPending}
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* numeroParcelas */}
          <fieldset className="space-y-2">
            <legend className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Numero de parcelas (12 a 60)
            </legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" data-testid="deliberation-parcelas-options">
              {PARCELAS_OPCOES.map((n) => (
                <button
                  type="button"
                  key={n}
                  role="radio"
                  aria-checked={selected === n}
                  onClick={() => {
                    setSelected(n);
                    setValue("numeroParcelas", n, { shouldValidate: true });
                  }}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-black border transition",
                    selected === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-accent/20 border-border/40 hover:bg-accent/40",
                  )}
                  data-testid={`deliberation-option-${n}`}
                  data-selected={selected === n}
                >
                  {n}x
                </button>
              ))}
            </div>
            <input type="hidden" {...register("numeroParcelas", { valueAsNumber: true })} />
            {errors.numeroParcelas && (
              <p className="text-xs text-red-400" role="alert">
                {errors.numeroParcelas.message}
              </p>
            )}
          </fieldset>

          {/* observacao */}
          <fieldset className="space-y-2">
            <label
              htmlFor="observacao"
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block"
            >
              Observacao (opcional)
            </label>
            <textarea
              id="observacao"
              rows={3}
              maxLength={1000}
              {...register("observacao")}
              className="w-full bg-transparent border border-border/40 rounded-xl px-3 py-2 text-sm resize-none"
              placeholder="Justifique o numero de parcelas escolhido (opcional)"
              data-testid="deliberation-observacao"
            />
            <p
              className={cn(
                "text-[10px] text-right tabular-nums",
                obs.length > MIN_LEN && obsRestante < 50 ? "text-amber-400" : "text-muted-foreground",
              )}
            >
              {obsRestante} caracteres restantes
            </p>
          </fieldset>

          <footer className="flex justify-end gap-3 pt-2 border-t border-border/30">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="px-4 py-2 rounded-full border border-border/40 text-xs font-black uppercase tracking-widest hover:bg-accent/20"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest",
                "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(213,0,249,0.25)]",
                "hover:opacity-90 active:scale-95 transition",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
              data-testid="deliberation-submit"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Aprovar Deliberacao
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
