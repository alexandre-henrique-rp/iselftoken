/**
 * Testes da fórmula de valuation + cálculos derivados do wizard.
 *
 * O wizard usa React state + react-hook-form, o que torna testes de
 * integração complexos. Estes testes validam a FÓRMULA isoladamente
 * via uma função pura extraída (`computeRoundMetrics`), que é a mesma
 * matemática usada no wizard.
 *
 * Fórmula corrigida (2026-09-10):
 *   valuationPreMoney = targetAmount * 100 / equityPercent
 *   tokensCount = ceil(targetAmount / tokenPrice)
 *   tokenReservationFee = tokensCount * authFeePerToken
 *   equityPerToken = equityPercent (direto, sem dividir por tokens)
 */
import { describe, expect, it } from "vitest";
import { computeRoundMetrics } from "../new-startup-wizard.metrics";

describe("computeRoundMetrics — valuation pré-money (regressão do bug)", () => {
  it("caso clássico do usuário: meta=5M, equity=10% → valuation=50M", () => {
    const result = computeRoundMetrics({
      targetAmount: 5_000_000,
      equityPercent: 10,
      tokenPrice: 200,
      authFeePerToken: 1,
    });
    expect(result.valuationPreMoney).toBe(50_000_000);
  });

  it("meta=1M, equity=20% → valuation=5M", () => {
    const result = computeRoundMetrics({
      targetAmount: 1_000_000,
      equityPercent: 20,
      tokenPrice: 200,
      authFeePerToken: 1,
    });
    expect(result.valuationPreMoney).toBe(5_000_000);
  });

  it("meta=100k, equity=0% → valuation=0 (guard de equity=0)", () => {
    const result = computeRoundMetrics({
      targetAmount: 100_000,
      equityPercent: 0,
      tokenPrice: 200,
      authFeePerToken: 1,
    });
    expect(result.valuationPreMoney).toBe(0);
  });

  it("meta=0, equity=10% → valuation=0 (guard de meta=0)", () => {
    const result = computeRoundMetrics({
      targetAmount: 0,
      equityPercent: 10,
      tokenPrice: 200,
      authFeePerToken: 1,
    });
    expect(result.valuationPreMoney).toBe(0);
  });

  it("equity=1% (mínimo) → valuation = meta × 100", () => {
    const result = computeRoundMetrics({
      targetAmount: 1_000_000,
      equityPercent: 1,
      tokenPrice: 200,
      authFeePerToken: 1,
    });
    expect(result.valuationPreMoney).toBe(100_000_000);
  });
});

describe("computeRoundMetrics — tokens necessários", () => {
  it("meta=1M, tokenPrice=R$200 → 5000 tokens", () => {
    const result = computeRoundMetrics({
      targetAmount: 1_000_000,
      equityPercent: 10,
      tokenPrice: 200,
      authFeePerToken: 1,
    });
    expect(result.tokensCount).toBe(5000);
  });

  it("arredonda para cima: meta=R$150, tokenPrice=R$100 → 2 tokens", () => {
    const result = computeRoundMetrics({
      targetAmount: 150,
      equityPercent: 10,
      tokenPrice: 100,
      authFeePerToken: 1,
    });
    expect(result.tokensCount).toBe(2);
  });

  it("meta=0, tokenPrice qualquer → 0 tokens", () => {
    const result = computeRoundMetrics({
      targetAmount: 0,
      equityPercent: 10,
      tokenPrice: 200,
      authFeePerToken: 1,
    });
    expect(result.tokensCount).toBe(0);
  });
});

describe("computeRoundMetrics — taxa de reserva", () => {
  it("5000 tokens × R$1/token = R$ 5000", () => {
    const result = computeRoundMetrics({
      targetAmount: 1_000_000,
      equityPercent: 10,
      tokenPrice: 200,
      authFeePerToken: 1,
    });
    expect(result.tokenReservationFee).toBe(5000);
  });

  it("5000 tokens × R$2,50/token = R$ 12.500", () => {
    const result = computeRoundMetrics({
      targetAmount: 1_000_000,
      equityPercent: 10,
      tokenPrice: 200,
      authFeePerToken: 2.5,
    });
    expect(result.tokenReservationFee).toBe(12_500);
  });

  it("authFeePerToken=0 → fee=0 (sem taxa)", () => {
    const result = computeRoundMetrics({
      targetAmount: 1_000_000,
      equityPercent: 10,
      tokenPrice: 200,
      authFeePerToken: 0,
    });
    expect(result.tokenReservationFee).toBe(0);
  });
});

describe("computeRoundMetrics — equityPerToken (% direto)", () => {
  it("equityPerToken = equityPercent (sem dividir por tokens)", () => {
    const result = computeRoundMetrics({
      targetAmount: 1_000_000,
      equityPercent: 10,
      tokenPrice: 200,
      authFeePerToken: 1,
    });
    // equityPerToken = 10 (direto), NÃO 10 / 5000 = 0.002
    expect(result.equityPerToken).toBe(10);
  });
});

describe("computeRoundMetrics — edge cases numéricos (regressão QA 2026-09-10)", () => {
  const ZERO_RESULT = {
    valuationPreMoney: 0,
    tokensCount: 0,
    tokenReservationFee: 0,
    equityPerToken: 0,
  };

  it("NaN em qualquer input → tudo zero", () => {
    expect(
      computeRoundMetrics({
        targetAmount: NaN,
        equityPercent: 10,
        tokenPrice: 200,
        authFeePerToken: 1,
      }),
    ).toEqual(ZERO_RESULT);
    expect(
      computeRoundMetrics({
        targetAmount: 1_000_000,
        equityPercent: NaN,
        tokenPrice: 200,
        authFeePerToken: 1,
      }),
    ).toEqual(ZERO_RESULT);
    expect(
      computeRoundMetrics({
        targetAmount: 1_000_000,
        equityPercent: 10,
        tokenPrice: NaN,
        authFeePerToken: 1,
      }),
    ).toEqual(ZERO_RESULT);
  });

  it("Infinity em qualquer input → tudo zero (anti-vazamento)", () => {
    expect(
      computeRoundMetrics({
        targetAmount: Infinity,
        equityPercent: 10,
        tokenPrice: 200,
        authFeePerToken: 1,
      }),
    ).toEqual(ZERO_RESULT);
    expect(
      computeRoundMetrics({
        targetAmount: 1_000_000,
        equityPercent: Infinity,
        tokenPrice: 200,
        authFeePerToken: 1,
      }),
    ).toEqual(ZERO_RESULT);
    expect(
      computeRoundMetrics({
        targetAmount: 1_000_000,
        equityPercent: 10,
        tokenPrice: Infinity,
        authFeePerToken: 1,
      }),
    ).toEqual(ZERO_RESULT);
  });

  it("equity=100 (limite maximo da plataforma) → valuation=meta", () => {
    const result = computeRoundMetrics({
      targetAmount: 1_000_000,
      equityPercent: 100,
      tokenPrice: 200,
      authFeePerToken: 1,
    });
    expect(result.valuationPreMoney).toBe(1_000_000);
    expect(result.equityPerToken).toBe(100);
  });

  it("equity=101 (acima do maximo) → valuation=0 (guard)", () => {
    const result = computeRoundMetrics({
      targetAmount: 1_000_000,
      equityPercent: 101,
      tokenPrice: 200,
      authFeePerToken: 1,
    });
    expect(result.valuationPreMoney).toBe(0);
  });

  it("equity negativo → tudo zero (guard)", () => {
    expect(
      computeRoundMetrics({
        targetAmount: 1_000_000,
        equityPercent: -10,
        tokenPrice: 200,
        authFeePerToken: 1,
      }),
    ).toEqual(ZERO_RESULT);
  });

  it("tokenPrice=0 → tokensCount=0 (guard de divisão por zero)", () => {
    const result = computeRoundMetrics({
      targetAmount: 1_000_000,
      equityPercent: 10,
      tokenPrice: 0,
      authFeePerToken: 1,
    });
    expect(result.tokensCount).toBe(0);
    // Mas valuation ainda pode ser calculada (não depende de tokenPrice)
    expect(result.valuationPreMoney).toBe(10_000_000);
  });

  it("targetAmount overflow > MAX_SAFE_INTEGER/100 → tudo zero (anti-overflow)", () => {
    const result = computeRoundMetrics({
      targetAmount: 1e16, // > Number.MAX_SAFE_INTEGER/100 = 9e13
      equityPercent: 10,
      tokenPrice: 200,
      authFeePerToken: 1,
    });
    expect(result.valuationPreMoney).toBe(0);
  });

  it("authFeePerToken negativo não quebra (apenas Zod valida)", () => {
    // A função pura aceita qualquer número; a validação é responsabilidade
    // do schema Zod. Aqui apenas validamos que não há NaN/Infinity.
    const result = computeRoundMetrics({
      targetAmount: 1_000_000,
      equityPercent: 10,
      tokenPrice: 200,
      authFeePerToken: -1,
    });
    // fee = 5000 * -1 = -5000 (sem clamp na função pura)
    expect(result.tokenReservationFee).toBe(-5000);
  });
});
