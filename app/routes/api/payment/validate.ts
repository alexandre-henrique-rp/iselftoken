import type { ActionFunctionArgs } from "react-router";
import { decryptCheckoutToken } from "~/lib/special-functions";

type TransactionData = {
  transactionId: string;
  purpose: string;
  product: {
    id?: number | string;
    name: string;
    description: string;
    quantity: number;
    unitPrice: number;
    currency?: string;
    metadata?: Record<string, unknown>;
  };
  summary: {
    subtotal: number;
    discount: number;
    fees: number;
    total: number;
    currency: "BRL";
  };
  buyer: {
    name: string;
    email: string;
    document: string;
  };
  expiresAt: string;
  paymentMethod?: "PIX" | "CREDIT_CARD" | "BOLETO" | "WALLET";
};

/**
 * @name action
 * @description Valida o token de transação e retorna dados simulados.
 *
 * @param {ActionFunctionArgs} args - Dados da requisição.
 * @returns {Promise<Response>} Resposta com os dados da transação.
 */
export async function action({
  request,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Método não permitido" },
      { status: 405, headers: { "Content-Type": "application/json" } },
    );
  }

  const payload = await request.json();
  let token = String(payload?.token ?? "");

  // Decodifica o token se estiver URL-encoded
  token = decodeURIComponent(token);

  if (!token.trim()) {
    return Response.json(
      { error: "Token não informado" },
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const decrypted = await decryptCheckoutToken(token);

  if (!decrypted) {
    return Response.json(
      { error: "Token inválido ou expirado" },
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const transaction: TransactionData = {
    transactionId: decrypted.transactionId,
    purpose: decrypted.purpose,
    product: {
      id: (() => {
        const rawId =
          decrypted.product.metadata?.planId ??
          decrypted.product.metadata?.subscriptionId ??
          decrypted.product.metadata?.campaignId;

        if (typeof rawId === "string" || typeof rawId === "number") {
          return rawId;
        }

        return undefined;
      })(),
      name: decrypted.product.name,
      description: decrypted.product.description,
      quantity: decrypted.product.quantity,
      unitPrice: decrypted.product.unitPrice,
      currency: decrypted.currency,
      metadata: decrypted.product.metadata,
    },
    summary: {
      subtotal: decrypted.summary.subtotal,
      discount: decrypted.summary.discount,
      fees: decrypted.summary.fees,
      total: decrypted.summary.total,
      currency: "BRL",
    },
    buyer: {
      name: decrypted.buyer.name,
      email: decrypted.buyer.email,
      document: decrypted.buyer.document,
    },
    expiresAt: decrypted.expiresAt,
    paymentMethod: decrypted.method,
  };

  return Response.json({ transaction });
}
