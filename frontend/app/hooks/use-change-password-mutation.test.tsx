/**
 * Testes do hook `useResetPasswordMutation`.
 * Valida o contrato do mutation com o token JWT de redefinição.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useResetPasswordMutation } from "~/hooks/use-reset-password-mutation";

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

describe("useResetPasswordMutation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("POST /api/auth/reset-password?token=... com body correto", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useResetPasswordMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        token: "reset-token",
        senha: "NovaSenha1",
        confirmarSenha: "NovaSenha1",
      });
    });

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toContain("/auth/reset-password?token=reset-token");
    expect(call[1].method).toBe("POST");
    const body = JSON.parse(call[1].body);
    expect(body).toEqual({
      senha: "NovaSenha1",
      confirmarSenha: "NovaSenha1",
    });
  });
});
