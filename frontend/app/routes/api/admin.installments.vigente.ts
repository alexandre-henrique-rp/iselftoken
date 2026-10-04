import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para `GET /admin/installments/vigente` — config de parcelamento
 * vigente (effectiveUntil = null). Guard ADMIN/FINANCEIRO no backend.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const cookieHeader = request.headers.get("cookie");
  const res = await fetch(`${BACKEND_URL}/admin/installments/vigente`, {
    method: "GET",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    credentials: "include",
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true, data: null }, {
    status: res.status,
  });
}
