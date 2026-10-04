function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-accent/30 ${className}`} />;
}

/** Skeleton estrutural compacto do mosaico real da dashboard administrativa. */
export function AdminDashboardSkeleton() {
  return (
    <div
      className="space-y-4 md:space-y-5"
      role="status"
      aria-label="Carregando dashboard"
    >
      <header className="mb-4 flex flex-col gap-2 md:mb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <SkeletonBlock className="mb-2 h-3 w-32" />
          <SkeletonBlock className="h-10 w-56 sm:h-12 sm:w-72" />
        </div>
      </header>

      <section className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12 lg:gap-4">
        <SkeletonBlock className="min-h-[220px] rounded-3xl p-4 sm:p-5 lg:col-span-8 lg:min-h-[280px] lg:p-6" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-2 lg:gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonBlock
              key={index}
              className="min-h-[132px] rounded-3xl p-4"
            />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonBlock
            key={index}
            className="min-h-[120px] rounded-2xl p-4"
          />
        ))}
      </section>
    </div>
  );
}
