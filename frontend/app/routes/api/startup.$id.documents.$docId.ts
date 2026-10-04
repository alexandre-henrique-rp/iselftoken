import type { ActionFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `DELETE /startup/:id/documents/:docId`.
 */
export async function action({ request, params }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "DELETE") {
    return Response.json(
      { error: true, message: "Método não permitido", codigo: 405 },
      { status: 405 },
    );
  }

  const { id, docId } = params;
  if (!id || !docId) {
    return Response.json(
      { error: true, message: "IDs obrigatórios não fornecidos" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/startup/${id}/documents/${docId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
