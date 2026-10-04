import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";
import { cn } from "~/lib/utils";
import { InitialsImage } from "~/components/ui/initials-image";
import type { Route } from "./+types/compliance-campaigns";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CampaignItem {
  id: number;
  title: string;
  status: string;
  targetAmount: number;
  tokenPrice: number;
  totalTokens: number;
  tokensSold: number;
  deadline: string;
  createdAt: string;
  closedAt: string | null;
  startup: {
    id: number;
    nome: string;
    slug: string;
    logo: string | null;
    status: string;
  };
}

interface LoaderData {
  campaigns: CampaignItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({
  request,
}: Route.LoaderArgs): Promise<LoaderData> {
  const cookie = request.headers.get("cookie") || "";
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "ALL";
  const page = url.searchParams.get("page") || "1";
  const search = url.searchParams.get("search") || "";

  try {
    const qs = new URLSearchParams({ status, page, limit: "20" });
    if (search) qs.set("search", search);

    const res = await fetch(`${BACKEND_URL}/admin/compliance/campaigns?${qs}`, {
      headers: { accept: "application/json", cookie },
    });

    if (!res.ok) {
      return { campaigns: [], total: 0, page: 1, limit: 20, hasMore: false };
    }

    const json = await res.json();
    const d = json?.data ?? {};
    return {
      campaigns: d.data ?? [],
      total: d.total ?? 0,
      page: d.page ?? 1,
      limit: d.limit ?? 20,
      hasMore: d.hasMore ?? false,
    };
  } catch {
    return { campaigns: [], total: 0, page: 1, limit: 20, hasMore: false };
  }
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Campanhas | Compliance | iSelfToken" },
    {
      name: "description",
      content: "Revisar e aprovar campanhas de captação.",
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_UI: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: "Rascunho",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  OPEN: {
    label: "Aberta",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  PAUSED: {
    label: "Pausada",
    className: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  },
  CLOSED: {
    label: "Encerrada",
    className: "bg-muted text-muted-foreground border-white/10",
  },
  FUNDED: {
    label: "Financiada",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  PAID_OUT: {
    label: "Paga",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
};

const FILTERS = [
  { value: "ALL", label: "Todas" },
  { value: "DRAFT", label: "Rascunho" },
  { value: "OPEN", label: "Abertas" },
  { value: "CLOSED", label: "Encerradas" },
  { value: "FUNDED", label: "Financiadas" },
];

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ComplianceCampaignsPage({
  loaderData,
}: Route.ComponentProps) {
  const { campaigns, total, page, hasMore } = loaderData;
  const [sp, setSp] = useSearchParams();
  const currentStatus = sp.get("status") || "ALL";
  const currentSearch = sp.get("search") || "";

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(sp);
    next.set(key, value);
    if (key === "status") next.delete("page");
    setSp(next);
  };

  return (
    <div className="relative max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <header>
        <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">
          Compliance
        </span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-none">
          Campanhas
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          {total} campanha{total !== 1 ? "s" : ""} encontrada
          {total !== 1 ? "s" : ""}
        </p>
      </header>

      {/* Filtros + Busca */}
      <div className="flex flex-wrap items-center gap-3">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter("status", f.value)}
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors",
              currentStatus === f.value
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-white/[0.02] text-muted-foreground border-white/5 hover:border-white/20",
            )}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar startup..."
            defaultValue={currentSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter") setFilter("search", e.currentTarget.value);
            }}
            className="pl-9 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30 w-56"
          />
        </div>
      </div>

      {/* Lista */}
      {campaigns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-bold">Nenhuma campanha encontrada.</p>
          <p className="text-sm mt-1">
            Ajuste os filtros ou aguarde novas submissões.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <CampaignRow key={c.id} campaign={c} />
          ))}
        </div>
      )}

      {/* Paginação */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            disabled={page <= 1}
            onClick={() => setFilter("page", String(page - 1))}
            className="p-2 rounded-lg border border-white/10 disabled:opacity-30 hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground">Página {page}</span>
          <button
            disabled={!hasMore}
            onClick={() => setFilter("page", String(page + 1))}
            className="p-2 rounded-lg border border-white/10 disabled:opacity-30 hover:bg-white/5"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function CampaignRow({ campaign }: { campaign: CampaignItem }) {
  const status = STATUS_UI[campaign.status] ?? STATUS_UI.DRAFT;
  const progress =
    campaign.totalTokens > 0
      ? Math.round((campaign.tokensSold / campaign.totalTokens) * 100)
      : 0;

  return (
    <Link
      to={`/compliance/campaigns/${campaign.id}`}
      className="flex items-center gap-5 rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:border-primary/20 transition-colors group"
    >
      <InitialsImage
        name={campaign.startup.nome}
        src={campaign.startup.logo}
        alt={campaign.startup.nome}
        className="h-12 w-12 shrink-0 rounded-xl border border-white/10"
        fallbackClassName="bg-primary/10"
        fallbackTextClassName="text-sm font-black text-primary"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-foreground truncate">
            {campaign.startup.nome}
          </h3>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
              status.className,
            )}
          >
            {status.label}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {campaign.title} · Criada em{" "}
          {new Date(campaign.createdAt).toLocaleDateString("pt-BR")}
        </p>
      </div>

      {/* Métricas */}
      <div className="hidden md:flex items-center gap-6 text-center shrink-0">
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            Meta
          </p>
          <p className="text-xs font-bold text-foreground">
            {formatBRL(campaign.targetAmount)}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            Tokens
          </p>
          <p className="text-xs font-bold text-foreground">
            {campaign.tokensSold}/{campaign.totalTokens}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            Progresso
          </p>
          <p className="text-xs font-bold text-primary">{progress}%</p>
        </div>
      </div>

      {/* CTA */}
      <span className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        Revisar →
      </span>
    </Link>
  );
}
