import type { ChangeEvent, RefObject } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { NewStartupFormData } from "~/lib/new-startup-schema";
import { FormFieldError, startupInputClass } from "./new-startup-form-field";

interface FundraisingStepProps {
  form: UseFormReturn<NewStartupFormData>;
  tokenPrice: number;
  /** Custo de geração por token (R$/token) — configurado pelo admin. */
  authFeePerToken: number;
  equityMin: number;
  equityMax: number;
  minCampaign: number;
  maxCampaign: number;
  fastTrackReview: number;
  metaCaptacaoFormatted: string;
  equityFormatted: string;
  metaCaptacaoInputRef: RefObject<HTMLInputElement | null>;
  onMetaFocus?: () => void;
  onMetaChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onMetaBlur: () => void;
  onEquityChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onEquityBlur: () => void;
  valuationPreMoney: number;
  tokensCount: number;
  tokenReservationFee: number;
  equityPerToken: number;
}

export function NewStartupStep3Fundraising({
  form,
  tokenPrice,
  authFeePerToken,
  equityMin,
  equityMax,
  minCampaign,
  maxCampaign,
  fastTrackReview,
  metaCaptacaoFormatted,
  equityFormatted,
  metaCaptacaoInputRef,
  onMetaFocus,
  onMetaChange,
  onMetaBlur,
  onEquityChange,
  onEquityBlur,
  valuationPreMoney,
  tokensCount,
  tokenReservationFee,
  equityPerToken,
}: FundraisingStepProps) {
  const {
    register,
    formState: { errors },
  } = form;
  const moneyError = errors.metaCaptacao;
  const equityError = errors.equityOferecido;
  return (
    <section aria-labelledby="step-3-title" className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Etapa 3 de 3
        </p>
        <h2
          id="step-3-title"
          className="mt-1 text-2xl font-bold text-foreground"
        >
          Configure sua captação e valuation
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-6 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-2 md:p-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:gap-8 lg:p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="metaCaptacaoInput"
              className="text-sm font-semibold text-foreground"
            >
              Valor total que deseja levantar
            </label>
            <input type="hidden" {...register("metaCaptacao")} />
            <div className="relative">
              <span
                className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base font-semibold text-muted-foreground"
                aria-hidden="true"
              >
                R$
              </span>
              <input
                id="metaCaptacaoInput"
                ref={metaCaptacaoInputRef}
                className={`${startupInputClass} pl-12 text-xl font-bold ${moneyError ? "border-destructive" : ""}`}
                placeholder="100.000,00"
                type="text"
                inputMode="decimal"
                value={metaCaptacaoFormatted}
                onFocus={onMetaFocus}
                onChange={onMetaChange}
                onBlur={onMetaBlur}
                aria-invalid={Boolean(moneyError)}
                aria-describedby="metaCaptacao-help metaCaptacao-error"
              />
            </div>
            <p
              id="metaCaptacao-help"
              className="text-xs leading-relaxed text-muted-foreground"
            >
              Digite o valor em reais. A formatação acontece ao sair do campo.
              Permitido de R$ {minCampaign.toLocaleString("pt-BR")} até R${" "}
              {maxCampaign.toLocaleString("pt-BR")} (limite CVM).
            </p>
            <FormFieldError id="metaCaptacao-error" error={moneyError} />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="equityOferecidoInput"
              className="text-sm font-semibold text-foreground"
            >
              Equity que está disposto a oferecer (%)
            </label>
            <input type="hidden" {...register("equityOferecido")} />
            <input
              id="equityOferecidoInput"
              className={`${startupInputClass} text-xl font-bold ${equityError ? "border-destructive" : ""}`}
              placeholder="Ex: 10"
              type="text"
              inputMode="decimal"
              value={equityFormatted}
              onChange={onEquityChange}
              onBlur={onEquityBlur}
              min={equityMin}
              max={equityMax}
              step="0.01"
              aria-invalid={Boolean(equityError)}
              aria-describedby="equityOferecido-help equityOferecido-error"
            />
            <p
              id="equityOferecido-help"
              className="text-xs leading-relaxed text-muted-foreground"
            >
              Permitido de {equityMin}% até {equityMax}%.
            </p>
            <FormFieldError id="equityOferecido-error" error={equityError} />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="currency"
              className="text-sm font-semibold text-foreground"
            >
              Moeda da captação
            </label>
            <select id="currency" className={startupInputClass} disabled>
              <option>Real (R$)</option>
            </select>
          </div>
        </div>
        <TokenizationSummary
          tokenPrice={tokenPrice}
          authFeePerToken={authFeePerToken}
          tokensCount={tokensCount}
          tokenReservationFee={tokenReservationFee}
          valuationPreMoney={valuationPreMoney}
          equityPerToken={equityPerToken}
        />
        <div className="space-y-4 border-t border-border pt-5 md:col-span-2 lg:col-span-2">
          <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-4 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Taxa de reserva:</strong> valor
            destinado à infraestrutura de emissão, auditoria e processamento dos
            ativos digitais.
          </div>
          <label
            htmlFor="wantsFastTrackReview"
            className="flex cursor-pointer items-start gap-3 rounded-lg p-1 focus-within:ring-2 focus-within:ring-primary"
          >
            <input
              id="wantsFastTrackReview"
              type="checkbox"
              className="mt-1 h-4 w-4 accent-primary"
              {...register("wantsFastTrackReview")}
            />
            <span>
              <span className="block text-sm font-semibold text-foreground">
                Desejo Avaliação Rápida (Fast Track Review) — adicional de R${" "}
                {fastTrackReview.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Análise prioritária pela equipe de compliance.
              </span>
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}

function TokenizationSummary({
  tokenPrice,
  authFeePerToken,
  tokensCount,
  tokenReservationFee,
  valuationPreMoney,
  equityPerToken,
}: {
  tokenPrice: number;
  authFeePerToken: number;
  tokensCount: number;
  tokenReservationFee: number;
  valuationPreMoney: number;
  equityPerToken: number;
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <h3 className="border-b border-border pb-3 text-sm font-bold text-foreground">
        Resumo da tokenização
      </h3>
      <dl className="mt-5 space-y-4 text-sm">
        <SummaryRow
          label="Preço base do token"
          value={`R$ ${tokenPrice.toFixed(2)}`}
        />
        <SummaryRow
          label="Taxa de emissão por token"
          value={`R$ ${authFeePerToken.toFixed(2)}`}
        />
        <SummaryRow
          label="Tokens necessários"
          value={`${tokensCount.toLocaleString("pt-BR")} tokens`}
        />
        <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3">
          <dt className="font-semibold text-foreground">
            Reserva de tokens
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
              (tokens × R${authFeePerToken.toFixed(2)})
            </span>
          </dt>
          <dd className="font-bold text-primary">
            R${" "}
            {tokenReservationFee.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </dd>
        </div>
        <div className="border-t border-border pt-4 text-center">
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Valuation pré-money
          </dt>
          <dd className="mt-1 text-2xl font-bold text-foreground">
            R${" "}
            {valuationPreMoney.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </dd>
        </div>
        <SummaryRow
          label="Equity oferecida"
          value={`${equityPerToken.toFixed(2)}%`}
        />
      </dl>
    </div>
  );
}
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}
