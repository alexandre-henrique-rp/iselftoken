import type { ActionFunctionArgs } from "react-router";
import { createSessionHeaders } from "~/lib/session-headers";

export async function action({
  request,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Método não permitido" },
      { status: 405, headers: { "Content-Type": "application/json" } },
    );
  }

  const headers = createSessionHeaders(request);
  const payload = await request.json();
  const transactionId = payload?.transactionId;
  const cardData = payload?.cardData;

  if (!transactionId || !cardData) {
    return Response.json(
      { error: "Dados incompletos" },
      { status: 400, headers },
    );
  }

  try {
    const paymentResponse = await fetch(
      `${process.env.API_URL}/payments/card`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          transactionId,
          cardNumber: cardData.cardNumber,
          cardholderName: cardData.cardholderName,
          expiryDate: cardData.expiryDate,
          cvv: cardData.cvv,
          installments: cardData.installments,
          amount: payload?.amount,
        }),
      },
    );

    const paymentResult = await paymentResponse.json();

    if (!paymentResponse.ok || paymentResult?.error) {
      await fetch(
        `${process.env.API_URL}/transactions/${transactionId}/cancel`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            reason: paymentResult?.message ?? "Pagamento rejeitado",
          }),
        },
      );

      return Response.json(
        {
          status: "rejected",
          transactionId,
          error: paymentResult?.message ?? "Pagamento não aprovado",
        },
        { status: 400, headers },
      );
    }

    const confirmResponse = await fetch(
      `${process.env.API_URL}/transactions/${transactionId}/confirm`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          paymentId: paymentResult.paymentId ?? paymentResult.id,
          paymentMethod: "CREDIT_CARD",
          paidAt: new Date().toISOString(),
        }),
      },
    );

    if (!confirmResponse.ok) {
      await fetch(
        `${process.env.API_URL}/transactions/${transactionId}/cancel`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            reason: "Erro ao confirmar transação",
          }),
        },
      );

      return Response.json(
        { error: "Erro ao confirmar transação" },
        { status: 500, headers },
      );
    }

    return Response.json({
      status: "approved",
      transactionId,
      paymentId: paymentResult.paymentId ?? paymentResult.id,
    });
  } catch {
    try {
      await fetch(
        `${process.env.API_URL}/transactions/${transactionId}/cancel`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            reason: "Erro no processamento",
          }),
        },
      );
    } catch {
      // Ignora erro ao cancelar
    }

    return Response.json(
      { error: "Erro no processamento do pagamento" },
      { status: 500, headers },
    );
  }
}
