import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CrownAction } from "./crown-action";

// Mock da query de payment-status — reusa o mesmo queryKey de PhaseActions
// (TanStack dedup em runtime; mock aqui para controle determinístico).
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
  ]);
  return render(
    <QueryClientProvider client={qc}>
      <Stub initialEntries={["/"]} />
    </QueryClientProvider>,
  );
}

const phase = (reviewStatus: "APPROVED" | "REJECTED" | null = null) => ({
  gate: "COMPLIANCE_FEE",
  exists: true,
  paid: true,
  paidAt: null,
  createdAt: null,
  status: "PAID",
  reviewStatus,
  originalAmount: 0,
  discountAmount: 0,
  paidAmount: 0,
});

describe("CrownAction (ação 'Coroar')", () => {
  beforeEach(() => mockUseQuery.mockReset());

  it("loading: renderiza placeholder neutro", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderWithRouter(
      <CrownAction startupId={1} startupName="Acme" onClick={() => {}} />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("NÃO renderiza quando fase 3 não tem decisão (sem reviewStatus)", () => {
    mockUseQuery.mockReturnValue({
      isLoading: false,
      data: { startupId: 1, phases: { 1: phase(), 2: phase(), 3: phase(null) } },
    });
    const { container } = renderWithRouter(
      <CrownAction startupId={1} startupName="Acme" onClick={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: /Coroar/i })).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it("NÃO renderiza quando fase 3 está REJECTED", () => {
    mockUseQuery.mockReturnValue({
      isLoading: false,
      data: {
        startupId: 1,
        phases: { 1: phase("APPROVED"), 2: phase("APPROVED"), 3: phase("REJECTED") },
      },
    });
    renderWithRouter(<CrownAction startupId={1} startupName="Acme" onClick={() => {}} />);
    expect(screen.queryByRole("button", { name: /Coroar/i })).not.toBeInTheDocument();
  });

  it("renderiza botão com aria-label quando fase 3 APPROVED", () => {
    mockUseQuery.mockReturnValue({
      isLoading: false,
      data: {
        startupId: 42,
        phases: {
          1: phase("APPROVED"),
          2: phase("APPROVED"),
          3: phase("APPROVED"),
        },
      },
    });
    renderWithRouter(<CrownAction startupId={42} startupName="Acme Inc" onClick={() => {}} />);
    const btn = screen.getByRole("button", { name: /Coroar Acme Inc/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("data-testid", "crown-action");
    expect(btn).toHaveAttribute("title", expect.stringContaining("Coroar"));
  });

  it("dispara onClick ao clicar", () => {
    mockUseQuery.mockReturnValue({
      isLoading: false,
      data: {
        startupId: 7,
        phases: { 1: phase(), 2: phase(), 3: phase("APPROVED") },
      },
    });
    const onClick = vi.fn();
    renderWithRouter(<CrownAction startupId={7} startupName="Beta" onClick={onClick} />);
    screen.getByRole("button", { name: /Coroar Beta/i }).click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
