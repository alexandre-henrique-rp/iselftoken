import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { RepasseDashboard } from "../repasse-dashboard";
import type { RepasseDashboardData } from "~/types/repasse";

const BASE_DATA: RepasseDashboardData = {
  repasse: {
    id: 1,
    campaignId: 10,
    numeroParcelas: 12,
    valorParcela: "1000.00",
    valorUltimaParcela: null,
    intervaloDias: 30,
    valorTotalCaptacao: "12000.00",
    status: "IN_PROGRESS",
    complianceApprovedAt: "2026-01-15T10:00:00Z",
    financeiroConfiguredAt: "2026-01-16T10:00:00Z",
  },
  startup: { id: 42, nome: "AcmePag" },
  installments: [
    {
      id: 100,
      repasseId: 1,
      numero: 1,
      valor: "1000.00",
      scheduledDate: "2026-01-20T10:00:00Z",
      paidAt: "2026-01-22T10:00:00Z",
      status: "COMPLETED",
    },
    {
      id: 101,
      repasseId: 1,
      numero: 2,
      valor: "1000.00",
      scheduledDate: "2026-02-20T10:00:00Z",
      paidAt: null,
      status: "REQUESTED",
      request: {
        id: 500,
        installmentId: 101,
        founderUserId: 99,
        startupId: 42,
        allocationPercents: {
          marketing: 40,
          desenvolvimento: 30,
          infraestrutura: 10,
          pessoal: 10,
          juridico: 5,
          operacional: 3,
          reservaCaixa: 2,
        },
        valorSolicitado: "1000.00",
        status: "REQUESTED",
        submittedAt: "2026-08-10T10:00:00Z",
        tsLimitePagamento: "2026-08-17T10:00:00Z",
        attemptNumber: 1,
        bankInfoSnapshot: {
          banco: "Itaú",
          agencia: "0001",
          conta: "12345-6",
          tipoConta: "CORRENTE",
        },
      },
    },
    {
      id: 102,
      repasseId: 1,
      numero: 3,
      valor: "1000.00",
      scheduledDate: "2026-03-20T10:00:00Z",
      paidAt: null,
      status: "AWAITING_REQUEST",
    },
  ],
  currentInstallment: {
    id: 500,
    installmentId: 101, // igual ao installments[1].id → vai selecionar a parcela #2
    founderUserId: 42,
    startupId: 42,
    allocationPercents: {
      marketing: 14.285,
      desenvolvimento: 14.285,
      infraestrutura: 14.285,
      pessoal: 14.285,
      juridico: 14.285,
      operacional: 14.29,
      reservaCaixa: 14.285,
    },
    bankInfoSnapshot: {
      banco: "001",
      agencia: "0001",
      conta: "12345-6",
      tipoConta: "CORRENTE",
    },
    valorSolicitado: "1000.00",
    status: "REQUESTED",
    submittedAt: "2026-02-15T10:00:00Z",
    tsLimitePagamento: "2026-02-22T18:00:00Z",
    attemptNumber: 1,
  },
  kpis: {
    valorTotal: "12000.00",
    valorPago: "1000.00",
    valorPendente: "11000.00",
    proximaParcela: { numero: 2, valor: "1000.00", scheduledDate: "2026-02-20T10:00:00Z" },
    diasRestantesSLA: 3,
  },
  ultimasSolicitacoes: [],
};

function renderDashboard(data: RepasseDashboardData | null = BASE_DATA) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RepasseDashboard startupId={42} data={data} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RepasseDashboard", () => {
  it("renderiza header com nome da startup e badge de status", () => {
    renderDashboard();
    expect(screen.getByTestId("repasse-dashboard-header")).toBeInTheDocument();
    expect(screen.getByText("AcmePag")).toBeInTheDocument();
    const badge = screen.getByTestId("repasse-status-badge");
    expect(badge).toHaveAttribute("data-status", "IN_PROGRESS");
    expect(badge.textContent).toMatch(/Em andamento/i);
  });

  it("renderiza 4 KPI cards com data-testid", () => {
    renderDashboard();
    expect(screen.getByTestId("kpi-valor-total").textContent).toMatch(/R\$/);
    expect(screen.getByTestId("kpi-parcelas").textContent).toMatch(/1\/3 conclu/i);
    expect(screen.getByTestId("kpi-valor-pago").textContent).toMatch(/R\$/);
    expect(screen.getByTestId("kpi-proxima-parcela").textContent).toMatch(/#2/);
  });

  it("progress bar reflete parcelas concluidas (1/3 = 33%)", () => {
    renderDashboard();
    const bar = screen.getByTestId("kpi-progress");
    expect(bar).toHaveAttribute("data-progress", "33");
  });

  it("renderiza stepper com 3 parcelas e seleciona currentInstallment por padrao", () => {
    renderDashboard();
    const stepper = screen.getByTestId("repasse-stepper");
    expect(stepper).toBeInTheDocument();
    expect(screen.getByTestId("stepper-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("stepper-item-2")).toBeInTheDocument();
    expect(screen.getByTestId("stepper-item-3")).toBeInTheDocument();
    const item2 = screen.getByTestId("stepper-item-2");
    expect(item2).toHaveAttribute("aria-current", "true");
  });

  it("renderiza estado vazio quando nao ha dados", () => {
    renderDashboard(null);
    expect(screen.getByTestId("repasse-dashboard-empty")).toBeInTheDocument();
  });
});
