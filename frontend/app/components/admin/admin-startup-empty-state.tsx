import { Rocket } from "lucide-react";
import { Link, useSearchParams } from "react-router";

interface AdminStartupEmptyStateProps {
  /** Quando true, mostra mensagem de "filtro sem resultado" + CTA para limpar. */
  hasActiveFilters: boolean;
}

/**
 * Empty state da lista de startups.
 *
 * - Sem filtros: "Nenhuma startup cadastrada" (estado inicial da plataforma)
 * - Com filtros: "Nenhuma startup encontrada" + botão "Limpar filtros"
 *
 * Segue STYLE_GUIDE: ícone + mensagem amigável + CTA explícito quando há
 * ação recuperável (limpar filtros).
 */
export function AdminStartupEmptyState({
  hasActiveFilters,
}: AdminStartupEmptyStateProps) {
  const [searchParams] = useSearchParams();
  const hasFilters =
    hasActiveFilters ||
    searchParams.has("search") ||
    searchParams.has("status") ||
    searchParams.has("segmento");

  return (
    <div
      className="bg-card border border-white/10 rounded-2xl p-10 sm:p-12 text-center space-y-4"
      role="status"
    >
      <Rocket
        className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/30 mx-auto"
        aria-hidden
      />
      {hasFilters ? (
        <>
          <p className="text-foreground font-bold text-sm">
            Nenhuma startup encontrada para esses filtros.
          </p>
          <p className="text-muted-foreground text-xs max-w-md mx-auto">
            Tente ajustar a pesquisa ou remover os filtros ativos.
          </p>
          <Link
            to="/admin/startups"
            replace
            className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            Limpar filtros
          </Link>
        </>
      ) : (
        <>
          <p className="text-foreground font-bold text-sm">
            Nenhuma startup cadastrada.
          </p>
          <p className="text-muted-foreground text-xs max-w-md mx-auto">
            Quando alguém cadastrar uma startup na plataforma, aparecerá aqui.
          </p>
        </>
      )}
    </div>
  );
}
