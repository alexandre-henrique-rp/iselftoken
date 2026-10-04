import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para GET /admin/kyc no backend NestJS.
 * Preserva filtros/paginação e a sessão HTTP-only do administrador.
 */
export async function loader({
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const cookieHeader = request.headers.get("cookie");

  const response = await fetch(
    `${BACKEND_URL}/admin/kyc${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
    },
  );
  const data = await response.json().catch(() => null);

  return Response.json(data ?? { error: true }, { status: response.status });
}
