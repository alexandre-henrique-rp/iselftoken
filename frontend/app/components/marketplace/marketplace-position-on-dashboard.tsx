/**
 * S3-T03 — Wrapper que conecta o MarketplacePositionCard ao hook TanStack Query.
 *
 * Pega a primeira startup do founder (lista vem do startupDashboardMetricsQueryOptions
 * ja carregado no dashboard) e renderiza o card de posicao.
 *
 * Empty state: se o founder nao tem nenhuma startup, nao renderiza nada
 * (o dashboard ja mostra o form de cadastro inline).
 *
 * `hasActiveCampaign` indica que o founder ja avancou alem do cadastro
 * (tem campaign DRAFT/OPEN/PAUSED/CLOSED/FUNDED/PAID_OUT). Quando true,
 * a mensagem "Vamos melhorar seu score?" some — o founder ja demonstrou
 * progresso, entao a copy de "ainda nao subiu" nao se aplica.
 */

import { useQuery } from "@tanstack/react-query";
import { founderMarketplaceInfoQueryOptions } from "~/lib/queries";
import { MarketplacePositionCard } from "./marketplace-position-card";

export function MarketplacePositionOnDashboard({
  firstStartupId,
  hasActiveCampaign = false,
}: {
  firstStartupId: string | null;
  hasActiveCampaign?: boolean;
}) {
  const query = useQuery({
    ...founderMarketplaceInfoQueryOptions(firstStartupId),
  });

  if (!firstStartupId || query.isPending) {
    return null;
  }

  if (query.isError || !query.data) {
    return null;
  }

  return (
    <MarketplacePositionCard
      data={query.data}
      hasActiveCampaign={hasActiveCampaign}
    />
  );
}