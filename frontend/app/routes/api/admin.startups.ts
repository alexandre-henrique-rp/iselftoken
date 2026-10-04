import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para `GET /admin/startups` no backend NestJS.
 *
 * Usado pelo hook `useAdminStartupsQuery` para listar startups
 * (paginação + filtros: search, status, segmento).
 *
 * Backend valida role via AuthGuard + AdminGuard.
 */
export async function loader({
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const url = new URL(request.url);
  const backendParams = new URLSearchParams(url.searchParams);
  const statusMap: Record<string, string> = {
    em_analise: "PENDING",
    aprovada: "APPROVED",
    rejeitada: "REJECTED",
  };
  const status = backendParams.get("status");
  if (status && statusMap[status])
    backendParams.set("status", statusMap[status]);
  const qs = backendParams.toString();
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(
    `${BACKEND_URL}/admin/startups${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      credentials: "include",
    },
  );
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
