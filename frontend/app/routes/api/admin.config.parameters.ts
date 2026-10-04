import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para /admin/config/parameters (Admin Config Parameters).
 *
 * GET  — lista todos os parâmetros com vigência, agendamento e histórico
 * POST — cria ou agenda uma nova versão de parâmetro (key, value, effectiveFrom, note)
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

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const res = await fetch(
    `${BACKEND_URL}/admin/config/parameters${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
      headers: makeHeaders(request),
      credentials: "include",
    },
  );
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true, data: [] }, { status: res.status });
}

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }
  const body = await request.json().catch(() => null);
  const res = await fetch(`${BACKEND_URL}/admin/config/parameters`, {
    method: "POST",
    headers: makeHeaders(request),
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
