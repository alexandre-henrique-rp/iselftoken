import {
  StartupOpportunityNotFound,
  StartupOpportunityView,
} from "~/components/startup-detail/startup-opportunity-view";
import { requireAuthorizedUser } from "~/lib/auth-policy";
import { serverFetch } from "~/lib/server-fetch";
import type { StartupPrivateOpportunity } from "~/types/startup-opportunity-detail";
import type { Route } from "./+types/startup.$slug.preview";

export async function loader({ params, request }: Route.LoaderArgs) {
  // Auth gate: rota exclusiva para fundadores logados. Redireciona para /login
  // (ou /2fa se sessão válida mas 2FA pendente). Não passa pelo layout — esta
  // rota NÃO renderiza sidebar/topnav.
  await requireAuthorizedUser(request);

  const slug = params.slug;
  if (!slug) return { startup: null as StartupPrivateOpportunity | null };

  const response = await serverFetch(
    request,
    `/api/startups/slug/${encodeURIComponent(slug)}?view=owner`,
    { headers: { accept: "application/json" } },
  );
  if (!response.ok)
    return { startup: null as StartupPrivateOpportunity | null };

  const startup = (await response
    .json()
    .catch(() => null)) as StartupPrivateOpportunity | null;
  return { startup };
}

export function meta({ data }: Route.MetaArgs) {
  return [
    {
      title: data?.startup
        ? `Preview — ${data.startup.name} | iSelfToken`
        : "Preview de startup | iSelfToken",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export default function StartupPreviewPage({
  loaderData,
}: Route.ComponentProps) {
  return loaderData.startup ? (
    <StartupOpportunityView
      mode="private"
      startup={loaderData.startup}
      preview
    />
  ) : (
    <StartupOpportunityNotFound authenticated />
  );
}
