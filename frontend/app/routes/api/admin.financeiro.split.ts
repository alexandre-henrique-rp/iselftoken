import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `GET /admin/financeiro/split` no backend NestJS.
 *
 * Repassa toda a querystring (from, to, status, search, page, pageSize) e o
 * cookie de sessão. Backend valida role ADMIN via AuthGuard + AdminGuard.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const cookieHeader = request.headers.get("cookie");
  const url = new URL(request.url);

  const res = await fetch(
    `${BACKEND_URL}/admin/financeiro/split${url.search}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    },
  );

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
