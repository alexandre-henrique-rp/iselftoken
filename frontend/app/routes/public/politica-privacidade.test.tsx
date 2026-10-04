import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PrivacyPolicyContent } from "~/components/landing/privacy-policy-content";

function renderContent() {
  return render(
    <PrivacyPolicyContent
      version="v1.0"
      effectiveDate="22/08/2026"
      nextReviewDate="22/02/2027"
    />,
  );
}

describe("PrivacyPolicyContent — legal document", () => {
  it("renderiza heading 'Política de Privacidade'", () => {
    renderContent();
    expect(
      screen.getByRole("heading", {
        name: /Política de Privacidade/i,
        level: 1,
      }),
    ).toBeInTheDocument();
  });

  it("renderiza versão, vigência e próxima revisão", () => {
    renderContent();
    expect(screen.getAllByText("v1.0").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("22/08/2026").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("22/02/2027").length).toBeGreaterThanOrEqual(1);
  });

  it("renderiza seção de Identificação do Controlador", () => {
    renderContent();
    expect(
      screen.getByText(/Identificação do Controlador/),
    ).toBeInTheDocument();
    expect(screen.getByText("IselfToken Tecnologia Ltda")).toBeInTheDocument();
  });

  it("renderiza seção de DPO", () => {
    renderContent();
    expect(
      screen.getAllByText(/Encarregado de Dados/).length,
    ).toBeGreaterThanOrEqual(1);
    const dpoLinks = screen.getAllByRole("link", {
      name: /dpo@iselftoken\.com\.br/i,
    });
    expect(dpoLinks.length).toBeGreaterThan(0);
  });

  it("contém link para termos de uso", () => {
    renderContent();
    const links = screen.getAllByRole("link", { name: /Termos de Uso/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute("href", "/termos-de-uso");
  });

  it("tem botão Imprimir", () => {
    renderContent();
    expect(
      screen.getByRole("button", { name: /Imprimir/i }),
    ).toBeInTheDocument();
  });

  it("tem link Baixar PDF", () => {
    renderContent();
    expect(
      screen.getByRole("link", { name: /Baixar PDF/i }),
    ).toBeInTheDocument();
  });
});
