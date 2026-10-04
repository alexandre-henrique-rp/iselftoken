import { BACKEND_URL } from "~/lib/api-config";

/**
 * GET /api/notifications — BFF proxy para o backend NestJS.
 *
 * Encaminha o cookie de sessão e repassa filtros de query:
 *  - `type` (single): back-compat, usado pelo filtro legado
 *  - `types` (CSV/multi-valor): usado pelos novos filtros (subscriptions, repasses, etc)
 *  - `page`, `limit`
 *
 * Sprint de Notificações — central (2026-10-04): o backend agora aceita
 * `?types=plan_purchased,plan_added` para filtrar por múltiplos tipos.
 * O BFF propaga o param `types` verbatim (CSV) e mantém `type` para
 * back-compat. Ver `lib/queries.ts:NOTIFICATION_FILTER_TO_TYPES` no frontend.
 */
export async function loader({ request }: { request: Request }) {
  const cookie = request.headers.get("cookie") ?? "";
  const url = new URL(request.url);

  const type = url.searchParams.get("type");
  const types = url.searchParams.get("types");
  const page = url.searchParams.get("page") ?? "1";
  const limit = url.searchParams.get("limit") ?? "20";

  const qs = new URLSearchParams({ page, limit });
  // Preferir `types` (CSV) sobre `type` (single) — alinhado com a regra
  // "types vence sobre type" do backend.
  if (types && types.trim().length > 0) {
    qs.set("types", types);
  } else if (type && type !== "all") {
    qs.set("type", type);
  }

  const res = await fetch(`${BACKEND_URL}/notifications?${qs.toString()}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(cookie && { cookie }),
    },
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? {}, { status: res.status });
}
