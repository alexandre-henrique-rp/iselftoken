import { cn } from "~/lib/utils";

const ROWS_PLACEHOLDER = 6;

/**
 * Skeleton da tabela de startups. Preserva layout (7 colunas) enquanto
 * dados carregam do banco. Não exibe nenhum nome/segmento real.
 *
 * Regra (anti-mock): se não há dado do banco, mostrar placeholder. Zero
 * fabricado é considerado dado mockado e viola o contrato do produto.
 */
export function AdminStartupTableSkeleton() {
  return (
    <div
      className="bg-card border border-white/10 rounded-2xl overflow-hidden shadow-lg"
      role="status"
      aria-label="Carregando startups"
    >
      <div className="overflow-x-auto no-scrollbar -mx-3 sm:mx-0">
        <table className="w-full text-left border-collapse min-w-[640px] sm:min-w-0">
          <thead>
            <tr className="bg-white/[0.03] text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground border-b border-white/5">
              {[
                "ID",
                "Startup",
                "Fundador",
                "Segmento",
                "Status",
                "Cadastro",
                "Ações",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-[10px] sm:text-xs"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {Array.from({ length: ROWS_PLACEHOLDER }).map((_, i) => (
              <tr key={i}>
                <td className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-[10px] sm:text-xs">
                  <div className="h-3 w-12 bg-accent/40 rounded animate-pulse" />
                </td>
                <td className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-[10px] sm:text-xs">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-accent/40 animate-pulse" />
                    <div className="h-3 w-32 bg-accent/40 rounded animate-pulse" />
                  </div>
                </td>
                <td className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-[10px] sm:text-xs">
                  <div className="h-3 w-28 bg-accent/30 rounded animate-pulse" />
                </td>
                <td className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-[10px] sm:text-xs">
                  <div className="h-5 w-20 bg-accent/30 rounded animate-pulse" />
                </td>
                <td className="px-8 py-6 text-center">
                  <div className="h-6 w-20 bg-accent/30 rounded-full animate-pulse mx-auto" />
                </td>
                <td className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-[10px] sm:text-xs">
                  <div className="h-3 w-20 bg-accent/30 rounded animate-pulse" />
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end items-center gap-4">
                    <div className="size-4 bg-accent/30 rounded animate-pulse" />
                    <div className="size-4 bg-accent/30 rounded animate-pulse" />
                    <div className="size-4 bg-accent/30 rounded animate-pulse" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer
        className={cn(
          "px-8 py-6 border-t border-white/5 flex items-center justify-between bg-white/[0.01]",
        )}
      >
        <div className="h-3 w-48 bg-accent/30 rounded animate-pulse" />
        <div className="flex items-center gap-3">
          <div className="size-9 bg-accent/30 rounded-xl animate-pulse" />
          <div className="size-9 bg-accent/30 rounded-xl animate-pulse" />
        </div>
      </footer>
    </div>
  );
}
