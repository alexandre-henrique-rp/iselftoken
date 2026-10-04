/**
 * Pagina de Transparencia da Startup (shell).
 * Carrega dados da startup (loader) e delega toda UI para `TransparencyShell`.
 * Documentacao: scripts/PRD_PAGINA_TRANSPARENCIA.md
 */
import { useParams, useSearchParams } from "react-router";
import { serverFetch } from "~/lib/server-fetch";
import { TransparencyShell } from "~/components/transparency/transparency-shell";
import { readTabFromSearch } from "~/components/transparency/transparency-tabs";

interface StartupInfo { id: number; nome: string; founderId: number }

export function meta({ data }: { data: unknown }) {
  const nome = (data as { startup?: { nome?: string } })?.startup?.nome;
  return [{ title: nome ? `Transparencia — ${nome} | iSelfToken` : "Transparencia | iSelfToken" }];
}

export async function loader({ request, params }: { request: Request; params: Record<string, string | undefined> }) {
  const startupId = Number(params.id);
  let startup: StartupInfo | null = null;
  if (!Number.isInteger(startupId) || startupId <= 0) return { startup };

  try {
    const res = await serverFetch(
      request,
      `/api/founder/startups/${startupId}/summary`,
    );
    if (res.ok) {
      const d = await res.json().catch(() => null);
      startup = {
        id: d?.id ?? d?.startup?.id ?? startupId,
        nome:
          d?.nome ??
          d?.nomeFantasia ??
          d?.name ??
          d?.startup?.nome ??
          d?.startup?.nomeFantasia ??
          `Startup #${startupId}`,
        founderId:
          d?.founderId ??
          d?.fundadorId ??
          d?.startup?.founderId ??
          d?.startup?.fundadorId ??
          0,
      };
    }
  } catch {}
  return { startup };
}

export default function TransparencyPage({ loaderData }: { loaderData: { startup: StartupInfo | null } }) {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const startupId = Number(id);
  const tab = readTabFromSearch(searchParams.toString());
  return (
    <TransparencyShell
      startup={loaderData.startup}
      startupId={startupId}
      tab={tab}
    />
  );
}