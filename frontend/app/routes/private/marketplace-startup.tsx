import { StartupOpportunityNotFound, StartupOpportunityView } from "~/components/startup-detail/startup-opportunity-view";
import { serverFetch } from "~/lib/server-fetch";
import type { StartupPrivateOpportunity } from "~/types/startup-opportunity-detail";
import type { Route } from "./+types/marketplace-startup";

export async function loader({ params, request }: Route.LoaderArgs) {
  const slug = params.slug;
  if (!slug) throw new Response("Slug não fornecido", { status: 400 });

  const ref = new URL(request.url).searchParams.get("ref");
  if (ref) {
    await serverFetch(request, "/api/affiliate/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: ref }),
    }).catch(() => undefined);
  }

  const response = await serverFetch(
    request,
    `/api/startups/slug/${encodeURIComponent(slug)}`,
    { headers: { accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Response(
      response.status === 401
        ? "Não autorizado"
        : "Startup não encontrada ou sem rodada disponível",
      { status: response.status },
    );
  }

  const startup = (await response.json()) as StartupPrivateOpportunity;
  return { startup, affiliateCode: ref };
}

export function meta({ data }: Route.MetaArgs) {
  return [
    {
      title: data?.startup
        ? `${data.startup.name} | Marketplace | iSelfToken`
        : "Marketplace | iSelfToken",
    },
  ];
}

export function ErrorBoundary() {
  return <StartupOpportunityNotFound authenticated />;
}

export default function MarketplaceStartupPage({ loaderData }: Route.ComponentProps) {
  return (
    <StartupOpportunityView
      mode="private"
      startup={loaderData.startup}
      affiliateCode={loaderData.affiliateCode}
    />
  );
}
