import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para /founder/document-requests.
 * GET — lista pendentes das minhas startups
 * POST /:id/fulfill — atende vinculando um StartupDocument
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
  const cookieHeader = request.headers.get("cookie");
  const res = await fetch(`${BACKEND_URL}/founder/document-requests`, {
    method: "GET",
    headers: makeHeaders(request),
    credentials: "include",
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { data: [] }, { status: res.status });
}

export async function action({ request, params }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }
  const { id } = params;
  if (!id) {
    return Response.json({ error: true, message: "ID obrigatório" }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  const res = await fetch(
    `${BACKEND_URL}/founder/document-requests/${id}/fulfill`,
    {
      method: "POST",
      headers: makeHeaders(request),
      credentials: "include",
      body: JSON.stringify(body),
    },
  );
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
