import { Users } from "lucide-react";
import { Link, useSearchParams } from "react-router";

interface AdminUserEmptyStateProps {
  /** Quando true, mostra mensagem de "filtro sem resultado" + CTA para limpar. */
  hasActiveFilters: boolean;
}

/**
 * Empty state da lista de usuários.
 *
 * - Sem filtros: "Nenhum usuário cadastrado" (estado inicial da plataforma)
 * - Com filtros: "Nenhum resultado para esses filtros" + botão "Limpar filtros"
 *
 * Segue STYLE_GUIDE: ícone + mensagem amigável + CTA explícito quando há
 * ação recuperável (limpar filtros).
 */
export function AdminUserEmptyState({
  hasActiveFilters,
}: AdminUserEmptyStateProps) {
  const [searchParams] = useSearchParams();
  const hasFilters =
    hasActiveFilters ||
    searchParams.has("search") ||
    searchParams.has("status") ||
    searchParams.has("createdFrom");

  return (
    <div
      className="rounded-2xl border border-white/10 bg-card/70 p-10 text-center shadow-lg"
      role="status"
    >
      <Users
        className="w-12 h-12 text-muted-foreground/30 mx-auto"
        aria-hidden
      />
      {hasFilters ? (
        <>
          <p className="text-foreground font-bold text-sm">
            Nenhum usuário encontrado para esses filtros.
          </p>
          <p className="text-muted-foreground text-xs max-w-md mx-auto">
            Tente ajustar a pesquisa ou remover os filtros ativos.
          </p>
          <Link
            to="/admin/users"
            replace
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-[10px] font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Limpar filtros
          </Link>
        </>
      ) : (
        <>
          <p className="text-foreground font-bold text-sm">
            Nenhum usuário cadastrado.
          </p>
          <p className="text-muted-foreground text-xs max-w-md mx-auto">
            Quando alguém se cadastrar na plataforma, aparecerá aqui.
          </p>
        </>
      )}
    </div>
  );
}
