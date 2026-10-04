import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para /plans/admin/all (lista admin) + POST /plans (cria plano).
 *
 * GET    — lista TODOS os planos (incluindo inativos) com contagem de assinantes
 * POST   — cria plano (AuthGuard + AdminValidateService no backend)
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
    `${BACKEND_URL}/plans/admin/all${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
      headers: makeHeaders(request),
      credentials: "include",
    },
  );
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { data: [], total: 0 }, { status: res.status });
}

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }
  const body = await request.json().catch(() => null);
  const res = await fetch(`${BACKEND_URL}/plans`, {
    method: "POST",
    headers: makeHeaders(request),
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
