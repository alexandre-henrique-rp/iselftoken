/**
 * Paginacao numerica (Anterior / Proxima). Total/limit vem do backend.
 */
interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onChange: (next: number) => void;
}

export function Pagination({
  page,
  total,
  limit,
  onChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border border-border disabled:opacity-40 hover:border-foreground"
      >
        Anterior
      </button>
      <span className="text-xs text-muted-foreground">
        Pagina {page} de {totalPages}
      </span>
      <button
        onClick={() => onChange(page < totalPages ? page + 1 : page)}
        disabled={page >= totalPages}
        className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border border-border disabled:opacity-40 hover:border-foreground"
      >
        Proxima
      </button>
    </div>
  );
}