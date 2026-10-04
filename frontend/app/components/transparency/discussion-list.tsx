/**
 * DiscussionList: lista de threads (abaixo do sticky).
 */
import type { TransparencyDiscussion } from "~/types/transparency";
import { DiscussionCard } from "./discussion-card";

interface DiscussionListProps {
  items: TransparencyDiscussion[];
  isAuthenticated: boolean;
  onSelect: (d: TransparencyDiscussion) => void;
}

export function DiscussionList({
  items,
  isAuthenticated,
  onSelect,
}: DiscussionListProps) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2" data-testid="discussion-list">
      {items.map((d) => (
        <DiscussionCard
          key={d.id}
          discussion={d}
          isAuthenticated={isAuthenticated}
          onClick={() => onSelect(d)}
        />
      ))}
    </div>
  );
}