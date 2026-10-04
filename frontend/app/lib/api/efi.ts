/**
 * EFI Payment API Client
 * SDK cliente para operações de checkout transparente EFI
 *
 * PCI-DSS SAQ A: PAN nunca toca o backend IselfToken — tokenização via SDK JS EFI iframe
 */

export type PaymentMethod = "PIX" | "CARD";

export type PaymentStatus =
  | "PENDING"
  | "PENDING_3DS"
  | "PAID"
  | "EXPIRED"
  | "CANCELLED"
  | "FAILED";

/** Resposta da criação de sessão checkout EFI */
export interface EfICheckoutSession {
  checkoutId: string;
  efiChargeId: string;
  qrCodeBase64?: string; // Só para PIX
  copyPastePix?: string; // Só para PIX
  expiresAt: string; // ISO 8601
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  authenticationUrl?: string; // Para 3DS (card)
}

/** Confirmação PIX — retorno imediato */
export interface EfIPixConfirmResponse {
  success: boolean;
  txid: string;
  status: PaymentStatus;
}

/** Confirmação cartão — pode requerir 3DS */
export interface EfICardConfirmResponse {
  success: boolean;
  status: PaymentStatus;
  authenticationUrl?: string; // Para 3DS redirect
  transactionId?: string;
}

/** Status do pagamento (polling) */
export interface EfIPaymentStatus {
  status: PaymentStatus;
  paymentId: string;
  efiChargeId: string;
  txid?: string;
  endToEndId?: string;
  paidAt?: string;
  amount: number;
  method: PaymentMethod;
}

/** Dados do cartão tokenizado (retornados pelo SDK EFI) */
export interface EfITokenizedCard {
  brand: "VISA" | "MASTERCARD" | "ELO" | "AMEX" | "UNKNOWN";
  token: string; // Token EFI (não o PAN)
  last4: string;
  expMonth: number;
  expYear: number;
}

/** Dados para confirmação de cartão */
export interface EfICardPaymentData {
  token: string; // Token EFI do SDK
  installments: number; // 1-12
  brand: EfITokenizedCard["brand"];
}

/** Erro EFI mapeado para o frontend */
export interface EfIError {
  code: EfIErrorCode;
  message: string;
  variant: "default" | "retryable" | "critical";
  canRetry: boolean;
}

export type EfIErrorCode =
  | "cartao_recusado"
  | "cartao_vencido"
  | "cartao_bloqueado"
  | "cvv_invalido"
  | "autenticacao_3ds_falhou"
  | "cobranca_expirada"
  | "chave_pix_invalida"
  | "efi_indisponivel"
  | "valor_invalido"
  | "token_oauth_invalido"
  | "erro_generico";

/** Catálogo de erros EFI (SPEC §6.1.2) */
export const EFI_ERRORS_CATALOG: Record<EfIErrorCode, EfIError> = {
  cartao_recusado: {
    code: "cartao_recusado",
    message: "Cartão recusado. Tente outro cartão ou escolha PIX.",
    variant: "retryable",
    canRetry: true,
  },
  cartao_vencido: {
    code: "cartao_vencido",
    message: "Cartão vencido. Use outro cartão válido.",
    variant: "retryable",
    canRetry: false,
  },
  cartao_bloqueado: {
    code: "cartao_bloqueado",
    message: "Cartão bloqueado. Entre em contato com seu banco ou use outro cartão.",
    variant: "retryable",
    canRetry: false,
  },
  cvv_invalido: {
    code: "cvv_invalido",
    message: "CVV inválido. Verifique o código de segurança.",
    variant: "retryable",
    canRetry: true,
  },
  autenticacao_3ds_falhou: {
    code: "autenticacao_3ds_falhou",
    message: "Falha na autenticação 3D Secure. Tente novamente.",
    variant: "retryable",
    canRetry: true,
  },
  cobranca_expirada: {
    code: "cobranca_expirada",
    message: "Cobrança PIX expirada. Gere um novo QR Code.",
    variant: "retryable",
    canRetry: true,
  },
  chave_pix_invalida: {
    code: "chave_pix_invalida",
    message: "Chave PIX inválida. Entre em contato com o suporte.",
    variant: "critical",
    canRetry: false,
  },
  efi_indisponivel: {
    code: "efi_indisponivel",
    message: "Sistema temporariamente indisponível. Tente novamente em alguns minutos.",
    variant: "critical",
    canRetry: true,
  },
  valor_invalido: {
    code: "valor_invalido",
    message: "Valor inválido para esta transação.",
    variant: "critical",
    canRetry: false,
  },
  token_oauth_invalido: {
    code: "token_oauth_invalido",
    message: "Sessão expirada. Faça login novamente.",
    variant: "default",
    canRetry: true,
  },
  erro_generico: {
    code: "erro_generico",
    message: "Não foi possível processar o pagamento. Tente novamente.",
    variant: "retryable",
    canRetry: true,
  },
};

/**
 * Instala SDK JS EFI no browser (single-load)
 */
export function loadEfiSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById("efi-sdk")) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "efi-sdk";
    script.src = "https://cdn.efipay.com.br/js/efi-pay-v1.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar SDK EFI"));
    document.head.appendChild(script);
  });
}

/**
 * Detecta bandeira do cartão pelo prefixo BIN
 * Baseado nos prefixos oficiais de cada bandeira
 */
export function detectCardBrand(cardNumber: string): EfITokenizedCard["brand"] {
  const cleaned = cardNumber.replace(/\D/g, "");

  // Visa: começa com 4
  if (cleaned.startsWith("4")) return "VISA";
  // MasterCard: 51-55 ou 2221-2720
  if (/^5[1-5]/.test(cleaned)) return "MASTERCARD";
  if (/^2[2-7]/.test(cleaned)) return "MASTERCARD";
  // ELO: 4011, 4312, 4389, 4514, 4573, 5041, 5066-5067, 5090, 6277, 6362, 6363
  if (/^(4011|4312|4389|4514|4573|5041|506[67]|5090|6277|636[23])/.test(cleaned)) return "ELO";
  // Amex: 34 ou 37
  if (/^3[47]/.test(cleaned)) return "AMEX";

  return "UNKNOWN";
}

