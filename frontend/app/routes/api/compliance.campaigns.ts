import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: GET /api/compliance/campaigns — Lista campanhas para Compliance.
 *
 * O backend administrativo preserva acesso a todos os status sem ampliar o
 * catálogo público de campanhas.
 */
export async function loader({
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(
    `${BACKEND_URL}/admin/compliance/campaigns${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      credentials: "include",
    },
  );
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
