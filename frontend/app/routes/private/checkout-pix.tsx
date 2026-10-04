import { redirect } from "react-router";
import type { Route } from "./+types/checkout-pix";

/**
 * Compatibilidade para URLs PIX antigas. A tela canônica recebe um Payment
 * persistido e permite aplicar cupom antes de emitir a cobrança.
 */
export async function loader({ params }: Route.LoaderArgs) {
  if (!params.id) throw redirect("/home");
  throw redirect(`/checkout/payment/${params.id}`);
}

export default function CheckoutPixPage() {
  return null;
}
