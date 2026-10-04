import { Search } from "lucide-react";
import { Form } from "react-router";
import type { FinanceiroSplitFilters } from "~/lib/queries";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "FUNDED", label: "FUNDED" },
  { value: "PAID_OUT", label: "PAID_OUT" },
  { value: "CLOSED", label: "CLOSED" },
  { value: "OPEN", label: "OPEN" },
] as const;

interface FinanceiroSplitFiltersProps {
  filters: FinanceiroSplitFilters;
}

/**
 * Filtros GET da página /admin/financeiro/split — período, status, busca.
 * Submissão por Form GET (mesmo padrão de admin-startup-filters).
 */
export function FinanceiroSplitFiltersBar({
  filters,
}: FinanceiroSplitFiltersProps) {
  return (
    <Form
      method="get"
      className="bg-card border border-white/10 p-4 sm:p-5 rounded-2xl mb-6 md:mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_10rem_10rem_12rem_auto] gap-4 items-end shadow-lg"
    >
      <input type="hidden" name="page" value="1" />

      <div className="min-w-0 space-y-2">
        <label
          htmlFor="financeiro-split-search"
          className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] ml-1"
        >
          Startup (nome ou slug)
        </label>
        <div className="relative group">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors"
            aria-hidden="true"
          />
          <input
            id="financeiro-split-search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Ex: Acme"
            className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 placeholder:text-muted-foreground/50 font-medium transition-all text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="financeiro-split-from"
          className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] ml-1"
        >
          De (allocatedAt)
        </label>
        <input
          id="financeiro-split-from"
          name="from"
          type="date"
          defaultValue={filters.from ?? ""}
          className="w-full bg-black/30 border border-white/10 rounded-xl px-3.5 py-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 font-medium transition-all text-sm"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="financeiro-split-to"
          className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] ml-1"
        >
          Até (allocatedAt)
        </label>
        <input
          id="financeiro-split-to"
          name="to"
          type="date"
          defaultValue={filters.to ?? ""}
          className="w-full bg-black/30 border border-white/10 rounded-xl px-3.5 py-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 font-medium transition-all text-sm"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="financeiro-split-status"
          className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] ml-1"
        >
          Status da campanha
        </label>
        <select
          id="financeiro-split-status"
          name="status"
          defaultValue={filters.status ?? ""}
          className="w-full bg-black/30 border border-white/10 rounded-xl px-3.5 py-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 font-medium transition-all text-sm"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/60 rounded-xl px-5 py-3 font-black uppercase tracking-widest text-xs transition-colors"
      >
        Filtrar
      </button>
    </Form>
  );
}
