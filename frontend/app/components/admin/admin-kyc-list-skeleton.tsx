import { cn } from "~/lib/utils";

const ROWS_PLACEHOLDER = 6;

/**
 * Skeleton da tabela de KYC. Preserva layout (6 colunas) enquanto dados
 * carregam do banco. Não exibe nenhum nome/email real.
 *
 * Regra (anti-mock): se não há dado do banco, mostrar placeholder. Zero
 * fabricado é considerado dado mockado e viola o contrato do produto.
 */
export function AdminKycListSkeleton() {
  return (
    <div
      className="glass-panel rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-black/40 backdrop-blur-sm"
      role="status"
      aria-label="Carregando usuários"
    >
      <div className="overflow-x-auto no-scrollbar -mx-3 sm:mx-0">
        <table className="w-full text-left border-collapse min-w-[640px] sm:min-w-0">
          <thead>
            <tr className="bg-accent/20 border-b border-white/5">
              {[
                "ID",
                "Usuário",
                "E-mail",
                "Status KYC",
                "Cadastro",
                "Ação",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {Array.from({ length: ROWS_PLACEHOLDER }).map((_, i) => (
              <tr key={i}>
                <td className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
                  <div className="h-3 w-12 bg-accent/40 rounded animate-pulse" />
                </td>
                <td className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
                  <div className="flex items-center gap-3">
                    <div className="size-9 sm:size-10 rounded-full bg-accent/40 animate-pulse shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-28 bg-accent/40 rounded animate-pulse" />
                      <div className="h-2 w-16 bg-accent/30 rounded animate-pulse" />
                    </div>
                  </div>
                </td>
                <td className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
                  <div className="h-3 w-36 bg-accent/30 rounded animate-pulse" />
                </td>
                <td className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-center">
                  <div className="h-6 w-20 bg-accent/30 rounded-full animate-pulse mx-auto" />
                </td>
                <td className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
                  <div className="h-3 w-20 bg-accent/30 rounded animate-pulse" />
                </td>
                <td className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 text-right">
                  <div className="h-4 w-16 bg-accent/30 rounded animate-pulse ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer
        className={cn(
          "px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center justify-between gap-4 border-t border-white/5 bg-white/1",
        )}
      >
        <div className="h-3 w-44 bg-accent/30 rounded animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="size-9 bg-accent/30 rounded-xl animate-pulse" />
          <div className="size-9 bg-accent/30 rounded-xl animate-pulse" />
        </div>
      </footer>
    </div>
  );
}
