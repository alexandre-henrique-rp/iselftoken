/**
 * EditorialWalletShell — Wrapper compartilhado para páginas de carteira
 * com layout editorial (header em destaque + watermark "WALLET" de fundo).
 *
 * Usado por /wallet (investidor) e /wallet/affiliate (afiliado) para
 * garantir identidade visual consistente entre as duas carteiras.
 *
 * Breakpoints (decisao 2026-09-06 — wireframe `/wallet`):
 * - Container `max-w-7xl` (1280px) ate xl, sobe para `xl:max-w-[1400px]` em 2xl
 *   para preservar margens laterais em monitores muito largos.
 * - Header empilhado em mobile, horizontal em md+ (acoes a direita do titulo).
 */

import type { ReactNode } from "react";

interface EditorialWalletShellProps {
  /** Texto curto exibido acima do H1 (ex: "Carteira"). */
  eyebrow?: string;
  /** Titulo principal da pagina (ex: "Minha Carteira"). */
  title: string;
  /** Descricao/subtitulo exibido abaixo do titulo. */
  description?: string;
  /** Watermark grande de fundo (ex: "WALLET", "AFILIADO"). */
  watermark?: string;
  /** Acoes exibidas a direita do header em md+ (ex: "Atualizar", "Exportar"). */
  headerActions?: ReactNode;
  /** Conteudo principal (bento stats, asset list, transaction statement). */
  children: ReactNode;
}

export function EditorialWalletShell({
  eyebrow,
  title,
  description,
  watermark = "WALLET",
  headerActions,
  children,
}: EditorialWalletShellProps) {
  return (
    <main className="min-h-screen relative flex flex-col items-center pt-3 pb-6 px-1.5 md:pt-4 md:pb-8 md:px-0 overflow-x-hidden">
      {/* Structural Background Watermark */}
      {watermark && (
        <div
          className="fixed top-40 left-1/2 -translate-x-1/2 text-[20rem] font-black text-white/[0.02] pointer-events-none select-none z-0"
          aria-hidden="true"
        >
          {watermark}
        </div>
      )}

      <div className="relative z-10 w-full max-w-7xl xl:max-w-[1400px]">
        {/* Editorial Header */}
        <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8">
          <div>
            {eyebrow && (
              <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">
                {eyebrow}
              </span>
            )}
            <h1 className="text-[4rem] leading-none font-extrabold tracking-tighter text-on-surface">
              {title}
            </h1>
            {description && (
              <p className="text-on-surface-variant mt-3 max-w-xl text-sm">
                {description}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-3 shrink-0">{headerActions}</div>
          )}
        </header>

        {children}
      </div>
    </main>
  );
}
