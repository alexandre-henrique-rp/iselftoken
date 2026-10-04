import { Link, useSearchParams } from "react-router";
import { ShieldCheck } from "lucide-react";

interface AdminKycListEmptyStateProps {
  /** Quando true, mostra mensagem de "filtro sem resultado" + CTA para limpar. */
  hasActiveFilters: boolean;
}

/**
 * Empty state da fila de KYC.
 *
 * - Sem filtros: "Nenhum usuário cadastrado" (estado inicial da plataforma)
 * - Com filtros: "Nenhum resultado" + botão "Limpar filtros"
 *
 * Segue STYLE_GUIDE: ícone + mensagem amigável + CTA explícito quando há
 * ação recuperável (limpar filtros).
 */
export function AdminKycListEmptyState({
  hasActiveFilters,
}: AdminKycListEmptyStateProps) {
  const [params] = useSearchParams();
  const hasFilters =
    hasActiveFilters || params.has("search") || params.has("kycStatus");

  return (
    <div
      className="glass-panel rounded-2xl p-12 text-center space-y-4"
      role="status"
    >
      <ShieldCheck
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
            to="/admin/kyc"
            replace
            className="inline-flex items-center gap-2 mt-4 px-6 py-2 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition"
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
            Quando alguém se cadastrar na plataforma, aparecerá aqui para
            revisão de KYC.
          </p>
        </>
      )}
    </div>
  );
}
