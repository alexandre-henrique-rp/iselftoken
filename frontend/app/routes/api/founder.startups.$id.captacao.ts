import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: GET /api/founder/startups/:id/captacao
 *
 * Proxy para `GET /startup/:id/captacao` no backend
 * (StartupExtrasController — AuthGuard + ownership via assertOwnership).
 *
 * Retorna a Campaign ativa (DRAFT/OPEN/PAUSED) da startup com tudo que a UI
 * da página `/founder/startups/:id/captacao` precisa: targetAmount, valuation,
 * tokenPrice, totalTokens, payments (TOKEN_RESERVATION), resources, tese,
 * lucros/benefícios e CVM.
 *
 * Se a startup ainda não tem Campaign, o backend devolve `{ campaign: null }`.
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
    const res = await fetch(`${BACKEND_URL}/startup/${id}/captacao`, {
      headers: {
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    });

    const data = await res.json().catch(() => ({
      error: true,
      message: "Resposta inválida do backend.",
    }));

    if (!res.ok) {
      return Response.json(
        {
          error: true,
          message: data?.message ?? `Backend ${res.status}`,
        },
        { status: res.status },
      );
    }

    // Desembrulha o envelope ResponseDto ({ error, message, codigo, data }).
    const payload = data?.data !== undefined ? data.data : data;
    return Response.json(payload);
  } catch {
    return Response.json(
      { error: true, message: "Serviço de captação indisponível." },
      { status: 502 },
    );
  }
}
