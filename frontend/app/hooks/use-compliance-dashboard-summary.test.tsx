/**
 * Testes para `useComplianceDashboardSummaryQuery` (STATE-02C).
 * Cobre contrato: sucesso (data + KPIs), erro do backend, credenciais include.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useComplianceDashboardSummaryQuery } from "~/hooks/use-compliance-dashboard-summary";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useComplianceDashboardSummaryQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna summary com KPIs, recentKycDecisions e pendingApprovals em sucesso", async () => {
    const payload = {
      data: {
        kpis: { kyc_pending: 3, startups_pending: 2, approved_today: 1 },
        recentKycDecisions: [
          { id: 1, status: "APPROVED", userName: "Ana", userEmail: "ana@x.com", rejectionReason: null, updatedAt: "2026-08-16T00:00:00Z" },
        ],
        pendingApprovals: [
          { id: 7, nome: "Acme", slug: "acme", founderName: "Bob", founderEmail: "bob@x.com", createdAt: "2026-08-15T00:00:00Z" },
        ],
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useComplianceDashboardSummaryQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.kpis.startups_pending).toBe(2);
    expect(result.current.data?.recentKycDecisions).toHaveLength(1);
    expect(result.current.data?.pendingApprovals[0].nome).toBe("Acme");
  });

  it("usa credentials: 'include' na chamada", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { kpis: {}, recentKycDecisions: [], pendingApprovals: [] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useComplianceDashboardSummaryQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/api/admin/compliance/dashboard");
    expect(call[1]).toEqual(expect.objectContaining({ credentials: "include" }));
  });

  it("lança Error com mensagem do backend em falha", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: true, message: "Sessão expirada" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useComplianceDashboardSummaryQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("Sessão expirada");
  });

  it("configura queryKey correto: ['compliance-dashboard-summary']", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { kpis: {}, recentKycDecisions: [], pendingApprovals: [] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    renderHook(() => useComplianceDashboardSummaryQuery(), { wrapper });

    await waitFor(() => {
      const queries = qc.getQueryCache().getAll();
      expect(queries.some((q) => JSON.stringify(q.queryKey) === JSON.stringify(["compliance-dashboard-summary"]))).toBe(true);
    });
  });
});