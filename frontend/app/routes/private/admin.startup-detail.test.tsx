import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi, afterEach } from "vitest";

import AdminStartupDetailPage from "~/routes/private/admin.startup-detail";
import { loader as adminStartupDetailLoader } from "~/routes/private/admin.startup-detail";

const sampleStartup = {
  id: 42,
  slug: "acme-tech",
  nome: "Acme Tech",
  razao_social: "Acme Tecnologia LTDA",
  cnpj: "12.345.678/0001-90",
  site: "https://acme.com",
  telefone: "+55 11 99999-0000",
  email: "contato@acme.com",
  area_atuacao: "Fintech",
  estagio: "Seed",
  status: "APPROVED",
  score: 85,
  descricao: "Plataforma de pagamentos B2B",
  problema: "Empresas perdem 3% do faturamento em taxas",
  solucao: "Sistema inteligente de roteamento",
  modelo_receita: "Take rate de 0.5% por transação",
  diferencial: "IA proprietária de detecção de fraude",
  mercado_alvo: "PMEs com 50-500 funcionários",
  banco: "Itaú",
  agencia: "0001",
  conta: "12345-6",
  digito: "7",
  tipo_conta: "corrente",
  pix_key: "contato@acme.com",
  titular: "Acme Tecnologia LTDA",
  documento_titular: "12.345.678/0001-90",
  data_fundacao: "2023-03-15",
  createdAt: "2026-01-15T10:00:00Z",
  founder: { id: 1, nome: "João Silva", email: "joao@acme.com" },
  logo: { id: 1, url: "https://cdn.example.com/logo/42.png" },
  cover: { id: 2, url: "https://cdn.example.com/cover/42.png" },
  mie: { id: 3, url: "https://cdn.example.com/mie/42.pdf" },
  contrato_social: { id: 4, url: "https://cdn.example.com/cs/42.pdf" },
  cnpj_document: { id: 5, url: "https://cdn.example.com/cnpj/42.pdf" },
  socios: [{ nome: "João Silva", participacao: 60 }],
  teams: [{ area: "Tech", membros: 5 }],
  campaigns: [
    {
      id: 1,
      title: "Rodada Seed 2026",
      targetAmount: 1_000_000,
      minInvestment: 1_000,
      valuation: 5_000_000,
      tokenPrice: 100,
      status: "OPEN",
      deadline: "2026-12-31",
      createdAt: "2026-01-15T10:00:00Z",
    },
  ],
};

function renderDetail(startup: typeof sampleStartup | object = sampleStartup) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: "/admin/startups/:id",
        element: (
          <QueryClientProvider client={qc}>
            <AdminStartupDetailPage startup={startup as never} />
          </QueryClientProvider>
        ),
      },
    ],
    { initialEntries: ["/admin/startups/42"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("/admin/startups/:id — página de detalhes (render com prop)", () => {
  it("renderiza nome, CNPJ, área de atuação da startup", () => {
    renderDetail();
    expect(screen.getByText("Acme Tech")).toBeInTheDocument();
    expect(
      screen.getAllByText("Acme Tecnologia LTDA").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("12.345.678/0001-90").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Fintech").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Seed").length).toBeGreaterThanOrEqual(1);
  });

  it("renderiza ID no formato #000042", () => {
    renderDetail();
    expect(screen.getByText("#000042")).toBeInTheDocument();
  });

  it("mostra badge 'Aprovada' em magenta (primary) quando status=APPROVED", () => {
    renderDetail();
    const badges = screen.getAllByText("Aprovada");
    expect(badges.length).toBeGreaterThanOrEqual(1);
    expect(badges[0].className).toMatch(/text-primary/);
  });

  it("mostra dados do Fundador (nome, email, ID)", () => {
    renderDetail();
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("joao@acme.com")).toBeInTheDocument();
    expect(screen.getByText("#000001")).toBeInTheDocument();
  });

  it("renderiza seção 'Pitch & Negócio' com problema, solução, modelo_receita", () => {
    renderDetail();
    expect(screen.getByText(/Pitch.*Negócio/i)).toBeInTheDocument();
    expect(
      screen.getByText("Plataforma de pagamentos B2B"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Empresas perdem 3% do faturamento em taxas"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sistema inteligente de roteamento"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Take rate de 0.5% por transação"),
    ).toBeInTheDocument();
  });

  it("renderiza seção 'Contato' com site, telefone, email", () => {
    renderDetail();
    expect(screen.getByText(/^Contato$/i)).toBeInTheDocument();
    expect(screen.getByText("+55 11 99999-0000")).toBeInTheDocument();
    expect(
      screen.getAllByText("contato@acme.com").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renderiza seção 'Dados Bancários' com banco, agência, conta, PIX", () => {
    renderDetail();
    expect(screen.getByText(/Dados Bancários/i)).toBeInTheDocument();
    expect(screen.getByText("Itaú")).toBeInTheDocument();
    expect(screen.getByText("corrente")).toBeInTheDocument();
    expect(
      screen.getAllByText("contato@acme.com").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renderiza seção 'Estrutura' com sócios e times (JSON)", () => {
    renderDetail();
    expect(screen.getByText(/^Estrutura$/i)).toBeInTheDocument();
    expect(screen.getByText(/Sócios/)).toBeInTheDocument();
    expect(screen.getByText(/Times/)).toBeInTheDocument();
  });

  it("renderiza seção 'Documentos' com 5 miniaturas (logo, cover, MIE, contrato, CNPJ)", () => {
    renderDetail();
    expect(screen.getByText(/^Documentos$/i)).toBeInTheDocument();
    // 5 miniaturas clicáveis (button[aria-label*="Abrir documento:"])
    const thumbs = screen.getAllByRole("button", { name: /Abrir documento/i });
    expect(thumbs.length).toBe(5);
  });

  it("clicar em miniatura abre modal com o documento", () => {
    renderDetail();
    const firstThumb = screen.getAllByRole("button", {
      name: /Abrir documento/i,
    })[0];
    fireEvent.click(firstThumb);
    // Modal abre com role="dialog"
    expect(
      screen.getByRole("dialog", { name: /Documento: Logo/i }),
    ).toBeInTheDocument();
    // Botão "Abrir em nova aba" presente
    expect(screen.getByText(/Abrir em nova aba/i)).toBeInTheDocument();
  });

  it("renderiza Campanhas com detalhes (target, min, valuation, deadline)", () => {
    renderDetail();
    expect(screen.getByText(/Detalhes das Campanhas/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Rodada Seed 2026/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/R\$.*1\.000\.000/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("mascara CNPJ no Resumo (LGPD-safe)", () => {
    renderDetail();
    // CNPJ completo aparece em "Informações cadastrais".
    // No "Resumo", o CNPJ é mascarado: 12.345.678/0001-90 → 123456.***/****-**
    expect(screen.getByText(/123456\.[*]+\/[*]+-[*]+/)).toBeInTheDocument();
  });

  it("tem link Voltar para /admin/startups", () => {
    renderDetail();
    const back = screen.getByText(/Voltar à gestão de startups/i);
    expect(back).toHaveAttribute("href", "/admin/startups");
  });

  it("tem link 'Perfil completo (Compliance)' para /compliance/startups/:id", () => {
    renderDetail();
    const link = screen.getByText(/Perfil completo/i).closest("a");
    expect(link).toHaveAttribute("href", "/compliance/startups/42");
  });

  it("Score: 85 visível quando startup tem score", () => {
    renderDetail();
    expect(screen.getByText("Score: 85")).toBeInTheDocument();
  });
});

describe("/admin/startups/:id — loader", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("loader retorna dados do backend em sucesso", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: sampleStartup }),
    }) as unknown as typeof fetch;

    const data = await adminStartupDetailLoader({
      request: new Request("http://localhost/admin/startups/42", {
        headers: { cookie: "session_id=test" },
      }),
      params: { id: "42" },
    });
    expect(data.id).toBe(42);
    expect(data.nome).toBe("Acme Tech");
    expect(data.cnpj).toBe("12.345.678/0001-90");
    expect(data.founder?.email).toBe("joao@acme.com");
  });

  it("loader 404 → throw redirect", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    await expect(
      adminStartupDetailLoader({
        request: new Request("http://localhost/admin/startups/999", {
          headers: { cookie: "session_id=test" },
        }),
        params: { id: "999" },
      }),
    ).rejects.toThrow();
  });

  it("loader sem id → throw redirect", async () => {
    await expect(
      adminStartupDetailLoader({
        request: new Request("http://localhost/admin/startups/", {
          headers: { cookie: "session_id=test" },
        }),
        params: {},
      }),
    ).rejects.toThrow();
  });
});
