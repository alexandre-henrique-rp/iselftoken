import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para `GET /admin/startups/:id/payment-status` no backend NestJS.
 *
 * Fornece os gates de pagamento das Fases 1/2/3 (S2) para a tabela e páginas
 * de fase do admin. Backend valida role via AuthGuard + AdminGuard.
 */
export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<Response> {
  const id = params.id;
  if (!id) {
    return Response.json(
      { error: true, message: "id obrigatório" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const res = await fetch(
    `${BACKEND_URL}/admin/startups/${encodeURIComponent(id)}/payment-status`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    },
  );
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
