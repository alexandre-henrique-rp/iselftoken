/**
 * Testes do hook `usePricingSubscriptionMutation` (STATE-02E).
 *
 * Cobre o fluxo consolidado de 3 fetches em 1 mutation atômica:
 * create subscription → create payment → navigate.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePricingSubscriptionMutation } from "./use-pricing-subscription-mutation";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() },
}));

vi.mock("~/lib/queries", () => ({
  meQueryOptions: { queryKey: ["me"] },
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("usePricingSubscriptionMutation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("cria plano adicional sem cancelar a assinatura ativa existente", async () => {
    const fetchMock = vi
      .fn()
      // 1. create subscription
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 7 } }),
      })
      // 2. create payment
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 42 } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const navigateToCheckout = vi.fn();
    const { result } = renderHook(() => usePricingSubscriptionMutation(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        plan: { id: 2, preco: 100, nome: "Investidor" },
        currentSubscription: { id: 99, planId: 1 },
        userId: 1,
        navigateToCheckout,
      });
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/subscriptions");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    const subBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(subBody).toEqual({ userId: 1, planId: 2, status: "PENDING" });

    expect(fetchMock.mock.calls[1][0]).toBe("/api/payment");
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
    const payBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(payBody).toMatchObject({
      amount: 100,
      method: "PIX",
      purpose: "SUBSCRIPTION",
      subscriptionId: 7,
    });
    expect(navigateToCheckout).toHaveBeenCalledWith(42);
  });

  it("cria assinatura adicional mesmo quando há outra assinatura atual", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 7 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 42 } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const navigateToCheckout = vi.fn();
    const { result } = renderHook(() => usePricingSubscriptionMutation(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        plan: { id: 2, preco: 100, nome: "Investidor" },
        currentSubscription: null,
        userId: 1,
        navigateToCheckout,
      });
    });

    expect(fetchMock).toHaveBeenCalledTimes(2); // create subscription + payment
    expect(fetchMock.mock.calls[0][0]).toBe("/api/subscriptions");
  });

  it("faz rollback da subscription se payment falhar", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 7 } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: "ops" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // rollback DELETE
    vi.stubGlobal("fetch", fetchMock);

    const navigateToCheckout = vi.fn();
    const { result } = renderHook(() => usePricingSubscriptionMutation(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          plan: { id: 2, preco: 100, nome: "Investidor" },
          currentSubscription: null,
          userId: 1,
          navigateToCheckout,
        });
      } catch {
        // esperado
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toBe("/api/subscriptions/7");
    expect(fetchMock.mock.calls[2][1].method).toBe("DELETE");
    expect(navigateToCheckout).not.toHaveBeenCalled();
  });

  it("propaga erro ao criar a assinatura", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "subscription não pode ser criada" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const navigateToCheckout = vi.fn();
    const { result } = renderHook(() => usePricingSubscriptionMutation(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          plan: { id: 2, preco: 100, nome: "Investidor" },
          currentSubscription: { id: 99 },
          userId: 1,
          navigateToCheckout,
        });
      } catch {
        // esperado
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(
      /subscription não pode ser criada/,
    );
  });

  describe("verificador pré-checkout (CASE.md §Planos)", () => {
    it("bloqueia compra do MESMO plano quando currentSubscription.planId === plan.id (sem chamar fetch)", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const navigateToCheckout = vi.fn();
      const { result } = renderHook(() => usePricingSubscriptionMutation(), {
        wrapper: makeWrapper(),
      });

      let caught: unknown = null;
      await act(async () => {
        try {
          await result.current.mutateAsync({
            plan: { id: 10, preco: 100, nome: "Investidor" },
            currentSubscription: { id: 99, planId: 10 },
            userId: 1,
            navigateToCheckout,
          });
        } catch (e) {
          caught = e;
        }
      });

      // nenhuma chamada HTTP — verificador pré-checkout falhou antes da rede
      expect(fetchMock).not.toHaveBeenCalled();
      expect(navigateToCheckout).not.toHaveBeenCalled();
      // mensagem canônica em PT-BR (igual ao backend 409)
      expect((caught as Error)?.message).toMatch(
        /Você já possui este plano ativo/,
      );
    });

    it("permite compra adicional quando currentSubscription.planId é DIFERENTE do plan.id alvo", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 7 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 42 } }),
        });
      vi.stubGlobal("fetch", fetchMock);

      const navigateToCheckout = vi.fn();
      const { result } = renderHook(() => usePricingSubscriptionMutation(), {
        wrapper: makeWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          plan: { id: 20, preco: 100, nome: "Fundador" },
          currentSubscription: { id: 99, planId: 10 },
          userId: 1,
          navigateToCheckout,
        });
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toBe("/api/subscriptions");
      expect(fetchMock.mock.calls[1][0]).toBe("/api/payment");
      expect(navigateToCheckout).toHaveBeenCalledWith(42);
    });

    it("permite compra adicional quando currentSubscription.planId é undefined", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 7 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 42 } }),
        });
      vi.stubGlobal("fetch", fetchMock);

      const navigateToCheckout = vi.fn();
      const { result } = renderHook(() => usePricingSubscriptionMutation(), {
        wrapper: makeWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          plan: { id: 10, preco: 100, nome: "Investidor" },
          currentSubscription: { id: 99 },
          userId: 1,
          navigateToCheckout,
        });
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toBe("/api/subscriptions");
      expect(navigateToCheckout).toHaveBeenCalledWith(42);
    });
  });
});
