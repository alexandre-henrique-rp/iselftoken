/**
 * BFF: proxy para rotas de rascunho de startup.
 * - GET /api/startup/draft → GET /startup/draft (backend)
 * - DELETE /api/startup/draft → DELETE /startup/draft (backend)
 */
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/startup/draft`, {
    method: "GET",
    headers: {
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json().catch(() => null);
  return Response.json(data, { status: res.status });
}

export async function action({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie");

  if (request.method === "POST") {
    const body = await request.text();
    const res = await fetch(`${BACKEND_URL}/startup/draft`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      body,
    });
    const data = await res.json().catch(() => null);
    return Response.json(data, { status: res.status });
  }

  if (request.method === "DELETE") {
    const res = await fetch(`${BACKEND_URL}/startup/draft`, {
      method: "DELETE",
      headers: {
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    });
    const data = await res.json().catch(() => null);
    return Response.json(data, { status: res.status });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
