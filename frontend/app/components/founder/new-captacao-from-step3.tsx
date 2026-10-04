import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Rocket } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Form } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { NewStartupStep3Fundraising } from "./new-startup-step-3-fundraising";
import {
  DEFAULT_FOUNDER_FUNDRAISING_CONFIG,
  founderFundraisingConfigQueryOptions,
} from "~/lib/queries";
import {
  createNewStartupSchema,
  newStartupDefaults,
  type NewStartupFormData,
} from "~/lib/new-startup-schema";
import { formatCurrencyAmount } from "~/lib/currency-format";
import { useCreateRoundMutation } from "~/hooks/use-create-round-mutation";
import { useForm } from "react-hook-form";

export interface NewCaptacaoFromStep3Props {
  startupId: string;
  startupName?: string | null;
  /** Quando fornecido, oculta o header "Etapa 3" (uso em página standalone). */
  hideStepHeader?: boolean;
}

/**
 * Sprint S34-k — wrapper que reaproveita EXATAMENTE o `NewStartupStep3Fundraising`
 * (a "aba captação" do wizard `/founder/startups/new`) para criar uma NOVA
 * RODADA em uma startup existente.
 *
 * Por que reusar o step 3?
 *  - O user pediu explicitamente que a página de nova captação siga o padrao
 *    visual e de UX do wizard.
 *  - O `NewCaptacaoForm` original (com alocacao de 7 categorias, deadline,
 *    affiliate commission, etc) foi uma evolucao separada que divergiu do
 *    step 3 do wizard. Unificamos aqui.
 *
 * Como funciona:
 *  1. Monta um `useForm<NewStartupFormData>` minimo (3 campos: metaCaptacao,
 *     equityOferecido, wantsFastTrackReview).
 *  2. Renderiza `<NewStartupStep3Fundraising>` com os mesmos props que o
 *     wizard usa — visual IDENTICO.
 *  3. No submit, converte os campos do wizard para o payload de campaign
 *     (targetAmount, equityPercent, valuation, tokenPrice, totalTokens,
 *     deadline, affiliateCommissionPct) e chama `useCreateRoundMutation`.
 *
 * Diferencas em relacao ao wizard original:
 *  - Nao redireciona para checkout (cria a campanha direto, sem pagamento
 *    de reserva — startup ja pagou a reserva inicial).
 *  - Calcula `deadline = now + 90 dias` (padrao de 3 meses para fechamento
 *    da rodada).
 *  - `affiliateCommissionPct = 5` (padrao, ajustavel depois em
 *    /founder/startups/:id/captacao/retornos).
 */
export function NewCaptacaoFromStep3({
  startupId,
  startupName,
  hideStepHeader = true,
}: NewCaptacaoFromStep3Props) {
  const navigate = useNavigate();
  const { data: config = DEFAULT_FOUNDER_FUNDRAISING_CONFIG } = useQuery(
    founderFundraisingConfigQueryOptions,
  );
  const createRound = useCreateRoundMutation();

  const {
    tokenPrice,
    authFeePerToken,
    equityMin,
    equityMax,
    minCampaign,
    maxCampaign,
    fastTrackFee = 2500,
  } = config;

  const form = useForm<NewStartupFormData>({
    resolver: zodResolver(
      createNewStartupSchema({
        minCampaign,
        maxCampaign,
        equityMin,
        equityMax,
      }),
    ) as never,
    mode: "onChange",
    defaultValues: {
      ...newStartupDefaults,
      metaCaptacao: minCampaign,
      equityOferecido: equityMin,
    } as NewStartupFormData,
    shouldUnregister: false,
  });

  // Estado para formatadores de moeda (mesmo padrao do wizard)
  const [metaCaptacaoFormatted, setMetaCaptacaoFormatted] = useState("");
  const [isMetaCaptacaoFocused, setIsMetaCaptacaoFocused] = useState(false);
  const metaCaptacaoInputRef = useRef<HTMLInputElement>(null);
  const [equityFormatted, setEquityFormatted] = useState("");

  // Derivados (espelha o wizard)
  const targetAmount = useMemo(
    () => Number(form.getValues("metaCaptacao")) || 0,
    // re-computa quando o valor muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.watch("metaCaptacao")],
  );
  const equityPercent = useMemo(
    () => Number(form.getValues("equityOferecido")) || 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.watch("equityOferecido")],
  );
  const valuationPreMoney = useMemo(
    () =>
      targetAmount > 0 && equityPercent > 0
        ? Number(((targetAmount * 100) / equityPercent).toFixed(2))
        : 0,
    [targetAmount, equityPercent],
  );
  const tokensCount = useMemo(
    () =>
      tokenPrice > 0 && equityPercent > 0
        ? Math.floor((valuationPreMoney * equityPercent) / (100 * tokenPrice))
        : 0,
    [valuationPreMoney, equityPercent, tokenPrice],
  );
  const tokenReservationFee = useMemo(
    () => Math.ceil(tokensCount * authFeePerToken),
    [tokensCount, authFeePerToken],
  );
  const equityPerToken = useMemo(
    () =>
      tokensCount > 0 ? Number((valuationPreMoney / tokensCount).toFixed(2)) : 0,
    [valuationPreMoney, tokensCount],
  );

  // Handlers dos formatadores (mesmo padrao do wizard)
  const handleMetaFocus = () => {
    setIsMetaCaptacaoFocused(true);
    const current = Number(form.getValues("metaCaptacao"));
    setMetaCaptacaoFormatted(
      Number.isFinite(current) ? String(current).replace(".", ",") : "",
    );
    requestAnimationFrame(() => metaCaptacaoInputRef.current?.select());
  };
  const handleMetaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/[^\d.,]/g, "");
    setMetaCaptacaoFormatted(raw);
    form.setValue("metaCaptacao", parseCurrencyAmountToNumber(raw), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };
  const handleMetaBlur = () => {
    const typedValue = parseCurrencyAmountToNumber(metaCaptacaoFormatted);
    const value = Math.max(minCampaign, Math.min(maxCampaign, typedValue));
    form.setValue("metaCaptacao", value, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setMetaCaptacaoFormatted(formatCurrencyAmount(value));
    setIsMetaCaptacaoFocused(false);
  };
  const handleEquityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = event.target.value
      .replace(/[^0-9,]/g, "")
      .split(",")
      .slice(0, 2)
      .join(",");
    const value = Math.min(equityMax, Number(formatted.replace(",", ".") || 0));
    setEquityFormatted(String(value).replace(".", ","));
    form.setValue("equityOferecido", value, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };
  const handleEquityBlur = () => {
    const value = Math.min(
      equityMax,
      Math.max(equityMin, Number(form.getValues("equityOferecido") || 0)),
    );
    form.setValue("equityOferecido", value, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setEquityFormatted(String(value).replace(".", ","));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const valid = await form.trigger();
    if (!valid) {
      const firstError = Object.values(form.formState.errors)[0];
      toast.error(
        String(
          firstError?.message ??
            "Existem campos inválidos. Revise os valores.",
        ),
      );
      return;
    }

    const wantsFastTrack = form.getValues("wantsFastTrackReview") === true;

    // Calcula deadline = now + 90 dias (padrao de 3 meses)
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 90);

    try {
      await createRound.mutateAsync({
        startupId,
        title: `Rodada ${new Date().getFullYear()}-${Math.floor(Math.random() * 9999)}`,
        targetAmount,
        minInvestment: Math.max(100, Math.floor(targetAmount * 0.01)),
        valuation: valuationPreMoney,
        tokenPrice: Number(tokenPrice.toFixed(2)),
        totalTokens: tokensCount,
        deadline: deadline.toISOString(),
        affiliateCommissionPct: 5,
        description: wantsFastTrack
          ? "Solicitacao inclui Fast Track Review (taxa adicional ja configurada)."
          : undefined,
      });
      toast.success("Nova captação criada com sucesso!");
      navigate(`/founder/startups/${startupId}/captacao`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao criar captação.",
      );
    }
  };

  return (
    <Form
      method="post"
      onSubmit={(e) => {
        void handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      }}
      className="space-y-6"
      data-testid="new-captacao-from-step3"
    >
      <NewStartupStep3Fundraising
        form={form}
        tokenPrice={tokenPrice}
        authFeePerToken={authFeePerToken}
        equityMin={equityMin}
        equityMax={equityMax}
        minCampaign={minCampaign}
        maxCampaign={maxCampaign}
        fastTrackReview={fastTrackFee}
        metaCaptacaoFormatted={metaCaptacaoFormatted}
        equityFormatted={equityFormatted}
        metaCaptacaoInputRef={metaCaptacaoInputRef}
        onMetaFocus={handleMetaFocus}
        onMetaChange={handleMetaChange}
        onMetaBlur={handleMetaBlur}
        onEquityChange={handleEquityChange}
        onEquityBlur={handleEquityBlur}
        valuationPreMoney={valuationPreMoney}
        tokensCount={tokensCount}
        tokenReservationFee={tokenReservationFee}
        equityPerToken={equityPerToken}
      />

      <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
        <button
          type="button"
          onClick={() => navigate(`/founder/startups/${startupId}`)}
          className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={createRound.isPending}
          data-testid="submit-new-captacao"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
        >
          <Rocket className="w-3.5 h-3.5" />
          {createRound.isPending ? "Criando..." : "Abrir Rodada"}
        </button>
      </div>

      {startupName && (
        <p className="text-xs text-muted-foreground text-center">
          Startup: <span className="text-foreground font-bold">{startupName}</span>
        </p>
      )}
    </Form>
  );
}

// Helper local (mesmo padrao do new-startup-wizard.tsx)
function parseCurrencyAmountToNumber(raw: string): number {
  const cleaned = raw.replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}