/**
 * DiscussionUpvoteToggle: botao com contagem e estado on/off.
 *
 * - Disabled para visitante (sem token) — renderiza span estatico.
 * - `asSpan=true`: renderiza como span (para uso DENTRO de outro botao/card).
 *   Evita HTML invalido (`<button>` nao pode conter `<button>`).
 * - Optimistic update via useToggleUpvote.
 */
import { ArrowUp } from "lucide-react";
import { useToggleUpvote } from "~/hooks/use-transparency-discussion-upvote";

interface UpvoteToggleProps {
  discussionId: string;
  count: number;
  active: boolean;
  isAuthenticated: boolean;
  /**
   * Renderiza como span (sem botao proprio).
   * Use quando o upvote esta DENTRO de outro elemento clicavel (ex: DiscussionCard).
   */
  asSpan?: boolean;
}

export function DiscussionUpvoteToggle({
  discussionId,
  count,
  active,
  isAuthenticated,
  asSpan = false,
}: UpvoteToggleProps) {
  const toggle = useToggleUpvote(discussionId);

  const className = `inline-flex items-center gap-1 text-xs ${
    asSpan ? "" : "font-bold px-2 py-1 rounded border transition"
  } ${
    active && !asSpan
      ? "bg-primary text-primary-foreground border-primary"
      : asSpan
        ? "text-muted-foreground"
        : "bg-transparent text-muted-foreground border-border hover:border-foreground"
  }`;

  if (!isAuthenticated || asSpan) {
    return (
      <span
        className={className}
        data-testid={`upvote-${discussionId}`}
        data-active={active}
      >
        <ArrowUp className="w-3.5 h-3.5" />
        {count}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle.mutate();
      }}
      aria-pressed={active}
      disabled={toggle.isPending}
      data-testid={`upvote-${discussionId}`}
      className={className}
    >
      <ArrowUp className="w-3.5 h-3.5" />
      {count}
    </button>
  );
}