import { cn } from "~/lib/utils";

function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-accent/40", className)}
      aria-hidden="true"
    />
  );
}

/**
 * TermoAdesaoSkeleton — placeholder de loading para `/founder/termo-adesao/texto`.
 *
 * Reproduz o layout final da pagina (header editorial + banner legal + corpo
 * do termo) usando o mesmo padrao visual dos outros skeletons do sistema:
 *
 * - `bg-accent/40` + `animate-pulse` (igual `ComplianceDashboardSkeleton`)
 * - Glass-panel `border border-white/5`
 * - Alturas proporcionais a view final (zero reflow no hydration)
 * - `role="status"` + `aria-label` para leitores de tela
 *
 * Exportado como `HydrateFallback` da rota para cobrir o flash de
 * navegacao inicial em conexoes lentas / SSR streaming.
 */
export function TermoAdesaoSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando termo de adesao"
      className="min-h-screen relative flex flex-col items-center pt-3 pb-6 px-1.5 md:pt-4 md:pb-8 md:px-0 overflow-x-hidden"
    >
      {/* Structural Background Watermark */}
      <div
        className="fixed top-40 left-1/2 -translate-x-1/2 text-[20rem] font-black text-white/[0.02] pointer-events-none select-none z-0"
        aria-hidden="true"
      >
        TERMO
      </div>

      <div className="relative z-10 w-full max-w-7xl xl:max-w-[1400px]">
        {/* Header skeleton */}
        <header className="mb-6 flex flex-col gap-6 md:mb-8 md:flex-row md:items-end md:justify-between md:gap-8">
          <div className="min-w-0 flex-1">
            {/* Eyebrow */}
            <SkeletonLine className="mb-2 h-3 w-32" />
            {/* Title (H1) */}
            <SkeletonLine className="h-12 w-72 md:h-14 md:w-96" />
            {/* Subtitle */}
            <SkeletonLine className="mt-3 h-4 w-80" />
            {/* Meta dl */}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
              <SkeletonLine className="h-3 w-28" />
              <SkeletonLine className="h-3 w-40" />
              <SkeletonLine className="h-3 w-36" />
            </div>
          </div>

          {/* CTA actions placeholder */}
          <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
            <SkeletonLine className="h-9 w-24 rounded-full" />
            <SkeletonLine className="h-9 w-24 rounded-full" />
            <SkeletonLine className="h-9 w-24 rounded-full" />
          </div>
        </header>

        {/* Legal banner skeleton */}
        <div className="mx-auto w-full max-w-4xl">
          <SkeletonLine className="mb-6 h-24 w-full rounded-2xl md:mb-8 md:h-28" />

          {/* Article body skeleton */}
          <div className="glass-panel rounded-2xl border border-white/5 px-6 py-8 md:px-12 md:py-14">
          {/* Header inline do termo (h1 + chip + versao) */}
          <SkeletonLine className="mx-auto h-8 w-3/4 max-w-md" />
          <SkeletonLine className="mx-auto mt-3 h-3 w-48" />
          <SkeletonLine className="mx-auto mt-6 h-3 w-32" />

          {/* Highlight box (atencao) */}
          <SkeletonLine className="mt-8 h-28 w-full rounded-xl" />

          {/* Clausulas (h2 + paragrafos repetidos) */}
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={i} className="mt-8 space-y-3">
              <SkeletonLine className="h-5 w-2/3 max-w-xs" />
              <SkeletonLine className="h-3 w-full" />
              <SkeletonLine className="h-3 w-11/12" />
              <SkeletonLine className="h-3 w-10/12" />
              {i % 3 === 0 && (
                <SkeletonLine className="mt-1 h-3 w-9/12" />
              )}
            </div>
          ))}

          {/* Footer institucional */}
          <SkeletonLine className="mt-12 mx-auto h-3 w-2/3 max-w-lg" />
          <SkeletonLine className="mt-2 mx-auto h-3 w-1/2 max-w-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
