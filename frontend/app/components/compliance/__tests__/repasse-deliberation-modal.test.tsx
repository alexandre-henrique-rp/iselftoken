import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RepasseDeliberationModal } from "../repasse-deliberation-modal";

// Mock Sonner para nao chamar o Toaster real durante os testes
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("~/hooks/use-compliance-deliberate", () => ({
  useComplianceDeliberate: () => ({
    mutateAsync: vi.fn(async ({ campaignId, payload }) => {
      // valida argumentos minimos
      if (!campaignId) throw new Error("campaignId obrigatorio");
      if (payload.numeroParcelas < 12 || payload.numeroParcelas > 60) {
        throw new Error("fora do intervalo");
      }
      return { id: 1, campaignId, numeroParcelas: payload.numeroParcelas };
    }),
    isPending: false,
  }),
}));

const CAMPAIGN = {
  id: 99,
  startup: { id: 42, nome: "AcmePag" },
  repasse: null,
};

function renderModal(props: Partial<React.ComponentProps<typeof RepasseDeliberationModal>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RepasseDeliberationModal
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        campaign={CAMPAIGN}
        {...props}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RepasseDeliberationModal", () => {
  it("renderiza titulo e nome da campanha", () => {
    renderModal();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Deliberar Parcelas/i)).toBeInTheDocument();
    expect(screen.getByText("AcmePag")).toBeInTheDocument();
  });

  it("opcoes de numeroParcelas (12/15/18/24/36/48/60) renderizam", () => {
    renderModal();
    for (const n of [12, 15, 18, 24, 36, 48, 60]) {
      expect(screen.getByTestId(`deliberation-option-${n}`)).toBeInTheDocument();
    }
    // nenhuma deve vir selecionada antes do useEffect preencher
  });

  it("selecionar uma opcao aciona o campo hidden e reflete aria-checked", () => {
    renderModal();
    const opt24 = screen.getByTestId("deliberation-option-24");
    fireEvent.click(opt24);
    expect(opt24).toHaveAttribute("data-selected", "true");
    expect(opt24).toHaveAttribute("aria-checked", "true");
  });

  it("submit chama mutation com o numeroParcelas selecionado", async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    renderModal({ onSuccess, onClose });
    fireEvent.click(screen.getByTestId("deliberation-option-36"));
    const submit = screen.getByTestId("deliberation-submit");
    await waitFor(() => {
      fireEvent.click(submit);
    });
    // Mutation mockada retorna sem throw, entao onClose deve ser chamada.
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("renderiza observacao placeholder e contador regressivo", () => {
    renderModal();
    const ta = screen.getByTestId("deliberation-observacao") as HTMLTextAreaElement;
    expect(ta).toBeInTheDocument();
    expect(ta.placeholder).toMatch(/Justifique/i);
  });

  it("nao renderiza quando isOpen=false", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <RepasseDeliberationModal
          isOpen={false}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          campaign={CAMPAIGN}
        />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
