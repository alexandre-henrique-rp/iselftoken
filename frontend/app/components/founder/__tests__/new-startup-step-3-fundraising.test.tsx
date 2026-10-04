/**
 * Testes do NewStartupStep3Fundraising.
 *
 * Foco: validar que os cálculos derivados (valuation, tokens, fee) JÁ
 * chegam prontos do wizard pai — este componente apenas renderiza.
 * Garante também a renderização dos campos do config do admin
 * (tokenPrice/authFeePerToken) no resumo da tokenização.
 */
import { render, screen } from "@testing-library/react";
import type { UseFormReturn } from "react-hook-form";
import { describe, expect, it } from "vitest";
import type { NewStartupFormData } from "~/lib/new-startup-schema";
import { NewStartupStep3Fundraising } from "../new-startup-step-3-fundraising";

// React renderiza `${a} ${b}` como múltiplos text nodes. Testing-library
// por padrão busca em text nodes individuais. Para buscar em textContent
// agregado (cobrindo descendentes), usamos document.body.textContent + regex.
function findBy(content: string) {
  const escaped = content.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped.replace(/\s+/g, "\\s*"));
  const match = document.body.textContent?.match(re);
  if (!match) {
    throw new Error(`Text "${content}" nao encontrado em document.body`);
  }
  // Encontra o ancestral mais interno que contenha o texto.
  const allElements = Array.from(document.querySelectorAll("*")) as Element[];
  for (const el of allElements) {
    if (el.textContent && re.test(el.textContent.replace(/\s+/g, " ").trim())) {
      return el;
    }
  }
  throw new Error(`Text "${content}" nao encontrado em nenhum elemento`);
}

function makeForm(values: Partial<NewStartupFormData> = {}) {
  return {
    watch: (name: keyof NewStartupFormData) => values[name],
    register: () => ({}),
    formState: { errors: {} },
    setValue: () => undefined,
    trigger: async () => true,
  } as unknown as UseFormReturn<NewStartupFormData>;
}

describe("NewStartupStep3Fundraising — textos de ajuda", () => {
  it("mostra limites min/max vindos do config do admin", () => {
    render(
      <NewStartupStep3Fundraising
        form={makeForm()}
        tokenPrice={200}
        authFeePerToken={1}
        equityMin={1}
        equityMax={49}
        minCampaign={10_000}
        maxCampaign={5_000_000}
        fastTrackReview={2500}
        metaCaptacaoFormatted=""
        equityFormatted=""
        metaCaptacaoInputRef={{ current: null }}
        onMetaChange={() => undefined}
        onMetaBlur={() => undefined}
        onEquityChange={() => undefined}
        onEquityBlur={() => undefined}
        valuationPreMoney={0}
        tokensCount={0}
        tokenReservationFee={0}
        equityPerToken={0}
      />,
    );
    // Texto deve refletir os valores do config (10.000 a 5.000.000) + sufixo
    expect(
      findBy("Permitido de R$ 10.000 até R$ 5.000.000 (limite CVM)."),
    ).toBeDefined();
  });

  it("mostra range de equity vindo do config do admin", () => {
    render(
      <NewStartupStep3Fundraising
        form={makeForm()}
        tokenPrice={200}
        authFeePerToken={1}
        equityMin={5}
        equityMax={49}
        minCampaign={10_000}
        maxCampaign={5_000_000}
        fastTrackReview={2500}
        metaCaptacaoFormatted=""
        equityFormatted=""
        metaCaptacaoInputRef={{ current: null }}
        onMetaChange={() => undefined}
        onMetaBlur={() => undefined}
        onEquityChange={() => undefined}
        onEquityBlur={() => undefined}
        valuationPreMoney={0}
        tokensCount={0}
        tokenReservationFee={0}
        equityPerToken={0}
      />,
    );
    expect(findBy("Permitido de 5% até 49%.")).toBeDefined();
    const equityInput = screen.getByLabelText(
      "Equity que está disposto a oferecer (%)",
    );
    expect(equityInput.getAttribute("min")).toBe("5");
    expect(equityInput.getAttribute("max")).toBe("49");
  });
});

describe("NewStartupStep3Fundraising — resumo da tokenização", () => {
  it("exibe preço base do token vindo do config", () => {
    render(
      <NewStartupStep3Fundraising
        form={makeForm()}
        tokenPrice={200}
        authFeePerToken={1}
        equityMin={1}
        equityMax={49}
        minCampaign={10_000}
        maxCampaign={5_000_000}
        fastTrackReview={2500}
        metaCaptacaoFormatted=""
        equityFormatted=""
        metaCaptacaoInputRef={{ current: null }}
        onMetaChange={() => undefined}
        onMetaBlur={() => undefined}
        onEquityChange={() => undefined}
        onEquityBlur={() => undefined}
        valuationPreMoney={0}
        tokensCount={0}
        tokenReservationFee={0}
        equityPerToken={0}
      />,
    );
    expect(findBy("Preço base do token")).toBeDefined();
    // toFixed(2) usa locale EN-US → usa ponto (R$ 200.00)
    expect(findBy("R$ 200.00")).toBeDefined();
  });

  it("exibe taxa de emissão por token vindo do config", () => {
    render(
      <NewStartupStep3Fundraising
        form={makeForm()}
        tokenPrice={200}
        authFeePerToken={2.5}
        equityMin={1}
        equityMax={49}
        minCampaign={10_000}
        maxCampaign={5_000_000}
        fastTrackReview={2500}
        metaCaptacaoFormatted=""
        equityFormatted=""
        metaCaptacaoInputRef={{ current: null }}
        onMetaChange={() => undefined}
        onMetaBlur={() => undefined}
        onEquityChange={() => undefined}
        onEquityBlur={() => undefined}
        valuationPreMoney={0}
        tokensCount={0}
        tokenReservationFee={0}
        equityPerToken={0}
      />,
    );
    expect(findBy("Taxa de emissão por token")).toBeDefined();
    expect(findBy("R$ 2.50")).toBeDefined();
  });

  it("exibe reserva de tokens com cálculo tokens × fee", () => {
    render(
      <NewStartupStep3Fundraising
        form={makeForm()}
        tokenPrice={200}
        authFeePerToken={1}
        equityMin={1}
        equityMax={49}
        minCampaign={10_000}
        maxCampaign={5_000_000}
        fastTrackReview={2500}
        metaCaptacaoFormatted=""
        equityFormatted=""
        metaCaptacaoInputRef={{ current: null }}
        onMetaChange={() => undefined}
        onMetaBlur={() => undefined}
        onEquityChange={() => undefined}
        onEquityBlur={() => undefined}
        valuationPreMoney={0}
        tokensCount={5000}
        tokenReservationFee={5000}
        equityPerToken={10}
      />,
    );
    // Reserva = 5000 tokens × R$1/token = R$ 5.000,00 (toLocaleString pt-BR)
    expect(findBy("Reserva de tokens")).toBeDefined();
    expect(findBy("R$ 5.000,00")).toBeDefined();
    // Sub-texto mostra o cálculo (toFixed usa ponto, nao virgula)
    expect(findBy("(tokens × R$ 1.00)")).toBeDefined();
  });

  it("exibe valuation pré-money já calculada pelo pai", () => {
    render(
      <NewStartupStep3Fundraising
        form={makeForm()}
        tokenPrice={200}
        authFeePerToken={1}
        equityMin={1}
        equityMax={49}
        minCampaign={10_000}
        maxCampaign={5_000_000}
        fastTrackReview={2500}
        metaCaptacaoFormatted=""
        equityFormatted=""
        metaCaptacaoInputRef={{ current: null }}
        onMetaChange={() => undefined}
        onMetaBlur={() => undefined}
        onEquityChange={() => undefined}
        onEquityBlur={() => undefined}
        // Caso do usuário: meta=5M, equity=10% → valuation=50M
        valuationPreMoney={50_000_000}
        tokensCount={0}
        tokenReservationFee={0}
        equityPerToken={10}
      />,
    );
    expect(findBy("Valuation pré-money")).toBeDefined();
    expect(findBy("R$ 50.000.000,00")).toBeDefined();
  });

  it("exibe equity oferecida como % direto (não dividido por tokens)", () => {
    render(
      <NewStartupStep3Fundraising
        form={makeForm()}
        tokenPrice={200}
        authFeePerToken={1}
        equityMin={1}
        equityMax={49}
        minCampaign={10_000}
        maxCampaign={5_000_000}
        fastTrackReview={2500}
        metaCaptacaoFormatted=""
        equityFormatted=""
        metaCaptacaoInputRef={{ current: null }}
        onMetaChange={() => undefined}
        onMetaBlur={() => undefined}
        onEquityChange={() => undefined}
        onEquityBlur={() => undefined}
        valuationPreMoney={0}
        tokensCount={5000}
        tokenReservationFee={5000}
        // 10% direto, nao 0.00200% por token
        equityPerToken={10}
      />,
    );
    expect(findBy("Equity oferecida")).toBeDefined();
    // toFixed usa locale EN-US → ponto (10.00%)
    expect(findBy("10.00%")).toBeDefined();
  });
});

describe("NewStartupStep3Fundraising — tokens necessários", () => {
  it("formata número de tokens com separador pt-BR", () => {
    render(
      <NewStartupStep3Fundraising
        form={makeForm()}
        tokenPrice={200}
        authFeePerToken={1}
        equityMin={1}
        equityMax={49}
        minCampaign={10_000}
        maxCampaign={5_000_000}
        fastTrackReview={2500}
        metaCaptacaoFormatted=""
        equityFormatted=""
        metaCaptacaoInputRef={{ current: null }}
        onMetaChange={() => undefined}
        onMetaBlur={() => undefined}
        onEquityChange={() => undefined}
        onEquityBlur={() => undefined}
        valuationPreMoney={0}
        tokensCount={50000}
        tokenReservationFee={50000}
        equityPerToken={10}
      />,
    );
    // 50.000 com separador pt-BR
    expect(findBy("50.000 tokens")).toBeDefined();
  });
});
