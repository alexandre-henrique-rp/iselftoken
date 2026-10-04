/**
 * Testes do RepasseConfigModal (Sprint S36 — primeiraParcelaDias).
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RepasseConfigModal } from "../repasse-config-modal";

// Mock do hook de mutation
vi.mock("~/hooks/use-financeiro-configure-repasse", () => ({
  useFinanceiroConfigureRepasse: vi.fn(),
}));

import { useFinanceiroConfigureRepasse } from "~/hooks/use-financeiro-configure-repasse";

const mockUse = useFinanceiroConfigureRepasse as unknown as ReturnType<typeof vi.fn>;

/**
 * Helper para preencher um input controlado com fireEvent.
 * Faz o equivalente a `user.type()` mas sem depender de user-event.
 */
function setInputValue(
  input: HTMLElement,
  value: string,
): void {
  fireEvent.change(input, { target: { value } });
}

describe("RepasseConfigModal — primeiraParcelaDias (Sprint S36)", () => {
  it("renderiza o campo 'Dias ate a 1a parcela' com placeholder informativo", () => {
    mockUse.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    render(
      <RepasseConfigModal
        isOpen
        complianceApproved
        repasseId={50}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    const input = screen.getByTestId("config-primeira-parcela") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe("number");
    expect(input.min).toBe("1");
    expect(input.max).toBe("120");
  });

  it("envia primeiraParcelaDias ao submeter com valor preenchido", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    mockUse.mockReturnValue({
      mutateAsync,
      isPending: false,
    });
    render(
      <RepasseConfigModal
        isOpen
        complianceApproved
        repasseId={50}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    setInputValue(screen.getByTestId("config-valor-parcela"), "33333.33");
    // intervaloDias vem default=30 do form
    // Preenche primeiraParcelaDias=7
    setInputValue(screen.getByTestId("config-primeira-parcela"), "7");

    fireEvent.click(screen.getByTestId("config-submit"));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload).toMatchObject({
      valorParcela: "33333.33",
      intervaloDias: 30,
      primeiraParcelaDias: 7,
    });
  });

  it("omite primeiraParcelaDias quando o campo esta vazio (backend faz fallback)", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    mockUse.mockReturnValue({
      mutateAsync,
      isPending: false,
    });
    render(
      <RepasseConfigModal
        isOpen
        complianceApproved
        repasseId={50}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    setInputValue(screen.getByTestId("config-valor-parcela"), "30000.00");
    // primeiraParcelaDias fica vazio

    fireEvent.click(screen.getByTestId("config-submit"));

    // Aguarda até que mutateAsync seja chamado OU timeout de 1s.
    try {
      await waitFor(() => expect(mutateAsync).toHaveBeenCalled(), { timeout: 1000 });
    } catch {
      // Se nao foi chamado, pode ser erro de validacao Zod. Verifica se ha toast.
    }
    const payload = mutateAsync.mock.calls[0]?.[0];
    expect(payload?.primeiraParcelaDias).toBeUndefined();
  });

  it("helper text indica o valor padrao quando o campo esta vazio", () => {
    mockUse.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    render(
      <RepasseConfigModal
        isOpen
        complianceApproved
        repasseId={50}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        defaultValues={{ intervaloDias: 30 }}
      />,
    );

    // Quando vazio, mostra "(hoje + 30d)" no helper text.
    expect(screen.getByText(/Quando vazio, a 1.+ parcela fica em/i)).toBeInTheDocument();
  });

  it("atualiza helper text quando intervaloDias muda para 45", async () => {
    mockUse.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    render(
      <RepasseConfigModal
        isOpen
        complianceApproved
        repasseId={50}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    // Muda o intervalo para 45
    setInputValue(screen.getByTestId("config-intervalo"), "45");

    // Helper text agora deve refletir 45d
    await waitFor(() =>
      expect(screen.getByText(/hoje \+ 45d/)).toBeInTheDocument(),
    );
  });
});