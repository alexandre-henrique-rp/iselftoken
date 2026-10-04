import { useQuery } from "@tanstack/react-query";
import { categoriesQueryOptions, type Category } from "~/lib/queries";

export type { Category };

/** Busca categorias ativas usando a chave compartilhada do domínio. */
export function useCategories() {
  return useQuery<Category[], Error>(categoriesQueryOptions);
}
