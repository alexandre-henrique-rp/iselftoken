/**
 * Testes do DefineParcelasModal (Sprint S36 — primeiraParcelaDias).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

describe("DefineParcelasModal — primeiraParcelaDias (Sprint S36)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("renderiza o campo 'Dias ate a 1a parcela' com placeholder dinamico", () => {
    render(
      <DefineParcelasModal
        campaignId={50}
        startupName="Acme Inc"
        amountRaised={120000}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    const input = screen.getByTestId("define-primeira-parcela") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe("number");
    expect(input.min).toBe("1");
    expect(input.max).toBe("120");
    expect(input.placeholder).toBe("Padrao: 30 dias (1 x intervalo)");
  });

  it("envia primeiraParcelaDias=7 quando admin preenche o campo", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { repasseId: 50 } }),
    } as Response);

    const onSuccess = vi.fn();
    render(
      <DefineParcelasModal
        campaignId={50}
        startupName="Acme Inc"
        amountRaised={120000}
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByTestId("define-primeira-parcela"), {
      target: { value: "7" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/api/admin/payouts/50/finalize");
    const body = JSON.parse(call[1].body);
    expect(body.primeiraParcelaDias).toBe(7);
  });

  it("omite primeiraParcelaDias quando o campo fica vazio (backend faz fallback)", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(
      <DefineParcelasModal
        campaignId={50}
        startupName="Acme Inc"
        amountRaised={120000}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    // primeiraParcelaDias fica vazio
    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.primeiraParcelaDias).toBeUndefined();
  });

  it("rejeita primeiraParcelaDias fora do range (1..120) com mensagem amigavel", async () => {
    render(
      <DefineParcelasModal
        campaignId={50}
        startupName="Acme Inc"
        amountRaised={120000}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    // Valor acima do max (120)
    fireEvent.change(screen.getByTestId("define-primeira-parcela"), {
      target: { value: "150" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    // Nao deve chamar fetch (validacao cliente)
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/entre 1 e 120/i),
    ).toBeInTheDocument();
  });
});

// eslint-disable-next-line import/first
import { DefineParcelasModal } from "../define-parcelas-modal";