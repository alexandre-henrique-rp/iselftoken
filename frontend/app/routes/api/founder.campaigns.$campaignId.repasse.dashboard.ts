import { BACKEND_URL } from "~/lib/api-config";

/**
 * GET /api/founder/campaigns/:campaignId/repasse/dashboard
 * Proxy BFF para o endpoint do founder: dashboard de repasse ANCORADO NA CAMPANHA.
 *
 * Rota preferida — cada repasse e 1:1 com a Campaign (campaignId UNIQUE).
 * Substitui a antiga /founder/startups/:id/repasse/dashboard que pegava
 * "repasse mais recente" da startup, ignorando a qual campanha pertence.
 */
export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { campaignId: string };
}) {
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(
    `${BACKEND_URL}/api/founder/campaigns/${params.campaignId}/repasse/dashboard`,
    {
      headers: {
        accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    },
  );

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.ok ? 200 : res.status });
}
