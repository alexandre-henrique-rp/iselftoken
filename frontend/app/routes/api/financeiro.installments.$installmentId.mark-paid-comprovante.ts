import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy multipart para
 * `POST /api/financeiro/installments/:installmentId/mark-paid-comprovante`.
 * Marca a parcela como paga anexando o comprovante (PDF/JPG/PNG).
 */
export async function action({
  request,
  params,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }
  const { installmentId } = params;
  if (!installmentId) {
    return Response.json(
      { error: true, message: "installmentId obrigatório" },
      { status: 400 },
    );
  }
  const cookieHeader = request.headers.get("cookie");
  const contentType = request.headers.get("content-type") ?? "";
  const bodyBuffer = await request.arrayBuffer();

  const res = await fetch(
    `${BACKEND_URL}/api/financeiro/installments/${encodeURIComponent(installmentId)}/mark-paid-comprovante`,
    {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      body: bodyBuffer,
      // @ts-expect-error: undici aceita duplex pra streaming, não é tipado.
      duplex: "half",
    },
  );
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
