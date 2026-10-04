/**
 * Lista paginada de Posts (aba Atualizacoes).
 *
 * Orquestra: filter chips + empty state + grid de PostCardItem + pagination.
 *
 * Helper text acima do filtro explica que a lista abaixo contem apenas
 * posts manuais — os relatorios de solicitacao estao na secao dedicada
 * acima (InstallmentReportsSection) renderizada pelo TransparencyShell.
 */
import { Info, Loader2 } from "lucide-react";
import {
  TRANSPARENCY_POST_TYPES,
  type TransparencyPost,
  type TransparencyPostType,
} from "~/types/transparency";
import { FilterChips } from "./filter-chips";
import { Pagination } from "./pagination";
import { PostCardItem } from "./post-card";
import { EmptyState } from "./empty-state";

interface PostsListProps {
  posts: TransparencyPost[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  isFounder: boolean;
  isAdmin: boolean;
  userId: number | null;
  typeFilter: TransparencyPostType | "";
  onTypeChange: (next: TransparencyPostType | "") => void;
  onPageChange: (next: number) => void;
  onSelect: (post: TransparencyPost) => void;
}

export function TransparencyPostsList({
  posts,
  total,
  page,
  limit,
  isLoading,
  isFounder,
  isAdmin,
  userId,
  typeFilter,
  onTypeChange,
  onPageChange,
  onSelect,
}: PostsListProps) {
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
          Todas as atualizacoes
        </h2>
        <p className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1.5">
          <Info className="h-3 w-3" />
          Posts manuais do fundador. Relatorios de parcelas estao acima.
        </p>
      </header>

      <FilterChips current={typeFilter} onChange={onTypeChange} />

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && posts.length === 0 && (
        <EmptyState
          title="Nenhum post manual publicado."
          description={
            isFounder
              ? "Clique em 'Postar atualizacao' para comecar."
              : "Quando o fundador publicar atualizacoes, elas aparecerao aqui."
          }
        />
      )}

      {!isLoading && posts.length > 0 && (
        <>
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCardItem
                key={post.id}
                post={post}
                onClick={() => onSelect(post)}
                isAuthor={!!userId && Number(userId) === Number(post.authorId)}
                isAdmin={isAdmin}
              />
            ))}
          </div>

          <Pagination
            page={page}
            total={total}
            limit={limit}
            onChange={onPageChange}
          />
        </>
      )}

      {/* Hint: TRANSP_POST_TYPES vazio renderiza nada - export usado para tree-shake guard */}
      <span className="hidden">{TRANSPARENCY_POST_TYPES.length}</span>
    </div>
  );
}