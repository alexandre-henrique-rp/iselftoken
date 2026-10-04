import { Carousel3D } from "./carousel-3d";
import { StartupCard } from "./featured-rounds";
import type { StartupFeatured } from "~/types/startup-featured";

export function RecentlyAdded({ startups }: { startups: StartupFeatured[] }) {
  if (!startups || startups.length === 0) return null;

  return (
    <Carousel3D<StartupFeatured>
      items={startups}
      title="Recém-Adicionadas"
      subtitle="As últimas startups a entrarem na plataforma"
      sectionClassName="bg-background"
      height="630px"
      maxWidth="420px"
      renderItem={(startup, isCenter) => (
        <StartupCard startup={startup} isCenter={isCenter} />
      )}
    />
  );
}
