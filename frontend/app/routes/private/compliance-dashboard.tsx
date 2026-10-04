import { HydrationBoundary } from "@tanstack/react-query";
import { ComplianceDashboardScreen } from "~/components/compliance/compliance-dashboard-screen";
import { loadComplianceDashboard } from "~/lib/compliance-dashboard-loader.server";
import type { Route } from "./+types/compliance-dashboard";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Compliance Dashboard | iSelfToken" },
    {
      name: "description",
      content: "Painel de Compliance para monitoramento e auditoria.",
    },
  ];
}

export function loader({ request }: Route.LoaderArgs) {
  return loadComplianceDashboard(request);
}

export default function ComplianceDashboardPage({
  loaderData,
}: Route.ComponentProps) {
  return (
    <HydrationBoundary state={loaderData.dehydratedState}>
      <ComplianceDashboardScreen />
    </HydrationBoundary>
  );
}
