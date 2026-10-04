/**
 * S4-T03 — Rota /admin/marketplace
 *
 * Shell minimo: meta + loader SSR que chama BFF /api/admin/marketplace/pinned.
 * Markup em ~/components/marketplace/admin-marketplace-view.
 *
 * Auth gate: backend AuthGuard no controller (ADMIN/COMPLIANCE/FINANCEIRO).
 */

import type { Route } from "./+types/admin.marketplace";
import { AdminMarketplaceView } from "~/components/marketplace/admin-marketplace-view";
import { serverFetch } from "~/lib/server-fetch";
import type { AdminPinnedStartup } from "~/types/admin-marketplace";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Pinos do marketplace | iSelfToken" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const res = await serverFetch(request, "/api/admin/marketplace/pinned");
  if (!res.ok) {
    throw new Response("Erro ao carregar pinos", { status: res.status });
  }
  const json = (await res.json()) as { data?: AdminPinnedStartup[] };
  return { pinned: json.data ?? [] };
}

export default function AdminMarketplacePage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <AdminMarketplaceView initialPinned={loaderData.pinned} />
    </div>
  );
}