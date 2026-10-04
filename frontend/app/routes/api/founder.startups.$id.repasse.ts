import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para endpoints de Repasse de Fundos (B12) do fundador.
 *
 * GET   — consulta NF + 3 parcelas com status atual
 *         Backend: GET /founder/startups/:id/repasse
 * POST  — inicia repasse (cria NF + 3 parcelas). Idempotente no backend.
 *         Backend: POST /founder/startups/:id/repasse/initiate
 *
 * LGPD: dados bancários sensíveis são gerenciados apenas no backend;
 * este BFF apenas proxia respostas já consolidadas (NF + parcelas).
 */

export async function loader({ request, params }: LoaderFunctionArgs): Promise<Response> {
  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "ID da startup não fornecido" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const res = await fetch(`${BACKEND_URL}/founder/startups/${id}/repasse`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}

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
      { error: true, message: "ID da startup não fornecido" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const res = await fetch(
    `${BACKEND_URL}/founder/startups/${id}/repasse/initiate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      credentials: "include",
    },
  );

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}