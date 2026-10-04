import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para PATCH /admin/document-requests/:id/cancel.
 * Compliance cancela uma solicitação PENDING.
 */
export async function action({ request, params }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "PATCH") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }
  const { id } = params;
  if (!id) {
    return Response.json({ error: true, message: "ID obrigatório" }, { status: 400 });
  }
  const cookieHeader = request.headers.get("cookie");
  const res = await fetch(`${BACKEND_URL}/admin/document-requests/${id}/cancel`, {
    method: "PATCH",
    headers: {
      accept: "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    credentials: "include",
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
