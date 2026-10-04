import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para `GET /startup/:id/prorrogacao` (dados) e
 * `POST /startup/:id/prorrogacao` (cria a cobrança da reserva adicional).
 */
export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<Response> {
  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "id obrigatório" },
      { status: 400 },
    );
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const res = await fetch(
    `${BACKEND_URL}/startup/${encodeURIComponent(id)}/prorrogacao`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    },
  );
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}

export async function action({
  request,
  params,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }
  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "id obrigatório" },
      { status: 400 },
    );
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const body = await request.json().catch(() => null);
  const res = await fetch(
    `${BACKEND_URL}/startup/${encodeURIComponent(id)}/prorrogacao`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      body: JSON.stringify(body ?? {}),
    },
  );
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
