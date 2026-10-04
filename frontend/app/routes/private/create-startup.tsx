import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { NewStartupWizard } from "~/components/founder/new-startup-wizard";
import { prefetchNewStartupData } from "~/lib/new-startup-loader";
import { createQueryClient } from "~/lib/query-client";
import type { Route } from "./+types/create-startup";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Nova Startup | iSelfToken" },
    {
      name: "description",
      content:
        "Submeta sua startup para a curadoria da iSelfToken e inicie sua captação rápida.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const queryClient = createQueryClient();
  await prefetchNewStartupData(request, queryClient);
  return { dehydratedState: dehydrate(queryClient) };
}

export default function CreateStartupPage({
  loaderData,
}: Route.ComponentProps) {
  return (
    <HydrationBoundary state={loaderData.dehydratedState}>
      <NewStartupWizard />
    </HydrationBoundary>
  );
}
