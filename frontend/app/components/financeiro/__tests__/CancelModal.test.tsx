/**
 * Testes do `CancelModal` — STATE-02A.
 *
 * Foco: invalidação de queries de payments após cancelamento bem-sucedido.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CancelModal } from "~/components/financeiro/CancelModal";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const ENDPOINT = "/api/admin/financeiro/payments/42/cancel";

function renderModal() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  // Marca queries no cache para checar invalidação após sucesso
  qc.setQueryData(["payments"], { items: [], totalPages: 1 });
  qc.setQueryData(["startup-overview"], { data: [] });

  return {
    qc,
    ...render(
      <QueryClientProvider client={qc}>
        <CancelModal
          title="Cancelar pagamento"
          description="Esta ação é irreversível."
          endpoint={ENDPOINT}
          onClose={vi.fn()}
          onCanceled={vi.fn()}
        />
      </QueryClientProvider>,
    ),
  };
}

describe("CancelModal (STATE-02A)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza título, descrição e botão de cancelar", () => {
    renderModal();
    expect(screen.getByText(/cancelar pagamento/i)).toBeInTheDocument();
    expect(screen.getByText(/ação é irreversível/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirmar cancelamento/i }),
    ).toBeInTheDocument();
  });

  it("botão Confirmar fica desabilitado com justificativa < 10 chars", () => {
    renderModal();
    const textarea = screen.getByLabelText(/justificativa/i);
    fireEvent.change(textarea, { target: { value: "curto" } });

    const submitBtn = screen.getByRole("button", {
      name: /confirmar cancelamento/i,
    });
    expect(submitBtn).toBeDisabled();
  });

  it("submit chama endpoint e invalida ['payments'] + ['startup-overview'] em sucesso", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ok: true } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const invalidateSpy = vi.fn();
    const { qc } = renderModal();
    qc.invalidateQueries = invalidateSpy;

    const textarea = screen.getByLabelText(/justificativa/i);
    fireEvent.change(textarea, {
      target: { value: "Justificativa válida para teste" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /confirmar cancelamento/i }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        ENDPOINT,
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["payments"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["startup-overview"],
      });
    });
  });
});