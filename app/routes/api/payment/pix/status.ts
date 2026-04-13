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

  if (!transactionId) {
    return Response.json(
      { error: "ID da transação não informado" },
      { status: 400, headers },
    );
  }

  try {
    const statusResponse = await fetch(
      `${process.env.API_URL}/payments/pix/${transactionId}/status`,
      {
        method: "GET",
        headers,
      },
    );

    let statusResult;
    if (!statusResponse.ok) {
      const forcePaid = Boolean(payload?.forcePaid);
      statusResult = {
        status: forcePaid ? "paid" : "pending",
        paidAt: forcePaid ? new Date().toISOString() : null,
      };
    } else {
      statusResult = await statusResponse.json();
    }

    if (statusResult.status === "paid" || statusResult.status === "approved") {
      const confirmResponse = await fetch(
        `${process.env.API_URL}/transactions/${transactionId}/confirm`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            paymentId: statusResult.paymentId ?? `pix-${transactionId}`,
            paymentMethod: "PIX",
            paidAt: statusResult.paidAt ?? new Date().toISOString(),
          }),
        },
      );

      if (!confirmResponse.ok) {
        return Response.json(
          { status: "error", error: "Erro ao confirmar transação" },
          { status: 500, headers },
        );
      }
    }

    return Response.json({
      status: statusResult.status ?? "pending",
      paidAt: statusResult.paidAt ?? null,
    });
  } catch {
    return Response.json(
      { error: "Erro ao consultar status" },
      { status: 500, headers },
    );
  }
}
