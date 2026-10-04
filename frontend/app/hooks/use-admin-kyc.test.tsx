/**
 * Testes do hook `useAdminKycQueueQuery` (STATE-02B).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAdminKycQueueQuery } from "./use-admin-kyc";
import { adminKycQueueQueryOptions } from "~/lib/queries";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("adminKycQueueQueryOptions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("queryKey inclui params e staleTime = 30s", () => {
    const opts = adminKycQueueQueryOptions({ page: 3, kycStatus: "PENDING" });
    expect(opts.queryKey).toEqual([
      "admin-kyc",
      { page: 3, kycStatus: "PENDING" },
    ]);
    expect(opts.staleTime).toBe(30_000);
  });

  it("queryFn monta /api/admin/kyc com query string", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 9 }], total: 1, pagina: 1 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const opts = adminKycQueueQueryOptions({
      page: 2,
      kycStatus: "APPROVED",
      search: "",
    });
    const result = await opts.queryFn();

    const callUrl = fetchMock.mock.calls[0][0];
    expect(callUrl).toContain("/api/admin/kyc");
    expect(callUrl).toContain("page=2");
    expect(callUrl).toContain("kycStatus=APPROVED");
    expect(result.users).toEqual([{ id: 9 }]);
  });

  it("useAdminKycQueueQuery carrega users via fetch include", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], total: 0, pagina: 1 }),
      }),
    );

    const { result } = renderHook(
      () => useAdminKycQueueQuery({ page: 1 }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.users).toEqual([]);
  });
});
