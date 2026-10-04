import { redirect, useLoaderData } from "react-router";
import {
  CampaignInvestmentCheckout,
  type CampaignCheckoutData,
} from "~/components/checkout/campaign-investment-checkout";
import { BACKEND_URL } from "~/lib/api-config";
import type { Route } from "./+types/checkout";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Checkout | iSelfToken" },
    {
      name: "description",
      content: "Reserve seu investimento e conclua o pagamento com segurança.",
    },
  ];
}

export async function loader({
  params,
  request,
}: Route.LoaderArgs): Promise<CampaignCheckoutData> {
  const campaignId = params.id;
  if (!campaignId) throw redirect("/home");

  const cookieHeader = request.headers.get("cookie") ?? "";
  const response = await fetch(
    `${BACKEND_URL}/campaigns/${campaignId}/checkout`,
    {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    },
  );

  if (!response.ok) {
    throw redirect(response.status === 401 ? "/login" : "/home");
  }

  const body = await response.json().catch(() => null);
  if (body?.error || !body?.data) throw redirect("/home");

  return body.data as CampaignCheckoutData;
}

export default function CheckoutPage() {
  const campaign = useLoaderData<typeof loader>();

  return <CampaignInvestmentCheckout campaign={campaign} />;
}
