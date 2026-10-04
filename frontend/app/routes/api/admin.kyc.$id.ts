import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para GET /admin/kyc/:userId no backend NestJS.
 * O identificador é o User.id numérico usado pelos links administrativos.
 */
export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<Response> {
  const id = params.id;
  if (!id || !/^\d+$/.test(id) || Number(id) < 1) {
    return Response.json({ error: "userId inválido" }, { status: 400 });
  }

  const cookieHeader = request.headers.get("cookie");
  const response = await fetch(
    `${BACKEND_URL}/admin/kyc/${encodeURIComponent(id)}`,
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
