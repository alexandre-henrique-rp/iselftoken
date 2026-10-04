/**
 * BFF: GET /api/coupons/available — Cupons disponíveis para usuário.
 */

import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const cookieHeader = request.headers.get("cookie");
  const res = await fetch(`${BACKEND_URL}/coupons/available`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
