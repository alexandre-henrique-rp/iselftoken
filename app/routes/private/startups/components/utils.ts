import type { StartupFiltersState, StartupItem } from "./types";

const numberFormatter = new Intl.NumberFormat("pt-BR");
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function formatTokens(value: number): string {
  return numberFormatter.format(value);
}

export function formatMoney(value: number): string {
  return currencyFormatter.format(value);
}

export function filterStartups(
  startups: StartupItem[],
  filters: StartupFiltersState,
  searchTerm: string
): StartupItem[] {
  const query = searchTerm.trim().toLowerCase();

  return startups.filter((startup) => {
    const matchesStatus =
      filters.status === "all" || startup.status === filters.status;

    const matchesCampaign =
      filters.campaign === "all" || startup.campaign?.status === filters.campaign;

    const matchesSearch =
      query.length === 0 ||
      startup.name.toLowerCase().includes(query) ||
      startup.segment.toLowerCase().includes(query);

    return matchesStatus && matchesCampaign && matchesSearch;
  });
}
