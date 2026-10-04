import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: GET /api/admin/marketplace/pinned
 *
 * Lista 0..3 startups pinadas manualmente (S4-T02).
 * Auth: ADMIN, COMPLIANCE ou FINANCEIRO via AuthGuard backend.
 */

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const cookieHeader = request.headers.get("cookie") ?? "";

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/admin/marketplace/pinned`, {
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
    return new Response("Erro ao buscar pinos", { status: res.status });
  }

  const json = await res.json().catch(() => null);
  return Response.json(json);
}