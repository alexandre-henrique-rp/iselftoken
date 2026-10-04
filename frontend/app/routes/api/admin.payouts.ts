import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para `GET /admin/payouts` (S4). Lista consolidada das duas
 * categorias: captações finalizadas aguardando decisão + solicitações de
 * parcela pendentes. Backend valida role via AuthGuard + AdminGuard.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const page = new URL(request.url).searchParams.get("page");
  const query = page ? `?page=${encodeURIComponent(page)}` : "";
  const res = await fetch(`${BACKEND_URL}/admin/payouts${query}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
