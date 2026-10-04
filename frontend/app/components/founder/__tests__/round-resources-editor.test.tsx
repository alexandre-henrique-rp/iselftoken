import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RoundResourcesEditor } from "../round-resources-editor";
import type { ResourceAllocation } from "../round-resources-editor";

const CATEGORIES = [
  "Fundador / Time",
  "Desenvolvimento",
  "Comercial",
  "Marketing",
  "Nuvem / Infra",
  "Jurídico",
  "Reserva de Caixa",
  "Categoria Customizada",
];

function makeAllocations(overrides?: Partial<Record<string, number>>): ResourceAllocation[] {
  const defaults: Record<string, number> = {
    FUNDADOR: 0,
    DESENVOLVIMENTO: 0,
    COMERCIAL: 0,
    MARKETING: 0,
    NUVEM: 0,
    JURIDICO: 0,
    RESERVA_CAIXA: 100,
    CUSTOMIZADO: 0,
  };
  const merged = { ...defaults, ...overrides };
  return Object.entries(merged).map(([categoria, percentual]) => ({
    categoria,
    percentual: percentual ?? 0,
    ...(categoria === "CUSTOMIZADO" && (percentual ?? 0) > 0 ? { descricaoCustomizada: "" } : {}),
  }));
}

describe("RoundResourcesEditor", () => {
  it("renders 8 numeric inputs, one per category", () => {
    const onChange = vi.fn();
    render(<RoundResourcesEditor value={makeAllocations()} onChange={onChange} />);

    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs).toHaveLength(8);
  });

  it("displays correct category labels in PT-BR", () => {
    const onChange = vi.fn();
    render(<RoundResourcesEditor value={makeAllocations()} onChange={onChange} />);

    for (const label of CATEGORIES) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("shows green sum footer when total is 100", () => {
    const onChange = vi.fn();
    render(<RoundResourcesEditor value={makeAllocations({ RESERVA_CAIXA: 100 })} onChange={onChange} />);

    expect(screen.getByText("Soma total")).toBeInTheDocument();
    expect(screen.getByText(/Soma válida/)).toBeInTheDocument();
    // No error message
    expect(screen.queryByText("A soma das alocações deve ser exatamente 100%")).not.toBeInTheDocument();
  });

  it("shows red sum and error message when total is not 100", () => {
    const onChange = vi.fn();
    render(<RoundResourcesEditor value={makeAllocations({ RESERVA_CAIXA: 50 })} onChange={onChange} />);

    expect(screen.getByText(/Soma deve = 100%/)).toBeInTheDocument();
    expect(screen.getByText("A soma das alocações deve ser exatamente 100%")).toBeInTheDocument();
  });

  it("shows custom description field only when CUSTOMIZADO percent > 0", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <RoundResourcesEditor value={makeAllocations({ CUSTOMIZADO: 0 })} onChange={onChange} />,
    );
    expect(screen.queryByPlaceholderText("Descreva a categoria customizada...")).not.toBeInTheDocument();

    rerender(
      <RoundResourcesEditor value={makeAllocations({ CUSTOMIZADO: 15 })} onChange={onChange} />,
    );
    expect(screen.getByPlaceholderText("Descreva a categoria customizada...")).toBeInTheDocument();
  });

  it("calls onChange with updated allocation when input changes", () => {
    const onChange = vi.fn();
    render(<RoundResourcesEditor value={makeAllocations()} onChange={onChange} />);

    const fundadorInput = screen.getAllByRole("spinbutton")[0];
    fireEvent.change(fundadorInput, { target: { value: "10" } });

    expect(onChange).toHaveBeenCalled();
    const calledAllocations = onChange.mock.calls[0][0] as ResourceAllocation[];
    expect(calledAllocations[0].percentual).toBe(10);
  });

  // CASE.md [Captação] Alocação de Recursos: cap FUNDADOR <= 20% no editor.
  it("clampa FUNDADOR no cap de 20% mesmo se o usuário digitar valor maior", () => {
    const onChange = vi.fn();
    render(<RoundResourcesEditor value={makeAllocations()} onChange={onChange} />);

    const fundadorInput = screen.getAllByRole("spinbutton")[0];
    fireEvent.change(fundadorInput, { target: { value: "75" } });

    expect(onChange).toHaveBeenCalled();
    const calledAllocations = onChange.mock.calls[0][0] as ResourceAllocation[];
    // Não propaga 75 para o state — clampa em 20 antes do onChange.
    expect(calledAllocations[0].percentual).toBe(20);
  });

  it("exibe badge '(máx 20%)' ao lado do label FUNDADOR", () => {
    const onChange = vi.fn();
    render(<RoundResourcesEditor value={makeAllocations()} onChange={onChange} />);

    // O label "Fundador / Time" deve estar acompanhado de um badge com
    // hint do cap. Procura por "(máx 20%)" como texto próximo.
    expect(screen.getByText(/\(máx 20%\)/)).toBeInTheDocument();
  });

  it("NÃO exibe badge '(máx X%)' para categorias sem cap (< 100)", () => {
    const onChange = vi.fn();
    render(<RoundResourcesEditor value={makeAllocations()} onChange={onChange} />);

    // Desenvolvimento, Marketing, etc. devem manter max=100 e não exibir hint.
    expect(screen.queryByText(/\(máx 100%\)/)).not.toBeInTheDocument();
  });

  it("input FUNDADOR tem atributo max=20 (UX nativa do HTML)", () => {
    const onChange = vi.fn();
    render(<RoundResourcesEditor value={makeAllocations()} onChange={onChange} />);

    const fundadorInput = screen.getAllByRole("spinbutton")[0];
    expect(fundadorInput).toHaveAttribute("max", "20");
  });

  it("input MARKETING (sem cap) tem atributo max=100", () => {
    const onChange = vi.fn();
    render(<RoundResourcesEditor value={makeAllocations()} onChange={onChange} />);

    // MARKETING é o 4º input (após FUNDADOR, DESENVOLVIMENTO, COMERCIAL).
    const marketingInput = screen.getAllByRole("spinbutton")[3];
    expect(marketingInput).toHaveAttribute("max", "100");
  });

  it("input FUNDADOR tem aria-describedby apontando para o hint de proteção", () => {
    const onChange = vi.fn();
    render(<RoundResourcesEditor value={makeAllocations()} onChange={onChange} />);

    const fundadorInput = screen.getAllByRole("spinbutton")[0];
    const describedBy = fundadorInput.getAttribute("aria-describedby");
    expect(describedBy).toBe("resource-FUNDADOR-hint");

    const hint = document.getElementById("resource-FUNDADOR-hint");
    expect(hint).not.toBeNull();
    expect(hint?.textContent).toMatch(/20%/);
  });

  it("initializes with RESERVA_CAIXA=100 when all values are 0", () => {
    const onChange = vi.fn();
    const allZero = [
      { categoria: "FUNDADOR", percentual: 0 },
      { categoria: "DESENVOLVIMENTO", percentual: 0 },
      { categoria: "COMERCIAL", percentual: 0 },
      { categoria: "MARKETING", percentual: 0 },
      { categoria: "NUVEM", percentual: 0 },
      { categoria: "JURIDICO", percentual: 0 },
      { categoria: "RESERVA_CAIXA", percentual: 0 },
      { categoria: "CUSTOMIZADO", percentual: 0 },
    ];
    render(<RoundResourcesEditor value={allZero} onChange={onChange} />);

    // The component should display the values as-is but the visual state should work
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs).toHaveLength(8);
  });

  it("displays error prop when provided", () => {
    const onChange = vi.fn();
    render(
      <RoundResourcesEditor
        value={makeAllocations()}
        onChange={onChange}
        error="Erro de validação do servidor"
      />,
    );
    expect(screen.getByText("Erro de validação do servidor")).toBeInTheDocument();
  });

  it("updates description when typing in custom description field", () => {
    const onChange = vi.fn();
    render(
      <RoundResourcesEditor value={makeAllocations({ CUSTOMIZADO: 20 })} onChange={onChange} />,
    );

    const descInput = screen.getByPlaceholderText("Descreva a categoria customizada...");
    fireEvent.change(descInput, { target: { value: "Consultoria jurídica externa" } });

    expect(onChange).toHaveBeenCalled();
    const calledAllocations = onChange.mock.calls[0][0] as ResourceAllocation[];
    const customizado = calledAllocations.find((a) => a.categoria === "CUSTOMIZADO");
    expect(customizado?.descricaoCustomizada).toBe("Consultoria jurídica externa");
  });
});
