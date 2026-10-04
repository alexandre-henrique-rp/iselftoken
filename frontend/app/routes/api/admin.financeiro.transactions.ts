import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `GET /admin/financeiro/transactions` no backend NestJS.
 *
 * Repassa toda a querystring (page, limit, status, method, purpose,
 * dateFrom, dateTo, search) e o cookie de sessão. Backend valida role
 * (`FINANCEIRO`/`ADMIN`/`COMPLIANCE` pra leitura) via FinanceRoleGuard.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const cookieHeader = request.headers.get("cookie");
  const url = new URL(request.url);

  const res = await fetch(`${BACKEND_URL}/admin/financeiro/transactions${url.search}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
