/**
 * Testes para AdminMarketplaceView (S4-T03).
 *
 * Cobre:
 *   - Renderiza lista de pinos com nome, slug, motivo
 *   - Mostra empty state quando nao ha pinos
 *   - Botao Despinear presente para cada item
 *   - Mostra contador "X/3 pinos ativos"
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { AdminMarketplaceView } from "./admin-marketplace-view";
import type { AdminPinnedStartup } from "~/types/admin-marketplace";

function buildPin(
  overrides: Partial<AdminPinnedStartup> = {},
): AdminPinnedStartup {
  return {
    startupId: 1,
    slug: "techinnovate",
    nome: "TechInnovate",
    manuallyPinnedAt: "2026-09-22T10:00:00Z",
    manuallyPinnedBy: 99,
    manuallyPinnedReason: "Y Combinator W26 batch top startup",
    ...overrides,
  };
}

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AdminMarketplaceView (S4-T03)", () => {
  it("renderiza lista de pinos com nome, slug, motivo", () => {
    wrap(<AdminMarketplaceView initialPinned={[buildPin()]} />);
    expect(screen.getByTestId("amp-pin-1")).toBeInTheDocument();
    expect(screen.getByText("TechInnovate")).toBeInTheDocument();
    expect(screen.getByText("techinnovate")).toBeInTheDocument();
    expect(screen.getByText(/Y Combinator W26 batch/)).toBeInTheDocument();
  });

  it("mostra empty state quando nao ha pinos", () => {
    wrap(<AdminMarketplaceView initialPinned={[]} />);
    expect(screen.getByTestId("amp-empty")).toBeInTheDocument();
    expect(screen.getByTestId("amp-empty")).toHaveTextContent(/nenhum pino/i);
  });

  it("mostra contador 'X/3 pinos ativos'", () => {
    wrap(
      <AdminMarketplaceView
        initialPinned={[buildPin({ startupId: 1 }), buildPin({ startupId: 2 })]}
      />,
    );
    expect(screen.getByTestId("amp-counter")).toHaveTextContent("2/3");
  });

  it("botao Despinear presente para cada item", () => {
    wrap(
      <AdminMarketplaceView
        initialPinned={[buildPin({ startupId: 1 }), buildPin({ startupId: 2 })]}
      />,
    );
    const buttons = screen.getAllByRole("button", { name: /despinear/i });
    expect(buttons).toHaveLength(2);
  });
});