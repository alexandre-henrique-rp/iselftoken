import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ComplianceDashboardScreen } from "~/components/compliance/compliance-dashboard-screen";
import { useComplianceDashboardSummaryQuery } from "~/hooks/use-compliance-dashboard-summary";
import { useComplianceStartupDecisionMutation } from "~/hooks/use-compliance-startup-decision";

vi.mock("~/hooks/use-compliance-dashboard-summary", () => ({
  useComplianceDashboardSummaryQuery: vi.fn(),
}));

vi.mock("~/hooks/use-compliance-startup-decision", () => ({
  useComplianceStartupDecisionMutation: vi.fn(),
}));

const mockedSummary = vi.mocked(useComplianceDashboardSummaryQuery);
const mockedDecision = vi.mocked(useComplianceStartupDecisionMutation);

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/compliance/dashboard"]}>
        <ComplianceDashboardScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ComplianceDashboardScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDecision.mockReturnValue({ mutate: vi.fn() } as never);
  });

  it("renderiza skeleton no carregamento inicial", () => {
    mockedSummary.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() } as never);

    renderScreen();

    expect(screen.getByRole("status")).toHaveAccessibleName("Carregando dashboard de Compliance");
  });

  it("renderiza erro com retry", () => {
    mockedSummary.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() } as never);

    renderScreen();

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o dashboard.");
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("renderiza empty states das filas", () => {
    mockedSummary.mockReturnValue({
      data: { kpis: { kyc_pending: 0, startups_pending: 0, approved_today: 0 }, recentKycDecisions: [], pendingApprovals: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);

    renderScreen();

    expect(screen.getByText("Nenhuma startup pendente de aprovação.")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma decisão recente de KYC.")).toBeInTheDocument();
  });

  it("exibe botões para todas as páginas operacionais de Compliance", () => {
    mockedSummary.mockReturnValue({
      data: { kpis: { kyc_pending: 2, startups_pending: 1, approved_today: 3 }, recentKycDecisions: [], pendingApprovals: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);

    renderScreen();

    const expectedLinks = [
      ["Dashboard", "/compliance/dashboard"],
      ["Usuários", "/compliance/users"],
      ["Startups", "/compliance/startups"],
      ["Campanhas", "/compliance/campaigns"],
      ["Solicitações de alteração", "/compliance/change-requests"],
      ["Repasses", "/compliance/repasses"],
      ["Selos", "/compliance/seals"],
    ] as const;

    for (const [label, href] of expectedLinks) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toHaveAttribute("href", href);
    }
  });
});
