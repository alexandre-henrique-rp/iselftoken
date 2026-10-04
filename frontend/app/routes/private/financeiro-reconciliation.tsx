import type { Route } from "./+types/financeiro-reconciliation";
import { useState } from "react";
import { Form, useLoaderData, useNavigation } from "react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ScrollText,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Fechamento de Caixa | iSelfToken" },
    {
      name: "description",
      content: "Reconciliação Payments × Extrato C6.",
    },
  ];
}

interface MissingPayment {
  id: number;
  txid: string | null;
  amount: number;
  paidAt: string | null;
  purpose: string;
  method: string;
  user: { id: number; nome: string; email: string };
}

interface MissingEntry {
  localReference: string | null;
  reference: string | null;
  amount: number;
  entryDate: string;
  title: string;
  description: string;
  transactionType: string;
}

interface ReconciliationData {
  from: string;
  to: string;
  totalExpected: number;
  totalReceived: number;
  difference: number;
  counts: {
    payments: number;
    entries: number;
    matched: number;
    missingInBank: number;
    missingInDb: number;
  };
  missingInBank: MissingPayment[];
  missingInDb: MissingEntry[];
}

interface LoaderData {
  data: ReconciliationData | null;
  from: string;
  to: string;
  error: string | null;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);
}

export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData> {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? daysAgoISO(7);
  const to = url.searchParams.get("to") ?? todayISO();
  const cookie = request.headers.get("cookie") ?? "";

  const res = await fetch(
    `${url.protocol}//${url.host}/api/admin/financeiro/reconciliation?from=${from}&to=${to}`,
    { headers: { Cookie: cookie } },
  );

  const body = await res.json().catch(() => null);
  if (!res.ok || body?.error) {
    return {
      data: null,
      from,
      to,
      error: body?.message ?? `Erro ${res.status} ao reconciliar.`,
    };
  }

  return {
    data: (body?.data ?? null) as ReconciliationData | null,
    from,
    to,
    error: null,
  };
}

export default function FinanceiroReconciliationPage() {
  const { data, from, to, error } = useLoaderData<LoaderData>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);

  const difference = data?.difference ?? 0;
  const differenceColor =
    Math.abs(difference) < 0.01
      ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/5"
      : difference < 0
        ? "text-red-400 border-red-500/40 bg-red-500/5"
        : "text-amber-400 border-amber-500/40 bg-amber-500/5";
  const DifferenceIcon =
    Math.abs(difference) < 0.01 ? CheckCircle2 : difference < 0 ? TrendingDown : TrendingUp;

  return (
    <div className="relative max-w-[1600px] mx-auto space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-baseline gap-6">
        <div>
          <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">
            Financeiro
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-none">
            Fechamento de Caixa
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Comparação entre Payments PAID e o extrato consolidado do C6.
            Intervalo máx 30 dias (limite do endpoint /v1/statement/).
          </p>
        </div>
      </header>

      <Form method="get" className="flex flex-wrap gap-3 items-end p-4 rounded-xl bg-accent/20 border border-border/20">
        <div className="space-y-1">
          <label htmlFor="from" className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            De
          </label>
          <input
            id="from"
            name="from"
            type="date"
            value={localFrom}
            onChange={(e) => setLocalFrom(e.target.value)}
            className="bg-accent border-0 rounded-lg px-3 py-2 text-sm text-foreground"
            required
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="to" className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Até
          </label>
          <input
            id="to"
            name="to"
            type="date"
            value={localTo}
            onChange={(e) => setLocalTo(e.target.value)}
            className="bg-accent border-0 rounded-lg px-3 py-2 text-sm text-foreground"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-black font-bold text-sm hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScrollText className="w-4 h-4" />}
          Reconciliar período
        </button>
      </Form>

      {error ? (
        <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-10 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-destructive" />
          <p className="font-bold">{error}</p>
        </div>
      ) : !data ? (
        <div className="text-center py-20 rounded-xl bg-accent/10 border border-border/20">
          <p className="text-muted-foreground text-sm">Sem dados pra mostrar.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              label="Esperado (Payments PAID)"
              value={formatBRL(data.totalExpected)}
              subtitle={`${data.counts.payments} pagamento${data.counts.payments === 1 ? "" : "s"}`}
            />
            <SummaryCard
              label="Recebido (entradas C6)"
              value={formatBRL(data.totalReceived)}
              subtitle={`${data.counts.entries} entrada${data.counts.entries === 1 ? "" : "s"} INCOMING`}
            />
            <div className={`rounded-2xl border-2 p-6 ${differenceColor}`}>
              <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-70">
                Diferença
              </span>
              <div className="mt-2 flex items-center gap-3">
                <DifferenceIcon className="w-6 h-6" />
                <span className="text-3xl font-black tracking-tight">{formatBRL(data.difference)}</span>
              </div>
              <div className="text-xs mt-2 opacity-80">
                {data.counts.matched} match{data.counts.matched === 1 ? "" : "es"} · {data.counts.missingInBank} sem entrada · {data.counts.missingInDb} sem payment
              </div>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-black tracking-tight">
              Payments sem entrada no extrato ({data.missingInBank.length})
            </h2>
            {data.missingInBank.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-sm text-emerald-400">
                Todos os Payments PAID têm entrada correspondente no extrato. ✓
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/20">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-accent/40 text-left">
                      <th className="p-3 font-bold text-muted-foreground uppercase text-xs tracking-wider">ID</th>
                      <th className="p-3 font-bold text-muted-foreground uppercase text-xs tracking-wider">Pago em</th>
                      <th className="p-3 font-bold text-muted-foreground uppercase text-xs tracking-wider">Usuário</th>
                      <th className="p-3 font-bold text-muted-foreground uppercase text-xs tracking-wider">Propósito</th>
                      <th className="p-3 font-bold text-muted-foreground uppercase text-xs tracking-wider">Método</th>
                      <th className="p-3 font-bold text-muted-foreground uppercase text-xs tracking-wider">txid</th>
                      <th className="p-3 font-bold text-muted-foreground uppercase text-xs tracking-wider text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.missingInBank.map((p) => (
                      <tr key={p.id} className="border-t border-border/10 hover:bg-accent/20">
                        <td className="p-3 font-mono text-xs">#{p.id}</td>
                        <td className="p-3 text-xs">{p.paidAt ? new Date(p.paidAt).toLocaleString("pt-BR") : "—"}</td>
                        <td className="p-3">
                          <div className="font-bold">{p.user.nome}</div>
                          <div className="text-xs text-muted-foreground">{p.user.email}</div>
                        </td>
                        <td className="p-3 text-xs">{p.purpose}</td>
                        <td className="p-3 text-xs">{p.method}</td>
                        <td className="p-3 font-mono text-xs">{p.txid ?? "—"}</td>
                        <td className="p-3 text-right font-bold">{formatBRL(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black tracking-tight">
              Entradas no extrato sem Payment ({data.missingInDb.length})
            </h2>
            {data.missingInDb.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-sm text-emerald-400">
                Toda entrada INCOMING tem Payment correspondente. ✓
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/20">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-accent/40 text-left">
                      <th className="p-3 font-bold text-muted-foreground uppercase text-xs tracking-wider">Data</th>
                      <th className="p-3 font-bold text-muted-foreground uppercase text-xs tracking-wider">Tipo</th>
                      <th className="p-3 font-bold text-muted-foreground uppercase text-xs tracking-wider">Título</th>
                      <th className="p-3 font-bold text-muted-foreground uppercase text-xs tracking-wider">Descrição</th>
                      <th className="p-3 font-bold text-muted-foreground uppercase text-xs tracking-wider">Local Ref</th>
                      <th className="p-3 font-bold text-muted-foreground uppercase text-xs tracking-wider text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.missingInDb.map((e, i) => (
                      <tr key={i} className="border-t border-border/10 hover:bg-accent/20">
                        <td className="p-3 text-xs">{e.entryDate}</td>
                        <td className="p-3 text-xs">{e.transactionType}</td>
                        <td className="p-3 font-bold">{e.title}</td>
                        <td className="p-3 text-xs">{e.description}</td>
                        <td className="p-3 font-mono text-xs">{e.localReference ?? e.reference ?? "—"}</td>
                        <td className="p-3 text-right font-bold">{formatBRL(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  subtitle: string;
}

function SummaryCard({ label, value, subtitle }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border-2 border-border/30 bg-accent/20 p-6">
      <span className="text-[10px] font-black tracking-[0.3em] uppercase text-muted-foreground">
        {label}
      </span>
      <div className="mt-2 text-3xl font-black tracking-tight">{value}</div>
      <div className="text-xs mt-2 text-muted-foreground">{subtitle}</div>
    </div>
  );
}
