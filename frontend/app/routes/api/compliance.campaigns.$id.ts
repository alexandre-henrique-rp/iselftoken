import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: GET /api/compliance/campaigns/:id — Detalhe administrativo.
 *
 * A rota protegida permite que Compliance/Admin revise campanhas ocultas sem
 * expor esses status no endpoint público de campanhas.
 */
export async function loader({
  params,
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "ID obrigatório" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const res = await fetch(`${BACKEND_URL}/admin/compliance/campaigns/${id}`, {
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
