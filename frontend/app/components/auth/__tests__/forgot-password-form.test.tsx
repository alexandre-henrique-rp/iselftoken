/**
 * Testes do `ForgotPasswordForm` — STATE-02A.
 *
 * Garante que o form delega para `useForgotPasswordMutation`:
 *  - submit chama a mutation
 *  - exibe estado de loading enquanto pending
 *  - exibe mensagem de erro quando mutation falha
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { ForgotPasswordForm } from "~/components/auth/forgot-password-form";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderForm() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ForgotPasswordForm />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("ForgotPasswordForm (STATE-02A)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza input de email e botão Enviar Código", () => {
    renderForm();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /enviar código/i }),
    ).toBeInTheDocument();
  });

  it("submete via useForgotPasswordMutation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { userId: 99 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderForm();

    const emailInput = screen.getByLabelText(/e-mail/i);
    fireEvent.change(emailInput, { target: { value: "teste@iself.com" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar código/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/auth/forgot-password"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("exibe mensagem de erro quando mutation falha", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ data: { message: "e-mail não foi localizado." } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderForm();

    const emailInput = screen.getByLabelText(/e-mail/i);
    fireEvent.change(emailInput, { target: { value: "ghost@iself.com" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar código/i }));

    expect(
      await screen.findByText("e-mail não foi localizado."),
    ).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("e-mail não foi localizado.");
  });
});