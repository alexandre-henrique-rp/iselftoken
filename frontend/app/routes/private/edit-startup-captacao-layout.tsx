import type { LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useParams } from "react-router";

import { CaptacaoRejectionBanner } from "~/components/founder/captacao-rejection-banner";
import { EditStartupActionBar } from "~/components/founder/edit-startup-action-bar";
import { EditStartupCaptacaoNav } from "~/components/founder/edit-startup-captacao-nav";
import { GlobalErrorBoundary } from "~/components/system/global-error-boundary";
import type { CaptacaoCampaign } from "~/lib/captacao-shared";
import { EditStartupFormProvider } from "~/lib/edit-startup-form-context";
import { CAMPAIGN_LABELS, mapCampaignStatus } from "~/lib/startup-status";
import { captacaoShouldRevalidate } from "./edit-startup-captacao-revalidate";

export interface CaptacaoLayoutData {
  campaign: CaptacaoCampaign | null;
}

// ==========================================
// LOADER — busca a Campaign ativa (DRAFT/OPEN/PAUSED) da startup.
// Espelha o loader do arquivo monolítico anterior. As subrotas leem esses
// dados via useRouteLoaderData("routes/private/edit-startup-captacao-layout").
// ==========================================
export function shouldRevalidate(args: {
  currentParams: Record<string, string | undefined>;
  nextParams: Record<string, string | undefined>;
  currentUrl: URL;
  nextUrl: URL;
  formMethod?: string;
  actionResult?: unknown;
}) {
  return captacaoShouldRevalidate(args);
}

export async function loader({
  params,
  request,
}: LoaderFunctionArgs): Promise<CaptacaoLayoutData> {
  const { id } = params;
  if (!id) {
    throw new Response("Missing id", { status: 400 });
  }

  const url = new URL(request.url);
  const captacaoRes = await fetch(
    `${url.protocol}//${url.host}/api/founder/startups/${encodeURIComponent(id)}/captacao`,
    {
      headers: { Cookie: request.headers.get("cookie") ?? "" },
    },
  );

  if (captacaoRes.status === 404) {
    throw new Response("Startup não encontrada", { status: 404 });
  }
  if (!captacaoRes.ok) {
    throw new Response("Falha ao carregar captação", {
      status: captacaoRes.status,
    });
  }

  const payload = await captacaoRes.json();
  const campaign = payload?.campaign ?? null;

  // S18.6 — quando o backend retorna `{ campaign: null }` (startup sem
  // Campaign em DRAFT/OPEN/PAUSED), retornamos explicitamente null
  // em vez de uma campanha fake sem `id`. Os sub-routes usam
  // `resolveCampaignId()` (helper em captacao-shared.tsx) para refazer
  // o fetch e recuperar o id correto; isso evita o erro intermitente
  // "Não foi possível identificar a campanha" quando o loader cache
  // dados stale.
  if (!campaign) {
    return { campaign: null };
  }

  return { campaign };
}

export default function EditStartupCaptacaoLayout() {
  const { campaign } = useLoaderData<typeof loader>();
  const params = useParams();
  const startupId = String(
    campaign?.startupId ?? campaign?.startup?.id ?? params.id ?? "",
  );

  const campaignStatus = mapCampaignStatus(
    campaign?.startup?.statusCampanha ||
      (typeof campaign?.status === "string" ? campaign.status : "") ||
      "edicao",
  );
  const campaignIsOpen = campaignStatus === "open";
  const statusLabel = CAMPAIGN_LABELS[campaignStatus];

  return (
    <EditStartupFormProvider>
      <div className="startup-editor-shell isolate -mx-6 min-h-screen overflow-x-hidden bg-background pb-28 text-foreground lg:-mx-12">
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 md:px-8 lg:max-w-[1400px] lg:pt-6">
          {/* Cabeçalho da captação */}
          <header className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Edição de startup
              </p>
              <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
                Editar Captação
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Configure os dados complementares da sua rodada de captação de
                recursos, detalhando sua tese de negócios, destinação e
                governança de acordo com a CVM. Cada aba é salva de forma
                independente.
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-1.5 md:items-end">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Status da Captação
              </span>
              <span className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                {statusLabel}
              </span>
            </div>
          </header>

          <EditStartupCaptacaoNav id={startupId} />

          {/* S35 — Banner de rejeição da Etapa 3 (Detalhes de Captação).
              Renderiza quando o admin rejeita a fase 3 via /admin/startups/:id/3.
              Espelha o banner do /edit (que cobre fases 1/2), mas com paleta
              rosa destrutiva + inclui a justificativa do admin. */}
          {campaign?.phase3Rejected && (
            <CaptacaoRejectionBanner
              startupId={startupId}
              justification={campaign.phase3RejectedJustification ?? null}
              rejectedAt={campaign.phase3RejectedAt ?? null}
            />
          )}

          {campaignIsOpen && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
              <strong>Captação aberta.</strong> Os dados desta rodada estão em modo somente leitura.
            </div>
          )}

          <div
            className={`relative z-10 ${campaignIsOpen ? "pointer-events-none select-none opacity-75" : ""}`}
            aria-disabled={campaignIsOpen}
          >
            <GlobalErrorBoundary>
              <Outlet />
            </GlobalErrorBoundary>
          </div>
        </div>
        {!campaignIsOpen && <EditStartupActionBar />}
      </div>
    </EditStartupFormProvider>
  );
}
