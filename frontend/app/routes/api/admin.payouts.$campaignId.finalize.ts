import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para `POST /admin/payouts/:campaignId/finalize`.
 * Finaliza definitivamente uma captação FUNDED, configurando o repasse
 * (nº de parcelas, intervalo) e liberando "Solicitar Parcela" ao founder.
 */
export async function action({
  request,
  params,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }
  const { campaignId } = params;
  if (!campaignId) {
    return Response.json(
      { error: true, message: "campaignId obrigatório" },
      { status: 400 },
    );
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const body = await request.json().catch(() => null);
  const res = await fetch(
    `${BACKEND_URL}/admin/payouts/${encodeURIComponent(campaignId)}/finalize`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      body: JSON.stringify(body ?? {}),
    },
  );
  const data = await res.json().catch(() => ({ error: true }));
  return Response.json(data, { status: res.status });
}
