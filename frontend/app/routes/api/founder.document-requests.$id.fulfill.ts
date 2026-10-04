import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para /founder/document-requests/:id/fulfill.
 * Founder atende solicitação vinculando um StartupDocument.
 */
export async function action({ request, params }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }
  const { id } = params;
  if (!id) {
    return Response.json({ error: true, message: "ID obrigatório" }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  const cookieHeader = request.headers.get("cookie");
  const res = await fetch(
    `${BACKEND_URL}/founder/document-requests/${id}/fulfill`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      credentials: "include",
      body: JSON.stringify(body),
    },
  );
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
