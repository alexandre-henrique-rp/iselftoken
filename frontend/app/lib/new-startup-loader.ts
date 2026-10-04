import type { QueryClient } from "@tanstack/react-query";
import {
  categoriesQueryOptions,
  countriesQueryOptions,
  DEFAULT_FOUNDER_FUNDRAISING_CONFIG,
  founderFundraisingConfigQueryOptions,
} from "~/lib/queries";
import { serverFetch } from "~/lib/server-fetch";

export async function prefetchNewStartupData(
  request: Request,
  queryClient: QueryClient,
) {
  const [configResponse, countriesResponse, categoriesResponse] =
    await Promise.all([
      serverFetch(request, "/api/config/fundraising"),
      serverFetch(request, "/api/country"),
      serverFetch(request, "/api/categories"),
    ]);
  const [configJson, countriesJson, categoriesJson] = await Promise.all([
    configResponse.ok ? configResponse.json() : null,
    countriesResponse.ok ? countriesResponse.json() : null,
    categoriesResponse.ok ? categoriesResponse.json() : null,
  ]);
  const rawConfig = configJson?.data ?? configJson ?? {};
  const config = {
    ...DEFAULT_FOUNDER_FUNDRAISING_CONFIG,
    ...rawConfig,
    fastTrackFee:
      rawConfig.fastTrackFee ??
      rawConfig.fastTrackReview ??
      DEFAULT_FOUNDER_FUNDRAISING_CONFIG.fastTrackFee,
  };
  const countries = (countriesJson?.data ?? countriesJson ?? []) as Awaited<
    ReturnType<typeof countriesQueryOptions.queryFn>
  >;
  const categories = (categoriesJson?.data ?? categoriesJson ?? []) as Awaited<
    ReturnType<typeof categoriesQueryOptions.queryFn>
  >;

  queryClient.setQueryData(
    founderFundraisingConfigQueryOptions.queryKey,
    config,
  );
  queryClient.setQueryData(countriesQueryOptions.queryKey, countries);
  queryClient.setQueryData(categoriesQueryOptions.queryKey, categories);
}
