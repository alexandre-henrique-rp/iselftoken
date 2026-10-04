import { AlertCircle, CheckCircle2, Lightbulb } from "lucide-react";
import { useEffect } from "react";
import { useRouteLoaderData } from "react-router";

import { CaptacaoProgressRail } from "~/components/founder/captacao-progress-rail";
import { startupInputClass } from "~/components/founder/new-startup-form-field";
import { OfferSummaryCard } from "~/components/founder/offer-summary-card";
import type { CaptacaoLayoutData } from "./edit-startup-captacao-layout";
import { useEditStartupForm } from "~/lib/edit-startup-form-context";
import { cn } from "~/lib/utils";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);

// Aba "Valores de captação" — SOMENTE LEITURA. Não há form nem save; os
// valores (meta, valuation, preço/qtd de tokens, fast-track) foram definidos
// na reserva de tokens. Limpa handlers/dirtyCount ao montar para que a
// EditStartupActionBar permaneça oculta nesta aba.
export default function EditStartupCaptacaoValoresPage() {
  const data = useRouteLoaderData<CaptacaoLayoutData>(
    "routes/private/edit-startup-captacao-layout",
  );
  const campaign = data?.campaign;
  const { setDirtyCount } = useEditStartupForm();

  useEffect(() => {
    // Aba somente leitura: sem alterações locais ou barra fixa de salvamento.
    setDirtyCount(0);
  }, [setDirtyCount]);

  if (!campaign) return null;

  const meta = Number(campaign.targetAmount) || 0;
  const valuation = Number(campaign.valuation) || 0;
  const tokenPrice = Number(campaign.tokenPrice) || 200;
  const totalTokens = Number(campaign.totalTokens) || 0;
  const reservationFeePaid = campaign.reservationFeePaid;

  const equityPercent = valuation > 0 ? (meta / valuation) * 100 : 0;
  const equityAmount = (meta * equityPercent) / 100;
  const reservationFeeBase = meta * 0.02;

  // S18.6 — Payments da campanha (TOKEN_RESERVATION + FAST_TRACK_REVIEW).
  // Cada um tem seu próprio status + breakdown financeiro
  // (originalAmount/discountAmount/paidAmount).
  const reservationPayment = campaign.payments?.find(
    (p) => (p as { purpose?: string }).purpose === "TOKEN_RESERVATION",
  ) as
    | {
        id?: string;
        status?: string;
        amount?: number;
        originalAmount?: number | null;
        discountAmount?: number | null;
        paidAmount?: number | null;
        paidAt?: string | Date | null;
      }
    | undefined;
  const fastTrackPayment = campaign.payments?.find(
    (p) => (p as { purpose?: string }).purpose === "FAST_TRACK_REVIEW",
  ) as
    | {
        id?: string;
        status?: string;
        amount?: number;
        originalAmount?: number | null;
        discountAmount?: number | null;
        paidAt?: string | Date | null;
      }
    | undefined;

  const isPaid = reservationFeePaid || reservationPayment?.status === "PAID";
  const paymentAmount = reservationPayment
    ? Number(reservationPayment.amount)
    : reservationFeeBase;
  // S18.6 — Fast Track contratado quando existe um Payment FAST_TRACK_REVIEW
  // (independente do status). Pago quando esse Payment está PAID.
  const hasFastTrack = Boolean(fastTrackPayment);
  const fastTrackPaid = fastTrackPayment?.status === "PAID";
  const fastTrackFee = fastTrackPayment
    ? Number(fastTrackPayment.amount)
    : 600;

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-5 xl:gap-6">
      <div className="min-w-0 space-y-5">
        {/* Aviso: etapa já configurada na reserva de tokens */}
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 md:p-5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
              Etapa já configurada na reserva de tokens
            </span>
            <p className="text-xs leading-relaxed text-foreground/90">
              Os valores abaixo (meta de captação, valuation, preço do token,
              quantidade de tokens e moeda) foram definidos quando você criou a
              campanha e pagou a taxa de reserva de tokens. Por isso estão
              exibidos como <span className="font-bold">somente leitura</span>{" "}
              nesta aba. Para alterar essas informações, abra uma nova rodada de
              captação após o encerramento da atual.
            </p>
          </div>
        </div>

        <section className="relative space-y-6 overflow-hidden rounded-2xl border border-border bg-card p-4 md:p-5 lg:p-6">
          <div className="flex items-center gap-4 border-b border-border pb-4">
            <div className="h-8 w-1 bg-primary"></div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground uppercase">
              Configure sua Captação &amp; Valuation
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 items-start">
            <div className="space-y-6">
              {/* Meta de Captação */}
              <div className="space-y-2">
                <label className="text-sm font-semibold leading-snug text-muted-foreground block">
                  Valor total que você deseja levantar (R$)
                </label>
                <input
                  className={`${startupInputClass} text-xl font-bold`}
                  disabled
                  readOnly
                  value={brl(meta)}
                />
                <p className="text-[10px] text-muted-foreground/80 leading-relaxed italic">
                  ℹ️ O valor de captação permitido pela plataforma é de R$
                  10.000,00 até R$ 5.000.000,00.
                </p>
              </div>

              {/* Equity */}
              <div className="space-y-2">
                <label className="text-sm font-semibold leading-snug text-muted-foreground block">
                  Equity que você está disposto a oferecer (%)
                </label>
                <input
                  className={`${startupInputClass} text-xl font-bold`}
                  disabled
                  readOnly
                  value={`${equityPercent.toFixed(2)}%`}
                />
                <p className="text-[10px] text-muted-foreground/80 leading-relaxed italic">
                  ℹ️ O percentual de equity permitido é de 5% até 49%.
                </p>
              </div>

              {/* Moeda */}
              <div className="space-y-2">
                <label className="text-sm font-semibold leading-snug text-muted-foreground block">
                  Moeda da Captação
                </label>
                <select className={`${startupInputClass} font-bold`} disabled>
                  <option>Real (R$)</option>
                </select>
              </div>
            </div>

            {/* Resumo da Tokenização (Lado Direito) */}
            <div className="relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 p-5 md:p-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary border-b border-border/60 pb-3">
                Resumo da Tokenização
              </h3>

              <div className="space-y-4 my-6">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">
                    Valor do Token (base)
                  </span>
                  <span className="font-bold text-foreground">
                    {brl(tokenPrice)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">
                    Quantidade de Tokens Necessários
                  </span>
                  <span className="font-bold text-foreground">
                    {totalTokens.toLocaleString("pt-BR")} tokens
                  </span>
                </div>

                <div
                  className={cn(
                    "flex justify-between items-center text-xs p-2.5 rounded-lg border",
                    isPaid
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/5 border-amber-500/20 text-amber-400",
                  )}
                >
                  <span className="font-semibold">
                    Reserva de Tokens (custo)
                  </span>
                  <span className="font-semibold">{brl(reservationFeeBase)}</span>
                </div>

                <div className="flex flex-col gap-1 items-center text-center border-t border-border/60 pt-3">
                  <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                    Valuation (Pré-money)
                  </span>
                  <span className="font-semibold text-3xl text-foreground tracking-tight italic select-all">
                    {brl(valuation)}
                  </span>
                </div>

                <div className="border-t border-border/60 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      Meta de Captação
                    </span>
                    <span className="font-bold text-foreground">{brl(meta)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      Taxas Adm. e Transferência (20%)
                    </span>
                    <span className="font-bold text-rose-400">
                      - {brl(meta * 0.2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-border/60 pt-2 font-bold">
                    <span className="text-emerald-400">
                      Total Líquido Recebido
                    </span>
                    <span className="text-emerald-400">{brl(meta * 0.8)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fast Track & Explicativo de Taxa (Rodapé da seção) */}
            <div className="md:col-span-2 border-t border-border/60 pt-6 space-y-6">
              {meta > 0 && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed text-foreground md:p-5">
                  ℹ️{" "}
                  <span className="font-bold text-primary">
                    Taxa de Reserva:
                  </span>{" "}
                  A taxa de reserva de tokens é um valor cobrado para cobrir a
                  infraestrutura de emissão, auditoria e processamento dos seus
                  ativos digitais.
                </div>
              )}

              <label className="flex items-start gap-3 select-none cursor-not-allowed opacity-75">
                <input
                  type="checkbox"
                  className="mt-1 h-4.5 w-4.5 rounded border-input text-primary focus:ring-0 bg-surface-container cursor-not-allowed"
                  disabled
                  checked={hasFastTrack}
                  readOnly
                />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-foreground">
                    Avaliação Rápida (Fast Track Review)
                    {hasFastTrack && (
                      <span
                        className={cn(
                          "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          fastTrackPaid
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-amber-500/15 text-amber-400",
                        )}
                      >
                        {fastTrackPaid ? "Pago" : "Pendente"}
                      </span>
                    )}
                    {!hasFastTrack && (
                      <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                        — não contratado
                      </span>
                    )}
                    {hasFastTrack && (
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        Adicional de R${" "}
                        {fastTrackFee.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    )}
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Análise prioritária — sua rodada recebe atenção imediata da
                    equipe de compliance
                  </p>
                </div>
              </label>
            </div>
          </div>
        </section>

        {/* Cobranças Pagas (S18.6) — espelho do que o fundador pagou + status por
            produto do checkout consolidado (TOKEN_RESERVATION + FAST_TRACK_REVIEW).
            O admin vê isso na listagem financeira; aqui o fundador confirma o
            que foi debitado do PIX. */}
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-center gap-3 border-b border-border/60 pb-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Cobranças Pagas
            </h3>
          </div>

          {/* Linha 1: Reserva de tokens */}
          {reservationPayment && (
            <div
              className={cn(
                "flex items-start justify-between gap-3 rounded-lg border p-3",
                reservationPayment.status === "PAID"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-amber-500/30 bg-amber-500/5",
              )}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">
                  Reserva de Tokens
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {reservationPayment.status === "PAID"
                    ? `Pago em ${reservationPayment.paidAt ? new Date(reservationPayment.paidAt).toLocaleDateString("pt-BR") : "data indisponível"}`
                    : "Aguardando pagamento"}
                </p>
              </div>
              <div className="text-right">
                {reservationPayment.originalAmount != null &&
                reservationPayment.originalAmount >
                  Number(reservationPayment.amount) ? (
                  <>
                    <span className="block text-[10px] text-muted-foreground/60 line-through">
                      {brl(reservationPayment.originalAmount)}
                    </span>
                    <span className="block text-xs font-bold text-emerald-400">
                      {brl(Number(reservationPayment.amount))}
                    </span>
                  </>
                ) : (
                  <span className="block text-xs font-bold text-foreground">
                    {brl(Number(reservationPayment.amount))}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Linha 2 (S18.6): Fast Track Review — contratado quando existe
              o Payment irmão. Mostra status PAID/PENDING. */}
          {fastTrackPayment && (
            <div
              className={cn(
                "flex items-start justify-between gap-3 rounded-lg border p-3",
                fastTrackPaid
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-amber-500/30 bg-amber-500/5",
              )}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">
                  Avaliação Rápida (Fast Track Review)
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {fastTrackPaid
                    ? `Pago em ${fastTrackPayment.paidAt ? new Date(fastTrackPayment.paidAt).toLocaleDateString("pt-BR") : "data indisponível"}`
                    : "Aguardando pagamento"}
                </p>
              </div>
              <div className="text-right">
                {fastTrackPayment.originalAmount != null &&
                fastTrackPayment.originalAmount >
                  Number(fastTrackPayment.amount) ? (
                  <>
                    <span className="block text-[10px] text-muted-foreground/60 line-through">
                      {brl(fastTrackPayment.originalAmount)}
                    </span>
                    <span className="block text-xs font-bold text-emerald-400">
                      {brl(Number(fastTrackPayment.amount))}
                    </span>
                  </>
                ) : (
                  <span className="block text-xs font-bold text-foreground">
                    {brl(Number(fastTrackPayment.amount))}
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Dica educativa sobre valor de captação (PRD §4.3) */}
        <div className="space-y-3 rounded-xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">
                Dica: Planeje sua captação para 12 meses
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Valores muito baixos de captação podem não ser suficientes para
                sustentar a operação e atingir os marcos de crescimento
                desejados. O ideal é calcular o valor necessário para{" "}
                <span className="font-bold text-foreground">
                  cobrir pelo menos 12 meses de operação
                </span>
                , incluindo equipe, infraestrutura, marketing e uma reserva de
                contingência.
              </p>
              {meta > 0 && meta < 100000 && (
                <p className="text-xs text-amber-400 font-bold mt-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Atenção: Captações abaixo de R$ 100.000 raramente sustentam 12
                  meses de operação. Considere revisar sua meta.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Aside */}
      <aside className="w-full space-y-4 lg:sticky lg:top-6 lg:w-[260px]">
        <CaptacaoProgressRail campaign={campaign} />
        {(() => {
          // S18.6 — O card "Resumo da oferta" mostra o que o founder pagou
          // de fato (com cupom aplicado), não o preço cheio. O preço cheio
          // vai em `*Original` para aparecer riscado quando há desconto.
          const reservationFeePaid = reservationPayment
            ? Number(reservationPayment.amount)
            : reservationFeeBase;
          const reservationFeeOriginalValue = reservationPayment?.originalAmount
            ? Number(reservationPayment.originalAmount)
            : null;
          const fastTrackFeeOriginalValue = fastTrackPayment?.originalAmount
            ? Number(fastTrackPayment.originalAmount)
            : null;
          const totalCheckoutPaid =
            reservationFeePaid + (hasFastTrack ? fastTrackFee : 0);
          const totalCheckoutOriginalValue =
            (reservationFeeOriginalValue ?? reservationFeePaid) +
            (hasFastTrack ? (fastTrackFeeOriginalValue ?? fastTrackFee) : 0);

          return (
            <OfferSummaryCard
              meta={meta}
              adjustedTargetAmount={totalTokens * tokenPrice}
              estimatedTokenCount={totalTokens}
              tokenPrice={tokenPrice}
              valuation={valuation}
              equityPercent={equityPercent}
              equityAmount={equityAmount}
              reservationFee={reservationFeePaid}
              reservationFeeOriginal={
                reservationFeeOriginalValue != null &&
                reservationFeeOriginalValue > reservationFeePaid
                  ? reservationFeeOriginalValue
                  : null
              }
              totalCheckout={totalCheckoutPaid}
              totalCheckoutOriginal={
                totalCheckoutOriginalValue > totalCheckoutPaid
                  ? totalCheckoutOriginalValue
                  : null
              }
              fastTrackFee={hasFastTrack ? fastTrackFee : undefined}
              flat={true}
            />
          );
        })()}

        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-primary block">
              Recomendação CVM
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              As informações desta captação constituem o Material Informativo
              Essencial (MIE) exigido pela Resolução CVM nº 88/2022.
            </p>
          </div>
        </div>
      </aside>

    </div>
  );
}
