import type { ActionFunctionArgs } from "react-router";
import { createSessionHeaders } from "~/lib/session-headers";

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Método não permitido" },
      { status: 405, headers: { "Content-Type": "application/json" } },
    );
  }

  const headers = createSessionHeaders(request);
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return Response.json(
      { error: "API_URL não configurada" },
      { status: 500, headers },
    );
  }

  const payload = await request.json();

  const response = await fetch(`${apiUrl}/startup`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.error) {
    return Response.json(
      {
        error: data?.message ?? data?.error ?? "Não foi possível criar startup",
        details: data,
      },
      { status: response.status || 502, headers },
    );
  }

  return Response.json(
    {
      success: true,
      data: data?.data ?? data,
    },
    { status: 200, headers },
  );
}
