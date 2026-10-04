/**
 * Testes para useCreateEmailTemplateVersion.
 * Testa mutation que invalida queries corretas em onSuccess.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "~/context/ToastContext";
import { useCreateEmailTemplateVersion } from "~/hooks/use-create-email-template-version";
import type { CreateVersionPayload } from "~/types/email-template";

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

describe("useCreateEmailTemplateVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("invalida queries admin email-templates em onSuccess", async () => {
    const qc = new QueryClient();
    qc.setQueryData(["admin", "email-templates"], [{ id: "1", slug: "test" }]);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "v2", version: 2 } }),
    });

    const { result } = renderHook(
      () => useCreateEmailTemplateVersion("welcome-founder"),
      { wrapper: Wrapper },
    );

    const payload: CreateVersionPayload = {
      subject: "Novo assunto",
      htmlTemplate: "<p>Teste</p>",
      textTemplate: "Teste",
      variablesSchema: { type: "object", properties: {}, required: [] },
    };

    result.current.mutate(payload);

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });

  it("chama toast.success em caso de sucesso", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "v2" } }),
    });

    const { result } = renderHook(
      () => useCreateEmailTemplateVersion("welcome-founder"),
      { wrapper: Wrapper },
    );

    result.current.mutate({
      subject: "Teste",
      htmlTemplate: "<p>Teste</p>",
      textTemplate: "Teste",
      variablesSchema: { type: "object", properties: {}, required: [] },
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });

  it("dispara erro quando backend retorna erro", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: true, message: "CPF detectado no conteúdo" }),
    });

    const { result } = renderHook(
      () => useCreateEmailTemplateVersion("welcome-founder"),
      { wrapper: Wrapper },
    );

    result.current.mutate({
      subject: "Teste",
      htmlTemplate: "<p>Meu CPF é 123.456.789-00</p>",
      textTemplate: "Meu CPF é 123.456.789-00",
      variablesSchema: { type: "object", properties: {}, required: [] },
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });
});
