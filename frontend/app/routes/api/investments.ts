import { BACKEND_URL } from "~/lib/api-config";

export async function loader({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/investments`, {
    method: "GET",
    headers: {
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    return Response.json(data, { status: res.status });
  }

  return Response.json(data);
}

/**
 * POST /api/investments — cria o investimento (reserva de tokens + Payment
 * PENDING). Encaminha { campaignId, amount, affiliateCode? } ao backend com o
 * cookie de sessão. A resposta traz o payment.id para seguir ao checkout.
 */
export async function action({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie");
  const body = await request.json().catch(() => null);

  const res = await fetch(`${BACKEND_URL}/investments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body: JSON.stringify(body ?? {}),
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? {}, { status: res.ok ? 200 : res.status });
}
