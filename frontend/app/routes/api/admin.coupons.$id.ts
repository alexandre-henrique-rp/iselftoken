/**
 * BFF: GET/PATCH /api/admin/coupons/:id.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

function authHeaders(request: Request): HeadersInit {
  const cookieHeader = request.headers.get("cookie");
  return cookieHeader ? { cookie: cookieHeader } : {};
}

export async function loader({
  params,
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const id = params.id;
  const res = await fetch(`${BACKEND_URL}/admin/coupons/${id}`, {
    headers: authHeaders(request),
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}

export async function action({
  request,
  params,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "PATCH") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const res = await fetch(`${BACKEND_URL}/admin/coupons/${params.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(request),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
