/**
 * @name SkeletonCard
 * @description Renderiza um card skeleton para estados de carregamento.
 *
 * @returns {JSX.Element} Placeholder animado.
 */
export function SkeletonCard() {
  return (
    <div className="min-w-65 max-w-65 animate-pulse rounded-lg border border-border bg-card p-5">
      <div className="h-12 w-12 rounded-lg bg-muted" />
      <div className="mt-4 h-4 w-3/4 rounded bg-muted" />
      <div className="mt-2 h-3 w-full rounded bg-muted" />
      <div className="mt-6 h-3 w-1/2 rounded bg-muted" />
    </div>
  );
}
