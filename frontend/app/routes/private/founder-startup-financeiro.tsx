import { redirect, type LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";
import type { RepasseDashboardData } from "~/types/repasse";

/**
 * Pagina LEGACY `/founder/startups/:id/financeiro` — virou um smart redirect.
 *
 * O dominio correto do repasse e a CAMPANHA (1 Repasse por Campaign, campaignId UNIQUE).
 * Para preservar URLs antigas (bookmarks, historico de QA, links em e-mails) sem
 * perder a semantica, redirecionamos para a campanha da startup que tem repasse
 * (FUNDED + repasse configurado). Se houver mais de uma, fica na primeira (mais
 * recente). Se nao houver nenhuma com repasse configurado, redireciona para o
 * dashboard do fundador com toast explicativo via query string.
 *
 * O frontend do fundador hoje aponta os links Financeiro a partir dos cards das
 * startups; mantenha-os nesta URL se preferir — o redirect cuida do resto. Para
 * semantica maxima, prefira o link direto `/founder/campaigns/:campaignId/financeiro`.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const startupId = params.id;
  const cookieHeader = request.headers.get("cookie") || "";

  // Pede o dashboard legacy (mais recente da startup). Se nao houver repasse
  // configurado, faz fallback para o dashboard.
  const res = await fetch(
    `${BACKEND_URL}/api/founder/startups/${startupId}/repasse/dashboard`,
    {
      headers: { accept: "application/json", cookie: cookieHeader },
    },
  );

  if (res.ok) {
    const json = (await res.json().catch(() => null)) as
      | RepasseDashboardData
      | { data: RepasseDashboardData }
      | null;
    const data: RepasseDashboardData | null = json
      ? "repasse" in json
        ? json
        : (json as { data: RepasseDashboardData }).data ?? null
      : null;

    if (data?.repasse?.campaignId) {
      // Redireciona server-side (302) para a URL nova com a campanha certa.
      return redirect(`/founder/campaigns/${data.repasse.campaignId}/financeiro`);
    }
  }

  // Sem repasse configurado: manda para o dashboard com flag explicativa.
  return redirect(`/founder/dashboard?from=startup-financeiro&startupId=${startupId}`);
}

export default function LegacyRedirectShell() {
  // Nunca renderiza — loader sempre redireciona.
  return null;
}
