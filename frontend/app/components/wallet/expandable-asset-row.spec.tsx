import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ExpandableAssetRow,
  type ExpandableAssetRowAsset,
} from "~/components/wallet/expandable-asset-row";

const baseAsset: ExpandableAssetRowAsset = {
  investmentId: 42,
  startupId: 15,
  startupName: "Acme LTDA",
  startupSlug: "acme",
  startupLogoUrl: null,
  startupCategory: "Tecnologia",
  campaignTitle: "Rodada Série A",
  campaignStatus: "OPEN",
  tokensCount: 2,
  tokens: [
    {
      id: "token-aaaa-1111",
      shortCode: "aaaa1111",
      quantity: 1,
      purchaseVal: 240,
      currentVal: 240,
      acquiredAt: "2026-10-04T12:00:00.000Z",
      investmentId: 42,
    },
    {
      id: "token-bbbb-2222",
      shortCode: "bbbb2222",
      quantity: 1,
      purchaseVal: 240,
      currentVal: 250,
      acquiredAt: "2026-10-04T12:00:01.000Z",
      investmentId: 42,
    },
  ],
  investedAmount: 1200,
  totalCharged: 1260,
  currentValue: 490,
};

describe("ExpandableAssetRow (F4 wallet-assets)", () => {
  it("renderiza colapsado por padrão com nome + quantidade + valor", () => {
    render(<ExpandableAssetRow asset={baseAsset} />);

    expect(screen.getByText("Acme LTDA")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*1\.200/)).toBeInTheDocument();

    // Tokens NÃO devem estar visíveis ainda
    expect(screen.queryByText("…aaaa1111")).not.toBeInTheDocument();
    expect(screen.queryByText("…bbbb2222")).not.toBeInTheDocument();
  });

  it("expande ao clicar no botão chevron e revela os token IDs com shortCode", async () => {
    render(<ExpandableAssetRow asset={baseAsset} />);

    const toggleButton = screen.getByRole("button", { name: /mostrar tokens/i });
    fireEvent.click(toggleButton);

    // Tokens ficam visíveis
    expect(await screen.findByText("…aaaa1111")).toBeInTheDocument();
    expect(await screen.findByText("…bbbb2222")).toBeInTheDocument();

    // 2 tokens individuais é a contagem exibida
    expect(screen.getByText("2 tokens individuais")).toBeInTheDocument();
  });

  it("expande ao clicar na linha (não apenas no botão)", async () => {
    render(<ExpandableAssetRow asset={baseAsset} />);

    const startupName = screen.getByText("Acme LTDA");
    fireEvent.click(startupName);

    expect(await screen.findByText("…aaaa1111")).toBeInTheDocument();
  });

  it("colapsa ao clicar novamente no botão chevron", async () => {
    render(<ExpandableAssetRow asset={baseAsset} />);

    fireEvent.click(screen.getByRole("button", { name: /mostrar tokens/i }));
    expect(await screen.findByText("…aaaa1111")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ocultar tokens/i }));
    expect(screen.queryByText("…aaaa1111")).not.toBeInTheDocument();
  });

  it("mostra valores de compra e atual separados na tabela expandida", async () => {
    render(<ExpandableAssetRow asset={baseAsset} />);

    fireEvent.click(screen.getByRole("button", { name: /mostrar tokens/i }));

    const region = await screen.findByRole("region", { name: /Acme LTDA/i });
    const rows = within(region).getAllByRole("listitem");
    expect(rows).toHaveLength(2);

    expect(within(rows[0]).getByText("…aaaa1111")).toBeInTheDocument();
    expect(within(rows[1]).getByText("…bbbb2222")).toBeInTheDocument();
  });

  it("desabilita expansão quando o asset não tem tokens", () => {
    const emptyAsset: ExpandableAssetRowAsset = {
      ...baseAsset,
      tokensCount: 0,
      tokens: [],
    };
    render(<ExpandableAssetRow asset={emptyAsset} />);

    const toggleButton = screen.getByRole("button", {
      name: /mostrar tokens/i,
    });
    expect(toggleButton).toBeDisabled();
  });

  it("começa expandido quando defaultExpanded=true", () => {
    render(<ExpandableAssetRow asset={baseAsset} defaultExpanded />);
    expect(screen.getByText("…aaaa1111")).toBeInTheDocument();
    expect(screen.getByText("…bbbb2222")).toBeInTheDocument();
  });
});