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
    const pixResponse = await fetch(`${process.env.API_URL}/payments/pix`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        transactionId,
        amount: payload?.amount,
      }),
    });

    const pixResult = await pixResponse.json();

    if (!pixResponse.ok || pixResult?.error) {
      return Response.json(
        { error: pixResult?.message ?? "Erro ao gerar PIX" },
        { status: pixResponse.status, headers },
      );
    }

    return Response.json({
      transactionId,
      qrCodeText: pixResult.qrCodeText ?? pixResult.code,
      qrCodeImage: pixResult.qrCodeImage ?? "",
      expiresAt:
        pixResult.expiresAt ??
        new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  } catch {
    return Response.json(
      { error: "Erro ao gerar PIX" },
      { status: 500, headers },
    );
  }
}
