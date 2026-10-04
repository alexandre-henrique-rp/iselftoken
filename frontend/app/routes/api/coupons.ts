/**
 * BFF: GET /api/coupons — Lista cupons da Central de Cupons.
 *
 * O backend autoriza ADMIN, COMPLIANCE e FINANCEIRO via AdminGuard.
 */

import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const url = new URL(request.url);
  const cookieHeader = request.headers.get("cookie");
  const searchParams = url.searchParams.toString();
  const endpoint = searchParams
    ? `${BACKEND_URL}/admin/coupons?${searchParams}`
    : `${BACKEND_URL}/admin/coupons`;

  const res = await fetch(endpoint, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
