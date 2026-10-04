import { Check, CheckCircle2, Circle, Eye, EyeOff } from "lucide-react";
import type { ReactNode } from "react";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-card px-4 py-3.5 text-sm text-foreground transition placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";
const labelClass =
  "ml-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground";

export function PasswordField({
  id,
  label,
  value,
  visible,
  onChange,
  onToggle,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
  onBlur?: () => void;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          className={`${inputClass} pr-12`}
          placeholder="••••••••••••"
          required
          autoComplete="new-password"
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={
            visible
              ? `Ocultar ${label.toLowerCase()}`
              : `Mostrar ${label.toLowerCase()}`
          }
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          {visible ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}

export function PasswordRule({
  valid,
  children,
}: {
  valid: boolean;
  children: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {valid ? (
        <CheckCircle2
          className="h-4 w-4 shrink-0 text-primary"
          aria-hidden="true"
        />
      ) : (
        <Circle
          className="h-4 w-4 shrink-0 text-muted-foreground/50"
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </div>
  );
}

export function ConsentCheckbox({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-muted-foreground"
    >
      <span className="relative mt-0.5 flex shrink-0 items-center justify-center">
        <input
          id={id}
          name={id}
          className="peer h-5 w-5 appearance-none rounded-md border border-white/20 bg-card transition checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          required
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <Check
          className="pointer-events-none absolute h-3.5 w-3.5 scale-0 text-primary-foreground transition peer-checked:scale-100"
          aria-hidden="true"
        />
      </span>
      <span>{children}</span>
    </label>
  );
}
