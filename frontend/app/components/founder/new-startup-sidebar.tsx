import { Lightbulb, ShieldAlert, Sparkles } from "lucide-react";

const STEP_LABELS = {
  1: "Identidade",
  2: "Dados bancários",
  3: "Captação",
} as const;

const TIPS = {
  1: {
    title: "Importação automatizada",
    text: "A busca pelo CNPJ importa os dados da Receita Federal e reduz o preenchimento manual.",
    Icon: Lightbulb,
  },
  2: {
    title: "Dados de recebimento",
    text: "Revise a conta que será usada para transferir os recursos das rodadas aprovadas.",
    Icon: ShieldAlert,
  },
  3: {
    title: "Valuation e captação",
    text: "Uma meta equilibrada ajuda a apresentar a rodada com mais transparência aos investidores.",
    Icon: Lightbulb,
  },
} as const;

export function NewStartupSidebar({
  currentStep,
  progressPercent,
}: {
  currentStep: number;
  progressPercent: number;
}) {
  const tip = TIPS[currentStep as keyof typeof TIPS];
  const currentLabel = STEP_LABELS[currentStep as keyof typeof STEP_LABELS];
  const nextLabel = STEP_LABELS[(currentStep + 1) as keyof typeof STEP_LABELS];
  const nextStep = nextLabel ?? "Revisão e pagamento";

  return (
    <aside className="h-fit w-full self-start lg:sticky lg:top-24 lg:w-[260px]">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              Resumo do cadastro
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Etapa {currentStep} de 3
            </p>
          </div>
          <span className="text-sm font-semibold text-primary">
            {progressPercent}%
          </span>
        </div>

        <div
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Campos preenchidos"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <dl className="mt-4 divide-y divide-border border-t border-border text-xs">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted-foreground">Campos preenchidos</dt>
            <dd className="font-semibold text-foreground">
              {progressPercent}%
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted-foreground">Etapa atual</dt>
            <dd className="font-semibold text-foreground">{currentLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted-foreground">Próximo passo</dt>
            <dd className="text-right font-semibold text-foreground">
              {nextStep}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <tip.Icon className="h-4 w-4 text-primary" aria-hidden="true" />
          Dicas
        </h2>
        <p className="mt-3 text-xs font-semibold text-foreground">
          {tip.title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {tip.text}
        </p>
        <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
          O rascunho é salvo automaticamente enquanto você preenche o cadastro.
        </p>
      </div>
    </aside>
  );
}
