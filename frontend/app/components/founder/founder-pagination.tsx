import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router";
import { updateSearch } from "./dashboard-state";
import { cn } from "~/lib/utils";

interface FounderPaginationProps {
  page: number;
  totalPages: number;
  shown: number;
  total: number;
}

export function FounderPagination({ page, totalPages, shown, total }: FounderPaginationProps) {
  const [, setSearchParams] = useSearchParams();
  const goTo = (next: number) => {
    const clamped = Math.min(Math.max(1, next), totalPages);
    updateSearch(setSearchParams, { page: clamped === 1 ? "" : String(clamped) });
  };

  const pages = computePageSequence(page, totalPages);
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-white/5">
      <div className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
        Mostrando <span className="text-foreground tabular-nums">{shown}</span> de{" "}
        <span className="text-foreground tabular-nums">{total}</span> startups
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={prevDisabled}
          onClick={() => goTo(page - 1)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent/40 text-muted-foreground border border-white/5 disabled:opacity-20"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="font-black text-[10px] uppercase tracking-widest">Anterior</span>
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="px-1.5 text-muted-foreground font-black text-[11px]"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === page ? "page" : undefined}
              onClick={() => goTo(p)}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center font-black text-[11px] tabular-nums transition-colors",
                p === page
                  ? "bg-primary text-black shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          disabled={nextDisabled}
          onClick={() => goTo(page + 1)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent/40 text-muted-foreground border border-white/5 disabled:opacity-20"
        >
          <span className="font-black text-[10px] uppercase tracking-widest">Próximo</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
}

function computePageSequence(page: number, totalPages: number): Array<number | "…"> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const result: Array<number | "…"> = [1];
  const left = Math.max(2, page - 1);
  const right = Math.min(totalPages - 1, page + 1);
  if (left > 2) result.push("…");
  for (let p = left; p <= right; p++) result.push(p);
  if (right < totalPages - 1) result.push("…");
  result.push(totalPages);
  return result;
}
