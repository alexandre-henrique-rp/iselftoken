/**
 * Testes do `AdminInstallmentPanel` — config de parcelamento (admin).
 *
 * Foco:
 *  - Conversão % (exibida) ↔ decimal (enviada ao backend).
 *  - Validações do formulário (max > 18 bloqueia).
 *  - Hidratação com a config vigente.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { AdminInstallmentPanel } from "../admin-installment-panel";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const VIGENTE = {
  id: 1,
  interestRate: 0.0299,
  maxInstallments: 18,
  minInstallmentAmount: 100,
  effectiveFrom: new Date("2026-01-01").toISOString(),
  effectiveUntil: null,
  isActive: true,
  notes: null,
};

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

/** Mock fetch roteando por URL. */
function stubFetch(postSpy: (body: unknown) => void) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("/vigente")) {
      return {
        ok: true,
        json: async () => ({ data: VIGENTE }),
      } as Response;
    }
    if (url === "/api/admin/installments" && init?.method === "POST") {
      postSpy(JSON.parse(String(init.body)));
      return {
        ok: true,
        json: async () => ({ data: { ...VIGENTE, id: 2 } }),
      } as Response;
    }
    // GET histórico
    return {
      ok: true,
      json: async () => ({ data: [VIGENTE] }),
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
}

describe("AdminInstallmentPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("hidrata a taxa vigente em porcentagem (2.99%)", async () => {
    stubFetch(() => {});
    render(<AdminInstallmentPanel />, { wrapper: createWrapper() });

    const taxa = (await screen.findByLabelText(
      /Taxa mensal de juros/i,
    )) as HTMLInputElement;
    await waitFor(() => expect(taxa.value).toBe("2.99"));
  });

  it("envia a taxa em DECIMAL (0.0299) ao salvar", async () => {
    const postSpy = vi.fn();
    stubFetch(postSpy);
    render(<AdminInstallmentPanel />, { wrapper: createWrapper() });

    const taxa = (await screen.findByLabelText(
      /Taxa mensal de juros/i,
    )) as HTMLInputElement;
    await waitFor(() => expect(taxa.value).toBe("2.99"));

    fireEvent.click(screen.getByRole("button", { name: /Salvar configuração/i }));

    await waitFor(() => expect(postSpy).toHaveBeenCalled());
    const payload = postSpy.mock.calls[0][0] as {
      interestRate: number;
      maxInstallments: number;
      minInstallmentAmount: number;
    };
    expect(payload.interestRate).toBeCloseTo(0.0299, 6);
    expect(payload.maxInstallments).toBe(18);
    expect(payload.minInstallmentAmount).toBe(100);
  });

  it("bloqueia o envio quando máximo de parcelas > 18", async () => {
    const postSpy = vi.fn();
    stubFetch(postSpy);
    render(<AdminInstallmentPanel />, { wrapper: createWrapper() });

    const max = (await screen.findByLabelText(
      /Máximo de parcelas/i,
    )) as HTMLInputElement;
    // Aguarda a hidratação concluir (evita o reset sobrescrever o change).
    await waitFor(() => expect(max.value).toBe("18"));

    fireEvent.change(max, { target: { value: "24" } });
    await waitFor(() => expect(max.value).toBe("24"));
    fireEvent.click(screen.getByRole("button", { name: /Salvar configuração/i }));

    await waitFor(
      () => {
        expect(screen.getByText(/Máximo de 18 parcelas/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(postSpy).not.toHaveBeenCalled();
  });
});
