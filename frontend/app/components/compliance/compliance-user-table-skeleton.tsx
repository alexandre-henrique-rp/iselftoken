const ROWS = 6;

export function ComplianceUserTableSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10 bg-card/70 shadow-lg"
      role="status"
      aria-label="Carregando usuários"
    >
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[920px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-accent/20">
              {["Usuário", "E-mail", "Role", "KYC", "Plano", "Cadastro"].map(
                (label) => (
                  <th
                    key={label}
                    scope="col"
                    className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground lg:px-6"
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {Array.from({ length: ROWS }).map((_, index) => (
              <tr key={index}>
                {Array.from({ length: 6 }).map((__, cell) => (
                  <td key={cell} className="px-4 py-5 lg:px-6">
                    <div
                      className={`h-4 animate-pulse rounded bg-accent/40 ${cell === 0 ? "w-36" : cell === 1 ? "w-44" : "w-20"}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 p-3 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-xl border border-white/10 p-4">
            <div className="h-5 w-40 animate-pulse rounded bg-accent/40" />
            <div className="h-4 w-52 animate-pulse rounded bg-accent/30" />
            <div className="h-4 w-28 animate-pulse rounded bg-accent/30" />
          </div>
        ))}
      </div>
      <div className="h-16 animate-pulse border-t border-white/10 bg-accent/10" />
    </div>
  );
}
