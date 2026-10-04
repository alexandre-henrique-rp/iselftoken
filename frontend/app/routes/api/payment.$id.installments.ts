import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `GET /payment/:id/installments` no backend NestJS.
 *
 * Retorna a simulação de parcelamento calculada pelo backend (fonte de
 * verdade): opções de 1 até o máximo configurado, cada uma com valor da
 * parcela, total com juros compostos, taxa aplicada e `belowMinimum`. O
 * checkout apenas apresenta estes valores — nunca recalcula juros localmente.
 */
export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<Response> {
  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "ID do pagamento não fornecido" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/payment/${id}/installments`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
