import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router";
import { InitialsImage } from "~/components/ui/initials-image";
import type { StartupFeatured } from "~/types/startup-featured";
import { SealsRow } from "./category-visual";

export function StartupListRow({ startup }: { startup: StartupFeatured }) {
  const verified = startup.tags.includes("VERIFICADA");
  return (
    <Link
      to={`/marketplace/startup/${encodeURIComponent(startup.slug)}`}
      className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 items-center hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
    >
      <div className="flex items-center gap-3 min-w-0">
        <InitialsImage
          name={startup.name}
          src={startup.image}
          alt={startup.name}
          className="h-9 w-9 shrink-0 rounded-xl border border-white/20"
          fallbackClassName="bg-primary/20"
          fallbackTextClassName="text-xs font-black"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-white font-bold text-sm truncate">
              {startup.name}
            </p>
            {verified && (
              <CheckCircle2
                className="w-3.5 h-3.5 text-primary shrink-0"
                aria-label="Verificada"
              />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {startup.description}
          </p>
        </div>
      </div>
      <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold">
        {startup.category ?? "—"}
      </span>
      <span className="text-sm text-white font-black">{startup.equity}</span>
      <span className="text-sm text-white font-black">{startup.valuation}</span>
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-muted-foreground">
            {startup.raised}
          </span>
          <span className="text-primary font-black text-xs">
            {startup.progress}%
          </span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary"
            style={{ width: `${startup.progress}%` }}
          />
        </div>
      </div>
      <SealsRow seals={startup.seals} size={24} max={4} />
      <ArrowRight className="w-4 h-4 text-muted-foreground" />
    </Link>
  );
}
