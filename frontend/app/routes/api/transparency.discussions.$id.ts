/**
 * BFF: GET/PATCH/DELETE /api/transparency/discussions/:id
 *   -> backend /transparency/discussions/:discussionId
 *
 * GET: detalhe + replies paginadas
 * PATCH: edita thread (autor ate 24h, ou ADMIN)
 * DELETE: soft delete; body { force: boolean } obrigatorio se houver replies
 *
 * Documentacao: scripts/PRD_PAGINA_TRANSPARENCIA.md (TRANSP-03/04)
 */
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const cookieHeader = request.headers.get("cookie");
  const url = new URL(request.url);
  const qs = url.search;

  const res = await fetch(
    `${BACKEND_URL}/transparency/discussions/${params.id}${qs}`,
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
  params: { id: string };
}) {
  const cookieHeader = request.headers.get("cookie");
  const method = request.method.toUpperCase();

  if (method !== "PATCH" && method !== "DELETE") {
    return Response.json({ message: "Method not allowed" }, { status: 405 });
  }

  const body = await request.json().catch(() => ({}));

  const res = await fetch(`${BACKEND_URL}/transparency/discussions/${params.id}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}