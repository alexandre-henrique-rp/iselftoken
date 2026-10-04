import { HydrationBoundary } from "@tanstack/react-query";
import { CouponPaymentSuccess } from "~/components/checkout-payment/coupon-payment-success";
import type { Route } from "./+types/checkout-payment-success";
import { checkoutPaymentSuccessLoader } from "./checkout-payment-success.server";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Pagamento concluído | iSelfToken" },
    {
      name: "description",
      content: "Confirmação de pagamento concluído com cupom integral.",
    },
  ];
}

export const loader = checkoutPaymentSuccessLoader;

export default function CheckoutPaymentSuccessPage({
  loaderData,
}: Route.ComponentProps) {
  return (
    <HydrationBoundary state={loaderData.dehydratedState}>
      <CouponPaymentSuccess
        initialError={loaderData.initialError}
        paymentId={loaderData.paymentId}
      />
    </HydrationBoundary>
  );
}
