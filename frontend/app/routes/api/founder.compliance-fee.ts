import type { ActionFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: POST /api/founder/compliance-fee
 *
 * Proxy para `POST /payment/compliance-fee` no backend
 * (PaymentService.createComplianceFee). Cria (ou retorna idempotentemente)
 * um Payment PENDING COMPLIANCE_FEE para a campanha do founder.
 *
 * Chamado após salvar a aba de captação em /founder/startups/:id/captacao
 * — o frontend redireciona para /checkout/payment/:id com o ID retornado.
 *
 * Body: `{ campaignId: number }`.
 *
 * Auth + ownership garantidos no backend (founderId === userId).
 */
export async function action({
  request,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: `Método ${request.method} não suportado` },
      { status: 405 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const body = await request.text();

  try {
    const res = await fetch(`${BACKEND_URL}/payment/compliance-fee`, {
      method: "POST",
      headers: {
        "Content-Type":
          request.headers.get("content-type") ?? "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      body,
    });

    const data = await res.json().catch(() => ({
      error: true,
      message: "Resposta inválida do backend.",
    }));
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json(
      { error: true, message: "Serviço de compliance fee indisponível." },
      { status: 502 },
    );
  }
}
