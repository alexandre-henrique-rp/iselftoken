/**
 * BFF: GET /api/user/coupons/usage — Histórico pessoal de uso de cupons.
 */

import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limit = Math.max(1, Number(url.searchParams.get("limit") || "20"));
  const offset = (page - 1) * limit;
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(
    `${BACKEND_URL}/user/coupons/usage?limit=${limit}&offset=${offset}`,
    { headers: cookieHeader ? { cookie: cookieHeader } : {} },
  );
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
