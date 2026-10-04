import { serverFetch } from "~/lib/server-fetch";

export async function historyLoader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const qs = url.search;
  try {
    const res = await serverFetch(request, `/api/admin/history${qs}`);
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      return {
        data: null,
        erro: json?.message ?? "Não foi possível carregar o histórico.",
        qs,
      };
    }
    const json = await res.json();
    return { data: json.data, erro: null, qs };
  } catch {
    return { data: null, erro: "Erro de conexão.", qs };
  }
}
