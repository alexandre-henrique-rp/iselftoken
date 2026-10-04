import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router";
import { InitialsImage } from "~/components/ui/initials-image";
import type { StartupFeatured } from "~/types/startup-featured";
import { SealsRow } from "./category-visual";

export function StartupGridCard({ startup }: { startup: StartupFeatured }) {
  const verified = startup.tags.includes("VERIFICADA");
  return (
    <article className="rounded-2xl border border-white/10 bg-card hover:border-primary/40 transition-all overflow-hidden flex flex-col group">
      <div className="relative h-32 shrink-0 overflow-hidden">
        <img
          src={startup.image}
          alt={startup.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-linear-to-t from-card via-card/40 to-transparent" />
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="-mt-9 relative z-20 flex items-center gap-3">
          <InitialsImage
            name={startup.name}
            src={startup.image}
            alt={startup.name}
            className="h-10 w-10 shrink-0 rounded-xl border border-white/20"
            fallbackClassName="bg-primary/20"
            fallbackTextClassName="text-xs font-black"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-white font-black text-base truncate">
                {startup.name}
              </h4>
              {verified && (
                <CheckCircle2
                  className="w-4 h-4 text-primary shrink-0"
                  aria-label="Verificada"
                />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold truncate">
              {startup.category ?? "STARTUP"}
            </p>
          </div>
        </div>

        <SealsRow seals={startup.seals} size={24} max={5} />

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <p className="text-muted-foreground/70 uppercase tracking-widest font-bold mb-0.5">
              Equity
            </p>
            <p className="text-white font-black text-sm">{startup.equity}</p>
          </div>
          <div>
            <p className="text-muted-foreground/70 uppercase tracking-widest font-bold mb-0.5">
              Valuation
            </p>
            <p className="text-white font-black text-sm">{startup.valuation}</p>
          </div>
        </div>

        <div className="mt-auto">
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-[10px] text-muted-foreground truncate font-bold">
              {startup.raised}{" "}
              <span className="text-muted-foreground/40">/ {startup.goal}</span>
            </span>
            <span className="text-primary font-black text-base">
              {startup.progress}%
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full kinetic-gradient transition-all duration-1000"
              style={{ width: `${startup.progress}%` }}
            />
          </div>
        </div>

        <Link
          to={`/marketplace/startup/${encodeURIComponent(startup.slug)}`}
          className="w-full text-center py-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-black border border-primary/30 hover:border-primary rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
        >
          Investir
        </Link>
      </div>
    </article>
  );
}
