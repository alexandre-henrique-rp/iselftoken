import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { AdminDashboardScreen } from "~/components/admin/admin-dashboard-screen";

const fullSample = {
  kpis: {
    gmv: 100_000,
    gmvToday: 5_000,
    gmvYesterday: 4_000,
    gmvDeltaPct: 25,
    totalRedeemed: 1_000,
    tokensGenerated: 50_000,
    tokensSold: 32_500,
    activeInvestors: 42,
    totalUsers: 150,
    totalStartups: 25,
    activeCampaigns: 8,
    pendingRedemptionsAmount: 19_500,
    pendingRedemptionsCount: 3,
    activeCampaignsAvgProgress: 77,
    kycPendingCount: 5,
    kycOldestAgeHours: 24,
    paymentsPaidToday: 7,
    paymentsPaidTodayAmount: 4_250,
    paymentsPendingCount: 3,
    paymentsPendingAmount: 1_500,
    paymentsExpiredCount: 1,
    startupRepasseTotal: 80_000,
    platformSpreadTotal: 12_000,
    platformFeeTotal: 4_800,
    platformRevenueTotal: 16_800,
  },
  gmvMonthly: { labels: ["Jan", "Fev", "Mar"], data: [1000, 1500, 2500] },
  splitMonthly: {
    labels: ["Jan", "Fev", "Mar"],
    repasse: [500, 750, 1500],
    lucro: [100, 150, 250],
  },
  userGrowth: { labels: ["Jan", "Fev", "Mar"], data: [10, 15, 20] },
  startupsMonthly: { labels: ["Jan", "Fev", "Mar"], data: [2, 3, 4] },
  pendingRedemptions: [
    {
      id: 1,
      startupNome: "Acme Tech",
      setor: "Fintech",
      amount: 5000,
      status: "REQUESTED",
      createdAt: "2026-09-01T10:00:00Z",
    },
    {
      id: 2,
      startupNome: "Beta Inc",
      setor: "Health",
      amount: 12000,
      status: "REQUESTED",
      createdAt: "2026-09-02T10:00:00Z",
    },
    {
      id: 3,
      startupNome: "Gamma Labs",
      setor: null,
      amount: 2500,
      status: "REQUESTED",
      createdAt: "2026-09-03T10:00:00Z",
    },
  ],
  activeCampaigns: [
    { id: 1, title: "Rodada Seed", startupNome: "Acme Tech", progress: 80 },
  ],
};

const emptySample = {
  kpis: {
    gmv: 0,
    gmvToday: 0,
    gmvYesterday: 0,
    gmvDeltaPct: 0,
    totalRedeemed: 0,
    tokensGenerated: 0,
    tokensSold: 0,
    activeInvestors: 0,
    totalUsers: 0,
    totalStartups: 0,
    activeCampaigns: 0,
    pendingRedemptionsAmount: 0,
    pendingRedemptionsCount: 0,
    activeCampaignsAvgProgress: 0,
    kycPendingCount: 0,
    kycOldestAgeHours: 0,
    paymentsPaidToday: 0,
    paymentsPaidTodayAmount: 0,
    paymentsPendingCount: 0,
    paymentsPendingAmount: 0,
    paymentsExpiredCount: 0,
    startupRepasseTotal: 0,
    platformSpreadTotal: 0,
    platformFeeTotal: 0,
    platformRevenueTotal: 0,
  },
  gmvMonthly: { labels: [], data: [] },
  splitMonthly: { labels: [], repasse: [], lucro: [] },
  userGrowth: { labels: [], data: [] },
  startupsMonthly: { labels: [], data: [] },
  pendingRedemptions: [],
  activeCampaigns: [],
};

function renderScreen(props: {
  data: typeof fullSample | null;
  isLoading: boolean;
  isError: boolean;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <QueryClientProvider client={queryClient}>
            <AdminDashboardScreen
              data={props.data}
              isLoading={props.isLoading}
              isError={props.isError}
            />
          </QueryClientProvider>
        ),
      },
    ],
    { initialEntries: ["/"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("AdminDashboardScreen — Tile Mosaic", () => {
  it("NÃO mostra zeros quando está loading (mostra skeleton)", () => {
    renderScreen({ data: null, isLoading: true, isError: false });
    expect(screen.queryByText(/R\$\s*0/)).not.toBeInTheDocument();
    expect(screen.queryByText("GMV")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAccessibleName(
      "Carregando dashboard",
    );
  });

  it("NÃO mostra zeros quando há erro (mostra mensagem + retry)", () => {
    renderScreen({ data: null, isLoading: false, isError: true });
    expect(screen.queryByText(/R\$\s*0/)).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Não foi possível carregar/,
    );
  });

  it("NÃO mostra zeros quando data é null (estado vazio explícito)", () => {
    renderScreen({ data: null, isLoading: false, isError: false });
    expect(screen.queryByText(/R\$\s*0/)).not.toBeInTheDocument();
    expect(screen.getByText(/Nenhum dado retornado/)).toBeInTheDocument();
  });

  it("Hero tile renderiza GMV (5.000) + delta +25% + sparkline", () => {
    renderScreen({ data: fullSample, isLoading: false, isError: false });
    expect(screen.getByText("GMV")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s*5\.000/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText(/\+25%/)).toBeInTheDocument();
    expect(
      screen.getByText(/Volume de investimentos confirmados/),
    ).toBeInTheDocument();
  });

  it("4 secondary tiles renderizam valores reais do banco", () => {
    renderScreen({ data: fullSample, isLoading: false, isError: false });
    expect(screen.getByText("Usuários")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("Startups")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("32.500")).toBeInTheDocument(); // tokensSold
    expect(screen.getAllByText(/captação média/).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("Hero GMV full-width (não divide em grid 60/40)", () => {
    const { container } = renderScreen({
      data: fullSample,
      isLoading: false,
      isError: false,
    });
    // O Hero agora vive em um section sem col-span (não usa lg:col-span-*).
    // Garante que o GMV aparece antes dos tiles secundários no DOM.
    const heroLabel = screen.getByText("GMV");
    const usuariosLabel = screen.getByText("Usuários");
    expect(
      heroLabel.compareDocumentPosition(usuariosLabel) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Sem lg:col-span-* no container do Hero.
    const heroWrapper = heroLabel.closest("div.relative");
    expect(heroWrapper).not.toHaveClass("lg:col-span-8");
  });

  it("cada secondary tile renderiza descrição explicativa", () => {
    renderScreen({ data: fullSample, isLoading: false, isError: false });
    expect(
      screen.getByText(/Total de pessoas cadastradas/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Startups registradas e\/ou em captação/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Rodadas com status OPEN recebendo investimentos/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Quantidade total de tokens já vendidos/),
    ).toBeInTheDocument();
  });

  it("Hero GMV renderiza descrição longa explicando o cálculo", () => {
    renderScreen({ data: fullSample, isLoading: false, isError: false });
    expect(
      screen.getByText(/Soma do repasse devido às startups/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Exclui reservas, taxas de compliance/),
    ).toBeInTheDocument();
  });

  it("3 action tiles renderizam contadores e detalhes do banco", () => {
    renderScreen({ data: fullSample, isLoading: false, isError: false });
    // Saques pendentes: 3 itens, R$ 19.500 aguardando
    expect(screen.getByText(/Saques pendentes/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*19\.500 aguardando/)).toBeInTheDocument();
    expect(screen.getByText("Ver fila completa")).toBeInTheDocument();
    // KYC em fila: 5 itens, mais antigo 24h
    expect(screen.getByText("KYC em fila")).toBeInTheDocument();
    expect(screen.getByText(/Mais antigo: 24h/)).toBeInTheDocument();
    expect(screen.getByText("Revisar KYC")).toBeInTheDocument();
  });

  it("Variação visual KYC: destructiva quando kycOldestAgeHours >= 24", () => {
    const { container } = renderScreen({
      data: fullSample,
      isLoading: false,
      isError: false,
    });
    // border-destructive presente no tile de KYC
    const kycTile = container.querySelector('[href="/admin/kyc"]');
    expect(kycTile).toHaveClass("border-destructive/30");
  });

  it("Estado vazio do banco: action tiles mostram 'Nenhum' (não zeros)", () => {
    renderScreen({ data: emptySample, isLoading: false, isError: false });
    expect(screen.getByText(/Nenhum resgate aguardando/)).toBeInTheDocument();
    expect(
      screen.getByText(/Nenhuma campanha em captação/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nenhum KYC aguardando/)).toBeInTheDocument();
    // Sem yesterday=0, deltaPct é null — Hero NÃO renderiza delta (intencional)
    expect(screen.queryByText(/\+0%|\b0%\b/)).not.toBeInTheDocument();
  });

  it("cards operacionais compartilham dimensões e alinhamento", () => {
    renderScreen({ data: emptySample, isLoading: false, isError: false });
    const cards = [
      screen.getByRole("region", { name: "Saques pendentes" }),
      screen.getByText("Ver startups").closest("a"),
      screen.getByText("Revisar KYC").closest("a"),
    ];

    for (const card of cards) {
      expect(card).not.toBeNull();
      expect(card).toHaveClass("h-full", "min-h-[108px]", "rounded-xl", "p-3");
    }
  });

  describe("Split Financeiro (admin-only)", () => {
    it("renderiza seção dedicada com 4 KPIs quando há dados", () => {
      renderScreen({ data: fullSample, isLoading: false, isError: false });
      expect(screen.getByText("Split Financeiro")).toBeInTheDocument();
      expect(screen.getByText("Repasse às startups")).toBeInTheDocument();
      expect(screen.getByText("Lucro plataforma")).toBeInTheDocument();
      expect(screen.getByText("Spread (markup)")).toBeInTheDocument();
      expect(screen.getByText("Taxa do checkout")).toBeInTheDocument();
    });

    it("cada card do split financeiro tem descrição explicativa", () => {
      renderScreen({ data: fullSample, isLoading: false, isError: false });
      expect(
        screen.getByText(/Valor devido aos fundadores/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Receita total da plataforma: spread/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/ganho da plataforma por token acima/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Alíquota atual: fundraising\.platformFee/),
      ).toBeInTheDocument();
    });

    it("mostra link para auditoria por campanha", () => {
      renderScreen({ data: fullSample, isLoading: false, isError: false });
      const link = screen.getByRole("link", {
        name: /auditoria por campanha/i,
      });
      expect(link).toHaveAttribute("href", "/admin/financeiro/split");
    });

    it("NÃO mostra zeros quando data é null (loading/erro), mas mantém contrato", () => {
      // Quando data=null, o componente mostra empty state — não renderiza
      // a seção de split financeiro (sem zeros fabricados).
      renderScreen({ data: null, isLoading: false, isError: false });
      expect(
        screen.queryByText("Split Financeiro"),
      ).not.toBeInTheDocument();
    });
  });
});
