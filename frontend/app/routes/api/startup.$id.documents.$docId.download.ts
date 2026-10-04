import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `GET /startup/:id/documents/:docId/download`.
 * Retorna `{ url, mimetype, nome }` com URL presigned válida por 1h.
 */
export async function loader({ request, params }: LoaderFunctionArgs): Promise<Response> {
  const { id, docId } = params;
  if (!id || !docId) {
    return Response.json(
      { error: true, message: "IDs obrigatórios não fornecidos" },
      { status: 400 },
    );
  }
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(
    `${BACKEND_URL}/startup/${id}/documents/${docId}/download`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    },
  );
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
