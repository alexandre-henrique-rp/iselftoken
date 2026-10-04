import { Link, useRevalidator } from "react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Route } from "./+types/investor-transparencia";
import { BACKEND_URL } from "~/lib/api-config";
import {
  EditorialWalletShell,
} from "~/components/wallet/editorial-wallet-shell";
import { cn } from "~/lib/utils";
import { InitialsImage } from "~/components/ui/initials-image";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface InvestedStartup {
  startupId: number;
  nome: string;
  logo: string | null;
  segmento: string | null;
  campaignStatus: string;
  aportes: number;
  totalInvestido: number;
  totalTokens: number;
  currentValue: number | null;
}

interface LoaderData {
  startups: InvestedStartup[];
  totalStartups: number;
  totalInvestido: number;
  currentValueTotal: number;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData> {
  const cookie = request.headers.get("cookie") || "";

  const res = await fetch(`${BACKEND_URL}/investments/my-startups`, {
    headers: { accept: "application/json", cookie },
  });

  if (!res.ok) {
    return { startups: [], totalStartups: 0, totalInvestido: 0, currentValueTotal: 0 };
  }

  const result = await res.json().catch(() => ({}));
  return result.data || { startups: [], totalStartups: 0, totalInvestido: 0, currentValueTotal: 0 };
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Transparência | iSelfToken" },
    { name: "description", content: "Acompanhe a transparência das startups nas quais você investiu." },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Aberta", color: "text-green-400 bg-green-400/10" },
  FUNDED: { label: "Financiada", color: "text-blue-400 bg-blue-400/10" },
  CLOSED: { label: "Encerrada", color: "text-muted-foreground bg-white/5" },
  DRAFT: { label: "Rascunho", color: "text-yellow-400 bg-yellow-400/10" },
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function InvestorTransparencia({ loaderData }: Route.ComponentProps) {
  const { startups } = loaderData;
  const revalidator = useRevalidator();
  const isRevalidating = revalidator.state === "loading";
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const wasLoading = useRef(false);

  // Detecta a transicao `loading -> idle` para disparar feedback (toast + timestamp).
  // `useRevalidator` re-executa apenas o loader da rota atual — sem reload da
  // pagina inteira. O loader re-faz fetch em `${BACKEND_URL}/investments/my-startups`
  // e o componente re-renderiza com os dados frescos.
  useEffect(() => {
    if (isRevalidating) {
      wasLoading.current = true;
      return;
    }
    if (wasLoading.current) {
      wasLoading.current = false;
      const now = new Date();
      setLastUpdated(now);
      toast.success("Lista de startups atualizada", {
        description: `Dados refrescados às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`,
      });
    }
  }, [isRevalidating]);

  // Header actions: timestamp da ultima atualizacao + botao de refresh.
  // Padrao espelhado de /wallet (decisao 2026-09-06) com feedback explicito.
  const headerActions = (
    <div className="flex items-center gap-3">
      {lastUpdated && !isRevalidating && (
        <span className="hidden md:inline text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
          Atualizado{" "}
          {lastUpdated.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      )}
      <button
        type="button"
        onClick={() => revalidator.revalidate()}
        disabled={isRevalidating}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-on-surface-variant text-[10px] font-black uppercase tracking-widest transition-all",
          isRevalidating
            ? "opacity-50 cursor-wait"
            : "hover:border-primary/40 hover:text-primary",
        )}
        aria-label="Atualizar lista de startups"
      >
        <RefreshCw
          className={cn(
            "w-3.5 h-3.5",
            isRevalidating && "animate-spin",
          )}
        />
        {isRevalidating ? "Atualizando..." : "Atualizar"}
      </button>
    </div>
  );

  return (
    <EditorialWalletShell
      eyebrow="Transparência"
      title="Minhas Startups"
      description="Lista das startups nas quais você possui tokens. Acompanhe relatórios mensais e participe das discussões."
      watermark="TRANSPARÊNCIA"
      headerActions={headerActions}
    >
      {/* Lista de Startups (2-cols em xl+) — sem KPI (decisao 2026-09-06) */}
      {startups.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8 md:mb-10">
          {startups.map((startup) => (
            <StartupCard key={startup.startupId} startup={startup} />
          ))}
        </div>
      )}
    </EditorialWalletShell>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StartupCard({ startup }: { startup: InvestedStartup }) {
  const status = STATUS_LABELS[startup.campaignStatus] || STATUS_LABELS.CLOSED;
  const roi =
    startup.currentValue && startup.totalInvestido > 0
      ? (((startup.currentValue - startup.totalInvestido) / startup.totalInvestido) * 100).toFixed(1)
      : null;

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 flex flex-col gap-4 hover:border-primary/20 transition-colors">
      {/* Header do card */}
      <div className="flex items-start gap-4">
        <InitialsImage
          name={startup.nome}
          src={startup.logo}
          alt={startup.nome}
          className="h-12 w-12 rounded-lg border border-white/10"
          fallbackClassName="bg-primary/10"
          fallbackTextClassName="text-sm font-bold"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">
            {startup.nome}
          </h3>
          {startup.segmento && (
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
              {startup.segmento}
            </p>
          )}
          <span
            className={`inline-block mt-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${status.color}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Métricas do investimento */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            Investido
          </p>
          <p className="text-xs font-bold text-foreground">
            {formatCurrency(startup.totalInvestido)}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            Tokens
          </p>
          <p className="text-xs font-bold text-foreground">
            {startup.totalTokens}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            Valor Atual
          </p>
          <p className="text-xs font-bold text-foreground">
            {startup.currentValue != null
              ? formatCurrency(startup.currentValue)
              : "—"}
          </p>
        </div>
      </div>

      {/* ROI badge */}
      {roi && (
        <div className="text-center">
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              Number(roi) >= 0
                ? "text-green-400 bg-green-400/10"
                : "text-red-400 bg-red-400/10"
            }`}
          >
            {Number(roi) >= 0 ? "+" : ""}
            {roi}% ROI
          </span>
        </div>
      )}

      {/* CTA — abre pagina da startup com relatorios mensais + discussions */}
      <Link
        to={`/founder/startups/${startup.startupId}/transparencia`}
        className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider hover:bg-primary/20 transition-colors"
      >
        <Eye className="w-3.5 h-3.5" />
        Ver Relatorios
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 space-y-4">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
        <Eye className="w-8 h-8 text-muted-foreground/40" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-foreground">
          Nenhuma startup encontrada
        </h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          Você ainda não investiu em nenhuma startup. Ao adquirir tokens, as startups aparecerão aqui com acesso à transparência.
        </p>
      </div>
      <Link
        to="/home"
        className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider hover:underline"
      >
        Explorar startups
      </Link>
    </div>
  );
}
