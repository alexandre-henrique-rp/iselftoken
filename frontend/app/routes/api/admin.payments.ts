import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: GET /api/admin/payments
 *
 * Proxy para `GET /admin/payments` no backend (AdminPaymentsController +
 * PaymentService.findAll). Suporta filtros via query params:
 *   - search: ID do usuario, email ou status
 *   - page, limit: paginacao
 *
 * Auth + role ADMIN garantidos pelo backend (AuthGuard + AdminGuard).
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const cookieHeader = request.headers.get("cookie");
  const url = new URL(request.url);

  const qs = new URLSearchParams();
  for (const [key, value] of url.searchParams.entries()) {
    qs.set(key, value);
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/admin/payments${qs.toString() ? `?${qs}` : ""}`,
      {
        headers: {
          ...(cookieHeader && { cookie: cookieHeader }),
        },
      },
    );

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

    const payload = data?.data !== undefined ? data.data : data;
    return Response.json(payload);
  } catch {
    return Response.json(
      { error: true, message: "Servico de pagamentos indisponivel." },
      { status: 502 },
    );
  }
}
