import { Lightbulb } from "lucide-react";
import type { ReactNode } from "react";

interface CompletenessSection {
  label: string;
  filled: number;
  total: number;
}

interface CompletenessCardProps {
  sections: CompletenessSection[];
}

export function CompletenessCard({ sections }: CompletenessCardProps) {
  const totalFilled = sections.reduce(
    (sum, section) => sum + section.filled,
    0,
  );
  const totalSlots = sections.reduce((sum, section) => sum + section.total, 0);
  const percent =
    totalSlots > 0 ? Math.round((totalFilled / totalSlots) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Progresso</h3>
        <span className="text-sm font-semibold text-primary">{percent}%</span>
      </div>
      <div
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso do preenchimento"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="mt-4 divide-y divide-border border-t border-border text-xs">
        {sections.map((section) => (
          <li
            key={section.label}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <span className="text-muted-foreground">{section.label}</span>
            <span className="font-semibold text-foreground">
              {section.filled}/{section.total}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface TipCardProps {
  label?: string;
  children: ReactNode;
}

export function TipCard({ label = "Dica", children }: TipCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Lightbulb className="h-4 w-4 text-primary" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  );
}
