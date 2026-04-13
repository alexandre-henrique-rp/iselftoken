/**
 * @name SkeletonWideCard
 * @description Placeholder para cards maiores no carrossel principal.
 *
 * @returns {JSX.Element} Card skeleton largo.
 */
export function SkeletonWideCard() {
  return (
    <div className="min-w-80 max-w-80 animate-pulse overflow-hidden rounded-xl border border-border bg-card">
      <div className="h-40 w-full bg-muted" />
      <div className="space-y-4 p-5">
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-5/6 rounded bg-muted" />
        <div className="h-8 w-full rounded bg-muted" />
      </div>
    </div>
  );
}
