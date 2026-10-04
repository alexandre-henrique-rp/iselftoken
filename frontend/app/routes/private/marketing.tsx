import { redirect, type ShouldRevalidateFunction } from "react-router";
import { CategoryGrid } from "~/components/marketplace/category-grid";
import { CuratedPicks } from "~/components/marketplace/curated-picks";
import { EarlyAccess } from "~/components/marketplace/early-access";
import { HotRoundsSection } from "~/components/marketplace/hot-rounds-section";
import { MarketplaceBanner } from "~/components/marketplace/marketplace-banner";
import { StartupGrid } from "~/components/marketplace/startup-grid";
import { requireAuthorizedUser } from "~/lib/auth-policy";
import { toMarketplaceBannerSlides } from "~/lib/marketplace-banner";
import { serverFetch } from "~/lib/server-fetch";
import type { UserData } from "~/types/auth";
import type { CuratedPick } from "~/types/curated-pick";
import type { MarketplaceData } from "~/types/marketplace-data";
import type { PaginatedCatalog } from "~/types/paginated-catalog";
import type { StartupFeatured } from "~/types/startup-featured";
import type { Route } from "./+types/marketing";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Marketplace | iSelfToken" },
    {
      name: "description",
      content: "Explore as melhores oportunidades de investimento em startups.",
    },
  ];
}

/**
 * Mudanças de search params (filtros do StartupGrid) não recarregam a página.
 * StartupGrid usa useFetcher para refetch isolado do catálogo.
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}) => {
  if (currentUrl.pathname !== nextUrl.pathname) return defaultShouldRevalidate;
  return false;
};

interface MarketingLoaderData extends Omit<MarketplaceData, "categories"> {
  categories: MarketplaceData["categories"];
  catalog: PaginatedCatalog;
  curatedPicks: CuratedPick[];
}

export async function loader({
  request,
}: Route.LoaderArgs): Promise<MarketingLoaderData> {
  // Home diferenciada por perfil: o afiliado puro (plano AFILIADO) não vê o
  // marketplace de investimento — sua home é o catálogo de startups prontas
  // para afiliação. Mesma regra de papel usada no sidebar.
  const { user } = await requireAuthorizedUser(request);
  if (ehAfiliadoPuro(user)) {
    throw redirect("/affiliate");
  }

  const [featuredStartups, earlyAccess, categories, catalog, curatedPicks] =
    await Promise.all([
      getFeaturedStartups(request),
      getEarlyAccess(request),
      getSectorStats(request),
      getCatalog(request),
      getCuratedPicks(request),
    ]);

  return {
    bannerSlides: toMarketplaceBannerSlides(featuredStartups),
    featuredStartups,
    earlyAccess,
    categories,
    catalog,
    curatedPicks,
  };
}

async function getFeaturedStartups(
  request: Request,
): Promise<StartupFeatured[]> {
  const res = await fetchApi<StartupFeatured[]>(
    "/api/startups/featured",
    request,
  );
  return res.data;
}

async function getEarlyAccess(
  request: Request,
): Promise<MarketplaceData["earlyAccess"]> {
  const res = await fetchApi<MarketplaceData["earlyAccess"]>(
    "/api/marketplace/early-access",
    request,
  );
  return res.data;
}

async function getSectorStats(
  request: Request,
): Promise<MarketplaceData["categories"]> {
  const res = await fetchApi<MarketplaceData["categories"]>(
    "/api/marketplace/sector-stats",
    request,
  );
  return res.data;
}

async function getCatalog(request: Request): Promise<PaginatedCatalog> {
  const url = new URL(request.url);
  // velocity é exclusivo do EarlyAccess; o catálogo ignora.
  const next = new URLSearchParams();
  for (const key of ["q", "sort", "sector", "page", "pageSize"] as const) {
    const v = url.searchParams.get(key);
    if (v) next.set(key, v);
  }
  const search = next.toString();
  const path = search
    ? `/api/marketplace/all?${search}`
    : "/api/marketplace/all";
  const res = await fetchApi<PaginatedCatalog>(path, request);
  return res.data;
}

async function getCuratedPicks(request: Request): Promise<CuratedPick[]> {
  const res = await fetchApi<CuratedPick[]>(
    "/api/marketplace/curated-picks",
    request,
  );
  return res.data;
}

async function fetchApi<T>(
  path: string,
  request: Request,
): Promise<{ data: T }> {
  const res = await serverFetch(request, path);
  return res.json() as Promise<{ data: T }>;
}

/**
 * Verdadeiro quando o usuário logado tem apenas o plano AFILIADO ativo.
 *
 * A classificação usa o snapshot de autenticação compartilhado com o layout;
 * assim, o redirecionamento não provoca uma segunda consulta a `/users/me`.
 */
function ehAfiliadoPuro(user: UserData): boolean {
  if (user.role === "ADMIN") return false;

  const ativos = (user.subscriptions ?? [])
    .filter((subscription) => subscription.status === "ACTIVE")
    .map((subscription) => subscription.plan?.slug)
    .filter((slug): slug is string => Boolean(slug));

  // A Home é o destino de fundadores e investidores. Somente o usuário
  // exclusivamente afiliado deve ser enviado para /affiliate.
  if (
    ativos.includes("plano-fundador") ||
    ativos.includes("plano-investidor")
  ) {
    return false;
  }
  return ativos.includes("plano-afiliado");
}

export default function MarketingPage({ loaderData }: Route.ComponentProps) {
  const {
    bannerSlides,
    featuredStartups,
    earlyAccess,
    categories,
    catalog,
    curatedPicks,
  } = loaderData;

  return (
    <div className="space-y-12">
      {bannerSlides.length > 0 && <MarketplaceBanner slides={bannerSlides} />}
      <HotRoundsSection startups={featuredStartups} />
      <EarlyAccess opportunities={earlyAccess} />
      <StartupGrid initialCatalog={catalog} />
      <CuratedPicks picks={curatedPicks} />
      <CategoryGrid stats={categories} />
    </div>
  );
}
