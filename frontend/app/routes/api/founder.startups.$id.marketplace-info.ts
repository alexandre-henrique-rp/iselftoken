import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: GET /api/founder/startups/:id/marketplace-info
 *
 * Proxy para o endpoint privado do backend
 *   GET /startups/:id/marketplace-info
 * que retorna score + breakdown + pin info (S2-T05).
 *
 * Repassa cookie de sessao HTTP-only. Cache 60s (staleTime TanStack Query).
 */

export async function loader({
  params,
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const { id } = params;

  if (!id || !/^\d+$/.test(id)) {
    return new Response("id invalido", { status: 400 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/startups/${id}/marketplace-info`, {
      headers: { Cookie: cookieHeader },
    });
  } catch {
    return new Response("Backend indisponivel", { status: 502 });
  }

  if (!res.ok) {
    if (res.status === 401) {
      return new Response("Nao autenticado", { status: 401 });
    }
    if (res.status === 403) {
      return new Response("Acesso negado", { status: 403 });
    }
    if (res.status === 404) {
      return new Response("Startup nao encontrada", { status: 404 });
    }
    return new Response("Erro ao buscar marketplace-info", {
      status: res.status,
    });
  }

  const json = await res.json().catch(() => null);
  return Response.json(json);
}