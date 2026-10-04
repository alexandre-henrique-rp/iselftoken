export type ReservationContext = {
  kind: "STARTUP_RESERVATION";
  displayName: string | null;
  nameSource: "PERSISTED_STARTUP" | "DRAFT_PAYLOAD" | "NONE";
  startup: { slug: string | null; displayName: string | null } | null;
  campaign: { title: string | null } | null;
  /** Quantidade de tokens reservados (null em payloads antigos). */
  totalTokens?: number | null;
};

export type CouponSettlement = {
  type: "COUPON_100";
  couponId?: number;
  percent?: number;
  settledAt: string;
};

export type PaymentSummary = {
  id: number;
  amount: number;
  method: "PIX" | "CREDIT_CARD";
  purpose: string;
  status: "PENDING" | "PAID" | "CANCELED" | "REFUNDED";
  txid: string | null;
  qrCodeBase64: string | null;
  copyPastePix: string | null;
  paidAt: string | null;
  expiresAt: string | null;
  effectsAppliedAt: string | null;
  /// Breakdown financeiro do item (S18.6 — auditoria + relatórios admin).
  /// `originalAmount` é o valor cheio antes de qualquer desconto;
  /// `discountAmount` é o desconto aplicado a ESTE item;
  /// `paidAmount` é o valor efetivamente pago (= originalAmount - discountAmount).
  /// Em fluxos sem desconto, são iguais a `amount`.
  originalAmount?: number | null;
  discountAmount?: number | null;
  paidAmount?: number | null;
  /// S18.6 — quando este Payment é TOKEN_RESERVATION e o founder contratou
  /// Fast Track Review, este campo traz o resumo do Payment irmão
  /// (FAST_TRACK_REVIEW) que compartilha o mesmo txid PIX. O checkout
  /// renderiza ambos os produtos no resumo do pedido, com o valor total
  /// consolidado. `null` quando não há Fast Track ou o Payment consultado
  /// não é TOKEN_RESERVATION.
  ///
  /// `originalAmount`/`discountAmount` permitem que o checkout exiba o
  /// preço original riscado + preço com desconto ao lado de cada item
  /// (importante para transparência — LGPD + clareza de cobrança).
  fastTrackPayment?: {
    id: number;
    purpose: string;
    amount: number;
    originalAmount: number | null;
    discountAmount: number | null;
    status: string;
    paidAt: string | null;
  } | null;
  // S18.7 — PaymentOrder + Items (source-of-truth do estado). Presente
  // quando o Payment tem paymentGroupId e foi criado/migrado para o novo
  // modelo Order+Items. Consumers devem preferir `order.items[]` quando
  // disponível; caso contrário, caem no fallback dos campos espelhados
  // + fastTrackPayment/fastDeployPayment.
  order?: {
    id: number;
    status: string;
    method: "PIX" | "CREDIT_CARD";
    totalAmount: number;
    totalOriginal: number;
    totalDiscount: number;
    couponCode: string | null;
    couponPercent: number | null;
    txid: string | null;
    efiChargeId: string | null;
    paidAt: string | null;
    expiresAt: string | null;
  };
  items?: Array<{
    id: number;
    purpose: string;
    description: string | null;
    unitPrice: number;
    quantity: number;
    subtotal: number;
    originalSubtotal: number;
    discountAmount: number;
  }>;
  /// Produto irmão "Publicação Rápida" (FAST_DEPLOY) do checkout consolidado
  /// da Taxa de Compliance (COMPLIANCE_FEE + FAST_DEPLOY no mesmo txid PIX).
  /// `null` quando não há Publicação Rápida ou o Payment não é COMPLIANCE_FEE.
  fastDeployPayment?: {
    id: number;
    purpose: string;
    amount: number;
    originalAmount: number | null;
    discountAmount: number | null;
    status: string;
    paidAt: string | null;
  } | null;
  investmentId: number | null;
  investment?: {
    id: number;
    status: string;
    amount: number;
    tokensQty: number;
    /**
     * Split financeiro persistido (Modelo B). `amount`/`tokenSubtotal` é o
     * subtotal de tokens (qty × preço de venda); `platformFeeAmount` é a
     * taxa cobrada por cima; `Payment.amount` = subtotal + taxa.
     * Campos null em investimentos legados (pré-split).
     */
    tokenBasePrice?: number | null;
    tokenSellPrice?: number | null;
    tokenSubtotal?: number | null;
    platformFeePct?: number | null;
    platformFeeAmount?: number | null;
    startupRepasseAmount?: number | null;
    platformSpreadAmount?: number | null;
    platformRevenueAmount?: number | null;
    campaign?: {
      id: number;
      title: string;
      startup?: { id: number; nome: string; slug: string };
    };
  } | null;
  subscription?: {
    plan?: {
      slug?: string | null;
      name?: string | null;
      description?: string | null;
    } | null;
  } | null;
  reservationContext: ReservationContext | null;
  serviceDetails?: {
    couponCode?: string;
    couponId?: number;
    percent?: number;
    discountApplied?: number;
    couponSettlement?: CouponSettlement;
  } | null;
};

export function isCouponIntegralPayment(payment: PaymentSummary): boolean {
  return (
    payment.status === "PAID" &&
    Number(payment.amount) === 0 &&
    payment.serviceDetails?.couponSettlement?.type === "COUPON_100"
  );
}

/**
 * Normaliza o método de pagamento para um dos valores canônicos do enum
 * `PaymentMethod` (`PIX` | `CREDIT_CARD` | `WALLET`). Aceita entradas em
 * qualquer capitalização e valores legados em pt-BR.
 */
export function normalizePaymentMethod(method: string | null | undefined):
  | "PIX"
  | "CREDIT_CARD"
  | "WALLET"
  | null {
  if (!method) return null;
  const upper = method.toUpperCase().trim();
  if (upper === "PIX") return "PIX";
  if (upper === "CREDIT_CARD" || upper === "CARTAO" || upper === "CARTÃO") {
    return "CREDIT_CARD";
  }
  if (upper === "WALLET") return "WALLET";
  return null;
}

/** Label PT-BR para exibição no UI (ex.: `/user/payments`). */
export function getPaymentMethodLabel(
  method: string | null | undefined,
): string {
  const normalized = normalizePaymentMethod(method);
  if (normalized === "CREDIT_CARD") return "Cartão de crédito";
  if (normalized === "PIX") return "PIX";
  if (normalized === "WALLET") return "Carteira";
  return method && method.length > 0 ? method : "—";
}

/** Helper booleano para ramificar UI por método (ícones, CTAs, etc). */
export function isPaymentMethodPix(method: string | null | undefined): boolean {
  return normalizePaymentMethod(method) === "PIX";
}

export type PaymentPresentation = {
  title: string;
  description: string;
  details: string[];
  quantityLabel: string;
  neutral: boolean;
};

const RESERVATION_DESCRIPTION =
  "Taxa para iniciar o cadastro e a análise da startup.";

function subscriptionPresentation(
  payment: PaymentSummary,
): PaymentPresentation {
  return {
    title: payment.subscription?.plan?.name ?? "Token Nexus AI",
    description:
      payment.subscription?.plan?.description ??
      "Acesso à inteligência de mercado",
    details: [],
    quantityLabel: "1 PLANO",
    neutral: false,
  };
}

function investmentPresentation(payment: PaymentSummary): PaymentPresentation {
  const campaign = payment.investment?.campaign;
  const startupName = campaign?.startup?.nome?.trim();
  const inv = payment.investment;

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(v);

  // Breakdown do split (quando persistido): qty × preço de venda = subtotal;
  // taxa da plataforma cobrada por cima. Legado (sem split) mostra apenas a
  // quantidade — o total vem do Payment.amount como sempre.
  const details: string[] = [];
  const qty = Number(inv?.tokensQty ?? 0);
  const sellPrice = Number(inv?.tokenSellPrice ?? 0);
  const subtotal = Number(inv?.tokenSubtotal ?? inv?.amount ?? 0);
  const fee = Number(inv?.platformFeeAmount ?? 0);
  const feePct = Number(inv?.platformFeePct ?? 0);
  if (qty > 0 && sellPrice > 0) {
    details.push(
      `${qty.toLocaleString("pt-BR")} tokens × ${fmt(sellPrice)} = ${fmt(subtotal)}`,
    );
  }
  if (fee > 0) {
    details.push(
      `Taxa da plataforma (${(feePct * 100).toLocaleString("pt-BR", {
        maximumFractionDigits: 2,
      })}%): ${fmt(fee)}`,
    );
  }

  return {
    title: campaign?.title?.trim() || "Investimento",
    description: startupName
      ? `Compra de tokens de ${startupName}.`
      : "Compra de tokens da startup.",
    details,
    quantityLabel:
      qty > 0 ? `${qty.toLocaleString("pt-BR")} TOKENS` : "TOKENS",
    neutral: false,
  };
}

function unknownPurposePresentation(): PaymentPresentation {
  return {
    title: "Pagamento",
    description: "Detalhes do pagamento indisponíveis.",
    details: ["Identificação do pagamento indisponível"],
    quantityLabel: "1 ITEM",
    neutral: true,
  };
}

function reservationPresentation(payment: PaymentSummary): PaymentPresentation {
  const name = payment.reservationContext?.displayName?.trim() || null;
  const campaignTitle = payment.reservationContext?.campaign?.title?.trim();

  return {
    title: name ? `Reserva de token — ${name}` : "Reserva de token",
    description: RESERVATION_DESCRIPTION,
    details: [
      ...(!name ? ["Identificação da startup indisponível"] : []),
      ...(campaignTitle ? [`Rodada: ${campaignTitle}`] : []),
    ],
    quantityLabel:
      payment.reservationContext?.totalTokens != null
        ? `${Number(payment.reservationContext.totalTokens).toLocaleString("pt-BR")} TOKENS`
        : "TOKENS",
    neutral: !name,
  };
}

export function getPaymentPresentation(
  payment: PaymentSummary,
): PaymentPresentation {
  if (payment.purpose === "TOKEN_RESERVATION") {
    return reservationPresentation(payment);
  }

  if (payment.purpose === "COMPLIANCE_FEE") {
    return {
      title: "Taxa de Compliance",
      description:
        "Taxa referente à análise de conformidade da sua startup e da rodada de captação. O pagamento é necessário para iniciar o processo de análise.",
      details: [],
      quantityLabel: "1 taxa",
      neutral: false,
    };
  }

  if (payment.purpose === "FAST_TRACK_REVIEW") {
    // S18.6 — Fast Track Review é um produto adicional no checkout
    // consolidado da reserva de tokens. Aparece como 2º item no
    // resumo do pedido do founder; admin vê este Payment separado
    // do TOKEN_RESERVATION no painel financeiro.
    return {
      title: "Avaliação Rápida (Fast Track Review)",
      description:
        "Análise prioritária da rodada pela equipe de compliance (adicional).",
      details: [
        "Resposta de compliance em até 2 dias úteis.",
        "Prioridade na fila de análise documental e contratual.",
      ],
      quantityLabel: "1 serviço",
      neutral: false,
    };
  }

  if (payment.purpose === "FAST_DEPLOY") {
    // "Publicação Rápida" — produto adicional no checkout consolidado da
    // Taxa de Compliance. Torna a publicação da startup imediata na aprovação
    // da Fase 3 (em vez do delay padrão de 24h).
    return {
      title: "Publicação Rápida",
      description:
        "Publicação imediata da startup no marketplace assim que o Compliance aprovar (sem a espera padrão de 24h).",
      details: [
        "Página pública liberada na hora da aprovação.",
        "Antecipe o início da captação.",
      ],
      quantityLabel: "1 serviço",
      neutral: false,
    };
  }

  if (payment.purpose === "SUBSCRIPTION") {
    return subscriptionPresentation(payment);
  }

  if (payment.purpose === "INVESTMENT") {
    return investmentPresentation(payment);
  }

  return unknownPurposePresentation();
}
