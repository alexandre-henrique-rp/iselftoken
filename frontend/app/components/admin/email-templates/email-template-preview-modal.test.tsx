/**
 * Testes para EmailTemplatePreviewModal.
 * Renderiza subject + html renderizado + text.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmailTemplatePreviewModal } from "~/components/admin/email-templates/email-template-preview-modal";
import type { RenderedEmail } from "~/types/email-template";

describe("EmailTemplatePreviewModal", () => {
  it("renderiza subject do email", () => {
    const rendered: RenderedEmail = {
      subject: "Bem-vindo, João!",
      html: "<p>Olá <strong>João</strong></p>",
      text: "Olá João",
      usedVariables: ["userName"],
    };

    render(
      <EmailTemplatePreviewModal
        rendered={rendered}
        isLoading={false}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/Bem-vindo, João!/)).toBeInTheDocument();
  });

  it("renderiza conteúdo HTML", () => {
    const rendered: RenderedEmail = {
      subject: "Teste",
      html: "<p>Olá usuário</p>",
      text: "Olá usuário",
      usedVariables: [],
    };

    render(
      <EmailTemplatePreviewModal
        rendered={rendered}
        isLoading={false}
        onClose={vi.fn()}
      />,
    );

    // O mesmo texto aparece nas partes HTML e texto do preview.
    expect(screen.getAllByText(/Olá usuário/)).toHaveLength(2);
  });

  it("remove HTML ativo do preview", () => {
    const rendered: RenderedEmail = {
      subject: "Teste",
      html: '<p>Seguro</p><script>alert(1)</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">link</a>',
      text: "Teste",
      usedVariables: [],
    };

    const { container } = render(
      <EmailTemplatePreviewModal
        rendered={rendered}
        isLoading={false}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Seguro")).toBeInTheDocument();
    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(container.querySelector("[onerror]")).not.toBeInTheDocument();
    expect(
      container.querySelector('a[href^="javascript:"]'),
    ).not.toBeInTheDocument();
  });

  it("mostra loading spinner quando isLoading=true", () => {
    render(
      <EmailTemplatePreviewModal
        rendered={null}
        isLoading={true}
        onClose={vi.fn()}
      />,
    );

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("mostra placeholder quando rendered=null e isLoading=false", () => {
    render(
      <EmailTemplatePreviewModal
        rendered={null}
        isLoading={false}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/Preview do Email/i)).toBeInTheDocument();
  });

  it("botão X chama onClose", () => {
    const onClose = vi.fn();
    render(
      <EmailTemplatePreviewModal
        rendered={null}
        isLoading={false}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Fechar preview/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("mostra variáveis utilizadas", () => {
    const rendered: RenderedEmail = {
      subject: "Teste",
      html: "<p>Olá</p>",
      text: "Olá",
      usedVariables: ["userName", "startupName"],
    };

    render(
      <EmailTemplatePreviewModal
        rendered={rendered}
        isLoading={false}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/userName, startupName/)).toBeInTheDocument();
  });
});
