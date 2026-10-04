import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

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

  const id = params.id;
  if (!id) {
    return Response.json(
      { error: true, message: "id obrigatório" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const body = await request.json().catch(() => null);
  const res = await fetch(
    `${BACKEND_URL}/admin/startups/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
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

/**
 * BFF proxy para `GET /admin/startups/:id` no backend NestJS.
 *
 * Usado pelo loader SSR de `/admin/startups/:id` para buscar os dados
 * completos de uma startup (founder, logo, campaigns, etc).
 *
 * Backend valida role via AuthGuard + AdminGuard.
 */
export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<Response> {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "id obrigatório" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const res = await fetch(
    `${BACKEND_URL}/admin/startups/${encodeURIComponent(id)}`,
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
