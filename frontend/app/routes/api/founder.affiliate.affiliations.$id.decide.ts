import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para POST /founder/affiliate/affiliations/:id/decide.
 * Body: { decision: 'APPROVED' | 'REJECTED', tokensAllocated?, reason? }
 */
export async function action({ request, params }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }

  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "ID da afiliação não fornecido" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: true, message: "Body inválido" },
      { status: 400 },
    );
  }

  const res = await fetch(
    `${BACKEND_URL}/founder/affiliate/affiliations/${id}/decide`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      credentials: "include",
      body: JSON.stringify(body),
    },
  );

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
