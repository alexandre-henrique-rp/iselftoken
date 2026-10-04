import { BACKEND_URL } from "~/lib/api-config";

/**
 * POST /api/founder/startups/:id/repasse/request
 * Proxy BFF para solicitar ou re-submeter parcela de repasse.
 * Body: { installmentId, allocationPercents, observacao?, isResubmit? }
 */
export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const cookieHeader = request.headers.get("cookie");
  const body = await request.json().catch(() => null);

  if (!body || !body.installmentId) {
    return Response.json({ error: true, message: "installmentId obrigatório" }, { status: 400 });
  }

  const isResubmit = body.isResubmit === true;
  const endpoint = isResubmit ? "resubmit" : "request";

  const res = await fetch(
    `${BACKEND_URL}/api/founder/startups/${params.id}/repasse/installments/${body.installmentId}/${endpoint}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      body: JSON.stringify({
        allocationPercents: body.allocationPercents,
        observacao: body.observacao || undefined,
      }),
    },
  );

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.ok ? 200 : res.status });
}
