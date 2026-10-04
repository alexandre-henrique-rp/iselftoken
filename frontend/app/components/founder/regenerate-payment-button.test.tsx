import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { RegeneratePaymentButton } from "./regenerate-payment-button";

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => mockNavigate };
});

describe("RegeneratePaymentButton (Gerar Novo Pagamento)", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sucesso: chama o endpoint e navega ao checkout retornado", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ error: false, data: { paymentId: 200 } }),
    });
    render(<RegeneratePaymentButton paymentId={100} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Gerar Novo Pagamento/i }),
    );

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/payment/100/regenerate",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/checkout/payment/200"),
    );
  });

  it("erro: exibe mensagem e não navega", async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: true, message: "Cobrança ainda ativa" }),
    });
    render(<RegeneratePaymentButton paymentId={100} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Gerar Novo Pagamento/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /Cobrança ainda ativa/i,
      ),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
