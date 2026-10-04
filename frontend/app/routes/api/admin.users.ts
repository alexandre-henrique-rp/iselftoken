import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para GET /admin/users.
 * Suporta query params (role, status, search, page, limit, kycStatus).
 */
export async function loader({
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/admin/users${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    credentials: "include",
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
