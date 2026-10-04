import { describe, it, expect } from "vitest";

import { computeCheckoutTotals } from "../checkout-totals";
import type { InstallmentOption } from "~/hooks/use-installment-options";

function option(overrides: Partial<InstallmentOption>): InstallmentOption {
  return {
    installments: 1,
    installmentAmount: 1000,
    totalWithInterest: 1000,
    totalInterest: 0,
    interestRate: 0.0299,
    belowMinimum: false,
    ...overrides,
  };
}

describe("computeCheckoutTotals", () => {
  it("PIX não aplica juros (total = base)", () => {
    const r = computeCheckoutTotals({
      method: "PIX",
      baseTotal: 1000,
      selectedInstallment: null,
    });
    expect(r.cardInterest).toBe(0);
    expect(r.displayTotal).toBe(1000);
  });

  it("cartão à vista (1x) não aplica juros", () => {
    const r = computeCheckoutTotals({
      method: "CREDIT_CARD",
      baseTotal: 1000,
      selectedInstallment: option({ installments: 1, totalInterest: 0 }),
    });
    expect(r.cardInterest).toBe(0);
    expect(r.displayTotal).toBe(1000);
  });

  it("cartão parcelado (N>1) soma os juros do backend ao total", () => {
    const r = computeCheckoutTotals({
      method: "CREDIT_CARD",
      baseTotal: 1000,
      selectedInstallment: option({
        installments: 12,
        installmentAmount: 118.69,
        totalWithInterest: 1424.26,
        totalInterest: 424.26,
      }),
    });
    expect(r.cardInterest).toBe(424.26);
    expect(r.displayTotal).toBe(1424.26);
  });

  it("não aplica juros quando não há opção selecionada", () => {
    const r = computeCheckoutTotals({
      method: "CREDIT_CARD",
      baseTotal: 500,
      selectedInstallment: null,
    });
    expect(r.cardInterest).toBe(0);
    expect(r.displayTotal).toBe(500);
  });
});
