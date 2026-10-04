/**
 * BFF: GET/POST /api/transparency/startups/:startupId/posts
 *   -> backend /transparency/startups/:startupId/posts
 *
 * Documentacao: scripts/PRD_PAGINA_TRANSPARENCIA.md §5.3
 */
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({ request, params }: { request: Request; params: { startupId: string } }) {
  const cookieHeader = request.headers.get("cookie");
  const url = new URL(request.url);
  const qs = url.search; // preserva query string (filtros + paginacao)

  const res = await fetch(`${BACKEND_URL}/transparency/startups/${params.startupId}/posts${qs}`, {
    headers: {
      accept: "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}

export async function action({ request, params }: { request: Request; params: { startupId: string } }) {
  const cookieHeader = request.headers.get("cookie");
  const contentType = request.headers.get("content-type");
  const body = await request.json().catch(() => ({}));

  const res = await fetch(`${BACKEND_URL}/transparency/startups/${params.startupId}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
      ...(contentType && { "Content-Type": contentType }),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
