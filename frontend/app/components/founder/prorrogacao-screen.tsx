import { useMemo, useState } from "react";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { DashboardBackgroundWatermark } from "~/components/founder/dashboard-background-watermark";
import { formatBRLCompact } from "~/lib/currency-format";

export interface ProrrogacaoData {
  campaignId: number;
  campaignTitle: string;
  metaOriginal: number;
  tokenPrice: number;
  tokensSold: number;
  totalTokens: number;
}

interface ProrrogacaoScreenProps {
  startupId: string;
  startupName: string;
  data: ProrrogacaoData;
  /** Período (dias) definido pelo Compliance para a nova captação. */
  periodDays?: number;
}

/**
 * ProrrogacaoScreen — página de prorrogação do founder (PRD_RECEBIMENTO §6.3 /
 * admin-payout-management §12.3). O founder define o valor adicional; a nova
 * meta somada (read-only) e a reserva de tokens (adicional ÷ preço do token)
 * são derivadas. Ao pagar a nova reserva, a captação é reativada pelo período
 * definido pelo Compliance.
 */
export function ProrrogacaoScreen({
  startupId,
  startupName,
  data,
  periodDays = 30,
}: ProrrogacaoScreenProps) {
  const [adicional, setAdicional] = useState<number>(0);
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calc = useMemo(() => {
    const add = Math.max(0, Number(adicional) || 0);
    const novaMeta = data.metaOriginal + add;
    const tokensReserva =
      data.tokenPrice > 0 ? Math.floor(add / data.tokenPrice) : 0;
    return { add, novaMeta, tokensReserva };
  }, [adicional, data.metaOriginal, data.tokenPrice]);

  const podepagar = calc.add > 0 && calc.tokensReserva > 0;

  async function pagarReserva() {
    if (!podepagar) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch(`/api/founder/startups/${startupId}/prorrogacao`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ additionalAmount: calc.add, periodDays }),
      });
      const body = await res.json().catch(() => null);
      const paymentId = body?.data?.paymentId;
      if (!res.ok || body?.error || !paymentId) {
        setError(body?.message ?? "Não foi possível gerar a cobrança.");
        return;
      }
      navigate(`/checkout/payment/${paymentId}`);
    } catch {
      setError("Falha de rede. Tente novamente.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <main className="min-h-screen px-1.5 pb-6 pt-3 md:px-0 md:pb-8 md:pt-4">
      <div className="relative mx-auto w-full max-w-3xl">
        <DashboardBackgroundWatermark />
        <header className="mb-6 md:mb-8">
          <Link
            to="/founder/dashboard"
            className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar ao dashboard
          </Link>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">
            Prorrogação da captação
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
            {startupName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Identificamos potencial na sua captação! Defina o valor adicional
            para prorrogar.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {/* Valor adicional */}
          <section className="rounded-3xl border border-white/10 bg-card p-4 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-foreground">Valor adicional</h2>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Meta original</span>
                <span className="font-bold text-foreground">
                  {formatBRLCompact(data.metaOriginal)}
                </span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Preço do token</span>
                <span className="font-bold text-foreground">
                  {formatBRLCompact(data.tokenPrice)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="adicional"
                className="text-xs font-semibold text-muted-foreground"
              >
                Adicional a captar (R$)
              </label>
              <input
                id="adicional"
                type="number"
                min={0}
                step={1000}
                value={adicional || ""}
                onChange={(e) => setAdicional(Number(e.target.value))}
                placeholder="Ex.: 200000"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              />
            </div>
          </section>

          {/* Nova meta + reserva (read-only, derivados) */}
          <section className="rounded-3xl border border-primary/20 bg-primary/5 p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-bold text-foreground">
                Nova meta (automática)
              </h2>
            </div>
            <p className="text-2xl font-black text-primary">
              {formatBRLCompact(calc.novaMeta)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatBRLCompact(data.metaOriginal)} +{" "}
              {formatBRLCompact(calc.add)} (read-only)
            </p>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Reserva de tokens (só sobre o adicional)
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {calc.tokensReserva.toLocaleString("pt-BR")} tokens
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatBRLCompact(calc.add)} ÷{" "}
                {formatBRLCompact(data.tokenPrice)}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Novo período (definido pelo Compliance)
              </p>
              <p className="mt-1 text-sm font-bold text-foreground">
                {periodDays} dias
              </p>
            </div>

            <button
              type="button"
              disabled={!podepagar || paying}
              onClick={pagarReserva}
              title={
                podepagar
                  ? undefined
                  : "Informe um valor adicional válido para prosseguir"
              }
              className="w-full rounded-full bg-primary py-3 text-[11px] font-bold uppercase tracking-widest text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {paying ? "Gerando cobrança…" : `Pagar reserva — ${formatBRLCompact(calc.add)}`}
            </button>
            {error && (
              <p role="alert" className="text-center text-[10px] text-destructive">
                {error}
              </p>
            )}
            <p className="text-center text-[10px] text-muted-foreground">
              Após o pagamento, a captação é reativada automaticamente pelo
              período definido pelo Compliance.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
