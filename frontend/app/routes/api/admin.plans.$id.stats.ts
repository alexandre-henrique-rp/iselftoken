import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para GET /plans/:id/stats.
 * Retorna activeSubscribers + totalRevenue + mrr.
 */
export async function loader({ request, params }: LoaderFunctionArgs): Promise<Response> {
  const { id } = params;
  if (!id) return Response.json({ error: true }, { status: 400 });
  const cookieHeader = request.headers.get("cookie");
  const res = await fetch(`${BACKEND_URL}/plans/${id}/stats`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    credentials: "include",
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
