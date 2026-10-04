import { BadgeCheck, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import { formatCurrencyBRL } from "~/lib/currency-format";

export interface InvestmentConfirmationView {
  investment: {
    id: number;
    amount: number;
    tokensQty: number;
    status: string;
    paidAt: string | null;
    effectsAppliedAt: string | null;
    /** Split financeiro (Modelo B). Null em investimentos legados. */
    tokenSellPrice?: number | null;
    tokenBasePrice?: number | null;
    tokenSubtotal?: number | null;
    platformFeePct?: number | null;
    platformFeeAmount?: number | null;
    startupRepasseAmount?: number | null;
    totalCharged?: number | null;
  };
  startup: { id: number; nome: string; slug: string };
  campaign: { id: number; title: string; tokenPrice: number };
  tokens: { total: number; ids: string[] };
}

export function InvestmentSuccess({
  confirmation,
}: {
  confirmation: InvestmentConfirmationView;
}) {
  const { investment, startup, campaign, tokens } = confirmation;
  const subtotal = investment.tokenSubtotal ?? investment.amount;
  const fee = investment.platformFeeAmount ?? 0;
  const totalPago = investment.totalCharged ?? subtotal + fee;

  // CASE.md §1601-1623: link "Acessar transparência" só com token confirmado.
  const tokensConfirmed =
    investment.status === "CONFIRMED" && tokens.ids.length > 0;

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyToken = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard indisponível (http antigo, sem permissão) — silencioso
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-8 py-8">
      <div className="text-center space-y-4">
        <BadgeCheck className="mx-auto h-16 w-16 text-emerald-400" />
        <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">
          Investimento confirmado
        </p>
        <h1 className="text-3xl font-black text-foreground sm:text-4xl">
          Compra de tokens concluída
        </h1>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
          Seus tokens foram emitidos e já estão vinculados à sua carteira. Este
          é o resumo oficial da sua participação na rodada.
        </p>
      </div>

      <section
        className="grid gap-4 sm:grid-cols-2"
        aria-label="Resumo da compra"
      >
        <div className="rounded-2xl border border-primary/20 bg-card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Startup
          </p>
          <p className="mt-2 text-xl font-black text-foreground">
            {startup.nome}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{campaign.title}</p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Total pago
          </p>
          <p className="mt-2 text-xl font-black text-foreground">
            {formatCurrencyBRL(totalPago)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrencyBRL(subtotal)} em tokens
            {fee > 0 &&
              ` + ${formatCurrencyBRL(fee)} de taxa da plataforma`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Token a{" "}
            {formatCurrencyBRL(
              investment.tokenSellPrice ?? campaign.tokenPrice,
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
            Tokens comprados
          </p>
          <p className="mt-2 text-4xl font-black text-emerald-300">
            {tokens.total.toLocaleString("pt-BR")}
          </p>
          <p className="mt-1 text-xs text-emerald-100/70">
            Quantidade registrada no investimento #{investment.id}.
          </p>

          {tokensConfirmed && (
            <details className="mt-4 group">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-emerald-300 hover:text-emerald-200 transition-colors">
                Ver IDs dos {tokens.ids.length} tokens emitidos
              </summary>
              <ul
                className="mt-3 space-y-1.5 max-h-48 overflow-y-auto pr-2"
                aria-label="Identificadores dos tokens emitidos"
              >
                {tokens.ids.map((id) => (
                  <li
                    key={id}
                    className="flex items-center gap-2 text-xs font-mono text-emerald-100"
                  >
                    <span className="flex-1 truncate">{id}</span>
                    <button
                      type="button"
                      onClick={() => copyToken(id)}
                      className="rounded p-1 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                      aria-label={`Copiar token ${id}`}
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    {copiedId === id && (
                      <span className="text-[10px] uppercase tracking-widest text-emerald-300">
                        copiado
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] uppercase tracking-widest text-emerald-100/60">
                Esses tokens aparecem em /wallet e dão acesso à transparência
                desta startup.
              </p>
            </details>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        {tokensConfirmed && (
          <Link
            to={`/founder/startups/${startup.id}/transparencia`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground hover:opacity-90"
          >
            Acessar transparência da startup{" "}
            <ExternalLink className="h-4 w-4" />
          </Link>
        )}
        <Link
          to="/wallet"
          className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-xs font-black uppercase tracking-widest text-foreground hover:bg-accent"
        >
          Ir para minha carteira
        </Link>
      </div>
    </main>
  );
}

export function InvestmentSuccessLoading() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 py-24 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <h1 className="text-2xl font-black text-foreground">
        Processando sua compra
      </h1>
      <p className="text-sm text-muted-foreground">
        O pagamento foi recebido. Estamos emitindo seus tokens com segurança.
      </p>
    </main>
  );
}
