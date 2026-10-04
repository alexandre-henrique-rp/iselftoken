import { redirect } from "react-router";

import type { Route } from "./+types/checkout-return";

/**
 * Página de retorno do C6 hosted checkout.
 *
 * O backend (`payment.service.ts:generateCardCheckout`) define `redirectUrl =
 * ${FRONTEND_URL}/checkout/return?paymentId=<id>` — o C6 manda o user pra cá
 * depois de aprovar/recusar o cartão. Não temos UI própria aqui: só
 * redirecionamos pra `/checkout/payment/:id`, onde o loader vai pegar o
 * status já atualizado (PAID via webhook, ou ainda PENDING se o webhook
 * demorar e a UI mostra "aguardando confirmação").
 *
 * Se o `paymentId` não vier ou for inválido, volta pro /pricing.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("paymentId");
  if (paymentId && /^\d+$/.test(paymentId)) {
    return redirect(`/checkout/payment/${paymentId}`);
  }
  return redirect("/pricing");
}

export default function CheckoutReturnPage() {
  return null;
}
