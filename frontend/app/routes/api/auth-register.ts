import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `POST /auth/register/user` no backend NestJS.
 *
 * FIX BUG: `useRegisterMutation.ts` chama `/api/auth/register` mas esse BFF
 * nao existia em routes.ts. Backend expoe `/auth/register/user` (mais
 * especifico). Este BFF faz o proxy e propaga Set-Cookie (sessao httpOnly).
 */
export async function action({
  request,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Metodo nao permitido", codigo: 405 },
      { status: 405 },
    );
  }

  const body = await request.json();

  if (!body.urlRedirect) {
    body.urlRedirect = body.urlRedirect || "http://localhost:5173";
  }
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/auth/register/user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return Response.json(data, { status: res.status });
  }

  // Propaga Set-Cookie (session_id httpOnly do backend)
  const headers = new Headers();
  const setCookies = res.headers.getSetCookie();
  for (const cookie of setCookies) {
    headers.append("set-cookie", cookie);
  }

  return Response.json(data, { headers });
}

export async function loader(): Promise<Response> {
  return Response.json(
    { error: true, message: "Use POST", codigo: 405 },
    { status: 405 },
  );
}
