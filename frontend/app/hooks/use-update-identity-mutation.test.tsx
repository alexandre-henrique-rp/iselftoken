/**
 * Testes para `useUpdateIdentityMutation` (STATE-02D).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdateIdentityMutation } from "./use-update-identity-mutation";
import { meQueryOptions } from "~/lib/queries";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const baseInput = {
  nome: "Maria Silva",
  telefone: "11999998888",
  data_nascimento: "1990-05-15",
  genero: "MULHER" as const,
  tipo_documento: "CPF" as const,
  reg_documento: "123.456.789-00",
};

describe("useUpdateIdentityMutation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("PATCH /api/users/me com payload trimado", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: { ok: true } }) });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useUpdateIdentityMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      ...baseInput,
      nome: "  Maria Silva  ",
      telefone: "  11999998888  ",
      reg_documento: "  123.456.789-00  ",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/users/me");
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ method: "PATCH", credentials: "include" }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.nome).toBe("Maria Silva");
    expect(body.telefone).toBe("11999998888");
    expect(body.reg_documento).toBe("123.456.789-00");
    expect(body.data_nascimento).toBe("1990-05-15");
  });

  it("descarta genero/tipo_documento vazios (undefined)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: { ok: true } }) });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useUpdateIdentityMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      ...baseInput,
      genero: "",
      tipo_documento: "",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.genero).toBeUndefined();
    expect(body.tipo_documento).toBeUndefined();
  });

  it("omite data_nascimento quando vazio", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: { ok: true } }) });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useUpdateIdentityMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ ...baseInput, data_nascimento: "" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.data_nascimento).toBeUndefined();
  });

  it("invalida [me] em sucesso", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: { ok: true } }) });
    vi.stubGlobal("fetch", fetchMock);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(meQueryOptions.queryKey, { id: 1 });
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useUpdateIdentityMutation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });

    result.current.mutate(baseInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: meQueryOptions.queryKey,
    });
  });

  it("lança Error em falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "CPF inválido" }),
      }),
    );

    const { result } = renderHook(() => useUpdateIdentityMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(baseInput);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("CPF inválido");
  });
});