/**
 * Testes do `ResetPasswordForm` — STATE-02A.
 *
 * Foco: navegação entre passos (otp → password) e renderização do passo OTP.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "~/components/auth/reset-password-form";

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
        <ResetPasswordForm />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("ResetPasswordForm (STATE-02A)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza o formulário de redefinição quando há token na URL", () => {
    renderForm(["/reset-password?token=reset-token"]);
    expect(
      screen.getByRole("button", { name: /atualizar senha/i }),
    ).toBeInTheDocument();
    expect(document.querySelectorAll('input[type="password"]').length).toBe(2);
  });

  it("exibe erro quando o token não está presente", async () => {
    renderForm(["/reset-password"]);
    fireEvent.submit(
      screen.getByRole("button", { name: /atualizar senha/i }).closest("form")!,
    );
    expect(
      await screen.findByText(/link de redefinição inválido/i),
    ).toBeInTheDocument();
  });
});
