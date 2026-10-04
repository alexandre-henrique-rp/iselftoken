import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminUsersQuery } from "~/hooks/use-admin-users";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useAdminUsersQuery", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns data and pagination on success", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 1,
            nome: "Maria",
            email: "m@x.com",
            role: "USER",
            isActive: true,
            createdAt: "2026-01-01",
          },
        ],
        total: 1,
        pagina: 1,
      }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(
      () => useAdminUsersQuery({ page: 1, search: "maria" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
  });

  it("serializes status, createdFrom, and search as query params", async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], total: 0, pagina: 1 }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const { result } = renderHook(
      () =>
        useAdminUsersQuery({
          page: 2,
          search: "joão",
          status: "active",
          createdFrom: "2026-01-15",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("page=2");
    expect(url).toContain("search=jo%C3%A3o");
    expect(url).toContain("status=active");
    expect(url).toContain("createdFrom=2026-01-15");
  });

  it("throws on backend error", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: "boom" }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useAdminUsersQuery({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/boom|listar/);
  });
});
