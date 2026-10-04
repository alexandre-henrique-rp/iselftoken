import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CircleAlert, Coins, Loader2, Ticket } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { formatCurrencyBRL } from "~/lib/currency-format";

export interface CampaignCheckoutData {
  id: number;
  title: string;
  tokenPrice: number;
  /** Preço base por token (repasse à startup). Null em campanhas legadas. */
  tokenBasePrice?: number | null;
  /** Alíquota da taxa da plataforma (ex.: 0.05 = 5%). Null em legadas. */
  platformFeePct?: number | null;
  minInvestment: number;
  remainingTokens: number;
  equity?: string;
}

type CreateInvestmentResponse = {
  error?: boolean;
  message?: string;
  data?: {
    payment?: {
      id?: number;
    };
  };
};

function getValidationMessage({
  amount,
  minInvestment,
  tokenPrice,
  remainingTokens,
}: {
  amount: number;
  minInvestment: number;
  tokenPrice: number;
  remainingTokens: number;
}): string | null {
  if (!Number.isFinite(amount) || amount < minInvestment) {
    return `O aporte mínimo é ${formatCurrencyBRL(minInvestment)}.`;
  }

  if (tokenPrice <= 0 || Math.floor(amount / tokenPrice) < 1) {
    return "O valor informado não compra nenhum token.";
  }

  if (Math.floor(amount / tokenPrice) > remainingTokens) {
    return `Há somente ${remainingTokens.toLocaleString("pt-BR")} token(s) disponível(is).`;
  }

  return null;
}

/**
 * Entrada compatível para links legados de campanha.
 * A reserva cria o Payment real e transfere o cliente ao checkout canônico,
 * único local em que um cupom pode alterar o valor a ser cobrado.
 */
export function CampaignInvestmentCheckout({
  campaign,
}: {
  campaign: CampaignCheckoutData;
}) {
  const navigate = useNavigate();
  const minInvestment = Number(campaign.minInvestment);
  const tokenPrice = Number(campaign.tokenPrice);
  const remainingTokens = Number(campaign.remainingTokens);
  const [amount, setAmount] = useState(minInvestment);

  const tokensQty = useMemo(
    () =>
      tokenPrice > 0 && Number.isFinite(amount)
        ? Math.floor(amount / tokenPrice)
        : 0,
    [amount, tokenPrice],
  );
  const validationMessage = getValidationMessage({
    amount,
    minInvestment,
    tokenPrice,
    remainingTokens,
  });

  // Modelo B — a taxa da plataforma é cobrada POR CIMA do aporte no
  // pagamento. Exibimos a estimativa aqui; o valor definitivo é calculado
  // pelo backend na criação do investimento.
  const feePct = Number(campaign.platformFeePct ?? 0);
  const feeEstimate = Number.isFinite(amount) ? amount * feePct : 0;
  const totalEstimate = Number.isFinite(amount) ? amount + feeEstimate : 0;

  const createInvestment = useMutation({
    mutationFn: async (investmentAmount: number) => {
      const response = await fetch("/api/investments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id, amount: investmentAmount }),
      });
      const body = (await response.json().catch(() => null)) as CreateInvestmentResponse | null;

      if (!response.ok || body?.error) {
        throw new Error(body?.message ?? "Não foi possível reservar o investimento.");
      }

      const paymentId = Number(body?.data?.payment?.id);
      if (!Number.isInteger(paymentId) || paymentId < 1) {
        throw new Error("A reserva foi criada, mas o pagamento não pôde ser iniciado.");
      }

      return paymentId;
    },
    onSuccess: (paymentId) => {
      toast.success("Reserva criada. Agora você pode aplicar o cupom e escolher como pagar.");
      navigate(`/checkout/payment/${paymentId}`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível reservar o investimento.",
      );
    },
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <section className="rounded-3xl border border-white/10 bg-accent/20 p-5 shadow-xl sm:p-8">
          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
            Investimento
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Defina seu aporte
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Reserve os tokens de <strong className="text-foreground">{campaign.title}</strong> antes de gerar a cobrança.
          </p>

          <div className="mt-8 space-y-3">
            <label
              htmlFor="investment-amount"
              className="block text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Valor do aporte
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                R$
              </span>
              <input
                id="investment-amount"
                type="number"
                min={minInvestment}
                max={remainingTokens * tokenPrice}
                step="0.01"
                inputMode="decimal"
                value={Number.isFinite(amount) ? amount : ""}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-black/40 py-4 pl-12 pr-4 text-lg font-black text-foreground outline-none transition-colors placeholder:text-muted-foreground/30 focus:border-primary/50"
              />
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Mínimo: {formatCurrencyBRL(minInvestment)}</span>
              <span>{remainingTokens.toLocaleString("pt-BR")} tokens disponíveis</span>
            </div>
            {validationMessage && (
              <p className="flex items-center gap-2 text-xs font-medium text-destructive" role="alert">
                <CircleAlert className="h-4 w-4 shrink-0" />
                {validationMessage}
              </p>
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Ticket className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-foreground">Tem um cupom de desconto?</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Após reservar o aporte, o cupom será aplicado no pagamento antes da geração do PIX ou da cobrança no cartão.
                </p>
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-3xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-primary">Resumo da reserva</h2>
          <div className="mt-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="font-bold text-foreground">{campaign.title}</p>
                {campaign.equity && (
                  <p className="mt-1 text-xs text-muted-foreground">Equity: {campaign.equity}</p>
                )}
              </div>
              <Coins className="h-5 w-5 shrink-0 text-primary" />
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Preço por token</span>
              <span className="font-semibold text-foreground">{formatCurrencyBRL(tokenPrice)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Você receberá</span>
              <span className="font-semibold text-foreground">{tokensQty.toLocaleString("pt-BR")} token(s)</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Subtotal de tokens</span>
              <span className="font-semibold text-foreground">{formatCurrencyBRL(amount || 0)}</span>
            </div>
            {feePct > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Taxa da plataforma ({(feePct * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%)
                </span>
                <span className="font-semibold text-foreground">{formatCurrencyBRL(feeEstimate)}</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total a pagar</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-primary">{formatCurrencyBRL(totalEstimate)}</p>
              {feePct > 0 && (
                <p className="mt-1 text-[10px] text-muted-foreground/70">
                  Aporte {formatCurrencyBRL(amount || 0)} + taxa {formatCurrencyBRL(feeEstimate)}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => createInvestment.mutate(amount)}
            disabled={Boolean(validationMessage) || createInvestment.isPending}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-xs font-black uppercase tracking-widest text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createInvestment.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Reservando…
              </>
            ) : (
              <>
                Continuar para pagamento
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </aside>
      </div>
    </main>
  );
}
