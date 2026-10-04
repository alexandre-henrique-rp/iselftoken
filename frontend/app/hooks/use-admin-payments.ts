import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";

/**
 * Hooks para o painel admin de Ordens e Pagamentos.
 *
 * No iSelfToken, "ordem de servico" === `Payment` com `purpose` de servico
 * (VERIFICATION_SEAL, COMPLIANCE_FEE, FAST_TRACK_REVIEW,
 * TOKEN_RESERVATION_EXTENSION, EARLY_ACCESS). Esta pagina lista
 * pagamentos com esses purposes + SUBSCRIPTION/INVESTMENT/TOKEN_RESERVATION
 * para o admin auditar o fluxo financeiro.
 */

export type PaymentMethod = "PIX" | "CREDIT_CARD" | "WALLET";
export type PaymentStatus = "PENDING" | "PAID" | "CANCELED" | "REFUNDED" | "EXPIRED";

export interface AdminPayment {
  id: number;
  amount: number | string;
  method: PaymentMethod;
  purpose: string;
  status: PaymentStatus;
  userId: number;
  paidAt: string | null;
  createdAt: string;
  originalAmount?: number | string | null;
  discountAmount?: number | string | null;
  paidAmount?: number | string | null;
  txid?: string | null;
  endToEndId?: string | null;
  expiresAt?: string | null;
  effectsAppliedAt?: string | null;
  user?: {
    id: number;
    email: string;
    nome: string;
    role?: string;
  } | null;
}

export interface PaymentsResponse {
  data: AdminPayment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaymentsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: PaymentStatus | "";
  purpose?: string;
}

async function fetchAdminPayments(
  params: PaymentsQuery,
): Promise<PaymentsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.purpose) qs.set("purpose", params.purpose);

  const res = await fetch(`/api/admin/payments${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    return {
      data: [],
      total: 0,
      page: 1,
      limit: 25,
      totalPages: 0,
    };
  }
  const json = await res.json().catch(() => null);
  // O BFF (admin.payments.ts) desembrulha o envelope ResponseDto e devolve
  // o body cru — shape: { data: [...], total, pagina }. Mas o backend
  // tambem pode responder direto (sem envelope) dependendo do path.
  // Aceitamos os 2 shapes:
  const root = (json ?? {}) as
    | AdminPayment[]
    | {
        data?: AdminPayment[];
        total?: number;
        pagina?: number;
        page?: number;
        totalPages?: number;
        limit?: number;
      };
  const body = Array.isArray(root) ? { data: root } : root;
  const items = (Array.isArray(body.data) ? body.data : []) as AdminPayment[];
  const total =
    typeof body.total === "number"
      ? body.total
      : typeof body.data === "object" && Array.isArray(body.data)
        ? body.data.length
        : 0;
  const backendPage =
    typeof body.page === "number"
      ? body.page
      : typeof body.pagina === "number"
        ? body.pagina
        : 1;
  const backendLimit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 25;
  const backendTotalPages =
    typeof body.totalPages === "number" && body.totalPages > 0
      ? body.totalPages
      : Math.ceil(total / backendLimit);
  return {
    data: items,
    total,
    page: backendPage,
    limit: backendLimit,
    totalPages: backendTotalPages,
  };
}

export function useAdminPayments(params: PaymentsQuery = {}) {
  return useQuery({
    queryKey: queryKeys.payments.adminList,
    queryFn: () => fetchAdminPayments(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

interface UpdatePaymentPayload {
  status: PaymentStatus;
}

export function useUpdatePaymentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdatePaymentPayload & { id: number }) => {
      const res = await fetch(`/api/admin/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        throw new Error(json?.message ?? "Erro ao atualizar pagamento");
      }
      return json.data as AdminPayment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.payments.adminList }),
  });
}
