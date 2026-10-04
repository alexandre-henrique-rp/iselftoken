import { data, redirect } from "react-router";
import { dehydrate } from "@tanstack/react-query";
import type { Route } from "./+types/admin-config";
import { createQueryClient } from "~/lib/query-client";
import {
  adminConfigQueryOptions,
  adminTaxonomyQueryOptions,
} from "~/lib/queries";
import { serverFetch } from "~/lib/server-fetch";

export async function adminConfigLoader({ request }: Route.LoaderArgs) {
  const queryClient = createQueryClient();
  const [response, taxonomyResponse] = await Promise.all([
    serverFetch(request, "/api/admin/config/parameters"),
    serverFetch(request, "/api/admin/config/categories"),
  ]);

  if (response.status === 401 || taxonomyResponse.status === 401) {
    throw redirect("/login");
  }
  if (response.status === 403 || taxonomyResponse.status === 403) {
    throw data("Acesso restrito", { status: 403 });
  }

  if (response.ok) {
    const body = await response.json();
    queryClient.setQueryData(adminConfigQueryOptions.queryKey, body?.data ?? []);
  }
  if (taxonomyResponse.ok) {
    const body = await taxonomyResponse.json();
    queryClient.setQueryData(
      adminTaxonomyQueryOptions.queryKey,
      body?.data ?? [],
    );
  }

  return { dehydratedState: dehydrate(queryClient) };
}
