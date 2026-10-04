import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF para incremento de score de marketplace (ação "Coroar").
 *
 * Proxy PATCH → `BACKEND_URL/admin/startups/:id/score/increment`.
 * O backend valida o gate da Fase 3 (defesa em profundidade) e grava em
 * AuditLog (STARTUP_SCORE_INCREMENTED).
 *
 * @see backendnode/src/api/admin/admin.service.ts (incrementStartupScore)
 * @see CASE.md §Curadoria Premium
 */
export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== "PATCH") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }

  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "ID da startup obrigatório" },
      { status: 400 },
    );
  }

  const cookie = request.headers.get("cookie");
  const body = await request.json().catch(() => null);
  const response = await fetch(
    `${BACKEND_URL}/admin/startups/${encodeURIComponent(id)}/score/increment`,
    {
      method: "PATCH",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      credentials: "include",
      body: JSON.stringify(body),
    },
  );

  const payload = await response.json().catch(() => null);
  return Response.json(payload ?? { error: true }, { status: response.status });
}
