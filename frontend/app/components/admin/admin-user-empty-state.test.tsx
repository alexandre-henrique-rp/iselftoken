import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { AdminUserEmptyState } from "~/components/admin/admin-user-empty-state";

function renderEmpty(hasActiveFilters: boolean, withQueryFilters = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const initialEntries = withQueryFilters ? ["/admin/users?search=joao"] : ["/admin/users"];
  const router = createMemoryRouter(
    [
      {
        path: "/admin/users",
        element: (
          <QueryClientProvider client={qc}>
            <AdminUserEmptyState hasActiveFilters={hasActiveFilters} />
          </QueryClientProvider>
        ),
      },
    ],
    { initialEntries },
  );
  return render(<RouterProvider router={router} />);
}

describe("AdminUserEmptyState", () => {
  it("shows 'Nenhum usuário cadastrado' when no filters active", () => {
    renderEmpty(false);
    expect(
      screen.getByText(/Nenhum usuário cadastrado/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Limpar filtros/i)).not.toBeInTheDocument();
  });

  it("shows 'Nenhum usuário encontrado para esses filtros' when filters active (prop)", () => {
    renderEmpty(true);
    expect(
      screen.getByText(/Nenhum usuário encontrado para esses filtros/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Limpar filtros/i)).toBeInTheDocument();
  });

  it("shows 'Nenhum usuário encontrado para esses filtros' when URL has search filter", () => {
    renderEmpty(false, true);
    expect(
      screen.getByText(/Nenhum usuário encontrado para esses filtros/i),
    ).toBeInTheDocument();
  });

  it("has role='status' for accessibility", () => {
    renderEmpty(false);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});