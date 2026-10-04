import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { AdminUserTable } from "~/components/admin/admin-user-table";
import type { AdminUser } from "~/lib/queries";

const sample: AdminUser[] = [
  {
    id: 1,
    publicId: "p-1",
    email: "maria@iselftoken.com",
    nome: "Maria Silva",
    role: "FOUNDER",
    isActive: true,
    createdAt: "2026-01-15T10:00:00Z",
    avatar: { id: 1, url_sm: null, status: "APPROVED" },
  },
  {
    id: 2,
    publicId: "p-2",
    email: "joao@iselftoken.com",
    nome: "João Santos",
    role: "USER",
    isActive: false,
    createdAt: "2026-02-20T10:00:00Z",
    avatar: { id: 2, url_sm: null, status: "PENDING" },
  },
];

function renderTable(users: AdminUser[] = sample) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <QueryClientProvider client={qc}>
            <AdminUserTable
              users={users}
              pagination={{
                page: 1,
                limit: 25,
                total: users.length,
                totalPages: 1,
              }}
            />
          </QueryClientProvider>
        ),
      },
    ],
    { initialEntries: ["/"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("AdminUserTable", () => {
  it("renders a row per user with name, email, role", () => {
    renderTable();
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("joao@iselftoken.com")).toBeInTheDocument();
    expect(screen.getByText("FOUNDER")).toBeInTheDocument();
  });

  it("shows 'Ativo' badge when isActive=true (magenta, not emerald)", () => {
    renderTable();
    const ativoBadge = screen.getByText("Ativo");
    expect(ativoBadge).toBeInTheDocument();
    expect(ativoBadge.className).toMatch(/text-primary/);
    expect(ativoBadge.className).not.toMatch(/emerald/);
  });

  it("shows 'Suspenso' badge when isActive=false (destructive)", () => {
    renderTable();
    const suspensoBadge = screen.getByText("Suspenso");
    expect(suspensoBadge).toBeInTheDocument();
    expect(suspensoBadge.className).toMatch(/text-destructive/);
  });

  it("shows KYC status icon + label from real user.avatar.status", () => {
    renderTable();
    // O status indicator + a action button compartilham o texto "KYC pendente"
    // (aria-label). getAllByText cobre os 2 elementos.
    expect(screen.getAllByText(/KYC aprovado/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(/KYC pendente/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("KYC icon for APPROVED user uses primary color (magenta), not emerald/red/warning", () => {
    renderTable();
    const aprovado = screen.getByLabelText(/KYC aprovado/i);
    const icon = aprovado.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon?.className.baseVal).toMatch(/text-primary/);
    expect(icon?.className.baseVal).not.toMatch(/emerald|destructive|warning/);
  });

  it("KYC icon for PENDING user uses warning color (amber) — não depende do tipo de plano", () => {
    // PENDING, UNDER_REVIEW e NEEDS_RESUBMISSION são pendências; REJECTED é erro final.
    const pendingUser: AdminUser = {
      id: 3,
      publicId: "p-3",
      email: "pendente@iselftoken.com",
      nome: "User Pendente",
      role: "USER",
      isActive: true,
      createdAt: "2026-03-10T10:00:00Z",
      avatar: { id: 3, url_sm: null, status: "PENDING" },
    };
    renderTable([pendingUser]);
    // Filtra pelo indicator (não action button)
    const pendenteIndicator = screen
      .getAllByText(/KYC pendente/i)
      .find((el) => el.getAttribute("aria-label")?.startsWith("KYC "));
    expect(pendenteIndicator).toBeDefined();
    const icon = pendenteIndicator!.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon?.className.baseVal).toMatch(/text-warning/);
  });

  it("KYC icon for REJECTED user uses destructive color (red)", () => {
    const rejectedUser: AdminUser = {
      id: 4,
      publicId: "p-4",
      email: "rejeitado@iselftoken.com",
      nome: "User Rejeitado",
      role: "FOUNDER",
      isActive: true,
      createdAt: "2026-03-10T10:00:00Z",
      avatar: { id: 4, url_sm: null, status: "REJECTED" },
    };
    renderTable([rejectedUser]);
    const rejeitadoIndicator = screen
      .getAllByText(/KYC rejeitado/i)
      .find((el) => el.getAttribute("aria-label")?.startsWith("KYC "));
    expect(rejeitadoIndicator).toBeDefined();
    const icon = rejeitadoIndicator!.querySelector("svg");
    expect(icon?.className.baseVal).toMatch(/text-destructive/);
  });

  it("KYC icon for UNDER_REVIEW user uses warning color (amber)", () => {
    const underReviewUser: AdminUser = {
      id: 5,
      publicId: "p-5",
      email: "revisao@iselftoken.com",
      nome: "User Em Revisão",
      role: "USER",
      isActive: true,
      createdAt: "2026-03-10T10:00:00Z",
      avatar: { id: 5, url_sm: null, status: "UNDER_REVIEW" },
    };
    renderTable([underReviewUser]);
    const emRevisaoIndicator = screen
      .getAllByText(/KYC em análise/i)
      .find((el) => el.getAttribute("aria-label")?.startsWith("KYC "));
    expect(emRevisaoIndicator).toBeDefined();
    const icon = emRevisaoIndicator!.querySelector("svg");
    expect(icon?.className.baseVal).toMatch(/text-warning/);
  });

  it("KYC action button is WARNING for user with pending KYC", () => {
    const pendingUser: AdminUser = {
      id: 6,
      publicId: "p-6",
      email: "pendente2@iselftoken.com",
      nome: "User Sem KYC",
      role: "USER",
      isActive: true,
      createdAt: "2026-03-10T10:00:00Z",
      avatar: { id: 6, url_sm: null, status: "PENDING" },
    };
    renderTable([pendingUser]);
    const revisarKyc = screen.getByLabelText(/Revisar KYC de User Sem KYC/i);
    expect(revisarKyc.className).toMatch(/text-warning/);
  });

  it("ShieldCheck action button is MAGENTA for user with KYC approved", () => {
    const approvedUser: AdminUser = {
      id: 7,
      publicId: "p-7",
      email: "aprovado@iselftoken.com",
      nome: "User Aprovado",
      role: "USER",
      isActive: true,
      createdAt: "2026-03-10T10:00:00Z",
      avatar: { id: 7, url_sm: null, status: "APPROVED" },
    };
    renderTable([approvedUser]);
    const revisarKyc = screen.getByLabelText(/Revisar KYC de User Aprovado/i);
    expect(revisarKyc.className).toMatch(/text-primary/);
    expect(revisarKyc.className).not.toMatch(/text-destructive/);
  });

  it("renders pagination footer with totals (from pagination.total)", () => {
    renderTable();
    expect(screen.getByText(/Exibindo/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders Suspender button for active user and Reativar for suspended", () => {
    renderTable();
    expect(screen.getByLabelText("Suspender Maria Silva")).toBeInTheDocument();
    expect(screen.getByLabelText("Reativar João Santos")).toBeInTheDocument();
  });

  it("Eye button (Detalhes) links to /admin/users/:id (own admin page, not /compliance)", () => {
    renderTable();
    // sample tem 2 users (id 1 e id 2) — ambos os olhos devem apontar
    // para /admin/users/<id> correspondente
    const detailLinks = screen.getAllByTitle("Detalhes do usuário");
    expect(detailLinks).toHaveLength(2);
    expect(detailLinks[0]).toHaveAttribute("href", "/admin/users/1");
    expect(detailLinks[1]).toHaveAttribute("href", "/admin/users/2");
  });
});
