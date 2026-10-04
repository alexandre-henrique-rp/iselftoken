import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF auth-aware para detalhe de startup por slug.
 *
 * Detecta sessão via cookie:
 * - Com cookie: chama backend `/startup/marketplace/authenticated/:slug` (oferta para descoberta/investimento)
 * - Com `?view=owner`: chama backend `/startup/marketplace/private/:slug` (owner/admin)
 * - Sem cookie: chama backend `/startup/marketplace/public/:slug` (dados públicos)
 *
 * O cookie decide o shape autenticado; `view=owner` só é usado pela tela de
 * preview do fundador, cujo owner/admin é revalidado pelo backend.
 *
 * O backend deve devolver, num único payload, TANTO os dados da startup
 * (nome, descrição, logo, etc.) QUANTO os dados da campanha ativa
 * (raised, goal, percentage, equity, etc.). O frontend renderiza ambos
 * via `StartupOpportunityView` (modo `public` → `StartupPublicOpportunity`,
 * modo `private` → `StartupPrivateOpportunity`).
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
  const { slug } = params;

  if (!slug) {
    return Response.json({ error: "Slug não fornecido" }, { status: 400 });
  }

  const cookie = request.headers.get("cookie") ?? "";
  const url = new URL(request.url);
  // Importante: checar por `session_id` específico, não por qualquer cookie.
  // Cookies de tema/idioma/analytics não significam login.
  const hasSession = /(?:^|;\s*)session_id=/.test(cookie);
  const ownerView = url.searchParams.get("view") === "owner";
  const backendPath = hasSession
    ? `/startup/marketplace/${ownerView ? "preview" : "authenticated"}/${encodeURIComponent(slug)}`
    : `/startup/marketplace/public/${encodeURIComponent(slug)}`;

  try {
    console.log(
      `[BFF startups.slug] slug=${slug} session=${hasSession} → ${backendPath}`,
    );
    const res = await fetch(`${BACKEND_URL}${backendPath}`, {
      headers: {
        accept: "application/json",
        ...(cookie ? { cookie } : {}),
      },
    });
    const json = await res.json().catch(() => null);

    if (!res.ok || json?.error || (json?.codigo && json.codigo >= 400)) {
      const status = json?.codigo >= 400 ? json.codigo : res.status;
      console.warn(
        `[BFF startups.slug] slug=${slug} status=${status} body=${JSON.stringify(json)?.slice(0, 200)}`,
      );
      return Response.json(
        { error: json?.message ?? "Startup não encontrada" },
        { status: status >= 400 ? status : 404 },
      );
    }

    return Response.json(json?.data ?? json);
  } catch (err) {
    console.error(`[BFF startups.slug] slug=${slug} fetch failed:`, err);
    return Response.json({ error: "Serviço indisponível" }, { status: 502 });
  }
}
