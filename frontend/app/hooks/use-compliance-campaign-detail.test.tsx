/**
 * Testes para `useComplianceCampaignDetailQuery` (STATE-02C).
 * Cobre: sucesso, enabled gate, erro, queryKey parametrizado, BFF compliance.campaigns.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useComplianceCampaignDetailQuery } from "~/hooks/use-compliance-campaign-detail";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useComplianceCampaignDetailQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna campaign detail completo com startup e resources em sucesso", async () => {
    const payload = {
      data: {
        id: 5,
        title: "Rodada Seed",
        status: "OPEN",
        targetAmount: 100000,
        raised: 30000,
        percentage: 30,
        totalTokens: 1000,
        tokensSold: 300,
        investorsCount: 12,
        resources: [{ categoria: "MKT", percentual: 50, descricaoCustomizada: null }],
        startup: { id: 7, nome: "Acme", status: "APPROVED", logo: null },
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useComplianceCampaignDetailQuery(5), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.title).toBe("Rodada Seed");
    expect(result.current.data?.startup.nome).toBe("Acme");
    expect(result.current.data?.resources[0].percentual).toBe(50);
  });

  it("chama BFF /api/compliance/campaigns/:id com credentials include", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useComplianceCampaignDetailQuery(15), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/api/compliance/campaigns/15");
    expect(call[1]).toEqual(expect.objectContaining({ credentials: "include" }));
  });

  it("não faz fetch quando id <= 0 (enabled gate)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useComplianceCampaignDetailQuery(0), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lança Error com mensagem do backend em falha", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: true, message: "Campanha não encontrada" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useComplianceCampaignDetailQuery(99), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("Campanha não encontrada");
  });

  it("aceita id como string e converte para number", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 5 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useComplianceCampaignDetailQuery("5"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/compliance/campaigns/5");
  });
});