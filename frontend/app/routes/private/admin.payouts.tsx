import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { useLoaderData } from "react-router";
import { PayoutsScreen } from "~/components/admin/payout/payouts-screen";
import { createQueryClient } from "~/lib/query-client";
import { adminPayoutsQueryOptions } from "~/lib/queries";
import { serverFetch } from "~/lib/server-fetch";
import type { Route } from "./+types/admin.payouts";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Gestão de Repasse | Admin | iSelfToken" },
    {
      name: "description",
      content:
        "Decisões de captação finalizada e solicitações de parcela consolidadas.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const queryClient = createQueryClient();
  const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
  const res = await serverFetch(request, `/api/admin/payouts?page=${page}`);
  if (res.ok) {
    const body = await res.json().catch(() => null);
    const data = body?.data ?? body;
    if (data) {
      queryClient.setQueryData(adminPayoutsQueryOptions(page).queryKey, data);
    }
  }
  return { dehydratedState: dehydrate(queryClient) };
}

export default function AdminPayoutsPage() {
  const { dehydratedState } = useLoaderData<typeof loader>();
  return (
    <HydrationBoundary state={dehydratedState}>
      <PayoutsScreen />
    </HydrationBoundary>
  );
}
