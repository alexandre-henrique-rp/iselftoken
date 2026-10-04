import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para GET /verificar/:documentId (publico, sem auth).
 *
 * O backend ja sanitiza dados sensiveis (CPF/CNPJ mascarados, IPs omitidos).
 * Rate-limited: 100 req/IP/min (ThrottlerGuard no backend).
 */

export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<Response> {
  const { documentId } = params;
  if (!documentId) {
    return Response.json(
      { error: true, message: "ID do documento nao fornecido" },
      { status: 400 },
    );
  }

  const url = `${BACKEND_URL}/verificar/${documentId}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "omit",
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
