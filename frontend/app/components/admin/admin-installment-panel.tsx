import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, History, Loader2, Percent, Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  useCreateInstallmentConfig,
  useInstallmentConfigHistory,
  useInstallmentConfigVigente,
  type InstallmentConfigRecord,
} from "~/hooks/use-installment-config";

/**
 * Formulário: a taxa é EXIBIDA em porcentagem (ex.: 2.99) e ENVIADA em decimal
 * (0.0299) — espelha o CreateInstallmentConfigDto do backend (interestRate
 * 0..1). Máx. parcelas 1..18; valor mínimo da parcela >= 0.
 */
const formSchema = z.object({
  interestRatePercent: z
    .number({ error: "Informe a taxa em %" })
    .min(0, "A taxa não pode ser negativa")
    .max(100, "A taxa não pode passar de 100%"),
  maxInstallments: z
    .number({ error: "Informe o máximo de parcelas" })
    .int("Use um número inteiro")
    .min(1, "Mínimo de 1 parcela")
    .max(18, "Máximo de 18 parcelas (limite EFI)"),
  minInstallmentAmount: z
    .number({ error: "Informe o valor mínimo" })
    .min(0, "O valor mínimo não pode ser negativo"),
  notes: z.string().max(500, "Máximo de 500 caracteres").optional(),
});

type FormValues = z.infer<typeof formSchema>;

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPercent(decimal: number): string {
  return `${(decimal * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function AdminInstallmentPanel() {
  const vigente = useInstallmentConfigVigente();
  const history = useInstallmentConfigHistory();
  const createConfig = useCreateInstallmentConfig();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      interestRatePercent: 2.99,
      maxInstallments: 18,
      minInstallmentAmount: 100,
      notes: "",
    },
  });

  // Hidrata o formulário com a config vigente quando ela carrega.
  const current = vigente.data;
  useEffect(() => {
    if (!current) return;
    reset({
      interestRatePercent: Number((current.interestRate * 100).toFixed(4)),
      maxInstallments: current.maxInstallments,
      minInstallmentAmount: current.minInstallmentAmount,
      notes: "",
    });
  }, [current, reset]);

  const onSubmit = (values: FormValues) => {
    createConfig.mutate({
      // % exibida → decimal enviada (fonte de verdade do backend).
      interestRate: Number((values.interestRatePercent / 100).toFixed(6)),
      maxInstallments: values.maxInstallments,
      minInstallmentAmount: values.minInstallmentAmount,
      notes: values.notes?.trim() || undefined,
    });
  };

  return (
    <section className="space-y-5" aria-labelledby="installment-config-title">
      <h2
        id="installment-config-title"
        className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60"
      >
        <CreditCard className="h-3 w-3 text-primary" aria-hidden="true" />
        Parcelamento de cartão de crédito
      </h2>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Config vigente + formulário */}
        <article className="glass-panel space-y-4 rounded-3xl border border-white/5 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-foreground">
                Configuração vigente
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Taxa mensal de juros compostos aplicada ao parcelamento no
                cartão de crédito. Salvar cria uma nova versão vigente.
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Percent className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
          </div>

          {current && (
            <div className="rounded-2xl border border-white/5 bg-accent/20 px-4 py-3 text-xs text-muted-foreground">
              <p>
                Vigente:{" "}
                <strong className="text-foreground">
                  {formatPercent(current.interestRate)}
                </strong>{" "}
                a.m. • até{" "}
                <strong className="text-foreground">
                  {current.maxInstallments}x
                </strong>{" "}
                • parcela mín.{" "}
                <strong className="text-foreground">
                  {formatBRL(current.minInstallmentAmount)}
                </strong>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="interestRatePercent"
                className="block text-[11px] font-bold uppercase tracking-wider text-primary"
              >
                Taxa mensal de juros (%)
              </label>
              <input
                id="interestRatePercent"
                type="number"
                step="0.01"
                inputMode="decimal"
                {...register("interestRatePercent", { valueAsNumber: true })}
                className="w-full rounded-xl border border-border bg-accent/30 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
              {errors.interestRatePercent && (
                <p className="text-[11px] text-destructive">
                  {errors.interestRatePercent.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="maxInstallments"
                className="block text-[11px] font-bold uppercase tracking-wider text-primary"
              >
                Máximo de parcelas (1–18)
              </label>
              <input
                id="maxInstallments"
                type="number"
                step="1"
                inputMode="numeric"
                {...register("maxInstallments", { valueAsNumber: true })}
                className="w-full rounded-xl border border-border bg-accent/30 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
              {errors.maxInstallments && (
                <p className="text-[11px] text-destructive">
                  {errors.maxInstallments.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="minInstallmentAmount"
                className="block text-[11px] font-bold uppercase tracking-wider text-primary"
              >
                Valor mínimo da parcela (R$)
              </label>
              <input
                id="minInstallmentAmount"
                type="number"
                step="0.01"
                inputMode="decimal"
                {...register("minInstallmentAmount", { valueAsNumber: true })}
                className="w-full rounded-xl border border-border bg-accent/30 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
              {errors.minInstallmentAmount && (
                <p className="text-[11px] text-destructive">
                  {errors.minInstallmentAmount.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="notes"
                className="block text-[11px] font-bold uppercase tracking-wider text-primary"
              >
                Observações (opcional)
              </label>
              <input
                id="notes"
                type="text"
                {...register("notes")}
                className="w-full rounded-xl border border-border bg-accent/30 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
              {errors.notes && (
                <p className="text-[11px] text-destructive">
                  {errors.notes.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={createConfig.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-[11px] font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createConfig.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Salvando…
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  Salvar configuração
                </>
              )}
            </button>
          </form>
        </article>

        {/* Histórico */}
        <article className="glass-panel space-y-4 rounded-3xl border border-white/5 p-6">
          <h3 className="flex items-center gap-2 text-base font-black text-foreground">
            <History className="h-4 w-4 text-primary" aria-hidden="true" />
            Histórico de configurações
          </h3>

          {history.isLoading ? (
            <p className="text-xs text-muted-foreground">Carregando histórico…</p>
          ) : history.data && history.data.length > 0 ? (
            <ul className="space-y-2">
              {history.data.map((cfg: InstallmentConfigRecord) => (
                <li
                  key={cfg.id}
                  className="rounded-2xl border border-white/5 bg-accent/10 px-4 py-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-foreground">
                      {formatPercent(cfg.interestRate)} a.m. • {cfg.maxInstallments}x
                      • mín. {formatBRL(cfg.minInstallmentAmount)}
                    </span>
                    {cfg.effectiveUntil === null && cfg.isActive ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                        Vigente
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted-foreground/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                        Encerrada
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground/60">
                    {formatDate(cfg.effectiveFrom)}
                    {cfg.effectiveUntil
                      ? ` — ${formatDate(cfg.effectiveUntil)}`
                      : " — atual"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma configuração registrada ainda.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
