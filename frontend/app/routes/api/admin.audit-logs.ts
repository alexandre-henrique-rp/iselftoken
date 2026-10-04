import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para GET /admin/audit-logs?entity=X&entityId=Y.
 * Retorna últimos AuditLogs de uma entidade para timeline de decisões.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(
    `${BACKEND_URL}/admin/audit-logs${qs ? `?${qs}` : ""}`,
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
  return Response.json(data ?? { error: true, data: [] }, { status: res.status });
}
