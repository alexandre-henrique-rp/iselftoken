import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `GET /payment` e `POST /payment` no backend NestJS.
 *
 * - GET: lista paginada (admin/owner) — repassa querystring (page, limit, search).
 * - POST: cria Payment PENDING. Body esperado:
 *   `{ amount, method, purpose, subscriptionId?, investmentId?, campaignId? }`.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const cookieHeader = request.headers.get("cookie");
  const url = new URL(request.url);

  const res = await fetch(`${BACKEND_URL}/payment${url.search}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido", codigo: 405 },
      { status: 405 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const body = await request.json();

  // Suporta formato novo com array de produtos
  let requestBody = body;
  if (body.products && Array.isArray(body.products)) {
    // Formato novo: { method, products: [{ purpose, amount }], campaignId }
    const totalAmount = body.products.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
    requestBody = {
      ...body,
      amount: totalAmount,
      // Usa o primeiro purpose para compatibilidade com o backend atual
      purpose: body.products[0]?.purpose || "TOKEN_RESERVATION",
    };
    delete requestBody.products;
  }

  const res = await fetch(`${BACKEND_URL}/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body: JSON.stringify(requestBody),
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
