/**
 * BFF proxy para GET /categories no backend.
 * Retorna lista de categorias ativas para o dropdown em cascata.
 * Cache: 5 minutos (staleTime no TanStack Query hook).
 */
import { BACKEND_URL } from "~/lib/api-config";

export async function loader() {
  const res = await fetch(`${BACKEND_URL}/categories`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  }

  return Response.json(await res.json());
}
