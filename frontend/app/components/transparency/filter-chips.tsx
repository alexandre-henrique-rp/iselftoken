/**
 * Filter chips (tipo de post) para aba Atualizacoes.
 * Estado controlado (currentValue + onChange).
 */
import {
  TRANSPARENCY_POST_TYPES,
  type TransparencyPostType,
} from "~/types/transparency";
import { TYPE_LABELS_PT } from "./_shared";

interface FilterChipsProps {
  current: TransparencyPostType | "";
  onChange: (next: TransparencyPostType | "") => void;
}

export function FilterChips({ current, onChange }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange("")}
        className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border ${
          current === ""
            ? "bg-foreground text-background border-foreground"
            : "bg-transparent text-muted-foreground border-border hover:border-foreground"
        }`}
      >
        Todos
      </button>
      {TRANSPARENCY_POST_TYPES.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border ${
            current === t
              ? "bg-foreground text-background border-foreground"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground"
          }`}
        >
          {TYPE_LABELS_PT[t]}
        </button>
      ))}
    </div>
  );
}