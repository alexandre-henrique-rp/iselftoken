import { ArrowLeft, Printer, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";

/**
 * TermoAdesaoActions — botoes de acao do documento.
 *
 * Pensado para viver em `headerActions={...}` do `EditorialWalletShell`.
 * Renderiza 3 botoes:
 * - Voltar: history.back() (fallback para /home se history vazio)
 * - Imprimir: window.print() — usar com `@media print` no escopo do doc
 * - Fechar aba: window.close() com fallback para /home caso o browser
 *   bloqueie (abas abertas via target=_blank sem allow-scripts-to-close)
 *
 * Estilo ghost (border) para Voltar/Imprimir; primario magenta para Fechar,
 * respeitando a regra de marca (CTAs primarios sao magenta).
 */
export function TermoAdesaoActions() {
  const handleVoltar = () => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = "/home";
  };

  const handleImprimir = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  const handleFechar = () => {
    if (typeof window === "undefined") return;
    window.close();
    setTimeout(() => {
      window.location.href = "/home";
    }, 100);
  };

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2 md:flex-nowrap"
      role="group"
      aria-label="Acoes do documento"
    >
      <ActionButton
        onClick={handleVoltar}
        icon={ArrowLeft}
        label="Voltar"
      />
      <ActionButton
        onClick={handleImprimir}
        icon={Printer}
        label="Imprimir"
      />
      <ActionButton
        onClick={handleFechar}
        icon={X}
        label="Fechar"
        variant="primary"
      />
    </div>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  variant?: "ghost" | "primary";
}

function ActionButton({
  onClick,
  icon: Icon,
  label,
  variant = "ghost",
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
        variant === "ghost" &&
          "border border-white/10 text-on-surface-variant hover:border-primary/40 hover:text-primary",
        variant === "primary" &&
          "bg-primary text-on-primary-fixed hover:opacity-90 shadow-[0_0_18px_rgba(213,0,249,0.25)]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
