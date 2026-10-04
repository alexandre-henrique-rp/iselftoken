/**
 * DiscussionThreadView: thread expandida + replies + acoes.
 *
 * - Markdown sanitizado.
 * - Botoes Editar (ate 24h) / Excluir (ate 24h) com countdown `XhYm`.
 * - Botoes Fixar / Destfixar (apenas founder/admin).
 * - Modal de confirmacao ao deletar thread com replies (checkbox obrigatorio).
 */
import { useState } from "react";
import { ArrowLeft, Pin, PinOff, Edit, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import type { TransparencyDiscussion } from "~/types/transparency";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS_PT,
  countdownTo24h,
  relativeTime,
} from "./_shared";
import { DiscussionEditor } from "./discussion-editor";
import { DiscussionConfirmDelete } from "./discussion-confirm-delete";
import { DiscussionConfirmPin } from "./discussion-confirm-pin";
import { DiscussionReplies } from "./discussion-replies";
import { DiscussionUpvoteToggle } from "./discussion-upvote-toggle";
import {
  useDeleteDiscussion,
  useUpdateDiscussion,
} from "~/hooks/use-transparency-discussion-mutations";
import { useTogglePin } from "~/hooks/use-transparency-discussion-pin";

interface ThreadViewProps {
  discussion: TransparencyDiscussion;
  repliesCount: number;
  viewerUserId: number | null;
  isAdmin: boolean;
  startupId: number;
  onBack: () => void;
}

export function DiscussionThreadView({
  discussion,
  repliesCount,
  viewerUserId,
  isAdmin,
  startupId,
  onBack,
}: ThreadViewProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPin, setConfirmPin] = useState<"pin" | "unpin" | null>(null);

  const updateMutation = useUpdateDiscussion();
  const deleteMutation = useDeleteDiscussion();
  const togglePin = useTogglePin(discussion.id, startupId);

  const isAuthor =
    viewerUserId !== null && Number(viewerUserId) === Number(discussion.authorId);
  const canEdit = isAuthor || isAdmin;
  const countdown = countdownTo24h(discussion.createdAt);

  return (
    <div className="space-y-4" data-testid={`thread-view-${discussion.id}`}>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-[11px] font-black uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para o feed
      </button>

      <article className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border ${CATEGORY_COLORS[discussion.category]}`}
          >
            {CATEGORY_LABELS_PT[discussion.category]}
          </span>
          {discussion.isPinned && (
            <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded">
              <Pin className="w-3 h-3" /> Fixada
            </span>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">
            {relativeTime(discussion.lastActivityAt)}
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground leading-tight">
          {discussion.title}
        </h1>

        <div className="text-xs text-muted-foreground">
          Por <strong className="text-foreground">{discussion.authorPublicId}</strong>
          {" • "}criado em {relativeTime(discussion.createdAt)}
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none prose-sm md:prose-base prose-headings:font-black prose-headings:tracking-tighter prose-a:text-primary">
          <ReactMarkdown
            rehypePlugins={[rehypeSanitize]}
            remarkPlugins={[remarkGfm]}
          >
            {discussion.content}
          </ReactMarkdown>
        </div>

        <div className="flex items-center gap-3 flex-wrap border-t border-border pt-3">
          <DiscussionUpvoteToggle
            discussionId={discussion.id}
            count={discussion.upvotesCount}
            active={discussion.viewerHasUpvoted}
            isAuthenticated={!!viewerUserId}
          />
          <span className="text-xs text-muted-foreground">
            {repliesCount} respostas
          </span>

          {canEdit && countdown && (
            <span className="ml-auto text-[10px] text-muted-foreground">
              Edicao/exclusao expira em <strong>{countdown}</strong>
            </span>
          )}

          {canEdit && (
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setEditing(true)}
                disabled={!countdown && !isAdmin}
                data-testid="thread-edit"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border border-border hover:border-foreground disabled:opacity-40"
              >
                <Edit className="w-3.5 h-3.5" /> Editar
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={!countdown && !isAdmin}
                data-testid="thread-delete"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </button>
            </div>
          )}

          {(isAdmin || canEdit) && (
            <button
              onClick={() => setConfirmPin(discussion.isPinned ? "unpin" : "pin")}
              data-testid="thread-pin"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border border-border hover:border-foreground"
            >
              {discussion.isPinned ? (
                <>
                  <PinOff className="w-3.5 h-3.5" /> Desfixar
                </>
              ) : (
                <>
                  <Pin className="w-3.5 h-3.5" /> Fixar
                </>
              )}
            </button>
          )}
        </div>
      </article>

      {editing && (
        <DiscussionEditor
          mode="edit"
          initialTitle={discussion.title}
          initialContent={discussion.content}
          initialCategory={discussion.category}
          initialAnonymous={discussion.isAnonymous}
          isSubmitting={updateMutation.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={(data) => {
            updateMutation.mutate(
              { id: discussion.id, ...data },
              { onSuccess: () => setEditing(false) },
            );
          }}
        />
      )}

      {confirmDelete && (
        <DiscussionConfirmDelete
          repliesCount={repliesCount}
          isSubmitting={deleteMutation.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() =>
            deleteMutation.mutate(
              { id: discussion.id, force: repliesCount > 0 },
              {
                onSuccess: () => {
                  setConfirmDelete(false);
                  onBack();
                },
              },
            )
          }
        />
      )}

      {confirmPin && (
        <DiscussionConfirmPin
          action={confirmPin}
          isSubmitting={togglePin.isPending}
          onCancel={() => setConfirmPin(null)}
          onConfirm={() => {
            togglePin.mutate(confirmPin, {
              onSuccess: () => setConfirmPin(null),
            });
          }}
        />
      )}
    </div>
  );
}