import { Button } from "~/components/ui/button";

interface SectionStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

/**
 * @name SectionState
 * @description Renderiza estados de loading/erro/vazio para secoes.
 *
 * @param {string} title - Titulo do estado.
 * @param {string} message - Mensagem principal exibida.
 * @param {() => void} onRetry - Callback opcional para tentar novamente.
 *
 * @returns {JSX.Element} Bloco de estado com CTA opcional.
 */
export function SectionState({ title, message, onRetry }: SectionStateProps) {
  return (
    <div className="rounded-lg border border-border bg-card/70 p-8 text-center">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button
          type="button"
          onClick={onRetry}
          className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
