interface StartupWizardProps {
  currentStep: number;
}

export default function StartupWizard({ currentStep }: StartupWizardProps) {
  return (
    <div className="mb-10">
      <div className="after:bg-border relative after:absolute after:inset-x-0 after:top-1/2 after:block after:h-0.5 after:-translate-y-1/2 after:rounded-lg after:content-['']">
        <ol className="text-muted-foreground relative z-10 flex justify-between text-sm font-medium">
          {/* Passo 1 */}
          <li className="bg-background flex items-center gap-2 p-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                currentStep >= 1
                  ? 'border-[#d500f9] bg-[#d500f9] text-white shadow-[0_0_15px_rgba(213,0,249,0.4)]'
                  : 'border-border bg-card'
              }`}
            >
              {currentStep > 1 ? '✓' : '1'}
            </span>
            <span
              className={`${currentStep >= 1 ? 'text-foreground' : ''} hidden sm:block`}
            >
              Dados da Startup
            </span>
          </li>

          {/* Passo 2 */}
          <li className="bg-background flex items-center gap-2 p-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                currentStep >= 2
                  ? 'border-[#d500f9] bg-[#d500f9] text-white shadow-[0_0_15px_rgba(213,0,249,0.4)]'
                  : 'border-border bg-card'
              }`}
            >
              2
            </span>
            <span
              className={`${currentStep >= 2 ? 'text-foreground' : ''} hidden sm:block`}
            >
              Captação & Tokenização
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
