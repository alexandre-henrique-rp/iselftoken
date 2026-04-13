import { Edit3, Eye, Rocket } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { campaignStatusConfig, platformStatusConfig } from "./mock-data";
import type { StartupItem } from "./types";
import { formatMoney, formatTokens } from "./utils";

interface StartupRowProps {
  startup: StartupItem;
}

/**
 * @name StartupRow
 * @description Renderiza um card horizontal da startup com status e ações.
 */
export function StartupRow({ startup }: StartupRowProps) {
  const platformStatus = platformStatusConfig[startup.status];
  const campaignStatus = startup.campaign
    ? campaignStatusConfig[startup.campaign.status]
    : null;
  const hasCampaignMetrics =
    Boolean(startup.totalTokens) ||
    Boolean(startup.soldTokens) ||
    Boolean(startup.campaign?.goal) ||
    Boolean(startup.campaign?.raised);

  return (
    <article
      className="rounded-xl border border-stone-800 bg-stone-900 p-5 transition-colors hover:border-stone-700"
      aria-label={`Startup ${startup.name}`}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex min-w-64 items-center gap-4">
          <div className="size-14 overflow-hidden rounded-xl border border-stone-700 bg-stone-800">
            {startup.logo ? (
              <img
                src={startup.logo}
                alt={`Logo da startup ${startup.name}`}
                className="size-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-stone-500">
                <Rocket className="size-5" />
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-stone-100">
              {startup.name}
            </h3>
            <p className="text-sm text-stone-400">
              {startup.segment} • {startup.stage}
            </p>
          </div>
        </div>

        <div className="min-w-36 space-y-1">
          <p className="text-xs font-semibold uppercase text-stone-500">
            Status
          </p>
          <Badge className={platformStatus.className}>
            {platformStatus.label}
          </Badge>
        </div>

        <div className="flex-1 space-y-2">
          <p className="text-xs font-semibold uppercase text-stone-500">
            Campanha
          </p>
          {startup.campaign && campaignStatus ? (
            <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <Badge className={campaignStatus.className}>
                  {campaignStatus.label}
                </Badge>
                {hasCampaignMetrics ? (
                  <span className="text-xs text-stone-500">
                    {formatMoney(startup.campaign.raised)} /{" "}
                    {formatMoney(startup.campaign.goal)}
                  </span>
                ) : null}
              </div>

              {hasCampaignMetrics ? (
                <>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-stone-300">
                      Tokens: {formatTokens(startup.soldTokens)} /{" "}
                      {formatTokens(startup.totalTokens)}
                    </span>
                    <span className="font-semibold text-blue-400">
                      {startup.campaign.percentage}%
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-stone-800">
                    <div
                      className="h-full rounded-full bg-[#d500f9] transition-all duration-300"
                      style={{ width: `${startup.campaign.percentage}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs italic text-stone-500">
                  Métricas da campanha ainda não disponíveis.
                </p>
              )}
            </div>
          ) : (
            <div className="flex h-14 items-center rounded-lg border border-dashed border-stone-800 px-3 text-xs italic text-stone-500">
              Nenhuma campanha criada
            </div>
          )}
        </div>

        <div className="flex w-full gap-2 border-t border-stone-800 pt-4 lg:w-auto lg:border-none lg:pt-0">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-stone-700 bg-stone-800 text-stone-100 hover:bg-stone-700 hover:text-white focus-visible:ring-[#d500f9]"
          >
            <Eye className="size-4" />
            Ver
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-stone-700 bg-transparent text-stone-200 hover:bg-stone-800 hover:text-white focus-visible:ring-[#d500f9]"
          >
            <Edit3 className="size-4" />
            Editar
          </Button>
        </div>
      </div>
    </article>
  );
}
