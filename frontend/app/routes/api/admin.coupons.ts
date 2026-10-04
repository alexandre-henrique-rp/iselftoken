/**
 * BFF: GET/POST /api/admin/coupons — Lista e cria cupons.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

function authHeaders(request: Request): HeadersInit {
  const cookieHeader = request.headers.get("cookie");
  return cookieHeader ? { cookie: cookieHeader } : {};
}

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  const endpoint = searchParams
    ? `${BACKEND_URL}/admin/coupons?${searchParams}`
    : `${BACKEND_URL}/admin/coupons`;

  const res = await fetch(endpoint, { headers: authHeaders(request) });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}

export async function action({
  request,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const res = await fetch(`${BACKEND_URL}/admin/coupons`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(request),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
