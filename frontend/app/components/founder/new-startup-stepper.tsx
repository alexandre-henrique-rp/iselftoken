import { Check } from "lucide-react";

type Step = { step: number; label: string };

const STEPS: Step[] = [
  { step: 1, label: "Identidade" },
  { step: 2, label: "Dados bancários" },
  { step: 3, label: "Captação" },
];

interface NewStartupStepperProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}

export function NewStartupStepper({
  currentStep,
  completedSteps,
  onStepClick,
}: NewStartupStepperProps) {
  return (
    <nav
      aria-label="Progresso do cadastro"
      className="mb-6 overflow-x-auto pb-1 md:mb-8"
    >
      <ol className="flex min-w-[540px] items-center">
        {STEPS.map(({ step, label }, index) => {
          const isActive = currentStep === step;
          const isCompleted = completedSteps.includes(step);
          const canNavigate = isCompleted || isActive;

          return (
            <li key={step} className="flex min-w-0 flex-1 items-center">
              <button
                type="button"
                onClick={() => onStepClick(step)}
                disabled={!canNavigate}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Etapa ${step}: ${label}${isCompleted ? ", concluída" : ""}`}
                className={`group flex min-w-0 items-center gap-2 rounded-lg px-1 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCompleted
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    `0${step}`
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Etapa 0{step}
                  </span>
                  <span className="block truncate text-sm font-semibold">
                    {label}
                  </span>
                </span>
              </button>
              {index < STEPS.length - 1 && (
                <span
                  className={`mx-2 h-px min-w-6 flex-1 ${
                    completedSteps.includes(step)
                      ? "bg-primary/60"
                      : "bg-border"
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
