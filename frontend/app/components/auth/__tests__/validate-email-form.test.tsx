/**
 * Testes do `ValidateEmailForm` — STATE-02A.
 *
 * Cobre o contrato da query string `?token=` e os 3 estados visuais:
 *  - loading (auto-fire on mount)
 *  - success (mostra botão "Ir para Home" + countdown)
 *  - error (mostra botão "Ir para o Login")
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { ValidateEmailForm } from "~/components/auth/validate-email-form";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderForm(initialEntries: string[] = ["/"]) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={qc}>
        <ValidateEmailForm />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("ValidateEmailForm (STATE-02A)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exibe erro quando nenhum token é fornecido na URL", () => {
    renderForm(["/validate-email"]);
    expect(
      screen.getByText(/nenhum token de validação/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ir para o login/i }),
    ).toBeInTheDocument();
  });

  it("exibe loading enquanto a mutation está pending", async () => {
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise(() => {
          /* nunca resolve — simula loading */
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderForm(["/validate-email?token=abc123"]);

    expect(await screen.findByText(/validando\.\.\./i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/validate-email"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("exibe sucesso com countdown após resposta 200", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderForm(["/validate-email?token=valid-token"]);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /ir para home/i }),
      ).toBeInTheDocument();
    });
  });
});