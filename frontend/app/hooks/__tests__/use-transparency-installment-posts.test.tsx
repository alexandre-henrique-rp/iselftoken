/**
 * Testes do useTransparencyInstallmentPosts hook.
 */
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../use-transparency-posts", () => ({
  transparencyPostsQueryOptions: vi.fn(),
}));

import { transparencyPostsQueryOptions } from "../use-transparency-posts";
import { useTransparencyInstallmentPosts } from "../use-transparency-installment-posts";

const mockQueryOptions = transparencyPostsQueryOptions as unknown as ReturnType<typeof vi.fn>;

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useTransparencyInstallmentPosts", () => {
  it("filtra apenas posts com sourceType=INSTALLMENT_REQUEST", async () => {
    mockQueryOptions.mockReturnValue({
      queryKey: ["transparency-posts", 1, { page: 1, limit: 50 }],
      queryFn: vi.fn(async () => ({
        data: [
          {
            id: 1,
            sourceType: "INSTALLMENT_REQUEST",
            title: "Parcela 1",
          },
          {
            id: 2,
            sourceType: "MANUAL",
            title: "Post manual",
          },
          {
            id: 3,
            sourceType: "INSTALLMENT_REQUEST",
            title: "Parcela 2",
          },
          {
            id: 4,
            sourceType: null,
            title: "Post legado",
          },
        ],
        total: 4,
        page: 1,
        limit: 50,
      })),
      enabled: true,
      staleTime: 60_000,
    });

    const { result } = renderHook(
      () => useTransparencyInstallmentPosts(1, { limit: 6 }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.posts).toHaveLength(2);
    expect(result.current.posts.map((p) => p.id)).toEqual([1, 3]);
    expect(result.current.total).toBe(2);
  });

  it("respeita visibleLimit e expoe total real", async () => {
    mockQueryOptions.mockReturnValue({
      queryKey: ["transparency-posts", 1, { page: 1, limit: 50 }],
      queryFn: vi.fn(async () => ({
        data: Array.from({ length: 8 }).map((_, i) => ({
          id: i + 1,
          sourceType: "INSTALLMENT_REQUEST" as const,
          title: `Parcela ${i + 1}`,
        })),
        total: 8,
        page: 1,
        limit: 50,
      })),
      enabled: true,
      staleTime: 60_000,
    });

    const { result } = renderHook(
      () => useTransparencyInstallmentPosts(1, { limit: 3 }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.posts).toHaveLength(3);
    expect(result.current.total).toBe(8);
  });

  it("retorna posts vazios quando nenhum post tem sourceType matching", async () => {
    mockQueryOptions.mockReturnValue({
      queryKey: ["transparency-posts", 1, { page: 1, limit: 50 }],
      queryFn: vi.fn(async () => ({
        data: [
          { id: 1, sourceType: "MANUAL", title: "Post 1" },
          { id: 2, sourceType: null, title: "Post legado" },
        ],
        total: 2,
        page: 1,
        limit: 50,
      })),
      enabled: true,
      staleTime: 60_000,
    });

    const { result } = renderHook(
      () => useTransparencyInstallmentPosts(1),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.posts).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });
});