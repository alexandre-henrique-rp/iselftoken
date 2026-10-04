import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para endpoints de solicitação de alteração do fundador.
 *
 * GET    — lista solicitações do fundador para uma startup específica
 *          Backend: GET /founder/startups/:id/change-requests
 * POST   — cria nova solicitação de alteração
 *          Backend: POST /founder/startups/:id/change-request
 */

export async function loader({ request, params }: LoaderFunctionArgs): Promise<Response> {
  const { id } = params;
  if (!id) {
    return Response.json({ error: true, message: "ID da startup não fornecido" }, { status: 400 });
  }

  const cookieHeader = request.headers.get("cookie");
  const res = await fetch(`${BACKEND_URL}/founder/startups/${id}/change-requests`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}

export async function action({ request, params }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: true, message: "Método não permitido" }, { status: 405 });
  }

  const { id } = params;
  if (!id) {
    return Response.json({ error: true, message: "ID da startup não fornecido" }, { status: 400 });
  }

  const cookieHeader = request.headers.get("cookie");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: true, message: "Body inválido" }, { status: 400 });
  }

  const { field, requestedValue, justification } = (body ?? {}) as Record<string, string>;
  if (!field || !requestedValue || !justification) {
    return Response.json(
      { error: true, message: "Campos 'field', 'requestedValue' e 'justification' são obrigatórios" },
      { status: 400 },
    );
  }

  if (justification.length < 10) {
    return Response.json(
      { error: true, message: "Justificativa deve ter no mínimo 10 caracteres" },
      { status: 400 },
    );
  }

  const res = await fetch(`${BACKEND_URL}/founder/startups/${id}/change-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    credentials: "include",
    body: JSON.stringify({ field, requestedValue, justification }),
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
