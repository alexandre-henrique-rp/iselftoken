/**
 * Testes do cálculo de valuation na página /founder/startups/:id/new-round.
 *
 * A fórmula corrigida (2026-09-10):
 *   valuation = targetAmount * 100 / equityPercent
 *
 * Implementada em `founder-new-round.math.ts` (função pura testável).
 */
import { describe, expect, it } from "vitest";
import { computeNewRoundValuation } from "../founder-new-round.math";

describe("computeNewRoundValuation", () => {
  it("caso clássico: meta=5M, equity=10% → valuation=50M", () => {
    expect(computeNewRoundValuation(5_000_000, 10)).toBe(50_000_000);
  });

  it("meta=1M, equity=20% → valuation=5M", () => {
    expect(computeNewRoundValuation(1_000_000, 20)).toBe(5_000_000);
  });

  it("equity=1% → valuation = meta × 100", () => {
    expect(computeNewRoundValuation(1_000_000, 1)).toBe(100_000_000);
  });

  it("equity=0 → valuation=0 (guard de divisão por zero)", () => {
    expect(computeNewRoundValuation(1_000_000, 0)).toBe(0);
  });

  it("equity negativo → valuation=0 (guard)", () => {
    expect(computeNewRoundValuation(1_000_000, -10)).toBe(0);
  });

  it("meta=0 → valuation=0 (guard)", () => {
    expect(computeNewRoundValuation(0, 10)).toBe(0);
  });

  it("equity=49% (max do admin) → valuation = meta × 100/49", () => {
    expect(computeNewRoundValuation(1_000_000, 49)).toBeCloseTo(
      1_000_000 * 100 / 49,
      2,
    );
  });
});

describe("computeNewRoundValuation — integração com formatação", () => {
  it("resultado arredonda para 2 casas decimais consistentemente", () => {
    const valuation = computeNewRoundValuation(1_333_333, 7);
    // Aplicar toFixed(2) para evitar imprecisão de ponto flutuante.
    // toFixed usa locale EN-US → ponto (19047614.29, não vírgula).
    expect(valuation.toFixed(2)).toMatch(/^19047614\.\d{2}$/);
  });

  it("valor exato (sem fração) preserva precisão", () => {
    // meta=1M, equity=10% → valuation exato = 10M (sem fração)
    expect(computeNewRoundValuation(1_000_000, 10)).toBe(10_000_000);
  });
});

describe("computeNewRoundValuation — edge cases (regressão QA 2026-09-10)", () => {
  it("equity=100 (limite maximo) → valuation=meta", () => {
    expect(computeNewRoundValuation(1_000_000, 100)).toBe(1_000_000);
  });

  it("equity=101 (acima do maximo) → valuation=0", () => {
    expect(computeNewRoundValuation(1_000_000, 101)).toBe(0);
  });

  it("targetAmount negativo → valuation=0", () => {
    expect(computeNewRoundValuation(-1_000_000, 10)).toBe(0);
  });

  it("NaN em targetAmount → valuation=0", () => {
    expect(computeNewRoundValuation(NaN, 10)).toBe(0);
  });

  it("NaN em equityPercent → valuation=0", () => {
    expect(computeNewRoundValuation(1_000_000, NaN)).toBe(0);
  });

  it("Infinity em targetAmount → valuation=0", () => {
    expect(computeNewRoundValuation(Infinity, 10)).toBe(0);
  });

  it("Infinity em equityPercent → valuation=0", () => {
    expect(computeNewRoundValuation(1_000_000, Infinity)).toBe(0);
  });

  it("overflow: targetAmount=MAX_SAFE_INTEGER → valuation=0", () => {
    expect(
      computeNewRoundValuation(Number.MAX_SAFE_INTEGER, 10),
    ).toBe(0);
  });

  it("cenário hostil via DevTools: equity muito pequeno (0.000001) → valuation=0 (anti-overflow)", () => {
    // Sem guard anterior: meta=1B, equity=0.000001 → valuation = 100T
    // (estoura MAX_SAFE_INTEGER → Infinity). Com guard: deve retornar 0.
    expect(computeNewRoundValuation(1_000_000_000, 0.000001)).toBe(0);
  });

  it("equity=0.01 com meta razoável → valuation válido (não estoura MAX_SAFE_INTEGER)", () => {
    // meta=1M, equity=0.01 → valuation=10B (passa, 1e10 < 9e15)
    expect(computeNewRoundValuation(1_000_000, 0.01)).toBe(10_000_000_000);
  });
});
