import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateEmailTemplateModal } from "./create-email-template-modal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";

const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockMutateAsync = vi.fn();
vi.mock("~/hooks/use-create-email-template", () => ({
  useCreateEmailTemplate: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("CreateEmailTemplateModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não renderiza quando isOpen é false", () => {
    renderWithClient(
      <CreateEmailTemplateModal isOpen={false} onClose={vi.fn()} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renderiza campos quando isOpen é true", () => {
    renderWithClient(
      <CreateEmailTemplateModal isOpen={true} onClose={vi.fn()} />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do Template/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Slug/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Assunto Padrão/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição/i)).toBeInTheDocument();
  });

  it("gera slug automaticamente ao digitar o nome", () => {
    renderWithClient(
      <CreateEmailTemplateModal isOpen={true} onClose={vi.fn()} />,
    );

    const nameInput = screen.getByLabelText(/Nome do Template/i);
    const slugInput = screen.getByLabelText(/Slug/i) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "Confirmação de Reserva" } });
    expect(slugInput.value).toBe("confirmacao-de-reserva");
  });

  it("chama onClose ao clicar em Cancelar", () => {
    const handleClose = vi.fn();
    renderWithClient(
      <CreateEmailTemplateModal isOpen={true} onClose={handleClose} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it("chama mutateAsync e redireciona ao preencher e submeter", async () => {
    mockMutateAsync.mockResolvedValueOnce({
      id: "tmpl-1",
      slug: "novo-template",
      name: "Novo Template",
    });

    const handleClose = vi.fn();
    renderWithClient(
      <CreateEmailTemplateModal isOpen={true} onClose={handleClose} />,
    );

    fireEvent.change(screen.getByLabelText(/Nome do Template/i), {
      target: { value: "Novo Template" },
    });
    fireEvent.change(screen.getByLabelText(/Assunto Padrão/i), {
      target: { value: "Assunto Inicial" },
    });

    const submitBtn = screen.getByRole("button", { name: /Criar e Editar HTML/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Novo Template",
          slug: "novo-template",
          subject: "Assunto Inicial",
        }),
      );
      expect(handleClose).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/admin/email-templates/novo-template");
    });
  });
});
