import { describe, expect, it } from "vitest";
import {
  getPaymentMethodLabel,
  getPaymentPresentation,
  isPaymentMethodPix,
  normalizePaymentMethod,
  type PaymentSummary,
} from "./payment-presentation";

function payment(overrides: Partial<PaymentSummary> = {}): PaymentSummary {
  return {
    id: 1,
    amount: 500,
    method: "PIX",
    purpose: "TOKEN_RESERVATION",
    status: "PENDING",
    txid: null,
    qrCodeBase64: null,
    copyPastePix: null,
    paidAt: null,
    expiresAt: null,
    effectsAppliedAt: null,
    investmentId: null,
    reservationContext: null,
    ...overrides,
  };
}

describe("getPaymentPresentation", () => {
  it.each([
    ["Acme Saúde", "PERSISTED_STARTUP"],
    ["Razão Persistida", "PERSISTED_STARTUP"],
    ["Acme Saúde", "DRAFT_PAYLOAD"],
    ["Razão Social", "DRAFT_PAYLOAD"],
  ] as const)(
    "exibe reserva com nome elegível (%s, %s)",
    (displayName, nameSource) => {
      const result = getPaymentPresentation(
        payment({
          reservationContext: {
            kind: "STARTUP_RESERVATION",
            displayName,
            nameSource,
            startup:
              nameSource === "PERSISTED_STARTUP"
                ? { slug: null, displayName }
                : null,
            campaign: null,
          },
        }),
      );

      expect(result.title).toBe(`Reserva de token — ${displayName}`);
      expect(result.description).toBe(
        "Taxa para iniciar o cadastro e a análise da startup.",
      );
      expect(result.neutral).toBe(false);
    },
  );

  it("usa a razão social quando nome fantasia está ausente", () => {
    const result = getPaymentPresentation(
      payment({
        reservationContext: {
          kind: "STARTUP_RESERVATION",
          displayName: "Razão Social Ltda",
          nameSource: "DRAFT_PAYLOAD",
          startup: null,
          campaign: null,
        },
      }),
    );

    expect(result.title).toBe("Reserva de token — Razão Social Ltda");
  });

  it("usa o totalTokens real da reserva no quantityLabel", () => {
    const result = getPaymentPresentation(
      payment({
        reservationContext: {
          kind: "STARTUP_RESERVATION",
          displayName: "Acme Saúde",
          nameSource: "PERSISTED_STARTUP",
          startup: { slug: "acme", displayName: "Acme Saúde" },
          campaign: null,
          totalTokens: 2500,
        },
      }),
    );

    expect(result.quantityLabel).toBe("2.500 TOKENS");
  });

  it("mantém rodada como detalhe separado e não como nome da startup", () => {
    const result = getPaymentPresentation(
      payment({
        reservationContext: {
          kind: "STARTUP_RESERVATION",
          displayName: "Acme Saúde",
          nameSource: "DRAFT_PAYLOAD",
          startup: null,
          campaign: { title: "Rodada Seed 2026" },
        },
      }),
    );

    expect(result.title).toBe("Reserva de token — Acme Saúde");
    expect(result.details).toContain("Rodada: Rodada Seed 2026");
  });

  it("usa identificação neutra sem os fallbacks de assinatura", () => {
    const result = getPaymentPresentation(
      payment({
        reservationContext: {
          kind: "STARTUP_RESERVATION",
          displayName: null,
          nameSource: "NONE",
          startup: null,
          campaign: null,
        },
      }),
    );

    expect(result.title).toBe("Reserva de token");
    expect(result.description).toBe(
      "Taxa para iniciar o cadastro e a análise da startup.",
    );
    expect(result.details).toContain("Identificação da startup indisponível");
    expect(result.title).not.toContain("Token Nexus AI");
    expect(result.description).not.toContain(
      "Acesso à inteligência de mercado",
    );
    expect(result.neutral).toBe(true);
  });

  it("FAST_DEPLOY: título Publicação Rápida + descrição de publicação imediata", () => {
    const result = getPaymentPresentation(payment({ purpose: "FAST_DEPLOY" }));
    expect(result.title).toBe("Publicação Rápida");
    expect(result.description).toContain("imediata");
    expect(result.quantityLabel).toBe("1 serviço");
    expect(result.neutral).toBe(false);
  });

  it("COMPLIANCE_FEE: título Taxa de Compliance", () => {
    const result = getPaymentPresentation(payment({ purpose: "COMPLIANCE_FEE" }));
    expect(result.title).toBe("Taxa de Compliance");
    expect(result.quantityLabel).toBe("1 taxa");
  });

  it("preserva nome e descrição do plano de assinatura", () => {
    const result = getPaymentPresentation(
      payment({
        purpose: "SUBSCRIPTION",
        subscription: {
          plan: { name: "Fundador", description: "Plano anual" },
        },
        reservationContext: null,
      }),
    );

    expect(result).toMatchObject({
      title: "Fundador",
      description: "Plano anual",
      quantityLabel: "1 PLANO",
    });
  });

  it("mantém investimento separado da reserva e usa a campanha autorizada", () => {
    const result = getPaymentPresentation(
      payment({
        purpose: "INVESTMENT",
        investmentId: 12,
        reservationContext: null,
        investment: {
          id: 12,
          status: "PENDING",
          amount: 1000,
          tokensQty: 10,
          campaign: {
            id: 2,
            title: "Rodada Seed",
            startup: { id: 4, nome: "Acme Saúde", slug: "acme-saude" },
          },
        },
      }),
    );

    expect(result.title).toBe("Rodada Seed");
    expect(result.description).toBe("Compra de tokens de Acme Saúde.");
    expect(result.title).not.toBe("Reserva de token");
    // Legado (sem split persistido): só a quantidade real, sem taxa.
    expect(result.quantityLabel).toBe("10 TOKENS");
    expect(result.details).toHaveLength(0);
  });

  it("exibe o split financeiro quando o investimento o persiste", () => {
    const result = getPaymentPresentation(
      payment({
        purpose: "INVESTMENT",
        amount: 2520,
        investmentId: 12,
        reservationContext: null,
        investment: {
          id: 12,
          status: "PENDING",
          amount: 2400,
          tokensQty: 10,
          tokenBasePrice: 200,
          tokenSellPrice: 240,
          tokenSubtotal: 2400,
          platformFeePct: 0.05,
          platformFeeAmount: 120,
          startupRepasseAmount: 2000,
          platformSpreadAmount: 400,
          platformRevenueAmount: 520,
          campaign: {
            id: 2,
            title: "Rodada Seed",
            startup: { id: 4, nome: "Acme Saúde", slug: "acme-saude" },
          },
        },
      }),
    );

    expect(result.title).toBe("Rodada Seed");
    expect(result.quantityLabel).toBe("10 TOKENS");
    expect(result.details).toEqual([
      "10 tokens × R$ 240,00 = R$ 2.400,00",
      "Taxa da plataforma (5%): R$ 120,00",
    ]);
  });

  it("exibe a descrição específica da taxa de compliance", () => {
    const result = getPaymentPresentation(
      payment({ purpose: "COMPLIANCE_FEE" }),
    );

    expect(result.description).toBe(
      "Taxa referente à análise de conformidade da sua startup e da rodada de captação. O pagamento é necessário para iniciar o processo de análise.",
    );
  });

  it("BUG-FIX: details=[] para COMPLIANCE_FEE (sem bullets duplicados)", () => {
    const result = getPaymentPresentation(
      payment({ purpose: "COMPLIANCE_FEE" }),
    );

    expect(result.details).toEqual([]);
  });

  it.each(["EARLY_ACCESS", "P2P_BUY", "VERIFICATION_SEAL", "UNKNOWN"])(
    "usa apresentação neutra para propósito desconhecido: %s",
    (purpose) => {
      const result = getPaymentPresentation(
        payment({
          purpose,
          subscription: {
            plan: {
              name: "Plano que não deve ser usado",
              description: "Descrição que não deve ser usada",
            },
          },
        }),
      );

      expect(result).toEqual({
        title: "Pagamento",
        description: "Detalhes do pagamento indisponíveis.",
        details: ["Identificação do pagamento indisponível"],
        quantityLabel: "1 ITEM",
        neutral: true,
      });
      expect(result.title).not.toContain("Token Nexus AI");
      expect(result.description).not.toContain(
        "Acesso à inteligência de mercado",
      );
    },
  );
});

describe("BUG-FIX — labels de método de pagamento após persistência", () => {
  describe("normalizePaymentMethod", () => {
    it.each([
      ["PIX", "PIX"],
      ["pix", "PIX"],
      ["CREDIT_CARD", "CREDIT_CARD"],
      ["credit_card", "CREDIT_CARD"],
      ["CARTAO", "CREDIT_CARD"],
      ["Cartão", "CREDIT_CARD"],
      ["WALLET", "WALLET"],
      ["wallet", "WALLET"],
      [null, null],
      [undefined, null],
      ["", null],
      ["UNKNOWN", null],
    ] as const)("normaliza %s → %s", (input, expected) => {
      expect(normalizePaymentMethod(input as string)).toBe(expected);
    });
  });

  describe("getPaymentMethodLabel", () => {
    it("exibe 'Cartão de crédito' para CREDIT_CARD (cobre bug do método congelado em PIX)", () => {
      expect(getPaymentMethodLabel("CREDIT_CARD")).toBe("Cartão de crédito");
      expect(getPaymentMethodLabel("credit_card")).toBe("Cartão de crédito");
      expect(getPaymentMethodLabel("Cartão")).toBe("Cartão de crédito");
    });

    it("exibe 'PIX' para PIX", () => {
      expect(getPaymentMethodLabel("PIX")).toBe("PIX");
      expect(getPaymentMethodLabel("pix")).toBe("PIX");
    });

    it("exibe 'Carteira' para WALLET", () => {
      expect(getPaymentMethodLabel("WALLET")).toBe("Carteira");
    });

    it("faz fallback gracioso para método desconhecido (não quebra UI)", () => {
      expect(getPaymentMethodLabel("FOO")).toBe("FOO");
      expect(getPaymentMethodLabel(null)).toBe("—");
      expect(getPaymentMethodLabel(undefined)).toBe("—");
      expect(getPaymentMethodLabel("")).toBe("—");
    });
  });

  describe("isPaymentMethodPix", () => {
    it("true para PIX em qualquer capitalização", () => {
      expect(isPaymentMethodPix("PIX")).toBe(true);
      expect(isPaymentMethodPix("pix")).toBe(true);
      expect(isPaymentMethodPix("Pix")).toBe(true);
    });

    it("false para CREDIT_CARD, WALLET, null e desconhecidos", () => {
      expect(isPaymentMethodPix("CREDIT_CARD")).toBe(false);
      expect(isPaymentMethodPix("WALLET")).toBe(false);
      expect(isPaymentMethodPix(null)).toBe(false);
      expect(isPaymentMethodPix(undefined)).toBe(false);
      expect(isPaymentMethodPix("Cartão")).toBe(false);
    });
  });
});
