/**
 * TransparencyShell: orquestra header + FeaturedReportCard + TabNav + Posts/Discussion.
 *
 * Extraido da rota para manter `founder.startups.$id.transparencia.tsx` como shell ≤ 40 linhas.
 *
 * Documentacao: scripts/PRD_PAGINA_TRANSPARENCIA.md
 */
import { ArrowLeft, FileText, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useTransparencyDiscussion } from "~/hooks/use-transparency-discussions";
import {
  useCreateTransparencyPost,
  useDeleteTransparencyPost,
  useUpdateTransparencyPost,
} from "~/hooks/use-transparency-mutations";
import { useTransparencyPosts } from "~/hooks/use-transparency-posts";
import { useUser } from "~/hooks/use-user";
import type {
  TransparencyDiscussion,
  TransparencyPost,
  TransparencyPostType,
} from "~/types/transparency";
import { AccessDeniedCard } from "./access-denied-card";
import { DiscussionFeed } from "./discussion-feed";
import { DiscussionThreadView } from "./discussion-thread-view";
import { InstallmentReportsSection } from "./installment-reports-section";
import { PostDetailView } from "./post-detail";
import { PostEditorView } from "./post-editor";
import { FeaturedReportCard } from "./transparency-featured-report";
import { TransparencyPostsList } from "./transparency-posts-list";
import { TransparencyTabs, type TransparencyTab } from "./transparency-tabs";

interface StartupInfo {
  id: number;
  nome: string;
  founderId: number;
}

interface TransparencyShellProps {
  startup: StartupInfo | null;
  startupId: number;
  tab: TransparencyTab;
}

export function TransparencyShell({
  startup,
  startupId,
  tab,
}: TransparencyShellProps) {
  const { user } = useUser();
  const [typeFilter, setTypeFilter] = useState<TransparencyPostType | "">("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const postsQuery = useTransparencyPosts(startupId, {
    type: typeFilter || undefined,
    page,
    limit,
  });
  const createMutation = useCreateTransparencyPost(startupId, {
    type: typeFilter || undefined,
    page,
    limit,
  });
  const updateMutation = useUpdateTransparencyPost(startupId, {
    type: typeFilter || undefined,
    page,
    limit,
  });
  const deleteMutation = useDeleteTransparencyPost(startupId, {
    type: typeFilter || undefined,
    page,
    limit,
  });

  const [selectedPost, setSelectedPost] = useState<TransparencyPost | null>(
    null,
  );
  const [editingPost, setEditingPost] = useState<TransparencyPost | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] =
    useState<TransparencyDiscussion | null>(null);
  const discussionQuery = useTransparencyDiscussion(
    selectedDiscussion?.id ?? "",
  );

  const isFounder =
    !!user && !!startup && Number(user.id) === Number(startup.founderId);
  const isAdmin = !!user && user.role === "ADMIN";
  const isAuthenticated = !!user;
  const accessError =
    postsQuery.error instanceof Error ? postsQuery.error.message : "";
  const is403 = /token|forbidden|403/i.test(accessError);

  // Detail view
  if (selectedPost) {
    return (
      <PostDetailView
        post={selectedPost}
        isAuthor={!!user && Number(user.id) === Number(selectedPost.authorId)}
        isAdmin={isAdmin}
        onBack={() => setSelectedPost(null)}
        onEdit={(p) => {
          setSelectedPost(null);
          setEditingPost(p);
          setEditorOpen(true);
        }}
        onDelete={(postId) =>
          deleteMutation.mutate(postId, {
            onSuccess: () => {
              toast.success("Post deletado.");
              setSelectedPost(null);
            },
            onError: (e) =>
              toast.error(e instanceof Error ? e.message : "Falha ao deletar."),
          })
        }
      />
    );
  }

  // Editor view
  if (editorOpen) {
    return (
      <PostEditorView
        startupId={startupId}
        startupNome={startup?.nome ?? ""}
        post={editingPost}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setEditorOpen(false);
          setEditingPost(null);
        }}
        onSubmit={(data) =>
          editingPost
            ? updateMutation.mutate(
                { postId: editingPost.id, startupId, ...data },
                {
                  onSuccess: () => {
                    toast.success("Post atualizado.");
                    setEditorOpen(false);
                    setEditingPost(null);
                  },
                  onError: (e) =>
                    toast.error(
                      e instanceof Error ? e.message : "Falha ao atualizar.",
                    ),
                },
              )
            : createMutation.mutate(data, {
                onSuccess: () => {
                  toast.success("Post publicado.");
                  setEditorOpen(false);
                  setEditingPost(null);
                },
                onError: (e) =>
                  toast.error(
                    e instanceof Error ? e.message : "Falha ao publicar.",
                  ),
              })
        }
      />
    );
  }

  // Thread view (Discussao)
  if (selectedDiscussion) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {discussionQuery.data ? (
          <DiscussionThreadView
            discussion={discussionQuery.data.discussion}
            repliesCount={discussionQuery.data.replies.length}
            viewerUserId={user?.id ?? null}
            isAdmin={isAdmin}
            startupId={startupId}
            onBack={() => setSelectedDiscussion(null)}
          />
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/home"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-[11px] font-black uppercase tracking-widest mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">
              Transparencia
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-none">
              {startup?.nome ?? `Startup #${startupId}`}
            </h1>
            <p className="text-muted-foreground text-sm mt-3 max-w-xl">
              Atualizacoes financeiras, marcos de produto e mudancas societarias
              publicadas pelo fundador para os investidores com tokens.
            </p>
          </div>
          {isFounder && tab === "atualizacoes" && (
            <button
              onClick={() => {
                setEditingPost(null);
                setEditorOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" /> Postar atualizacao
            </button>
          )}
        </div>
      </div>

      {/* Featured (se houver) */}
      <FeaturedReportCard
        startupId={startupId}
        isAuthor={isFounder}
        isAdmin={isAdmin}
        userId={user?.id ?? null}
      />

      {/* TabNav */}
      <TransparencyTabs active={tab} onChange={() => {}} />

      {/* Conteudo da aba */}
      {is403 ? (
        <AccessDeniedCard startupId={startupId} />
      ) : tab === "atualizacoes" ? (
        <div className="space-y-8">
          {/* FIN-09 + FIN-11 §8.2 — secao dedicada com auto-posts de
              InstallmentRequest aprovada. Aparece ANTES do feed manual. */}
          <InstallmentReportsSection
            startupId={startupId}
            visibleLimit={6}
          />
          {/* Feed manual de atualizacoes (exclui os auto-posts do Repasse
              via filtro client-side para nao duplicar). */}
          <TransparencyPostsList
            posts={
              (postsQuery.data?.data ?? []).filter(
                (p) => p.sourceType !== "INSTALLMENT_REQUEST",
              )
            }
            total={
              (postsQuery.data?.total ?? 0) -
              (postsQuery.data?.data ?? []).filter(
                (p) => p.sourceType === "INSTALLMENT_REQUEST",
              ).length
            }
            page={page}
            limit={limit}
            isLoading={postsQuery.isLoading}
            isFounder={isFounder}
            isAdmin={isAdmin}
            userId={user?.id ?? null}
            typeFilter={typeFilter}
            onTypeChange={(t) => {
              setTypeFilter(t);
              setPage(1);
            }}
            onPageChange={setPage}
            onSelect={setSelectedPost}
          />
        </div>
      ) : (
        <DiscussionFeed
          startupId={startupId}
          isAuthenticated={isAuthenticated}
          canPost={isAuthenticated}
          onSelectThread={setSelectedDiscussion}
        />
      )}

      {/* Empty startup hint */}
      {!startup && (
        <div className="text-center text-xs text-muted-foreground py-8">
          <FileText className="w-8 h-8 mx-auto opacity-40" />
        </div>
      )}
    </div>
  );
}
