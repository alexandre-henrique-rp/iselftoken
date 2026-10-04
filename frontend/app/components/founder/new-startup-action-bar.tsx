import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";

type SubmitProgress = "creating" | "checkout" | null;

interface NewStartupActionBarProps {
  currentStep: number;
  isSubmitting: boolean;
  submitProgress: SubmitProgress;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function NewStartupActionBar({
  currentStep,
  isSubmitting,
  submitProgress,
  onBack,
  onNext,
  onSubmit,
}: NewStartupActionBarProps) {
  const isLastStep = currentStep === 3;
  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-2 py-3 backdrop-blur md:px-2 lg:left-72">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 xl:max-w-[1400px]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{currentStep === 1 ? "Cancelar" : "Voltar"}</span>
        </button>
        {!isLastStep ? (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Próximo passo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 md:px-5"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {isSubmitting
                ? submitProgress === "creating"
                  ? "Registrando..."
                  : "Iniciando checkout..."
                : "Pagar reserva de tokens"}
            </span>
          </button>
        )}
      </div>
    </footer>
  );
}
