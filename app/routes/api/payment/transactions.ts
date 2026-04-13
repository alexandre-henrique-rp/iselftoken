import type { ActionFunctionArgs } from "react-router";
import { createSessionHeaders } from "~/lib/session-headers";

export async function action({
  request,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Método não permitido" },
      { status: 405, headers: { "Content-Type": "application/json" } },
    );
  }

  const headers = createSessionHeaders(request);
  const payload = await request.json();

  const api = await fetch(`${process.env.API_URL}/transactions`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await api.json();

  if (!api.ok || data?.error) {
    return Response.json(data, { status: api.status, headers });
  }

  return Response.json(data, { status: api.status, headers });
}
