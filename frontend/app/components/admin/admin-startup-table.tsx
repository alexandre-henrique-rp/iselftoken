import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Form,
  Link,
  useActionData,
  useNavigation,
  useSearchParams,
} from "react-router";
import { toast } from "sonner";
import { AdminPremiumSealDialog } from "~/components/admin/admin-premium-seal-dialog";
import { AdminStartupDialogs } from "~/components/admin/admin-startup-dialogs";
import { CrownAction } from "~/components/admin/crown-action";
import { PhaseActions } from "~/components/admin/phase-actions";
import { InitialsImage } from "~/components/ui/initials-image";
import { adminStartupSealsQueryOptions } from "~/lib/queries";
import { cn } from "~/lib/utils";

interface ApiStartup {
  id: number | string;
  nome: string;
  segmento?: string | null;
  /** Nome da Categoria (ADR-007 — relação `Category`). Prioritário na coluna
   *  "Categoria" da tabela /admin/startups. Fallback para `segmento` (que
   *  por sua vez deriva de `area_atuacao` legado) quando a startup foi
   *  cadastrada antes da taxonomia cascata. */
  categoria?: string | null;
  area_atuacao?: string | null;
  estagio?: string | null;
  status: string;
  campaigns?: Array<{ id: number; status: string }>;
  createdAt: string;
  founder?: { nome?: string; email?: string } | null;
  logo?: { url?: string | null } | string | null;
  score?: number | null;
  seals?: Array<{ id: number; slug: string; name: string }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SealCatalogItem {
  id: number;
  slug: string;
  name: string;
  category: string;
}

interface AdminStartupTableProps {
  startups: ApiStartup[];
  pagination: Pagination;
  sealCatalog?: SealCatalogItem[];
}

type ActionData = { success?: boolean; message?: string; error?: string };

function statusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "aprovada" || normalized === "approved") {
    return {
      label: "Aprovada",
      className: "bg-primary/10 text-primary border-primary/20",
    };
  }
  if (normalized === "em_analise" || normalized === "pending") {
    return {
      label: "Em análise",
      className: "bg-warning/10 text-warning border-warning/20",
    };
  }
  if (normalized === "rejeitada" || normalized === "rejected") {
    return {
      label: "Rejeitada",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    };
  }
  return {
    label: status || "—",
    className: "bg-white/5 text-muted-foreground border-white/10",
  };
}

function campaignStatusBadge(status: string) {
  const normalized = status.toUpperCase();
  const labels: Record<string, string> = {
    OPEN: "Aberta",
    DRAFT: "Rascunho",
    PAUSED: "Pausada",
    CLOSED: "Encerrada",
    FUNDED: "Meta atingida",
    PAID_OUT: "Repassada",
  };

  return {
    label: labels[normalized] ?? status,
    className:
      normalized === "OPEN"
        ? "bg-primary/10 text-primary border-primary/20"
        : normalized === "FUNDED" || normalized === "PAID_OUT"
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : "bg-white/5 text-muted-foreground border-white/10",
  };
}

function StatusLine({
  label,
  badge,
}: {
  label: string;
  badge: ReturnType<typeof statusBadge>;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em]",
          badge.className,
        )}
      >
        {badge.label}
      </span>
    </div>
  );
}

function StatusStack({
  startup,
  campaign,
}: {
  startup: ReturnType<typeof statusBadge>;
  campaign: ReturnType<typeof campaignStatusBadge> | null;
}) {
  return (
    <div className="flex min-w-[150px] flex-col gap-2">
      <StatusLine label="Startup" badge={startup} />
      {campaign && <StatusLine label="Captação" badge={campaign} />}
    </div>
  );
}

function logoUrl(logo: ApiStartup["logo"]): string | null {
  if (!logo) return null;
  return typeof logo === "string" ? logo : (logo.url ?? null);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

function isPendingReview(status: string) {
  return ["em_analise", "pending", "PENDING"].includes(status);
}

function StartupActions({
  item,
  enviando,
  onEdit,
  onSeals,
  onReject,
  onCrown,
}: {
  item: ApiStartup;
  enviando: boolean;
  onEdit: () => void;
  onSeals: () => void;
  onReject: () => void;
  onCrown: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        to={`/admin/startups/${item.id}`}
        className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        title="Ver detalhes"
        aria-label={`Ver detalhes de ${item.nome}`}
      >
        <Eye className="h-4 w-4" aria-hidden="true" />
      </Link>
      <button
        type="button"
        onClick={onEdit}
        className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        title="Editar dados"
        aria-label={`Editar ${item.nome}`}
      >
        <Edit3 className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onSeals}
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        title="Gerenciar selos"
        aria-label={`Gerenciar selos de ${item.nome}`}
      >
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        {(item.seals?.length ?? 0) > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-black">
            {item.seals!.length}
          </span>
        )}
      </button>
      <CrownAction
        startupId={item.id}
        startupName={item.nome}
        onClick={onCrown}
      />
      {isPendingReview(item.status) && (
        <>
          <Form method="post" className="inline">
            <input type="hidden" name="startupId" value={item.id} />
            <input type="hidden" name="intent" value="approve-startup" />
            <button
              type="submit"
              disabled={enviando}
              title="Aprovar startup"
              aria-label={`Aprovar ${item.nome}`}
              className="rounded-lg p-2 text-warning hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/70"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
          </Form>
          <button
            type="button"
            disabled={enviando}
            onClick={onReject}
            title="Rejeitar startup"
            aria-label={`Rejeitar ${item.nome}`}
            className="rounded-lg p-2 text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/70"
          >
            <Ban className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}

export function AdminStartupTable({
  startups,
  pagination,
  sealCatalog = [],
}: AdminStartupTableProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rejeitando, setRejeitando] = useState<{
    id: string | number;
    nome: string;
  } | null>(null);
  const [editando, setEditando] = useState<ApiStartup | null>(null);
  const [gerenciandoSelos, setGerenciandoSelos] = useState<ApiStartup | null>(
    null,
  );
  const [coroando, setCoroando] = useState<ApiStartup | null>(null);
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const enviando = navigation.state !== "idle";
  const actionData = useActionData<ActionData>();
  const ultimoResultado = useRef<unknown>(null);
  const sealsQuery = useQuery(
    adminStartupSealsQueryOptions(gerenciandoSelos?.id ?? null),
  );

  useEffect(() => {
    if (!actionData || actionData === ultimoResultado.current) return;
    ultimoResultado.current = actionData;
    if (actionData.success) {
      toast.success(actionData.message ?? "Operação concluída");
      setRejeitando(null);
      setEditando(null);
      // NÃO fechamos o modal "Coroar" automaticamente — admin pode
      // aplicar mais selos em sequência. O modal fecha só via "Fechar".
      void queryClient.invalidateQueries({ queryKey: ["admin-startups"] });
      if (gerenciandoSelos || coroando) {
        const target = gerenciandoSelos ?? coroando;
        if (target) {
          void queryClient.invalidateQueries({
            queryKey: ["admin-startup-seals", String(target.id)],
          });
          void queryClient.invalidateQueries({
            queryKey: ["admin-startup-payment-status", String(target.id)],
          });
        }
      }
    } else if (actionData.error) {
      toast.error(actionData.error);
    }
  }, [actionData, gerenciandoSelos, coroando, queryClient]);

  const primeiro =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const ultimo = Math.min(pagination.page * pagination.limit, pagination.total);
  const assignedSeals = sealsQuery.data?.data ?? gerenciandoSelos?.seals ?? [];
  const goToPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next, { replace: true });
  };
  const actionProps = (item: ApiStartup) => ({
    item,
    enviando,
    onEdit: () => setEditando(item),
    onSeals: () => setGerenciandoSelos(item),
    onReject: () => setRejeitando({ id: item.id, nome: item.nome }),
    onCrown: () => setCoroando(item),
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-card shadow-lg">
      <div className="border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Fila de startups
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Revise cadastros e mantenha a curadoria atualizada.
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {pagination.total.toLocaleString("pt-BR")} registros
          </span>
        </div>
      </div>

      <div className="divide-y divide-white/10 md:hidden">
        {startups.map((item) => {
          const badge = statusBadge(item.status);
          const campaignBadge = item.campaigns?.[0]
            ? campaignStatusBadge(item.campaigns[0].status)
            : null;
          return (
            <article key={item.id} className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <InitialsImage
                    name={item.nome}
                    src={logoUrl(item.logo)}
                    alt={item.nome}
                    className="h-11 w-11 shrink-0 rounded-xl border border-white/10"
                    fallbackClassName="bg-accent/50"
                    fallbackTextClassName="text-xs font-bold text-primary"
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {item.nome}
                    </h3>
                    <p className="mt-1 font-mono text-[10px] text-primary">
                      #{String(item.id).padStart(6, "0")}
                    </p>
                  </div>
                </div>
                <StatusStack startup={badge} campaign={campaignBadge} />
              </div>
              <dl className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Fundador
                  </dt>
                  <dd className="mt-1 truncate font-medium text-foreground">
                    {item.founder?.nome ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Categoria
                  </dt>
                  <dd className="mt-1 truncate font-medium text-foreground">
                    {item.categoria ?? item.segmento ?? item.area_atuacao ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Cadastro
                  </dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {formatDate(item.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Score
                  </dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {item.score ?? "—"}
                  </dd>
                </div>
              </dl>
              <div className="flex justify-end border-t border-white/10 pt-2">
                <PhaseActions startupId={item.id} startupName={item.nome} />
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <th scope="col" className="px-6 py-4">
                ID
              </th>
              <th scope="col" className="px-6 py-4">
                Startup
              </th>
              <th scope="col" className="px-6 py-4">
                Fundador
              </th>
              <th scope="col" className="hidden px-6 py-4 lg:table-cell">
                Categoria
              </th>
              <th scope="col" className="px-6 py-4 text-center">
                Status
              </th>
              <th scope="col" className="px-6 py-4">
                Cadastro
              </th>
              <th scope="col" className="px-6 py-4 text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {startups.map((item) => {
              const badge = statusBadge(item.status);
              const campaignBadge = item.campaigns?.[0]
                ? campaignStatusBadge(item.campaigns[0].status)
                : null;
              return (
                <tr
                  key={item.id}
                  className="group transition-colors hover:bg-white/[0.02]"
                >
                  <td className="whitespace-nowrap px-6 py-5 font-mono text-xs font-semibold text-primary">
                    #{String(item.id).padStart(6, "0")}
                  </td>
                  <td className="max-w-[240px] px-6 py-5">
                    <div className="flex items-center gap-3">
                      <InitialsImage
                        name={item.nome}
                        src={logoUrl(item.logo)}
                        alt={item.nome}
                        className="h-10 w-10 shrink-0 rounded-xl border border-white/10 transition-colors group-hover:border-primary/30"
                        fallbackClassName="bg-accent/50"
                        fallbackTextClassName="text-xs font-bold text-primary"
                      />
                      <span className="truncate text-sm font-semibold text-foreground">
                        {item.nome}
                      </span>
                    </div>
                  </td>
                  <td className="max-w-[180px] truncate px-6 py-5 text-sm text-muted-foreground">
                    {item.founder?.nome ?? "—"}
                  </td>
                  <td className="hidden px-6 py-5 lg:table-cell">
                    <span className="rounded-md border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                      {item.categoria ?? item.segmento ?? item.area_atuacao ?? "—"}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <StatusStack startup={badge} campaign={campaignBadge} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-5 text-xs text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end">
                      <PhaseActions
                        startupId={item.id}
                        startupName={item.nome}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-col gap-4 border-t border-white/10 bg-black/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Mostrando{" "}
          <span className="text-foreground">
            {primeiro}–{ultimo}
          </span>{" "}
          de{" "}
          <span className="text-foreground">
            {pagination.total.toLocaleString("pt-BR")}
          </span>{" "}
          startups
        </span>
        <nav
          className="flex items-center gap-2"
          aria-label="Paginação de startups"
        >
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => goToPage(pagination.page - 1)}
            aria-label="Página anterior"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-muted-foreground transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-bold text-black">
            {pagination.page}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            de {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => goToPage(pagination.page + 1)}
            aria-label="Próxima página"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-muted-foreground transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      </footer>

      <AdminStartupDialogs
        editando={editando}
        rejeitando={rejeitando}
        gerenciandoSelos={gerenciandoSelos}
        sealCatalog={sealCatalog}
        assignedSeals={assignedSeals}
        sealsLoading={sealsQuery.isLoading}
        enviando={enviando}
        onCloseEdit={() => setEditando(null)}
        onCloseReject={() => setRejeitando(null)}
        onCloseSeals={() => setGerenciandoSelos(null)}
      />
      <AdminPremiumSealDialog
        startup={coroando}
        onClose={() => setCoroando(null)}
      />
    </section>
  );
}
