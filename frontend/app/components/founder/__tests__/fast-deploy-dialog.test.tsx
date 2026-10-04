import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FastDeployDialog } from "../fast-deploy-dialog";

const BASE_PROPS = {
  price: 1000,
  onDecline: vi.fn(),
  onAccept: vi.fn(),
};

function renderDialog(overrides: Record<string, unknown> = {}) {
  return render(<FastDeployDialog {...BASE_PROPS} {...overrides} />);
}

describe("FastDeployDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza título Publicação Rápida e explica o delay padrão de 24h", () => {
    renderDialog();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Publicação Rápida" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/24 horas/i)).toBeInTheDocument();
    expect(screen.getByText(/imediatas/i)).toBeInTheDocument();
  });

  it("mostra o preço do serviço formatado em BRL", () => {
    renderDialog({ price: 1000 });
    expect(screen.getByText(/R\$\s?1\.000,00/)).toBeInTheDocument();
  });

  it('aceitar chama onAccept (checkout com os 2 produtos)', () => {
    renderDialog();
    fireEvent.click(
      screen.getByRole("button", { name: /aceitar publicação rápida/i }),
    );
    expect(BASE_PROPS.onAccept).toHaveBeenCalledTimes(1);
    expect(BASE_PROPS.onDecline).not.toHaveBeenCalled();
  });

  it('recusar ("Não, obrigado") chama onDecline (só compliance)', () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /não, obrigado/i }));
    expect(BASE_PROPS.onDecline).toHaveBeenCalledTimes(1);
    expect(BASE_PROPS.onAccept).not.toHaveBeenCalled();
  });

  it("loading desabilita os botões de ação", () => {
    renderDialog({ loading: true });
    // O botão de aceitar mantém o aria-label fixo; o conteúdo vira "Processando…".
    expect(
      screen.getByRole("button", { name: /aceitar publicação rápida/i }),
    ).toBeDisabled();
    expect(screen.getByText(/processando/i)).toBeInTheDocument();
  });
});
