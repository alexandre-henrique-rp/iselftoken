/**
 * BFF: proxy para POST /startup/:id/draft (salvar rascunho).
 */
import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const cookieHeader = request.headers.get("cookie");
  const body = await request.text();

  const res = await fetch(`${BACKEND_URL}/startup/${params.id}/draft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body,
  });

  const data = await res.json().catch(() => null);
  return Response.json(data, { status: res.status });
}
