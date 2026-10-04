import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";

export interface TransactionRow {
  id: number;
  amount: number | string;
  method: string;
  purpose: string;
  status: "PENDING" | "PAID" | "CANCELED" | "REFUNDED";
  txid: string | null;
  paidAt: string | null;
  createdAt: string;
  user: { id: number; email: string; nome: string };
  subscription: {
    id: number;
    status: string;
    plan: { id: number; nome: string; slug: string };
  } | null;
}

interface TransactionListResponse {
  error: boolean;
  message: string;
  codigo: number;
  data: TransactionRow[];
  total: number;
  pagina: number;
}

export interface TransactionFilters {
  page?: number;
  status?: string;
  method?: string;
  purpose?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

function buildQueryString(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("limit", "25");
  if (filters.status) params.set("status", filters.status);
  if (filters.method) params.set("method", filters.method);
  if (filters.purpose) params.set("purpose", filters.purpose);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.search) params.set("search", filters.search);
  return params.toString();
}

async function fetchTransactions(
  filters: TransactionFilters,
): Promise<TransactionListResponse> {
  const qs = buildQueryString(filters);
  const res = await fetch(`/api/admin/financeiro/transactions?${qs}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Erro ao carregar transações: ${res.status}`);
  }
  return res.json();
}

export function useAdminFinanceiroTransactionsQuery(filters: TransactionFilters) {
  return useQuery<TransactionListResponse>({
    queryKey: queryKeys.adminFinanceiroTransactions(filters),
    queryFn: () => fetchTransactions(filters),
    staleTime: 30_000,
  });
}
