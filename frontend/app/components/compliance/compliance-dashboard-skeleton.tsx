function SkeletonLine({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-accent/40 ${className}`} />;
}

export function ComplianceDashboardSkeleton() {
  return (
    <div role="status" aria-label="Carregando dashboard de Compliance" className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-white/10 bg-card/70 p-5">
            <SkeletonLine className="h-5 w-32" />
            <SkeletonLine className="mt-5 h-10 w-16" />
            <SkeletonLine className="mt-2 h-4 w-48" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-card/70 p-5">
        <SkeletonLine className="h-6 w-64" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonLine key={index} className="h-20 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
