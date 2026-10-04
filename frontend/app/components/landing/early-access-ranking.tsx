import { Trophy, ArrowUpRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { InitialsImage } from "~/components/ui/initials-image";
import type { EarlyAccessRankingItem } from "~/types/early-access-ranking";

function PositionBadge({ position }: { position: number }) {
  const isTop3 = position <= 3;
  const colors =
    position === 1
      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
      : position === 2
        ? "bg-gray-400/20 text-gray-300 border-gray-400/40"
        : position === 3
          ? "bg-amber-700/20 text-amber-500 border-amber-700/40"
          : "bg-white/5 text-muted-foreground border-white/10";

  return (
    <div
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border",
        colors,
      )}
    >
      {position}
    </div>
  );
}

function RankingRow({
  item,
  index,
}: {
  item: EarlyAccessRankingItem;
  index: number;
}) {
  const isTop3 = item.position <= 3;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all group",
        isTop3
          ? "bg-[#1a0a1f] border-primary/30 hover:border-primary/60"
          : "bg-[#0a0a0a] border-white/5 hover:border-white/15",
      )}
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        <PositionBadge position={item.position} />

        <InitialsImage
          name={item.startupName}
          src={item.logoUrl}
          alt={item.startupName}
          className={cn(
            "h-10 w-10 shrink-0 rounded-xl border sm:h-12 sm:w-12",
            isTop3 ? "border-primary/30" : "border-white/10",
          )}
          fallbackClassName={isTop3 ? "bg-primary/20" : "bg-white/5"}
          fallbackTextClassName={cn(
            "text-base sm:text-lg",
            isTop3 ? "text-primary" : "text-muted-foreground",
          )}
        />

        <div className="min-w-0">
          <h4
            className={cn(
              "font-bold text-base sm:text-lg truncate group-hover:text-primary transition-colors",
              isTop3 ? "text-white" : "text-white/90",
            )}
          >
            {item.startupName}
          </h4>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
            {item.category}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 shrink-0 ml-4">
        <div className="text-right hidden sm:block">
          <p className="text-[9px] text-muted-foreground uppercase tracking-tighter font-bold">
            Reservas
          </p>
          <p
            className={cn(
              "font-black text-lg",
              isTop3 ? "text-primary" : "text-white",
            )}
          >
            {item.reservations}
          </p>
        </div>

        <button
          className={cn(
            "px-5 sm:px-6 py-2.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
            isTop3
              ? "bg-primary text-black hover:bg-primary/90 shadow-[0_4px_20px_rgba(213,0,249,0.3)]"
              : "bg-primary/5 text-primary border border-primary/20 hover:bg-primary hover:text-black",
          )}
        >
          Reservar
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export function EarlyAccessRanking({
  ranking,
  totalReservations,
}: {
  ranking: EarlyAccessRankingItem[];
  totalReservations: number;
}) {
  if (!ranking || ranking.length === 0) {
    return null;
  }

  return (
    <section className="mb-16 max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-primary font-bold text-xs tracking-widest uppercase">
            Ranking
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          Top Start-ups em Early Access
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          Seja um dos primeiros a investir —{" "}
          <span className="text-primary font-bold">
            {totalReservations} reservas
          </span>{" "}
          no total
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {ranking.map((item, index) => (
          <RankingRow key={item.startupId} item={item} index={index} />
        ))}
      </div>
    </section>
  );
}
