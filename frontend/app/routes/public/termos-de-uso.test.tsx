import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TermsOfUseContent } from "~/components/landing/terms-of-use-content";

function renderContent() {
  return render(
    <TermsOfUseContent
      version="v1.0"
      effectiveDate="08/09/2026"
      nextReviewDate="08/03/2027"
    />,
  );
}

describe("TermsOfUseContent — legal document", () => {
  it("renderiza heading 'Termos de Uso'", () => {
    renderContent();
    expect(
      screen.getByRole("heading", { name: /Termos de Uso/i, level: 1 }),
    ).toBeInTheDocument();
  });

  it("renderiza versão, vigência e próxima revisão", () => {
    renderContent();
    expect(screen.getByText("v1.0")).toBeInTheDocument();
    expect(screen.getByText("08/09/2026")).toBeInTheDocument();
    expect(screen.getByText("08/03/2027")).toBeInTheDocument();
  });

  it("renderiza as 19 seções essenciais CVM 88", () => {
    renderContent();
    const sections = [
      "Identificação da Plataforma",
      "Definições",
      "Aceite e Vigência",
      "Elegibilidade",
      "Cadastro e Conta",
      "Funcionamento da Plataforma",
      "Tokens e Ativos Digitais",
      "Processo de Investimento",
      "Riscos",
      "Taxas e Custos",
      "Propriedade Intelectual",
      "Responsabilidades e Garantias",
      "Limitação de Responsabilidade",
      "Suspensão e Cancelamento",
      "Comunicações",
      "Legislação Aplicável e Foro",
      "Disposições Gerais",
      "Contato",
    ];
    for (const s of sections) {
      const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const els = screen.getAllByText(new RegExp(escaped));
      expect(els.length).toBeGreaterThanOrEqual(1);
    }
    // Proteção de Dados aparece em seção + referência à Política
    expect(
      screen.getAllByText(/Proteção de Dados/).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("contém link para política de privacidade", () => {
    renderContent();
    const links = screen.getAllByRole("link", {
      name: /Política de Privacidade/i,
    });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute("href", "/politica-privacidade");
  });

  it("contém mailto do DPO", () => {
    renderContent();
    const dpoLinks = screen.getAllByRole("link", {
      name: /dpo@iselftoken\.com\.br/i,
    });
    expect(dpoLinks.length).toBeGreaterThan(0);
    expect(dpoLinks[0]).toHaveAttribute("href", "mailto:dpo@iselftoken.com.br");
  });

  it("contém mailto do suporte", () => {
    renderContent();
    const supportLinks = screen.getAllByRole("link", {
      name: /suporte@iselftoken\.com\.br/i,
    });
    expect(supportLinks.length).toBeGreaterThan(0);
    expect(supportLinks[0]).toHaveAttribute(
      "href",
      "mailto:suporte@iselftoken.com.br",
    );
  });

  it("tem botão Imprimir", () => {
    renderContent();
    expect(
      screen.getByRole("button", { name: /Imprimir/i }),
    ).toBeInTheDocument();
  });

  it("footer mostra versão e copyright", () => {
    renderContent();
    expect(
      screen.getByText(/© 2026 IselfToken Tecnologia Ltda/),
    ).toBeInTheDocument();
  });
});
