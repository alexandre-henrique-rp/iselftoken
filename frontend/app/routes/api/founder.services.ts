import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: GET /api/founder/services
 *
 * Retorna o catálogo de SERVIÇOS DISPONÍVEIS para o fundador contratar
 * em suas startups (pagamentos avulsos além da reserva obrigatória).
 *
 * Lê do endpoint público `/founder/services` (só AuthGuard) que retorna
 * do model `Service` do Prisma — onde o admin cadastra via
 * `/admin/services` (CRUD completo).
 *
 * A UI mapeia cada serviço ao seu `endpoint` BFF para criar a cobrança
 * (ex.: compliance-fee → POST /api/founder/compliance-fee).
 */

interface RawService {
  id: number;
  slug: string;
  name: string;
  shortDesc: string | null;
  description: string;
  /** JSON array de strings (benefits) ou null — parseado pelo hook. */
  benefits: string | null;
  category: string;
  paymentPurpose: string;
  /** Decimal serializado como string pelo Prisma JSON. null = variavel. */
  price: string | number | null;
  currency: string;
  highlight: boolean;
  available: boolean;
  order: number;
  /** JSON array de campaign status permitidos ou null. */
  requiresCampaignStatus: string | null;
  endpoint: string | null;
}

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const cookieHeader = request.headers.get("cookie");

  try {
    const res = await fetch(`${BACKEND_URL}/founder/services`, {
      headers: {
        accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    });

    const json = await res.json().catch(() => ({
      error: true,
      message: "Resposta inválida do backend.",
    }));

    if (!res.ok) {
      return Response.json(
        {
          error: true,
          message: json?.message ?? `Backend ${res.status}`,
        },
        { status: res.status },
      );
    }

    // Desembrulha o envelope ResponseDto ({error, message, data: [...]})
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
