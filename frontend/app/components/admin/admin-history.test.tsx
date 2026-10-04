import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { AdminHistoryTable } from "./admin-history-table";
import { AdminHistoryEmptyState } from "./admin-history-empty-state";
import { AdminHistoryPagination } from "./admin-history-pagination";
import { AdminHistoryHeader } from "./admin-history-header";
import { AdminHistorySkeleton } from "./admin-history-skeleton";

const baseEvent = {
  timestamp: "2026-09-08T10:00:00.000Z",
  actor: { id: 1, nome: "Carlos Silva", email: "carlos@test.com" },
  actorRole: "ADMIN",
  startup: null as { id: number; nome: string } | null,
  description: "Teste de evento",
};

function routerWrapper(ui: React.ReactNode, initialEntries = ["/admin/history"]) {
  const router = createMemoryRouter(
    [{ path: "/admin/history", element: ui }],
    { initialEntries },
  );
  return <RouterProvider router={router} />;
}

// ─── AdminHistoryTable ──────────────────────────────

describe("AdminHistoryTable", () => {
  it("renders event rows", () => {
    render(
      routerWrapper(
        <AdminHistoryTable
          items={[
            {
              ...baseEvent,
              id: "inv-1",
              category: "INVESTIMENTO",
              type: "INVESTMENT_CREATED",
              action: "Investimento solicitado",
              status: "PENDING",
              amount: 5000,
            },
          ]}
        />,
      ),
    );
    expect(screen.getByText("Investimento solicitado")).toBeInTheDocument();
    expect(screen.getByText("Carlos Silva")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*5\.000,00/)).toBeInTheDocument();
  });

  it("renders dash for null actor and startup", () => {
    render(
      routerWrapper(
        <AdminHistoryTable
          items={[
            {
              ...baseEvent,
              id: "sys-1",
              category: "ADMIN",
              type: "SYSTEM_EVENT",
              action: "Evento do sistema",
              status: null,
              amount: null,
              actor: null,
              startup: null,
            },
          ]}
        />,
      ),
    );
    expect(screen.getByText("Evento do sistema")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2); // actor + startup
  });

  it("renders startup name when present", () => {
    render(
      routerWrapper(
        <AdminHistoryTable
          items={[
            {
              ...baseEvent,
              id: "inv-2",
              category: "INVESTIMENTO",
              type: "INVESTMENT_CREATED",
              action: "Investimento",
              status: null,
              amount: 1000,
              startup: { id: 1, nome: "Startup XYZ" },
            },
          ]}
        />,
      ),
    );
    expect(screen.getByText("Startup XYZ")).toBeInTheDocument();
  });

  it("renders category badges for new categories", () => {
    const categories = [
      { category: "USUARIO", expected: "USUARIO" },
      { category: "ASSINATURA", expected: "ASSINATURA" },
      { category: "KYC", expected: "KYC" },
      { category: "SAQUE", expected: "SAQUE" },
    ];

    for (const { category, expected } of categories) {
      const { unmount } = render(
        routerWrapper(
          <AdminHistoryTable
            items={[
              {
                ...baseEvent,
                id: `cat-${category}`,
                category,
                type: "TEST",
                action: `Ação ${category}`,
                status: null,
                amount: null,
              },
            ]}
          />,
        ),
      );
      expect(screen.getByText(expected)).toBeInTheDocument();
      unmount();
    }
  });

  it("does not render amount when null", () => {
    render(
      routerWrapper(
        <AdminHistoryTable
          items={[
            {
              ...baseEvent,
              id: "no-amount",
              category: "ADMIN",
              type: "TEST",
              action: "Sem valor",
              status: null,
              amount: null,
            },
          ]}
        />,
      ),
    );
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
  });

  it("renders status when present", () => {
    render(
      routerWrapper(
        <AdminHistoryTable
          items={[
            {
              ...baseEvent,
              id: "status-1",
              category: "PAGAMENTO",
              type: "PAYMENT_PAID",
              action: "Pagamento",
              status: "PAID",
              amount: 200,
            },
          ]}
        />,
      ),
    );
    expect(screen.getByText("PAID")).toBeInTheDocument();
  });
});

// ─── AdminHistoryEmptyState ─────────────────────────

describe("AdminHistoryEmptyState", () => {
  it("shows empty message when no error", () => {
    render(routerWrapper(<AdminHistoryEmptyState />));
    expect(screen.getByText(/Nenhum evento encontrado/)).toBeInTheDocument();
    expect(screen.getByText(/Ajuste os filtros acima/)).toBeInTheDocument();
  });

  it("shows error message when erro prop provided", () => {
    render(routerWrapper(<AdminHistoryEmptyState erro="Falha ao carregar" />));
    expect(screen.getByText("Falha ao carregar")).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum evento encontrado/)).not.toBeInTheDocument();
  });
});

// ─── AdminHistoryPagination ─────────────────────────

describe("AdminHistoryPagination", () => {
  it("renders page indicator", () => {
    render(
      routerWrapper(
        <AdminHistoryPagination qs="" page={1} totalPages={5} />,
      ),
    );
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
  });

  it("hides Previous on page 1", () => {
    render(
      routerWrapper(
        <AdminHistoryPagination qs="" page={1} totalPages={5} />,
      ),
    );
    expect(screen.queryByText("Anterior")).not.toBeInTheDocument();
  });

  it("shows Next when not on last page", () => {
    render(
      routerWrapper(
        <AdminHistoryPagination qs="" page={2} totalPages={5} />,
      ),
    );
    expect(screen.getByText("Próxima")).toBeInTheDocument();
    expect(screen.getByText("Anterior")).toBeInTheDocument();
  });

  it("hides Next on last page", () => {
    render(
      routerWrapper(
        <AdminHistoryPagination qs="" page={5} totalPages={5} />,
      ),
    );
    expect(screen.queryByText("Próxima")).not.toBeInTheDocument();
  });

  it("preserves query string in pagination links", () => {
    render(
      routerWrapper(
        <AdminHistoryPagination qs="search=foo&category=ADMIN" page={2} totalPages={5} />,
      ),
    );
    const prevLink = screen.getByText("Anterior").closest("a");
    const nextLink = screen.getByText("Próxima").closest("a");
    expect(prevLink?.getAttribute("href")).toContain("search=foo");
    expect(prevLink?.getAttribute("href")).toContain("category=ADMIN");
    expect(nextLink?.getAttribute("href")).toContain("search=foo");
  });
});

// ─── AdminHistoryHeader ─────────────────────────────

describe("AdminHistoryHeader", () => {
  it("renders title and subtitle", () => {
    render(routerWrapper(<AdminHistoryHeader qs="" />));
    expect(screen.getByText("Histórico de Transações")).toBeInTheDocument();
    expect(screen.getByText("Auditoria")).toBeInTheDocument();
  });

  it("renders export CSV link", () => {
    render(routerWrapper(<AdminHistoryHeader qs="" />));
    const link = screen.getByText("Exportar CSV").closest("a");
    expect(link).toBeInTheDocument();
    expect(link?.getAttribute("href")).toBe("/api/admin/history/export");
  });

  it("appends query string to export link", () => {
    render(routerWrapper(<AdminHistoryHeader qs="?category=ADMIN" />));
    const link = screen.getByText("Exportar CSV").closest("a");
    expect(link?.getAttribute("href")).toContain("category=ADMIN");
  });
});

// ─── AdminHistorySkeleton ───────────────────────────

describe("AdminHistorySkeleton", () => {
  it("renders animated skeleton elements", () => {
    const { container } = render(routerWrapper(<AdminHistorySkeleton />));
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders 6 column headers in skeleton", () => {
    const { container } = render(routerWrapper(<AdminHistorySkeleton />));
    const headerRow = container.querySelector(
      ".grid-cols-\\[110px_120px_1\\.6fr_1\\.1fr_1fr_0\\.9fr\\]",
    );
    expect(headerRow).toBeInTheDocument();
  });
});
