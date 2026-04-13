import type { ActionFunctionArgs } from "react-router";
import { createSessionHeaders } from "~/lib/session-headers";

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Método não permitido" },
      { status: 405, headers: { "Content-Type": "application/json" } },
    );
  }

  const headers = createSessionHeaders(request);
  const payload = await request.json();
  const transactionId = payload?.transactionId;
  const reason = payload?.reason ?? "Cancelado pelo usuário";

  if (!transactionId) {
    return Response.json(
      { error: "ID da transação não informado" },
      { status: 400, headers },
    );
  }

  try {
    const cancelResponse = await fetch(
      `${process.env.API_URL}/transactions/${transactionId}/cancel`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ reason }),
      },
    );

    const result = await cancelResponse.json();

    if (!cancelResponse.ok) {
      return Response.json(
        { error: result?.message ?? "Erro ao cancelar transação" },
        { status: cancelResponse.status, headers },
      );
    }

    return Response.json({
      success: true,
      message: "Transação cancelada com sucesso",
      transactionId,
    });
  } catch {
    return Response.json(
      { error: "Erro ao cancelar transação" },
      { status: 500, headers },
    );
  }
}
