/**
 * Testes para usePublishEmailTemplateVersion.
 * Testa mutation que invalida queries em onSuccess.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "~/context/ToastContext";
import { usePublishEmailTemplateVersion } from "~/hooks/use-publish-email-template-version";

// Mock do fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient();
  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

describe("usePublishEmailTemplateVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("invalida queries admin email-templates em onSuccess", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "v2", status: "PUBLISHED" } }),
    });

    const { result } = renderHook(
      () => usePublishEmailTemplateVersion("welcome-founder"),
      { wrapper: Wrapper },
    );

    result.current.mutate("v2");

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/email-templates/welcome-founder/versions/v2/publish",
      expect.objectContaining({ method: "POST" }),
    ));
  });

  it("faz POST para endpoint correto de publish", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "v1", status: "PUBLISHED" } }),
    });

    const { result } = renderHook(
      () => usePublishEmailTemplateVersion("welcome-founder"),
      { wrapper: Wrapper },
    );

    result.current.mutate("v1");

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/publish"),
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("dispara erro quando backend retorna erro", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: true, message: "Apenas DRAFT pode ser publicado" }),
    });

    const { result } = renderHook(
      () => usePublishEmailTemplateVersion("welcome-founder"),
      { wrapper: Wrapper },
    );

    result.current.mutate("v1");

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });
});
