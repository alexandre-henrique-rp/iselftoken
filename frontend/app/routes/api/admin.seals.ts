import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para GET /admin/seals.
 * Lista todos os selos (ativos + inativos) para o painel compliance.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const cookieHeader = request.headers.get("cookie");
  const res = await fetch(`${BACKEND_URL}/admin/seals`, {
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
