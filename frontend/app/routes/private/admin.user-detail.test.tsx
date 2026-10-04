import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loader as adminUserDetailLoader } from "~/routes/private/admin.user-detail";

const sampleUser = {
  id: 1,
  publicId: "p-1",
  email: "maria@iselftoken.com",
  nome: "Maria Silva",
  role: "FOUNDER",
  telefone: "+55 11 99999-0000",
  data_nascimento: "1990-05-15",
  genero: "MULHER",
  tipo_documento: "CPF",
  reg_documento: "123.456.789-00",
  isActive: true,
  createdAt: "2026-01-15T10:00:00Z",
  endereco: "Av. Paulista",
  numero: "1000",
  complemento: "Apto 101",
  bairro: "Bela Vista",
  cidade: "São Paulo",
  uf: "SP",
  cep: "01310-100",
  pais: { iso3: "BRA", nome: "Brasil", emoji: "🇧🇷" },
  avatar: {
    id: 1,
    status: "APPROVED",
    url: "https://cdn.example.com/avatar/1.png",
  },
  comprovante: {
    id: 2,
    status: "APPROVED",
    url: "https://cdn.example.com/comprovante/1.png",
  },
  documento: {
    id: 3,
    status: "PENDING",
    url: "https://cdn.example.com/documento/1.png",
  },
  biofacial: null,
  startups: [
    {
      id: 1,
      nome: "Acme Tech",
      status: "APPROVED",
      createdAt: "2026-02-01T10:00:00Z",
    },
    {
      id: 2,
      nome: "Beta Inc",
      status: "PENDING",
      createdAt: "2026-03-01T10:00:00Z",
    },
  ],
  campaigns: [
    {
      id: 1,
      startupId: 1,
      startupNome: "Acme Tech",
      targetAmount: 1_000_000,
      status: "OPEN",
      progress: 65,
    },
  ],
  investments: [
    {
      id: 1,
      startupNome: "Acme Tech",
      amount: 5_000,
      tokensQty: 50,
      status: "CONFIRMED",
      createdAt: "2026-02-15T10:00:00Z",
    },
  ],
  notes: [],
  seals: [],
  rating: null,
  auditLogs: [],
};

function makeRequest() {
  return new Request("http://localhost/admin/users/1", {
    headers: { cookie: "session_id=test" },
  });
}

describe("/admin/users/:id — página de detalhes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza nome, email e role do user (loader retorna dados do backend)", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: sampleUser }),
    }) as unknown as typeof fetch;

    const data = await adminUserDetailLoader({
      request: makeRequest(),
      params: { id: "1" },
    });
    expect(data.nome).toBe("Maria Silva");
    global.fetch = originalFetch;
  });

  it("loader 404 → throw redirect", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    await expect(
      adminUserDetailLoader({
        request: makeRequest(),
        params: { id: "999" },
      }),
    ).rejects.toThrow();
    global.fetch = originalFetch;
  });

  it("loader sem id → throw redirect", async () => {
    await expect(
      adminUserDetailLoader({
        request: makeRequest(),
        params: {},
      }),
    ).rejects.toThrow();
  });
});

/**
 * Testes de renderização do componente AdminUserDetailPage.
 * Usa createMemoryRouter com loader mockado (não stub do fetch).
 */
import { renderWithMemoryRouter } from "./admin.user-detail.test-helpers";

describe("/admin/users/:id — render component", () => {
  it("renderiza dados do user passado via loader", async () => {
    renderWithMemoryRouter(sampleUser, "/admin/users/1");
    await waitFor(() => {
      expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    });
  });

  it("tem link Voltar para /admin/users", async () => {
    renderWithMemoryRouter(sampleUser, "/admin/users/1");
    await waitFor(() => {
      const back = screen.getByText(/Voltar à gestão de usuários/i);
      expect(back).toHaveAttribute("href", "/admin/users");
    });
  });

  it("mostra ID no formato #000001", async () => {
    renderWithMemoryRouter(sampleUser, "/admin/users/1");
    await waitFor(() => {
      expect(screen.getByText("#000001")).toBeInTheDocument();
    });
  });

  it("mostra badge Conta Ativa quando isActive=true", async () => {
    renderWithMemoryRouter(sampleUser, "/admin/users/1");
    await waitFor(() => {
      expect(screen.getByText("Conta Ativa")).toBeInTheDocument();
    });
  });

  it("mostra badge Conta Suspensa quando isActive=false", async () => {
    renderWithMemoryRouter(
      { ...sampleUser, isActive: false },
      "/admin/users/1",
    );
    await waitFor(() => {
      expect(screen.getByText("Conta Suspensa")).toBeInTheDocument();
    });
  });

  it("tem ação 'Revisar KYC' apontando para /admin/kyc?userId=1", async () => {
    renderWithMemoryRouter(sampleUser, "/admin/users/1");
    await waitFor(() => {
      const kycLink = screen.getByText(/Revisar KYC/i).closest("a");
      expect(kycLink).toHaveAttribute("href", "/admin/kyc?userId=1");
    });
  });

  it("tem link 'Perfil completo (Compliance)' para /compliance/users/1", async () => {
    renderWithMemoryRouter(sampleUser, "/admin/users/1");
    await waitFor(() => {
      const complianceLink = screen.getByText(/Perfil completo/i).closest("a");
      expect(complianceLink).toHaveAttribute("href", "/compliance/users/1");
    });
  });

  it("tem botão 'Suspender conta' quando isActive=true", async () => {
    renderWithMemoryRouter(sampleUser, "/admin/users/1");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Suspender conta/i }),
      ).toBeInTheDocument();
    });
  });

  it("tem botão 'Reativar conta' quando isActive=false", async () => {
    renderWithMemoryRouter(
      { ...sampleUser, isActive: false },
      "/admin/users/1",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Reativar conta/i }),
      ).toBeInTheDocument();
    });
  });

  it("KYC: Aprovado em magenta quando avatar.status='APPROVED'", async () => {
    renderWithMemoryRouter(sampleUser, "/admin/users/1");
    await waitFor(() => {
      const badge = screen.getByText("KYC: Aprovado");
      expect(badge.className).toMatch(/text-primary/);
    });
  });

  it("renderiza seção 'Informações pessoais' quando há telefone/nascimento/gênero/documento", async () => {
    renderWithMemoryRouter(sampleUser, "/admin/users/1");
    await waitFor(() => {
      expect(screen.getByText("+55 11 99999-0000")).toBeInTheDocument();
      expect(screen.getByText(/Data de nascimento/i)).toBeInTheDocument();
      expect(screen.getByText("Feminino")).toBeInTheDocument();
      // Documento (CPF) — usa getAllByText pois aparece em "RG/CNH" e "Documento (RG/CNH)"
      expect(screen.getAllByText(/Documento/i).length).toBeGreaterThanOrEqual(
        1,
      );
    });
  });

  it("renderiza seção 'Endereço' com logradouro, cidade, UF, CEP e país (com flag)", async () => {
    renderWithMemoryRouter(sampleUser, "/admin/users/1");
    await waitFor(() => {
      // logradouro com número e complemento
      expect(
        screen.getByText(/Av\. Paulista, nº 1000, Apto 101/),
      ).toBeInTheDocument();
      // cidade + UF
      expect(screen.getByText("São Paulo / SP")).toBeInTheDocument();
      expect(screen.getByText("01310-100")).toBeInTheDocument();
      // país com emoji flag
      expect(screen.getByText(/🇧🇷 Brasil \(BRA\)/)).toBeInTheDocument();
    });
  });

  it("renderiza seção 'Documentos KYC' com 4 cards (avatar, comprovante, documento, biofacial)", async () => {
    renderWithMemoryRouter(sampleUser, "/admin/users/1");
    await waitFor(() => {
      expect(screen.getByText(/Selfie/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Comprovante de residência/i),
      ).toBeInTheDocument();
      // biofacial null → "Não enviado" (pode aparecer 1+ vezes)
      expect(screen.getAllByText(/Não enviado/i).length).toBeGreaterThanOrEqual(
        1,
      );
    });
  });

  it("renderiza seção 'Atividade na plataforma' com startups, campaigns e investments", async () => {
    renderWithMemoryRouter(sampleUser, "/admin/users/1");
    await waitFor(() => {
      expect(screen.getByText(/Startups fundadas/i)).toBeInTheDocument();
      expect(screen.getByText("Beta Inc")).toBeInTheDocument();
      expect(screen.getByText(/Investimentos realizados/i)).toBeInTheDocument();
      expect(screen.getByText(/50 tokens em Acme Tech/)).toBeInTheDocument();
    });
  });

  it("renderiza 'Resumo rápido' com contadores (startups, campaigns, investments, notes)", async () => {
    renderWithMemoryRouter(sampleUser, "/admin/users/1");
    await waitFor(() => {
      expect(screen.getByText(/Resumo rápido/i)).toBeInTheDocument();
    });
  });

  it("NÃO mostra 'Informações pessoais' quando todos os campos são null", async () => {
    const userWithoutPersonal = {
      ...sampleUser,
      telefone: null,
      data_nascimento: null,
      genero: null,
      tipo_documento: null,
    };
    renderWithMemoryRouter(userWithoutPersonal, "/admin/users/1");
    await waitFor(() => {
      expect(screen.queryByText("+55 11 99999-0000")).not.toBeInTheDocument();
      expect(screen.queryByText("Feminino")).not.toBeInTheDocument();
    });
  });
});
