import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: GET /api/founder/startups/:id/termo-adesao
 *
 * Proxy para `GET /founder/startups/:startupId/termo-adesao` no backend
 * (controller TermoAdesaoController com @Controller('founder/startups')).
 * Retorna status default se o termo ainda não existir (404).
 */
export async function loader({
  params,
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const { id } = params;

  if (!id) {
    return Response.json(
      { error: true, message: "ID não fornecido" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");

  try {
    const res = await fetch(
      `${BACKEND_URL}/founder/startups/${id}/termo-adesao`,
      {
        headers: {
          ...(cookieHeader && { cookie: cookieHeader }),
        },
      },
    );

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return Response.json(data);
    }

    if (res.status === 404) {
      return Response.json({
        exists: false,
        signedAt: null,
        qrCodeUrl: null,
      });
    }

    return Response.json(
      { error: true, message: `Backend ${res.status}` },
      { status: res.status },
    );
  } catch {
    // Backend indisponível — retorna status default
    return Response.json({
      exists: false,
      signedAt: null,
      qrCodeUrl: null,
    });
  }
}

/**
 * BFF: PATCH /api/founder/startups/:id/termo-adesao
 * Encaminha o aceite para o endpoint autenticado do backend.
 */
export async function action({
  params,
  request,
}: ActionFunctionArgs): Promise<Response> {
  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "ID não fornecido" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const body = await request.text();

  try {
    const res = await fetch(
      `${BACKEND_URL}/founder/startups/${id}/termo-adesao`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": request.headers.get("content-type") ?? "application/json",
          ...(cookieHeader && { cookie: cookieHeader }),
        },
        body,
      },
    );

    const data = await res.json().catch(() => ({
      error: true,
      message: "Resposta inválida do backend.",
    }));
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json(
      { error: true, message: "Serviço de assinatura indisponível." },
      { status: 502 },
    );
  }
}
