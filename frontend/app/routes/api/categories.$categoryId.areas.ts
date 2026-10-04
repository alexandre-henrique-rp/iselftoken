/**
 * BFF proxy para GET /categories/:categoryId/areas no backend.
 * Retorna lista de áreas de atuação filhas de uma categoria.
 * Usado pelo dropdown em cascata Categoria -> Áreas.
 */
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({ params }: { params: { categoryId: string } }) {
  const { categoryId } = params;

  const res = await fetch(`${BACKEND_URL}/categories/${categoryId}/areas`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  }

  return Response.json(await res.json());
}
