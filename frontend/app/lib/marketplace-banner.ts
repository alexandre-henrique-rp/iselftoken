import type { BannerSlide } from "~/types/banner-slide";
import type { StartupFeatured } from "~/types/startup-featured";

const CATEGORY_HIGHLIGHT: Record<string, string> = {
  FINTECH: "FinTech disruptivo",
  AI: "IA de ponta",
  SAAS: "SaaS escalável",
  HEALTHTECH: "HealthTech",
  EDTECH: "EdTech",
  BIOTECH: "BioTech",
  OTHER: "Startup em ascensão",
};

export function toMarketplaceBannerSlides(
  featuredStartups: StartupFeatured[],
): BannerSlide[] {
  return featuredStartups
    .filter((startup) => Boolean(startup.image) || Boolean(startup.cover))
    .map((startup) => {
      const seal = startup.seals?.[0]?.name;
      const badge = startup.tags?.[0] ?? seal ?? "DESTAQUE";
      const highlight =
        CATEGORY_HIGHLIGHT[startup.category ?? "OTHER"] ??
        "Startup em ascensão";

      return {
        badge,
        title: startup.name,
        highlight,
        description: startup.description,
        image: startup.cover ?? startup.image,
        primaryLabel: "Investir agora",
        secondaryLabel: "Ver detalhes",
      };
    });
}
