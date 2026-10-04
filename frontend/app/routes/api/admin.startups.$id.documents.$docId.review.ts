import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para `PATCH /admin/startups/:id/documents/:docId/review`.
 * Aprova/rejeita um documento da startup (fluxo §2). AdminGuard no backend.
 */
export async function action({
  request,
  params,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "PATCH") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }
  const { id, docId } = params;
  if (!id || !docId) {
    return Response.json(
      { error: true, message: "id e docId obrigatórios" },
      { status: 400 },
    );
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const body = await request.json().catch(() => null);
  const res = await fetch(
    `${BACKEND_URL}/admin/startups/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}/review`,
    {
      method: "PATCH",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      body: JSON.stringify(body),
    },
  );
  const data = await res.json().catch(() => ({ error: true }));
  return Response.json(data, { status: res.status });
}
