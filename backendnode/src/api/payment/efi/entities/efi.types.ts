/**
 * EFI Bank API Client - Base Types
 *
 * References:
 * - Sandbox: https://api-pix-h.gerencianet.com.br/doc/v2
 * - Production: https:// api-pix.gerencianet.com.br/doc/v2
 */

// ============================================
// EFI Config (Auth)
// ============================================

export interface EfiConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  auth: string; // Basic auth header value (client_id:client_secret base64)
  pixKey: string;
  webhookUrl: string;
  defaultSplitId?: number;
}

export interface EfiTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// ============================================
// EFI Charge (Cobranças) - Credit Card
// ============================================

export interface EfiChargeRequest {
  calendario: {
    expiracao: number; // em segundos
  };
  valor: {
    original: string; // string com 2 decimais "99.99"
    multa?: {
      tipo: 'fixed' | 'percent';
      valor: string;
    };
    juros?: {
      tipo: 'fixed' | 'percent';
      valor: string;
    };
    desconto?: {
      tipo: 'fixed' | 'percent';
      valor: string;
    };
  };
  chave?: string;
  solicitacaoPagador?: string;
  refatura?: string;
}

export interface EfiChargeResponse {
  charge_id: number;
  status: EfiChargeStatus;
  calendario: {
    criacao: string;
    expiracao: number;
  };
  valor: {
    original: string;
  };
  chave?: string;
  locs?: Array<{
    id: number;
    location: string;
    tipoCob: 'cob' | 'cobv';
  }>;
}

export type EfiChargeStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'REFUNDED';

// ============================================
// EFI Cartão de Crédito (API de Cobranças — one-step)
// ============================================

/**
 * Status reais retornados pela API de Cobranças da EFI para cartão.
 * @see https://dev.efipay.com.br/docs/api-cobrancas/cartao
 */
export type EfiCardChargeStatus =
  | 'new' // transação criada, aguardando forma de pagamento
  | 'waiting' // aguardando confirmação
  | 'approved' // aprovado pela operadora (ainda não creditado)
  | 'paid' // pago/creditado
  | 'unpaid' // recusado
  | 'refunded' // estornado
  | 'contested'
  | 'canceled'
  | 'settled'
  | 'link'
  | 'expired';

/** Dados do pagador para cobrança de cartão. */
export interface EfiCardCustomer {
  name: string;
  cpf?: string;
  email: string;
  phone_number?: string;
  birth?: string; // YYYY-MM-DD
  juridical_person?: {
    corporate_name: string;
    cnpj: string;
  };
}

/** Endereço de cobrança opcional. */
export interface EfiCardBillingAddress {
  street: string;
  number: string | number;
  neighborhood: string;
  zipcode: string;
  city: string;
  complement?: string;
  state: string;
}

/** Input para criar cobrança de cartão one-step (uso interno do adapter). */
export interface EfiOneStepCardInput {
  items: Array<{ name: string; value: number; amount: number }>; // value em CENTAVOS
  paymentToken: string;
  installments: number;
  customer: EfiCardCustomer;
  billingAddress?: EfiCardBillingAddress;
  customId?: string; // metadata.custom_id (ex: payment.id)
  notificationUrl?: string;
}

/** Resultado normalizado da cobrança de cartão. */
export interface EfiCardChargeResult {
  chargeId: number;
  status: EfiCardChargeStatus;
  total: number; // centavos
  installments: number;
  installmentValue?: number; // centavos
  reason?: string; // motivo da recusa quando unpaid
  approved: boolean; // true quando status ∈ {approved, paid, settled}
}

// ============================================
// EFI PIX (Immediate) - Direct
// ============================================

export interface EfiPixRequest {
  calendario: {
    expiracao: number; // em segundos
  };
  devedor?: {
    cpf?: string;
    cnpj?: string;
    nome: string;
    email?: string;
  };
  valor: {
    original: string;
  };
  chave: string;
  infoPagador?: string;
  rcv?: {
    enabled: boolean;
    horariolimite?: string; // HH:MM:SS
  };
}

export interface EfiPixResponse {
  txid: string; // 26 caracteres alfanuméricos
  status: EfiPixStatus;
  calendario: {
    criacao?: string;
    expiracao: number;
  };
  devedor?: {
    cpf?: string;
    cnpj?: string;
    nome: string;
    email?: string;
  };
  valor: {
    original: string;
  };
  chave?: string;
  /** URL de localização (loc.location) da cobrança PIX. */
  location?: string;
  /** ID do location (loc.id) usado para gerar o QR Code. */
  locId?: number;
  /**
   * BR Code copia-e-cola (EMV) para pagamento PIX.
   * Vem de `pixCopiaECola` da cobrança ou de `qrcode` do QR Code.
   */
  pixCopiaECola?: string;
  /**
   * Imagem do QR Code em data URI base64 (`data:image/png;base64,...`),
   * retornada por `pixGenerateQRCode` (campo `imagemQrcode`).
   */
  qrCodeImage?: string;
  pix?: Array<{
    valor: string;
    horarios: {
      operacao: string;
    };
    infoPagador?: string;
  }>;
}

export type EfiPixStatus =
  | 'ATIVA'
  | 'CONCLUIDA'
  | 'REMOVIDA_PELO_USUARIO_RECEBEDOR'
  | 'REMOVIDA_PELO_PSP'
  | 'QUITADA';

// ============================================
// EFI Webhook
// ============================================

export interface EfiWebhookPayload {
  bancoHId: string;
  chave: string;
  txid?: string;
  charge_id?: number;
  valor?: string;
  horario?: string;
  tipoOperacao?: string;
  infoPagador?: string;
}

export interface EfiWebhookEvent {
  webhook?: {
    id: number;
    criacao: string;
    subscribe?: boolean;
  };
  pix?: EfiWebhookPayload[];
  pixCopiaECola?: string;
}

// ============================================
// EFI Location (QR Code)
// ============================================

export interface EfiLocationResponse {
  id: number;
  location: string;
  tipoCob: 'cob' | 'cobv';
  criacao: string;
}

// ============================================
// EFI Split
// ============================================

export interface EfiSplitRequest {
  granularidade: 'TOTAL' | 'TRANSAÇÃO';
  retencoes?: Array<{
    cnpj: string;
    valor: string | number;
    percentual?: number;
  }>;
}

export interface EfiSplitResponse {
  id: number;
  nome: string;
  granularidade: string;
  retencoes: Array<{
    cnpj: string;
    valor: number;
    tipo: string;
    percentual?: number;
  }>;
  criacao: string;
  atualizar: boolean;
}

// ============================================
// EFI Account Opening
// ============================================

export interface EfiAccountHolder {
  tipo: 'PF' | 'PJ';
  nome: string;
  email: string;
  phone: string;
  cpfCnpj: string;
  // PF
  cnh?: string;
  birthDate?: string;
  // PJ
  companyName?: string;
  fantasyName?: string;
  ie?: string;
  foundingDate?: string;
}

export interface EfiAccountOpeningRequest {
  titular: EfiAccountHolder;
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: 'checking' | 'savings';
}

export interface EfiAccountOpeningResponse {
  id: string;
  status: EfiAccountOpeningStatus;
  criadoEm: string;
}

export type EfiAccountOpeningStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';
