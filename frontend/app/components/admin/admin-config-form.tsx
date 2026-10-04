import { AlertCircle, Calendar, Loader2, Save } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { cn } from "~/lib/utils";

type Unit = "FRACTION" | "PERCENT" | "BRL" | "INT" | "BOOL";

interface AdminConfigFormProps {
  /** Identificador estável do parâmetro para manter campos acessíveis e únicos. */
  fieldId: string;
  /** Unidade — define o tipo de input. */
  unit: Unit;
  /** Valor atual em vigor (pré-preenchido). */
  currentValue: number;
  /** Callback ao submeter — recebe o valor numérico + data ISO. */
  onSubmit: (
    value: number,
    effectiveFromIso: string,
    note: string | undefined,
  ) => void;
  /** Pending state. */
  isPending: boolean;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const inputValue = (value: number, unit: Unit) =>
  unit === "FRACTION" ? value * 100 : value;

const unitSuffix = (unit: Unit) =>
  unit === "BOOL"
    ? ""
    : unit === "BRL"
      ? "(R$)"
      : unit === "PERCENT"
        ? "(%)"
        : unit === "FRACTION"
          ? "(%)"
          : "";

/**
 * Form para agendar nova versão de um parâmetro de configuração.
 * Substitui valor vigente a partir de uma data futura.
 *
 * UX:
 *  - Valor + data em grid responsivo (empilhado no mobile)
 *  - Motivo opcional
 *  - Validação visual de valor inválido (< 0, NaN)
 *  - Estado pending do botão de submit
 *  - Suporte a toggle "BOOL" via select (Sim/Não)
 */
export function AdminConfigForm({
  fieldId,
  unit,
  currentValue,
  onSubmit,
  isPending,
}: AdminConfigFormProps) {
  const inputId = fieldId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const valueId = `cfg-value-${inputId}`;
  const dateId = `cfg-date-${inputId}`;
  const noteId = `cfg-note-${inputId}`;
  const [value, setValue] = useState<string>(
    String(inputValue(currentValue, unit)),
  );
  const [date, setDate] = useState<string>(todayStr());
  const [note, setNote] = useState<string>("");
  const [touched, setTouched] = useState(false);

  const numericValue = Number(value.replace(",", "."));
  const finalValue = unit === "FRACTION" ? numericValue / 100 : numericValue;
  const isValid =
    !Number.isNaN(numericValue) && numericValue >= 0 && value.trim().length > 0;
  const showError = touched && !isValid;

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (!isValid) return;
    const effectiveFrom = new Date(`${date}T00:00:00`).toISOString();
    onSubmit(finalValue, effectiveFrom, note.trim() || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-1" noValidate>
      <input type="hidden" value={unit} readOnly />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="min-w-0">
          <label
            htmlFor={valueId}
            className="block text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1"
          >
            Novo valor {unitSuffix(unit)}
          </label>
          {unit === "BOOL" ? (
            <select
              id={valueId}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setTouched(true);
              }}
              className="w-full bg-card border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground font-bold"
            >
              <option value="1">Sim (exigir)</option>
              <option value="0">Não (dispensar)</option>
            </select>
          ) : (
            <input
              id={valueId}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setTouched(true);
              }}
              onBlur={() => setTouched(true)}
              type="number"
              step="any"
              min="0"
              required
              aria-invalid={showError}
              aria-describedby={
                showError ? `cfg-value-error-${inputId}` : undefined
              }
              className={cn(
                "w-full bg-card border rounded-xl px-3 py-2.5 text-sm text-foreground font-bold transition-colors",
                showError
                  ? "border-destructive/60 focus:ring-1 focus:ring-destructive/40"
                  : "border-white/10 focus:ring-1 focus:ring-primary/40",
              )}
            />
          )}
          {showError && (
            <p
              id={`cfg-value-error-${inputId}`}
              className="text-[10px] text-destructive mt-1 inline-flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3" aria-hidden />
              Valor inválido (deve ser ≥ 0)
            </p>
          )}
        </div>

        <div className="min-w-0">
          <label
            htmlFor={dateId}
            className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1 flex items-center gap-1"
          >
            <Calendar className="w-3 h-3" aria-hidden /> A partir de
          </label>
          <input
            id={dateId}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            type="date"
            className="w-full bg-card border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={noteId}
          className="block text-[9px] font-black uppercase tracking-widest text-muted-foreground"
        >
          Motivo (opcional)
        </label>
        <input
          id={noteId}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          type="text"
          placeholder="Descreva o motivo da alteração"
          maxLength={120}
          className="w-full bg-card border border-white/10 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || !isValid}
        className="w-full py-2.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            Agendando…
          </>
        ) : (
          <>
            <Save className="w-3.5 h-3.5" aria-hidden />
            Agendar alteração
          </>
        )}
      </button>
    </form>
  );
}
