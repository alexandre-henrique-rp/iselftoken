/**
 * BFF: POST/DELETE /api/transparency/discussions/:id/upvote
 *   -> backend /transparency/discussions/:discussionId/upvote (toggle idempotente)
 *
 * Documentacao: scripts/PRD_PAGINA_TRANSPARENCIA.md (TRANSP-04)
 */
import { BACKEND_URL } from "~/lib/api-config";

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const cookieHeader = request.headers.get("cookie");
  const method = request.method.toUpperCase();

  if (method !== "POST" && method !== "DELETE") {
    return Response.json({ message: "Method not allowed" }, { status: 405 });
  }

  const res = await fetch(
    `${BACKEND_URL}/transparency/discussions/${params.id}/upvote`,
    {
      method,
      headers: {
        accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    },
  );

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}