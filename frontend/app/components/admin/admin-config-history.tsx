import { useEffect, useRef } from "react";
import { X, History as HistoryIcon, Undo2 } from "lucide-react";
import { cn } from "~/lib/utils";

interface HistoryItem {
  id: number;
  value: number;
  effectiveFrom: string;
  note: string | null;
  createdAt: string;
}

interface AdminConfigHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  history: HistoryItem[];
  /** Função de formatação específica da unidade (%, R$, etc). */
  formatValue: (value: number) => string;
  /** Formata a data ISO para PT-BR. */
  formatDate: (iso: string) => string;
}

/**
 * Modal de histórico de um parâmetro de configuração.
 * Renderiza a lista de versões anteriores com valor + data efetiva + nota.
 *
 * Acessibilidade:
 *  - `role="dialog"`, `aria-modal`, `aria-label`
 *  - ESC fecha o modal
 *  - click no overlay fecha
 *  - clique no conteúdo do modal NÃO fecha (stopPropagation)
 */
export function AdminConfigHistoryPanel({
  open,
  onClose,
  title,
  history,
  formatValue,
  formatDate,
}: AdminConfigHistoryPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      // Foco inicial no botão de fechar
      closeButtonRef.current?.focus();
      // Trava scroll do body enquanto modal aberto
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Histórico: ${title}`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-accent/95 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/10">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Histórico
            </p>
            <h2 className="text-sm sm:text-base font-black text-foreground truncate">
              {title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma versão anterior registrada.
            </p>
          ) : (
            history.map((v) => (
              <div
                key={v.id}
                className={cn(
                  "flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl",
                  "bg-black/30 border border-white/5",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-foreground">
                    {formatValue(v.value)}
                  </p>
                  {v.note && (
                    <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
                      {v.note}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground/60">
                    {formatDate(v.effectiveFrom)}
                  </p>
                  <p className="text-[9px] text-muted-foreground/40 mt-0.5">
                    {formatDate(v.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-2 px-4 sm:px-6 py-2.5 border-t border-white/10 bg-black/20 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
          <span className="flex items-center gap-1.5">
            <HistoryIcon className="w-3 h-3" aria-hidden />
            {history.length} {history.length === 1 ? "versão" : "versões"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-primary hover:text-primary/80 transition-colors"
          >
            <Undo2 className="w-3 h-3" aria-hidden />
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}
