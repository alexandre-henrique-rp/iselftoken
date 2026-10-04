import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para /plans/:id (admin).
 * GET    — retorna plano (admin pode ver inativos)
 * PATCH  — atualiza plano
 * DELETE — desativa plano (soft delete)
 * GET /stats — proxied separately via :id/stats
 */

function makeHeaders(request: Request, extra: Record<string, string> = {}) {
  const cookieHeader = request.headers.get("cookie");
  return {
    accept: "application/json",
    "content-type": "application/json",
    ...(cookieHeader && { cookie: cookieHeader }),
    ...extra,
  };
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<Response> {
  const { id } = params;
  if (!id) return Response.json({ error: true }, { status: 400 });
  const res = await fetch(`${BACKEND_URL}/plans/${id}`, {
    method: "GET",
    headers: makeHeaders(request),
    credentials: "include",
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}

export async function action({ request, params }: ActionFunctionArgs): Promise<Response> {
  const { id } = params;
  if (!id) return Response.json({ error: true }, { status: 400 });

  if (request.method === "PATCH") {
    const body = await request.json().catch(() => null);
    const res = await fetch(`${BACKEND_URL}/plans/${id}`, {
      method: "PATCH",
      headers: makeHeaders(request),
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return Response.json(data ?? { error: true }, { status: res.status });
  }

  if (request.method === "DELETE") {
    const res = await fetch(`${BACKEND_URL}/plans/${id}`, {
      method: "DELETE",
      headers: makeHeaders(request),
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    return Response.json(data ?? { error: true }, { status: res.status });
  }

  return Response.json(
    { error: true, message: "Método não permitido" },
    { status: 405 },
  );
}
