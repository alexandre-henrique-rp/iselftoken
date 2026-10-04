import { Users } from "lucide-react";
import { Link } from "react-router";

interface ComplianceUsersEmptyStateProps {
  hasActiveFilters: boolean;
}

export function ComplianceUsersEmptyState({
  hasActiveFilters,
}: ComplianceUsersEmptyStateProps) {
  return (
    <div
      className="rounded-2xl border border-white/10 bg-card/70 p-10 text-center shadow-lg md:p-14"
      role="status"
    >
      <Users className="mx-auto h-12 w-12 text-muted-foreground/30" aria-hidden />
      <p className="mt-4 text-sm font-bold text-foreground">
        {hasActiveFilters
          ? "Nenhum usuário encontrado para esses filtros."
          : "Nenhum usuário cadastrado."}
      </p>
      <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
        {hasActiveFilters
          ? "Tente ajustar a pesquisa ou remover os filtros ativos."
          : "Quando alguém se cadastrar na plataforma, aparecerá aqui."}
      </p>
      {hasActiveFilters && (
        <Link
          to="/compliance/users"
          replace
          className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2 text-[10px] font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Limpar filtros
        </Link>
      )}
    </div>
  );
}
