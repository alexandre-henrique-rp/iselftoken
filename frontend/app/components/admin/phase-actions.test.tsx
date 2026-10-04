import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PhaseActions } from "./phase-actions";

// Mock da query de payment-status para controlar os gates por teste.
const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return { ...actual, useQuery: (opts: unknown) => mockUseQuery(opts) };
});

function renderWithRouter(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Stub = createRoutesStub([
    { path: "/", Component: () => ui },
    { path: "/admin/startups/:id/:phase", Component: () => <div>fase</div> },
  ]);
  return render(
    <QueryClientProvider client={qc}>
      <Stub initialEntries={["/"]} />
    </QueryClientProvider>,
  );
}

const gate = (unlocked: boolean, reason: string | null = null) => ({
  unlocked,
  reason,
  gate: "X",
  exists: true,
  paid: unlocked,
  paidAt: null,
  status: null,
  reviewStatus: null,
});

describe("PhaseActions (S2)", () => {
  beforeEach(() => mockUseQuery.mockReset());

  it("loading: renderiza 3 placeholders (sem links)", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderWithRouter(
      <PhaseActions startupId={1} startupName="Acme" />,
    );
    expect(container.querySelectorAll("a")).toHaveLength(0);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(3);
  });

  it("fase 1 unlocked → link; fases 2 e 3 locked → não-clicáveis", () => {
    mockUseQuery.mockReturnValue({
      isLoading: false,
      data: {
        startupId: 1,
        phases: {
          1: gate(true),
          2: gate(false, "Aguardando pagamento da Taxa de Compliance"),
          3: gate(false, "Aguardando confirmação de todos os pagamentos"),
        },
      },
    });
    renderWithRouter(<PhaseActions startupId={1} startupName="Acme" />);

    const fase1 = screen.getByRole("link", { name: /Fase 1/i });
    expect(fase1).toHaveAttribute("href", "/admin/startups/1/1");

    // Fases bloqueadas não são links.
    expect(
      screen.queryByRole("link", { name: /Fase 2/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText(/Fase 2 bloqueada/i),
    ).toBeInTheDocument();
  });

  it("todas unlocked → 3 links para as rotas de fase", () => {
    mockUseQuery.mockReturnValue({
      isLoading: false,
      data: {
        startupId: 9,
        phases: { 1: gate(true), 2: gate(true), 3: gate(true) },
      },
    });
    renderWithRouter(<PhaseActions startupId={9} startupName="Beta" />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /Fase 3/i })).toHaveAttribute(
      "href",
      "/admin/startups/9/3",
    );
    expect(screen.getByRole("link", { name: /Fase 1/i })).toHaveClass(
      "text-warning",
    );
  });

  it("usa magenta somente nas fases aprovadas", () => {
    mockUseQuery.mockReturnValue({
      isLoading: false,
      data: {
        startupId: 10,
        phases: {
          1: { ...gate(true), reviewStatus: "APPROVED" },
          2: gate(true),
          3: gate(true),
        },
      },
    });
    renderWithRouter(<PhaseActions startupId={10} startupName="Gamma" />);

    expect(screen.getByRole("link", { name: /Fase 1/i })).toHaveClass(
      "text-primary",
    );
    expect(screen.getByRole("link", { name: /Fase 2/i })).toHaveClass(
      "text-warning",
    );
  });
});
