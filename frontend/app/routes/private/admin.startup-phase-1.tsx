import { HydrationBoundary } from "@tanstack/react-query";
import { useLoaderData } from "react-router";
import { PhaseScreen } from "~/components/admin/phase/phase-screen";
import { adminStartupAction } from "~/lib/admin-startup-action.server";
import { loadPhaseData } from "~/lib/phase-loader.server";
import type { Route } from "./+types/admin.startup-phase-1";

export const action = adminStartupAction;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Fase 1 — Cadastro + Reserva | Admin | iSelfToken" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  return loadPhaseData(request, params.id);
}

export default function AdminStartupPhase1() {
  const { startup, dehydratedState } = useLoaderData<typeof loader>();
  return (
    <HydrationBoundary state={dehydratedState}>
      <PhaseScreen phase={1} startup={startup} />
    </HydrationBoundary>
  );
}
