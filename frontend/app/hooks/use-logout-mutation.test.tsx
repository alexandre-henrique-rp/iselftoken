import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { useLoginMutation } from "./use-login-mutation";
import { useLogoutMutation } from "./use-logout-mutation";

describe("useLogoutMutation", () => {
  it("remove todos os dados privados do cache ao sair", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(["me"], { id: 1, email: "a@example.test" });
    queryClient.setQueryData(["investor-dashboard"], {
      total: 1,
      investments: [{ id: 10 }],
    });
    queryClient.setQueryData(["startup-dashboard-metrics"], {
      data: { amount_raised: 1000 },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useLogoutMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(queryClient.getQueryData(["me"])).toBeUndefined();
    expect(queryClient.getQueryData(["investor-dashboard"])).toBeUndefined();
    expect(
      queryClient.getQueryData(["startup-dashboard-metrics"]),
    ).toBeUndefined();
  });
});

describe("useLoginMutation", () => {
  it("limpa o cache privado antes de concluir um novo login", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(["investor-dashboard"], { total: 1 });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) }),
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useLoginMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        email: "b@example.test",
        senha: "senha",
      });
    });

    expect(queryClient.getQueryData(["investor-dashboard"])).toBeUndefined();
  });
});
