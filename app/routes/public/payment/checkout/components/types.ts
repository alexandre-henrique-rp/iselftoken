export type PaymentMethod = "PIX" | "CREDIT_CARD";

export type CheckoutPurpose =
  | "SUBSCRIPTION"
  | "INVESTMENT"
  | "TOKEN_RESERVATION"
  | "EARLY_ACCESS"
  | "P2P_BUY"
  | string;

export type CheckoutStep = "review" | "payment" | "confirmation";

export type TransactionProduct = {
  id?: string | number;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  currency?: string;
  metadata?: Record<string, unknown>;
};

export type TransactionSummary = {
  subtotal: number;
  discount: number;
  fees: number;
  total: number;
  currency: "BRL";
};

export type TransactionBuyer = {
  name: string;
  email: string;
  document: string;
};

export type TransactionData = {
  transactionId: string;
  purpose?: CheckoutPurpose;
  product: TransactionProduct;
  summary: TransactionSummary;
  buyer: TransactionBuyer;
  expiresAt: string;
  paymentMethod?: PaymentMethod | "BOLETO" | "WALLET";
};

export type InstallmentOption = {
  count: number;
  value: number;
  total: number;
  interest: boolean;
};
