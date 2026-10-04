import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `GET /admin/dashboard` no backend NestJS.
 *
 * Retorna o resumo executivo consolidado (8 KPIs + 3 séries + 2 filas).
 * Backend valida role via AuthGuard + AdminGuard.
 */
export async function loader({
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/admin/dashboard`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
