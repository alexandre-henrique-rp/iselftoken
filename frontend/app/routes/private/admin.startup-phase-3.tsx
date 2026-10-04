import { HydrationBoundary } from "@tanstack/react-query";
import { useLoaderData } from "react-router";
import { PhaseScreen } from "~/components/admin/phase/phase-screen";
import { adminStartupAction } from "~/lib/admin-startup-action.server";
import { loadPhaseData } from "~/lib/phase-loader.server";
import type { Route } from "./+types/admin.startup-phase-3";

export const action = adminStartupAction;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Fase 3 — Detalhes de Captação | Admin | iSelfToken" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  return loadPhaseData(request, params.id);
}

export default function AdminStartupPhase3() {
  const { startup, dehydratedState } = useLoaderData<typeof loader>();
  return (
    <HydrationBoundary state={dehydratedState}>
      <PhaseScreen phase={3} startup={startup} />
    </HydrationBoundary>
  );
}
