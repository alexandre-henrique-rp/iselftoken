import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type EfiPay from "payment-token-efi";

/** Identificador de conta EFI (payee_code) — público, resolvido em build. */
const EFI_PAYEE_CODE = import.meta.env.VITE_EFI_PAYEE_CODE as string | undefined;

/**
 * Ambiente da tokenização EFI.
 *
 * A detecção por "localhost" na VITE_API_URL é frágil em preview/staging
 * (a URL não tem "localhost" mas ainda é homologação). Por isso aceitamos
 * uma env var explícita `VITE_EFI_ENVIRONMENT` (preferida):
 *
 *   VITE_EFI_ENVIRONMENT=sandbox|production
 *
 * Fallback: se VITE_API_URL contém "localhost" → sandbox, senão production.
 *
 * IMPORTANTE: este valor TEM que bater com `EFI_MODE` do backend
 * (sandbox|prod). Se desalinhar, a EFI gera o token em um ambiente e o
 * backend tenta usar em outro → erro 3500010 "payment_token não existe".
 */
const EFI_ENVIRONMENT: "production" | "sandbox" = (() => {
  const explicit = import.meta.env.VITE_EFI_ENVIRONMENT as
    | "sandbox"
    | "production"
    | undefined;
  if (explicit === "sandbox" || explicit === "production") return explicit;
  return (import.meta.env.VITE_API_URL ?? "").includes("localhost")
    ? "sandbox"
    : "production";
})();

export interface CardFormData {
  number: string; // só dígitos
  holderName: string;
  holderDocument: string; // CPF/CNPJ só dígitos
  expirationMonth: string; // MM
  expirationYear: string; // YYYY
  cvv: string;
  installments: number;
}

interface CardChargeResult {
  paymentId: number;
  chargeId: number;
  status: "PAID";
  installments: number;
  amount: number;
}

function isErrorResponse(
  value: unknown,
): value is EfiPay.CreditCard.ErrorResponse {
  return !!value && typeof value === "object" && "error_description" in value;
}

/**
 * Defesa contra respostas malformadas da lib `payment-token-efi`:
 * se ela devolver `{ payment_token: "" }` ou sem `payment_token`,
 * tratamos como falha de tokenização.
 */
function isEmptyPaymentToken(
  value: unknown,
): value is { payment_token: "" | undefined; card_mask?: string } {
  if (!value || typeof value !== "object") return true;
  const v = value as { payment_token?: unknown };
  return !v.payment_token || String(v.payment_token).trim() === "";
}

/**
 * Tokeniza o cartão no navegador (lib payment-token-efi) e confirma a
 * cobrança no backend via `POST /api/payment/:id/card`.
 *
 * Os dados do cartão NUNCA são enviados ao nosso backend — apenas o
 * `payment_token` gerado pela EFI no cliente.
 */
export function useConfirmCardMutation() {
  return useMutation<
    CardChargeResult,
    Error,
    { paymentId: number; card: CardFormData }
  >({
    mutationFn: async ({ paymentId, card }) => {
      if (!EFI_PAYEE_CODE) {
        throw new Error(
          "Configuração de cartão ausente (VITE_EFI_PAYEE_CODE).",
        );
      }

      const { default: EfiPayRuntime } = await import("payment-token-efi");

      // 1. Detecta a bandeira a partir do número.
      const brand = await EfiPayRuntime.CreditCard.setCardNumber(
        card.number,
      ).verifyCardBrand();

      if (!brand || brand === "undefined" || brand === "unsupported") {
        throw new Error("Bandeira de cartão não suportada.");
      }

      // 2. Gera o payment_token (criptografia no navegador).
      const tokenResult = await EfiPayRuntime.CreditCard.setAccount(EFI_PAYEE_CODE)
        .setEnvironment(EFI_ENVIRONMENT)
        .setCreditCardData({
          brand,
          number: card.number,
          cvv: card.cvv,
          expirationMonth: card.expirationMonth,
          expirationYear: card.expirationYear,
          holderName: card.holderName,
          holderDocument: card.holderDocument,
          reuse: false,
        })
        .getPaymentToken();

      if (isErrorResponse(tokenResult)) {
        throw new Error(
          tokenResult.error_description || "Não foi possível validar o cartão.",
        );
      }

      if (isEmptyPaymentToken(tokenResult)) {
        throw new Error(
          "Token do cartão veio vazio da EFI. Verifique os dados do cartão e tente novamente.",
        );
      }

      // 3. Envia o token + parcelas + documento do titular ao backend.
      // O `cardholderDocument` é o CPF/CNPJ digitado no formulário — o
      // backend usa como fallback para `customer.cpf` quando o usuário
      // logado não tem `reg_documento` no perfil (EFI exige o campo,
      // retorna 3500034 validation_error quando ausente).
      const res = await fetch(`/api/payment/${paymentId}/card`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentToken: tokenResult.payment_token,
          installments: card.installments,
          cardMask: tokenResult.card_mask,
          cardholderDocument: card.holderDocument,
        }),
      });

      const body = await res.json().catch(() => ({ error: true }));
      if (!res.ok || body?.error) {
        throw new Error(
          body?.message ?? "Pagamento com cartão não autorizado.",
        );
      }

      return (body?.data ?? body) as CardChargeResult;
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao processar o cartão.");
    },
  });
}
