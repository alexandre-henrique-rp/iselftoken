import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: GET /api/admin/services
 *
 * Lista o catálogo de serviços (todos, incluindo desabilitados) para o admin
 * gerenciar. Requer role ADMIN no backend (`/admin/services` com AdminGuard).
 *
 * O frontend usa essa lista para popular a tabela em `/admin/servicos` e os
 * formularios de criar/editar.
 */

interface RawService {
  id: number;
  slug: string;
  name: string;
  shortDesc: string | null;
  description: string;
  benefits: string | null;
  category: string;
  paymentPurpose: string;
  price: string | number | null;
  currency: string;
  highlight: boolean;
  available: boolean;
  order: number;
  requiresCampaignStatus: string | null;
  endpoint: string | null;
}

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<Response> {
  // Chama o backend NestJS diretamente (port 7077) — serverFetch aqui
  // causaria loop infinito (a propria BFF eh o destino de /api/admin/services).
  const cookieHeader = request.headers.get("cookie") ?? "";
  try {
    const res = await fetch(`${BACKEND_URL}/admin/services`, {
      headers: {
        accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return Response.json(
        json ?? { error: true, message: `Backend ${res.status}` },
        { status: res.status },
      );
    }
    const payload = json?.data !== undefined ? json.data : json;
    const list: RawService[] = Array.isArray(payload) ? payload : [];
    return Response.json(list);
  } catch {
    return Response.json(
      { error: true, message: "Serviço de catálogo indisponível." },
      { status: 502 },
    );
  }
}

/**
 * BFF proxy para /admin/services (mesma origem no dev = Vite proxy para o
 * backend NestJS). POST cria, PATCH atualiza, DELETE remove.
 */
export async function action({
  request,
}: {
  request: Request;
}) {
  const method = request.method;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const path = id ? `/api/admin/services/${id}` : `/api/admin/services`;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const body = method !== "GET" && method !== "DELETE" ? await request.text() : undefined;

  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: {
        accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
        ...(body && { "content-type": request.headers.get("content-type") ?? "application/json" }),
      },
      body,
    });
    const data = await res.json().catch(() => ({
      error: true,
      message: "Resposta inválida do backend.",
    }));
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json(
      { error: true, message: "Serviço de catálogo indisponível." },
      { status: 502 },
    );
  }
}