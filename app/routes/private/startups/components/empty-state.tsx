import { Search, Rocket } from "lucide-react";

interface EmptyStateProps {
  isSearchResult: boolean;
  searchTerm: string;
  onClearSearch: () => void;
}

/**
 * @name EmptyState
 * @description Renderiza estado vazio para ausência de startups ou busca sem resultado.
 */
export function EmptyState({
  isSearchResult,
  searchTerm,
  onClearSearch,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-800 bg-stone-900/60 px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-stone-800 text-stone-500">
        {isSearchResult ? <Search className="size-7" /> : <Rocket className="size-7" />}
      </div>

      <h3 className="mb-2 text-xl font-semibold text-stone-200">
        {isSearchResult ? "Nenhum resultado encontrado" : "Nenhuma startup cadastrada"}
      </h3>

      <p className="mx-auto max-w-md text-sm text-stone-400">
        {isSearchResult
          ? `Não encontramos startups com o termo "${searchTerm}".`
          : "Você ainda não possui startups cadastradas para gerenciamento."}
      </p>

      {isSearchResult ? (
        <button
          type="button"
          onClick={onClearSearch}
          className="mt-4 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d500f9]"
        >
          Limpar busca
        </button>
      ) : null}
    </div>
  );
}
