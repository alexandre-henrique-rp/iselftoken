import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy: PATCH /api/startup/:id/rodada/:rodadaId/pausar
 * Backend endpoint: PATCH /startup/:startupId/rodada/:rodadaId/pausar
 * (startup.controller.ts @Controller('startup'))
 */
export async function action({ request, params }: { request: Request; params: { id: string; rodadaId: string } }) {
  if (request.method !== "PATCH") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const cookieHeader = request.headers.get("cookie");
  const { id, rodadaId } = params;

  const res = await fetch(`${BACKEND_URL}/startup/${id}/rodada/${rodadaId}/pausar`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json().catch(() => null);

  return Response.json(data ?? { error: true }, { status: res.status });
}
