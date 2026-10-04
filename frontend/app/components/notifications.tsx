import { useQuery } from "@tanstack/react-query";
import { Bell, Loader2 } from "lucide-react";
import { useSearchParams } from "react-router";
import { NotificationHeader } from "./notifications/notification-header";
import {
  NotificationCard,
  type Notification as NotificationType,
} from "./notifications/notification-card";
import {
  notificationsPageQueryOptions,
  notificationsUnreadCountQueryOptions,
  type NotificationFilter,
  type NotificationRaw,
} from "~/lib/queries";
import { useMarkAllAsReadMutation } from "~/hooks/use-mark-all-as-read-mutation";
import { useMarkAsReadMutation } from "~/hooks/use-mark-as-read-mutation";
import { useNotificationsSocket } from "~/hooks/use-notifications-socket";

const typeMap: Record<string, NotificationType["type"]> = {
  kyc_approved: "security",
  kyc_resubmission_requested: "security",
  user_approved: "security",
  user_suspended: "security",
  investment_confirmed: "investment",
  token_purchased: "investment",
  plan_purchased: "wallet",
  plan_added: "wallet",
  campaign_funded: "market",
  campaign_deadline: "market",
  campaign_closed: "market",
  startup_approved: "market",
  startup_rejected: "support",
  startup_phase_approved: "market",
  phase_approved: "market",
  compliance_request: "support",
  repasse_request: "support",
  repasse_approved: "wallet",
  repasse_rejected: "support",
  repasse_paid: "wallet",
  security: "security",
  general: "support",
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function mapNotification(n: NotificationRaw): NotificationType {
  return {
    id: n.id,
    title: n.title,
    description: n.description,
    time: timeAgo(new Date(n.createdAt)),
    isUnread: !n.isRead,
    type: typeMap[n.type] || "support",
  };
}

const VALID_FILTERS: NotificationFilter[] = [
  "all",
  "investments",
  "security",
  "subscriptions",
  "repasses",
  "general",
];

interface NotificationsProps {
  initialFilter?: NotificationFilter;
  initialPage?: number;
}

// ─── Skeleton (estado Loading estrutural, conforme Style Guide) ───────────────
function NotificationsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando notificações...</span>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-4 rounded-2xl bg-accent/20 p-4 animate-pulse sm:gap-6 sm:p-6"
        >
          <div className="size-10 shrink-0 rounded-xl bg-white/5 sm:size-12 sm:rounded-2xl" />
          <div className="flex-grow space-y-3 py-1">
            <div className="h-4 w-2/3 rounded bg-white/5 sm:w-1/3" />
            <div className="h-3 w-4/5 rounded bg-white/5 sm:w-3/4" />
            <div className="h-3 w-3/5 rounded bg-white/5 sm:w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Notifications({
  initialFilter = "all",
  initialPage = 1,
}: NotificationsProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawFilter = searchParams.get("filter") as NotificationFilter | null;
  const filter: NotificationFilter =
    rawFilter && VALID_FILTERS.includes(rawFilter) ? rawFilter : initialFilter;
  const page = Math.max(
    1,
    parseInt(searchParams.get("page") || String(initialPage), 10),
  );

  const { connected: wsConnected } = useNotificationsSocket();
  const pageQuery = useQuery(notificationsPageQueryOptions(page, filter));
  // Polling inteligente — ver top-navbar.tsx
  const unreadQuery = useQuery({
    ...notificationsUnreadCountQueryOptions,
    refetchInterval: wsConnected ? false : 60_000,
  });

  const markAsReadMutation = useMarkAsReadMutation();
  const markAllAsReadMutation = useMarkAllAsReadMutation();

  const updateParams = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) params.set(key, value);
    setSearchParams(params);
  };

  const handleFilterChange = (nextFilter: NotificationFilter) => {
    updateParams({ filter: nextFilter, page: "1" });
  };

  const notifications = pageQuery.data?.items.map(mapNotification) ?? [];
  const totalPages = pageQuery.data?.totalPages ?? 1;
  const unreadCount = unreadQuery.data ?? 0;

  return (
    <div className="space-y-8">
      <NotificationHeader
        activeFilter={filter}
        onFilterChange={handleFilterChange}
        onMarkAllAsRead={() => markAllAsReadMutation.mutate()}
        isMarkingAll={markAllAsReadMutation.isPending}
        canMarkAll={unreadCount > 0}
      />

      {unreadCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <Bell className="w-5 h-5 text-primary" />
          <p className="text-sm text-primary font-medium">
            Você tem <strong>{unreadCount}</strong> notificação(ões) não
            lida(s)
          </p>
        </div>
      )}

      {/* Estado: Loading (Skeleton estrutural) */}
      {pageQuery.isLoading ? (
        <NotificationsSkeleton />
      ) : pageQuery.isError ? (
        /* Estado: Error (com retry) */
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-red-500/5 border border-red-500/20">
          <Bell className="w-12 h-12 text-red-400/60 mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-1">
            Erro ao carregar notificações
          </h3>
          <p className="text-muted-foreground text-sm mb-5">
            Não foi possível buscar suas notificações. Tente novamente.
          </p>
          <button
            onClick={() => pageQuery.refetch()}
            disabled={pageQuery.isFetching}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-on-primary-fixed text-xs font-black uppercase tracking-widest transition-all hover:opacity-90 disabled:opacity-50"
          >
            {pageQuery.isFetching && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            Tentar novamente
          </button>
        </div>
      ) : notifications.length === 0 ? (
        /* Estado: Empty */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">
            Nenhuma notificação
          </h3>
          <p className="text-muted-foreground text-sm">
            Suas notificações aparecerão aqui quando houver atualizações.
          </p>
        </div>
      ) : (
        /* Estado: Data */
        <div className="space-y-4">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              {...notification}
              onActivate={() =>
                notification.isUnread &&
                markAsReadMutation.mutate(notification.id)
              }
            />
          ))}
        </div>
      )}

      {totalPages > 1 && !pageQuery.isLoading && !pageQuery.isError && (
        <nav
          className="flex justify-center gap-2 pt-4"
          aria-label="Paginação de notificações"
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => updateParams({ page: String(p) })}
              aria-current={p === page ? "page" : undefined}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                p === page
                  ? "bg-primary text-on-primary-fixed"
                  : "bg-accent/40 text-muted-foreground hover:bg-accent/60"
              }`}
            >
              {p}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
