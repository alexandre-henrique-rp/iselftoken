import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: fundador reenvia uma solicitacao rejeitada.
 * POST /api/founder/startups/:id/repasse/installments/:installmentId/resubmit
 */
export async function action({ request, params }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Metodo nao permitido" },
      { status: 405 },
    );
  }

  const { id, installmentId } = params;
  if (!id || !installmentId) {
    return Response.json(
      { error: true, message: "Parametros obrigatorios ausentes" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const body = await request.json().catch(() => null);

  const res = await fetch(
    `${BACKEND_URL}/api/founder/startups/${id}/repasse/installments/${installmentId}/resubmit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      credentials: "include",
      body: JSON.stringify(body ?? {}),
    },
  );

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
