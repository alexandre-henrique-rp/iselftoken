import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";
import type { StartupDetail } from "~/lib/startup-loader";
import { mapCampaignStatus, mapPlatformStatus } from "~/lib/startup-status";

/**
 * BFF: GET /api/startups/:id
 *
 * Busca startup no backend (GET /startup/:id) e mapeia para o shape
 * StartupDetail esperado pela página de edição.
 */
export async function loader({
  params,
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const { id } = params;

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";

  const res = await fetch(`${BACKEND_URL}/startup/${id}`, {
    headers: { Cookie: cookieHeader },
  });

  if (!res.ok) {
    if (res.status === 401) {
      return new Response("Não autenticado", { status: 401 });
    }
    if (res.status === 404) {
      return new Response("Startup não encontrada", { status: 404 });
    }
    return new Response("Erro ao buscar startup", { status: res.status });
  }

  const json = await res.json();
  const startup = json.data || json;

  // Mapear campos do backend para StartupDetail
  const campaigns = startup.campaigns || [];
  const activeCampaign = campaigns[0] || null;

  const detail: StartupDetail = {
    id: String(startup.id),
    slug: String(startup.slug || ""),
    name: startup.nome || startup.name || "",
    platformStatus: mapPlatformStatus(startup.status),
    campaignStatus: mapCampaignStatus(
      activeCampaign?.status ?? startup.campaignStatus,
    ),
    tokenPrice: activeCampaign?.tokenPrice
      ? Number(activeCampaign.tokenPrice)
      : null,
    campaignId: activeCampaign?.id || null,
    tokenReservationPaid: activeCampaign?.reservationFeePaid ?? false,
    roundTerms: activeCampaign
      ? {
          metaCaptacao: Number(activeCampaign.targetAmount) || 0,
          equityOferecido: activeCampaign.equityOferecido || 0,
          prazoCaptacao: 90,
        }
      : null,
    useOfFunds: null,
    schedule: activeCampaign?.deadline
      ? {
          dataAbertura: null,
          dataEncerramento: activeCampaign.deadline?.split("T")[0] || null,
          dataLiquidacao: null,
        }
      : null,
    // Campos extras para uso nos componentes de edição
    ...(startup as any),
  };

  return Response.json(detail);
}
