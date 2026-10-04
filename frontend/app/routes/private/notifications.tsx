import type { Route } from "./+types/notifications";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Notifications } from "~/components/notifications";
import { createQueryClient } from "~/lib/query-client";
import { serverFetch } from "~/lib/server-fetch";
import {
  notificationsPageQueryOptions,
  notificationsUnreadCountQueryOptions,
  type NotificationFilter,
  type NotificationsPage,
} from "~/lib/queries";

const VALID_FILTERS: NotificationFilter[] = [
  "all",
  "investments",
  "security",
  "subscriptions",
  "repasses",
  "general",
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Notificações | iSelfToken" },
    {
      name: "description",
      content:
        "Fique por dentro das novidades, segurança e rendimentos da sua conta iSelfToken.",
    },
  ];
}

/**
 * Loader com hidratação SSR (Zero Client Waterfall):
 * busca a 1ª página + contagem de não lidas no servidor, popula o
 * queryClient e desidrata para o cliente ler do cache sem refetch.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const queryClient = createQueryClient();
  const url = new URL(request.url);

  const rawFilter = url.searchParams.get("filter") as NotificationFilter | null;
  const filter: NotificationFilter =
    rawFilter && VALID_FILTERS.includes(rawFilter) ? rawFilter : "all";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

  // Mapeia filtro UI → lista de types (CSV). Alinhado com o BFF
  // `notificationsPageQueryOptions` em `~/lib/queries.ts`.
  const FILTER_TO_TYPES: Record<NotificationFilter, string[] | null> = {
    all: null,
    investments: ["investment_confirmed", "token_purchased"],
    security: [
      "security",
      "kyc_approved",
      "kyc_resubmission_requested",
      "user_approved",
      "user_suspended",
    ],
    subscriptions: ["plan_purchased", "plan_added"],
    repasses: [
      "repasse_request",
      "repasse_approved",
      "repasse_rejected",
      "repasse_paid",
    ],
    general: ["general", "compliance_request"],
  };
  const types = FILTER_TO_TYPES[filter];
  const qs = new URLSearchParams({ page: String(page), limit: "20" });
  if (types && types.length > 0) {
    qs.set("types", types.join(","));
  }

  const [pageRes, unreadRes] = await Promise.all([
    serverFetch(request, `/api/notifications?${qs.toString()}`),
    serverFetch(request, `/api/notifications/unread-count`),
  ]);

  if (pageRes.status === 401 || unreadRes.status === 401) {
    throw new Response("Não autorizado", { status: 401 });
  }

  const pageJson = pageRes.ok ? await pageRes.json().catch(() => null) : null;
  const unreadJson = unreadRes.ok
    ? await unreadRes.json().catch(() => null)
    : null;

  const pageData: NotificationsPage = {
    items: pageJson?.data?.data ?? [],
    totalPages: pageJson?.data?.pagination?.totalPages ?? 1,
  };
  const unreadCount: number = unreadJson?.data?.unreadCount ?? 0;

  queryClient.setQueryData(
    notificationsPageQueryOptions(page, filter).queryKey,
    pageData,
  );
  queryClient.setQueryData(
    notificationsUnreadCountQueryOptions.queryKey,
    unreadCount,
  );

  return {
    dehydratedState: dehydrate(queryClient),
    initialFilter: filter,
    initialPage: page,
  };
}

export default function NotificationsPage({
  loaderData,
}: Route.ComponentProps) {
  const { dehydratedState, initialFilter, initialPage } = loaderData;

  return (
    <div className="relative mx-auto w-full max-w-[96rem] px-2 sm:px-4 lg:px-0">
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-[0.02] pointer-events-none select-none -z-10 whitespace-nowrap"
        aria-hidden="true"
      >
        <h2 className="text-[15vw] font-black tracking-tighter uppercase">
          iSelfToken
        </h2>
      </div>
      <HydrationBoundary state={dehydratedState}>
        <Notifications
          initialFilter={initialFilter}
          initialPage={initialPage}
        />
      </HydrationBoundary>
    </div>
  );
}
