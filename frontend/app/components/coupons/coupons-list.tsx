/** Lista administrativa de cupons com busca, filtros, paginação e estados de tela. */

import { Clock3, Pencil, Power, RefreshCw, Search, Ticket } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Pagination } from "~/components/ui/pagination";
import { useCouponPermissions } from "~/hooks/use-coupon-permissions";
import { useCoupons } from "~/hooks/use-coupons";
import { useToggleCouponStatus } from "~/hooks/use-toggle-coupon-status";
import {
  formatExpiryDate,
  getCouponStatus,
  type Coupon,
  type CouponFilters,
} from "~/lib/api/coupons";

interface CouponsListProps {
  onEditCoupon?: (coupon: Coupon) => void;
  onViewHistory?: (coupon: Coupon) => void;
  onCreateCoupon?: () => void;
  pageSize?: number;
}

type StatusFilter = NonNullable<CouponFilters["status"]>;
type PercentFilter = NonNullable<CouponFilters["percent"]>;
const PAGE_SIZE = 20;

export function CouponsList({
  onEditCoupon,
  onViewHistory,
  onCreateCoupon,
  pageSize = PAGE_SIZE,
}: CouponsListProps) {
  const { canManage } = useCouponPermissions();
  const [filters, setFilters] = useState<{
    status: StatusFilter;
    percent: PercentFilter;
    search: string;
    page: number;
  }>({ status: "all", percent: "all", search: "", page: 1 });
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) =>
        current.search === searchInput
          ? current
          : { ...current, search: searchInput, page: 1 },
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const queryFilters: CouponFilters = {
    status: filters.status,
    percent: filters.percent,
    search: filters.search || undefined,
    page: filters.page,
    limit: pageSize,
  };
  const { data, isLoading, isFetching, isError, refetch } =
    useCoupons(queryFilters);
  const toggleStatus = useToggleCouponStatus();
  const coupons = Array.isArray(data?.data) ? data.data : [];

  const updateFilter = <K extends keyof typeof filters>(
    key: K,
    value: (typeof filters)[K],
  ) => {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };

  return (
    <div
      className="flex min-w-0 flex-col gap-4"
      role="region"
      aria-label="Lista de cupons"
    >
      <div className="rounded-2xl bg-accent/20 p-4 shadow-lg">
        <div className="flex flex-col gap-3">
          <label htmlFor="coupon-search" className="sr-only">
            Buscar cupom por código
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="coupon-search"
              type="search"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value.toUpperCase())
              }
              placeholder="Buscar cupom por código"
              className="w-full rounded-xl bg-black py-3 pl-10 pr-4 text-sm text-foreground outline outline-1 outline-white/10 placeholder:text-muted-foreground/60 focus:outline-2 focus:outline-primary"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Filtrar por percentual"
            >
              {(["all", 20, 30, 50, 60, 100] as PercentFilter[]).map(
                (percent) => (
                  <button
                    key={percent}
                    type="button"
                    aria-pressed={filters.percent === percent}
                    onClick={() => updateFilter("percent", percent)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filters.percent === percent ? "bg-primary text-black" : "bg-white/5 text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
                  >
                    {percent === "all" ? "Todos" : `${percent}%`}
                  </button>
                ),
              )}
            </div>
            <div>
              <label htmlFor="coupon-status" className="sr-only">
                Filtrar por status
              </label>
              <select
                id="coupon-status"
                value={filters.status}
                onChange={(event) =>
                  updateFilter("status", event.target.value as StatusFilter)
                }
                className="rounded-xl bg-black px-3 py-2 text-xs font-medium text-foreground outline outline-1 outline-white/10 focus:outline-2 focus:outline-primary"
              >
                <option value="all">Todos os status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
                <option value="exhausted">Esgotados</option>
                <option value="expired">Expirados</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <CouponListSkeleton />
      ) : isError ? (
        <StateCard
          icon={<RefreshCw className="h-6 w-6" aria-hidden="true" />}
          title="Não foi possível carregar os cupons"
          description="Verifique a conexão com o serviço e tente novamente."
          action={
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black"
            >
              Tentar novamente
            </button>
          }
        />
      ) : coupons.length === 0 ? (
        <StateCard
          icon={<Ticket className="h-7 w-7" aria-hidden="true" />}
          title={
            filters.search ||
            filters.status !== "all" ||
            filters.percent !== "all"
              ? "Nenhum cupom corresponde aos filtros"
              : "Nenhum cupom criado ainda"
          }
          description={
            canManage
              ? "Crie o primeiro cupom para iniciar uma campanha."
              : "Ainda não há cupons disponíveis para consulta."
          }
          action={
            canManage && onCreateCoupon ? (
              <button
                type="button"
                onClick={onCreateCoupon}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black"
              >
                Criar primeiro cupom
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul
            className={`flex flex-col gap-3 transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}
            role="list"
            aria-busy={isFetching}
          >
            {coupons.map((coupon) => {
              const status = getCouponStatus(coupon);
              const isBusy =
                toggleStatus.isPending &&
                toggleStatus.variables?.id === coupon.id;
              return (
                <li
                  key={coupon.id}
                  className="flex min-w-0 flex-col gap-4 rounded-2xl bg-accent/20 p-4 shadow-lg transition hover:bg-accent/30 md:flex-row md:items-center md:p-5"
                >
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-black/60 text-2xl font-bold text-primary"
                    aria-label={`${coupon.percent}% de desconto`}
                  >
                    {coupon.percent}%
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code
                        className={`truncate font-mono text-sm font-semibold tracking-wider text-primary ${status === "EXPIRED" ? "line-through opacity-70" : ""}`}
                      >
                        {coupon.code}
                      </code>
                      <StatusPill status={status} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {coupon.maxUses
                          ? `${coupon.usedCount}/${coupon.maxUses} confirmados`
                          : `${coupon.usedCount} confirmados`}
                      </span>
                      {Boolean(coupon.reservedCount) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{coupon.reservedCount} reserva(s)</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{formatExpiryDate(coupon.validUntil)}</span>
                    </div>
                    {coupon.description && (
                      <p className="mt-2 truncate text-xs text-muted-foreground">
                        {coupon.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => onViewHistory?.(coupon)}
                      className="rounded-xl p-2 text-muted-foreground outline outline-1 outline-white/10 transition hover:bg-primary/10 hover:text-primary focus:outline-2 focus:outline-primary"
                      aria-label={`Ver auditoria do cupom ${coupon.code}`}
                      title="Ver auditoria"
                    >
                      <Clock3 className="h-4 w-4" aria-hidden="true" />
                    </button>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            toggleStatus.mutate({
                              id: coupon.id,
                              active: !coupon.active,
                            })
                          }
                          disabled={isBusy}
                          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground outline outline-1 outline-white/10 transition hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`${coupon.active ? "Desativar" : "Ativar"} cupom ${coupon.code}`}
                        >
                          <Power className="h-3.5 w-3.5" aria-hidden="true" />
                          {isBusy
                            ? "Salvando"
                            : coupon.active
                              ? "Desativar"
                              : "Ativar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditCoupon?.(coupon)}
                          className="rounded-xl p-2 text-muted-foreground outline outline-1 outline-white/10 transition hover:bg-primary/10 hover:text-primary focus:outline-2 focus:outline-primary"
                          aria-label={`Editar cupom ${coupon.code}`}
                          title="Editar cupom"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination
            page={filters.page}
            totalPages={data?.totalPages ?? 1}
            total={data?.total ?? 0}
            limit={pageSize}
            onPageChange={(page) =>
              setFilters((current) => ({ ...current, page }))
            }
            itemLabel="cupons"
          />
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Coupon["status"] }) {
  const labels: Record<Coupon["status"], string> = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    EXPIRED: "Expirado",
    EXHAUSTED: "Esgotado",
  };
  const classes: Record<Coupon["status"], string> = {
    ACTIVE: "bg-primary/10 text-primary",
    INACTIVE: "bg-white/10 text-muted-foreground",
    EXPIRED: "bg-destructive/10 text-destructive",
    EXHAUSTED: "bg-amber-400/10 text-amber-300",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function CouponListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label="Carregando cupons">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-28 animate-pulse rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}

function StateCard({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-accent/20 px-6 py-14 text-center shadow-lg">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
