import { redirect, useLocation, type LoaderFunctionArgs } from "react-router";
import {
  StartupOpportunityNotFound,
  StartupOpportunityView,
} from "~/components/startup-detail/startup-opportunity-view";
import { serverFetch } from "~/lib/server-fetch";
import type { StartupFeatured } from "~/types/startup-featured";
import type { StartupPublicOpportunity } from "~/types/startup-opportunity-detail";
import type { Route } from "./+types/startup";

type AuthStatus = {
  isAuthenticated: boolean;
  isAuthorized: boolean;
};

type LoaderData = {
  startup: StartupPublicOpportunity | null;
  affiliateCode: string | null;
};

export async function loader({
  params,
  request,
}: LoaderFunctionArgs): Promise<LoaderData> {
  const slug = params.slug ?? params.slugOrId;
  const affiliateCode =
    new URL(request.url).searchParams.get("ref")?.trim() || null;
  if (!slug) return { startup: null, affiliateCode };

  const [startupResponse, authResponse] = await Promise.all([
    serverFetch(
      request,
      `/api/startups/slug/${encodeURIComponent(slug)}`,
      { headers: { accept: "application/json" } },
    ),
    serverFetch(request, "/api/auth/status", {
      headers: { accept: "application/json" },
    }),
  ]);

  let startup: StartupPublicOpportunity | null = null;
  if (startupResponse.ok) {
    startup = (await startupResponse
      .json()
      .catch(() => null)) as StartupPublicOpportunity | null;
  }

  // Fallback para acesso direto via URL (ex.: compartilhamento de link): se
  // o endpoint principal não retornou (startup existe mas campanha fechada,
  // ou backend filtrou por status), busca na lista featured do marketplace.
  if (!startup) {
    startup = await fetchStartupFromFeaturedList(request, slug);
  }

  const auth = authResponse.ok
    ? ((await authResponse.json().catch(() => null)) as AuthStatus | null)
    : null;

  if (startup && auth?.isAuthenticated && auth.isAuthorized) {
    throw redirect(`/marketplace/startup/${encodeURIComponent(slug)}`);
  }

  return { startup, affiliateCode };
}

/**
 * Busca o slug em todas as listas públicas do marketplace (featured,
 * recently-added, opportunities) e adapta para o shape do detalhe. Usado
 * como fallback quando o endpoint `/startup/marketplace/public/:slug` do
 * backend falha (ex.: bug 401 ou filtro por status).
 */
async function fetchStartupFromFeaturedList(
  request: Request,
  slug: string,
): Promise<StartupPublicOpportunity | null> {
  const listPaths = [
    "/api/startups/featured",
    "/api/startups/recently-added",
    "/api/startups/opportunities",
  ];

  for (const path of listPaths) {
    try {
      const res = await serverFetch(request, path, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) continue;

      const json = await res.json().catch(() => null);
      const items: unknown[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : [];
      const found = items.find(
        (item: unknown) =>
          typeof item === "object" &&
          item !== null &&
          "slug" in item &&
          (item as { slug: unknown }).slug === slug,
      );
      if (found) {
        return adaptFeaturedToPublic(found as StartupFeatured);
      }
    } catch {
      // Falha silenciosa — segue para o proximo path da lista de fallback.
    }
  }

  return null;
}

/** Adapta o payload da lista (StartupFeatured) para o shape do detalhe público. */
function adaptFeaturedToPublic(item: StartupFeatured): StartupPublicOpportunity {
  const parseBRL = (s: string): number => {
    const cleaned = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  };
  const parseBRLNullable = (s: string): number | null => {
    const cleaned = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  };

  return {
    slug: item.slug,
    name: item.name,
    logo: item.image,
    cover: item.cover ?? item.image,
    description: item.description,
    category: item.category ?? "OTHER",
    stage: "",
    youtubeUrl: null,
    pitchVideoUrl: null,
    pitchDeckUrl: null,
    problema: null,
    solucao: null,
    // Lista do marketplace não traz equipe → fica vazio, TeamSection usa fallback.
    socios: [],
    teams: [],
    campaign: {
      raised: parseBRL(item.raised),
      goal: parseBRL(item.goal),
      valuation: parseBRL(item.valuation),
      percentage: item.progress,
      equity: parseBRLNullable(item.equity),
    },
  };
}

export function meta({ data }: Route.MetaArgs) {
  const startup = data?.startup;
  if (!startup) return [{ title: "Startup não encontrada | iSelfToken" }];

  const title = `${startup.name} — Invista em ${startup.category} | iSelfToken`;
  const description =
    startup.description.slice(0, 160) ||
    `Invista na ${startup.name} com tokens digitais.`;
  const image = startup.logo
    ? `${startup.logo.startsWith("http") ? "" : "https://iselftoken.com"}${startup.logo}`
    : "https://iselftoken.com/og-default.png";
  const url = `https://iselftoken.com/startup/${startup.slug}`;

  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "index, follow" },
    { rel: "canonical", href: url },
    { property: "og:type", content: "product" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:url", content: url },
    { property: "og:site_name", content: "iSelfToken" },
    { property: "og:locale", content: "pt_BR" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];
}

export default function StartupPublicPage({
  loaderData,
}: Route.ComponentProps) {
  const { startup } = loaderData;
  if (!startup) return <StartupOpportunityNotFound />;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "InvestmentOrDeposit",
            name: `Rodada de Captação — ${startup.name}`,
            description: startup.description,
            url: `https://iselftoken.com/startup/${startup.slug}`,
            image: startup.logo || "",
            provider: {
              "@type": "Organization",
              name: "iSelfToken",
              url: "https://iselftoken.com",
            },
            category: startup.category,
          }),
        }}
      />
      <StartupOpportunityView
        mode="public"
        startup={startup}
        affiliateCode={loaderData.affiliateCode}
      />
    </>
  );
}