import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ComplianceUsersScreen } from "~/components/compliance/compliance-users-screen";
import { useAdminUsersQuery } from "~/hooks/use-admin-users";
import type { ComplianceUsersFilters } from "~/lib/compliance-users-loader";

vi.mock("~/hooks/use-admin-users", () => ({
  useAdminUsersQuery: vi.fn(),
}));

const mockedUseAdminUsersQuery = vi.mocked(useAdminUsersQuery);
const filters: ComplianceUsersFilters = { page: 1, limit: 25 };

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const router = createMemoryRouter(
    [
      {
        path: "/compliance/users",
        element: (
          <QueryClientProvider client={queryClient}>
            <ComplianceUsersScreen filters={filters} />
          </QueryClientProvider>
        ),
      },
    ],
    { initialEntries: ["/compliance/users"] },
  );

  return render(<RouterProvider router={router} />);
}

describe("ComplianceUsersScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza skeleton durante o carregamento inicial", () => {
    mockedUseAdminUsersQuery.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: true,
      refetch: vi.fn(),
    } as never);

    renderScreen();

    expect(screen.getByRole("status")).toHaveAccessibleName(
      "Carregando usuários",
    );
  });

  it("renderiza erro com ação de retry", () => {
    mockedUseAdminUsersQuery.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
      refetch: vi.fn(),
    } as never);

    renderScreen();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os usuários.",
    );
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeInTheDocument();
  });

  it("renderiza o empty state quando não há usuários", () => {
    mockedUseAdminUsersQuery.mockReturnValue({
      data: { data: [], total: 0, pagina: 1 },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    } as never);

    renderScreen();

    expect(screen.getByText("Nenhum usuário cadastrado.")).toBeInTheDocument();
  });

  it("renderiza usuários, KYC, plano e paginação", () => {
    mockedUseAdminUsersQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 7,
            publicId: "usr_publico",
            nome: "Maria Silva",
            email: "maria@example.com",
            role: "COMPLIANCE",
            isActive: true,
            createdAt: "2026-01-15T10:00:00Z",
            avatar: { id: 2, url_sm: null, status: "APPROVED" },
            subscriptions: [
              {
                id: 3,
                status: "ACTIVE",
                plan: { nome: "Investidor", slug: "investidor" },
              },
            ],
          },
        ],
        total: 26,
        pagina: 1,
      },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    } as never);

    renderScreen();

    expect(screen.getAllByText("Maria Silva")).not.toHaveLength(0);
    expect(screen.getAllByText("KYC aprovado")).not.toHaveLength(0);
    expect(screen.getAllByText("Investidor")).not.toHaveLength(0);
    expect(screen.getByText("de 2")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Ver detalhes de Maria Silva" })[0],
    ).toHaveAttribute("href", "/compliance/users/7");
  });
});
