import type { StartupFeatured } from "~/types/startup-featured";
import type { StartupOpportunity } from "~/types/startup-opportunity";
import type { Testimonial } from "~/types/testimonial";
import type { EarlyAccessRankingData } from "~/types/early-access-ranking";

export interface LandingData {
  featuredStartups: StartupFeatured[];
  recentlyAddedStartups: StartupFeatured[];
  opportunities: StartupOpportunity[];
  investorTestimonials: Testimonial[];
  startupTestimonials: Testimonial[];
  earlyAccessRanking: EarlyAccessRankingData;
}
