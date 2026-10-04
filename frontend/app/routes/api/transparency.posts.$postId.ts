/**
 * BFF: GET/PATCH/DELETE /api/transparency/posts/:postId
 *   -> backend /transparency/posts/:postId
 *
 * Documentacao: scripts/PRD_PAGINA_TRANSPARENCIA.md §5.3
 */
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({ request, params }: { request: Request; params: { postId: string } }) {
  const cookieHeader = request.headers.get("cookie");
  const res = await fetch(`${BACKEND_URL}/transparency/posts/${params.postId}`, {
    headers: {
      accept: "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}

export async function action({ request, params }: { request: Request; params: { postId: string } }) {
  const cookieHeader = request.headers.get("cookie");
  const contentType = request.headers.get("content-type") || "application/json";
  const method = request.method.toUpperCase();

  // DELETE: corpo vazio
  let body: BodyInit | undefined;
  if (method !== "DELETE") {
    body = JSON.stringify(await request.json().catch(() => ({})));
  }

  const res = await fetch(`${BACKEND_URL}/transparency/posts/${params.postId}`, {
    method,
    headers: {
      "Content-Type": contentType,
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body,
  });

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
