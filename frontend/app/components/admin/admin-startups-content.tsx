import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { AdminStartupEmptyState } from "~/components/admin/admin-startup-empty-state";
import { AdminStartupFilters } from "~/components/admin/admin-startup-filters";
import { AdminStartupTable } from "~/components/admin/admin-startup-table";
import { AdminStartupTableSkeleton } from "~/components/admin/admin-startup-table-skeleton";
import { useAdminStartupsQuery } from "~/hooks/use-admin-startups";
import { adminSealsQueryOptions } from "~/lib/queries";

const PAGE_LIMIT = 25;

interface AdminStartupsContentProps {
  search: string;
  status: string;
  segmento: string;
}

/**
 * AdminStartupsContent — shell com 4 estados (STYLE_GUIDE).
 *
 *  - Loading: skeleton preserva layout (sem zeros fabricados)
 *  - Error: alert com ícone + retry
 *  - Empty: ícone + mensagem + CTA "Limpar filtros" (se filtros ativos)
 *  - Data: tabela + paginação
 */
export function AdminStartupsContent({
  search,
  status,
  segmento,
}: AdminStartupsContentProps) {
  const { data, isLoading, isError, refetch } = useAdminStartupsQuery({
    search,
    status: status || undefined,
    segmento: segmento || undefined,
  });
  const { data: sealCatalogData } = useQuery(adminSealsQueryOptions);

  const startups = data?.data ?? [];
  const total = data?.total ?? 0;
  const currentPage = data?.pagina ?? 1;
  const hasActiveFilters = Boolean(search || status || segmento);

  if (isLoading && !data) {
    return (
      <>
        <AdminStartupFilters filters={{ search, status, segmento }} />
        <AdminStartupTableSkeleton />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <AdminStartupFilters filters={{ search, status, segmento }} />
        <div
          className="bg-card border border-white/10 rounded-2xl p-8 sm:p-10 text-center space-y-4"
          role="alert"
        >
          <AlertCircle
            className="w-10 h-10 text-destructive mx-auto"
            aria-hidden
          />
          <p className="text-destructive text-sm font-bold">
            Não foi possível carregar startups do banco de dados.
          </p>
          <p className="text-muted-foreground text-xs">
            Verifique a conexão com o backend e tente novamente.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            Tentar novamente
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminStartupFilters filters={{ search, status, segmento }} />
      {startups.length === 0 ? (
        <AdminStartupEmptyState hasActiveFilters={hasActiveFilters} />
      ) : (
        <AdminStartupTable
          startups={startups}
          pagination={{
            page: currentPage,
            limit: PAGE_LIMIT,
            total,
            totalPages: Math.max(1, Math.ceil(total / PAGE_LIMIT)),
          }}
          sealCatalog={sealCatalogData?.data ?? []}
        />
      )}
    </>
  );
}
