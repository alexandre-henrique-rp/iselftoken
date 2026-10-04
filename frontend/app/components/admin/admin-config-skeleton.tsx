import { cn } from "~/lib/utils";

const PARAMS_PLACEHOLDER = 4;
const ROWS_PER_PARAM = 3;

/**
 * Skeleton da página /admin/config.
 * Preserva layout (header + N grupos de cards de parâmetros) enquanto
 * dados carregam do banco. Não exibe nenhum valor real.
 */
export function AdminConfigSkeleton() {
  return (
    <div
      className="space-y-10"
      role="status"
      aria-label="Carregando configurações"
    >
      {/* Header skeleton */}
      <div className="space-y-4">
        <div className="h-3 w-16 bg-accent/40 rounded animate-pulse" />
        <div className="h-12 w-80 bg-accent/30 rounded animate-pulse" />
        <div className="h-4 w-full max-w-2xl bg-accent/30 rounded animate-pulse" />
      </div>

      {/* Params skeleton */}
      <div className="space-y-10">
        {Array.from({ length: 2 }).map((_, g) => (
          <section key={g} className="space-y-4">
            <div className="h-3 w-32 bg-accent/40 rounded animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {Array.from({ length: PARAMS_PLACEHOLDER }).map((_, i) => (
                <div
                  key={i}
                  className="glass-panel rounded-3xl p-6 border border-white/5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="h-4 w-32 bg-accent/40 rounded animate-pulse" />
                      <div className="h-3 w-full bg-accent/30 rounded animate-pulse" />
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-accent/30 animate-pulse shrink-0" />
                  </div>
                  <div className="rounded-2xl bg-accent/20 border border-white/5 p-3 space-y-1.5">
                    <div className="h-2 w-16 bg-accent/40 rounded animate-pulse" />
                    <div className="h-6 w-24 bg-accent/30 rounded animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: ROWS_PER_PARAM }).map((__, r) => (
                      <div
                        key={r}
                        className={cn(
                          "h-9 bg-accent/20 rounded-xl border border-white/5",
                        )}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
