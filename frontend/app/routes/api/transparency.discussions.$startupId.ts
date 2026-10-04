/**
 * BFF: GET/POST /api/transparency/discussions/:startupId
 *   -> backend /transparency/startups/:startupId/discussions
 *
 * GET: query `q`, `category`, `sort` (recent|oldest|top), `page`, `limit`
 * POST: cria thread; body { title, content, category, isAnonymous }
 *
 * Documentacao: scripts/PRD_PAGINA_TRANSPARENCIA.md (TRANSP-03/04)
 */
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { startupId: string };
}) {
  const cookieHeader = request.headers.get("cookie");
  const url = new URL(request.url);
  const qs = url.search;

  const res = await fetch(
    `${BACKEND_URL}/transparency/startups/${params.startupId}/discussions${qs}`,
    {
      headers: {
        accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    },
  );

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { startupId: string };
}) {
  if (request.method.toUpperCase() !== "POST") {
    return Response.json({ message: "Method not allowed" }, { status: 405 });
  }
  const cookieHeader = request.headers.get("cookie");
  const body = await request.json().catch(() => ({}));

  const res = await fetch(
    `${BACKEND_URL}/transparency/startups/${params.startupId}/discussions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      body: JSON.stringify(body),
    },
  );

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}