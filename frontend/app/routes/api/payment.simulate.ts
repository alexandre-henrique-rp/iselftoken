import type { ActionFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF route: POST /api/payment/simulate
 *
 * Simula o fluxo completo de pagamento (apenas em dev):
 *
 * Se `paymentId` é fornecido no body (novo fluxo StartupDraft):
 *   - Pula a criação do Payment (já existe)
 *   - Vai direto para POST /payment/:id/dev/simulate-paid
 *
 * Se `paymentId` NÃO é fornecido (fluxo legado):
 *   1. Cria o Payment no backend (POST /payment)
 *   2. Simula a confirmação (POST /payment/:id/dev/simulate-paid)
 *
 * Retorna o Payment já com status PAID e as regras de negócio aplicadas
 * (ex: StartupDraft → Startup criada para TOKEN_RESERVATION).
 */
export async function action({
  request,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido", codigo: 405 },
      { status: 405 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const body = await request.json();

  let paymentId = body.paymentId;

  // Se não tem paymentId, cria o Payment primeiro (fluxo legado)
  if (!paymentId) {
    const totalAmount =
      body.products?.reduce(
        (sum: number, p: { amount: number }) => sum + p.amount,
        0,
      ) ?? body.amount;

    const createBody = {
      amount: totalAmount,
      method: body.method || "PIX",
      purpose:
        body.purpose ?? body.products?.[0]?.purpose ?? "TOKEN_RESERVATION",
      campaignId: body.campaignId,
    };

    const createRes = await fetch(`${BACKEND_URL}/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      body: JSON.stringify(createBody),
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      return Response.json(
        {
          error: true,
          message: createData?.message || "Erro ao criar pagamento",
          detalhe: createData,
        },
        { status: createRes.status },
      );
    }

    paymentId = createData?.data?.id ?? createData?.id;

    if (!paymentId) {
      return Response.json(
        {
          error: true,
          message: "Payment criado mas sem ID retornado",
          detalhe: createData,
        },
        { status: 500 },
      );
    }
  }

  // Simular o pagamento como PAID
  const simulateRes = await fetch(
    `${BACKEND_URL}/payment/${paymentId}/dev/simulate-paid`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    },
  );

  const simulateData = await simulateRes.json();

  if (!simulateRes.ok) {
    return Response.json(
      {
        error: true,
        message: simulateData?.message || "Erro ao simular pagamento",
        detalhe: simulateData,
      },
      { status: simulateRes.status },
    );
  }

  return Response.json({
    error: false,
    message: "Pagamento simulado com sucesso",
    data: {
      paymentId,
      status: "PAID",
      ...simulateData?.data,
    },
  });
}
