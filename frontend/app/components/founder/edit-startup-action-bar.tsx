import { Save } from "lucide-react";
import { toast } from "sonner";
import { useEditStartupForm } from "~/lib/edit-startup-form-context";
import { cn } from "~/lib/utils";

export function EditStartupActionBar() {
  const {
    dirtyCount,
    isDirty,
    actionBarConfig,
    onSave,
    onDiscard,
  } = useEditStartupForm();

  const handleSave = async () => {
    // Os handlers de save (registrados por cada aba/seção) são responsáveis
    // por exibir mensagens de erro específicas — ex.: "CEP inválido",
    // "A soma dos recursos deve ser 100%". O try/catch aqui apenas evita um
    // unhandled rejection; NÃO emite um toast genérico, que antes se
    // sobrepunha (ficava por cima) à mensagem específica — o problema dos
    // "2 toasts" reportado.
    try {
      await onSave();
    } catch {
      /* erro já sinalizado pelo handler específico */
    }
  };

  const handleDiscard = () => {
    if (dirtyCount > 3) {
      toast(`Descartar ${dirtyCount} alterações?`, {
        action: {
          label: "Confirmar",
          onClick: () => onDiscard(),
        },
      });
      return;
    }
    onDiscard();
  };

  return (
    <footer
      aria-hidden={!isDirty}
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-2 py-3 backdrop-blur",
        "transition-transform duration-300 ease-out lg:left-72",
        isDirty ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 xl:max-w-[1400px]">
        {actionBarConfig.showDiscard ? (
          <button
            type="button"
            onClick={handleDiscard}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Descartar alterações
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:px-5"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {actionBarConfig.saveLabel}
        </button>
      </div>
    </footer>
  );
}
