import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useUpdateUserStatusMutation } from "~/hooks/use-update-user-status-mutation";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useUpdateUserStatusMutation", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calls PUT /api/admin/users/:id/status with { isActive }", async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 1, isActive: false } }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const { result } = renderHook(() => useUpdateUserStatusMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ userId: 1, isActive: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/admin/users/1/status");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ isActive: false });
  });

  it("throws on backend error", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: "User not found" }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useUpdateUserStatusMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ userId: 999, isActive: false });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/not found/i);
  });
});