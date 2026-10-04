import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  LayoutGrid,
  List,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useFetcher, useSearchParams } from "react-router";
import { cn } from "~/lib/utils";
import type { PaginatedCatalog } from "~/types/paginated-catalog";
import { StartupGridCard } from "./startup-grid-card";
import { StartupListRow } from "./startup-list-row";
import { StickyFilterBar } from "./sticky-filter-bar";

type ViewMode = "cards" | "list";

const VIEW_STORAGE_KEY = "marketplace.viewMode";

export function StartupGrid({
  initialCatalog,
}: {
  initialCatalog: PaginatedCatalog;
}) {
  const [params] = useSearchParams();
  const [view, setView] = useState<ViewMode>("cards");
  const fetcher = useFetcher<{ data: PaginatedCatalog }>();

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem(VIEW_STORAGE_KEY)
        : null;
    if (saved === "cards" || saved === "list") setView(saved);
  }, []);

  // Filtros que afetam o catálogo. velocity é exclusivo do EarlyAccess.
  const catalogParams = new URLSearchParams();
  for (const key of ["q", "sort", "sector", "page", "pageSize"] as const) {
    const v = params.get(key);
    if (v) catalogParams.set(key, v);
  }
  const catalogQs = catalogParams.toString();
  const lastCatalogQsRef = useRef(catalogQs);

  // Evita que a segunda execução de effects do React Strict Mode refaça a
  // carga inicial. Depois disso, recarrega apenas quando o filtro mudou.
  useEffect(() => {
    if (lastCatalogQsRef.current === catalogQs) return;

    lastCatalogQsRef.current = catalogQs;
    fetcher.load(
      catalogQs ? `/api/marketplace/all?${catalogQs}` : "/api/marketplace/all",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogQs]);

  const setViewPersist = (next: ViewMode) => {
    setView(next);
    if (typeof window !== "undefined")
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  };

  const catalog = fetcher.data?.data ?? initialCatalog;
  const startups = catalog.data;
  const { page, pageSize, total, hasMore } = catalog;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + startups.length;

  const buildPageHref = (nextPage: number) => {
    const next = new URLSearchParams(params);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    const search = next.toString();
    return search ? `?${search}` : "";
  };

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <div>
          <span className="text-primary font-bold text-[11px] tracking-widest uppercase mb-1 block">
            Catálogo Completo
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Todas as Rodadas Abertas
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            {total === 0
              ? "Nenhuma startup disponível com esses filtros"
              : `Mostrando ${startIndex + 1}–${endIndex} de ${total} startups`}
          </p>
        </div>
        <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1 self-start sm:self-auto">
          <button
            onClick={() => setViewPersist("cards")}
            aria-pressed={view === "cards"}
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition-all",
              view === "cards"
                ? "bg-primary text-black"
                : "text-muted-foreground hover:text-white",
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cards
          </button>
          <button
            onClick={() => setViewPersist("list")}
            aria-pressed={view === "list"}
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition-all",
              view === "list"
                ? "bg-primary text-black"
                : "text-muted-foreground hover:text-white",
            )}
          >
            <List className="w-3.5 h-3.5" />
            Lista
          </button>
        </div>
      </div>

      <div className="mb-6">
        <StickyFilterBar />
      </div>

      {startups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm font-bold">
            Nenhuma startup encontrada com esses filtros.
          </p>
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {startups.map((s) => (
            <StartupGridCard key={s.id} startup={s} />
          ))}
        </div>
      ) : (
        <div className="border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 bg-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              Startup <ArrowUpDown className="w-3 h-3 opacity-40" />
            </span>
            <span>Setor</span>
            <span>Equity</span>
            <span>Valuation</span>
            <span>% Captado</span>
            <span>Selos</span>
            <span className="w-4" />
          </div>
          {startups.map((s) => (
            <StartupListRow key={s.id} startup={s} />
          ))}
        </div>
      )}

      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-center gap-3 mt-8">
          {page > 1 && (
            <Link
              to={buildPageHref(page - 1)}
              preventScrollReset
              replace
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/10 bg-white/5 text-white text-[11px] font-black uppercase tracking-widest hover:bg-primary/10 hover:border-primary/40 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Anterior
            </Link>
          )}
          <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">
            Página {page}
          </span>
          {hasMore && (
            <Link
              to={buildPageHref(page + 1)}
              preventScrollReset
              replace
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-[11px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all"
            >
              Próxima
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
