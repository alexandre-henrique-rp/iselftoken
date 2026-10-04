import { BACKEND_URL } from "~/lib/api-config";

/**
 * Proxy de download do CSV do histórico: encaminha os filtros (querystring)
 * ao backend com o cookie de sessão e devolve o CSV como anexo.
 */
export async function loader({ request }: { request: Request }) {
  const cookie = request.headers.get("cookie") ?? "";
  const qs = new URL(request.url).search; // repassa todos os filtros
  const res = await fetch(`${BACKEND_URL}/admin/history/export.csv${qs}`, {
    headers: { cookie },
  });

  if (!res.ok) {
    return new Response("Falha ao exportar histórico", { status: res.status });
  }

  const body = await res.text();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="historico-transacoes.csv"',
    },
  });
}
