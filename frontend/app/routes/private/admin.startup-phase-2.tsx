import { HydrationBoundary } from "@tanstack/react-query";
import { useLoaderData } from "react-router";
import { PhaseScreen } from "~/components/admin/phase/phase-screen";
import { adminStartupAction } from "~/lib/admin-startup-action.server";
import { loadPhaseData } from "~/lib/phase-loader.server";
import type { Route } from "./+types/admin.startup-phase-2";

export const action = adminStartupAction;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Fase 2 — Edição do Cadastro | Admin | iSelfToken" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  return loadPhaseData(request, params.id);
}

export default function AdminStartupPhase2() {
  const { startup, dehydratedState } = useLoaderData<typeof loader>();
  return (
    <HydrationBoundary state={dehydratedState}>
      <PhaseScreen phase={2} startup={startup} />
    </HydrationBoundary>
  );
}
