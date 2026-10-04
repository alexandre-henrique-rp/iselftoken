import { useQuery } from "@tanstack/react-query";
import { Rocket } from "lucide-react";
import React, { useMemo, useState } from "react";
import { Form, useNavigate } from "react-router";
import { toast } from "sonner";
import { useCreateRoundMutation } from "~/hooks/use-create-round-mutation";
import {
  DEFAULT_FOUNDER_FUNDRAISING_CONFIG,
  founderFundraisingConfigQueryOptions,
} from "~/lib/queries";
import { computeNewRoundValuation } from "~/routes/private/founder-new-round.math";

export interface NewCaptacaoFormProps {
  startupId: string;
  startupName?: string | null;
  /** Quando fornecido, oculta o bloco de título da captação (componente
   *  embutido em página de contexto onde o título já é renderizado). */
  hideTitle?: boolean;
  /** Callback após criar a rodada com sucesso. Default: navega para /home. */
  onSuccess?: () => void;
}

const field =
  "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground";
const label =
  "block text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1.5";

/**
 * Formulário reutilizável de criação de captação (rodada/campaign).
 *
 * Extraído de `founder-new-round.tsx` para ser usado pela rota canônica
 * `/founder/startups/:id/new-round`, que aplica os gates de validação no loader
 * antes de permitir a criação da rodada.
 *
 * Toda a lógica de submit, cálculo de valuation e validação client-side vive
 * aqui; a rota é responsável apenas por carregar o contexto da startup.
 */
export function NewCaptacaoForm({
  startupId,
  startupName,
  hideTitle,
  onSuccess,
}: NewCaptacaoFormProps) {
  const navigate = useNavigate();
  const createRound = useCreateRoundMutation();

  // Carrega config do admin (equityMin/Max + outros limites) para clamp
  // do input equityPercent e validação visual dos ranges.
  const { data: config = DEFAULT_FOUNDER_FUNDRAISING_CONFIG } = useQuery(
    founderFundraisingConfigQueryOptions,
  );
  const { equityMin, equityMax } = config;

  const [targetAmount, setTargetAmount] = useState<string>("");
  const [equityPercent, setEquityPercent] = useState<string>("");

  const targetAmountNum = useMemo(() => {
    const cleaned = targetAmount.replace(/\./g, "").replace(",", ".");
    return Number(cleaned) || 0;
  }, [targetAmount]);

  const equityPercentNum = useMemo(() => {
    return Number(equityPercent.replace(",", ".")) || 0;
  }, [equityPercent]);

  // valuation pré-money calculado: targetAmount * 100 / equityPercent.
  // Função pura em founder-new-round.math.ts (testada unitariamente).
  const valuationAuto = useMemo(
    () => computeNewRoundValuation(targetAmountNum, equityPercentNum),
    [targetAmountNum, equityPercentNum],
  );

  const saving = createRound.isPending;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const num = (k: string) =>
      Number(
        String(fd.get(k) ?? "")
          .replace(/\./g, "")
          .replace(",", "."),
      );
    const numPlain = (k: string) =>
      Number(String(fd.get(k) ?? "").replace(",", "."));
    const title = String(fd.get("title") || "").trim();
    const affiliateCommissionPct = Number(fd.get("affiliateCommissionPct"));
    const deadlineStr = String(fd.get("deadline") || "");

    if (!title) return;
    if (![5, 10].includes(affiliateCommissionPct)) return;
    if (!deadlineStr) return;

    // Validacao final antes de submit (defesa contra bypass do estado readonly
    // via DevTools ou race conditions entre re-renders).
    if (!Number.isFinite(valuationAuto) || valuationAuto <= 0) {
      toast.error("Valuation inválida. Preencha meta e equity corretamente.");
      return;
    }
    // Clamp equity ao range do admin (anti-bypass via DevTools).
    if (equityPercentNum < equityMin || equityPercentNum > equityMax) {
      toast.error(
        `Equity deve estar entre ${equityMin}% e ${equityMax}% (configurado pela plataforma).`,
      );
      return;
    }

    try {
      await createRound.mutateAsync({
        startupId,
        title,
        targetAmount: num("targetAmount"),
        minInvestment: num("minInvestment"),
        valuation: valuationAuto,
        tokenPrice: numPlain("tokenPrice"),
        totalTokens: Math.trunc(numPlain("totalTokens")),
        deadline: new Date(`${deadlineStr}T23:59:59`).toISOString(),
        affiliateCommissionPct: affiliateCommissionPct as 5 | 10,
        description: String(fd.get("description") || "").trim() || undefined,
      });
      if (onSuccess) onSuccess();
      else navigate("/founder/dashboard");
    } catch {
      // toast já disparado pela mutation (onError)
    }
  };

  return (
    <Form method="post" className="space-y-6" onSubmit={handleSubmit}>
      {createRound.isError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-5 py-4">
          <p className="text-sm text-red-300 font-medium">
            {createRound.error instanceof Error
              ? createRound.error.message
              : "Não foi possível abrir a rodada."}
          </p>
        </div>
      )}

      {!hideTitle && (
        <div>
          <label className={label}>Título da rodada</label>
          <input
            name="title"
            type="text"
            maxLength={120}
            required
            placeholder="Ex.: Rodada Seed 2026"
            className={field}
          />
        </div>
      )}

      {startupName && (
        <p className="text-muted-foreground text-sm">
          Startup: <span className="text-foreground font-bold">{startupName}</span>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={label}>Meta de captação (R$)</label>
          <input
            name="targetAmount"
            type="number"
            step="0.01"
            min="0"
            required
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Investimento mínimo (R$)</label>
          <input
            name="minInvestment"
            type="number"
            step="0.01"
            min="0"
            required
            className={field}
          />
        </div>
        <div>
          <label className={label}>
            Equity oferecida (%)
            <span className="ml-1 text-[9px] font-normal text-muted-foreground/60">
              (mín {equityMin}% • máx {equityMax}% — configurado pela
              plataforma)
            </span>
          </label>
          <input
            name="equityPercent"
            type="number"
            step="0.01"
            min={equityMin}
            max={equityMax}
            required
            value={equityPercent}
            onChange={(e) => setEquityPercent(e.target.value)}
            className={field}
            aria-describedby="equityPercent-help"
          />
          <p
            id="equityPercent-help"
            className="mt-1 text-[10px] text-muted-foreground/70"
          >
            Valuation será calculado automaticamente a partir da meta e
            desta %.
          </p>
        </div>
        <div>
          <label className={label}>Valuation (R$)</label>
          <input
            name="valuation"
            type="number"
            step="0.01"
            min="0"
            required
            readOnly
            value={
              Number.isFinite(valuationAuto) && valuationAuto > 0
                ? valuationAuto.toFixed(2)
                : ""
            }
            placeholder={
              !equityPercent || equityPercentNum <= 0
                ? "—"
                : "Calculando..."
            }
            aria-describedby="valuation-help"
            className={`${field} cursor-not-allowed bg-white/5`}
          />
          <p
            id="valuation-help"
            className="mt-1 text-[10px] text-muted-foreground/70"
          >
            {valuationAuto > 0
              ? `Calculado: meta × 100 ÷ equity%. Não editável.`
              : `Preencha meta e equity acima do mínimo (${equityMin}%) para calcular.`}
          </p>
        </div>
        <div>
          <label className={label}>Preço do token (R$)</label>
          <input
            name="tokenPrice"
            type="number"
            step="0.01"
            min="0"
            required
            className={field}
          />
        </div>
        <div>
          <label className={label}>Total de tokens</label>
          <input
            name="totalTokens"
            type="number"
            step="1"
            min="1"
            required
            className={field}
          />
        </div>
        <div>
          <label className={label}>Prazo (deadline)</label>
          <input name="deadline" type="date" required className={field} />
        </div>
      </div>

      {/* Comissão do afiliado — configurada na edição da captação (aba Retornos) */}
      <input type="hidden" name="affiliateCommissionPct" value="5" />

      <div>
        <label className={label}>Descrição (opcional)</label>
        <textarea
          name="description"
          maxLength={280}
          rows={3}
          className={field}
          placeholder="Resumo da rodada"
        />
      </div>

      <button
        type="submit"
        disabled={saving || valuationAuto <= 0 || !Number.isFinite(valuationAuto)}
        className="w-full py-4 rounded-full bg-primary text-black hover:opacity-90 disabled:opacity-40 transition-all text-xs font-black uppercase tracking-widest inline-flex items-center justify-center gap-2"
      >
        <Rocket className="w-4 h-4" />{" "}
        {saving ? "Abrindo rodada…" : "Abrir rodada"}
      </button>
    </Form>
  );
}