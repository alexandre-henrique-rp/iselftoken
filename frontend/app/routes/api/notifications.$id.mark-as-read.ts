import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * POST /api/notifications/:id/mark-as-read — BFF proxy para marcar uma
 * notificação específica como lida.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "ID da notificação não fornecido" },
      { status: 400 },
    );
  }

  const cookie = request.headers.get("cookie") ?? "";
  const res = await fetch(`${BACKEND_URL}/notifications/${id}/mark-as-read`, {
    method: "POST",
    headers: {
      accept: "application/json",
      ...(cookie && { cookie }),
    },
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? {}, { status: res.status });
}
