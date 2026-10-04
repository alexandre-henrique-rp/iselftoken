import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para gestão de selos atribuídos a uma startup.
 *
 * POST   /admin/seals/startup/:startupId  → atribui selo (body: { sealSlug, metadata? })
 * DELETE /admin/seals/startup/:startupId/:sealId → desatribui
 * GET    /admin/seals/startup/:startupId → lista selos atribuídos (admin view)
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

export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<Response> {
  const { startupId } = params;
  if (!startupId) {
    return Response.json({ error: true, message: "startupId obrigatório" }, { status: 400 });
  }
  const res = await fetch(`${BACKEND_URL}/admin/seals/startup/${startupId}`, {
    method: "GET",
    headers: makeHeaders(request),
    credentials: "include",
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}

export async function action({
  request,
  params,
}: ActionFunctionArgs): Promise<Response> {
  const { startupId, sealId } = params;
  if (!startupId) {
    return Response.json({ error: true, message: "startupId obrigatório" }, { status: 400 });
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    const res = await fetch(`${BACKEND_URL}/admin/seals/startup/${startupId}`, {
      method: "POST",
      headers: makeHeaders(request),
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return Response.json(data ?? { error: true }, { status: res.status });
  }

  if (request.method === "DELETE") {
    if (!sealId) {
      return Response.json(
        { error: true, message: "sealId obrigatório para desatribuir" },
        { status: 400 },
      );
    }
    const res = await fetch(
      `${BACKEND_URL}/admin/seals/startup/${startupId}/${sealId}`,
      {
        method: "DELETE",
        headers: makeHeaders(request),
        credentials: "include",
      },
    );
    const data = await res.json().catch(() => null);
    return Response.json(data ?? { error: true }, { status: res.status });
  }

  return Response.json(
    { error: true, message: "Método não permitido" },
    { status: 405 },
  );
}
