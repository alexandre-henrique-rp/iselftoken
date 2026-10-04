import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { useLoaderData } from "react-router";
import { FounderFinanceiroOverview } from "~/components/founder/founder-financeiro-overview";
import { FounderFinanceiroHeader } from "~/components/founder/founder-financeiro-header";
import { createQueryClient } from "~/lib/query-client";
import { startupsQueryOptions } from "~/lib/queries";
import { serverFetch } from "~/lib/server-fetch";

export function meta() {
  return [{ title: "Financeiro | iSelfToken" }];
}

type LoaderStartup = {
  id: string | number;
  nome: string;
  campaigns?: Array<{ id: number; status: string }>;
};

export async function loader({ request }: { request: Request }) {
  // SSR-hydrate sem waterfall (frontend-architecture §3): busca a lista de
  // startups + todos os pagamentos do founder no servidor e popula o
  // TanStack Query. O overview lê tudo do cache — zero fetch no client.
  //
  // IMPORTANTE: usar URLs SAME-ORIGIN dos BFFs (o BFF faz strip do "/api"
  // antes de chamar o backend, que expõe /startup e /payment sem "/api").
  const queryClient = createQueryClient();

  const [paymentsRes, startupsRes] = await Promise.all([
    serverFetch(request, "/api/founder/payments?includeAll=true"),
    serverFetch(request, "/api/startup"),
  ]);

  const startupsPayload = startupsRes.ok
    ? ((await startupsRes.json().catch(() => null)) as unknown)
    : null;
  const startups: LoaderStartup[] = Array.isArray(
    (startupsPayload as { data?: unknown })?.data,
  )
    ? (startupsPayload as { data: LoaderStartup[] }).data
    : Array.isArray(startupsPayload)
      ? (startupsPayload as LoaderStartup[])
      : [];

  // Hidrata startups na MESMA queryKey usada pelo overview (["startups"]),
  // compartilhando cache com /founder/dashboard.
  queryClient.setQueryData(startupsQueryOptions.queryKey, startupsPayload);

  // Hidrata os pagamentos (["founder","payments","all"]) — o hook normaliza
  // { data: [...] } | [...], então guardamos o array já normalizado.
  if (paymentsRes.ok) {
    const paymentsPayload = (await paymentsRes
      .json()
      .catch(() => null)) as unknown;
    const payments = Array.isArray(paymentsPayload)
      ? paymentsPayload
      : Array.isArray((paymentsPayload as { data?: unknown })?.data)
        ? (paymentsPayload as { data: unknown[] }).data
        : [];
    queryClient.setQueryData(["founder", "payments", "all"], payments);
  }

  return { dehydratedState: dehydrate(queryClient), startupCount: startups.length };
}

export default function FounderFinanceiroPage() {
  const { dehydratedState, startupCount } = useLoaderData<typeof loader>();
  return (
    <main className="relative min-h-screen pt-3 pb-6 px-1.5 md:pt-4 md:pb-8 md:px-0">
      <span
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-10 -right-10 -z-10 select-none text-[12vw] font-black tracking-tighter text-white opacity-[0.02]"
      >
        iSelfToken
      </span>
      <div className="mx-auto w-full max-w-7xl xl:max-w-[1400px] space-y-8 md:space-y-10">
        <FounderFinanceiroHeader startupCount={startupCount} />
        <HydrationBoundary state={dehydratedState}>
          <FounderFinanceiroOverview />
        </HydrationBoundary>
      </div>
    </main>
  );
}
