import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `GET /admin/financeiro/split/:campaignId` no backend NestJS.
 *
 * Retorna campaign + breakdown + lista de investments individuais do split
 * financeiro. Backend valida role ADMIN via AuthGuard + AdminGuard.
 */
export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<Response> {
  const cookieHeader = request.headers.get("cookie");
  const campaignId = params.campaignId;

  const res = await fetch(
    `${BACKEND_URL}/admin/financeiro/split/${campaignId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    },
  );

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
