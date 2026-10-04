/**
 * Testes do `ApprovePaymentModal` — STATE-02A.
 *
 * Cobre o fluxo composto: upload do comprovante → approve do pagamento,
 * e a invalidação de queries ao final.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApprovePaymentModal } from "~/components/financeiro/ApprovePaymentModal";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const PAYMENT_ID = 99;
const COMPROVANTES_ENDPOINT = "/api/admin/financeiro/comprovantes";
const APPROVE_ENDPOINT = `/api/admin/financeiro/payments/${PAYMENT_ID}/approve`;

function renderModal() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  qc.setQueryData(["admin-payments"], []);
  return {
    qc,
    ...render(
      <QueryClientProvider client={qc}>
        <ApprovePaymentModal
          paymentId={PAYMENT_ID}
          paymentSummary={{
            user: "Fulano",
            amount: "R$ 1.000,00",
            purpose: "Token Reservation",
          }}
          onClose={vi.fn()}
          onApproved={vi.fn()}
        />
      </QueryClientProvider>,
    ),
  };
}

describe("ApprovePaymentModal (STATE-02A)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza título com paymentId e campos obrigatórios", () => {
    renderModal();
    expect(
      screen.getByText(new RegExp(`aprovar pagamento #${PAYMENT_ID}`, "i")),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/justificativa/i)).toBeInTheDocument();
    expect(screen.getByText(/selecionar pdf\/jpg\/png/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /aprovar pagamento/i }),
    ).toBeInTheDocument();
  });

  it("botão fica desabilitado sem justificativa válida e sem arquivo", () => {
    renderModal();
    const submitBtn = screen.getByRole("button", {
      name: /aprovar pagamento/i,
    });
    expect(submitBtn).toBeDisabled();
  });

  it("submit dispara upload + approve encadeados e invalida queries", async () => {
    // Mock de 2 chamadas: 1) comprovantes retorna key, 2) approve retorna sucesso
    const fetchMock = vi
      .fn()
      // upload comprovante
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { key: "comprovante-key-1" } }),
      })
      // approve payment
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const invalidateSpy = vi.fn();
    const { qc } = renderModal();
    qc.invalidateQueries = invalidateSpy;

    // Justificativa
    const textarea = screen.getByLabelText(/justificativa/i);
    fireEvent.change(textarea, {
      target: { value: "PIX recebido em conta espelho" },
    });

    // Arquivo via hidden input
    const file = new File(["pdf-content"], "comprovante.pdf", {
      type: "application/pdf",
    });
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(
      screen.getByRole("button", { name: /aprovar pagamento/i }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        COMPROVANTES_ENDPOINT,
        expect.objectContaining({ method: "POST" }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        APPROVE_ENDPOINT,
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["admin-payments"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["payment-status", PAYMENT_ID],
      });
    });
  });
});