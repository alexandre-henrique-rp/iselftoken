import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `GET /startup/:id/investors` no backend NestJS.
 * Retorna investidores CONFIRMED de uma startup especifica (LGPD-safe:
 * nome + email + totais). Apenas founder owner ou ADMIN.
 *
 * Consumido por `useFounderInvestorsQuery` em `/founder/investors`.
 */
export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<Response> {
  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "ID da startup nao fornecido" },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const startupId = url.searchParams.get("startupId") ?? id;
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(
    `${BACKEND_URL}/startup/${encodeURIComponent(startupId)}/investors`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    },
  );

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true, data: null }, {
    status: res.status,
  });
}