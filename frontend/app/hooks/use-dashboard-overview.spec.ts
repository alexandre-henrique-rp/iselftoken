/**
 * Testes para useDashboardOverview hook (M5-S12 T053).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { useDashboardOverview, dashboardOverviewQueryOptions } from "./use-dashboard-overview";

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useDashboardOverview", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna data com { startups, summary, tabsCount } em sucesso", async () => {
    const mockData = {
      startups: [
        {
          id: "1",
          logo: null,
          nome: "Test",
          segmento: "Fintech",
          status: "aprovada",
          estagio: "mvp",
          totalTokens: 1000,
          tokensVendidos: 500,
          percentualVendido: 50,
          statusCampanha: "aberto",
          bandeira: null,
          createdAt: "2026-07-07T00:00:00.000Z",
          badges: [],
          valorCaptado: 50000,
          metaCaptacao: 100000,
          progresso: 50,
          proximaAcao: null,
        },
      ],
      summary: {
        captado30d: {
          valor: 50000,
          variacaoPercent: 12,
          sparkline: [{ date: "2026-07-07", valor: 5000 }],
        },
        investidoresUnicos: 5,
        progressoMedio: 50,
        restantes: { diasAteProximoFechamento: 30, dataFechamentoMaisProxima: "2026-08-07" },
        campanhas: { abertas: 1, total: 1 },
      },
      tabsCount: { todas: 1, aprovadas: 1, emAnalise: 0, rascunhos: 0, rejeitadas: 0, Financiadas: 0 },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: false, data: mockData }),
    }) as any;

    const { result } = renderHook(() => useDashboardOverview(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(result.current.data?.startups).toHaveLength(1);
    expect(result.current.data?.summary.captado30d.sparkline).toHaveLength(1);
  });

  it("lanca erro quando resposta tem error=true", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: true, message: "boom", data: null }),
    }) as any;

    const { result } = renderHook(() => useDashboardOverview(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it("staleTime = 60000 (1 minuto)", () => {
    expect(dashboardOverviewQueryOptions().staleTime).toBe(60_000);
  });

  it("refetchOnWindowFocus é herdado da config global (não definido na query)", () => {
    // refetchOnWindowFocus agora é false globalmente no query-client.ts
    // A query options não precisa mais defini-lo explicitamente
    const opts = dashboardOverviewQueryOptions() as Record<string, unknown>;
    expect(opts.refetchOnWindowFocus).toBeUndefined();
  });

  it("queryKey = ['startups'] (unificado com startupsQueryOptions)", () => {
    expect(dashboardOverviewQueryOptions().queryKey).toEqual(["startups"]);
  });
});
