import { HydrationBoundary } from "@tanstack/react-query";
import { AdminConfigScreen } from "~/components/admin/admin-config-screen";
import type { Route } from "./+types/admin-config";
import { adminConfigLoader } from "./admin-config.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Configurações | iSelfToken" },
    {
      name: "description",
      content: "Parâmetros de cálculo com vigência por data.",
    },
  ];
}

export const loader = adminConfigLoader;

export default function AdminConfigPage({ loaderData }: Route.ComponentProps) {
  return (
    <HydrationBoundary state={loaderData.dehydratedState}>
      <AdminConfigScreen />
    </HydrationBoundary>
  );
}
