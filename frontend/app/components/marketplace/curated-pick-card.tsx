import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { InitialsImage } from "~/components/ui/initials-image";
import type { CuratedPick } from "~/types/curated-pick";
import type { StartupFeatured } from "~/types/startup-featured";
import { SealsRow } from "./category-visual";

interface Props {
  pick: CuratedPick;
  startup: StartupFeatured;
}

export function CuratedPickCard({ pick, startup }: Props) {
  return (
    <article className="rounded-2xl border border-white/10 bg-card hover:border-primary/40 transition-all overflow-hidden flex flex-col">
      <div className="relative h-44 shrink-0 overflow-hidden">
        <img
          src={startup.image}
          alt={startup.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-linear-to-t from-card via-card/30 to-transparent" />
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="-mt-10 relative z-20 flex items-center gap-3">
          <InitialsImage
            name={startup.name}
            src={startup.image}
            alt={startup.name}
            className="h-12 w-12 shrink-0 rounded-xl border border-white/20"
            fallbackClassName="bg-primary/20"
            fallbackTextClassName="text-sm font-black"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-black tracking-tighter text-white truncate">
              {startup.name}
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold truncate">
              {startup.category ?? "STARTUP"}
            </p>
          </div>
        </div>

        <SealsRow seals={startup.seals} size={24} max={5} />

        <p className="text-sm italic text-muted-foreground leading-relaxed line-clamp-4">
          "{pick.quote}"
        </p>

        <div className="flex items-center gap-3 pt-3 border-t border-white/5">
          <div className="w-8 h-8 rounded-full bg-accent border border-white/10 flex items-center justify-center text-primary font-black text-xs">
            {pick.curatorName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-bold truncate">
              {pick.curatorName}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {pick.curatorRole}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-auto pt-3 border-t border-white/5">
          <div className="flex gap-4 text-[10px]">
            <div>
              <p className="text-muted-foreground/70 uppercase tracking-widest font-bold">
                Captado
              </p>
              <p className="text-white font-black text-sm">
                {startup.progress}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground/70 uppercase tracking-widest font-bold">
                Valuation
              </p>
              <p className="text-white font-black text-sm">
                {startup.valuation}
              </p>
            </div>
          </div>
          <Link
            to={`/marketplace/startup/${encodeURIComponent(startup.slug)}`}
            className="inline-flex items-center gap-1 text-primary font-black uppercase tracking-widest text-[10px] hover:gap-2 transition-all"
          >
            Explorar <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
