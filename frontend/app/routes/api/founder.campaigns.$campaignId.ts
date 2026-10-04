import type { ActionFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: PATCH /api/founder/campaigns/:campaignId
 *
 * Proxy para `PATCH /campaigns/:id/draft` no backend (CampaignsStateService.
 * updateDraft). Auth + ownership garantidos pelo backend.
 *
 * Apenas campanhas em status DRAFT podem ser editadas (regra de negócio
 * CVM/Res. 88 — após publicação, edições estruturais exigem nova rodada via
 * `/action`). O backend devolve `CAMPAIGN_NOT_EDITABLE` (403) para outros
 * status — propagamos para o cliente que exibe toast.
 *
 * Body: UpdateCampaignDto (subset — apenas campos enviados são atualizados).
 */
export async function action({
  params,
  request,
}: ActionFunctionArgs): Promise<Response> {
  const { campaignId } = params;

  if (!campaignId) {
    return Response.json(
      { error: true, message: "campaignId não fornecido" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const body = await request.text();

  try {
    const res = await fetch(`${BACKEND_URL}/campaigns/${campaignId}/draft`, {
      method: "PATCH",
      headers: {
        "Content-Type":
          request.headers.get("content-type") ?? "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      body,
    });

    const data = await res.json().catch(() => ({
      error: true,
      message: "Resposta inválida do backend.",
    }));
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json(
      { error: true, message: "Serviço de campanhas indisponível." },
      { status: 502 },
    );
  }
}
