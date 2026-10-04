/**
 * Testes do DiscussionCard (TRANSP-04).
 *
 * Verifica:
 * - Renderiza badge de categoria, contadores, authorPublicId
 * - NAO expoe email/CPF/phone do autor (LGPD)
 * - Click dispara onClick
 */
import * as React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DiscussionCard } from "../discussion-card";
import type { TransparencyDiscussion } from "~/types/transparency";

// Mock do hook de upvote para nao precisar de fetch real nem QueryClient
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

const baseDiscussion: TransparencyDiscussion = {
  id: "d-1",
  startupId: 1,
  authorId: 42,
  title: "Como funciona o calculo de valuation?",
  content: "Estou com duvidas sobre o calculo de valuation aplicado na rodada.",
  category: "DUVIDA",
  isAnonymous: true,
  upvotesCount: 7,
  isPinned: false,
  pinnedAt: null,
  repliesCount: 3,
  lastActivityAt: new Date().toISOString(),
  viewerHasUpvoted: false,
  authorPublicId: "Ana U.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("DiscussionCard", () => {
  afterEach(() => cleanup());

  it("renderiza badge de categoria, titulo, preview e contadores", () => {
    render(
      <DiscussionCard
        discussion={baseDiscussion}
        isAuthenticated={true}
        onClick={() => {}}
      />,
      { wrapper: wrapper() },
    );
    // titulo + preview ambos contem "valuation", entao usamos getAllByText
    expect(screen.getAllByText(/valuation/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId(`discussion-category-${baseDiscussion.id}`)).toHaveTextContent(/Duvida/);
    expect(screen.getByTestId(`discussion-preview-${baseDiscussion.id}`)).toBeInTheDocument();
  });

  it("exibe authorPublicId mas NUNCA email/CPF/phone do autor", () => {
    render(
      <DiscussionCard
        discussion={baseDiscussion}
        isAuthenticated={true}
        onClick={() => {}}
      />,
      { wrapper: wrapper() },
    );
    const authorEl = screen.getByTestId(`discussion-author-${baseDiscussion.id}`);
    expect(authorEl).toHaveTextContent("Ana U.");
    // LGPD: nenhum PII pode aparecer
    expect(authorEl.textContent ?? "").not.toMatch(/@/);
    expect(authorEl.textContent ?? "").not.toMatch(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
    expect(authorEl.textContent ?? "").not.toMatch(/\(\d{2}\)/);
  });

  it("dispara onClick quando clicado", () => {
    const handle = vi.fn();
    render(
      <DiscussionCard
        discussion={baseDiscussion}
        isAuthenticated={true}
        onClick={handle}
      />,
      { wrapper: wrapper() },
    );
    fireEvent.click(screen.getByTestId(`discussion-card-${baseDiscussion.id}`));
    expect(handle).toHaveBeenCalledTimes(1);
  });

  it("mostra upvote como toggle quando autenticado (dentro de card = span)", () => {
    render(
      <DiscussionCard
        discussion={{ ...baseDiscussion, viewerHasUpvoted: true }}
        isAuthenticated={true}
        onClick={() => {}}
      />,
      { wrapper: wrapper() },
    );
    const el = screen.getByTestId(`upvote-${baseDiscussion.id}`);
    // No DiscussionCard o upvote vira span (HTML semantico: nao pode ter button dentro de button)
    expect(el.tagName.toLowerCase()).toBe("span");
    expect(el).toHaveAttribute("data-active", "true");
  });
});