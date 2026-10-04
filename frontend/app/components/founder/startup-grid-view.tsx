import { StartupGridCard } from "./startup-grid-card";
import type { Startup } from "./startup-card";

interface StartupGridViewProps {
  startups: Startup[];
}

export function StartupGridView({ startups }: StartupGridViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {startups.map((s) => (
        <StartupGridCard key={s.id} startup={s} />
      ))}
    </div>
  );
}
