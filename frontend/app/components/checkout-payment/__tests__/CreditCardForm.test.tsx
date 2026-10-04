/**
 * Testes do `CreditCardForm` — parcelamento como fonte de verdade do backend.
 *
 * Foco:
 *  - As opções de parcelamento vêm da simulação do backend (não do cálculo
 *    local). 1x = "à vista"; N>1 mostra parcela + total COM juros.
 *  - Opções `belowMinimum` ficam desabilitadas.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { CreditCardForm } from "../CreditCardForm";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// A mutation de confirmação não é exercida aqui — só precisamos que exista.
vi.mock("~/hooks/use-confirm-card-mutation", () => ({
  useConfirmCardMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const SIMULATION = {
  paymentId: 10,
  principal: 1000,
  interestRate: 0.0299,
  maxInstallments: 3,
  minInstallmentAmount: 100,
  options: [
    {
      installments: 1,
      installmentAmount: 1000,
      totalWithInterest: 1000,
      totalInterest: 0,
      interestRate: 0.0299,
      belowMinimum: false,
    },
    {
      installments: 2,
      installmentAmount: 530.08,
      totalWithInterest: 1060.15,
      totalInterest: 60.15,
      interestRate: 0.0299,
      belowMinimum: false,
    },
    {
      installments: 3,
      installmentAmount: 90.5, // abaixo do mínimo 100 → desabilitado
      totalWithInterest: 271.5,
      totalInterest: 71.5,
      interestRate: 0.0299,
      belowMinimum: true,
    },
  ],
};

describe("CreditCardForm — parcelamento do backend", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: SIMULATION }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("exibe 1x como 'à vista' com o valor total (sem juros)", async () => {
    render(<CreditCardForm paymentId={10} amount={1000} />, {
      wrapper: createWrapper(),
    });

    // O botão combobox mostra a opção 1x selecionada por padrão.
    const combobox = await screen.findByRole("combobox");
    await waitFor(() => {
      expect(combobox).toHaveTextContent(/à vista/i);
      expect(combobox).toHaveTextContent(/1\.000,00/);
    });
  });

  it("renderiza opções N>1 com total COM juros e desabilita belowMinimum", async () => {
    const user = render(
      <CreditCardForm paymentId={10} amount={1000} />,
      { wrapper: createWrapper() },
    );

    const combobox = await screen.findByRole("combobox");
    // Aguarda a simulação carregar (combobox deixa de estar desabilitado).
    await waitFor(() => expect(combobox).not.toBeDisabled());
    // Abre a lista.
    fireEvent.click(combobox);

    const listbox = await screen.findByRole("listbox");
    const options = within(listbox).getAllByRole("option");
    expect(options).toHaveLength(3);

    // 2x com juros.
    expect(options[1]).toHaveTextContent(/2x de/i);
    expect(options[1]).toHaveTextContent(/com juros/i);

    // 3x abaixo do mínimo → desabilitado.
    expect(options[2]).toBeDisabled();
    expect(options[2]).toHaveAttribute("aria-disabled", "true");

    user.unmount();
  });

  it("exibe a parcela mínima configurada", async () => {
    render(<CreditCardForm paymentId={10} amount={1000} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Parcela mínima de/i),
      ).toHaveTextContent(/100,00/);
    });
  });
});
