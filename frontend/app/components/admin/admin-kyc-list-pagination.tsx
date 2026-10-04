import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminKycListPaginationProps {
  pagination: Pagination;
}

/**
 * Paginação da fila de KYC.
 * Layout responsivo: empilhado no mobile, lado-a-lado no desktop.
 * Botões com estado disabled visual (opacity-40 cursor-not-allowed).
 */
export function AdminKycListPagination({
  pagination,
}: AdminKycListPaginationProps) {
  const [, setSearchParams] = useSearchParams();
  const primeiro =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const ultimo = Math.min(pagination.page * pagination.limit, pagination.total);

  const goToPage = (page: number) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", String(page));
        return next;
      },
      { replace: true },
    );
  };

  return (
    <footer className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 border-t border-white/5 bg-white/1">
      <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
        Exibindo{" "}
        <span className="text-foreground">
          {primeiro}–{ultimo}
        </span>{" "}
        de{" "}
        <span className="text-foreground">
          {pagination.total.toLocaleString("pt-BR")}
        </span>{" "}
        usuários
      </div>
      <nav
        className="flex items-center gap-3"
        aria-label="Paginação da fila de KYC"
      >
        <button
          type="button"
          disabled={pagination.page <= 1}
          onClick={() => goToPage(pagination.page - 1)}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-xl",
            "bg-accent/40 border border-white/10 text-muted-foreground",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "hover:text-primary transition-all",
          )}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
        </button>
        <div className="flex items-center gap-1.5">
          <span
            className="px-3 h-9 flex items-center justify-center rounded-xl bg-primary text-black font-black text-xs shadow-lg shadow-primary/20"
            aria-current="page"
          >
            {pagination.page}
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            de {pagination.totalPages}
          </span>
        </div>
        <button
          type="button"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => goToPage(pagination.page + 1)}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-xl",
            "bg-accent/40 border border-white/10 text-muted-foreground",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "hover:text-primary transition-all",
          )}
          aria-label="Próxima página"
        >
          <ChevronRight className="w-4 h-4" aria-hidden />
        </button>
      </nav>
    </footer>
  );
}
