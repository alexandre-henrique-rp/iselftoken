import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: financeiro marca uma parcela PROCESSING como paga (PIX confirmado).
 * POST /api/financeiro/installments/:installmentId/mark-paid
 * Body: { txidC6: string, endToEndId: string }
 */
export async function action({ request, params }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Metodo nao permitido" },
      { status: 405 },
    );
  }

  const { installmentId } = params;
  if (!installmentId) {
    return Response.json(
      { error: true, message: "ID da parcela nao fornecido" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const body = await request.json().catch(() => null);

  const res = await fetch(
    `${BACKEND_URL}/api/financeiro/installments/${installmentId}/mark-paid`,
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
