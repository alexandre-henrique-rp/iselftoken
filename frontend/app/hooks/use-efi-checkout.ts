/**
 * useEfiCheckout — Hook principal para checkout EFI
 *
 * Fluxo:
 * 1. POST /api/checkout/efi/create → cria sessão checkout
 * 2. Polling 3s para status (PENDING → PENDING_3DS → PAID)
 * 3. Confirmação PIX ou cartão tokenizado
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  EfICheckoutSession,
  EfIPaymentStatus,
  PaymentStatus,
} from "~/lib/api/efi";
import { EFI_ERRORS_CATALOG, type EfIErrorCode } from "~/lib/api/efi";
import { queryKeys } from "~/lib/queries";

// ─── Query Options ────────────────────────────────────────────────────────────

export interface CreateCheckoutInput {
  paymentId: string;
  method: "PIX" | "CARD";
}

export interface CheckoutSessionOptions {
  checkoutId: string;
  paymentId: string;
  enabled?: boolean;
}

function checkoutSessionQueryOptions({
  checkoutId,
  paymentId,
  enabled = true,
}: CheckoutSessionOptions) {
  return queryOptions({
    queryKey: queryKeys.efi.checkout(paymentId, checkoutId),
    queryFn: async (): Promise<EfICheckoutSession> => {
      const res = await fetch(
        `/api/checkout/efi/session?checkoutId=${checkoutId}&paymentId=${paymentId}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ code: "erro_generico" }));
        throw err;
      }
      return res.json();
    },
    enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      // Polling 3s enquanto PENDING ou PENDING_3DS
      if (data.status === "PENDING" || data.status === "PENDING_3DS") {
        return 3000;
      }
      return false;
    },
  });
}

function paymentStatusQueryOptions(paymentId: string, enabled = true) {
  return queryOptions({
    queryKey: queryKeys.efi.status(paymentId),
    queryFn: async (): Promise<EfIPaymentStatus> => {
      const res = await fetch(`/api/checkout/efi/status/${paymentId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ code: "erro_generico" }));
        throw err;
      }
      return res.json();
    },
    enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      if (data.status === "PENDING" || data.status === "PENDING_3DS") {
        return 3000;
      }
      return false;
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

async function createCheckoutMutation(
  input: CreateCheckoutInput
): Promise<EfICheckoutSession> {
  const res = await fetch("/api/checkout/efi/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ code: "erro_generico" }));
    throw err;
  }
  return res.json();
}

async function confirmPixMutation(
  checkoutId: string
): Promise<{ success: boolean; status: PaymentStatus }> {
  const res = await fetch("/api/checkout/efi/confirm-pix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ checkoutId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ code: "erro_generico" }));
    throw err;
  }
  return res.json();
}

async function confirmCardMutation(data: {
  checkoutId: string;
  token: string;
  installments: number;
  brand: string;
}): Promise<{ success: boolean; status: PaymentStatus; authenticationUrl?: string }> {
  const res = await fetch("/api/checkout/efi/confirm-card", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ code: "erro_generico" }));
    throw err;
  }
  return res.json();
}

async function regeneratePixMutation(paymentId: string): Promise<EfICheckoutSession> {
  const res = await fetch("/api/checkout/efi/regenerate-pix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ code: "erro_generico" }));
    throw err;
  }
  return res.json();
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useCreateCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCheckoutMutation,
    onSuccess: (_data, variables) => {
      // Armazena com a paymentId do input, não da resposta (resposta não contém paymentId)
      queryClient.setQueryData(["efi-checkout", variables.paymentId, _data.checkoutId], _data);
    },
    onError: (err: { code?: string }) => {
      const code = (err.code as EfIErrorCode) || "erro_generico";
      const efiError = EFI_ERRORS_CATALOG[code] || EFI_ERRORS_CATALOG.erro_generico;
      toast.error(efiError.message, { richColors: true });
    },
  });
}

export function useCheckoutSession(opts: CheckoutSessionOptions) {
  return useQuery(checkoutSessionQueryOptions(opts));
}

export function usePaymentStatus(paymentId: string, enabled = true) {
  return useQuery(paymentStatusQueryOptions(paymentId, enabled));
}

export function useConfirmPix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: confirmPixMutation,
    onSuccess: (data, vars) => {
      // Refresh session data
      queryClient.invalidateQueries({ queryKey: queryKeys.efi.allCheckout });
    },
    onError: (err: { code?: string }) => {
      const code = (err.code as EfIErrorCode) || "erro_generico";
      const efiError = EFI_ERRORS_CATALOG[code] || EFI_ERRORS_CATALOG.erro_generico;
      toast.error(efiError.message, { richColors: true });
    },
  });
}

export function useConfirmCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: confirmCardMutation,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.efi.allCheckout });
      queryClient.invalidateQueries({ queryKey: queryKeys.efi.allStatus });
    },
    onError: (err: { code?: string }) => {
      const code = (err.code as EfIErrorCode) || "erro_generico";
      const efiError = EFI_ERRORS_CATALOG[code] || EFI_ERRORS_CATALOG.erro_generico;
      toast.error(efiError.message, { richColors: true });
    },
  });
}

export function useRegeneratePix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: regeneratePixMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.efi.allCheckout });
      toast.success("Novo QR Code PIX gerado!", { richColors: true });
    },
    onError: (err: { code?: string }) => {
      const code = (err.code as EfIErrorCode) || "erro_generico";
      const efiError = EFI_ERRORS_CATALOG[code] || EFI_ERRORS_CATALOG.erro_generico;
      toast.error(efiError.message, { richColors: true });
    },
  });
}
