"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "~/lib/utils";

/**
 * Drawer (gaveta lateral) reutilizável — padrão do Design System iSelfToken.
 *
 * - Portal para `document.body` (fora da árvore de layout).
 * - Overlay `bg-black/70 backdrop-blur-sm` (consistente com os modais do DS).
 * - Painel desliza da direita no desktop (`md+`) e de baixo no mobile
 *   (bottom-sheet), respeitando o padrão mobile-first do STYLE_GUIDE.
 * - A11y: `role="dialog"`, `aria-modal`, fecha no ESC, focus-trap simples,
 *   trava o scroll do body enquanto aberto e devolve o foco ao fechar.
 * - Superfície: `bg-surface-container-highest`/`bg-card` com borda magenta
 *   sutil e header/footer sticky.
 *
 * Uso:
 * ```tsx
 * <Drawer open={open} onClose={() => setOpen(false)} title="Contratar serviço">
 *   <DrawerBody>…</DrawerBody>
 *   <DrawerFooter>…</DrawerFooter>
 * </Drawer>
 * ```
 */
export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Título exibido no header do drawer. */
  title?: ReactNode;
  /** Eyebrow em caps acima do título (ex.: "founder · financeiro"). */
  eyebrow?: ReactNode;
  /** Conteúdo do corpo + footer (use DrawerBody / DrawerFooter). */
  children: ReactNode;
  /** Impede fechar por overlay/ESC (ex.: ação em andamento). */
  dismissible?: boolean;
  placement?: "responsive" | "bottom";
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
  dismissible = true,
  placement = "responsive",
  className,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const requestClose = useCallback(() => {
    if (dismissible) onClose();
  }, [dismissible, onClose]);

  // Trava o scroll do body + guarda o elemento previamente focado.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Foca o primeiro elemento focável do painel (ou o próprio painel).
    const focusFirst = () => {
      const node = panelRef.current;
      if (!node) return;
      const first = node.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? node).focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    return () => {
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
      // Devolve o foco ao elemento que abriu o drawer.
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // ESC para fechar + focus-trap simples (Tab cicla dentro do painel).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab") return;
      const node = panelRef.current;
      if (!node) return;
      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, requestClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            "fixed inset-0 z-[9999] flex",
            placement === "bottom" ? "items-end justify-center" : "justify-end",
          )}
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, backdropFilter: "blur(6px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70"
            aria-hidden="true"
            onClick={requestClose}
          />

          {/* Painel: bottom-sheet no mobile, lateral direita no md+ */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: "100%", x: 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className={cn(
              "relative z-[10000] flex w-full max-h-[92vh] flex-col outline-none",
              placement === "bottom"
                ? "mx-4 max-w-[620px] rounded-t-3xl border border-white/10 bg-surface-container-highest shadow-2xl"
                : "rounded-t-3xl border border-white/10 bg-surface-container-highest shadow-2xl md:h-full md:max-h-full md:w-full md:max-w-md md:rounded-none md:rounded-l-3xl md:border-l md:border-primary/15",
              className,
            )}
          >
            {/* Grabber (mobile) */}
            <div className="flex justify-center pt-3 md:hidden" aria-hidden="true">
              <span className="h-1.5 w-12 rounded-full bg-white/15" />
            </div>

            {(title || eyebrow) && (
              <header className="flex items-start justify-between gap-4 border-b border-white/5 px-6 py-4">
                <div className="min-w-0 space-y-1">
                  {eyebrow && (
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                      {eyebrow}
                    </p>
                  )}
                  {title && (
                    <h2
                      id={titleId}
                      className="truncate text-xl font-black tracking-tight text-foreground"
                    >
                      {title}
                    </h2>
                  )}
                </div>
                <button
                  type="button"
                  onClick={requestClose}
                  disabled={!dismissible}
                  aria-label="Fechar"
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Corpo rolável do Drawer. */
export function DrawerBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex-1 overflow-y-auto px-6 py-5", className)}>
      {children}
    </div>
  );
}

/** Footer sticky de ações do Drawer. */
export function DrawerFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <footer
      className={cn(
        "flex items-center justify-end gap-2 border-t border-white/5 px-6 py-4",
        className,
      )}
    >
      {children}
    </footer>
  );
}
