import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";

import { action } from "~/routes/private/admin-kyc";
import { AdminKycList } from "~/components/admin/admin-kyc-list";
import { AdminKycListHeader } from "~/components/admin/admin-kyc-list-header";
import { AdminKycListFilters } from "~/components/admin/admin-kyc-list-filters";
import { AdminKycListSkeleton } from "~/components/admin/admin-kyc-list-skeleton";
import { AdminKycListEmptyState } from "~/components/admin/admin-kyc-list-empty-state";

const fetchMock = vi.fn();

function makeRequest(fields: Record<string, string>, cookie = "session=admin") {
  return new Request("http://localhost/admin/kyc?userId=60", {
    method: "POST",
    headers: { cookie, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
}

const sampleUsers = [
  {
    id: 60,
    nome: "Maria Silva",
    email: "maria@iselftoken.com",
    role: "USER",
    createdAt: "2026-01-15T10:00:00Z",
    kycStatus: "aprovado" as const,
  },
  {
    id: 61,
    nome: "João Santos",
    email: "joao@iselftoken.com",
    role: "FOUNDER",
    createdAt: "2026-02-20T10:00:00Z",
    kycStatus: "pendente" as const,
  },
  {
    id: 62,
    nome: "Pedro Costa",
    email: "pedro@iselftoken.com",
    role: "USER",
    createdAt: "2026-03-10T10:00:00Z",
    kycStatus: "rejeitado" as const,
  },
];

const defaultPagination = {
  page: 1,
  limit: 25,
  total: 3,
  totalPages: 1,
};

function renderList(
  users: typeof sampleUsers = sampleUsers,
  pagination = defaultPagination,
  filters: { search?: string; kycStatus?: string } = {},
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: "/admin/kyc",
        element: (
          <QueryClientProvider client={qc}>
            <AdminKycList
              users={users}
              filters={filters}
              pagination={pagination}
              hasActiveFilters={Boolean(filters.search || filters.kycStatus)}
            />
          </QueryClientProvider>
        ),
      },
    ],
    { initialEntries: ["/admin/kyc"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("/admin/kyc action", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("exige justificativa para rejeição e reenvio", async () => {
    const response = await action({
      request: makeRequest({
        kycProfileId: "123",
        intent: "request-resubmit",
        justification: "",
      }),
    } as any);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ success: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mapeia request-resubmit para NEEDS_RESUBMISSION e envia reason ao BFF", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: false, message: "KYC resubmission requested" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await action({
      request: makeRequest({
        kycProfileId: "123",
        intent: "request-resubmit",
        justification: "Documento ilegível, envie uma nova imagem",
      }),
    } as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect((init.headers as Headers).get("cookie")).toBe("session=admin");
    expect(init.body).toBe(
      JSON.stringify({
        decision: "NEEDS_RESUBMISSION",
        reason: "Documento ilegível, envie uma nova imagem",
      }),
    );
  });
});

describe("/admin/kyc — list view", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renderiza header editorial 'Verificação KYC'", () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <AdminKycListHeader total={3} />
      </QueryClientProvider>,
    );
    expect(
      screen.getByRole("heading", { name: /Verificação/i, level: 1 }),
    ).toBeInTheDocument();
  });

  it("renderiza 3 usuários da fila (Maria, João, Pedro)", () => {
    renderList();
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("João Santos")).toBeInTheDocument();
    expect(screen.getByText("Pedro Costa")).toBeInTheDocument();
  });

  it("renderiza status com cores semânticas (primary, warning, destructive)", () => {
    renderList();

    // Aprovado → magenta (primary) — NÃO emerald
    const aprovados = screen.getAllByText("Aprovado");
    const aprovadoBadge = aprovados.find((el) => el.tagName === "SPAN");
    expect(aprovadoBadge).toBeDefined();
    expect(aprovadoBadge!.className).toMatch(/text-primary/);
    expect(aprovadoBadge!.className).not.toMatch(/emerald/);

    // Pendente → âmbar (warning) — NÃO amber-400
    const pendentes = screen.getAllByText("Pendente");
    const pendenteBadge = pendentes.find((el) => el.tagName === "SPAN");
    expect(pendenteBadge).toBeDefined();
    expect(pendenteBadge!.className).toMatch(/text-warning/);
    expect(pendenteBadge!.className).not.toMatch(/amber-400/);

    // Rejeitado → vermelho (destructive) — NÃO red-400
    const rejeitados = screen.getAllByText("Rejeitado");
    const rejeitadoBadge = rejeitados.find((el) => el.tagName === "SPAN");
    expect(rejeitadoBadge).toBeDefined();
    expect(rejeitadoBadge!.className).toMatch(/text-destructive/);
    expect(rejeitadoBadge!.className).not.toMatch(/red-400/);
  });

  it("cada linha tem link 'Revisar' para /admin/kyc?userId=:id", () => {
    renderList();
    const links = screen.getAllByRole("link", { name: /Revisar/i });
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute("href", "/admin/kyc?userId=60");
    expect(links[1]).toHaveAttribute("href", "/admin/kyc?userId=61");
    expect(links[2]).toHaveAttribute("href", "/admin/kyc?userId=62");
  });

  it("placeholder da busca tem contraste WCAG (text-muted-foreground/50)", () => {
    renderList();
    const input = screen.getByPlaceholderText(/Pesquisar por nome/i);
    expect(input.className).toMatch(/placeholder:text-muted-foreground\/50/);
    expect(input.className).not.toMatch(/placeholder:text-white\/10/);
  });

  it("renderiza empty state com CTA 'Limpar filtros' quando lista está vazia com filtros", () => {
    renderList(
      [],
      { page: 1, limit: 25, total: 0, totalPages: 0 },
      { search: "inexistente" },
    );
    expect(
      screen.getByText(/Nenhum usuário encontrado para esses filtros/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Limpar filtros/i)).toBeInTheDocument();
  });

  it("renderiza empty state 'Nenhum usuário cadastrado' quando lista vazia sem filtros", () => {
    renderList([], { page: 1, limit: 25, total: 0, totalPages: 0 });
    expect(screen.getByText(/Nenhum usuário cadastrado/i)).toBeInTheDocument();
  });

  it("renderiza skeleton durante loading", () => {
    render(<AdminKycListSkeleton />);
    expect(screen.getByRole("status")).toHaveAccessibleName(
      "Carregando usuários",
    );
  });
});
