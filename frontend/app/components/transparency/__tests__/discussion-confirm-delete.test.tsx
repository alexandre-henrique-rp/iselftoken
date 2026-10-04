/**
 * Testes do DiscussionConfirmDelete (TRANSP-04).
 *
 * - Checkbox de ciencia desabilita botao ate ser marcado.
 * - onConfirm dispara quando botao habilitado.
 * - onCancel fecha modal.
 */
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { DiscussionConfirmDelete } from "../discussion-confirm-delete";

describe("DiscussionConfirmDelete", () => {
  afterEach(() => cleanup());
  it("botao de excluir comeca desabilitado ate checkbox marcado", () => {
    render(
      <DiscussionConfirmDelete
        repliesCount={5}
        isSubmitting={false}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const btn = screen.getByTestId("discussion-confirm-delete-button");
    expect(btn).toBeDisabled();
  });

  it("botao habilita apos marcar checkbox de ciencia", () => {
    const onConfirm = vi.fn();
    render(
      <DiscussionConfirmDelete
        repliesCount={5}
        isSubmitting={false}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("discussion-confirm-delete-ack"));
    const btn = screen.getByTestId("discussion-confirm-delete-button");
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("onCancel dispara ao clicar em Cancelar", () => {
    const onCancel = vi.fn();
    render(
      <DiscussionConfirmDelete
        repliesCount={0}
        isSubmitting={false}
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("mostra mensagem com contagem de replies quando > 0", () => {
    render(
      <DiscussionConfirmDelete
        repliesCount={3}
        isSubmitting={false}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText(/3 respostas/i)).toBeInTheDocument();
  });
});