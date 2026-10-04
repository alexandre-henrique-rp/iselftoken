import { AdminStartupHeader } from "~/components/admin/admin-startup-header";
import { AdminStartupsContent } from "~/components/admin/admin-startups-content";
import { DashboardBackgroundWatermark } from "~/components/founder/dashboard-background-watermark";
import { adminStartupAction } from "~/lib/admin-startup-action.server";
import type { Route } from "./+types/admin-startups";

export const action = adminStartupAction;

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Gestão de Startups | Admin | iSelfToken" },
    {
      name: "description",
      content:
        "Painel administrativo para moderação, aprovação e listagem de startups no ecossistema iSelfToken.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return {
    filters: {
      search: url.searchParams.get("search") || "",
      status: url.searchParams.get("status") || "",
      segmento: url.searchParams.get("segmento") || "",
    },
  };
}

export default function AdminStartupsPage({
  loaderData,
}: Route.ComponentProps) {
  return (
    <main className="min-h-screen px-1.5 pb-6 pt-3 md:px-0 md:pb-8 md:pt-4">
      <div className="relative mx-auto w-full max-w-7xl xl:max-w-[1400px]">
        <DashboardBackgroundWatermark />
        <AdminStartupHeader />
        <AdminStartupsContent
          search={loaderData.filters.search}
          status={loaderData.filters.status}
          segmento={loaderData.filters.segmento}
        />
      </div>
    </main>
  );
}
