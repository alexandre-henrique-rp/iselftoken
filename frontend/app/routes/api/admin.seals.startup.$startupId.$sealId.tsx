import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/** BFF para remover um selo atribuído a uma startup. */
export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== "DELETE") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }

  const { startupId, sealId } = params;
  if (!startupId || !sealId) {
    return Response.json(
      { error: true, message: "Startup e selo são obrigatórios" },
      { status: 400 },
    );
  }

  const cookie = request.headers.get("cookie");
  const response = await fetch(
    `${BACKEND_URL}/admin/seals/startup/${encodeURIComponent(startupId)}/${encodeURIComponent(sealId)}`,
    {
      method: "DELETE",
      headers: {
        accept: "application/json",
        ...(cookie ? { cookie } : {}),
      },
      credentials: "include",
    },
  );
  const payload = await response.json().catch(() => null);
  return Response.json(payload ?? { error: true }, { status: response.status });
}
