import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmCancelRoundDialog } from "../confirm-cancel-round-dialog";

const BASE_PROPS = {
  startupName: "TechStart",
  onClose: vi.fn(),
  onConfirm: vi.fn(),
};

function renderDialog(overrides: Record<string, unknown> = {}) {
  return render(<ConfirmCancelRoundDialog {...BASE_PROPS} {...overrides} />);
}

describe("ConfirmCancelRoundDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Renderização base", () => {
    it("renders dialog with title and startup name", () => {
      renderDialog();

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Cancelar Rodada")).toBeInTheDocument();
      expect(screen.getByText("TechStart")).toBeInTheDocument();
    });

    it("renders estorno integral message", () => {
      renderDialog();

      expect(
        screen.getByText(/estorno integral automaticamente/i),
      ).toBeInTheDocument();
    });

    it("renders checkbox for confirmation", () => {
      renderDialog();

      expect(screen.getByRole("checkbox")).toBeInTheDocument();
      expect(
        screen.getByText(/confirmo que desejo cancelar esta rodada/i),
      ).toBeInTheDocument();
    });

    it("renders Manter Rodada and Sim cancelar e estornar buttons", () => {
      renderDialog();

      expect(
        screen.getByRole("button", { name: /manter rodada/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sim, cancelar e estornar/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Checkbox obrigatório", () => {
    it("confirm button is disabled when checkbox is unchecked", () => {
      renderDialog();

      const confirmBtn = screen.getByRole("button", {
        name: /sim, cancelar e estornar/i,
      });
      expect(confirmBtn).toBeDisabled();
    });

    it("confirm button is enabled after checking checkbox", () => {
      renderDialog();

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      const confirmBtn = screen.getByRole("button", {
        name: /sim, cancelar e estornar/i,
      });
      expect(confirmBtn).toBeEnabled();
    });

    it("confirm button is disabled again after unchecking", () => {
      renderDialog();

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);
      fireEvent.click(checkbox);

      const confirmBtn = screen.getByRole("button", {
        name: /sim, cancelar e estornar/i,
      });
      expect(confirmBtn).toBeDisabled();
    });
  });

  describe("Callbacks", () => {
    it("calls onConfirm when checkbox checked and confirm clicked", () => {
      const onConfirm = vi.fn();
      renderDialog({ onConfirm });

      fireEvent.click(screen.getByRole("checkbox"));
      fireEvent.click(
        screen.getByRole("button", { name: /sim, cancelar e estornar/i }),
      );

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when Manter Rodada clicked", () => {
      const onClose = vi.fn();
      renderDialog({ onClose });

      fireEvent.click(
        screen.getByRole("button", { name: /manter rodada/i }),
      );

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when X (close) button clicked", () => {
      const onClose = vi.fn();
      renderDialog({ onClose });

      fireEvent.click(screen.getByRole("button", { name: /fechar/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when Escape pressed", () => {
      const onClose = vi.fn();
      renderDialog({ onClose });

      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Props opcionais (contexto)", () => {
    it("shows investmentCount when provided", () => {
      renderDialog({ investmentCount: 12 });

      expect(screen.getByText("12")).toBeInTheDocument();
      expect(screen.getByText(/investidores afetados/i)).toBeInTheDocument();
    });

    it("shows totalAmount alongside investmentCount", () => {
      renderDialog({ investmentCount: 3, totalAmount: "R$ 150.000,00" });

      expect(screen.getByText("R$ 150.000,00")).toBeInTheDocument();
      expect(screen.getByText(/valor total/i)).toBeInTheDocument();
    });

    it("shows both investmentCount and totalAmount together", () => {
      renderDialog({ investmentCount: 5, totalAmount: "R$ 75.000,00" });

      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("R$ 75.000,00")).toBeInTheDocument();
    });

    it("hides investment info when investmentCount not provided", () => {
      renderDialog();

      expect(
        screen.queryByText(/investidores afetados/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/valor total/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("disables all buttons when loading", () => {
      renderDialog({ loading: true });

      expect(
        screen.getByRole("button", { name: /manter rodada/i }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: /sim, cancelar e estornar/i }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: /fechar/i }),
      ).toBeDisabled();
    });

    it("shows spinner text when loading", () => {
      renderDialog({ loading: true });

      expect(screen.getByText("Processando…")).toBeInTheDocument();
    });

    it("disables checkbox when loading", () => {
      renderDialog({ loading: true });

      expect(screen.getByRole("checkbox")).toBeDisabled();
    });
  });

  describe("Acessibilidade", () => {
    it("has correct aria attributes on dialog", () => {
      renderDialog();

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "cancel-dialog-title");
      expect(dialog).toHaveAttribute(
        "aria-describedby",
        "cancel-dialog-description",
      );
    });

    it("checkbox has accessible label via htmlFor", () => {
      renderDialog();

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveAttribute(
        "id",
        "cancel-confirm-checkbox",
      );
    });
  });
});
