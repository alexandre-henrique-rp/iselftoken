/**
 * DiscussionSearchBar: busca + ordenar + categoria + botao Nova thread.
 *
 * - Busca textual com debounce 300ms (controlada internamente).
 * - Ordenacao: Recentes / Mais antigos / Mais votados.
 * - Categoria: Todos / Geral / Financeiro / Produto / Societario / Duvida.
 */
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  DISCUSSION_CATEGORIES,
  DISCUSSION_CATEGORY_LABELS,
  DISCUSSION_SORT_LABELS,
  type DiscussionCategory,
  type DiscussionSort,
} from "~/types/transparency";

interface DiscussionSearchBarProps {
  q: string;
  sort: DiscussionSort;
  category: DiscussionCategory | "";
  onQChange: (next: string) => void;
  onSortChange: (next: DiscussionSort) => void;
  onCategoryChange: (next: DiscussionCategory | "") => void;
  onNewThread: () => void;
  /** false esconde o botao (visitante sem token). */
  canPost: boolean;
}

export function DiscussionSearchBar({
  q,
  sort,
  category,
  onQChange,
  onSortChange,
  onCategoryChange,
  onNewThread,
  canPost,
}: DiscussionSearchBarProps) {
  const [local, setLocal] = useState(q);

  useEffect(() => {
    setLocal(q);
  }, [q]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (local !== q) onQChange(local);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <div className="flex flex-wrap gap-2 items-center" data-testid="discussion-search-bar">
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="Buscar em titulos e conteudo..."
        className="flex-1 min-w-[200px] bg-background border border-border rounded-lg px-3 py-2 text-sm"
        aria-label="Buscar discussions"
      />

      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as DiscussionSort)}
        className="bg-background border border-border rounded-lg px-3 py-2 text-xs"
        aria-label="Ordenar"
      >
        {(Object.keys(DISCUSSION_SORT_LABELS) as DiscussionSort[]).map((s) => (
          <option key={s} value={s}>
            {DISCUSSION_SORT_LABELS[s]}
          </option>
        ))}
      </select>

      <select
        value={category}
        onChange={(e) =>
          onCategoryChange(e.target.value as DiscussionCategory | "")
        }
        className="bg-background border border-border rounded-lg px-3 py-2 text-xs"
        aria-label="Categoria"
      >
        <option value="">Todas categorias</option>
        {DISCUSSION_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {DISCUSSION_CATEGORY_LABELS[c]}
          </option>
        ))}
      </select>

      {canPost && (
        <button
          onClick={onNewThread}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:opacity-90 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Nova thread
        </button>
      )}
    </div>
  );
}