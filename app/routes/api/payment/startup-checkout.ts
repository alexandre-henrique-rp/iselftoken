import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { createSessionHeaders } from "~/lib/session-headers";
import {
  createCheckoutToken,
  type CheckoutTokenPayload,
} from "~/lib/special-functions";

const startupCheckoutSchema = z.object({
  campaignId: z.coerce.number().int().positive(),
  startupName: z.string().min(1),
  adjustedTargetAmount: z.coerce.number().positive(),
  estimatedTokenCount: z.coerce.number().int().positive(),
  tokenPrice: z.coerce.number().positive(),
  tokenReservationFee: z.coerce.number().positive(),
  fastTrackFee: z.coerce.number().nonnegative(),
  wantsFastTrackReview: z.boolean(),
  equityPercent: z.coerce.number().nonnegative(),
  equityAmount: z.coerce.number().nonnegative(),
  campaignDurationDays: z.coerce.number().int().positive(),
});

export async function action({
  request,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await request.json();
  const parsedBody = startupCheckoutSchema.safeParse(body);

  if (!parsedBody.success) {
    const details = parsedBody.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(" | ");

    return Response.json(
      {
        error: true,
        message: "Dados inválidos para checkout",
        detail: details,
      },
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const headers = createSessionHeaders(request);

  const userResponse = await fetch(`${process.env.API_URL}/users/me`, {
    method: "GET",
    headers,
  });

  const userData = await userResponse.json();

  if (!userResponse.ok || userData?.error) {
    return new Response(
      JSON.stringify({
        error: true,
        message: userData?.message ?? "Não foi possível obter dados do usuário",
      }),
      { status: userResponse.status || 400, headers },
    );
  }

  const checkoutData = parsedBody.data;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  const totalAmount =
    checkoutData.tokenReservationFee +
    (checkoutData.wantsFastTrackReview ? checkoutData.fastTrackFee : 0);

  const checkoutPayload: CheckoutTokenPayload = {
    transactionId: `txn_${crypto.randomUUID()}`,
    purpose: "TOKEN_RESERVATION",
    method: "PIX",
    amount: totalAmount,
    currency: "BRL",
    buyer: {
      id: userData?.data?.id,
      name: userData?.data?.nome ?? "Cliente",
      email: userData?.data?.email ?? "cliente@iselftoken.com",
      document: userData?.data?.reg_documento ?? "000.000.000-00",
    },
    product: {
      type: "SERVICE",
      name: "Reserva de tokens da campanha",
      description: `Reserva para campanha da startup ${checkoutData.startupName}`,
      quantity: 1,
      unitPrice: totalAmount,
      metadata: {
        campaignId: checkoutData.campaignId,
        startupName: checkoutData.startupName,
        adjustedTargetAmount: checkoutData.adjustedTargetAmount,
        estimatedTokenCount: checkoutData.estimatedTokenCount,
        tokenPrice: checkoutData.tokenPrice,
        tokenReservationFee: checkoutData.tokenReservationFee,
        campaignDurationDays: checkoutData.campaignDurationDays,
        equityPercent: checkoutData.equityPercent,
        equityAmount: checkoutData.equityAmount,
      },
    },
    summary: {
      subtotal: checkoutData.tokenReservationFee,
      discount: 0,
      fees: checkoutData.wantsFastTrackReview ? checkoutData.fastTrackFee : 0,
      total: totalAmount,
      currency: "BRL",
    },
    tokens: {
      qty: checkoutData.estimatedTokenCount,
      unitPrice: checkoutData.tokenPrice,
      total: checkoutData.adjustedTargetAmount,
      campaignId: checkoutData.campaignId,
    },
    service: {
      type: checkoutData.wantsFastTrackReview ? "EARLY_ACCESS" : "NONE",
      metadata: {
        fastTrackFee: checkoutData.fastTrackFee,
        campaignDurationDays: checkoutData.campaignDurationDays,
      },
    },
    campaign: { id: checkoutData.campaignId },
    p2p: { orderId: null },
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const checkoutToken = await createCheckoutToken(checkoutPayload, {
    expiresAt: checkoutPayload.expiresAt,
  });

  return new Response(JSON.stringify({ error: false, token: checkoutToken }), {
    status: 200,
    headers,
  });
}
