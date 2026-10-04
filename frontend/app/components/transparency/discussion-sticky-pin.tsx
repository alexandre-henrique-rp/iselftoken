/**
 * DiscussionStickyPin: badge "Fixada" + visual destacado (borda esquerda).
 *
 * Aparece no topo do feed quando ha thread fixada na startup.
 */
import { Pin } from "lucide-react";
import type { TransparencyDiscussion } from "~/types/transparency";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS_PT,
  relativeTime,
} from "./_shared";
import { DiscussionUpvoteToggle } from "./discussion-upvote-toggle";

interface StickyPinProps {
  discussion: TransparencyDiscussion;
  onClick: () => void;
  isAuthenticated: boolean;
}

export function DiscussionStickyPin({
  discussion,
  onClick,
  isAuthenticated,
}: StickyPinProps) {
  return (
    <button
      onClick={onClick}
      data-testid={`sticky-discussion-${discussion.id}`}
      className="w-full text-left bg-primary/5 border border-l-4 border-l-primary border-primary/30 rounded-2xl p-4 hover:border-primary/60 transition"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded">
          <Pin className="w-3 h-3" /> Fixada
        </span>
        <span
          className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border ${CATEGORY_COLORS[discussion.category]}`}
        >
          {CATEGORY_LABELS_PT[discussion.category]}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {relativeTime(discussion.lastActivityAt)}
        </span>
      </div>
      <h3 className="text-base font-black tracking-tight text-foreground">
        {discussion.title}
      </h3>
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <DiscussionUpvoteToggle
          discussionId={discussion.id}
          count={discussion.upvotesCount}
          active={discussion.viewerHasUpvoted}
          isAuthenticated={isAuthenticated}
          asSpan
        />
        <span>{discussion.repliesCount} respostas</span>
      </div>
    </button>
  );
}