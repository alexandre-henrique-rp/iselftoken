const ROWS_PLACEHOLDER = 6;

/** Skeleton estrutural da tabela de usuários durante o carregamento. */
export function AdminUserTableSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10 bg-card/70 shadow-lg"
      role="status"
      aria-label="Carregando usuários"
    >
      <div className="space-y-3 p-3 sm:p-4 lg:hidden">
        {Array.from({ length: ROWS_PLACEHOLDER }).map((_, index) => (
          <article
            key={index}
            className="rounded-2xl border border-white/10 bg-accent/10 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="size-9 shrink-0 animate-pulse rounded-full bg-accent/40" />
                <div className="space-y-2">
                  <div className="h-3 w-32 animate-pulse rounded bg-accent/40" />
                  <div className="h-3 w-20 animate-pulse rounded bg-accent/30" />
                </div>
              </div>
              <div className="h-6 w-16 shrink-0 animate-pulse rounded-full bg-accent/30" />
            </div>
            <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="h-2 w-12 animate-pulse rounded bg-accent/30" />
                <div className="h-4 w-40 max-w-full animate-pulse rounded bg-accent/30" />
              </div>
              <div className="space-y-2">
                <div className="h-2 w-16 animate-pulse rounded bg-accent/30" />
                <div className="h-4 w-20 animate-pulse rounded bg-accent/30" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <div className="space-y-2">
                <div className="h-2 w-20 animate-pulse rounded bg-accent/30" />
                <div className="h-3 w-12 animate-pulse rounded bg-accent/40" />
              </div>
              <div className="flex gap-1.5">
                <div className="size-9 animate-pulse rounded-xl bg-accent/30" />
                <div className="size-9 animate-pulse rounded-xl bg-accent/30" />
                <div className="size-9 animate-pulse rounded-xl bg-accent/30" />
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-accent/20">
              {["ID", "Usuário", "E-mail", "Status", "Cadastro", "Ações"].map(
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
            {Array.from({ length: ROWS_PLACEHOLDER }).map((_, index) => (
              <tr key={index}>
                <td className="px-4 py-4 lg:px-6">
                  <div className="h-4 w-12 animate-pulse rounded bg-accent/40" />
                </td>
                <td className="px-4 py-4 lg:px-6">
                  <div className="flex items-center gap-3">
                    <div className="size-9 animate-pulse rounded-full bg-accent/40" />
                    <div className="space-y-2">
                      <div className="h-3 w-32 animate-pulse rounded bg-accent/40" />
                      <div className="h-3 w-20 animate-pulse rounded bg-accent/30" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 lg:px-6">
                  <div className="h-4 w-40 animate-pulse rounded bg-accent/30" />
                </td>
                <td className="px-4 py-4 text-center lg:px-6">
                  <div className="mx-auto h-6 w-16 animate-pulse rounded-full bg-accent/30" />
                </td>
                <td className="px-4 py-4 lg:px-6">
                  <div className="h-4 w-20 animate-pulse rounded bg-accent/30" />
                </td>
                <td className="px-4 py-4 lg:px-6">
                  <div className="flex justify-end gap-1.5">
                    <div className="size-9 animate-pulse rounded-xl bg-accent/30" />
                    <div className="size-9 animate-pulse rounded-xl bg-accent/30" />
                    <div className="size-9 animate-pulse rounded-xl bg-accent/30" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-col items-center justify-between gap-4 border-t border-white/10 bg-accent/10 px-4 py-4 sm:flex-row lg:px-6">
        <div className="h-4 w-48 animate-pulse rounded bg-accent/30" />
        <div className="flex items-center gap-2">
          <div className="size-9 animate-pulse rounded-xl bg-accent/30" />
          <div className="size-9 animate-pulse rounded-xl bg-accent/30" />
        </div>
      </footer>
    </div>
  );
}
