import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { AlertCircle, Info } from "lucide-react";
import { cn } from "~/lib/utils";
import { formatCurrencyInput } from "~/lib/currency-format";
import type { EditSectionProps } from "./_section-props";
import type { RoundTermsValues } from "~/lib/startup-loader";

const PRAZO_OPTIONS = [60, 90, 120] as const;

interface RoundTermsFormValues {
  metaCaptacao: number;
  equityOferecido: number;
  prazoCaptacao: number;
}

interface RoundTermsProps extends Partial<EditSectionProps> {
  /** Modo de uso. "edit" usa form local com defaults; "create" usa o form externo do wizard. */
  mode?: "create" | "edit";
  /** Obrigatório quando mode="create". Ignorado em mode="edit". */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form?: UseFormReturn<any>;
  /** Defaults usados em mode="edit". Quando null, usa zeros. */
  defaults?: RoundTermsValues | null;
  /** Callback opcional — recebe os valores atuais sempre que mudam (mode="edit" only). */
  onChange?: (values: RoundTermsFormValues) => void;
}

const SECTION_ID = "round-terms";
// `prazoCaptacao` sempre tem um valor válido (select com defaults 60/90/120) — não conta
// pra completude pra evitar pill enganoso "1/3 campos" com meta/equity zerados.
const TOTAL = 2;

function numberToDisplay(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function RoundTerms({
  mode = "edit",
  form: formProp,
  defaults,
  reportStatus,
  registerReset,
  onChange,
}: RoundTermsProps) {
  const editDefaults = useMemo<RoundTermsFormValues>(
    () => ({
      metaCaptacao: defaults?.metaCaptacao ?? 0,
      equityOferecido: defaults?.equityOferecido ?? 0,
      prazoCaptacao: defaults?.prazoCaptacao ?? 90,
    }),
    [defaults],
  );

  // useForm sempre chamado (regras dos hooks); só usado quando mode="edit".
  const localForm = useForm<RoundTermsFormValues>({
    defaultValues: editDefaults,
    mode: "onChange",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rhf: UseFormReturn<any> = mode === "create" && formProp ? formProp : (localForm as UseFormReturn<any>);
  const { register, setValue, watch, reset, formState: { errors, dirtyFields } } = rhf;

  const metaWatched: number = watch("metaCaptacao") ?? 0;
  const equityWatched: number = watch("equityOferecido") ?? 0;
  const prazoWatched: number = watch("prazoCaptacao") ?? 90;

  // Display formatado vive em state local — não polui o RHF, evita campo extra no payload.
  // Initialiser usa editDefaults direto (não `metaWatched`) pra evitar flicker se `watch`
  // retornar undefined no primeiro render antes do RHF settle.
  const [metaDisplay, setMetaDisplay] = useState<string>(() => numberToDisplay(editDefaults.metaCaptacao));

  // Quando defaults mudam (loader trouxe dados novos), re-hidratar o form e o display em mode="edit".
  // Skip se data for igual (loader re-fire) — evita stomp em edits do user.
  const lastDefaultsRef = useRef(editDefaults);
  useEffect(() => {
    if (mode !== "edit") return;
    if (
      lastDefaultsRef.current.metaCaptacao === editDefaults.metaCaptacao &&
      lastDefaultsRef.current.equityOferecido === editDefaults.equityOferecido &&
      lastDefaultsRef.current.prazoCaptacao === editDefaults.prazoCaptacao
    ) {
      return;
    }
    lastDefaultsRef.current = editDefaults;
    reset(editDefaults);
    setMetaDisplay(numberToDisplay(editDefaults.metaCaptacao));
  }, [mode, editDefaults, reset]);

  const handleMetaChange = (raw: string) => {
    const formatted = formatCurrencyInput(raw);
    setMetaDisplay(formatted);
    // Remove R$ prefix and thousand separators to parse the number.
    const numericStr = formatted
      .replace(/^[^,\d]*/g, "") // strip R$ and spaces
      .replace(/\./g, "")
      .replace(",", ".");
    const parsed = Number(numericStr);
    setValue("metaCaptacao", Number.isFinite(parsed) ? parsed : 0, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const dirtyCount = Object.keys(dirtyFields).length;
  const filled = (metaWatched > 0 ? 1 : 0) + (equityWatched > 0 ? 1 : 0);

  useEffect(() => {
    if (mode !== "edit") return;
    reportStatus?.({ id: SECTION_ID, dirty: dirtyCount, filled, total: TOTAL });
  }, [mode, dirtyCount, filled, reportStatus]);

  useEffect(() => {
    if (mode !== "edit" || !registerReset) return;
    registerReset(SECTION_ID, () => {
      reset(editDefaults);
      setMetaDisplay(numberToDisplay(editDefaults.metaCaptacao));
    });
  }, [mode, registerReset, reset, editDefaults]);

  useEffect(() => {
    if (mode !== "edit") return;
    onChange?.({
      metaCaptacao: metaWatched,
      equityOferecido: equityWatched,
      prazoCaptacao: prazoWatched,
    });
  }, [mode, metaWatched, equityWatched, prazoWatched, onChange]);

  return (
    <section className="glass-card rounded-3xl p-8 lg:p-10 space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight italic">Termos da rodada</h2>
          <p className="text-muted-foreground text-sm mt-1">Meta, equity e prazo da captação.</p>
        </div>
        {mode === "edit" ? <span className="pill">{filled}/{TOTAL} campos</span> : null}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="metaCaptacao" className="label-tag flex items-center gap-1.5">
            Meta de Captação (R$)
            <span
              title="Pode configurar valores acima do piso de R$ 500 mil - sem teto máximo. Considere o estágio da startup ao definir o valor."
              className="cursor-help text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="w-3 h-3" />
            </span>
          </label>
          <input
            id="metaCaptacao"
            type="text"
            inputMode="decimal"
            value={metaDisplay}
            onChange={(e) => handleMetaChange(e.target.value)}
            placeholder="R$ 0,00"
            className={cn("input-field", errors.metaCaptacao && "border-red-500")}
          />
          {errors.metaCaptacao && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {String(errors.metaCaptacao.message)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="equityOferecido" className="label-tag">
            Equity Ofertado (%)
          </label>
          <input
            id="equityOferecido"
            type="number"
            step="0.01"
            min={1}
            max={100}
            {...register("equityOferecido", { valueAsNumber: true })}
            className={cn("input-field", errors.equityOferecido && "border-red-500")}
          />
          {errors.equityOferecido && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {String(errors.equityOferecido.message)}
            </p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="prazoCaptacao" className="label-tag">
            Prazo de Captação
          </label>
          <select
            id="prazoCaptacao"
            {...register("prazoCaptacao", { valueAsNumber: true })}
            className={cn("input-field cursor-pointer", errors.prazoCaptacao && "border-red-500")}
          >
            {PRAZO_OPTIONS.map((d) => (
              <option key={d} value={d}>{d} dias</option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
