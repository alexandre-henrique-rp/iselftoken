/**
 * Testes do hook `useUpdateConfigMutation` (STATE-02B).
 * Valida: POST /api/admin/config/parameters com body correto + invalida ["admin-config"].
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdateConfigMutation } from "./use-update-config-mutation";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useUpdateConfigMutation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("POST /api/admin/config/parameters com body contendo key/value/effectiveFrom", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 1 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useUpdateConfigMutation(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        key: "TAXA_PLATAFORMA",
        value: 5,
        effectiveFrom: "2026-12-01T00:00:00.000Z",
        note: "teste",
      });
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/config/parameters");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    const body = JSON.parse(init.body);
    expect(body.key).toBe("TAXA_PLATAFORMA");
    expect(body.value).toBe(5);
    expect(body.effectiveFrom).toBe("2026-12-01T00:00:00.000Z");
    expect(body.note).toBe("teste");
  });

  it("joga erro com mensagem do backend quando body tem error=true", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: true, message: "valor inválido" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useUpdateConfigMutation(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({ key: "x", value: -1 });
      } catch {
        // esperado
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe("valor inválido");
  });
});
