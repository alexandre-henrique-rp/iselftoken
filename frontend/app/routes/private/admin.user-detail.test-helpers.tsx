import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import AdminUserDetailPage from "~/routes/private/admin.user-detail";

/**
 * Helper: renderiza AdminUserDetailPage passando o `user` como prop
 * (mesmo padrão do AdminDashboardScreen). Não usa loader real.
 */
export function renderWithMemoryRouter(
  user: any,
  initialPath = "/admin/users/1",
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: "/admin/users/:id",
        element: (
          <QueryClientProvider client={qc}>
            <AdminUserDetailPage user={user} />
          </QueryClientProvider>
        ),
        // Sem loader — o componente recebe user via prop.
      },
    ],
    { initialEntries: [initialPath] },
  );
  return render(<RouterProvider router={router} />);
}
