/**
 * Testes para `useUpdateAddressMutation` (STATE-02D).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { meQueryOptions } from "~/lib/queries";
import type { UserData } from "~/types/auth";
import { useUpdateAddressMutation } from "./use-update-address-mutation";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useUpdateAddressMutation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("PATCH /api/users/me com payload limpo (trim, cep só dígitos)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ok: true } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useUpdateAddressMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      endereco: "  Av. Paulista  ",
      numero: "1000",
      complemento: "",
      bairro: "Bela Vista",
      cep: "01310-100",
      cidade: "São Paulo",
      uf: "SP",
      pais: { id: 31, iso3: "BRA", nome: "Brasil", emoji: "🇧🇷" },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/users/me");
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ method: "PATCH" }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.endereco).toBe("Av. Paulista");
    expect(body.cep).toBe("01310100");
    expect(body.pais).toBe(31);
  });

  it("descarta campos vazios (undefined)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ok: true } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useUpdateAddressMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cep: "",
      cidade: "",
      uf: "",
      pais: null,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.endereco).toBeUndefined();
    expect(body.numero).toBeUndefined();
    expect(body.cep).toBeUndefined();
    expect(body.pais).toBeUndefined();
  });

  it("invalida [me] em sucesso", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ok: true } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    qc.setQueryData(meQueryOptions.queryKey, { id: 1 });
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useUpdateAddressMutation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });

    result.current.mutate({
      endereco: "X",
      numero: "",
      complemento: "",
      bairro: "",
      cep: "",
      cidade: "",
      uf: "",
      pais: null,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: meQueryOptions.queryKey,
    });
  });

  it("lança Error em falha do backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "CEP inválido" }),
      }),
    );

    const { result } = renderHook(() => useUpdateAddressMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      endereco: "X",
      numero: "",
      complemento: "",
      bairro: "",
      cep: "abc",
      cidade: "",
      uf: "",
      pais: null,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("CEP inválido");
  });

  it("OTIMISTA: aplica endereço novo no cache [me] ANTES do PATCH voltar", async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const initialUser = {
      id: 1,
      endereco: "Antigo",
      numero: "1",
      bairro: "Velho",
      cidade: "Cidade Antiga",
      uf: "XX",
      cep: "00000000",
    };
    qc.setQueryData(meQueryOptions.queryKey, initialUser);

    const { result } = renderHook(() => useUpdateAddressMutation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });

    result.current.mutate({
      endereco: "Novo Endereço",
      numero: "100",
      complemento: "Apto 5",
      bairro: "Bela Vista",
      cep: "01310100",
      cidade: "São Paulo",
      uf: "SP",
      pais: { id: 31, iso3: "BRA", nome: "Brasil", emoji: "🇧🇷" },
    });

    // onMutate roda síncrono — cache já tem o valor novo.
    await waitFor(() => {
      const cached = qc.getQueryData(
        meQueryOptions.queryKey,
      ) as typeof initialUser;
      expect(cached.endereco).toBe("Novo Endereço");
      expect(cached.cep).toBe("01310100");
    });

    // Resolve o PATCH pra finalizar a mutation.
    resolveFetch(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("onSuccess: mescla response.data no cache [me] após PATCH OK", async () => {
    const backendUser = {
      id: 1,
      publicId: "usr_abc",
      email: "user@test.com",
      nome: "Test",
      role: "USER",
      telefone: "11999990000",
      endereco: "Rua Nova",
      numero: "200",
      complemento: "Apto 5",
      bairro: "Centro",
      cidade: "São Paulo",
      uf: "SP",
      cep: "01310100",
      pais: { id: 31, iso3: "BRA", nome: "Brasil", emoji: "🇧🇷" },
      isActive: true,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: false, data: backendUser }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    qc.setQueryData(meQueryOptions.queryKey, {
      id: 1,
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",
      cep: "",
      pais: null,
    } as any);

    const { result } = renderHook(() => useUpdateAddressMutation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });

    result.current.mutate({
      endereco: "Rua Nova",
      numero: "200",
      complemento: "Apto 5",
      bairro: "Centro",
      cep: "01310-100",
      cidade: "São Paulo",
      uf: "SP",
      pais: { id: 31, iso3: "BRA", nome: "Brasil", emoji: "🇧🇷" },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = qc.getQueryData<UserData>(meQueryOptions.queryKey)!;
    expect(cached.endereco).toBe("Rua Nova");
    expect(cached.numero).toBe("200");
    expect(cached.complemento).toBe("Apto 5");
    expect(cached.bairro).toBe("Centro");
    expect(cached.cidade).toBe("São Paulo");
    expect(cached.uf).toBe("SP");
    expect(cached.cep).toBe("01310100");
    expect(cached.pais).toEqual({
      id: 31,
      iso3: "BRA",
      nome: "Brasil",
      emoji: "🇧🇷",
    });
    // Campos extras do public payload preservados via merge
    expect((cached as any).isActive).toBe(true);
    expect((cached as any).publicId).toBe("usr_abc");
  });

  it("ROLLBACK: reverte cache [me] se PATCH falhar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "erro" }),
      }),
    );

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const initialUser = { id: 1, endereco: "Original" };
    qc.setQueryData(meQueryOptions.queryKey, initialUser);

    const { result } = renderHook(() => useUpdateAddressMutation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });

    result.current.mutate({
      endereco: "Novo",
      numero: "",
      complemento: "",
      bairro: "",
      cep: "",
      cidade: "",
      uf: "",
      pais: null,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const cached = qc.getQueryData(
      meQueryOptions.queryKey,
    ) as typeof initialUser;
    expect(cached.endereco).toBe("Original");
  });
});
