import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para `GET /admin/users/:id` no backend NestJS.
 *
 * Usado pelo loader SSR de `/admin/users/:id` para buscar os dados completos
 * de um usuário (perfil, KYC avatar, endereco, subscriptions, etc).
 *
 * Backend valida role via AuthGuard + AdminGuard.
 */
export async function loader({ request, params }: LoaderFunctionArgs): Promise<Response> {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "id obrigatório" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const res = await fetch(
    `${BACKEND_URL}/admin/users/${encodeURIComponent(id)}`,
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