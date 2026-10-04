/**
 * BFF: GET /api/marketplace/banner — Slides do banner da home.
 *
 * O backend NÃO expõe endpoint dedicado de banner (`/marketplace/banner`
 * retorna 404). Em vez de mockar, montamos os slides agregando
 * `/marketplace/featured` (campo `cover` foi criado justamente para esse
 * fim) e adicionando copy de marketing no BFF.
 *
 * Quando o backend implementar `/marketplace/banner` nativo (sprint
 * futura), basta trocar a URL e remover a transformação abaixo.
 */
import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";
import { toMarketplaceBannerSlides } from "~/lib/marketplace-banner";
import type { StartupFeatured } from "~/types/startup-featured";

export async function loader({ request }: LoaderFunctionArgs) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  try {
    const res = await fetch(`${BACKEND_URL}/marketplace/featured`, {
      headers: {
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    });
    const json = await res.json().catch(() => null);
    const data = Array.isArray(json?.data)
      ? (json.data as StartupFeatured[])
      : [];
    return Response.json({ data: toMarketplaceBannerSlides(data) });
  } catch {
    return Response.json({ data: [] });
  }
}
