import { Banknote, Building2, CheckCircle2, FileText, ShieldCheck, UserCheck, XCircle } from "lucide-react";
import type { ReactNode } from "react";

export type StartupOnboardingStatus =
  | "PENDING_RESERVATION_PAYMENT"
  | "RESERVATION_PAID"
  | "PENDING_DATA"
  | "PENDING_DOCS"
  | "PENDING_CURATOR_REVIEW"
  | "APPROVED"
  | "REJECTED";

interface StartupOnboardingStepperProps {
  status: StartupOnboardingStatus | string;
}

interface Step {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
}

const STEPS: Step[] = [
  {
    id: "RESERVA",
    label: "Reserva",
    description: "Pagamento da taxa de reserva de tokens",
    icon: <Banknote className="w-4 h-4" />,
  },
  {
    id: "DADOS",
    label: "Dados",
    description: "Identidade + pitch + time + bancário",
    icon: <Building2 className="w-4 h-4" />,
  },
  {
    id: "DOCS",
    label: "Documentos",
    description: "Upload de documentos CVM obrigatórios",
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: "CURADORIA",
    label: "Curadoria",
    description: "Compliance analisa e decide",
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  {
    id: "DECISAO",
    label: "Decisão",
    description: "Aprovado ou rejeitado",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
];

/**
 * Stepper visual do ciclo de vida da startup para o painel compliance.
 * Mostra em qual etapa a startup está e quais já foram concluídas.
 */
export function StartupOnboardingStepper({ status }: StartupOnboardingStepperProps) {
  const currentIndex = resolveCurrentIndex(status);
  const isRejected = status === "REJECTED";

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
            Pipeline de onboarding
          </h3>
          <p className="text-[10px] text-muted-foreground mt-1">
            Etapa atual:{" "}
            <span
              className={
                isRejected ? "text-red-400 font-bold" : "text-primary font-bold"
              }
            >
              {labelFor(status)}
            </span>
          </p>
        </div>
        {isRejected && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-black uppercase tracking-widest">
            <XCircle className="w-3 h-3" /> Rejeitada
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((step, idx) => {
          const done = idx < currentIndex && !isRejected;
          const active = idx === currentIndex && !isRejected;
          const rejectedHere = isRejected && idx === currentIndex;
          return (
            <div key={step.id} className="flex items-center gap-1 shrink-0">
              <div
                className={
                  "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all " +
                  (done
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : active
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : rejectedHere
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : "bg-white/5 border-white/10 text-muted-foreground/60")
                }
                title={step.description}
              >
                <span className="text-[10px] font-black uppercase tracking-widest tabular-nums">
                  0{idx + 1}
                </span>
                <span className="shrink-0">{step.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                  {step.label}
                </span>
                {done && <CheckCircle2 className="w-3 h-3" />}
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={
                    "h-px w-4 sm:w-8 shrink-0 " +
                    (done ? "bg-emerald-500/40" : "bg-white/10")
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function resolveCurrentIndex(status: StartupOnboardingStatus | string): number {
  switch (status) {
    case "PENDING_RESERVATION_PAYMENT":
      return 0;
    case "RESERVATION_PAID":
    case "PENDING_DATA":
      return 1;
    case "PENDING_DOCS":
      return 2;
    case "PENDING_CURATOR_REVIEW":
      return 3;
    case "APPROVED":
    case "REJECTED":
      return 4;
    default:
      return 0;
  }
}

function labelFor(status: StartupOnboardingStatus | string): string {
  switch (status) {
    case "PENDING_RESERVATION_PAYMENT":
      return "Aguardando pagamento da reserva";
    case "RESERVATION_PAID":
      return "Reserva paga — preenchendo dados";
    case "PENDING_DATA":
      return "Dados pendentes";
    case "PENDING_DOCS":
      return "Aguardando documentos CVM";
    case "PENDING_CURATOR_REVIEW":
      return "Em curadoria";
    case "APPROVED":
      return "Aprovada";
    case "REJECTED":
      return "Rejeitada";
    default:
      return "Desconhecido";
  }
}

// Re-export UserCheck icon to avoid TS unused import warnings when consumer doesn't use it directly.
export { UserCheck };
