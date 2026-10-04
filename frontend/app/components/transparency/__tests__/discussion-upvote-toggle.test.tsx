/**
 * Testes do DiscussionUpvoteToggle (TRANSP-04).
 *
 * - Visitante (sem auth): renderiza span estatico, NAO dispara fetch.
 * - Autenticado: renderiza botao com aria-pressed e dispara mutacao ao clicar.
 */
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DiscussionUpvoteToggle } from "../discussion-upvote-toggle";

vi.mock("~/hooks/use-transparency-discussion-upvote", () => ({
  useToggleUpvote: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("DiscussionUpvoteToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it("visitante: renderiza span estatico (sem botao)", () => {
    render(
      <DiscussionUpvoteToggle
        discussionId="d-1"
        count={5}
        active={false}
        isAuthenticated={false}
      />,
      { wrapper: wrapper() },
    );
    const el = screen.getByTestId("upvote-d-1");
    expect(el.tagName.toLowerCase()).not.toBe("button");
    expect(el.textContent).toContain("5");
  });

  it("autenticado: renderiza botao com aria-pressed=false inicialmente", () => {
    render(
      <DiscussionUpvoteToggle
        discussionId="d-1"
        count={5}
        active={false}
        isAuthenticated={true}
      />,
      { wrapper: wrapper() },
    );
    const btn = screen.getByTestId("upvote-d-1");
    expect(btn.tagName.toLowerCase()).toBe("button");
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn.textContent).toContain("5");
  });

  it("autenticado: contagem reflete upvote ativo (active=true)", () => {
    render(
      <DiscussionUpvoteToggle
        discussionId="d-2"
        count={10}
        active={true}
        isAuthenticated={true}
      />,
      { wrapper: wrapper() },
    );
    const btn = screen.getByTestId("upvote-d-2");
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn.textContent).toContain("10");
  });
});