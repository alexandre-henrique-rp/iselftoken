import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para PATCH /compliance/change-requests/:id.
 *
 * PATCH — aprovar ou rejeitar uma solicitação
 *         Body: { status: "APPROVED" | "REJECTED", reviewerNote: string }
 */

export async function action({ request, params }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "PATCH") {
    return Response.json({ error: true, message: "Método não permitido" }, { status: 405 });
  }

  const { id } = params;
  if (!id) {
    return Response.json({ error: true, message: "ID da solicitação não fornecido" }, { status: 400 });
  }

  const cookieHeader = request.headers.get("cookie");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: true, message: "Body inválido" }, { status: 400 });
  }

  const { status, reviewerNote } = (body ?? {}) as Record<string, string>;
  if (!status || !reviewerNote) {
    return Response.json(
      { error: true, message: "Campos 'status' e 'reviewerNote' são obrigatórios" },
      { status: 400 },
    );
  }

  if (reviewerNote.length < 10) {
    return Response.json(
      { error: true, message: "Nota de revisão deve ter no mínimo 10 caracteres" },
      { status: 400 },
    );
  }

  const res = await fetch(`${BACKEND_URL}/compliance/change-requests/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    credentials: "include",
    body: JSON.stringify({ status, reviewerNote }),
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
