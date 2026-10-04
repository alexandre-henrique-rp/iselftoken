import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: compliance delibera o numero de parcelas de um Repasse.
 * POST /api/compliance/campaigns/:id/repasse/deliberate
 * Body: { numeroParcelas: number, observacao?: string }
 *
 * Backend: RepassesController @Controller('api') com
 * @Post('compliance/campaigns/:campaignId/repasse/deliberate')
 */
export async function action({ request, params }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Metodo nao permitido" },
      { status: 405 },
    );
  }

  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "ID da campanha nao fornecido" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const body = await request.json().catch(() => null);

  const res = await fetch(
    `${BACKEND_URL}/api/compliance/campaigns/${id}/repasse/deliberate`,
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
