/**
 * @name SkeletonTestimonial
 * @description Placeholder para cards de depoimento.
 *
 * @returns {JSX.Element} Card skeleton para depoimentos.
 */
export function SkeletonTestimonial() {
  return (
    <div className="min-w-75 max-w-75 animate-pulse rounded-lg border border-border bg-card p-6">
      <div className="h-3 w-full rounded bg-muted" />
      <div className="mt-2 h-3 w-5/6 rounded bg-muted" />
      <div className="mt-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
