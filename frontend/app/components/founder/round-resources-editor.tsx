/**
 * Editor controlado de alocação de recursos para rodadas de campanha.
 *
 * Exibe 8 inputs numéricos (um por categoria do enum CampaignResourceAllocation),
 * com soma ao vivo no rodapé (verde se =100, vermelho se ≠100).
 * Bloqueia visualmente quando soma ≠ 100%.
 * Campo de descrição condicional para CUSTOMIZADO quando percentual > 0.
 *
 * Padrão visual alinhado com `rodada-distribuicao-tab.tsx` e `use-of-funds.tsx`.
 *
 * @param props - Props do componente
 * @param props.value - Array de alocações controlado (8 itens)
 * @param props.onChange - Callback ao alterar qualquer valor
 * @param props.error - Mensagem de erro opcional (ex.: validação do servidor)
 * @returns Componente JSX do editor de alocação
 * @example
 * <RoundResourcesEditor
 *   value={allocations}
 *   onChange={setAllocations}
 *   error={errors.allocations?.message}
 * />
 */
import { useMemo } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "~/lib/utils";

export interface ResourceAllocation {
  categoria: string;
  percentual: number;
  descricaoCustomizada?: string;
}

/**
 * Limite específico para a categoria FUNDADOR (CASE.md [Captação] Alocação
 * de Recursos). Mantido sincronizado com:
 *  - Backend: `MAX_FUNDADOR_PERCENTUAL` em
 *    `backendnode/src/api/campaigns/service/campaign-resource.service.ts`
 *  - Frontend schema: `MAX_FUNDADOR_PERCENTUAL` em
 *    `app/lib/captacao-shared.tsx` e `app/lib/round-distribution-schema.ts`
 */
const FUNDADOR_MAX_PERCENTUAL = 20;

/** Categorias com cap específico (< 100). Hoje só FUNDADOR; centraliza o
 *  lookup para permitir adicionar outras regras (ex.: CUSTOMIZADO <= 50%). */
const CATEGORY_MAX: Record<string, number> = {
  FUNDADOR: FUNDADOR_MAX_PERCENTUAL,
};

const CATEGORY_HINT: Record<string, string> = {
  FUNDADOR: `Limite de ${FUNDADOR_MAX_PERCENTUAL}% para alocação ao Fundador/Time (proteção ao investidor). Valores acima exigem aprovação do Compliance.`,
};

interface RoundResourcesEditorProps {
  value: ResourceAllocation[];
  onChange: (value: ResourceAllocation[]) => void;
  error?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  FUNDADOR: "Fundador / Time",
  DESENVOLVIMENTO: "Desenvolvimento",
  COMERCIAL: "Comercial",
  MARKETING: "Marketing",
  NUVEM: "Nuvem / Infra",
  JURIDICO: "Jurídico",
  RESERVA_CAIXA: "Reserva de Caixa",
  CUSTOMIZADO: "Categoria Customizada",
};

const CATEGORY_KEYS = [
  "FUNDADOR",
  "DESENVOLVIMENTO",
  "COMERCIAL",
  "MARKETING",
  "NUVEM",
  "JURIDICO",
  "RESERVA_CAIXA",
  "CUSTOMIZADO",
] as const;

/**
 * Retorna a alocação inicial padrão: RESERVA_CAIXA = 100%, demais = 0%.
 */
function defaultAllocations(): ResourceAllocation[] {
  return CATEGORY_KEYS.map((key) => ({
    categoria: key,
    percentual: key === "RESERVA_CAIXA" ? 100 : 0,
  }));
}

export function RoundResourcesEditor({ value, onChange, error }: RoundResourcesEditorProps) {
  const sumPct = useMemo(
    () => value.reduce((s, a) => s + (Number.isFinite(a.percentual) ? a.percentual : 0), 0),
    [value],
  );

  const totalIsValid = Math.abs(sumPct - 100) < 0.01;

  const handlePercentChange = (categoria: string, newPercent: number) => {
    const safe = Number.isFinite(newPercent) ? newPercent : 0;
    // Aplica cap por categoria (FUNDADOR <= 20, demais <= 100). Garante que
    // a UI não permita digitar valor acima do limite mesmo antes do Zod
    // rodar a validação no submit.
    const cap = CATEGORY_MAX[categoria] ?? 100;
    const clamped = Math.min(cap, Math.max(0, safe));
    const next = value.map((a) =>
      a.categoria === categoria ? { ...a, percentual: clamped } : a,
    );
    onChange(next.length > 0 ? next : defaultAllocations());
  };

  const handleDescChange = (descricaoCustomizada: string) => {
    const next = value.map((a) =>
      a.categoria === "CUSTOMIZADO" ? { ...a, descricaoCustomizada } : a,
    );
    onChange(next);
  };

  const customizado = value.find((a) => a.categoria === "CUSTOMIZADO");

  return (
    <section className="glass-card rounded-3xl p-8 lg:p-10 space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight italic">Alocação de Recursos</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Distribuição percentual dos recursos captados por categoria.
          </p>
        </div>
        <span
          className={cn(
            "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border",
            totalIsValid
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/20"
              : "bg-rose-500/20 text-rose-300 border-rose-500/20",
          )}
        >
          {totalIsValid ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5" />
          )}
          {sumPct.toFixed(2)}/100
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {value.map((allocation) => {
          const label = CATEGORY_LABELS[allocation.categoria] ?? allocation.categoria;
          const inputId = `resource-${allocation.categoria}`;
          const cap = CATEGORY_MAX[allocation.categoria];
          const hint = CATEGORY_HINT[allocation.categoria];
          return (
            <div key={allocation.categoria} className="space-y-2">
              <label
                htmlFor={inputId}
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
              >
                {label}
                {cap != null && cap < 100 && (
                  <span
                    className="ml-1 text-amber-400/80 normal-case font-bold tracking-normal"
                    title={hint}
                  >
                    (máx {cap}%)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  id={inputId}
                  type="number"
                  min={0}
                  max={cap ?? 100}
                  step={0.01}
                  value={allocation.percentual}
                  onChange={(e) =>
                    handlePercentChange(allocation.categoria, Number(e.target.value))
                  }
                  className="input-field !pr-10 text-lg font-black italic"
                  aria-label={`Percentual de ${label}`}
                  aria-describedby={
                    hint ? `${inputId}-hint` : undefined
                  }
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  %
                </span>
              </div>
              {hint && (
                <p
                  id={`${inputId}-hint`}
                  className="text-[10px] text-muted-foreground/80 leading-snug"
                >
                  {hint}
                </p>
              )}
              {allocation.categoria === "CUSTOMIZADO" && allocation.percentual > 0 && (
                <input
                  type="text"
                  value={allocation.descricaoCustomizada ?? ""}
                  onChange={(e) => handleDescChange(e.target.value)}
                  placeholder="Descreva a categoria customizada..."
                  className="input-field text-sm"
                  aria-label="Descrição da categoria customizada"
                />
              )}
            </div>
          );
        })}
      </div>

      <footer className="flex items-center justify-between pt-4 border-t border-white/10">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Soma total
        </span>
        <span
          className={cn(
            "flex items-center gap-2 text-lg font-black italic",
            totalIsValid ? "text-emerald-300" : "text-rose-300",
          )}
        >
          {sumPct.toFixed(2)} %
          {totalIsValid ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Soma válida
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5" />
              Soma deve = 100%
            </>
          )}
        </span>
      </footer>

      {!totalIsValid && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          A soma das alocações deve ser exatamente 100%
        </p>
      )}

      {error && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </section>
  );
}
