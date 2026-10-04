import { AlertCircle } from "lucide-react";
import { useSearchParams } from "react-router";
import { AdminUserEmptyState } from "~/components/admin/admin-user-empty-state";
import { AdminUserFilters } from "~/components/admin/admin-user-filters";
import { AdminUserTable } from "~/components/admin/admin-user-table";
import { AdminUserTableSkeleton } from "~/components/admin/admin-user-table-skeleton";
import { useAdminUsersQuery } from "~/hooks/use-admin-users";
import type { AdminUserStatus } from "~/lib/queries";

const PAGE_LIMIT = 25;

interface AdminUsersContentProps {
  search: string;
  status: string;
  createdFrom: string;
}

/**
 * AdminUsersContent — conteúdo da rota /admin/users.
 *
 * 4 estados obrigatórios (STYLE_GUIDE):
 *  - Loading: skeleton preserva layout (sem zeros fabricados)
 *  - Error: alert com ícone + retry
 *  - Empty: ícone + mensagem + CTA "Limpar filtros" (se filtros ativos)
 *  - Data: tabela + paginação
 */
export function AdminUsersContent({
  search,
  status,
  createdFrom,
}: AdminUsersContentProps) {
  const [params] = useSearchParams();
  const page = Number(params.get("page") || "1");
  const { data, isLoading, isError, refetch } = useAdminUsersQuery({
    page,
    search,
    status: (status || undefined) as AdminUserStatus | undefined,
    createdFrom: createdFrom || undefined,
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const currentPage = data?.pagina ?? page;
  const hasActiveFilters = Boolean(search || status || createdFrom);

  if (isLoading && !data) {
    return (
      <>
        <AdminUserFilters filters={{ search, status, createdFrom }} />
        <AdminUserTableSkeleton />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <AdminUserFilters filters={{ search, status, createdFrom }} />
        <div
          className="rounded-2xl border border-white/10 bg-card/70 p-8 text-center shadow-lg md:p-10"
          role="alert"
        >
          <AlertCircle
            className="w-10 h-10 text-destructive mx-auto"
            aria-hidden
          />
          <p className="text-destructive text-sm font-bold">
            Não foi possível carregar usuários do banco de dados.
          </p>
          <p className="text-muted-foreground text-xs">
            Verifique a conexão com o backend e tente novamente.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2 text-[10px] font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Tentar novamente
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminUserFilters filters={{ search, status, createdFrom }} />
      {users.length === 0 ? (
        <AdminUserEmptyState hasActiveFilters={hasActiveFilters} />
      ) : (
        <AdminUserTable
          users={users}
          pagination={{
            page: currentPage,
            limit: PAGE_LIMIT,
            total,
            totalPages: Math.max(1, Math.ceil(total / PAGE_LIMIT)),
          }}
        />
      )}
    </>
  );
}
