import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminConfigScreen } from "~/components/admin/admin-config-screen";

const sampleParams = [
  {
    key: "platformFee",
    label: "Taxa da Plataforma",
    group: "Taxas",
    unit: "PERCENT" as const,
    default: 5,
    help: "Taxa cobrada sobre cada investimento confirmado",
    currentValue: 5,
    currentEffectiveFrom: "2026-01-01T00:00:00Z",
    scheduled: null,
    history: [
      {
        id: 1,
        value: 3,
        effectiveFrom: "2025-01-01T00:00:00Z",
        note: "Lançamento",
        createdAt: "2025-01-01T00:00:00Z",
      },
    ],
  },
  {
    key: "authFee",
    label: "Taxa de KYC",
    group: "Taxas",
    unit: "BRL" as const,
    default: 100,
    help: "Custo por verificação de identidade",
    currentValue: 150,
    currentEffectiveFrom: "2026-06-01T00:00:00Z",
    scheduled: {
      id: 2,
      value: 200,
      effectiveFrom: "2027-01-01T00:00:00Z",
      note: "Ajuste anual",
      createdAt: "2026-12-15T00:00:00Z",
    },
    history: [],
  },
  {
    key: "requireDocument",
    label: "Exigir Documento",
    group: "Flags",
    unit: "BOOL" as const,
    default: 1,
    help: "Liga/desliga exigência de documento",
    currentValue: 1,
    currentEffectiveFrom: "2026-01-01T00:00:00Z",
    scheduled: null,
    history: [],
  },
];

function renderConfig(
  params: typeof sampleParams | null = sampleParams,
  ok = true,
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () =>
      ok ? { data: params } : { error: true, message: "Falha" },
  }) as unknown as typeof fetch;
  return render(
    <QueryClientProvider client={qc}>
      <AdminConfigScreen />
    </QueryClientProvider>,
  );
}

describe("/admin/config — página", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renderiza header editorial com title 'Configurações'", async () => {
    renderConfig();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Configurações/i, level: 1 }),
      ).toBeInTheDocument();
    });
  });

  it("renderiza 2 grupos (Taxas, Flags) e 3 params", async () => {
    renderConfig();
    await waitFor(() => {
      expect(screen.getByText("Taxas")).toBeInTheDocument();
      expect(screen.getByText("Flags")).toBeInTheDocument();
    });
    expect(screen.getByText("Taxa da Plataforma")).toBeInTheDocument();
    expect(screen.getByText("Taxa de KYC")).toBeInTheDocument();
    expect(screen.getByText("Exigir Documento")).toBeInTheDocument();
  });

  it("mostra valor vigente formatado (% ou R$)", async () => {
    renderConfig();
    await waitFor(() => {
      // 5% (PERCENT → "5%")
      expect(screen.getByText("5%")).toBeInTheDocument();
      // R$ 150 (BRL)
      expect(screen.getByText(/R\$\s*150/)).toBeInTheDocument();
    });
  });

  it("mostra agendamento futuro quando há `scheduled`", async () => {
    renderConfig();
    await waitFor(() => {
      expect(screen.getByText(/Agendado:/)).toBeInTheDocument();
      // R$ 200 (valor agendado)
      expect(screen.getAllByText(/R\$\s*200/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("form de agendamento tem input de valor, data e motivo", async () => {
    renderConfig();
    await waitFor(() => {
      // 3 forms (um por param) — basta verificar que existem inputs
      const valueInputs = screen.getAllByDisplayValue(/^(\d+(\.\d+)?|0)$/);
      expect(valueInputs.length).toBeGreaterThanOrEqual(2);
      // Date input
      expect(
        screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/).length,
      ).toBeGreaterThanOrEqual(2);
    });
  });

  it("botão 'Histórico (N)' aparece quando há versões anteriores", async () => {
    renderConfig();
    await waitFor(() => {
      // platformFee tem 1 history → "Histórico (1)"
      expect(screen.getByText(/Histórico \(1\)/)).toBeInTheDocument();
    });
  });

  it("clicar em 'Histórico' abre modal com versões anteriores", async () => {
    renderConfig();
    await waitFor(() => {
      expect(screen.getByText(/Histórico \(1\)/)).toBeInTheDocument();
    });
    const historyButton = screen.getByText(/Histórico \(1\)/);
    fireEvent.click(historyButton);
    expect(
      screen.getByRole("dialog", { name: /Histórico: Taxa da Plataforma/i }),
    ).toBeInTheDocument();
  });

  it("ESC fecha o modal de histórico", async () => {
    renderConfig();
    await waitFor(() => {
      expect(screen.getByText(/Histórico \(1\)/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Histórico \(1\)/));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicar fora do modal fecha o histórico", async () => {
    renderConfig();
    await waitFor(() => {
      expect(screen.getByText(/Histórico \(1\)/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Histórico \(1\)/));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Click no overlay (role="dialog")
    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("BOOL usa select (Sim/Não) em vez de input numérico", async () => {
    renderConfig();
    await waitFor(() => {
      const select = screen.getByRole("combobox", { name: /Novo valor/i });
      expect(select).toBeInTheDocument();
      expect(select.querySelector("option[value='1']")).toHaveTextContent(
        /Sim/,
      );
      expect(select.querySelector("option[value='0']")).toHaveTextContent(
        /Não/,
      );
    });
  });
});

describe("/admin/config — empty/error states", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renderiza o estado de erro com opção de retry", async () => {
    renderConfig(sampleParams, false);
    await waitFor(() => {
      expect(
        screen.getByText(/Não foi possível carregar as configurações/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /Tentar novamente/i }),
    ).toBeInTheDocument();
  });

  it("renderiza empty state quando lista está vazia", async () => {
    renderConfig([]);
    await waitFor(() => {
      expect(
        screen.getByText(/Nenhuma configuração cadastrada/i),
      ).toBeInTheDocument();
    });
  });
});
