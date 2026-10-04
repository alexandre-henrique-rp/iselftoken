import { BACKEND_URL } from "~/lib/api-config";

/**
 * Proxy do histórico de auditoria (admin): repassa filtros ao backend.
 */
export async function loader({ request }: { request: Request }) {
  const cookie = request.headers.get("cookie") ?? "";
  const qs = new URL(request.url).search;
  try {
    const res = await fetch(`${BACKEND_URL}/admin/history${qs}`, {
      headers: { cookie, accept: "application/json" },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.error) {
      return Response.json(
        {
          data: null,
          erro: json?.message ?? "Não foi possível carregar o histórico.",
        },
        { status: res.status },
      );
    }
    return Response.json({ data: json.data, erro: null });
  } catch {
    return Response.json(
      { data: null, erro: "Erro de conexão." },
      { status: 502 },
    );
  }
}
