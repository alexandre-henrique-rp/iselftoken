/**
 * useTransparencyInstallmentPosts (FIN-09 + FIN-11 §8.2).
 *
 * Lista os TransparencyPost auto-gerados por InstallmentRequest aprovada,
 * para a secao dedicada em /founder/startups/:id/transparencia.
 *
 * Estrategia: reusa `useTransparencyPosts` (ja existe) e filtra no client
 * por `sourceType === 'INSTALLMENT_REQUEST'`. Nao precisa de endpoint
 * dedicado — basta o BFF ja expor `sourceType`/`sourceId`.
 *
 * LGPD: `sourceId` e um ID opaco, nunca PII.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  transparencyPostsQueryOptions,
} from "./use-transparency-posts";
import type { TransparencyPost } from "~/types/transparency";

export interface UseTransparencyInstallmentPostsOptions {
  /** Limite de posts retornados. Default 6 (grid 3x2). */
  limit?: number;
  /** Se true, nao faz fetch (default true quando startupId nao esta setado). */
  enabled?: boolean;
}

export interface UseTransparencyInstallmentPostsResult {
  posts: TransparencyPost[];
  total: number;
  isLoading: boolean;
  isError: boolean;
}

export function useTransparencyInstallmentPosts(
  startupId: number | string | null | undefined,
  options: UseTransparencyInstallmentPostsOptions = {},
): UseTransparencyInstallmentPostsResult {
  const { limit = 6 } = options;

  // useTransparencyPosts aceita `number | string` mas rejeita null/undefined.
  // Coerce seguro: se nao houver startupId valido, nao fazemos fetch.
  const validStartupId = startupId != null ? String(startupId) : "";
  const query = useQuery({
    ...transparencyPostsQueryOptions(
      Number(validStartupId) || 0,
      { page: 1, limit: 50 }, // busca mais que o necessario para filtrar
    ),
    enabled: validStartupId !== "" && Number(validStartupId) > 0,
  });

  const posts = useMemo(() => {
    if (!query.data) return [];
    return query.data.data.filter(
      (p) => p.sourceType === "INSTALLMENT_REQUEST",
    );
    // Nao depende do `limit` aqui — limitamos no caller para nao invalidar memo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  return {
    posts: posts.slice(0, limit),
    total: posts.length,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}