import { BACKEND_URL } from "~/lib/api-config";

/**
 * GET /api/notifications/unread-count — BFF proxy para a contagem de
 * notificações não lidas do usuário autenticado.
 */
export async function loader({ request }: { request: Request }) {
  const cookie = request.headers.get("cookie") ?? "";

  const res = await fetch(`${BACKEND_URL}/notifications/unread-count`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(cookie && { cookie }),
    },
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? {}, { status: res.status });
}
