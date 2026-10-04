import { EarlyAccessRanking } from "~/components/landing/early-access-ranking";
import { FeaturedRounds } from "~/components/landing/featured-rounds";
import { Footer } from "~/components/landing/footer";
import { Hero } from "~/components/landing/hero";
import { HowItWorks } from "~/components/landing/how-it-works";
import { Navbar } from "~/components/landing/navbar";
import { Opportunities } from "~/components/landing/opportunities";
import { RecentlyAdded } from "~/components/landing/recently-added";
import { TestimonialsInvestors } from "~/components/landing/testimonials-investors";
import { TestimonialsStartups } from "~/components/landing/testimonials-startups";
import type { LandingData } from "~/types/landing-data";
import type { Route } from "./+types/index";

export function links() {
  return [
    { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    { rel: "apple-touch-icon", href: "/favicon.ico", type: "image/x-icon" },
  ];
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Home - iSelfToken" },
    {
      name: "description",
      content:
        "iSelfToken Crowdfunding - Vamos juntos em busca do próximo UNICÓRNIO. A iSelfToken é uma plataforma inovadora de tokenização de equity que conecta startups em crescimento com investidores em busca de oportunidades.",
    },
    {
      name: "robots",
      content:
        "index, max-snippet:-1, max-image-preview:large, max-video-preview:-1, follow",
    },
    { rel: "canonical", href: "https://iselftoken.com/" },

    // Open Graph (Web Platform - Facebook, LinkedIn, WhatsApp)
    { property: "og:url", content: "https://iselftoken.com/" },
    { property: "og:site_name", content: "iSelfToken" },
    { property: "og:locale", content: "pt_PT" },
    { property: "og:type", content: "product" },
    {
      property: "og:title",
      content: "iSelfToken - Plataforma de Equity Crowdfunding Tokenizado",
    },
    {
      property: "og:description",
      content:
        "Invista em startups com tokens digitais. Plataforma de equity crowdfunding tokenizado conectando investidores a startups em crescimento.",
    },
    { property: "og:image", content: "https://iselftoken.com/og-image.png" },
    {
      property: "og:image:secure_url",
      content: "https://iselftoken.com/og-image.png",
    },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    {
      property: "og:image:alt",
      content: "iSelfToken - Plataforma de Equity Crowdfunding",
    },

    // Twitter Card (Platform)
    { name: "twitter:card", content: "summary_large_image" },
    {
      name: "twitter:title",
      content: "iSelfToken - Plataforma de Equity Crowdfunding Tokenizado",
    },
    {
      name: "twitter:description",
      content:
        "Invista em startups com tokens digitais. Plataforma de equity crowdfunding tokenizado.",
    },
    { name: "twitter:url", content: "https://iselftoken.com/" },
    { name: "twitter:image", content: "https://iselftoken.com/og-image.png" },
    { name: "twitter:site", content: "@iSelfToken" },

    // Meta tags relacionadas ao ícone/tema
    { name: "theme-color", content: "#0a0a0a" },
    { name: "mobile-web-app-capable", content: "yes" },
    {
      name: "apple-mobile-web-app-status-bar-style",
      content: "black-translucent",
    },
    { name: "msapplication-TileColor", content: "#0a0a0a" },
  ];
}

export function scripts() {
  return [
    {
      type: "application/ld+json",
      dangerouslySetInnerHTML: {
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "iSelfToken",
          url: "https://iselftoken.com",
          description:
            "Plataforma de equity crowdfunding tokenizado conectando startups a investidores.",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          offers: {
            "@type": "Offer",
            category: "Equity Crowdfunding",
          },
          creator: {
            "@type": "Organization",
            name: "iSelfToken",
            url: "https://iselftoken.com",
            logo: "https://iselftoken.com/logo.png",
            sameAs: [
              "https://www.linkedin.com/company/iselftoken",
              "https://twitter.com/iSelfToken",
            ],
          },
        }),
      },
    },
  ];
}

export async function loader({
  request,
}: Route.LoaderArgs): Promise<LandingData> {
  const [
    featuredStartups,
    recentlyAddedStartups,
    opportunities,
    investorTestimonials,
    startupTestimonials,
    earlyAccessRanking,
  ] = await Promise.all([
    getFeaturedStartups(request),
    getRecentlyAddedStartups(request),
    getOpportunities(request),
    getInvestorTestimonials(request),
    getStartupTestimonials(request),
    getEarlyAccessRanking(request),
  ]);

  return {
    featuredStartups,
    recentlyAddedStartups,
    opportunities,
    investorTestimonials,
    startupTestimonials,
    earlyAccessRanking,
  };
}

async function getFeaturedStartups(
  request: Request,
): Promise<LandingData["featuredStartups"]> {
  const res = await fetchApi<LandingData["featuredStartups"]>(
    "/api/startups/featured",
    request,
  );
  return res.data;
}

async function getRecentlyAddedStartups(
  request: Request,
): Promise<LandingData["recentlyAddedStartups"]> {
  const res = await fetchApi<LandingData["recentlyAddedStartups"]>(
    "/api/startups/recently-added",
    request,
  );
  return res.data;
}

async function getOpportunities(
  request: Request,
): Promise<LandingData["opportunities"]> {
  const res = await fetchApi<LandingData["opportunities"]>(
    "/api/startups/opportunities",
    request,
  );
  return res.data;
}

async function getInvestorTestimonials(
  request: Request,
): Promise<LandingData["investorTestimonials"]> {
  const res = await fetchApi<LandingData["investorTestimonials"]>(
    "/api/testimonials/investors",
    request,
  );
  return res.data;
}

async function getStartupTestimonials(
  request: Request,
): Promise<LandingData["startupTestimonials"]> {
  const res = await fetchApi<LandingData["startupTestimonials"]>(
    "/api/testimonials/startups",
    request,
  );
  return res.data;
}

async function getEarlyAccessRanking(
  request: Request,
): Promise<LandingData["earlyAccessRanking"]> {
  const res = await fetchApi<LandingData["earlyAccessRanking"]>(
    "/api/marketplace/early-access/ranking",
    request,
  );
  return res.data;
}

async function fetchApi<T>(
  path: string,
  request: Request,
): Promise<{ data: T }> {
  const base = new URL(request.url).origin;
  const res = await fetch(`${base}${path}`);
  return res.json() as Promise<{ data: T }>;
}

export default function Index({ loaderData }: Route.ComponentProps) {
  const {
    featuredStartups,
    recentlyAddedStartups,
    opportunities,
    investorTestimonials,
    startupTestimonials,
    earlyAccessRanking,
  } = loaderData;

  return (
    <div className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      <Navbar />
      <main className="pt-18">
        <Hero />
        <FeaturedRounds startups={featuredStartups} />
        <RecentlyAdded startups={recentlyAddedStartups} />
        <HowItWorks />
        <Opportunities opportunities={opportunities} />
        <EarlyAccessRanking
          ranking={earlyAccessRanking?.ranking ?? []}
          totalReservations={earlyAccessRanking?.totalReservations ?? 0}
        />
        <TestimonialsInvestors testimonials={investorTestimonials} />
        <TestimonialsStartups testimonials={startupTestimonials} />
      </main>
      <Footer />
    </div>
  );
}
