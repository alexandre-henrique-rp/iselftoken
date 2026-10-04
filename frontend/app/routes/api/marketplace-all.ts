import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";
import type { PaginatedCatalog } from "~/types/paginated-catalog";

const EMPTY: PaginatedCatalog = {
  data: [],
  total: 0,
  page: 1,
  pageSize: 16,
  hasMore: false,
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const params = url.searchParams.toString();
  const target = params
    ? `${BACKEND_URL}/marketplace/all?${params}`
    : `${BACKEND_URL}/marketplace/all`;

  try {
    const res = await fetch(target);
    const json = (await res.json()) as { data?: PaginatedCatalog };
    return Response.json({ data: json?.data ?? EMPTY });
  } catch {
    return Response.json({ data: EMPTY });
  }
}
