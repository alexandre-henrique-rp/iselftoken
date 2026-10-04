import { dehydrate } from "@tanstack/react-query";
import { adminUsersQueryOptions, type AdminUsersList, type AdminUsersQueryParams } from "~/lib/queries";
import { createQueryClient } from "~/lib/query-client";
import { serverFetch } from "~/lib/server-fetch";

export type ComplianceUsersFilters = AdminUsersQueryParams & {
  page: number;
  limit: number;
};

const PAGE_LIMIT = 25;

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function optionalParam(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export async function loadComplianceUsers(request: Request) {
  const url = new URL(request.url);
  const filters: ComplianceUsersFilters = {
    page: positiveInteger(url.searchParams.get("page"), 1),
    limit: PAGE_LIMIT,
    search: optionalParam(
      url.searchParams.get("search") ?? url.searchParams.get("q"),
    ),
    role: optionalParam(url.searchParams.get("role")),
    kycStatus: optionalParam(
      url.searchParams.get("kycStatus") ?? url.searchParams.get("kyc"),
    ),
  };

  const query = adminUsersQueryOptions(filters);
  const queryString = new URLSearchParams();
  queryString.set("page", String(filters.page));
  queryString.set("limit", String(filters.limit));
  if (filters.search) queryString.set("search", filters.search);
  if (filters.role) queryString.set("role", filters.role);
  if (filters.kycStatus) queryString.set("kycStatus", filters.kycStatus);

  const response = await serverFetch(
    request,
    `/api/admin/users?${queryString.toString()}`,
  );
  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    throw new Response(body?.message ?? "Não foi possível carregar usuários.", {
      status: response.ok ? 502 : response.status,
    });
  }

  if (!Array.isArray(body?.data) || !Number.isFinite(Number(body?.total))) {
    throw new Response("Resposta inválida do servidor.", { status: 502 });
  }

  const result: AdminUsersList = {
    data: body.data,
    total: Number(body.total),
    pagina: Number(body.pagina) || filters.page,
  };
  const queryClient = createQueryClient();
  queryClient.setQueryData(query.queryKey, result);

  return {
    dehydratedState: dehydrate(queryClient),
    filters,
  };
}
