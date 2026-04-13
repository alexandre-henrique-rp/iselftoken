import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import type { StartupFiltersState } from "./types";

interface StartupFiltersProps {
  filters: StartupFiltersState;
  onFiltersChange: (nextFilters: StartupFiltersState) => void;
  onSearchChange: (value: string) => void;
}

/**
 * @name StartupFilters
 * @description Renderiza os filtros de status, campanha e busca da listagem.
 */
export function StartupFilters({
  filters,
  onFiltersChange,
  onSearchChange,
}: StartupFiltersProps) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-stone-800 bg-stone-900 p-4 md:flex-row md:items-center">
      <div className="flex-1">
        <label className="sr-only" htmlFor="search-startup">
          Buscar por nome ou segmento
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
          <Input
            id="search-startup"
            value={filters.search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nome ou segmento..."
            className="border-stone-800 bg-stone-950 pl-9 text-stone-200 placeholder:text-stone-500 focus-visible:ring-blue-500/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="sr-only" htmlFor="status-filter">
          Filtrar por status
        </label>
        <select
          id="status-filter"
          value={filters.status}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              status: event.target.value as StartupFiltersState["status"],
            })
          }
          className="h-9 w-full rounded-md border border-stone-800 bg-stone-950 px-3 text-sm text-stone-200 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500/50 md:w-44"
        >
          <option value="all">Todas</option>
          <option value="approved">Aprovada</option>
          <option value="analysis">Em análise</option>
          <option value="rejected">Rejeitada</option>
          <option value="draft">Rascunho</option>
        </select>

        <label className="sr-only" htmlFor="campaign-filter">
          Filtrar por campanha
        </label>
        <select
          id="campaign-filter"
          value={filters.campaign}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              campaign: event.target.value as StartupFiltersState["campaign"],
            })
          }
          className="h-9 w-full rounded-md border border-stone-800 bg-stone-950 px-3 text-sm text-stone-200 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500/50 md:w-44"
        >
          <option value="all">Todas</option>
          <option value="editing">Em edição</option>
          <option value="open">Aberta</option>
          <option value="funded">Financiada</option>
          <option value="closed">Encerrada</option>
        </select>
      </div>
    </section>
  );
}
