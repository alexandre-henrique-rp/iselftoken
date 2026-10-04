import type { StartupFeatured } from "./startup-featured";

export interface PaginatedCatalog {
  data: StartupFeatured[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
