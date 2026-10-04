import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PayoutsScreen } from "./payouts-screen";
import type { AdminPayouts } from "~/lib/queries";

const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-query")>(
      "@tanstack/react-query",
    );
  return {
    ...actual,
    useQuery: () => mockUseQuery(),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

function renderScreen() {
  const Stub = createRoutesStub([
    { path: "/", Component: () => <PayoutsScreen /> },
    { path: "/admin/startups/:id", Component: () => <div>detalhe</div> },
    { path: "/financeiro/repasse/:id", Component: () => <div>repasse</div> },
  ]);
  return render(<Stub initialEntries={["/"]} />);
}

const data: AdminPayouts = {
  awaitingDecision: [
    {
      campaignId: 1,
      campaignName: "Rodada Seed",
      startupId: 10,
      startupName: "Acme",
      targetAmount: 500000,
      amountRaised: 300000,
      tokensSold: 7500,
      totalTokens: 12500,
      deadline: null,
    },
  ],
  installmentRequests: [
    {
      id: 42,
      installmentId: 4242,
      status: "REQUESTED",
      valorSolicitado: 20833,
      submittedAt: "2026-08-20T00:00:00.000Z",
      startupId: 10,
      startupName: "Acme",
      installmentNumber: 3,
      totalInstallments: 24,
      hasReport: true,
      hasComprovante: false,
      usoRecurso: "Captacao para acelerar onboarding via ads + 1 dev senior",
      observacao:
        "Vou contratar 1 senior backend por 2 meses para acelerar o refactor.",
      mensagemInvestidores:
        "Vou contratar 1 senior backend por 2 meses para acelerar o refactor.",
      allocationPercents: {
        marketing: 30,
        desenvolvimento: 50,
        pessoal: 20,
        infraestrutura: 0,
        juridico: 0,
        operacional: 0,
        reservaCaixa: 0,
      },
      allocationValues: {
        marketing: "R$ 6.250,00",
        desenvolvimento: "R$ 10.416,50",
        pessoal: "R$ 4.166,67",
      },
      bankInfoSnapshot: {
        banco: "C6 Bank",
        agencia: "0001",
        conta: "12345-6",
        tipoConta: "CORRENTE",
      },
      scheduledDate: "2026-09-30",
      valorParcela: 20833,
    },
  ],
  awaitingRequest: [
    {
      repasseId: 77,
      campaignId: 1,
      startupId: 20,
      startupName: "Beta Corp",
      numeroParcelas: 24,
      valorParcela: 20833,
      proximaParcela: 1,
    },
  ],
};

describe("PayoutsScreen (S4)", () => {
  beforeEach(() => mockUseQuery.mockReset());

  it("loading → skeletons", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderScreen();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
  });

  it("empty → mensagem de nenhum payout", () => {
    mockUseQuery.mockReturnValue({
      isLoading: false,
      data: { awaitingDecision: [], installmentRequests: [], awaitingRequest: [] },
    });
    renderScreen();
    expect(screen.getByText(/Nenhum payout pendente/i)).toBeInTheDocument();
  });

  it("error → alerta + retry", () => {
    mockUseQuery.mockReturnValue({
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });
    renderScreen();
    expect(
      screen.getByText(/Não foi possível carregar os payouts/i),
    ).toBeInTheDocument();
  });

  it("data → renderiza as 2 categorias com contadores e cards", () => {
    mockUseQuery.mockReturnValue({ isLoading: false, data });
    renderScreen();
    expect(
      screen.getByText(/Captação finalizada — decisão pendente/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Solicitações de parcela/i).length,
    ).toBeGreaterThan(0);
    // Card de decisão (Finalizar/Prorrogar) + card de parcela (Aprovar).
    expect(
      screen.getByText(/Finalizar definitivamente/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Prorrogar/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aprovar/i })).toBeInTheDocument();
    expect(screen.getByText(/Relatorio preenchido/i)).toBeInTheDocument();
    // Categoria 3: aguardando solicitação do founder.
    expect(
      screen.getByText(/Aguardando solicitação do founder/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Beta Corp/i)).toBeInTheDocument();
  });
});
