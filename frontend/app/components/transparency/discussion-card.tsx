/**
 * ThreadCard: card de thread na lista.
 *
 * Badge categoria + titulo + preview (60..140 chars) + authorPublicId + upvote + replies + atividade.
 *
 * LGPD: NUNCA expoe cpf/email/phone. Apenas `authorPublicId` (anonimo: "Nome U." / identificado: "Nome Completo").
 */
import { MessageCircle } from "lucide-react";
import type { TransparencyDiscussion } from "~/types/transparency";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS_PT,
  relativeTime,
} from "./_shared";
import { DiscussionUpvoteToggle } from "./discussion-upvote-toggle";

interface DiscussionCardProps {
  discussion: TransparencyDiscussion;
  onClick: () => void;
  isAuthenticated: boolean;
}

export function DiscussionCard({
  discussion,
  onClick,
  isAuthenticated,
}: DiscussionCardProps) {
  const preview =
    discussion.content.length > 140
      ? `${discussion.content.slice(0, 140)}...`
      : discussion.content;

  return (
    <button
      onClick={onClick}
      data-testid={`discussion-card-${discussion.id}`}
      className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:border-foreground/30 transition group"
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span
          className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border ${CATEGORY_COLORS[discussion.category]}`}
          data-testid={`discussion-category-${discussion.id}`}
        >
          {CATEGORY_LABELS_PT[discussion.category]}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {relativeTime(discussion.lastActivityAt)}
        </span>
      </div>

      <h3 className="text-base font-black tracking-tight text-foreground group-hover:text-primary transition">
        {discussion.title}
      </h3>

      <p
        className="text-xs text-muted-foreground mt-1 line-clamp-2"
        data-testid={`discussion-preview-${discussion.id}`}
      >
        {preview}
      </p>

      <div className="flex items-center gap-3 mt-3 text-xs">
        <span className="text-muted-foreground" data-testid={`discussion-author-${discussion.id}`}>
          {discussion.authorPublicId}
        </span>
        <span className="text-muted-foreground/40">|</span>
        <DiscussionUpvoteToggle
          discussionId={discussion.id}
          count={discussion.upvotesCount}
          active={discussion.viewerHasUpvoted}
          isAuthenticated={isAuthenticated}
          asSpan
        />
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MessageCircle className="w-3.5 h-3.5" />
          {discussion.repliesCount}
        </span>
      </div>
    </button>
  );
}