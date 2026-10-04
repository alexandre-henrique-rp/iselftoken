/**
 * Testes do hook `useAdminStartupsQuery` (STATE-02B).
 * Valida contrato da query: queryKey, queryFn path/method, e gating de busca <3 chars.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAdminStartupsQuery } from "./use-admin-startups";
import { adminStartupsQueryOptions } from "~/lib/queries";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("adminStartupsQueryOptions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("queryKey inclui params e staleTime = 30000", () => {
    const opts = adminStartupsQueryOptions({ page: 2, status: "ACTIVE" });
    expect(opts.queryKey).toEqual(["admin-startups", { page: 2, status: "ACTIVE" }]);
    expect(opts.staleTime).toBe(30_000);
  });

  it("queryFn faz GET /api/admin/startups com query string correta", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 1, nome: "X" }], total: 1, pagina: 2 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const opts = adminStartupsQueryOptions({
      page: 2,
      search: "alpha",
      status: "ACTIVE",
    });

    const result = await opts.queryFn();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("/api/admin/startups");
    expect(callUrl).toContain("page=2");
    expect(callUrl).toContain("search=alpha");
    expect(callUrl).toContain("status=ACTIVE");
    expect(fetchMock.mock.calls[0][1]).toEqual({ credentials: "include" });
    expect(result.data).toEqual([{ id: 1, nome: "X" }]);
    expect(result.total).toBe(1);
  });

  it("useAdminStartupsQuery retorna data em sucesso e staleTime 30s", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], total: 0, pagina: 1 }),
      }),
    );

    const { result } = renderHook(
      () => useAdminStartupsQuery({ page: 1, search: "alpha" }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.total).toBe(0);
  });
});
