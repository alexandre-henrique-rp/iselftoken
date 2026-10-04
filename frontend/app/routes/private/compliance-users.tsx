import { HydrationBoundary } from "@tanstack/react-query";
import { ComplianceUsersScreen } from "~/components/compliance/compliance-users-screen";
import { loadComplianceUsers } from "~/lib/compliance-users-loader";
import type { Route } from "./+types/compliance-users";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Compliance Usuários | iSelfToken" },
    {
      name: "description",
      content: "Lista de usuários para análise de compliance.",
    },
  ];
}

export function loader({ request }: Route.LoaderArgs) {
  return loadComplianceUsers(request);
}

export default function ComplianceUsersPage({
  loaderData,
}: Route.ComponentProps) {
  return (
    <HydrationBoundary state={loaderData.dehydratedState}>
      <main className="min-h-0 pt-3 pb-6 px-1.5 md:pt-4 md:pb-8 md:px-0">
        <ComplianceUsersScreen filters={loaderData.filters} />
      </main>
    </HydrationBoundary>
  );
}
