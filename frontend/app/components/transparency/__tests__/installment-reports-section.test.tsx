/**
 * Testes do InstallmentReportsSection (FIN-09 + FIN-11 §8.2).
 *
 * Usa mocks do hook `useTransparencyInstallmentPosts` para isolar
 * a renderizacao da secao do seu fetch.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { InstallmentReportsSection } from "../installment-reports-section";

// Mock do hook de instalment posts
vi.mock("~/hooks/use-transparency-installment-posts", () => ({
  useTransparencyInstallmentPosts: vi.fn(),
}));

import { useTransparencyInstallmentPosts } from "~/hooks/use-transparency-installment-posts";

const mockUse = useTransparencyInstallmentPosts as unknown as ReturnType<typeof vi.fn>;

const mockPost = (overrides: Partial<{
  id: number;
  title: string;
  content: string;
  sourceType: string;
  sourceId: string | null;
  publishedAt: string;
  periodMonth: number;
  periodYear: number;
}> = {}) => ({
  id: 100,
  startupId: 1,
  authorId: 50,
  type: "FINANCIAL_REPORT" as const,
  title: "Solicitacao de Repasse aprovada - Parcela 3/12",
  content: "## Aprovacao\n\n**Valor:** R$ 10.000,00\n\nTexto do relatorio.",
  sourceType: "INSTALLMENT_REQUEST" as const,
  sourceId: "300",
  publishedAt: "2026-09-15T10:00:00Z",
  updatedAt: "2026-09-15T10:00:00Z",
  deletedAt: null,
  periodMonth: 9,
  periodYear: 2026,
  attachments: [],
  ...overrides,
});

describe("InstallmentReportsSection", () => {
  it("renderiza skeleton durante carregamento", () => {
    mockUse.mockReturnValue({
      posts: [],
      total: 0,
      isLoading: true,
      isError: false,
    });
    render(
      <MemoryRouter>
        <InstallmentReportsSection startupId={1} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("installment-reports-section")).toHaveAttribute(
      "data-loading",
      "true",
    );
  });

  it("renderiza mensagem de erro amigavel", () => {
    mockUse.mockReturnValue({
      posts: [],
      total: 0,
      isLoading: false,
      isError: true,
    });
    render(
      <MemoryRouter>
        <InstallmentReportsSection startupId={1} />
      </MemoryRouter>,
    );
    expect(
      screen.getByTestId("installment-reports-section-error"),
    ).toBeInTheDocument();
  });

  it("renderiza empty state quando nao ha relatorios", () => {
    mockUse.mockReturnValue({
      posts: [],
      total: 0,
      isLoading: false,
      isError: false,
    });
    render(
      <MemoryRouter>
        <InstallmentReportsSection startupId={1} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Nenhum relatorio de solicitacao/i)).toBeInTheDocument();
  });

  it("renderiza grid de cards quando ha relatorios", () => {
    mockUse.mockReturnValue({
      posts: [
        mockPost({ id: 1, title: "Solicitacao de Repasse aprovada - Parcela 3/12" }),
        mockPost({ id: 2, title: "Solicitacao de Repasse aprovada - Parcela 4/12" }),
      ],
      total: 2,
      isLoading: false,
      isError: false,
    });
    render(
      <MemoryRouter>
        <InstallmentReportsSection startupId={1} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("installment-report-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("installment-report-card-2")).toBeInTheDocument();
    expect(screen.getByText(/Relatorios de Solicitacoes/i)).toBeInTheDocument();
    // badge count
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renderiza link para solicitacao original quando buildRequestLink fornecido", () => {
    mockUse.mockReturnValue({
      posts: [mockPost({ id: 1 })],
      total: 1,
      isLoading: false,
      isError: false,
    });
    render(
      <MemoryRouter>
        <InstallmentReportsSection
          startupId={1}
          buildRequestLink={() => "/founder/campaigns/50/financeiro?installment=1"}
        />
      </MemoryRouter>,
    );
    const link = screen.getByTestId("installment-report-link-1");
    expect(link).toHaveAttribute(
      "href",
      "/founder/campaigns/50/financeiro?installment=1",
    );
    expect(link).toHaveTextContent(/Ver solicitacao original/i);
  });

  it("respeita visibleLimit e mostra contagem hidden quando ha mais", () => {
    const posts = Array.from({ length: 8 }).map((_, i) =>
      mockPost({ id: i + 1, title: `Solicitacao de Repasse aprovada - Parcela ${i + 1}/12` }),
    );
    mockUse.mockReturnValue({
      posts: posts.slice(0, 8),
      total: 8,
      isLoading: false,
      isError: false,
    });
    render(
      <MemoryRouter>
        <InstallmentReportsSection startupId={1} visibleLimit={3} />
      </MemoryRouter>,
    );
    // Mostra 3 cards
    expect(screen.getByTestId("installment-report-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("installment-report-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("installment-report-card-3")).toBeInTheDocument();
    expect(screen.queryByTestId("installment-report-card-4")).not.toBeInTheDocument();
    // Mensagem de "Mostrando X de Y"
    expect(screen.getByText(/Mostrando 3 de 8/i)).toBeInTheDocument();
  });
});