import { data, redirect } from "react-router";
import { dehydrate } from "@tanstack/react-query";
import type { Route } from "./+types/admin-dashboard";
import { createQueryClient } from "~/lib/query-client";
import { adminDashboardSummaryQueryOptions } from "~/lib/queries";
import { serverFetch } from "~/lib/server-fetch";

/**
 * Server-side helpers for /admin/dashboard route.
 * Separate file so the route can stay at ≤ 40 lines (AGENTS.md rule).
 *
 * Hidrata APENAS o summary no cache TanStack Query. O status do sistema
 * (ex-Live Analytics + System Status) foi removido do header — não há
 * mais consumidor real, então não vale o custo de uma query extra.
 */
export async function loadDashboardData(request: Request) {
  const queryClient = createQueryClient();
  const dRes = await serverFetch(request, "/api/admin/dashboard");
  if (dRes.status === 401) throw redirect("/login");
  if (dRes.status === 403) throw data("Acesso restrito", { status: 403 });
  if (dRes.ok) {
    const summary = (await dRes.json())?.data ?? {};
    queryClient.setQueryData(adminDashboardSummaryQueryOptions.queryKey, summary);
  }
  return { dehydratedState: dehydrate(queryClient) };
}

export async function decideRedemption(
  request: Request,
  intent: string | null,
  redemptionId: string | null,
) {
  if (
    !redemptionId ||
    (intent !== "approve-redemption" && intent !== "reject-redemption")
  ) {
    return { ok: false as const };
  }
  const verb = intent === "approve-redemption" ? "approve" : "reject";
  const res = await serverFetch(
    request,
    `/api/admin/withdrawals/${redemptionId}/${verb}`,
    { method: "POST" },
  );
  return { ok: res.ok };
}

export async function adminDashboardLoader({ request }: Route.LoaderArgs) {
  return loadDashboardData(request);
}

export async function adminDashboardAction({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = form.get("intent");
  const redemptionId = form.get("redemptionId");
  return decideRedemption(
    request,
    typeof intent === "string" ? intent : null,
    typeof redemptionId === "string" ? redemptionId : null,
  );
}