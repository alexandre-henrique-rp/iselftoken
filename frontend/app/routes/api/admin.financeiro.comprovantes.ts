import type { ActionFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy multipart para `POST /admin/financeiro/comprovantes`.
 *
 * O frontend envia o file via FormData. Como `fetch` aceita Body como
 * `ReadableStream`, repassamos o stream + headers (Content-Type com o
 * boundary multipart) ao backend sem reprocessar.
 */
export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido", codigo: 405 },
      { status: 405 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const contentType = request.headers.get("content-type") ?? "";

  // Lê o body como Buffer pra repassar — `fetch` no Node aceita Buffer/Uint8Array
  // direto como body, e mantemos o Content-Type original com o boundary
  // multipart intacto.
  const bodyBuffer = await request.arrayBuffer();

  const res = await fetch(`${BACKEND_URL}/admin/financeiro/comprovantes`, {
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
