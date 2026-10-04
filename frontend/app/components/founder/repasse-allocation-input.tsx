import { Slider } from "radix-ui";
import { cn } from "~/lib/utils";
import {
  ALLOCATION_CATEGORIES,
  ALLOCATION_CATEGORY_LABELS,
  type AllocationPercents,
} from "~/types/repasse";
import { isAllocationValid, sumAllocationPercents } from "~/lib/repasse-schemas";

export interface RepasseAllocationInputProps {
  value: AllocationPercents;
  onChange: (value: AllocationPercents) => void;
  valorParcela: string | number;
  disabled?: boolean;
}

/**
 * @description Componente controlado de input para os 7 percentuais de
 * alocacao. Sincroniza slider (radix Slider) e input numerico.
 * Mostra preview em R$ ao lado. Footer sticky com soma — verde quando 100%.
 *
 * Nao mantem estado interno: o pai gerencia `value` (controlled).
 *
 * Sprint S34-i — modo LIVRE: cada campo e editado de forma INDEPENDENTE.
 * Quando o user ajusta um slider/input, o handler valida que a soma
 * total NAO ultrapassara 100% — se o valor pedido causaria overflow,
 * o valor e CLAMPADO ao maximo que mantem a soma em 100% (em vez de
 * simplesmente descartar o ajuste). Isso evita o "ainda continua
 * deixando colocar mais do que 100%" mesmo quando o user arrasta
 * o slider alem do disponivel.
 *
 * Visual feedback:
 * - Quando soma === 100 (completa): todos os 7 campos ficam disabled,
 *   slider max = valor atual (so permite DIMINUIR para redistribuir),
 *   banner verde "completa · travada em 100%"
 * - Quando soma > 100 (passou): mesmo lock — user so pode DIMINUIR
 *   ate voltar para 100, depois campos voltam a ficar editaveis
 * - Quando soma < 100: livre, sliders aceitam qualquer valor entre
 *   0 e 100 (cap individual)
 *
 * Decisao de produto: o fundador e o melhor juiz de como alocar o
 * dinheiro. Redistribuicao automatica foi descartada porque
 * 'movimenta tudo junto' e tira o controle granular por categoria.
 */
export function RepasseAllocationInput({
  value,
  onChange,
  valorParcela,
  disabled = false,
}: RepasseAllocationInputProps) {
  const base = typeof valorParcela === "string" ? Number(valorParcela) : valorParcela;
  const total = sumAllocationPercents(value);
  const valid = isAllocationValid(value);
  // Sprint S34-i (v3) — trava quando soma >= 100 (tanto == quanto >).
  // A correcao do bug 'continua deixando colocar mais do que 100%'
  // estava em usar 'valid' (=100 exato) — mas se a soma JÁ passou de 100
  // (caso edge), valid era false e os campos ficavam liberados. Agora
  // qualquer soma >= 100 trava.
  const locked = total >= 100 - 0.01;

  /**
   * Calcula o valor maximo que o user pode setar em um campo SEM que a
   * soma ultrapasse 100%. Quando locked, retorna o valor atual (permite
   * so DIMINUIR). Quando livre, retorna 100 (cap individual).
   */
  function maxForKey(key: keyof AllocationPercents): number {
    if (locked) {
      return value[key] ?? 0; // so permite DIMINUIR
    }
    return 100;
  }

  /**
   * Valida o ajuste desejado e retorna o valor final a aplicar. Bloqueia
   * aumento quando a soma passaria de 100% (clampando ao maximo que
   * mantem a soma em 100%).
   */
  function clampAdjustment(
    key: keyof AllocationPercents,
    requested: number,
  ): number {
    const current = value[key] ?? 0;
    let desired = Number.isFinite(requested) ? requested : current;
    desired = Math.max(0, Math.min(100, desired));
    if (desired <= current) {
      // Diminuindo ou igual — sempre permitido
      return desired;
    }
    // Tentando AUMENTAR: clampa ao maximo que mantem soma em 100%.
    const somaOutros = total - current;
    const headroom = 100 - somaOutros;
    return Math.min(desired, Math.max(0, headroom));
  }

  function handleSlider(key: keyof AllocationPercents, next: number[]) {
    const requested = Number(next[0] ?? 0);
    const finalValue = clampAdjustment(key, requested);
    onChange({ ...value, [key]: Number(finalValue.toFixed(1)) });
  }

  function handleNumber(key: keyof AllocationPercents, raw: string) {
    const parsed = Number(raw.replace(",", "."));
    if (Number.isNaN(parsed)) return;
    const finalValue = clampAdjustment(key, parsed);
    onChange({ ...value, [key]: Number(finalValue.toFixed(1)) });
  }

  return (
    <div className="space-y-4" data-testid="repasse-allocation-input">
      <div className="space-y-3" data-locked={locked} aria-disabled={locked}>
        {ALLOCATION_CATEGORIES.map((key) => {
          const percent = value[key] ?? 0;
          const preview =
            Number.isFinite(base) && base > 0
              ? ((base * percent) / 100).toFixed(2)
              : "0.00";
          // Quando locked, slider max = valor atual (permite so DIMINUIR).
          // input max tambem clampado via maxForKey() helper.
          const fieldMax = maxForKey(key);
          return (
            <div
              key={key}
              className={cn(
                "grid grid-cols-1 md:grid-cols-[180px_1fr_120px] items-center gap-3",
                "rounded-2xl border border-border/30 bg-accent/10 px-4 py-3",
                locked && "opacity-70",
              )}
              data-allocation-row={key}
            >
              <label
                htmlFor={`alloc-${key}`}
                className="text-[11px] font-black uppercase tracking-widest text-muted-foreground"
              >
                {ALLOCATION_CATEGORY_LABELS[key]}
              </label>

              <Slider.Root
                id={`alloc-${key}`}
                value={[percent]}
                min={0}
                max={fieldMax}
                step={0.5}
                disabled={disabled || locked}
                onValueChange={(n) => handleSlider(key, n)}
                className="relative flex h-5 w-full touch-none select-none items-center"
                aria-label={`Percentual de ${ALLOCATION_CATEGORY_LABELS[key]}`}
              >
                <Slider.Track className="relative h-1.5 grow rounded-full bg-accent/40">
                  <Slider.Range className="absolute h-full rounded-full bg-primary" />
                </Slider.Track>
                <Slider.Thumb
                  className={cn(
                    "block h-4 w-4 rounded-full bg-primary shadow",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                    "transition-transform hover:scale-110",
                  )}
                  aria-label={`Slider ${ALLOCATION_CATEGORY_LABELS[key]}`}
                />
              </Slider.Root>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={fieldMax}
                  step={0.5}
                  disabled={disabled || locked}
                  value={Number.isNaN(percent) ? "" : percent}
                  onChange={(e) => handleNumber(key, e.target.value)}
                  aria-label={`Numero ${ALLOCATION_CATEGORY_LABELS[key]}`}
                  className="w-20 bg-transparent border border-border/40 rounded-lg px-2 py-1 text-sm font-bold tabular-nums text-right disabled:cursor-not-allowed disabled:opacity-60"
                  data-allocation-number={key}
                />
                <span className="text-xs font-black text-muted-foreground">%</span>
              </div>

              <div className="md:col-span-3 -mt-1 text-[11px] text-muted-foreground tabular-nums">
                preview: R$ {preview}
                {locked && (
                  <span className="ml-2 text-emerald-400/80">
                    · alocação completa — diminua um campo para redistribuir
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={cn(
          "sticky bottom-0 z-10 mt-2 flex items-center justify-between gap-3",
          "rounded-2xl border px-4 py-3",
          locked
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : total > 100
              ? "bg-red-500/10 border-red-500/30 text-red-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300",
        )}
        data-testid="allocation-sum"
        data-valid={valid}
        data-locked={locked}
      >
        <span className="text-[10px] font-black uppercase tracking-widest">
          Soma atual
        </span>
        <span className="text-lg font-black tabular-nums">
          {total.toFixed(1)}%
        </span>
        <span
          className="text-[10px] uppercase tracking-widest"
          data-testid="allocation-sum-status"
        >
          {locked
            ? "completa · travada em 100%"
            : total > 100
              ? "soma passou de 100% — ajuste para baixo"
              : "ajuste para 100%"}
        </span>
      </div>
    </div>
  );
}