import * as jose from "jose";

export type CheckoutPurpose =
  | "SUBSCRIPTION"
  | "INVESTMENT"
  | "TOKEN_RESERVATION"
  | "EARLY_ACCESS"
  | "P2P_BUY";

export type CheckoutPaymentMethod = "PIX" | "CREDIT_CARD" | "BOLETO" | "WALLET";

export type CheckoutProductType = "PLAN" | "TOKEN" | "SERVICE";

export type CheckoutCurrency = "BRL" | "BRA" | string;

export type CheckoutTokenPayload = {
  transactionId: string;
  purpose: CheckoutPurpose;
  method?: CheckoutPaymentMethod;
  amount: number;
  currency: CheckoutCurrency;
  buyer: {
    id?: number;
    name: string;
    email: string;
    document: string;
  };
  product: {
    type: CheckoutProductType;
    name: string;
    description: string;
    quantity: number;
    unitPrice: number;
    metadata?: Record<string, unknown>;
  };
  summary: {
    subtotal: number;
    discount: number;
    fees: number;
    total: number;
    currency: CheckoutCurrency;
  };
  tokens?: {
    qty: number;
    unitPrice: number;
    total: number;
    campaignId?: number | null;
  } | null;
  service?: {
    type: "NONE" | "EARLY_ACCESS" | string;
    metadata?: Record<string, unknown>;
  } | null;
  campaign?: {
    id?: number | null;
  } | null;
  p2p?: {
    orderId?: number | null;
  } | null;
  expiresAt: string;
  createdAt: string;
};

export type CheckoutTokenOptions = {
  expiresIn?: string;
  expiresAt?: string;
};

export type PlanCheckoutInput = {
  subscriptionId: number;
  planName: string;
  description: string;
  unitPrice: number;
  quantity?: number;
  currency?: CheckoutCurrency;
  buyer?: CheckoutTokenPayload["buyer"];
  method?: CheckoutPaymentMethod;
};

export type TokenPurchaseCheckoutInput = {
  tokensQty: number;
  unitPrice: number;
  campaignId?: number | null;
  buyer: CheckoutTokenPayload["buyer"];
  currency?: CheckoutCurrency;
  method?: CheckoutPaymentMethod;
};

const getCheckoutTokenSecret = () => {
  const secret = process.env.COOKIE_SECRET;
  return new TextEncoder().encode(secret);
};

const formatISO = (date: Date) => date.toISOString();

const normalizeSummary = (
  subtotal: number,
  discount = 0,
  fees = 0,
  currency: CheckoutCurrency = "BRL",
) => {
  const total = subtotal - discount + fees;
  return {
    subtotal,
    discount,
    fees,
    total,
    currency,
  };
};

/**
 * @name createCheckoutToken
 * @description Criptografa o payload de checkout em formato JWT (JWE).
 *
 * @param {CheckoutTokenPayload} payload - Dados completos do checkout.
 * @param {CheckoutTokenOptions} options - Opções de expiração do token.
 * @returns {Promise<string>} Token criptografado.
 */
export async function createCheckoutToken(
  payload: CheckoutTokenPayload,
  options: CheckoutTokenOptions = {},
): Promise<string> {
  const secret = getCheckoutTokenSecret();
  const expiresAt = options.expiresAt ?? payload.expiresAt;

  let token = new jose.EncryptJWT({ payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setJti(crypto.randomUUID());

  if (expiresAt) {
    // Converte ISO string para timestamp Unix (segundos desde 1970)
    const expDate = new Date(expiresAt);
    const expTimestamp = Math.floor(expDate.getTime() / 1000);
    token = token.setExpirationTime(expTimestamp);
  } else if (options.expiresIn) {
    token = token.setExpirationTime(options.expiresIn);
  } else {
    token = token.setExpirationTime("1h");
  }

  return token.encrypt(secret);
}

/**
 * @name decryptCheckoutToken
 * @description Descriptografa o token de checkout e retorna o payload.
 *
 * @param {string} token - Token criptografado.
 * @returns {Promise<CheckoutTokenPayload | null>} Payload ou null.
 */
export async function decryptCheckoutToken(
  token: string,
): Promise<CheckoutTokenPayload | null> {
  try {
    const secret = getCheckoutTokenSecret();

    // Verifica formato JWE (deve ter 5 partes separadas por .)
    const parts = token.split(".");
    if (parts.length !== 5) {
      return null;
    }

    const { payload } = await jose.jwtDecrypt(token, secret);
    return payload.payload as CheckoutTokenPayload;
  } catch {
    return null;
  }
}

/**
 * @name buildPlanCheckoutPayload
 * @description Monta o payload de checkout para contratação de plano.
 *
 * @param {PlanCheckoutInput} input - Dados do plano e comprador.
 * @returns {CheckoutTokenPayload} Payload do checkout.
 */
export function buildPlanCheckoutPayload(
  input: PlanCheckoutInput,
): CheckoutTokenPayload {
  const quantity = input.quantity ?? 1;
  const subtotal = input.unitPrice * quantity;
  const summary = normalizeSummary(subtotal, 0, 0, input.currency ?? "BRL");
  const now = new Date();
  const buyer =
    input.buyer ??
    ({
      name: "Cliente",
      email: "cliente@iselftoken.com",
      document: "000.000.000-00",
    } satisfies CheckoutTokenPayload["buyer"]);

  return {
    transactionId: `txn_${crypto.randomUUID()}`,
    purpose: "SUBSCRIPTION",
    method: input.method,
    amount: summary.total,
    currency: summary.currency,
    buyer,
    product: {
      type: "PLAN",
      name: input.planName,
      description: input.description,
      quantity,
      unitPrice: input.unitPrice,
      metadata: {
        subscriptionId: input.subscriptionId,
      },
    },
    summary,
    tokens: null,
    service: { type: "NONE", metadata: {} },
    campaign: { id: null },
    p2p: { orderId: null },
    createdAt: formatISO(now),
    expiresAt: formatISO(new Date(now.getTime() + 60 * 60 * 1000)),
  };
}

/**
 * @name buildTokenPurchasePayload
 * @description Monta o payload de checkout para compra de tokens.
 *
 * @param {TokenPurchaseCheckoutInput} input - Dados da compra de tokens.
 * @returns {CheckoutTokenPayload} Payload do checkout.
 */
export function buildTokenPurchasePayload(
  input: TokenPurchaseCheckoutInput,
): CheckoutTokenPayload {
  const subtotal = input.unitPrice * input.tokensQty;
  const summary = normalizeSummary(subtotal, 0, 0, input.currency ?? "BRL");
  const now = new Date();

  return {
    transactionId: `txn_${crypto.randomUUID()}`,
    purpose: "INVESTMENT",
    method: input.method,
    amount: summary.total,
    currency: "BRL",
    buyer: input.buyer,
    product: {
      type: "TOKEN",
      name: "Compra de Tokens",
      description: "Aquisição de tokens da plataforma",
      quantity: input.tokensQty,
      unitPrice: input.unitPrice,
      metadata: {
        campaignId: input.campaignId ?? null,
      },
    },
    summary,
    tokens: {
      qty: input.tokensQty,
      unitPrice: input.unitPrice,
      total: summary.total,
      campaignId: input.campaignId ?? null,
    },
    service: { type: "NONE", metadata: {} },
    campaign: { id: input.campaignId ?? null },
    p2p: { orderId: null },
    createdAt: formatISO(now),
    expiresAt: formatISO(new Date(now.getTime() + 60 * 60 * 1000)),
  };
}

/**
 * @name createPlanCheckoutToken
 * @description Gera o token de checkout para contratação de plano.
 *
 * @param {PlanCheckoutInput} input - Dados do plano.
 * @returns {Promise<string>} Token criptografado.
 */
export async function createPlanCheckoutToken(
  input: PlanCheckoutInput,
): Promise<string> {
  const payload = buildPlanCheckoutPayload(input);
  return createCheckoutToken(payload, { expiresAt: payload.expiresAt });
}

/**
 * @name createTokenPurchaseCheckoutToken
 * @description Gera o token de checkout para compra de tokens.
 *
 * @param {TokenPurchaseCheckoutInput} input - Dados da compra.
 * @returns {Promise<string>} Token criptografado.
 */
export async function createTokenPurchaseCheckoutToken(
  input: TokenPurchaseCheckoutInput,
): Promise<string> {
  const payload = buildTokenPurchasePayload(input);
  return createCheckoutToken(payload, { expiresAt: payload.expiresAt });
}
