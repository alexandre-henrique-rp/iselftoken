import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `GET /admin/config/fundraising` no backend NestJS.
 *
 * Retorna configurações administrativas de fundraising.
 * Backend valida AuthGuard + AdminGuard.
 */
export async function loader({
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/admin/config/fundraising`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
