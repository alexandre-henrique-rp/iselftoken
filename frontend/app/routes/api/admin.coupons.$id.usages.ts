/**
 * BFF: GET /api/admin/coupons/:id/usages — Histórico de uso do cupom.
 */

import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({
  params,
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const url = new URL(request.url);
  const rawPage = Number(url.searchParams.get("page") || "1");
  const rawLimit = Number(url.searchParams.get("limit") || "20");
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(100, Math.max(1, rawLimit))
    : 20;
  const offset = (page - 1) * limit;
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(
    `${BACKEND_URL}/admin/coupons/${params.id}/usages?limit=${limit}&offset=${offset}`,
    { headers: cookieHeader ? { cookie: cookieHeader } : {} },
  );
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
