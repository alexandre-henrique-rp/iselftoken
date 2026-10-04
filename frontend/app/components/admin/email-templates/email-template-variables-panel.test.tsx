/**
 * Testes para EmailTemplateVariablesPanel.
 * Renderiza lista de variáveis parseadas do variablesSchema e
 * botão Inserir chama callback com {{variavel}}.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmailTemplateVariablesPanel } from "~/components/admin/email-templates/email-template-variables-panel";
import type { EmailTemplateVersion } from "~/types/email-template";

const makeSchema = (
  properties: Record<string, { type: "string" | "number"; description?: string }>,
): EmailTemplateVersion["variablesSchema"] => ({
  type: "object",
  properties,
  required: Object.keys(properties),
});

describe("EmailTemplateVariablesPanel", () => {
  it("renderiza lista de variáveis do schema", () => {
    const schema = makeSchema({
      userName: { type: "string", description: "Nome do usuário" },
      loginUrl: { type: "string", description: "URL de login" },
    });

    render(
      <EmailTemplateVariablesPanel
        variablesSchema={schema}
        onInsertVariable={vi.fn()}
      />,
    );

    expect(screen.getByText(/userName/)).toBeInTheDocument();
    expect(screen.getByText(/loginUrl/)).toBeInTheDocument();
  });

  it("renderiza tipo e descrição da variável", () => {
    const schema = makeSchema({
      valorParcela: { type: "string", description: "Valor da parcela em BRL" },
    });

    render(
      <EmailTemplateVariablesPanel
        variablesSchema={schema}
        onInsertVariable={vi.fn()}
      />,
    );

    expect(screen.getByText(/string/)).toBeInTheDocument();
    expect(screen.getByText(/Valor da parcela em BRL/)).toBeInTheDocument();
  });

  it("botão Inserir chama callback com {{variavel}}", () => {
    const onInsert = vi.fn();
    const schema = makeSchema({
      founderName: { type: "string" },
    });

    render(
      <EmailTemplateVariablesPanel
        variablesSchema={schema}
        onInsertVariable={onInsert}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Inserir variável founderName/i }));
    expect(onInsert).toHaveBeenCalledWith("{{founderName}}");
  });

  it("mostra mensagem quando não há variáveis", () => {
    const schema = makeSchema({});

    render(
      <EmailTemplateVariablesPanel
        variablesSchema={schema}
        onInsertVariable={vi.fn()}
      />,
    );

    expect(screen.getByText(/Nenhuma variável definida/)).toBeInTheDocument();
  });

  it("renderiza múltiplas variáveis com botões independentes", () => {
    const onInsert = vi.fn();
    const schema = makeSchema({
      userName: { type: "string" },
      startupName: { type: "string" },
      valor: { type: "string" },
    });

    render(
      <EmailTemplateVariablesPanel
        variablesSchema={schema}
        onInsertVariable={onInsert}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Inserir/i })[0]);
    expect(onInsert).toHaveBeenCalledWith("{{userName}}");
  });
});
