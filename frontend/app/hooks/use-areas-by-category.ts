import { useQuery } from "@tanstack/react-query";
import { areasByCategoryQueryOptions, type AreaAtuacao } from "~/lib/queries";

export type { AreaAtuacao };

/** Busca áreas filhas da categoria selecionada; sem categoria não há request. */
export function useAreasByCategory(categoryId: number | null) {
  return useQuery<AreaAtuacao[], Error>(
    areasByCategoryQueryOptions(categoryId),
  );
}
