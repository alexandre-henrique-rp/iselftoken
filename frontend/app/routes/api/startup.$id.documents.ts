import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `GET /startup/:id/documents` e
 * `POST /startup/:id/documents` (multipart).
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

  const res = await fetch(`${BACKEND_URL}/startup/${id}/documents`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}

export async function action({ request, params }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido", codigo: 405 },
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
  const contentType = request.headers.get("content-type") ?? "";
  const bodyBuffer = await request.arrayBuffer();

  const res = await fetch(`${BACKEND_URL}/startup/${id}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body: bodyBuffer,
    // @ts-expect-error: undici aceita duplex pra streaming, não é tipado.
    duplex: "half",
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
