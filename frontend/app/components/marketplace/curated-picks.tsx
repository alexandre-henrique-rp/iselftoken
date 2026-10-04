import type { CuratedPick } from "~/types/curated-pick";
import { CuratedPickCard } from "./curated-pick-card";

export function CuratedPicks({ picks }: { picks: CuratedPick[] }) {
  if (!picks.length) return null;

  return (
    <section>
      <div className="mb-6">
        <span className="text-primary font-bold text-[11px] tracking-widest uppercase mb-1 block">
          Curadoria iSelfToken
        </span>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Picks da Semana</h2>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1.5 max-w-2xl">
          Selecionadas pela nossa equipe de especialistas em VC.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {picks.map((pick) => (
          <CuratedPickCard key={pick.startupId} pick={pick} startup={pick.startup} />
        ))}
      </div>
    </section>
  );
}
