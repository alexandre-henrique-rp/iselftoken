import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { AdminUsersContent } from "~/components/admin/admin-users-content";
import { AdminUserHeader } from "~/components/admin/admin-user-header";
import { DashboardBackgroundWatermark } from "~/components/founder/dashboard-background-watermark";

/**
 * Integração dos 4 estados da rota /admin/users.
 * Mocka `useAdminUsersQuery` (fonte de dados) e valida que cada estado
 * renderiza o componente correto — sem zeros fabricados.
 */

function renderRoute(
  search = "",
  status = "",
  createdFrom = "",
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const url = `/admin/users?${[search && `search=${search}`, status && `status=${status}`, createdFrom && `createdFrom=${createdFrom}`].filter(Boolean).join("&")}`;
  const router = createMemoryRouter(
    [
      {
        path: "/admin/users",
        element: (
          <QueryClientProvider client={qc}>
            <main className="min-h-screen pt-3 pb-6 px-1.5 md:pt-4 md:pb-8 md:px-0">
              <div className="relative w-full max-w-7xl xl:max-w-[1400px] mx-auto">
                <DashboardBackgroundWatermark />
                <AdminUserHeader />
                <AdminUsersContent search={search} status={status} createdFrom={createdFrom} />
              </div>
            </main>
          </QueryClientProvider>
        ),
      },
    ],
    { initialEntries: [url] },
  );
  return render(<RouterProvider router={router} />);
}

describe("/admin/users — 4 estados", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("NÃO mostra 'Maria' como dado durante loading (mostra skeleton)", async () => {
    // fetch que nunca resolve — mantém estado loading
    global.fetch = vi.fn(
      () => new Promise(() => {}),
    ) as unknown as typeof fetch;

    renderRoute();
    expect(screen.getByRole("status")).toHaveAccessibleName(
      "Carregando usuários",
    );
    expect(screen.queryByText(/Maria/)).not.toBeInTheDocument();
  });

  it("renderiza tabela com dados do banco (não zeros fabricados)", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 1,
            nome: "Maria Silva",
            email: "maria@iselftoken.com",
            role: "FOUNDER",
            isActive: true,
            createdAt: "2026-01-15T10:00:00Z",
            avatar: { id: 1, url_sm: null, status: "APPROVED" },
          },
        ],
        total: 1,
        pagina: 1,
      }),
    }) as unknown as typeof fetch;

    renderRoute();
    await waitFor(() => {
      expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    });
    expect(screen.queryByText(/Nenhum usuário/i)).not.toBeInTheDocument();
  });

  it("renderiza error state (não zeros) quando backend falha", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: "boom" }),
    }) as unknown as typeof fetch;

    renderRoute();
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /Não foi possível carregar/,
      );
    });
    // Botão Tentar novamente
    expect(screen.getByText(/Tentar novamente/i)).toBeInTheDocument();
  });

  it("renderiza empty state com CTA 'Limpar filtros' quando filtro não retorna nada", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], total: 0, pagina: 1 }),
    }) as unknown as typeof fetch;

    renderRoute("inexistente");
    await waitFor(() => {
      expect(
        screen.getByText(/Nenhum usuário encontrado para esses filtros/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Limpar filtros/i)).toBeInTheDocument();
  });
});