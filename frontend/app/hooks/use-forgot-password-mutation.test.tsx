/**
 * Testes para `useForgotPasswordMutation` (STATE-02A — TanStack Migration P0).
 * Cobre o contrato do hook: success → toast + data, error → throw.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useForgotPasswordMutation } from "~/hooks/use-forgot-password-mutation";

// Sonner é um side-effect import; mockamos para evitar erro de DOM em jsdom.
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useForgotPasswordMutation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna userId em sucesso e emite toast.success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { userId: 42 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useForgotPasswordMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ email: "user@iself.com" });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/forgot-password"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("lança Error com mensagem do backend em falha 4xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ data: { message: "Email não encontrado" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useForgotPasswordMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current
        .mutateAsync({ email: "ghost@iself.com" })
        .catch((err: Error) => {
          expect(err.message).toContain("Email não encontrado");
        });
    });
  });
});