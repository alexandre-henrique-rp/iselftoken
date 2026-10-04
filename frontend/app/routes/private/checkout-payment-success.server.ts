import { dehydrate } from "@tanstack/react-query";
import { redirect } from "react-router";
import {
  isCouponIntegralPayment,
  type PaymentSummary,
} from "~/lib/payment-presentation";
import { paymentDetailQueryOptions } from "~/lib/queries";
import { createQueryClient } from "~/lib/query-client";
import { serverFetch } from "~/lib/server-fetch";
import type { Route } from "./+types/checkout-payment-success";

function createUnavailablePaymentLoaderData(paymentId: number) {
  return {
    paymentId,
    initialError: true,
    dehydratedState: dehydrate(createQueryClient()),
  };
}

export async function checkoutPaymentSuccessLoader({
  request,
  params,
}: Route.LoaderArgs) {
  const paymentId = Number(params.id);
  if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
    throw redirect("/home");
  }

  let response: Response;
  try {
    response = await serverFetch(request, `/api/payment/${paymentId}`);
  } catch {
    return createUnavailablePaymentLoaderData(paymentId);
  }

  if (response.status === 401) throw redirect("/login");

  const body = await response.json().catch(() => null);
  if (!response.ok || body?.error) {
    if (response.status >= 400 && response.status < 500) {
      throw redirect(`/checkout/payment/${paymentId}`);
    }
    return createUnavailablePaymentLoaderData(paymentId);
  }

  const payment = (body?.data ?? body) as PaymentSummary | null;
  if (
    !payment ||
    payment.id !== paymentId ||
    !isCouponIntegralPayment(payment)
  ) {
    throw redirect(`/checkout/payment/${paymentId}`);
  }

  const queryClient = createQueryClient();
  const query = paymentDetailQueryOptions(paymentId);
  queryClient.setQueryData(query.queryKey, payment);

  return {
    paymentId,
    initialError: false,
    dehydratedState: dehydrate(queryClient),
  };
}
