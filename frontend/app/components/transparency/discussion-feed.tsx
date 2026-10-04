/**
 * DiscussionFeed: orquestra sticky + lista + search bar.
 *
 * - Pinned sempre primeiro (renderizado acima da lista).
 * - Demais ordenadas conforme sort (recente/antigo/top).
 * - Estado: q, sort, category, page. Click em thread -> onSelect.
 */
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTransparencyDiscussions } from "~/hooks/use-transparency-discussions";
import type {
  DiscussionCategory,
  DiscussionSort,
  TransparencyDiscussion,
} from "~/types/transparency";
import { DiscussionSearchBar } from "./discussion-search-bar";
import { DiscussionStickyPin } from "./discussion-sticky-pin";
import { DiscussionList } from "./discussion-list";
import { DiscussionEditor } from "./discussion-editor";
import { useCreateDiscussion } from "~/hooks/use-transparency-discussion-mutations";
import { EmptyState } from "./empty-state";

interface DiscussionFeedProps {
  startupId: number;
  isAuthenticated: boolean;
  canPost: boolean;
  onSelectThread: (d: TransparencyDiscussion) => void;
}

export function DiscussionFeed({
  startupId,
  isAuthenticated,
  canPost,
  onSelectThread,
}: DiscussionFeedProps) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<DiscussionSort>("recent");
  const [category, setCategory] = useState<DiscussionCategory | "">("");
  const [page] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);

  const { data, isLoading } = useTransparencyDiscussions(startupId, {
    q,
    sort,
    category: category || undefined,
    page,
    limit: 20,
  });

  const createMutation = useCreateDiscussion(startupId, { q, sort, category: category || undefined });

  const items = data?.items ?? [];

  // Backend retorna pinned ja separado no topo (DEC). Mas defensivamente
  // garantimos aqui tambem caso o backend nao separe.
  const { pinned, rest } = useMemo(() => {
    const pinnedItems = items.filter((i) => i.isPinned);
    const restItems = items.filter((i) => !i.isPinned);
    return { pinned: pinnedItems, rest: restItems };
  }, [items]);

  return (
    <div className="space-y-4" data-testid="discussion-feed">
      <DiscussionSearchBar
        q={q}
        sort={sort}
        category={category}
        onQChange={setQ}
        onSortChange={setSort}
        onCategoryChange={setCategory}
        onNewThread={() => setEditorOpen(true)}
        canPost={canPost}
      />

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && pinned.length > 0 && (
        <div className="space-y-2">
          {pinned.map((d) => (
            <DiscussionStickyPin
              key={d.id}
              discussion={d}
              isAuthenticated={isAuthenticated}
              onClick={() => onSelectThread(d)}
            />
          ))}
        </div>
      )}

      {!isLoading && rest.length === 0 && pinned.length === 0 && (
        <EmptyState
          title="Nenhuma discussao ainda"
          description={
            canPost
              ? "Clique em '+ Nova thread' para iniciar uma conversa."
              : "Quando alguem abrir uma discussao, ela aparecera aqui."
          }
        />
      )}

      {!isLoading && (
        <DiscussionList
          items={rest}
          isAuthenticated={isAuthenticated}
          onSelect={onSelectThread}
        />
      )}

      {editorOpen && (
        <DiscussionEditor
          isSubmitting={createMutation.isPending}
          onCancel={() => setEditorOpen(false)}
          onSubmit={(data) =>
            createMutation.mutate(data, {
              onSuccess: () => setEditorOpen(false),
            })
          }
        />
      )}
    </div>
  );
}