import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para GET /startup/:id/documents.
 * Lista StartupDocument (categoria/nome/mimetype/size) de uma startup.
 * Endpoint original em startup-extras.controller.ts (já existe no backend).
 */
export async function loader({ request, params }: LoaderFunctionArgs): Promise<Response> {
  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "ID da startup obrigatório" },
      { status: 400 },
    );
  }
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/startup/${id}/documents`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    credentials: "include",
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true, data: [] }, { status: res.status });
}
