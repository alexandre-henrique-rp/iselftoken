import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `GET /admin/financeiro/split/:campaignId/export` no backend.
 *
 * Stream direto do CSV (text/csv). Preserva `Content-Disposition` do backend
 * para o browser baixar com filename padrão
 * `split-campaign-<id>-<YYYYMMDD>.csv`.
 */
export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<Response> {
  const cookieHeader = request.headers.get("cookie");
  const campaignId = params.campaignId;

  const res = await fetch(
    `${BACKEND_URL}/admin/financeiro/split/${campaignId}/export`,
    {
      method: "GET",
      headers: {
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    },
  );

  // Repassa body cru + headers críticos (Content-Type, Content-Disposition).
  const headers = new Headers();
  const contentType = res.headers.get("content-type");
  const contentDisposition = res.headers.get("content-disposition");
  if (contentType) headers.set("Content-Type", contentType);
  if (contentDisposition) headers.set("Content-Disposition", contentDisposition);

  return new Response(res.body, { status: res.status, headers });
}
