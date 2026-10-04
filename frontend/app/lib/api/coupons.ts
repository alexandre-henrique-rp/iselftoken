/**
 * Tipos e utilitários do domínio de cupons.
 * Os campos refletem Coupon/CouponUsage do schema SQLite.
 */

export interface Coupon {
  id: number;
  code: string;
  percent: number;
  active: boolean;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED" | "EXHAUSTED";
  maxUses: number | null;
  usedCount: number;
  /** Projeções derivadas do vínculo CouponUsage → Payment. */
  confirmedCount?: number;
  reservedCount?: number;
  availableCount?: number | null;
  validFrom: string | null;
  validUntil: string | null;
  description: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
}

export interface CouponSummary {
  id: number;
  code: string;
  percent: number;
  active: boolean;
  maxUses: number | null;
  usedCount: number;
  validUntil: string | null;
}

export interface AvailableCoupon {
  id: number;
  code: string;
  percent: number;
  validUntil: string | null;
  isExhausted: boolean;
  isExpired: boolean;
}

/** Uso de cupom para consulta administrativa. */
export type CouponUsageStatus = "CONFIRMED" | "RESERVED" | "RELEASED";

export interface CouponUsage {
  userId: string;
  userName: string;
  paymentStatus: "PENDING" | "PAID" | "CANCELED" | "REFUNDED" | null;
  paidAt: string | null;
  usageStatus: CouponUsageStatus;
  discountAmount: number;
  usedAt: string;
}

export interface CouponUsageHistory extends PaginatedResponse<CouponUsage> {
  historicalTotal: number;
  confirmedCount: number;
  reservedCount: number;
  availableCount: number | null;
}

export interface CouponAuditEntry {
  action: string;
  actor: string;
  actorId: string | null;
  timestamp: string;
  ip: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface HeroCoupon extends AvailableCoupon {}

/** Histórico pessoal de uso. */
export interface MyCouponUsage {
  couponCode: string;
  percent: number;
  discountAmount: number;
  appliedAt: string;
  paymentStatus: CouponUsage["paymentStatus"];
  paidAt: string | null;
  usageStatus: CouponUsageStatus;
}

export interface CreateCouponInput {
  code: string;
  percent: number;
  maxUses: number | null;
  validFrom: string | null;
  validUntil: string | null;
  description: string;
}

export interface CouponFilters {
  status?: "active" | "inactive" | "exhausted" | "expired" | "all";
  percent?: number | "all";
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type CouponErrorCode =
  | "cupom_nao_encontrado"
  | "cupom_inativo"
  | "cupom_expirado"
  | "cupom_ainda_nao_valido"
  | "cupom_esgotado"
  | "cupom_ja_aplicado"
  | "pagamento_com_cupom_aplicado"
  | "pagamento_nao_pendente"
  | "cobranca_ja_emitida"
  | "pagamento_expirado"
  | "pagamento_valor_invalido";

export const COUPON_ERRORS_CATALOG: Record<
  CouponErrorCode,
  { message: string; canRetry: boolean }
> = {
  cupom_nao_encontrado: {
    message: "Este cupom não existe. Verifique o código e tente novamente.",
    canRetry: false,
  },
  cupom_inativo: {
    message: "Este cupom está desativado. Procure outro cupom válido.",
    canRetry: false,
  },
  cupom_expirado: {
    message: "Este cupom expirou. Procure outro cupom válido.",
    canRetry: false,
  },
  cupom_ainda_nao_valido: {
    message: "Este cupom ainda não está válido.",
    canRetry: false,
  },
  cupom_esgotado: {
    message: "Este cupom já atingiu o limite de usos.",
    canRetry: false,
  },
  cupom_ja_aplicado: {
    message: "Este cupom já foi aplicado a este pagamento.",
    canRetry: false,
  },
  pagamento_com_cupom_aplicado: {
    message:
      "Este pagamento já possui um cupom aplicado. Crie uma nova ordem para usar outro cupom.",
    canRetry: false,
  },
  pagamento_nao_pendente: {
    message:
      "O pagamento não está mais pendente — cupom não pode ser aplicado.",
    canRetry: false,
  },
  cobranca_ja_emitida: {
    message:
      "O cupom só pode ser aplicado enquanto o pagamento estiver pendente.",
    canRetry: false,
  },
  pagamento_expirado: {
    message: "Este pagamento expirou. Crie uma nova ordem para continuar.",
    canRetry: false,
  },
  pagamento_valor_invalido: {
    message: "Este pagamento possui um valor inválido para aplicar o cupom.",
    canRetry: false,
  },
};

export const PERCENT_WHITELIST = [20, 30, 50, 60, 100] as const;
export type PercentValue = (typeof PERCENT_WHITELIST)[number];

export interface ApplyCouponInput {
  couponCode: string;
  paymentId: number;
}

export interface CouponPaymentCompletion {
  type: "COUPON_100";
  effectsPending: boolean;
}

export interface AppliedCouponPayment {
  id: number;
  amount: number;
  status: "PENDING" | "PAID" | "CANCELED" | "REFUNDED";
  paidAt: string | null;
}

export interface ApplyCouponResult {
  success: boolean;
  discountAmount?: number;
  newTotal?: number;
  coupon?: {
    code: string;
    percent?: number;
  };
  completion?: CouponPaymentCompletion;
  payment?: AppliedCouponPayment;
}

export function validateCouponCode(code: string): boolean {
  return /^[A-Z0-9_\-]{3,32}$/.test(code.toUpperCase());
}

export function formatExpiryDate(dateStr: string | null): string {
  if (!dateStr) return "Sem expiração";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function getCouponStatus(coupon: Coupon): Coupon["status"] {
  if (!coupon.active) return "INACTIVE";
  if (coupon.validFrom && new Date(coupon.validFrom) > new Date()) {
    return "INACTIVE";
  }
  if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
    return "EXPIRED";
  }

  const occupiedCount = coupon.usedCount + (coupon.reservedCount ?? 0);
  if (coupon.maxUses !== null && occupiedCount >= coupon.maxUses) {
    return "EXHAUSTED";
  }

  return coupon.status ?? "ACTIVE";
}
