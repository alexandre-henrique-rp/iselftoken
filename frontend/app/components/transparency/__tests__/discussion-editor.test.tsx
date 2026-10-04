/**
 * Testes do DiscussionEditor (TRANSP-04).
 *
 * - Validacoes: title min 10 / content min 20 / categoria default.
 * - Toggle anonimo: reflete no estado do botao submit.
 * - Texto explicativo sobre anonimato visivel.
 */
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { DiscussionEditor } from "../discussion-editor";

describe("DiscussionEditor", () => {
  afterEach(() => cleanup());
  it("renderiza form com campos title, categoria, conteudo", () => {
    render(
      <DiscussionEditor
        isSubmitting={false}
        onCancel={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByTestId("discussion-editor")).toBeInTheDocument();
    expect(screen.getByTestId("discussion-editor-title")).toBeInTheDocument();
    expect(screen.getByTestId("discussion-editor-content")).toBeInTheDocument();
    expect(screen.getByTestId("discussion-editor-category")).toBeInTheDocument();
    expect(screen.getByTestId("discussion-editor-anonymous")).toBeInTheDocument();
  });

  it("botao submit desabilitado com title curto (<10 chars)", () => {
    render(
      <DiscussionEditor
        isSubmitting={false}
        onCancel={() => {}}
        onSubmit={() => {}}
      />,
    );
    fireEvent.change(screen.getByTestId("discussion-editor-title"), {
      target: { value: "curto" },
    });
    const submit = screen.getByTestId("discussion-editor-submit");
    expect(submit).toBeDisabled();
  });

  it("botao submit desabilitado com content curto (<20 chars)", () => {
    render(
      <DiscussionEditor
        isSubmitting={false}
        onCancel={() => {}}
        onSubmit={() => {}}
      />,
    );
    fireEvent.change(screen.getByTestId("discussion-editor-title"), {
      target: { value: "Titulo valido com mais de dez" },
    });
    fireEvent.change(screen.getByTestId("discussion-editor-content"), {
      target: { value: "curto" },
    });
    expect(screen.getByTestId("discussion-editor-submit")).toBeDisabled();
  });

  it("submit habilitado com title >= 10 e content >= 20", () => {
    const onSubmit = vi.fn();
    render(
      <DiscussionEditor
        isSubmitting={false}
        onCancel={() => {}}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByTestId("discussion-editor-title"), {
      target: { value: "Como funciona o calculo de valuation na rodada?" },
    });
    fireEvent.change(screen.getByTestId("discussion-editor-content"), {
      target: { value: "Estou com duvidas sobre o calculo aplicado na nossa rodada atual." },
    });
    const submit = screen.getByTestId("discussion-editor-submit");
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("toggle anonimo reflete no estado do submit", () => {
    const onSubmit = vi.fn();
    render(
      <DiscussionEditor
        isSubmitting={false}
        onCancel={() => {}}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByTestId("discussion-editor-title"), {
      target: { value: "Como funciona o calculo de valuation na rodada?" },
    });
    fireEvent.change(screen.getByTestId("discussion-editor-content"), {
      target: { value: "Estou com duvidas sobre o calculo aplicado na nossa rodada atual." },
    });
    fireEvent.click(screen.getByTestId("discussion-editor-anonymous"));
    fireEvent.click(screen.getByTestId("discussion-editor-submit"));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ isAnonymous: true }),
    );
  });

  it("categoria default = GERAL", () => {
    render(
      <DiscussionEditor
        isSubmitting={false}
        onCancel={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByTestId("discussion-editor-category")).toHaveValue("GERAL");
  });

  it("exibe texto explicativo sobre anonimato", () => {
    render(
      <DiscussionEditor
        isSubmitting={false}
        onCancel={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText(/PrimeiroNome U\./i)).toBeInTheDocument();
  });
});