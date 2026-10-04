import { redirect, useLoaderData } from "react-router";
import {
  ProrrogacaoScreen,
  type ProrrogacaoData,
} from "~/components/founder/prorrogacao-screen";
import { serverFetch } from "~/lib/server-fetch";
import type { Route } from "./+types/founder.startups.$id.prorrogacao";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Prorrogação da Captação | iSelfToken" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const id = params.id;
  if (!id) throw redirect("/founder/dashboard");
  const url = new URL(request.url);
  const periodoRaw = Number(url.searchParams.get("periodo"));
  const periodDays =
    Number.isFinite(periodoRaw) && periodoRaw >= 7 && periodoRaw <= 120
      ? Math.trunc(periodoRaw)
      : 30;
  const res = await serverFetch(
    request,
    `/api/founder/startups/${encodeURIComponent(id)}/prorrogacao`,
  );
  if (res.status === 404) throw redirect("/founder/dashboard");
  if (!res.ok) {
    throw new Response("Falha ao carregar dados da prorrogação", {
      status: res.status,
    });
  }
  const body = await res.json().catch(() => null);
  const data = (body?.data ?? null) as ProrrogacaoData | null;
  if (!data) throw new Response("Resposta inválida", { status: 502 });
  return { startupId: id, data, periodDays };
}

export default function FounderProrrogacaoPage() {
  const { startupId, data, periodDays } = useLoaderData<typeof loader>();
  return (
    <ProrrogacaoScreen
      startupId={startupId}
      startupName={data.campaignTitle}
      data={data}
      periodDays={periodDays}
    />
  );
}
