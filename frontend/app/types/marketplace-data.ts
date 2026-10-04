import type { BannerSlide } from "~/types/banner-slide";
import type { StartupFeatured } from "~/types/startup-featured";
import type { EarlyAccessOpportunity } from "~/types/early-access-opportunity";
import type { CategoryItem } from "~/types/category-item";

export interface MarketplaceData {
  bannerSlides: BannerSlide[];
  featuredStartups: StartupFeatured[];
  earlyAccess: EarlyAccessOpportunity[];
  categories: CategoryItem[];
}
