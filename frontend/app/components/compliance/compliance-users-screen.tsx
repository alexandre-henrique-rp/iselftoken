import { AlertCircle } from "lucide-react";
import { useAdminUsersQuery } from "~/hooks/use-admin-users";
import type { ComplianceUsersFilters } from "~/lib/compliance-users-loader";
import { UserFilters } from "~/components/compliance/user-filters";
import { ComplianceUsersEmptyState } from "~/components/compliance/compliance-users-empty-state";
import { ComplianceUserTable } from "~/components/compliance/user-list-table";
import { ComplianceUserTableSkeleton } from "~/components/compliance/compliance-user-table-skeleton";

interface ComplianceUsersScreenProps {
  filters: ComplianceUsersFilters;
}

export function ComplianceUsersScreen({ filters }: ComplianceUsersScreenProps) {
  const { data, isError, isLoading, refetch } = useAdminUsersQuery(filters);
  const hasActiveFilters = Boolean(filters.search || filters.role || filters.kycStatus);

  return (
    <div className="relative w-full max-w-7xl xl:max-w-[1400px] mx-auto">
      <header className="mb-6 flex flex-col gap-5 md:mb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-primary">
            Compliance
          </span>
          <h1 className="text-4xl font-black leading-none tracking-tighter text-foreground sm:text-5xl lg:text-[3.25rem]">
            Usuários
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Analise os perfis cadastrados, o status KYC e os planos associados.
            Selecione um usuário para abrir o detalhe de auditoria.
          </p>
        </div>
        {data && (
          <span className="shrink-0 self-start rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary md:self-auto">
            {data.total.toLocaleString("pt-BR")} resultado{data.total !== 1 ? "s" : ""}
          </span>
        )}
      </header>

      <UserFilters
        search={filters.search ?? ""}
        role={filters.role ?? ""}
        kycStatus={filters.kycStatus ?? ""}
      />

      {isLoading && !data ? (
        <ComplianceUserTableSkeleton />
      ) : isError ? (
        <div
          className="rounded-2xl border border-white/10 bg-card/70 p-8 text-center shadow-lg md:p-10"
          role="alert"
        >
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden />
          <p className="mt-3 text-sm font-bold text-destructive">
            Não foi possível carregar os usuários.
          </p>
          <p className="text-xs text-muted-foreground">
            Verifique a conexão com o backend e tente novamente.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2 text-[10px] font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Tentar novamente
          </button>
        </div>
      ) : data?.data.length ? (
        <ComplianceUserTable
          users={data.data}
          pagination={{
            page: data.pagina,
            limit: filters.limit,
            total: data.total,
            totalPages: Math.max(1, Math.ceil(data.total / filters.limit)),
          }}
        />
      ) : (
        <ComplianceUsersEmptyState hasActiveFilters={hasActiveFilters} />
      )}
    </div>
  );
}
