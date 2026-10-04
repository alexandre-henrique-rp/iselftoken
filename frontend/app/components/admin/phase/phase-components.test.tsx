import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { PaymentReceipt } from "./payment-receipt";
import { PhaseApprovalActions } from "./phase-approval-actions";
import { PhaseDocuments } from "./phase-documents";
import type { PhaseGate } from "~/lib/queries";

const gate = (over: Partial<PhaseGate> = {}): PhaseGate => ({
  unlocked: true,
  reason: null,
  gate: "TOKEN_RESERVATION",
  exists: true,
  paid: true,
  paidAt: "2026-08-15T14:30:00.000Z",
  createdAt: "2026-08-10T10:00:00.000Z",
  status: "PAID",
  ...over,
});

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderWithRouter(ui: React.ReactElement) {
  // PhaseApprovalActions usa useLatestReviewDecision (useQuery), então o
  // provider do TanStack Query é obrigatório. retry:false evita re-tentativas
  // que atrasariam o teste.
  const queryClient = makeQueryClient();
  const Stub = createRoutesStub([{ path: "/", Component: () => ui }]);
  return render(
    <QueryClientProvider client={queryClient}>
      <Stub initialEntries={["/"]} />
    </QueryClientProvider>,
  );
}

/// Wrapper mínimo para testes que renderizam apenas `PhaseDocuments` (que
/// usa `useQueryClient` para invalidação de cache após aprovar/reprovar).
function renderWithQuery(ui: React.ReactElement) {
  const queryClient = makeQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("PaymentReceipt (S3)", () => {
  it("gate PAID → mostra badge Pago e banner de confirmação", () => {
    renderWithRouter(<PaymentReceipt gate={gate()} />);
    expect(screen.getByText("Pago")).toBeInTheDocument();
    expect(
      screen.getByText(/liberada automaticamente/i),
    ).toBeInTheDocument();
  });

  it("gate bloqueado → mostra motivo (tooltip/banner)", () => {
    renderWithRouter(
      <PaymentReceipt
        gate={gate({
          unlocked: false,
          paid: false,
          status: "PENDING",
          reason: "Aguardando pagamento da Taxa de Compliance",
        })}
      />,
    );
    expect(
      screen.getByText(/Aguardando pagamento da Taxa de Compliance/i),
    ).toBeInTheDocument();
  });

  it("gate sem cobrança (exists=false) → considerado atendido", () => {
    renderWithRouter(
      <PaymentReceipt gate={gate({ exists: false, status: null })} />,
    );
    expect(screen.getByText(/gate considerado atendido/i)).toBeInTheDocument();
  });

  it("mostra valor original, desconto e valor pago quando há desconto", () => {
    renderWithRouter(
      <PaymentReceipt
        gate={gate({
          gate: "COMPLIANCE_FEE",
          originalAmount: 1000,
          discountAmount: 100,
          paidAmount: 900,
        })}
      />,
    );
    expect(screen.getByText("Valor original")).toBeInTheDocument();
    expect(screen.getByText("Desconto")).toBeInTheDocument();
    expect(screen.getByText("Valor pago")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*1\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/−\s*R\$\s*100,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*900,00/)).toBeInTheDocument();
  });

  it("oculta a linha de desconto quando discountAmount é 0", () => {
    renderWithRouter(
      <PaymentReceipt
        gate={gate({
          gate: "COMPLIANCE_FEE",
          originalAmount: 1000,
          discountAmount: 0,
          paidAmount: 1000,
        })}
      />,
    );
    expect(screen.getByText("Valor original")).toBeInTheDocument();
    expect(screen.queryByText("Desconto")).not.toBeInTheDocument();
  });
});

describe("PhaseApprovalActions (S3)", () => {
  it("unlocked → botão Aprovar habilitado", () => {
    renderWithRouter(
      <PhaseApprovalActions phase={1} startupId={1} unlocked={true} />,
    );
    const aprovar = screen.getByRole("button", { name: /Aprovar Fase 1/i });
    expect(aprovar).not.toBeDisabled();
  });

  it("locked → botão Aprovar desabilitado + aviso de auditoria", () => {
    renderWithRouter(
      <PhaseApprovalActions phase={2} startupId={1} unlocked={false} />,
    );
    expect(
      screen.getByRole("button", { name: /Aprovar Fase 2/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/liberada automaticamente quando o pagamento/i),
    ).toBeInTheDocument();
  });
});

describe("PhaseDocuments (S3 — pitch deck)", () => {
  const pitch = {
    id: 1,
    categoria: "PITCH_DECK",
    nome: "pitch-deck.pdf",
    mimetype: "application/pdf",
    sizeBytes: 2_000_000,
    url: "https://storage/doc/pitch.pdf",
  };
  const cnpjDoc = {
    id: 2,
    categoria: "CNPJ",
    nome: "cartao-cnpj.pdf",
    mimetype: "application/pdf",
    sizeBytes: 100_000,
    url: "https://storage/doc/cnpj.pdf",
  };

  it("empty → mensagem de nenhum documento", () => {
    renderWithQuery(<PhaseDocuments startupId={1} documents={[]} />);
    expect(
      screen.getByText(/Nenhum documento enviado/i),
    ).toBeInTheDocument();
  });

  it("exibe pitch deck com rótulo, link de visualização e botões Aprovar/Reprovar", () => {
    renderWithQuery(<PhaseDocuments startupId={1} documents={[pitch, cnpjDoc]} />);
    expect(screen.getByText("Pitch Deck")).toBeInTheDocument();
    expect(screen.getByText("Cartão CNPJ")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: /Visualizar/i });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "https://storage/doc/pitch.pdf");
    // Um botão Aprovar + um botão Reprovar por documento.
    expect(screen.getAllByRole("button", { name: /Aprovar/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Reprovar/i })).toHaveLength(2);
  });

  it("documento sem URL mostra 'Sem visualização'", () => {
    renderWithQuery(
      <PhaseDocuments startupId={1} documents={[{ ...pitch, url: null }]} />,
    );
    expect(screen.getByText(/Sem visualização/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Visualizar/i }),
    ).not.toBeInTheDocument();
  });

  it("marcador N/A: label 'Não se aplica' e sem preview", () => {
    renderWithQuery(
      <PhaseDocuments
        startupId={1}
        documents={[
          {
            id: 3,
            categoria: "BALANCO_ANTERIOR",
            nome: "não_se_aplica.pdf",
            mimetype: "application/pdf",
            sizeBytes: 0,
            url: null,
            naoSeAplica: true,
          },
        ]}
      />,
    );
    expect(screen.getByText(/Não se aplica/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Visualizar/i }),
    ).not.toBeInTheDocument();
  });

  it("Fase 1: mostra SOMENTE o Pitch Deck (demais docs vêm na Fase 2)", () => {
    renderWithQuery(
      <PhaseDocuments
        phase={1}
        startupId={1}
        documents={[pitch, cnpjDoc]}
        naoSeAplica={[
          {
            id: 9,
            categoria: "BALANCO_ANTERIOR",
            justificativa: "empresa nova",
          },
        ]}
      />,
    );
    expect(screen.getByText("Pitch Deck")).toBeInTheDocument();
    // Outros documentos e N/A não aparecem na Fase 1.
    expect(screen.queryByText("Cartão CNPJ")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Marcados como "Não se aplica"/i),
    ).not.toBeInTheDocument();
  });

  it("Fase 1 sem pitch deck: mensagem específica de pitch deck", () => {
    renderWithQuery(<PhaseDocuments phase={1} startupId={1} documents={[cnpjDoc]} />);
    expect(
      screen.getByText(/Nenhum Pitch Deck enviado/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Cartão CNPJ")).not.toBeInTheDocument();
  });

  it("Fase 2: mostra os demais documentos (contrato, CNPJ, etc.)", () => {
    renderWithQuery(
      <PhaseDocuments phase={2} startupId={1} documents={[pitch, cnpjDoc]} />,
    );
    expect(screen.getByText("Cartão CNPJ")).toBeInTheDocument();
  });
});
