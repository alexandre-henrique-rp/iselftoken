import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { ProrrogacaoScreen } from "../prorrogacao-screen";
import type { ProrrogacaoData } from "../prorrogacao-screen";

const data: ProrrogacaoData = {
  campaignId: 1,
  campaignTitle: "Rodada Seed",
  metaOriginal: 500_000,
  tokenPrice: 40,
  tokensSold: 10_000,
  totalTokens: 12_500,
};

function renderScreen() {
  return render(
    <MemoryRouter>
      <ProrrogacaoScreen startupId="1" startupName="Acme" data={data} />
    </MemoryRouter>,
  );
}

describe("ProrrogacaoScreen", () => {
  it("botão pagar desabilitado sem valor adicional", () => {
    renderScreen();
    const btn = screen.getByRole("button", { name: /pagar reserva/i });
    expect(btn).toBeDisabled();
  });

  it("calcula nova meta somada e reserva sobre o adicional", () => {
    renderScreen();
    const input = screen.getByLabelText(/adicional a captar/i);
    // R$ 200.000 adicional → nova meta R$ 700.000 → 200000/40 = 5000 tokens.
    fireEvent.change(input, { target: { value: "200000" } });

    expect(screen.getByText(/5\.000 tokens/i)).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /pagar reserva/i });
    expect(btn).not.toBeDisabled();
  });
});
