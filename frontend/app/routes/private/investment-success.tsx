import { useEffect } from "react";
import { redirect, useRevalidator } from "react-router";
import {
  InvestmentSuccess,
  InvestmentSuccessLoading,
} from "~/components/investment/investment-success";
import { serverFetch } from "~/lib/server-fetch";
import type { Route } from "./+types/investment-success";

export function meta() {
  return [{ title: "Investimento confirmado | iSelfToken" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!params.id) throw redirect("/home");
  const response = await serverFetch(
    request,
    `/api/investments/${params.id}/confirmation`,
  );
  if (response.status === 401) throw redirect("/login");
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.error) {
    return { confirmation: null, pending: response.status === 409 };
  }
  return {
    confirmation: (body?.data ?? body) as Parameters<
      typeof InvestmentSuccess
    >[0]["confirmation"],
    pending: false,
  };
}

export default function InvestmentSuccessRoute({
  loaderData,
}: Route.ComponentProps) {
  const revalidator = useRevalidator();
  useEffect(() => {
    if (!loaderData.pending) return;
    const interval = setInterval(() => revalidator.revalidate(), 2000);
    return () => clearInterval(interval);
  }, [loaderData.pending, revalidator]);

  if (loaderData.pending || !loaderData.confirmation)
    return <InvestmentSuccessLoading />;
  return <InvestmentSuccess confirmation={loaderData.confirmation} />;
}
