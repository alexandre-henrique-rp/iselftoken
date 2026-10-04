/**
 * Pagination — Paginação offset-based reutilizável.
 *
 * Renderiza botões Anterior / Próxima + números de página com ellipsis
 * para listas grandes. Acessível (aria-label, aria-current) e PT-BR.
 */

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  /** Rótulo do recurso (ex: "cupons") usado em aria-labels */
  itemLabel?: string;
}

function buildPageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("ellipsis");

  pages.push(total);
  return pages;
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  itemLabel = "itens",
}: PaginationProps) {
  const range = buildPageRange(page, totalPages);
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <nav
      role="navigation"
      aria-label="Paginacao"
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4"
    >
      <p className="text-xs text-on-surface-variant" aria-live="polite">
        Mostrando <span className="font-semibold text-on-surface">{start}</span>–
        <span className="font-semibold text-on-surface">{end}</span> de{" "}
        <span className="font-semibold text-on-surface">{total}</span> {itemLabel}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={isFirst}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-outline text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Pagina anterior"
        >
          Anterior
        </button>

        {range.map((p, idx) =>
          p === "ellipsis" ? (
            <span
              key={`e-${idx}`}
              className="px-2 text-xs text-on-surface-dim select-none"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              aria-label={`Ir para pagina ${p}`}
              className={`min-w-[2.25rem] h-8 px-2 text-xs font-medium rounded-lg transition-colors ${
                p === page
                  ? "bg-primary text-on-primary-fixed"
                  : "border border-outline text-on-surface hover:bg-surface-container"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={isLast}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-outline text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Proxima pagina"
        >
          Proxima
        </button>
      </div>
    </nav>
  );
}
