/**
 * DiscussionReplies: lista de replies + form de nova reply.
 */
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import type { TransparencyReply } from "~/types/transparency";
import { relativeTime } from "./_shared";
import { useCreateReply, useDeleteReply } from "~/hooks/use-transparency-discussion-mutations";

interface RepliesProps {
  discussionId: string;
  replies: TransparencyReply[];
  viewerUserId: number | null;
  isAdmin: boolean;
}

export function DiscussionReplies({
  discussionId,
  replies,
  viewerUserId,
  isAdmin,
}: RepliesProps) {
  const [draft, setDraft] = useState("");
  const createReply = useCreateReply(discussionId);
  const deleteReply = useDeleteReply(discussionId);

  const canPost = draft.trim().length >= 5;
  const submit = () => {
    if (!canPost) return;
    createReply.mutate(
      { content: draft.trim() },
      {
        onSuccess: () => setDraft(""),
      },
    );
  };

  return (
    <section className="border-t border-border pt-4 space-y-3">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        Respostas ({replies.length})
      </h3>

      {replies.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma resposta ainda.</p>
      )}

      <ul className="space-y-3">
        {replies.map((r) => {
          const canDelete =
            isAdmin || (viewerUserId !== null && Number(viewerUserId) === Number(r.authorId));
          return (
            <li
              key={r.id}
              className="bg-card border border-border rounded-xl p-3"
              data-testid={`reply-${r.id}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">{r.authorPublicId}</span>
                <span className="text-[10px] text-muted-foreground">
                  {relativeTime(r.createdAt)}
                </span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                <ReactMarkdown
                  rehypePlugins={[rehypeSanitize]}
                  remarkPlugins={[remarkGfm]}
                >
                  {r.content}
                </ReactMarkdown>
              </div>
              {canDelete && (
                <button
                  onClick={() => deleteReply.mutate(r.id)}
                  className="text-[10px] text-red-600 hover:underline mt-1"
                >
                  Excluir
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Escreva uma resposta..."
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono"
          data-testid="reply-input"
        />
        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={!canPost || createReply.isPending}
            data-testid="reply-submit"
            className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition"
          >
            {createReply.isPending ? "Enviando..." : "Responder"}
          </button>
        </div>
      </div>
    </section>
  );
}