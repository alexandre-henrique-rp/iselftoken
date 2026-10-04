import { CheckCircle2, Circle, Clock, Lock, RotateCcw, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { formatDateOnlyBR } from "~/lib/date-utils";
import { cn } from "~/lib/utils";
import {
  INSTALLMENT_STATUS_LABELS,
  type Installment,
  type InstallmentStatus,
} from "~/types/repasse";
import {
  CAN_OPEN_DETAIL_KINDS,
  eligibilityBadgeClass,
  getInstallmentEligibility,
} from "~/lib/repasse-eligibility";

const STATUS_ICON: Record<InstallmentStatus, React.ComponentType<{ className?: string }>> = {
  AWAITING_REQUEST: Circle,
  REQUESTED: Clock,
  PROCESSING: Loader2,
  COMPLETED: CheckCircle2,
  REJECTED: XCircle,
};

const STATUS_CLASS: Record<InstallmentStatus, string> = {
  AWAITING_REQUEST: "bg-accent text-muted-foreground border-border/40",
  REQUESTED: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  PROCESSING: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  COMPLETED: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  REJECTED: "bg-red-500/10 text-red-300 border-red-500/30",
};

export interface RepasseStepperProps {
  installments: Installment[];
  selectedId?: number | null;
  onSelect: (installment: Installment) => void;
}

/**
 * @description Stepper vertical das parcelas do Repasse. Cada item mostra
 * numero, valor, data prevista e badge colorida por status. Clicar
 * chama onSelect e abre o detalhe no pai.
 *
 * Sprint S34-g: lock visual em parcelas bloqueadas (regra sequencial +
 * janela de 10 dias). Parcelas com `kind !== 'ready'` e `kind !==
 * 'rejected'` ainda podem ser SELECIONADAS para visualizacao, mas o
 * `disabled` aplica estilo esmaecido. Lock icon aparece quando a
 * parcela NAO pode ser aberta (no-date ou awaiting-prev).
 */
export function RepasseStepper({
  installments,
  selectedId,
  onSelect,
}: RepasseStepperProps) {
  if (installments.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed border-border/40 p-6 text-center text-sm text-muted-foreground"
        data-testid="repasse-stepper-empty"
      >
        Nenhuma parcela disponivel.
      </div>
    );
  }

  const sorted = [...installments].sort((a, b) => a.numero - b.numero);

  return (
    <ol
      className="relative space-y-2"
      data-testid="repasse-stepper"
      aria-label="Lista de parcelas"
    >
      {sorted.map((inst) => {
        const Icon = STATUS_ICON[inst.status];
        const isSelected = selectedId === inst.id;
        const eligibility = getInstallmentEligibility({
          installment: inst,
          allInstallments: sorted,
        });
        const canOpen = CAN_OPEN_DETAIL_KINDS.includes(eligibility.kind);
        const isLocked = !canOpen;
        return (
          <li key={inst.id} className="relative">
            <button
              type="button"
              onClick={() => onSelect(inst)}
              disabled={isLocked}
              data-testid={`stepper-item-${inst.numero}`}
              data-status={inst.status}
              data-eligibility={eligibility.kind}
              aria-current={isSelected ? "true" : undefined}
              className={cn(
                "group w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition",
                isSelected
                  ? "bg-primary/5 border-primary/40 shadow-sm"
                  : "bg-card/40 border-border/40 hover:bg-accent/20",
                isLocked && "opacity-50 cursor-not-allowed hover:bg-card/40",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border",
                  STATUS_CLASS[inst.status],
                )}
              >
                <Icon className={cn("h-4 w-4", inst.status === "PROCESSING" && "animate-spin")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-black">
                  <span>Parcela #{inst.numero}</span>
                  <span className="text-muted-foreground text-[11px]">
                    {formatDateOnlyBR(inst.scheduledDate)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="tabular-nums">
                    R$ {Number(inst.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  {inst.status === "REJECTED" && (
                    <RotateCcw className="h-3 w-3 text-red-300" />
                  )}
                  {inst.status === "AWAITING_REQUEST" && inst.numero > 1 && (
                    <span className="text-[10px] uppercase tracking-widest">aguardando</span>
                  )}
                </div>
              </div>
              <span
                data-testid={`stepper-badge-${inst.numero}`}
                title={eligibility.label}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1",
                  eligibilityBadgeClass(eligibility.kind),
                )}
              >
                {isLocked && <Lock className="h-3 w-3" aria-hidden="true" />}
                {INSTALLMENT_STATUS_LABELS[inst.status]}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function __stepperTestHelpers() {
  return { STATUS_ICON, STATUS_CLASS, getInstallmentEligibility };
}

void AlertCircle;
