export function AdminHistorySkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-48 bg-white/5 rounded animate-pulse" />
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[110px_120px_1.6fr_1.1fr_1fr_0.9fr] gap-4 px-6 py-4 border-b border-white/5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-3 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, row) => (
            <div
              key={row}
              className="grid grid-cols-[110px_120px_1.6fr_1.1fr_1fr_0.9fr] gap-4 px-6 py-4 border-b border-white/5 last:border-0"
            >
              {Array.from({ length: 6 }).map((_, col) => (
                <div
                  key={col}
                  className="h-4 bg-white/5 rounded animate-pulse"
                  style={{ animationDelay: `${(row * 6 + col) * 40}ms` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
