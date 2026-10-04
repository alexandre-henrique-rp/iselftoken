import type { ActionFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: PUT /api/founder/campaigns/:campaignId/resources
 *
 * Proxy para `PUT /campaigns/:id/resources` no backend
 * (CampaignResourceService.replaceAll — substitui TODAS as alocações em uma
 * única transação atômica). Auth + ownership validados no service.
 *
 * Necessário porque o `PATCH /campaigns/:id/draft` (campos escalares) **não
 * processa** o array `resourceAllocations` — esse path é separado por design
 * no backend para manter a atomicidade da troca de alocações.
 *
 * Body: `{ resourceAllocations: [{ categoria, percentual, descricaoCustomizada? }, ...] }`
 * Soma dos percentuais deve ser exatamente 100.
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

  if (request.method !== "PUT") {
    return Response.json(
      { error: true, message: `Método ${request.method} não suportado` },
      { status: 405 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const body = await request.text();

  try {
    const res = await fetch(
      `${BACKEND_URL}/campaigns/${campaignId}/resources`,
      {
        method: "PUT",
        headers: {
          "Content-Type":
            request.headers.get("content-type") ?? "application/json",
          ...(cookieHeader && { cookie: cookieHeader }),
        },
        body,
      },
    );

    const data = await res.json().catch(() => ({
      error: true,
      message: "Resposta inválida do backend.",
    }));
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json(
      { error: true, message: "Serviço de alocações indisponível." },
      { status: 502 },
    );
  }
}
