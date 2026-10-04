/**
 * Regressão: após o 2FA, o hook DEVE devolver o role real do usuário
 * (via /api/users/me) no `data` da mutation, para que o componente
 * redirecione ADMIN/FINANCEIRO/COMPLIANCE → /admin/dashboard.
 *
 * Bug anterior: o `mutationFn` retornava `{ role: null }` e o refetch do
 * role era feito no `onSuccess` da definição da mutation, cujo retorno é
 * ignorado no TanStack Query v5. Assim, o callback local recebia role=null
 * e caía no fallback /home mesmo para ADMIN.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  navigateAfter2fa,
  useVerify2faMutation,
} from "./use-verify-2fa-mutation";
import { fetchClientIp } from "~/lib/client-ip";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("~/lib/client-ip", () => ({
  fetchClientIp: vi.fn(),
}));

const mockedFetchClientIp = vi.mocked(fetchClientIp);

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useVerify2faMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchClientIp.mockResolvedValue(null);
  });

  it("devolve o role real (ADMIN) para o caller decidir a landing", async () => {
    const fetchMock = vi
      .fn()
      // POST /api/auth/verify-code
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: false }),
      })
      // GET /api/users/me (fetchQuery do mutationFn)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { role: "ADMIN" } }),
      })
      // POST /api/auth/access (side-effect best-effort no onSuccess)
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useVerify2faMutation(), {
      wrapper: createWrapper(),
    });

    const payload = await result.current.mutateAsync({ codigo: "123456" });

    expect(payload.role).toBe("ADMIN");
    expect(navigateAfter2fa(payload.role)).toBe("/admin/dashboard");
  });

  it("USER cai em /home", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ error: false }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { role: "USER" } }),
      })
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useVerify2faMutation(), {
      wrapper: createWrapper(),
    });

    const payload = await result.current.mutateAsync({ codigo: "123456" });

    expect(navigateAfter2fa(payload.role)).toBe("/home");
  });

  it("propaga erro quando o código é inválido", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Código inválido" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useVerify2faMutation(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({ codigo: "000000" }),
    ).rejects.toThrow("Código inválido");

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
